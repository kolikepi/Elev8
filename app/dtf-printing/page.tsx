'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Palette, Layers, Printer, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import Link from 'next/link';

// Dynamic import to avoid SSR issues with Konva
const MockupEditor = dynamic(
  () => import('./_components/mockup-editor').then((mod) => mod.MockupEditor),
  { ssr: false, loading: () => <div className="h-[600px] bg-white/5 rounded-lg animate-pulse" /> }
);

export default function DTFPrintingPage() {
  const { t } = useLanguage();

  const steps = [
    { icon: Palette, labelKey: 'dtf.step1', descKey: 'dtf.step1Desc' },
    { icon: Layers, labelKey: 'dtf.step2', descKey: 'dtf.step2Desc' },
    { icon: Printer, labelKey: 'dtf.step3', descKey: 'dtf.step3Desc' },
    { icon: CheckCircle, labelKey: 'dtf.step4', descKey: 'dtf.step4Desc' },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Hero */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-20">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#32FF6A]/10 border border-[#32FF6A]/20 rounded-full mb-6">
              <Sparkles size={14} className="text-[#32FF6A]" />
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#32FF6A] font-medium">ELEV8 DTF Print</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              {t('dtf.heroTitle1')}{' '}
              <span className="text-[#32FF6A]">{t('dtf.heroTitle2')}</span>
            </h1>
            <p className="mt-6 text-[15px] text-white/50 leading-relaxed max-w-lg mx-auto">
              {t('dtf.heroSubtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 border-t border-white/5">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
                className="text-center py-6"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <step.icon size={20} className="text-[#32FF6A]" />
                </div>
                <div className="text-[11px] text-[#32FF6A] uppercase tracking-[0.2em] mb-1">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="text-[14px] font-semibold text-white mb-1">{t(step.labelKey)}</h3>
                <p className="text-[12px] text-white/40">{t(step.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Editor Section */}
      <section className="py-16 lg:py-20">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="mb-10">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#32FF6A] mb-3">{t('dtf.designStudio')}</p>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">{t('dtf.createYourDesign')}</h2>
            </div>
            <MockupEditor />
          </motion.div>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-16 border-t border-white/5 bg-[#0a0a0a]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-[14px] font-semibold text-white mb-2">{t('dtf.whatIsDtf')}</h3>
              <p className="text-[13px] text-white/40 leading-relaxed">{t('dtf.whatIsDtfDesc')}</p>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white mb-2">{t('dtf.quality')}</h3>
              <p className="text-[13px] text-white/40 leading-relaxed">{t('dtf.qualityDesc')}</p>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white mb-2">{t('dtf.pricing')}</h3>
              <p className="text-[13px] text-white/40 leading-relaxed">{t('dtf.pricingDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
          <p className="text-[15px] text-white/50 mb-6">{t('dtf.ctaText')}</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#32FF6A] text-black font-medium text-[13px] uppercase tracking-[0.1em] hover:bg-[#2ae85d] transition-colors"
          >
            {t('dtf.contactUs')} <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
