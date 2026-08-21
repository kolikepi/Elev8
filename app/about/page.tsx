'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-black pt-[70px]">
      {/* Hero */}
      <section className="relative h-[60vh] lg:h-[70vh] overflow-hidden">
        <Image
          src="https://cdn.abacus.ai/images/070924c5-a5a9-4a02-8117-2a2f70e2802e.png"
          alt="ELEV8 team wearing premium activewear"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10 w-full pb-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#32FF6A] mb-3">{t('about.label')}</p>
              <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
                {t('about.title')}
              </h1>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 lg:py-32">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#32FF6A] mb-4">{t('about.missionLabel')}</p>
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-8">
                {t('about.missionTitle')}
              </h2>
              <div className="space-y-5 text-[15px] text-white/50 leading-relaxed">
                <p>{t('about.missionP1')}</p>
                <p>{t('about.missionP2')}</p>
                <p>
                  {t('about.missionP3')} <span className="text-[#32FF6A]">{t('about.missionHighlight')}</span>{t('about.missionP3end')}
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative aspect-[4/5] overflow-hidden bg-[#0a0a0a]"
            >
              <Image
                src="https://cdn.abacus.ai/images/94016e4a-568d-4e27-8f76-8c690a207799.png"
                alt="ELEV8 premium fabric detail"
                fill
                className="object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 lg:py-32 bg-[#0a0a0a]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              {t('about.valuesTitle')}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5">
            {[
              { num: '01', titleKey: 'about.value1Title', descKey: 'about.value1Desc' },
              { num: '02', titleKey: 'about.value2Title', descKey: 'about.value2Desc' },
              { num: '03', titleKey: 'about.value3Title', descKey: 'about.value3Desc' },
            ].map((value, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-black p-10 lg:p-12"
              >
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#32FF6A] mb-6">{value.num}</p>
                <h3 className="text-xl font-bold tracking-tight mb-4">{t(value.titleKey)}</h3>
                <p className="text-[14px] text-white/40 leading-relaxed">{t(value.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision banner */}
      <section className="relative h-[50vh] lg:h-[60vh] overflow-hidden">
        <Image
          src="https://cdn.abacus.ai/images/08d75c81-e67e-4a47-aa5f-fbcc27bfd3a9.png"
          alt="ELEV8 brand vision"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl px-6"
          >
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">
              {t('about.visionTitle')}
            </h2>
            <p className="text-[15px] text-white/60 leading-relaxed">
              {t('about.visionDesc')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 lg:py-32">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold tracking-tight mb-8">
              {t('about.ctaTitle')}
            </h2>
            <Link href="/shop" className="btn-primary inline-flex items-center space-x-3 group">
              <span>{t('about.ctaButton')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
