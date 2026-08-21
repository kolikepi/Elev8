import { prisma } from '@/lib/db';
import { HomeClient } from './_components/home-client';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // NEW DROP: prioritise products explicitly badged NEW; otherwise fall back to the
  // newest products by creation date (no fake NEW badges are ever assigned).
  const badgedNew = await prisma.product.findMany({
    where: { badge: 'NEW', status: 'active' },
    orderBy: { createdAt: 'desc' },
    take: 4,
  });

  const newDrop =
    badgedNew.length > 0
      ? badgedNew
      : await prisma.product.findMany({
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 4,
        });

  const bestSellers = await prisma.product.findMany({
    where: { isBestSeller: true, status: 'active' },
    orderBy: { createdAt: 'desc' },
    take: 4,
  });

  return <HomeClient newDrop={newDrop} bestSellers={bestSellers} />;
}
