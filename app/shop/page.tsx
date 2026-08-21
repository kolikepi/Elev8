import { prisma } from '@/lib/db';
import { ShopClient } from './_components/shop-client';

export const dynamic = 'force-dynamic';

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export default async function ShopPage() {
  const products = await prisma.product.findMany({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
  });

  // Categories (kept as pills including an "all" entry)
  const dbCategories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort();
  const categories = ['all', ...dbCategories];

  // Facets derived strictly from real data – nothing invented.
  const genders = Array.from(
    new Set(products.map((p) => (p.gender ?? '').trim()).filter(Boolean))
  ).sort();

  const activities = Array.from(
    new Set(products.map((p) => (p.activity ?? '').trim()).filter(Boolean))
  ).sort();

  const collections = Array.from(
    new Set(products.map((p) => (p.collection ?? '').trim()).filter(Boolean))
  ).sort();

  // Sizes: union of what products actually carry, ordered canonically.
  const sizeSet = new Set<string>();
  products.forEach((p) => (p.sizes ?? []).forEach((s) => s && sizeSet.add(s)));
  const sizes = Array.from(sizeSet).sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  // Colors: pair colors[] with colorHexCodes[] by index, dedupe by name.
  const colorMap = new Map<string, string>();
  products.forEach((p) => {
    (p.colors ?? []).forEach((name, i) => {
      if (!name) return;
      const hex = p.colorHexCodes?.[i] ?? '#000000';
      if (!colorMap.has(name)) colorMap.set(name, hex);
    });
  });
  const colors = Array.from(colorMap.entries()).map(([name, hex]) => ({ name, hex }));

  // Price bounds from real prices.
  const prices = products.map((p) => p.price ?? 0).filter((n) => Number.isFinite(n));
  const priceBounds = {
    min: prices.length ? Math.floor(Math.min(...prices)) : 0,
    max: prices.length ? Math.ceil(Math.max(...prices)) : 0,
  };

  const hasBestSellers = products.some((p) => p.isBestSeller);

  return (
    <ShopClient
      initialProducts={products}
      categories={categories}
      genders={genders}
      activities={activities}
      collections={collections}
      sizes={sizes}
      colors={colors}
      priceBounds={priceBounds}
      hasBestSellers={hasBestSellers}
    />
  );
}
