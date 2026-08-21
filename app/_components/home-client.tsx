'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { NewsletterForm } from '@/components/newsletter-form';
import { useLanguage } from '@/lib/language-context';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  imageUrl: string;
  imageUrls?: string[];
  category: string;
  colors: string[];
  colorHexCodes: string[];
  badge?: string | null;
  isBestSeller?: boolean;
  inStock?: boolean;
}

interface HomeClientProps {
  newDrop: Product[];
  bestSellers: Product[];
}

const ACTIVITIES = [
  {
    key: 'running',
    href: '/shop?activity=running',
    image: 'https://cdn.abacus.ai/images/29e7a4d2-990f-438a-b855-99cc0c8f7a68.png',
    titleKey: 'home.actRunning',
    ctaKey: 'home.shopRunning',
  },
  {
    key: 'training',
    href: '/shop?activity=training',
    image: 'https://cdn.abacus.ai/images/bd3d0a48-2da2-4d25-afee-d7f2b67d5130.png',
    titleKey: 'home.actTraining',
    ctaKey: 'home.shopTraining',
  },
  {
    key: 'everyday',
    href: '/shop?activity=lifestyle',
    image: 'https://cdn.abacus.ai/images/ab3beb11-8711-4c81-a803-48b1913f27c6.png',
    titleKey: 'home.actEveryday',
    ctaKey: 'home.shopEveryday',
  },
];

const COMMUNITY_IMAGES = [
  'https://cdn.abacus.ai/images/6a2be2a2-9bf5-4291-8bc7-d5ec967a3013.png',
  'https://cdn.abacus.ai/images/f3caa6b7-6bbc-4e62-9d34-765927c9fa92.png',
  'https://cdn.abacus.ai/images/0578f354-9aa6-4afb-8aa8-14f8e2c2dc55.png',
  'https://cdn.abacus.ai/images/ad8b1261-2bd6-4529-9afe-60296098308a.png',
  'https://cdn.abacus.ai/images/2988d342-0b35-4019-94d3-94347a372603.png',
  'https://cdn.abacus.ai/images/0d96a2d2-06be-446f-87b9-cea62f640efb.png',
];

