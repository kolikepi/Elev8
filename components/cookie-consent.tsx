'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';

const STORAGE_KEY = 'elev8_cookie_consent';

/**
 * Minimal cookie consent banner. Essential cookies are always active (needed
 * for the site to work); the banner only records the visitor's acknowledgement.
 * Analytics cookies are only mentioned/used when analytics is actually enabled.
 */
export function CookieConsent() {
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // localStorage unavailable — do not block the page
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ essential: true, ts: Date.now() })
      );
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  const copy =
    lang === 'sq'
      ? {
          text: 'Ky sajt përdor vetëm cookie thelbësore që e mbanë faqen të funksionale (shporta, hyrja, preferencat). Duke vazhduar, ju pranoni përdorimin e tyre.',
          more: 'Mëso më shumë',
          accept: 'Pranoj',
        }
      : {
          text: 'This site uses only essential cookies that keep the site working (cart, login, preferences). By continuing you accept their use.',
          more: 'Learn more',
          accept: 'Accept',
        };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4">
      <div className="max-w-[1440px] mx-auto">
        <div className="bg-[#111] border border-white/10 shadow-2xl px-5 py-5 sm:px-8 sm:py-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
          <p className="text-[12px] leading-relaxed text-white/60 flex-1">
            {copy.text}{' '}
            <Link href="/cookies" className="text-[#32FF6A] hover:underline whitespace-nowrap">
              {copy.more}
            </Link>
          </p>
          <button
            onClick={accept}
            className="shrink-0 bg-[#32FF6A] text-black text-[12px] font-semibold uppercase tracking-[0.15em] px-6 py-3 hover:bg-[#2ce35f] transition-colors"
          >
            {copy.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
