import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Public product search. Matches name / category / description / collection /
// activity / gender, case-insensitive. Returns a lightweight product list.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();

  if (q.length < 2) {
    return NextResponse.json({ results: [], query: q });
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        status: 'active',
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { collection: { contains: q, mode: 'insensitive' } },
          { activity: { contains: q, mode: 'insensitive' } },
          { gender: { contains: q, mode: 'insensitive' } },
          { fabricType: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        originalPrice: true,
        imageUrl: true,
        category: true,
        inStock: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    return NextResponse.json({ results: products, query: q });
  } catch (e) {
    console.error('Search error:', e);
    return NextResponse.json({ error: 'Search failed', results: [] }, { status: 500 });
  }
}
