import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as { id?: string })?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      );
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true, variant: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(cartItems);
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as { id?: string })?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { productId, quantity, size, color } = body ?? {};
    const addQty = Math.max(1, Number(quantity) || 1);

    if (!productId || !size || !color) {
      return NextResponse.json(
        { error: 'Product ID, size, and color are required' },
        { status: 400 }
      );
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId_size_color: {
          userId,
          productId,
          size,
          color,
        },
      },
    });

    // ---- Stock validation (variant-aware, backward compatible) ----
    const productVariants = await prisma.productVariant.findMany({
      where: { productId, active: true },
    });
    let matchedVariantId: string | null = null;

    if (productVariants.length > 0) {
      const variant = productVariants.find(
        (v) => v.color === color && v.size === size
      );
      if (!variant) {
        return NextResponse.json(
          { error: 'This size and color combination is not available.' },
          { status: 409 }
        );
      }
      matchedVariantId = variant.id;
      const desiredTotal = (existingItem?.quantity ?? 0) + addQty;
      if (variant.stockQuantity <= 0) {
        return NextResponse.json(
          { error: 'This item is out of stock.' },
          { status: 409 }
        );
      }
      if (desiredTotal > variant.stockQuantity) {
        return NextResponse.json(
          {
            error: `Only ${variant.stockQuantity} in stock. You already have ${existingItem?.quantity ?? 0} in your bag.`,
          },
          { status: 409 }
        );
      }
    } else {
      // No variant data: fall back to product-level availability flag.
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (product && product.inStock === false) {
        return NextResponse.json(
          { error: 'This item is out of stock.' },
          { status: 409 }
        );
      }
    }

    if (existingItem) {
      const updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + addQty,
          ...(matchedVariantId ? { variantId: matchedVariantId } : {}),
        },
        include: { product: true },
      });
      return NextResponse.json(updatedItem);
    }

    const cartItem = await prisma.cartItem.create({
      data: {
        userId,
        productId,
        quantity: addQty,
        size,
        color,
        ...(matchedVariantId ? { variantId: matchedVariantId } : {}),
      },
      include: { product: true },
    });

    return NextResponse.json(cartItem);
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { error: 'Failed to add to cart' },
      { status: 500 }
    );
  }
}
