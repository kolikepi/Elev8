import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const size = searchParams.get('size');
    const color = searchParams.get('color');
    const featured = searchParams.get('featured');
    const bestSeller = searchParams.get('bestSeller');
    const ids = searchParams.get('ids');

    // Public API: only ever expose active (published) products.
    const where: Record<string, unknown> = { status: 'active' };

    if (ids) {
      const idList = ids.split(',').map((s) => s.trim()).filter(Boolean);
      // Empty id list must return nothing rather than everything.
      where.id = { in: idList.length > 0 ? idList : ['__none__'] };
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (size) {
      where.sizes = { has: size };
    }

    if (color) {
      where.colors = { has: color };
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (bestSeller === 'true') {
      where.isBestSeller = true;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
