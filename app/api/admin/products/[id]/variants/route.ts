import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET all variants for a product
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) return NextResponse.json({ error }, { status: 401 });

    const { id } = await context.params;
    const variants = await prisma.productVariant.findMany({
      where: { productId: id },
      orderBy: [{ color: 'asc' }, { size: 'asc' }],
    });
    return NextResponse.json(variants);
  } catch (err) {
    console.error('Error fetching variants:', err);
    return NextResponse.json({ error: 'Failed to fetch variants' }, { status: 500 });
  }
}

// POST — upsert a batch of variants, or auto-generate missing combos from the
// product's configured colors x sizes (mode: 'generate').
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) return NextResponse.json({ error }, { status: 401 });

    const { id } = await context.params;
    const body = await request.json();

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // GENERATE MODE: create combos from product.colors x product.sizes that
    // don't already exist yet. Stock defaults to 0 (never fabricated).
    if (body?.mode === 'generate') {
      const existing = await prisma.productVariant.findMany({
        where: { productId: id },
        select: { color: true, size: true },
      });
      const existingKeys = new Set(existing.map((v) => `${v.color}|${v.size}`));

      const toCreate: {
        productId: string;
        color: string;
        colorHex: string | null;
        size: string;
        stockQuantity: number;
        active: boolean;
      }[] = [];

      (product.colors ?? []).forEach((color, i) => {
        (product.sizes ?? []).forEach((size) => {
          const key = `${color}|${size}`;
          if (!existingKeys.has(key)) {
            toCreate.push({
              productId: id,
              color,
              colorHex: product.colorHexCodes?.[i] ?? null,
              size,
              stockQuantity: 0,
              active: true,
            });
          }
        });
      });

      if (toCreate.length > 0) {
        await prisma.productVariant.createMany({ data: toCreate, skipDuplicates: true });
      }

      const variants = await prisma.productVariant.findMany({
        where: { productId: id },
        orderBy: [{ color: 'asc' }, { size: 'asc' }],
      });
      return NextResponse.json({ created: toCreate.length, variants });
    }

    // UPSERT MODE: body.variants = array of variant rows to save.
    const variants = Array.isArray(body?.variants) ? body.variants : [];
    for (const v of variants) {
      if (!v?.color || !v?.size) continue;
      const stockQuantity = Math.max(0, parseInt(String(v.stockQuantity ?? 0), 10) || 0);
      const lowStockThreshold =
        v.lowStockThreshold === '' || v.lowStockThreshold == null
          ? null
          : Math.max(0, parseInt(String(v.lowStockThreshold), 10) || 0);
      await prisma.productVariant.upsert({
        where: {
          productId_color_size: { productId: id, color: v.color, size: v.size },
        },
        create: {
          productId: id,
          color: v.color,
          colorHex: v.colorHex || null,
          size: v.size,
          sku: v.sku || null,
          stockQuantity,
          lowStockThreshold,
          active: v.active !== false,
        },
        update: {
          colorHex: v.colorHex || null,
          sku: v.sku || null,
          stockQuantity,
          lowStockThreshold,
          active: v.active !== false,
        },
      });
    }

    // Keep product.inStock in sync with variant availability.
    await syncProductInStock(id);

    const updated = await prisma.productVariant.findMany({
      where: { productId: id },
      orderBy: [{ color: 'asc' }, { size: 'asc' }],
    });
    return NextResponse.json({ variants: updated });
  } catch (err) {
    console.error('Error saving variants:', err);
    return NextResponse.json({ error: 'Failed to save variants' }, { status: 500 });
  }
}

async function syncProductInStock(productId: string) {
  const agg = await prisma.productVariant.aggregate({
    where: { productId, active: true },
    _sum: { stockQuantity: true },
    _count: true,
  });
  // Only auto-manage inStock when at least one variant exists.
  if ((agg._count ?? 0) > 0) {
    const inStock = (agg._sum.stockQuantity ?? 0) > 0;
    await prisma.product.update({ where: { id: productId }, data: { inStock } });
  }
}
