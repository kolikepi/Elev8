import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getShippingConfig, computeShipping } from '@/lib/shipping';
import { getSiteSettings } from '@/lib/settings';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `EL${y}${m}${d}-${rand}`;
}

// GET: list user's orders
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 400 });

    const orders = await prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST: create new order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 400 });

    const data = await request.json();
    const { firstName, lastName, email, phone, address, city, postalCode, notes, paymentMethod } = data;

    if (!firstName || !lastName || !email || !phone || !address || !city) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get cart items (include variant for inventory)
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true, variant: true },
    });

    if (cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const shippingConfig = await getShippingConfig();
    const shippingCost = computeShipping(subtotal, city, shippingConfig);
    const total = subtotal + shippingCost;

    // Create order + decrement inventory atomically. Re-check stock inside the
    // transaction so two concurrent checkouts can never oversell a variant.
    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        // Re-validate variant stock against the latest values.
        for (const item of cartItems) {
          if (item.variantId) {
            const fresh = await tx.productVariant.findUnique({
              where: { id: item.variantId },
            });
            if (!fresh || !fresh.active || fresh.stockQuantity < item.quantity) {
              throw new Error(
                `INSUFFICIENT_STOCK:${item.product.name} (${item.color}/${item.size})`
              );
            }
          }
        }

        const created = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            userId,
            firstName,
            lastName,
            email,
            phone,
            address,
            city,
            postalCode: postalCode || null,
            notes: notes || null,
            paymentMethod: paymentMethod || 'cod',
            subtotal,
            shippingCost,
            total,
            items: {
              create: cartItems.map((item) => ({
                productId: item.product.id,
                productName: item.product.name,
                productImage: item.product.imageUrl,
                price: item.product.price,
                quantity: item.quantity,
                size: item.size,
                color: item.color,
                variantId: item.variantId || null,
              })),
            },
          },
          include: { items: true },
        });

        // Decrement variant stock (never below zero) and keep product.inStock in sync.
        const affectedProductIds = new Set<string>();
        for (const item of cartItems) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stockQuantity: { decrement: item.quantity } },
            });
            affectedProductIds.add(item.productId);
          }
        }

        // Recompute product-level availability from remaining active variant stock.
        for (const pid of Array.from(affectedProductIds)) {
          const remaining = await tx.productVariant.aggregate({
            where: { productId: pid, active: true },
            _sum: { stockQuantity: true },
          });
          const totalStock = remaining._sum.stockQuantity ?? 0;
          await tx.product.update({
            where: { id: pid },
            data: { inStock: totalStock > 0 },
          });
        }

        // Clear cart inside the same transaction.
        await tx.cartItem.deleteMany({ where: { userId } });

        return created;
      });
    } catch (txErr) {
      const msg = txErr instanceof Error ? txErr.message : '';
      if (msg.startsWith('INSUFFICIENT_STOCK:')) {
        return NextResponse.json(
          {
            error: `Some items are no longer available in the requested quantity: ${msg.replace('INSUFFICIENT_STOCK:', '')}. Please review your bag.`,
          },
          { status: 409 }
        );
      }
      throw txErr;
    }

    // Send email notifications (fire-and-forget)
    sendOrderEmails(order, email).catch(err => console.error('Email error:', err));

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

async function sendOrderEmails(order: {
  orderNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  paymentMethod: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  items: { productName: string; size: string; color: string; quantity: number; price: number; productImage: string }[];
}, customerEmail: string) {
  const settings = await getSiteSettings();
  const appName = settings.businessName || 'ELEV8';
  const adminRecipient = settings.adminEmail || process.env.ADMIN_NOTIFICATION_EMAIL || '';

  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #222;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${item.productImage}" alt="${item.productName}" width="50" height="50" style="border-radius: 4px; object-fit: cover;" />
          <div>
            <strong style="color: #fff;">${item.productName}</strong><br/>
            <span style="color: #888; font-size: 12px;">${item.size} / ${item.color}</span>
          </div>
        </div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #222; color: #888; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #222; color: #fff; text-align: right;">€${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const customerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 30px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #32FF6A; margin: 0; font-size: 28px; letter-spacing: 4px;">ELEV8</h1>
        <p style="color: #888; margin: 5px 0 0;">Performance Activewear</p>
      </div>
      <div style="background: #111; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #32FF6A; margin-top: 0;">Faleminderit për porosinë! 🎉</h2>
        <p style="color: #ccc;">Porosia juaj <strong style="color: #32FF6A;">#${order.orderNumber}</strong> u pranua me sukses.</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead><tr style="border-bottom: 2px solid #32FF6A;">
          <th style="text-align: left; padding: 10px; color: #888;">Produkti</th>
          <th style="text-align: center; padding: 10px; color: #888;">Sasia</th>
          <th style="text-align: right; padding: 10px; color: #888;">Çmimi</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="background: #111; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span style="color: #888;">Nëntotali:</span><span style="color: #fff;">€${order.subtotal.toFixed(2)}</span></div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span style="color: #888;">Transporti:</span><span style="color: #fff;">${order.shippingCost === 0 ? 'FALAS' : '€' + order.shippingCost.toFixed(2)}</span></div>
        <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid #333;"><span style="color: #32FF6A; font-weight: bold;">TOTALI:</span><span style="color: #32FF6A; font-weight: bold; font-size: 18px;">€${order.total.toFixed(2)}</span></div>
      </div>
      <div style="background: #111; padding: 15px; border-radius: 8px;">
        <h3 style="color: #fff; margin-top: 0;">Adresa e Dërgesës</h3>
        <p style="color: #ccc; margin: 5px 0;">${order.firstName} ${order.lastName}</p>
        <p style="color: #ccc; margin: 5px 0;">${order.address}</p>
        <p style="color: #ccc; margin: 5px 0;">${order.city}</p>
        <p style="color: #ccc; margin: 5px 0;">Tel: ${order.phone}</p>
        <p style="color: #ccc; margin: 5px 0;">Pagesa: ${order.paymentMethod === 'cod' ? 'Pagesë në Dorëzim' : 'Transfer Bankar'}</p>
      </div>
      <p style="text-align: center; color: #555; margin-top: 30px; font-size: 12px;">© ELEV8 Performance Activewear</p>
    </div>
  `;

  // Send to customer
  await sendEmail({
    to: customerEmail,
    subject: `ELEV8 — Porosia #${order.orderNumber} u konfirmua`,
    html: customerHtml,
    fromName: appName,
  });

  // Send to admin (only when an internal notification email is configured)
  if (!adminRecipient) return;
  const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 30px;">
        <h2 style="color: #32FF6A;">Porosi e Re! 🛒</h2>
        <p style="color: #ccc;">Porosi <strong>#${order.orderNumber}</strong> nga <strong>${order.firstName} ${order.lastName}</strong></p>
        <p style="color: #ccc;">Email: ${order.email} | Tel: ${order.phone}</p>
        <p style="color: #ccc;">Adresa: ${order.address}, ${order.city}</p>
        <p style="color: #ccc;">Pagesa: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Bank Transfer'}</p>
        <h3 style="color: #32FF6A;">Total: €${order.total.toFixed(2)}</h3>
        <p style="color: #888;">${order.items.map(i => `${i.quantity}x ${i.productName} (${i.size}/${i.color})`).join(', ')}</p>
      </div>
    `;
  await sendEmail({
    to: adminRecipient,
    subject: `Porosi e Re #${order.orderNumber} — €${order.total.toFixed(2)}`,
    html: adminHtml,
    fromName: appName,
  });
}
