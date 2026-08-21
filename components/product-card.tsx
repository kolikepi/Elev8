'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { useWishlist } from '@/lib/use-wishlist';

interface ProductCardProps {
  product: {
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
  };
  index?: number;
  theme?: 'dark' | 'light';
}

export function ProductCard({ product, index = 0, theme = 'dark' }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [secondError, setSecondError] = useState(false);
  const { t } = useLanguage();
  const { isWishlisted, toggle, mounted } = useWishlist();

  const light = theme === 'light';
  const discount = product?.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  // Second (hover) image: first additional url that is valid and differs from primary
  const secondImage = (product?.imageUrls ?? []).find(
    (u) => typeof u === 'string' && u.length > 0 && u !== product?.imageUrl
  );

  const active = mounted && isWishlisted(product?.id ?? '');

  const nameCls = light ? 'text-black' : 'text-white/80';
  const priceCls = light ? 'text-black/70' : 'text-white/60';
  const origCls = light ? 'text-black/30' : 'text-white/30';
  const swatchBorder = light ? 'border-black/15' : 'border-white/15';
  const badgeCls = light ? 'bg-black text-white' : 'bg-white text-black';
  const cardBg = light ? 'bg-[#f0f0f0]' : 'bg-[#0a0a0a]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <Link href={`/product/${product?.slug ?? ''}`}>
        {/* Image container */}
        <div className={`relative overflow-hidden ${cardBg}`}>
          <div className="relative aspect-[3/4] overflow-hidden">
            {!imageError && product?.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product?.name ?? 'Product'}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                loading="lazy"
                className={`object-cover transition-opacity duration-500 img-zoom ${
                  secondImage && !secondError ? 'group-hover:opacity-0' : ''
                }`}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${light ? 'bg-black/[0.04]' : 'bg-white/5'}`}>
                <span className={light ? 'text-black/20 text-sm' : 'text-white/20 text-sm'}>{t('product.noImage')}</span>
              </div>
            )}

            {/* Second image revealed on hover (desktop only – hover unavailable on touch) */}
            {secondImage && !secondError && (
              <Image
                src={secondImage}
                alt={product?.name ?? 'Product'}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                loading="lazy"
                className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                onError={() => setSecondError(true)}
              />
            )}

            {/* Subtle hover overlay */}
            <div className="product-overlay" />

            {/* Wishlist heart */}
            <button
              type="button"
              aria-label={t('product.wishlist')}
              title={t('product.wishlist')}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(product?.id ?? '');
              }}
              className={`absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 ${
                light
                  ? 'bg-white/70 hover:bg-white backdrop-blur-sm'
                  : 'bg-black/30 hover:bg-black/50 backdrop-blur-sm'
              }`}
            >
              <Heart
                className={`w-[15px] h-[15px] transition-colors ${
                  active
                    ? 'fill-[#32FF6A] text-[#32FF6A]'
                    : light
                    ? 'text-black/60'
                    : 'text-white/80'
                }`}
                strokeWidth={1.5}
              />
            </button>

            {/* Badges */}
            {(product?.badge || (product?.isBestSeller && !product?.badge) || discount > 0) && (
              <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                {product?.badge && (
                  <span className={`inline-block text-[10px] font-semibold uppercase tracking-[0.15em] px-2 py-0.5 ${badgeCls}`}>
                    {product.badge}
                  </span>
                )}
                {!product?.badge && product?.isBestSeller && (
                  <span className={`inline-block text-[10px] font-semibold uppercase tracking-[0.15em] px-2 py-0.5 ${badgeCls}`}>
                    {t('product.bestSeller')}
                  </span>
                )}
                {discount > 0 && (
                  <span className="inline-block text-[11px] font-medium text-[#32FF6A] tracking-wider">
                    -{discount}%
                  </span>
                )}
              </div>
            )}

            {/* Quick view on hover - bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-400 ease-out">
              <div className={`text-center py-3 ${light ? 'bg-black text-white' : 'bg-white text-black'}`}>
                <span className="text-[11px] font-medium uppercase tracking-[0.15em]">{t('product.quickView')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product info */}
        <div className="mt-3 space-y-1">
          <h3 className={`text-[13px] font-normal leading-tight ${nameCls}`}>
            {product?.name ?? 'Product Name'}
          </h3>
          <div className="flex items-center space-x-2">
            <span className={`text-[13px] ${priceCls}`}>
              €{(product?.price ?? 0).toFixed(2)}
            </span>
            {product?.originalPrice && (
              <span className={`text-[13px] line-through ${origCls}`}>
                €{product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Color swatches */}
          {(product?.colorHexCodes?.length ?? 0) > 0 && (
            <div className="flex items-center space-x-1 pt-1">
              {product?.colorHexCodes?.slice?.(0, 5)?.map?.((hex, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full border ${swatchBorder}`}
                  style={{ backgroundColor: hex ?? '#000' }}
                />
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
