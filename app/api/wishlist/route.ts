import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id ?? null;
}

// GET: full wishlist for the logged-in user, with product data.
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(items);
}

// POST { productId }: add to wishlist (idempotent).
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { productId } = await req.json();
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Wishlist POST error:', e);
    return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 });
  }
}

// DELETE ?productId=...: remove from wishlist.
export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const productId = req.nextUrl.searchParams.get('productId');
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

    await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Wishlist DELETE error:', e);
    return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 });
  }
}
