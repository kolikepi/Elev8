import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST { productIds: string[] } — merge a guest (localStorage) wishlist into the
// account, then return the full de-duplicated list of product ids.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id ?? null;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const productIds: string[] = Array.isArray(body?.productIds)
      ? body.productIds.filter((x: unknown) => typeof x === 'string')
      : [];

    if (productIds.length > 0) {
      // Only merge ids that reference real products.
      const valid = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
      });
      const validIds = valid.map((p) => p.id);
      if (validIds.length > 0) {
        await prisma.wishlistItem.createMany({
          data: validIds.map((productId) => ({ userId, productId })),
          skipDuplicates: true,
        });
      }
    }

    const all = await prisma.wishlistItem.findMany({
      where: { userId },
      select: { productId: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ ids: all.map((w) => w.productId) });
  } catch (e) {
    console.error('Wishlist merge error:', e);
    return NextResponse.json({ error: 'Failed to merge wishlist' }, { status: 500 });
  }
}
