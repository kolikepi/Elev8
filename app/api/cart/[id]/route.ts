import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as { id?: string })?.id;
    const itemId = params?.id;

    if (!userId || !itemId) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { quantity } = body ?? {};

    const existingItem = await prisma.cartItem.findFirst({
      where: { id: itemId, userId },
      include: { variant: true, product: true },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      );
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({
        where: { id: itemId },
      });
      return NextResponse.json({ deleted: true });
    }

    // Respect inventory: if this line is tied to a variant, cap at its stock.
    // If no variant, fall back to the product-level in-stock flag.
    if (existingItem.variant) {
      if (!existingItem.variant.active || existingItem.variant.stockQuantity <= 0) {
        return NextResponse.json(
          { error: 'This item is out of stock', code: 'OUT_OF_STOCK', available: 0 },
          { status: 409 }
        );
      }
      if (quantity > existingItem.variant.stockQuantity) {
        return NextResponse.json(
          {
            error: `Only ${existingItem.variant.stockQuantity} left in stock`,
            code: 'INSUFFICIENT_STOCK',
            available: existingItem.variant.stockQuantity,
          },
          { status: 409 }
        );
      }
    } else if (existingItem.product && existingItem.product.inStock === false) {
      return NextResponse.json(
        { error: 'This item is out of stock', code: 'OUT_OF_STOCK', available: 0 },
        { status: 409 }
      );
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: { product: true },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating cart item:', error);
    return NextResponse.json(
      { error: 'Failed to update cart item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as { id?: string })?.id;
    const itemId = params?.id;

    if (!userId || !itemId) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: { id: itemId, userId },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      );
    }

    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting cart item:', error);
    return NextResponse.json(
      { error: 'Failed to delete cart item' },
      { status: 500 }
    );
  }
}