const PRINCIPLES = [
  { titleKey: 'home.principleBreathable', descKey: 'home.principleBreathableDesc' },
  { titleKey: 'home.principleStretch', descKey: 'home.principleStretchDesc' },
  { titleKey: 'home.principleLightweight', descKey: 'home.principleLightweightDesc' },
  { titleKey: 'home.principleFit', descKey: 'home.principleFitDesc' },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

export function HomeClient({ newDrop, bestSellers }: HomeClientProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const { t } = useLanguage();

  // Subtle-only motion (no aggressive parallax).
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const hasNewDrop = (newDrop?.length ?? 0) > 0;
  const hasBestSellers = (bestSellers?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-black">
      {/* ============ 1. HERO — dark full-bleed ============ */}
      <section ref={heroRef} className="relative h-[88vh] min-h-[560px] overflow-hidden">
        <motion.div style={{ scale: heroScale }} className="absolute inset-0">
          <Image
            src="https://cdn.abacus.ai/images/bd57fff3-70bc-4f04-b594-14bd7b026fdb.png"
            alt="ELEV8 athlete sprinting on an urban track at dusk"
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
        </motion.div>

        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-10 h-full flex items-end pb-20 lg:pb-28"
        >
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10 w-full">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl"
            >
              <h1 className="font-display text-white text-[40px] leading-[0.95] sm:text-6xl lg:text-[80px] font-bold tracking-tight">
                {t('home.heroTitle1')}<br />{t('home.heroTitle2')}
              </h1>
              <p className="mt-6 text-[15px] lg:text-base text-white/60 leading-relaxed max-w-md">
                {t('home.heroSubtitle')}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
                <Link href="/shop?gender=men" className="btn-primary">
                  {t('home.shopMen')}
                </Link>
                <Link href="/shop?gender=women" className="btn-secondary">
                  {t('home.shopWomen')}
                </Link>
              </div>
              <p className="mt-8 text-[11px] uppercase tracking-[0.3em] text-white/30">
                {t('home.heroBrandLine')}
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ============ 2. Marquee — thin, understated ============ */}
      <section className="py-3 border-y border-white/5 overflow-hidden bg-black">
        <div className="animate-marquee whitespace-nowrap flex">
          {[...Array(12)].map((_, i) => (
            <span key={i} className="text-[11px] uppercase tracking-[0.35em] text-white/25 mx-8">
              {t('home.marquee')}
            </span>
          ))}
        </div>
      </section>

      {/* ============ 3. NEW DROP — white ============ */}
      {hasNewDrop && (
        <section className="py-20 lg:py-28 bg-white text-black">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
            <motion.div {...fadeUp} className="flex items-end justify-between mb-10 lg:mb-12">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-black/40 mb-3">{t('home.newDropLabel')}</p>
                <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight">
                  {t('home.newDropTitle')}
                </h2>
              </div>
              <Link
                href="/shop"
                className="hidden sm:flex items-center space-x-2 text-[12px] uppercase tracking-[0.15em] text-black/50 hover:text-black transition-colors group"
              >
                <span>{t('home.shopNew')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {newDrop.map((product, index) => (
                <ProductCard key={product?.id ?? index} product={product} index={index} theme="light" />
              ))}
            </div>

            <div className="sm:hidden text-center mt-10">
              <Link href="/shop" className="btn-dark inline-flex items-center gap-2">
                <span>{t('home.shopNew')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ============ 4. SHOP BY ACTIVITY — light gray editorial ============ */}
      <section className="py-20 lg:py-28 bg-[#f5f5f3] text-black">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <motion.div {...fadeUp} className="mb-10 lg:mb-14">
            <p className="text-[11px] uppercase tracking-[0.3em] text-black/40 mb-3">{t('home.activityLabel')}</p>
            <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight">
              {t('home.activityTitle')}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            {ACTIVITIES.map((act, i) => (
              <motion.div
                key={act.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link href={act.href} className="group relative block aspect-[3/4] overflow-hidden bg-black">
                  <Image
                    src={act.image}
                    alt={t(act.titleKey)}
                    fill
                    className="object-cover img-zoom"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                    <h3 className="font-display text-2xl lg:text-3xl font-bold text-white tracking-tight">
                      {t(act.titleKey)}
                    </h3>
                    <span className="mt-3 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/80 group-hover:text-[#32FF6A] transition-colors">
                      {t(act.ctaKey)}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 5. RUNNING CAMPAIGN — full-width image-led ============ */}
      <section className="relative h-[70vh] min-h-[480px] overflow-hidden">
        <Image
          src="https://cdn.abacus.ai/images/6d585613-5110-48ea-bab5-f25cea424ac7.png"
          alt="ELEV8 runner on an open urban road at sunrise"
          fill
          className="object-cover"
          sizes="100vw"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10 w-full">
            <motion.div {...fadeUp} className="max-w-xl">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#32FF6A] mb-4">{t('home.actRunning')}</p>
              <h2 className="font-display text-4xl lg:text-6xl font-bold tracking-tight leading-[1.02] text-white mb-5">
                {t('home.runCampaignTitle')}
              </h2>
              <p className="text-[15px] text-white/60 leading-relaxed mb-8 max-w-sm">
                {t('home.runCampaignSub')}
              </p>
              <Link href="/shop?activity=running" className="btn-primary inline-flex items-center gap-3 group">
                <span>{t('home.shopRunning')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ 6. BEST SELLERS — white ============ */}
      {hasBestSellers && (
        <section className="py-20 lg:py-28 bg-white text-black">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
            <motion.div {...fadeUp} className="flex items-end justify-between mb-10 lg:mb-12">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-black/40 mb-3">{t('home.mostPopular')}</p>
                <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight">
                  {t('home.bestSellers')}
                </h2>
              </div>
              <Link
                href="/shop"
                className="hidden sm:flex items-center space-x-2 text-[12px] uppercase tracking-[0.15em] text-black/50 hover:text-black transition-colors group"
              >
                <span>{t('home.shopAll')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {bestSellers.map((product, index) => (
                <ProductCard key={product?.id ?? index} product={product} index={index} theme="light" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ 7. WHY ELEV8 — black, brand philosophy ============ */}
      <section className="py-24 lg:py-32 bg-black text-white">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <motion.div {...fadeUp} className="max-w-2xl mb-14 lg:mb-20">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#32FF6A] mb-4">{t('home.whyLabel')}</p>
            <h2 className="font-display text-4xl lg:text-6xl font-bold tracking-tight leading-[1.02] mb-6">
              {t('home.whyTitle')}
            </h2>
            <p className="text-[15px] lg:text-base text-white/50 leading-relaxed">
              {t('home.whyDesc')}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 lg:gap-8">
            {PRINCIPLES.map((p, i) => (
              <motion.div
                key={p.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="border-t border-white/15 pt-5"
              >
                <div className="text-[#32FF6A] text-xs font-semibold tracking-[0.2em] mb-3">{String(i + 1).padStart(2, '0')}</div>
                <h3 className="text-lg font-medium mb-2">{t(p.titleKey)}</h3>
                <p className="text-[13px] text-white/45 leading-relaxed">{t(p.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 8. COMMUNITY / UGC — white ============ */}
      <section className="py-20 lg:py-28 bg-white text-black">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <motion.div {...fadeUp} className="text-center mb-10 lg:mb-14">
            <p className="text-[11px] uppercase tracking-[0.3em] text-black/40 mb-3">{t('home.communityLabel')}</p>
            <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              {t('home.communityTitle')}
            </h2>
            <p className="text-[14px] text-black/50 leading-relaxed max-w-md mx-auto">
              {t('home.communityDesc')}
            </p>
          </motion.div>

          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-3">
            {COMMUNITY_IMAGES.map((src, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: (i % 6) * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="group relative aspect-square overflow-hidden bg-[#f0f0f0]"
              >
                <Image
                  src={src}
                  alt="ELEV8 community member training"
                  fill
                  className="object-cover img-zoom"
                  sizes="(max-width: 1024px) 33vw, 16vw"
                  loading="lazy"
                />
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10 lg:mt-12">
            <Link href="/shop" className="btn-dark inline-flex items-center gap-3 group">
              <span>{t('home.joinMovement')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============ 9. BRAND STORY — short, off-white ============ */}
      <section className="py-24 lg:py-32 bg-[#f5f5f3] text-black">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <motion.div {...fadeUp} className="max-w-2xl mx-auto text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-black/40 mb-4">{t('home.storyLabel')}</p>
            <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              {t('home.storyTitle')}
            </h2>
            <p className="text-[15px] lg:text-base text-black/60 leading-relaxed mb-8">
              {t('home.storyDesc')}
            </p>
            <Link href="/about" className="btn-outline-dark inline-flex items-center gap-3 group">
              <span>{t('home.ourStory')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ============ 10. NEWSLETTER (dark) + Footer ============ */}
      <NewsletterForm />
    </div>
  );
}
