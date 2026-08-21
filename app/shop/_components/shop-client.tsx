'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal, ChevronDown, Check } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { useLanguage } from '@/lib/language-context';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  imageUrl: string;
  imageUrls: string[];
  category: string;
  sizes: string[];
  colors: string[];
  colorHexCodes: string[];
  badge?: string | null;
  gender?: string | null;
  activity?: string | null;
  collection?: string | null;
  inStock?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
}

interface ShopClientProps {
  initialProducts: Product[];
  categories: string[];
  genders: string[];
  activities: string[];
  collections: string[];
  sizes: string[];
  colors: { name: string; hex: string }[];
  priceBounds: { min: number; max: number };
  hasBestSellers: boolean;
}

export function ShopClient({
  initialProducts,
  categories,
  genders,
  activities,
  collections,
  sizes,
  colors,
  priceBounds,
  hasBestSellers,
}: ShopClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();

  const initialCategory = searchParams?.get?.('category') ?? 'all';
  const genderParam = searchParams?.get?.('gender') ?? null;
  const activityParam = searchParams?.get?.('activity') ?? null;
  const collectionParam = searchParams?.get?.('collection') ?? null;
  const badgeParam = searchParams?.get?.('badge') ?? null;

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedGender, setSelectedGender] = useState<string | null>(genderParam);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(activityParam);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(collectionParam);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(badgeParam);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const priceEnabled = priceBounds.max > priceBounds.min;
  const [priceMin, setPriceMin] = useState(priceBounds.min);
  const [priceMax, setPriceMax] = useState(priceBounds.max);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('featured');

  // Keep URL in sync with the primary facets for shareable links.
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (selectedGender) params.set('gender', selectedGender);
    if (selectedActivity) params.set('activity', selectedActivity);
    if (selectedCollection) params.set('collection', selectedCollection);
    if (selectedBadge) params.set('badge', selectedBadge);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedGender, selectedActivity, selectedCollection, selectedBadge]);

  const toggleInArray = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const labelFor = (value: string) => {
    const key = `nav.${value.toLowerCase()}`;
    const tr = t(key);
    if (tr !== key) return tr;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const filteredProducts = useMemo(() => {
    let products = (initialProducts ?? []).filter((product) => {
      if (selectedCategory !== 'all' && product?.category !== selectedCategory) return false;
      if (selectedGender && product?.gender?.toLowerCase() !== selectedGender.toLowerCase()) return false;
      if (selectedActivity && product?.activity?.toLowerCase() !== selectedActivity.toLowerCase()) return false;
      if (selectedCollection && product?.collection !== selectedCollection) return false;
      if (selectedBadge && product?.badge?.toLowerCase() !== selectedBadge.toLowerCase()) return false;
      if (selectedSizes.length && !selectedSizes.some((s) => (product?.sizes ?? []).includes(s))) return false;
      if (selectedColors.length && !selectedColors.some((c) => (product?.colors ?? []).includes(c))) return false;
      if (inStockOnly && product?.inStock === false) return false;
      if (priceEnabled) {
        const p = product?.price ?? 0;
        if (p < priceMin || p > priceMax) return false;
      }
      return true;
    });

    switch (sortBy) {
      case 'featured':
        products = [...products].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
        break;
      case 'bestSelling':
        products = [...products].sort((a, b) => Number(b.isBestSeller) - Number(a.isBestSeller));
        break;
      case 'price-low':
        products = [...products].sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        products = [...products].sort((a, b) => b.price - a.price);
        break;
      default:
        break; // 'newest' keeps server order (createdAt desc)
    }

    return products;
  }, [
    initialProducts,
    selectedCategory,
    selectedGender,
    selectedActivity,
    selectedCollection,
    selectedBadge,
    selectedSizes,
    selectedColors,
    inStockOnly,
    priceEnabled,
    priceMin,
    priceMax,
    sortBy,
  ]);

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedGender(null);
    setSelectedActivity(null);
    setSelectedCollection(null);
    setSelectedBadge(null);
    setSelectedSizes([]);
    setSelectedColors([]);
    setInStockOnly(false);
    setPriceMin(priceBounds.min);
    setPriceMax(priceBounds.max);
  };

  const priceChanged = priceEnabled && (priceMin !== priceBounds.min || priceMax !== priceBounds.max);

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    !!selectedGender ||
    !!selectedActivity ||
    !!selectedCollection ||
    !!selectedBadge ||
    selectedSizes.length > 0 ||
    selectedColors.length > 0 ||
    inStockOnly ||
    priceChanged;

  const activeCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedGender ? 1 : 0) +
    (selectedActivity ? 1 : 0) +
    (selectedCollection ? 1 : 0) +
    (selectedBadge ? 1 : 0) +
    selectedSizes.length +
    selectedColors.length +
    (inStockOnly ? 1 : 0) +
    (priceChanged ? 1 : 0);

  // Active filter chips (each individually clearable)
  const chips: { key: string; label: string; onClear: () => void }[] = [];
  if (selectedGender) chips.push({ key: 'g', label: labelFor(selectedGender), onClear: () => setSelectedGender(null) });
  if (selectedActivity) chips.push({ key: 'a', label: labelFor(selectedActivity), onClear: () => setSelectedActivity(null) });
  if (selectedCollection) chips.push({ key: 'col', label: selectedCollection, onClear: () => setSelectedCollection(null) });
  if (selectedCategory !== 'all') chips.push({ key: 'cat', label: selectedCategory, onClear: () => setSelectedCategory('all') });
  if (selectedBadge) chips.push({ key: 'b', label: t('nav.newArrivals'), onClear: () => setSelectedBadge(null) });
  selectedSizes.forEach((s) => chips.push({ key: `s-${s}`, label: s, onClear: () => setSelectedSizes((prev) => prev.filter((x) => x !== s)) }));
  selectedColors.forEach((c) => chips.push({ key: `c-${c}`, label: c, onClear: () => setSelectedColors((prev) => prev.filter((x) => x !== c)) }));
  if (inStockOnly) chips.push({ key: 'stock', label: t('shop.inStock'), onClear: () => setInStockOnly(false) });
  if (priceChanged) chips.push({ key: 'price', label: `€${priceMin} – €${priceMax}`, onClear: () => { setPriceMin(priceBounds.min); setPriceMax(priceBounds.max); } });

  // Editorial page title
  const pageTitle = useMemo(() => {
    if (selectedGender) return labelFor(selectedGender);
    if (selectedActivity) return labelFor(selectedActivity);
    if (selectedCollection) return selectedCollection;
    if (selectedBadge) return t('nav.newArrivals');
    if (selectedCategory !== 'all') return selectedCategory;
    return t('shop.allProducts');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGender, selectedActivity, selectedCollection, selectedBadge, selectedCategory, t]);

  // Reusable filter groups (shared by desktop sidebar + mobile drawer)
  const filterGroups = (
    <div className="space-y-9">
      {genders.length > 0 && (
        <div>
          <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-black/40 mb-4">{t('shop.gender')}</h3>
          <div className="space-y-1.5">
            {genders.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGender(selectedGender === g ? null : g)}
                className={`block w-full text-left text-[13px] transition-colors ${
                  selectedGender === g ? 'text-black font-medium' : 'text-black/50 hover:text-black'
                }`}
              >
                <span className={selectedGender === g ? 'border-b border-[#32FF6A] pb-0.5' : ''}>{labelFor(g)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activities.length > 0 && (
        <div>
          <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-black/40 mb-4">{t('shop.activity')}</h3>
          <div className="space-y-1.5">
            {activities.map((a) => (
              <button
                key={a}
                onClick={() => setSelectedActivity(selectedActivity === a ? null : a)}
                className={`block w-full text-left text-[13px] transition-colors ${
                  selectedActivity === a ? 'text-black font-medium' : 'text-black/50 hover:text-black'
                }`}
              >
                <span className={selectedActivity === a ? 'border-b border-[#32FF6A] pb-0.5' : ''}>{labelFor(a)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {collections.length > 0 && (
        <div>
          <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-black/40 mb-4">{t('shop.collection')}</h3>
          <div className="space-y-1.5">
            {collections.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCollection(selectedCollection === c ? null : c)}
                className={`block w-full text-left text-[13px] transition-colors ${
                  selectedCollection === c ? 'text-black font-medium' : 'text-black/50 hover:text-black'
                }`}
              >
                <span className={selectedCollection === c ? 'border-b border-[#32FF6A] pb-0.5' : ''}>{c}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-black/40 mb-4">{t('shop.size')}</h3>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const on = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  onClick={() => setSelectedSizes((prev) => toggleInArray(prev, size))}
                  className={`min-w-[40px] h-10 px-2 flex items-center justify-center text-[12px] border transition-all duration-200 ${
                    on ? 'bg-black text-white border-black' : 'border-black/15 text-black/60 hover:border-black/40'
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <div>
          <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-black/40 mb-4">{t('shop.color')}</h3>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((color) => {
              const on = selectedColors.includes(color?.name);
              return (
                <button
                  key={color?.name}
                  onClick={() => setSelectedColors((prev) => toggleInArray(prev, color?.name))}
                  title={color?.name}
                  className={`w-7 h-7 rounded-full transition-all ${
                    on
                      ? 'ring-2 ring-offset-2 ring-offset-[#fafafa] ring-[#32FF6A] scale-110'
                      : 'ring-1 ring-black/15 hover:ring-black/40'
                  }`}
                  style={{ backgroundColor: color?.hex ?? '#000' }}
                />
              );
            })}
          </div>
        </div>
      )}

      {priceEnabled && (
        <div>
          <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-black/40 mb-4">{t('shop.price')}</h3>
          <div className="flex items-center justify-between text-[12px] text-black/60 mb-3">
            <span>€{priceMin}</span>
            <span>€{priceMax}</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-black/30">{t('shop.min')}</label>
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                value={priceMin}
                onChange={(e) => setPriceMin(Math.min(Number(e.target.value), priceMax))}
                className="w-full accent-[#32FF6A] cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-black/30">{t('shop.max')}</label>
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                value={priceMax}
                onChange={(e) => setPriceMax(Math.max(Number(e.target.value), priceMin))}
                className="w-full accent-[#32FF6A] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-black/40 mb-4">{t('shop.availability')}</h3>
        <button
          onClick={() => setInStockOnly((v) => !v)}
          className="flex items-center gap-2.5 text-[13px] text-black/70 hover:text-black transition-colors"
        >
          <span
            className={`w-4 h-4 flex items-center justify-center border transition-colors ${
              inStockOnly ? 'bg-[#32FF6A] border-[#32FF6A]' : 'border-black/25'
            }`}
          >
            {inStockOnly && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
          </span>
          {t('shop.inStock')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa] text-black pt-[70px]">
      {/* Editorial page header */}
      <div className="border-b border-black/10">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight uppercase">
              {pageTitle}
            </h1>
            <p className="mt-2 text-[13px] text-black/40">
              {filteredProducts?.length ?? 0} {(filteredProducts?.length ?? 0) === 1 ? t('shop.product') : t('shop.products')}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
        {/* Toolbar */}
        <div className="flex items-center justify-between py-5 border-b border-black/10">
          <div className="flex items-center gap-4">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center gap-2 text-[13px] text-black/70 hover:text-black transition-colors lg:hidden"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="uppercase tracking-[0.1em]">{t('shop.filter')}</span>
              {activeCount > 0 && (
                <span className="w-4 h-4 bg-[#32FF6A] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>

            {/* Desktop category pills */}
            <div className="hidden lg:flex items-center gap-1">
              {(categories ?? []).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 text-[12px] uppercase tracking-[0.1em] transition-all duration-300 ${
                    selectedCategory === cat ? 'bg-black text-white' : 'text-black/50 hover:text-black'
                  }`}
                >
                  {cat === 'all' ? t('shop.all') : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-transparent text-[12px] text-black/60 uppercase tracking-[0.1em] pr-6 cursor-pointer focus:outline-none hover:text-black transition-colors"
            >
              <option value="featured">{t('shop.featured')}</option>
              <option value="newest">{t('shop.newest')}</option>
              {hasBestSellers && <option value="bestSelling">{t('shop.bestSelling')}</option>}
              <option value="price-low">{t('shop.priceLow')}</option>
              <option value="price-high">{t('shop.priceHigh')}</option>
            </select>
            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-black/30 pointer-events-none" />
          </div>
        </div>

        {/* Active filter chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 py-4">
            {chips.map((chip) => (
              <button
                key={chip.key}
                onClick={chip.onClear}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] bg-[#32FF6A]/10 text-black border border-[#32FF6A]/40 hover:bg-[#32FF6A]/20 transition-colors"
              >
                {chip.label}
                <X className="w-3 h-3" />
              </button>
            ))}
            <button
              onClick={clearFilters}
              className="text-[11px] uppercase tracking-[0.1em] text-black/50 hover:text-black underline underline-offset-2 ml-1"
            >
              {t('shop.clearAll')}
            </button>
          </div>
        )}

        <div className="flex gap-10 pt-6 pb-20">
          {/* Desktop sidebar */}
          <div className="hidden lg:block w-52 flex-shrink-0">
            <div className="sticky top-[90px]">{filterGroups}</div>
          </div>

          {/* Mobile filter drawer */}
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 lg:hidden"
              >
                <div className="absolute inset-0 bg-black/40" onClick={() => setIsFilterOpen(false)} />
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'tween', duration: 0.3 }}
                  className="absolute left-0 top-0 h-full w-[300px] bg-[#fafafa] p-6 overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-[13px] uppercase tracking-[0.2em] font-medium">{t('shop.filters')}</h2>
                    <button onClick={() => setIsFilterOpen(false)}>
                      <X className="w-5 h-5 text-black/60" />
                    </button>
                  </div>

                  {filterGroups}

                  <div className="mt-10 flex gap-3">
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="flex-1 py-3 text-[12px] uppercase tracking-[0.1em] border border-black/20 text-black/70 hover:text-black transition-colors"
                      >
                        {t('shop.clearAll')}
                      </button>
                    )}
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="flex-1 py-3 text-[12px] uppercase tracking-[0.1em] bg-black text-white hover:bg-black/90 transition-colors"
                    >
                      {t('shop.applyFilters')}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Product grid */}
          <div className="flex-1">
            {(filteredProducts?.length ?? 0) === 0 ? (
              <div className="text-center py-32">
                <p className="text-lg font-medium uppercase tracking-[0.1em] text-black">{t('shop.noProductsTitle')}</p>
                <p className="mt-3 text-[13px] text-black/40 max-w-sm mx-auto">{t('shop.noProductsDesc')}</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-6 inline-block px-6 py-3 text-[12px] uppercase tracking-[0.1em] bg-black text-white hover:bg-black/90 transition-colors"
                  >
                    {t('shop.clearFilters')}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
                {(filteredProducts ?? []).map((product, index) => (
                  <ProductCard key={product?.id ?? index} product={product} index={index} theme="light" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
