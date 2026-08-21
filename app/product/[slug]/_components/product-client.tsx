'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Heart,
} from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { useLanguage } from '@/lib/language-context';
import { useToast } from '@/components/toast-provider';
import { useWishlist } from '@/lib/use-wishlist';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number | null;
  category: string;
  sizes: string[];
  colors: string[];
  colorHexCodes: string[];
  gsm: number | null;
  fabricType: string | null;
  imageUrl: string;
  imageUrls: string[];
  careInstructions: string[];
  features: string[];
  badge: string | null;
  isBestSeller?: boolean;
  inStock?: boolean;
  gender: string | null;
  activity: string | null;
  collection: string | null;
  fit: string | null;
  sku?: string | null;
  modelHeight: string | null;
  modelSize: string | null;
}

interface Variant {
  color: string;
  size: string;
  stockQuantity: number;
  lowStockThreshold: number | null;
}

interface ProductClientProps {
  product: Product;
  relatedProducts: Product[];
  variants?: Variant[];
}

type AccordionKey = 'details' | 'fit' | 'materials' | 'care' | 'shipping';

export function ProductClient({ product, relatedProducts, variants = [] }: ProductClientProps) {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { isWishlisted, toggle, mounted } = useWishlist();

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(product?.colors?.[0] ?? '');
  const [activeImage, setActiveImage] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [showError, setShowError] = useState(false);
  const [open, setOpen] = useState<Record<AccordionKey, boolean>>({
    details: true,
    fit: false,
    materials: false,
    care: false,
    shipping: false,
  });

  // Build a clean, de-duplicated list of real images only.
  const images = useMemo(() => {
    const all = [product?.imageUrl, ...(product?.imageUrls ?? [])].filter(
      (u): u is string => typeof u === 'string' && u.trim().length > 0
    );
    return Array.from(new Set(all));
  }, [product?.imageUrl, product?.imageUrls]);

  const [erroredImages, setErroredImages] = useState<Record<number, boolean>>({});

  // ---- Variant-aware stock logic ----
  const hasVariants = variants.length > 0;

  // Which sizes have any stock for the currently-selected color?
  const findVariant = (color: string, size: string) =>
    variants.find((v) => v.color === color && v.size === size);

  const sizeInStock = (size: string): boolean => {
    if (!hasVariants) return true; // no variant data -> rely on product-level flag
    if (!selectedColor) {
      // no color chosen yet: available if any color has this size in stock
      return variants.some((v) => v.size === size && v.stockQuantity > 0);
    }
    const v = findVariant(selectedColor, size);
    return !!v && v.stockQuantity > 0;
  };

  const selectedVariant =
    hasVariants && selectedColor && selectedSize
      ? findVariant(selectedColor, selectedSize)
      : undefined;

  // Overall out-of-stock: with variants -> no variant has stock; else product flag.
  const anyVariantInStock = variants.some((v) => v.stockQuantity > 0);
  const outOfStock = hasVariants ? !anyVariantInStock : product?.inStock === false;

  // Stock status for the selected color+size combination.
  type StockStatus = 'in' | 'low' | 'out' | null;
  const comboStatus: StockStatus = (() => {
    if (!hasVariants || !selectedColor || !selectedSize) return null;
    if (!selectedVariant || selectedVariant.stockQuantity <= 0) return 'out';
    const thr = selectedVariant.lowStockThreshold;
    if (thr != null && selectedVariant.stockQuantity <= thr) return 'low';
    return 'in';
  })();

  // Can we add the current selection to the bag?
  const comboUnavailable =
    hasVariants && !!selectedColor && !!selectedSize &&
    (!selectedVariant || selectedVariant.stockQuantity <= 0);

  const wished = mounted && isWishlisted(product?.id ?? '');

  const discount = product?.originalPrice && product.originalPrice > (product?.price ?? 0)
    ? Math.round(((product.originalPrice - (product?.price ?? 0)) / product.originalPrice) * 100)
    : 0;

  const toggleAccordion = (key: AccordionKey) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const goImage = (dir: number) => {
    if (images.length <= 1) return;
    setActiveImage((prev) => (prev + dir + images.length) % images.length);
  };

  const handleAddToCart = async () => {
    if (!session?.user) {
      showToast(t('product.loginToAdd'), 'error');
      router.push('/login');
      return;
    }
    if (!selectedColor) {
      setShowError(true);
      showToast(t('product.selectColorAlert'), 'error');
      return;
    }
    if (!selectedSize) {
      setShowError(true);
      showToast(t('product.selectSizeAlert'), 'error');
      return;
    }
    if (comboUnavailable) {
      showToast(t('product.outOfStock'), 'error');
      return;
    }

    setShowError(false);
    setIsAdding(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product?.id,
          quantity: 1,
          size: selectedSize,
          color: selectedColor,
        }),
      });

      if (res.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
        showToast(t('product.addedToBag'), 'cart');
        window.dispatchEvent(new CustomEvent('elev8-cart-change'));
      } else {
        const data = await res.json().catch(() => null);
        showToast(data?.error || t('product.errorAdding'), 'error');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      showToast(t('product.errorAdding'), 'error');
    } finally {
      setIsAdding(false);
    }
  };

  // Subtle meta chips (only when real values exist)
  const metaChips = [
    product?.activity ? { label: t('product.activity'), value: product.activity } : null,
    product?.collection ? { label: t('product.collection'), value: product.collection } : null,
    product?.fit ? { label: t('product.fit'), value: product.fit } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const hasMaterials = !!(product?.gsm || product?.fabricType);
  const hasFitInfo = !!(product?.fit || product?.modelHeight || product?.modelSize);

  return (
    <div className="min-h-screen bg-white text-black pt-[70px]">
      {/* Breadcrumb */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-5">
        <nav className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-black/40">
          <Link href="/" className="hover:text-black transition-colors">{t('product.home')}</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/shop" className="hover:text-black transition-colors">{t('product.shop')}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-black/70 truncate max-w-[180px]">{product?.name}</span>
        </nav>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 pb-28 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* ===================== GALLERY ===================== */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            {/* Main image */}
            <div className="relative aspect-[3/4] overflow-hidden bg-[#f4f4f4] group">
              {images.length > 0 && !erroredImages[activeImage] ? (
                <Image
                  key={activeImage}
                  src={images[activeImage]}
                  alt={`${product?.name ?? 'Product'} — ${activeImage + 1}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  priority
                  onError={() =>
                    setErroredImages((prev) => ({ ...prev, [activeImage]: true }))
                  }
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-black/20 text-sm">
                  {t('product.noImage')}
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-5 left-5 flex flex-col gap-1.5 items-start">
                {product?.badge && (
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.15em] bg-black text-white px-2.5 py-1">
                    {product.badge}
                  </span>
                )}
                {!product?.badge && product?.isBestSeller && (
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.15em] bg-black text-white px-2.5 py-1">
                    {t('product.bestSeller')}
                  </span>
                )}
                {discount > 0 && (
                  <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.1em] bg-[#32FF6A] text-black px-2 py-0.5">
                    -{discount}%
                  </span>
                )}
              </div>

              {/* Wishlist */}
              <button
                type="button"
                aria-label={t('product.wishlist')}
                onClick={() => toggle(product?.id ?? '')}
                className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 hover:bg-white backdrop-blur-sm transition-colors"
              >
                <Heart
                  className={`w-[18px] h-[18px] transition-colors ${
                    wished ? 'fill-[#32FF6A] text-[#32FF6A]' : 'text-black/60'
                  }`}
                  strokeWidth={1.5}
                />
              </button>

              {/* Prev / Next arrows */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous"
                    onClick={() => goImage(-1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 hover:bg-white backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100 md:opacity-100"
                  >
                    <ChevronLeft className="w-4 h-4 text-black" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next"
                    onClick={() => goImage(1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 hover:bg-white backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100 md:opacity-100"
                  >
                    <ChevronRight className="w-4 h-4 text-black" />
                  </button>

                  {/* Dot indicators (mobile-friendly) */}
                  <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-1.5 lg:hidden">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        aria-label={`${t('product.viewImage')} ${i + 1}`}
                        onClick={() => setActiveImage(i)}
                        className={`h-1.5 rounded-full transition-all ${
                          i === activeImage ? 'w-5 bg-black' : 'w-1.5 bg-black/30'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    aria-label={`${t('product.thumbnail')} ${i + 1}`}
                    className={`relative w-16 h-20 lg:w-20 lg:h-24 flex-shrink-0 overflow-hidden bg-[#f4f4f4] transition-all ${
                      i === activeImage ? 'ring-2 ring-black' : 'ring-1 ring-black/10 hover:ring-black/30'
                    }`}
                  >
                    {!erroredImages[i] ? (
                      <Image
                        src={img}
                        alt={`${product?.name ?? 'Product'} ${t('product.thumbnail')} ${i + 1}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                        onError={() =>
                          setErroredImages((prev) => ({ ...prev, [i]: true }))
                        }
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] text-black/30">
                        —
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* ===================== INFO / PURCHASE ===================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:py-2"
          >
            <div className="space-y-7">
              {/* Category & Name */}
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-black/40 mb-3">
                  {product?.category ?? ''}
                </p>
                <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight leading-tight">
                  {product?.name ?? ''}
                </h1>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className={`text-xl font-semibold ${discount > 0 ? 'text-[#0a8f3c]' : 'text-black'}`}>
                  €{(product?.price ?? 0).toFixed(2)}
                </span>
                {discount > 0 && product?.originalPrice && (
                  <>
                    <span className="text-base text-black/35 line-through">
                      €{product.originalPrice.toFixed(2)}
                    </span>
                    <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#0a8f3c]">
                      -{discount}%
                    </span>
                  </>
                )}
              </div>

              {/* Availability */}
              {outOfStock && (
                <p className="text-[12px] uppercase tracking-[0.15em] text-red-600 font-medium">
                  {t('product.outOfStock')}
                </p>
              )}

              {/* Description */}
              <p className="text-[14px] text-black/60 leading-relaxed">
                {product?.description ?? ''}
              </p>

              {/* Color Selection */}
              {(product?.colors?.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[11px] uppercase tracking-[0.2em] text-black/50">
                    {t('product.color')}
                    {selectedColor && <span className="text-black/80"> — {selectedColor}</span>}
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {(product?.colors ?? []).map((color, i) => {
                      const hex = product?.colorHexCodes?.[i] ?? '#000';
                      const isLight = ['#ffffff', '#fff', '#f5f5f5'].includes(hex.toLowerCase());
                      return (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          title={color}
                          className={`w-9 h-9 rounded-full transition-all flex items-center justify-center ${
                            selectedColor === color
                              ? 'ring-2 ring-offset-2 ring-offset-white ring-black scale-110'
                              : 'ring-1 ring-black/15 hover:ring-black/40'
                          }`}
                          style={{ backgroundColor: hex }}
                        >
                          {selectedColor === color && (
                            <Check className={`w-4 h-4 ${isLight ? 'text-black' : 'text-white'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              {(product?.sizes?.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] uppercase tracking-[0.2em] text-black/50">
                      {t('product.selectSize')}
                    </h3>
                    <Link
                      href="/size-guide"
                      className="text-[11px] uppercase tracking-[0.1em] text-black/50 hover:text-black transition-colors underline underline-offset-4"
                    >
                      {t('product.findYourSize')}
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(product?.sizes ?? []).map((size) => {
                      const available = sizeInStock(size);
                      return (
                        <button
                          key={size}
                          onClick={() => available && setSelectedSize(size)}
                          disabled={!available}
                          title={available ? size : t('product.outOfStock')}
                          className={`relative min-w-[52px] h-12 px-4 flex items-center justify-center text-[13px] font-medium border transition-all duration-200 ${
                            selectedSize === size
                              ? 'bg-black text-white border-black'
                              : available
                              ? 'border-black/15 text-black/70 hover:border-black'
                              : 'border-black/10 text-black/25 cursor-not-allowed line-through'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                  {showError && !selectedSize && (
                    <p className="text-[12px] text-red-600">{t('product.selectSizeAlert')}</p>
                  )}
                  {comboStatus === 'in' && (
                    <p className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-[#0a8f3c] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0a8f3c]" />
                      {t('product.inStock')}
                    </p>
                  )}
                  {comboStatus === 'low' && (
                    <p className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-amber-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {t('product.lowStock')}
                    </p>
                  )}
                  {comboStatus === 'out' && (
                    <p className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-red-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {t('product.outOfStock')}
                    </p>
                  )}
                </div>
              )}

              {/* Add to Cart (desktop / inline) */}
              <div className="hidden lg:block pt-1">
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding || outOfStock || comboUnavailable}
                  className={`w-full h-14 font-semibold text-[13px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all duration-300 ${
                    added
                      ? 'bg-[#32FF6A] text-black'
                      : 'bg-black text-white hover:bg-[#32FF6A] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white'
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{t('product.addedToBag')}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>
                        {outOfStock
                          ? t('product.outOfStock')
                          : isAdding
                          ? t('product.adding')
                          : t('product.addToBag')}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Meta chips */}
              {metaChips.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {metaChips.map((chip) => (
                    <span
                      key={chip.label}
                      className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-black/60 bg-[#f4f4f4] px-3 py-1.5"
                    >
                      <span className="text-black/35">{chip.label}:</span>
                      <span className="capitalize text-black/70">{chip.value}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Accordions */}
              <div className="pt-3">
                {/* PRODUCT DETAILS */}
                <AccordionSection
                  title={t('product.productDetails')}
                  isOpen={open.details}
                  onToggle={() => toggleAccordion('details')}
                >
                  <div className="space-y-4">
                    <p className="text-[13px] text-black/60 leading-relaxed">
                      {product?.description}
                    </p>
                    {(product?.features?.length ?? 0) > 0 && (
                      <ul className="space-y-2">
                        {(product?.features ?? []).map((feature, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-[#0a8f3c] text-[10px] mt-1.5">●</span>
                            <span className="text-[13px] text-black/60">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {product?.sku && (
                      <p className="text-[11px] uppercase tracking-[0.1em] text-black/35">
                        SKU: {product.sku}
                      </p>
                    )}
                  </div>
                </AccordionSection>

                {/* FIT & SIZING */}
                {hasFitInfo && (
                  <AccordionSection
                    title={t('product.fitSizing')}
                    isOpen={open.fit}
                    onToggle={() => toggleAccordion('fit')}
                  >
                    <div className="space-y-2 text-[13px] text-black/60">
                      {product?.fit && (
                        <p>
                          <span className="text-black/40">{t('product.fit')}: </span>
                          <span className="capitalize">{product.fit}</span>
                        </p>
                      )}
                      {(product?.modelHeight || product?.modelSize) && (
                        <p>
                          <span className="text-black/40">{t('product.modelInfo')}: </span>
                          {product.modelHeight && <span>{product.modelHeight}</span>}
                          {product.modelHeight && product.modelSize && ', '}
                          {product.modelSize && (
                            <span>{t('product.wearsSize')} {product.modelSize}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </AccordionSection>
                )}

                {/* MATERIALS */}
                {hasMaterials && (
                  <AccordionSection
                    title={t('product.materials')}
                    isOpen={open.materials}
                    onToggle={() => toggleAccordion('materials')}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      {product?.gsm && (
                        <div className="p-3 bg-[#f4f4f4]">
                          <p className="text-[10px] uppercase tracking-wider text-black/35 mb-1">
                            {t('product.weight')}
                          </p>
                          <p className="text-[13px] text-black/70">{product.gsm} GSM</p>
                        </div>
                      )}
                      {product?.fabricType && (
                        <div className="p-3 bg-[#f4f4f4]">
                          <p className="text-[10px] uppercase tracking-wider text-black/35 mb-1">
                            {t('product.fabric')}
                          </p>
                          <p className="text-[13px] text-black/70">{product.fabricType}</p>
                        </div>
                      )}
                    </div>
                  </AccordionSection>
                )}

                {/* CARE */}
                {(product?.careInstructions?.length ?? 0) > 0 && (
                  <AccordionSection
                    title={t('product.careInstructions')}
                    isOpen={open.care}
                    onToggle={() => toggleAccordion('care')}
                  >
                    <ul className="space-y-2">
                      {(product?.careInstructions ?? []).map((instruction, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-black/25 text-[10px] mt-1.5">●</span>
                          <span className="text-[13px] text-black/60">{instruction}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionSection>
                )}

                {/* SHIPPING & RETURNS */}
                <div className="border-t border-black/10">
                  <Link
                    href="/shipping-returns"
                    className="flex items-center justify-between py-5 text-[13px] uppercase tracking-[0.1em] text-black/70 hover:text-black transition-colors"
                  >
                    <span>{t('product.shippingReturns')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Related Products */}
        {(relatedProducts?.length ?? 0) > 0 && (
          <div className="mt-24 lg:mt-32">
            <div className="flex items-end justify-between mb-10">
              <h2 className="text-xl lg:text-2xl font-bold tracking-tight uppercase">
                {t('product.youMayAlsoLike')}
              </h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {(relatedProducts ?? []).map((relProduct, index) => (
                <ProductCard
                  key={relProduct?.id ?? index}
                  product={relProduct}
                  index={index}
                  theme="light"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile sticky Add to Bag */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-black/10 px-4 py-3 flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold">€{(product?.price ?? 0).toFixed(2)}</span>
          {selectedSize && selectedColor ? (
            <span className="text-[10px] uppercase tracking-[0.1em] text-black/45">
              {selectedColor} / {selectedSize}
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-[0.1em] text-black/45">
              {t('product.selectOptions')}
            </span>
          )}
        </div>
        <button
          onClick={handleAddToCart}
          disabled={isAdding || outOfStock || comboUnavailable}
          className={`flex-1 h-12 font-semibold text-[12px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all ${
            added
              ? 'bg-[#32FF6A] text-black'
              : 'bg-black text-white disabled:opacity-40'
          }`}
        >
          {added ? (
            <>
              <Check className="w-4 h-4" />
              <span>{t('product.addedToBag')}</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>
                {outOfStock
                  ? t('product.outOfStock')
                  : isAdding
                  ? t('product.adding')
                  : t('product.addToBag')}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function AccordionSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-black/10">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-[13px] uppercase tracking-[0.1em] text-black/70 hover:text-black transition-colors"
      >
        <span>{title}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && <div className="pb-6 -mt-1">{children}</div>}
    </div>
  );
}
