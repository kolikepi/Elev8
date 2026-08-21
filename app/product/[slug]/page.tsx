import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ProductClient } from './_components/product-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = params?.slug;
  if (!slug) return { title: 'ELEV8' };

  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) return { title: 'ELEV8' };

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const canonical = `${baseUrl}/product/${product.slug}`;
  const description =
    (product.description ?? '').slice(0, 160) ||
    'Performance-built activewear by ELEV8.';
  const ogImage = product.imageUrl || '/og-image.png';

  return {
    metadataBase: new URL(baseUrl),
    title: `${product.name} | ELEV8`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${product.name} | ELEV8`,
      description,
      url: canonical,
      images: [{ url: ogImage }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | ELEV8`,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const slug = params?.slug;

  if (!slug) {
    notFound();
  }

  const product = await prisma.product.findUnique({
    where: { slug },
  });

  if (!product || product.status === 'draft') {
    notFound();
  }

  // Related products: prefer same category, then broaden by gender/activity/collection.
  // Exclude the current product; keep it deterministic and capped at 4.
  const related = await prisma.product.findMany({
    where: {
      status: 'active',
      NOT: { id: product.id },
      OR: [
        { category: product.category },
        product.gender ? { gender: product.gender } : {},
        product.activity ? { activity: product.activity } : {},
        product.collection ? { collection: product.collection } : {},
      ].filter((c) => Object.keys(c).length > 0),
    },
    take: 12,
  });

  // Rank: same category first, then shared attributes.
  const scored = related
    .map((p) => {
      let score = 0;
      if (p.category === product.category) score += 3;
      if (product.gender && p.gender === product.gender) score += 1;
      if (product.activity && p.activity === product.activity) score += 1;
      if (product.collection && p.collection === product.collection) score += 1;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.p);

  // Active variants power real-time stock display on the detail page.
  const variantRows = await prisma.productVariant.findMany({
    where: { productId: product.id, active: true },
    orderBy: [{ color: 'asc' }, { size: 'asc' }],
  });
  const variants = variantRows.map((v) => ({
    color: v.color,
    size: v.size,
    stockQuantity: v.stockQuantity,
    lowStockThreshold: v.lowStockThreshold,
  }));

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const productImages = [product.imageUrl, ...(product.imageUrls ?? [])].filter(
    (u) => typeof u === 'string' && u.length > 0
  );

  // Overall availability: with variants, in stock only if any active variant has stock.
  const hasVariants = variants.length > 0;
  const variantInStock = variants.some((v) => v.stockQuantity > 0);
  const availability =
    (hasVariants ? variantInStock : product.inStock)
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';

  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: productImages,
    description: product.description,
    sku: product.sku || product.id,
    brand: { '@type': 'Brand', name: 'ELEV8' },
    category: product.category,
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/product/${product.slug}`,
      priceCurrency: 'EUR',
      price: (product.price ?? 0).toFixed(2),
      availability,
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${baseUrl}/shop` },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: `${baseUrl}/product/${product.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <ProductClient product={product} relatedProducts={scored} variants={variants} />
    </>
  );
}
