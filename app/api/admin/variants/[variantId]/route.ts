import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

interface RouteContext {
  params: Promise<{ variantId: string }>;
}

// PATCH — update a single variant (stock, sku, threshold, active).
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) return NextResponse.json({ error }, { status: 401 });

    const { variantId } = await context.params;
    const data = await request.json();
    const updateData: Record<string, unknown> = {};

    if (data.stockQuantity !== undefined)
      updateData.stockQuantity = Math.max(0, parseInt(String(data.stockQuantity), 10) || 0);
    if (data.sku !== undefined) updateData.sku = data.sku || null;
    if (data.colorHex !== undefined) updateData.colorHex = data.colorHex || null;
    if (data.active !== undefined) updateData.active = !!data.active;
    if (data.lowStockThreshold !== undefined)
      updateData.lowStockThreshold =
        data.lowStockThreshold === '' || data.lowStockThreshold == null
          ? null
          : Math.max(0, parseInt(String(data.lowStockThreshold), 10) || 0);

    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: updateData,
    });

    await syncProductInStock(variant.productId);
    return NextResponse.json(variant);
  } catch (err) {
    console.error('Error updating variant:', err);
    return NextResponse.json({ error: 'Failed to update variant' }, { status: 500 });
  }
}

// DELETE a single variant
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) return NextResponse.json({ error }, { status: 401 });

    const { variantId } = await context.params;
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    await prisma.productVariant.delete({ where: { id: variantId } });
    if (variant) await syncProductInStock(variant.productId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting variant:', err);
    return NextResponse.json({ error: 'Failed to delete variant' }, { status: 500 });
  }
}

async function syncProductInStock(productId: string) {
  const agg = await prisma.productVariant.aggregate({
    where: { productId, active: true },
    _sum: { stockQuantity: true },
    _count: true,
  });
  if ((agg._count ?? 0) > 0) {
    const inStock = (agg._sum.stockQuantity ?? 0) > 0;
    await prisma.product.update({ where: { id: productId }, data: { inStock } });
  }
}
