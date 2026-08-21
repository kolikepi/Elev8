import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { getSiteSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// GET all orders for admin
export async function GET() {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) return NextResponse.json({ error }, { status: 401 });

    const orders = await prisma.order.findMany({
      include: { items: true, user: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

const STATUS_LABELS_SQ: Record<string, string> = {
  pending: 'Në pritje',
  confirmed: 'Konfirmuar',
  processing: 'Në përgatitje',
  shipped: 'Dërguar',
  delivered: 'Dorëzuar',
  cancelled: 'Anuluar',
};

const STATUS_MESSAGES_SQ: Record<string, string> = {
  confirmed: 'Porosia juaj u konfirmua dhe po e përgatisim.',
  processing: 'Porosia juaj është duke u përgatitur për dërgesë.',
  shipped: 'Porosia juaj u dërgua dhe është në rrugë drejt jush.',
  delivered: 'Porosia juaj u dorëzua. Faleminderit që zgjodhët ELEV8!',
  cancelled: 'Porosia juaj u anulua. Për çdo pyetje, na kontaktoni.',
};

async function sendStatusEmail(
  order: { orderNumber: string; email: string; firstName: string; status: string; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null },
) {
  const settings = await getSiteSettings();
  if (!settings.orderStatusEmailsEnabled) return;
  if (!order.email) return;
  const notifId = process.env.NOTIF_ID_ORDER_STATUS_UPDATE;
  if (!notifId) return;

  const appUrl = process.env.NEXTAUTH_URL || '';
  const appName = settings.businessName || 'ELEV8';
  const senderEmail = appUrl ? `noreply@${new URL(appUrl).hostname}` : 'noreply@elev8.abacusai.app';
  const label = STATUS_LABELS_SQ[order.status] || order.status;
  const message = STATUS_MESSAGES_SQ[order.status] || `Statusi i porosisë tuaj u përditësua: ${label}.`;

  let trackingHtml = '';
  if (order.status === 'shipped' && (order.trackingNumber || order.trackingUrl)) {
    trackingHtml = `
      <div style="background: #111; padding: 15px; border-radius: 8px; margin-top: 16px;">
        <h3 style="color: #fff; margin-top: 0;">Gjurmimi i Dërgesës</h3>
        ${order.carrier ? `<p style="color: #ccc; margin: 5px 0;">Transportuesi: ${order.carrier}</p>` : ''}
        ${order.trackingNumber ? `<p style="color: #ccc; margin: 5px 0;">Numri i gjurmimit: <strong style="color:#32FF6A;">${order.trackingNumber}</strong></p>` : ''}
        ${order.trackingUrl ? `<p style="margin: 10px 0 0;"><a href="${order.trackingUrl}" style="color: #32FF6A;">Gjurmo porosinë →</a></p>` : ''}
      </div>`;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 30px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #32FF6A; margin: 0; font-size: 28px; letter-spacing: 4px;">${appName.toUpperCase()}</h1>
      </div>
      <div style="background: #111; padding: 20px; border-radius: 8px;">
        <h2 style="color: #32FF6A; margin-top: 0;">Përditësim Porosie</h2>
        <p style="color: #ccc;">Përshëndetje ${order.firstName},</p>
        <p style="color: #ccc;">Porosia juaj <strong style="color: #32FF6A;">#${order.orderNumber}</strong> tani është: <strong style="color:#fff;">${label}</strong></p>
        <p style="color: #ccc;">${message}</p>
      </div>
      ${trackingHtml}
      <p style="text-align: center; color: #555; margin-top: 30px; font-size: 12px;">© ${appName} Performance Activewear</p>
    </div>
  `;

  try {
    await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: notifId,
        subject: `${appName} — Porosia #${order.orderNumber}: ${label}`,
        body: html,
        is_html: true,
        recipient_email: order.email,
        sender_email: senderEmail,
        sender_alias: appName,
      }),
    });
  } catch (e) { console.error('Status email failed:', e); }
}

// PATCH: update order status and/or tracking info
export async function PATCH(request: NextRequest) {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) return NextResponse.json({ error }, { status: 401 });

    const body = await request.json();
    const { id, status, carrier, trackingNumber, trackingUrl } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Load current state so we can safely restock on cancellation exactly once.
    const existing = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const statusChanged = !!status && status !== existing.status;
    const isCancelling = status === 'cancelled' && existing.status !== 'cancelled';

    // Build the update payload additively — only set fields that were provided.
    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (carrier !== undefined) data.carrier = carrier || null;
    if (trackingNumber !== undefined) data.trackingNumber = trackingNumber || null;
    if (trackingUrl !== undefined) data.trackingUrl = trackingUrl || null;

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data,
        include: { items: true },
      });

      // Restore inventory only when transitioning INTO cancelled, and only for
      // items tied to a variant. This runs once because we guard on the previous
      // status, so re-saving a cancelled order will not double-restock.
      if (isCancelling) {
        const affectedProductIds = new Set<string>();
        for (const item of existing.items) {
          if (item.variantId) {
            const variant = await tx.productVariant.findUnique({
              where: { id: item.variantId },
            });
            if (variant) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { stockQuantity: { increment: item.quantity } },
              });
              affectedProductIds.add(item.productId);
            }
          }
        }
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
      }

      return updated;
    });

    // Fire status-update email to the customer (best-effort, non-blocking).
    if (statusChanged) {
      sendStatusEmail({
        orderNumber: order.orderNumber,
        email: order.email,
        firstName: order.firstName,
        status: order.status,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
      }).catch(err => console.error('Status email error:', err));
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
