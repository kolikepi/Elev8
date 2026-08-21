'use client';

import Link from 'next/link';
import { Instagram, Music2, Globe } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { useSiteSettings } from '@/lib/use-settings';

export function Footer() {
  const { t } = useLanguage();
  const { settings } = useSiteSettings();

  const hasSocials = !!(settings.instagram || settings.tiktok || settings.websiteUrl);

  return (
    <footer className="bg-black">
      {/* Minimal divider */}
      <div className="border-t border-white/10" />

      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-16">
        {/* Top section - Logo + nav */}
        <div className="flex flex-col lg:flex-row items-start justify-between gap-12 mb-16">
          {/* Brand */}
          <div className="lg:max-w-sm">
            <Link href="/" className="inline-block">
              <span className="text-[22px] font-bold tracking-[0.2em] text-white">
                ELEV<span className="text-[#32FF6A]">8</span>
              </span>
            </Link>
            <p className="mt-4 text-[13px] text-white/40 leading-relaxed">
              {t('footer.tagline')}
            </p>
            {settings.addressLine ? (
              <p className="mt-2 text-[11px] text-white/30" suppressHydrationWarning>
                {settings.addressLine}
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-white/30">{t('footer.location')}</p>
            )}

            {/* Social links — only render those configured */}
            {hasSocials && (
              <div className="mt-6 flex items-center gap-4" suppressHydrationWarning>
                {settings.instagram && (
                  <a
                    href={settings.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="text-white/40 hover:text-[#32FF6A] transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {settings.tiktok && (
                  <a
                    href={settings.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="text-white/40 hover:text-[#32FF6A] transition-colors"
                  >
                    <Music2 className="w-4 h-4" />
                  </a>
                )}
                {settings.websiteUrl && (
                  <a
                    href={settings.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Website"
                    className="text-white/40 hover:text-[#32FF6A] transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Navigation columns */}
          <div className="flex gap-16 lg:gap-24">
            <div>
              <h4 className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40 mb-5">{t('footer.shop')}</h4>
              <ul className="space-y-3">
                {[
                  { label: t('nav.men'), href: '/shop?gender=men' },
                  { label: t('nav.women'), href: '/shop?gender=women' },
                  { label: t('nav.running'), href: '/shop?activity=running' },
                  { label: t('nav.training'), href: '/shop?activity=training' },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-[13px] text-white/60 hover:text-white transition-colors duration-300"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40 mb-5">{t('footer.info')}</h4>
              <ul className="space-y-3">
                {[
                  { label: t('footer.about'), href: '/about' },
                  { label: t('footer.sizeGuide'), href: '/size-guide' },
                  { label: t('footer.shipping'), href: '/shipping-returns' },
                  { label: t('footer.returns'), href: '/returns' },
                  { label: t('footer.contact'), href: '/contact' },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-[13px] text-white/60 hover:text-white transition-colors duration-300"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-[11px] text-white/30 tracking-wider">
            {t('footer.copyright')}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {[
              { label: t('footer.privacy'), href: '/privacy' },
              { label: t('footer.terms'), href: '/terms' },
              { label: t('footer.cookies'), href: '/cookies' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[11px] text-white/30 hover:text-white/70 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
