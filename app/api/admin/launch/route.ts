import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

// Returns launch-readiness data: every product with the fields needed to
// evaluate whether it is complete enough to publish, plus a variant count.
export async function GET() {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        price: true,
        gender: true,
        activity: true,
        sizes: true,
        colors: true,
        imageUrl: true,
        imageUrls: true,
        fabricType: true,
        fit: true,
        careInstructions: true,
        _count: { select: { variants: true } },
      },
    });

    const result = products.map((p) => {
      const missing: string[] = [];
      if (!p.price || p.price <= 0) missing.push('price');
      if (!p.gender) missing.push('gender');
      if (!p.activity) missing.push('activity');
      if (!p.sizes || p.sizes.length === 0) missing.push('sizes');
      if (!p.colors || p.colors.length === 0) missing.push('colors');
      if (!p.imageUrl && (!p.imageUrls || p.imageUrls.length === 0)) missing.push('images');
      if (!p._count.variants || p._count.variants === 0) missing.push('inventory');
      if (!p.fabricType) missing.push('fabricType');
      if (!p.fit) missing.push('fit');
      if (!p.careInstructions || p.careInstructions.length === 0) missing.push('careInstructions');

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        status: p.status,
        variantCount: p._count.variants,
        missing,
        ready: missing.length === 0,
      };
    });

    return NextResponse.json({
      products: result,
      totalProducts: result.length,
      activeCount: result.filter((p) => p.status === 'active').length,
      draftCount: result.filter((p) => p.status !== 'active').length,
      readyCount: result.filter((p) => p.ready).length,
    });
  } catch (err) {
    console.error('Error building launch readiness:', err);
    return NextResponse.json({ error: 'Failed to build launch readiness' }, { status: 500 });
  }
}
