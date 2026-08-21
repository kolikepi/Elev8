'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { useWishlist } from '@/lib/use-wishlist';
import { useLanguage } from '@/lib/language-context';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number | null;
  imageUrl: string;
  imageUrls?: string[];
  category: string;
  colors: string[];
  colorHexCodes: string[];
  badge?: string | null;
  isBestSeller?: boolean;
  inStock?: boolean;
}

export default function WishlistPage() {
  const { ids, mounted } = useWishlist();
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mounted) return;
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/products?ids=${encodeURIComponent(ids.join(','))}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Product[]) => {
        // Preserve wishlist ordering (most recently added first).
        const order = new Map(ids.map((id, i) => [id, i]));
        const sorted = [...(data ?? [])].sort(
          (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
        );
        setProducts(sorted);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [ids, mounted]);

  return (
    <div className="min-h-screen bg-[#fafafa] text-black pt-[70px]">
      <div className="border-b border-black/10">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10">
          <p className="text-[11px] uppercase tracking-[0.3em] text-black/40 mb-2">{t('nav.wishlist')}</p>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight uppercase flex items-center gap-3">
            {t('wishlist.title')}
            {mounted && ids.length > 0 && (
              <span className="text-base font-medium text-black/40 normal-case tracking-normal">
                ({ids.length})
              </span>
            )}
          </h1>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10">
        {!mounted || loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <Heart className="w-16 h-16 text-black/15 mx-auto mb-6" strokeWidth={1.25} />
            <h2 className="text-lg font-semibold uppercase tracking-wide mb-2">{t('wishlist.empty')}</h2>
            <p className="text-[13px] text-black/40 max-w-sm mx-auto mb-8">{t('wishlist.emptyDesc')}</p>
            <Link
              href="/shop"
              className="inline-block px-8 py-3 text-[12px] uppercase tracking-[0.1em] bg-black text-white hover:bg-black/90 transition-colors"
            >
              {t('wishlist.browse')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} theme="light" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
