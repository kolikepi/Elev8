'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, RotateCcw, MapPin, Mail } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { useSiteSettings } from '@/lib/use-settings';

interface ShippingConfig {
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  tiranaEnabled: boolean;
  tiranaRate: number;
  tiranaDeliveryText: string | null;
  albaniaEnabled: boolean;
  standardRate: number;
  albaniaDeliveryText: string | null;
  internationalEnabled: boolean;
  internationalRate: number;
  internationalDeliveryText: string | null;
}

export default function ShippingReturnsPage() {
  const { t, lang } = useLanguage();
  const { settings } = useSiteSettings();
  const [shipping, setShipping] = useState<ShippingConfig | null>(null);

  useEffect(() => {
    fetch('/api/shipping')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setShipping(d))
      .catch(() => {});
  }, []);

  const currency = settings.currency || 'EUR';
  const fmt = (n: number) =>
    currency === 'ALL' ? `${n} Lekë` : `${n} ${currency}`;

  const regions = shipping
    ? [
        {
          enabled: shipping.tiranaEnabled,
          place: lang === 'sq' ? 'Tiranë' : 'Tirana',
          rate: shipping.tiranaRate,
          text: shipping.tiranaDeliveryText,
        },
        {
          enabled: shipping.albaniaEnabled,
          place: lang === 'sq' ? 'Pjesëa tjetër e Shqipërisë' : 'Rest of Albania',
          rate: shipping.standardRate,
          text: shipping.albaniaDeliveryText,
        },
        {
          enabled: shipping.internationalEnabled,
          place: lang === 'sq' ? 'Ndërkombëtare' : 'International',
          rate: shipping.internationalRate,
          text: shipping.internationalDeliveryText,
        },
      ].filter((r) => r.enabled)
    : [];

  const showFreeShipping =
    shipping?.freeShippingEnabled && shipping.freeShippingThreshold > 0;

  const paymentMethods = [
    settings.codEnabled !== false ? t('shipping.cod') : null,
    settings.bankTransferEnabled !== false ? t('shipping.bankTransfer') : null,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-black pt-[70px]">
      {/* Header */}
      <div className="border-b border-white/5">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#32FF6A] mb-3">{t('shipping.info')}</p>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              {t('shipping.title')}
            </h1>
          </motion.div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Shipping Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="flex items-center space-x-3">
              <Truck className="w-5 h-5 text-[#32FF6A]" />
              <h2 className="text-xl font-bold tracking-tight">{t('shipping.shipping')}</h2>
            </div>

            <div className="space-y-6">
              {/* Delivery regions & rates — only configured regions */}
              {regions.length > 0 ? (
                <div className="p-6 bg-white/5">
                  <div className="flex items-center space-x-2 mb-4">
                    <MapPin className="w-4 h-4 text-[#32FF6A]" />
                    <h3 className="text-[14px] font-medium">{t('shipping.rates')}</h3>
                  </div>
                  <div className="space-y-3" suppressHydrationWarning>
                    {regions.map((r, i) => (
                      <div key={i}>
                        {i > 0 && <div className="border-t border-white/5 mb-3" />}
                        <div className="flex justify-between text-[13px]">
                          <span className="text-white/50">{r.place}</span>
                          <span className="text-white/70">{r.rate > 0 ? fmt(r.rate) : t('shipping.free')}</span>
                        </div>
                        {r.text && (
                          <p className="text-[12px] text-white/35 mt-1">{r.text}</p>
                        )}
                      </div>
                    ))}
                    {showFreeShipping && (
                      <div className="border-t border-white/5 mt-3 pt-3">
                        <p className="text-[13px] text-[#32FF6A] font-medium" suppressHydrationWarning>
                          {lang === 'sq'
                            ? `Transport falas për porositë mbi ${fmt(shipping!.freeShippingThreshold)}`
                            : `Free shipping on orders over ${fmt(shipping!.freeShippingThreshold)}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-white/5">
                  <p className="text-[13px] text-white/40 leading-relaxed">
                    {lang === 'sq'
                      ? 'Detajet e transportit do të publikohen së shpejti.'
                      : 'Shipping details will be published soon.'}
                  </p>
                </div>
              )}

              {paymentMethods.length > 0 && (
                <div className="p-6 bg-white/5">
                  <h3 className="text-[14px] font-medium mb-3">{t('shipping.paymentMethods')}</h3>
                  <ul className="text-[13px] text-white/50 space-y-2" suppressHydrationWarning>
                    {paymentMethods.map((m, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-[#32FF6A]">●</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>

          {/* Returns Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="space-y-8"
          >
            <div className="flex items-center space-x-3">
              <RotateCcw className="w-5 h-5 text-[#32FF6A]" />
              <h2 className="text-xl font-bold tracking-tight">{t('shipping.returns')}</h2>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-white/5">
                <h3 className="text-[14px] font-medium mb-3">{t('shipping.returnPolicy')}</h3>
                <p className="text-[13px] text-white/50 leading-relaxed" suppressHydrationWarning>
                  {settings.returnWindowDays != null
                    ? lang === 'sq'
                      ? `Ju mund të ktheni artikujt brenda ${settings.returnWindowDays} ditëve nga marrja e porosisë.`
                      : `You can return items within ${settings.returnWindowDays} days of receiving your order.`
                    : lang === 'sq'
                    ? 'Politika e kthimeve do të konfirmohet së shpejti.'
                    : 'Our return policy will be confirmed soon.'}
                </p>
              </div>

              {settings.returnConditions && (
                <div className="p-6 bg-white/5">
                  <h3 className="text-[14px] font-medium mb-3">{t('shipping.returnConditions')}</h3>
                  <p className="text-[13px] text-white/50 leading-relaxed whitespace-pre-line" suppressHydrationWarning>
                    {settings.returnConditions}
                  </p>
                </div>
              )}

              <div className="p-6 border border-white/10">
                <p className="text-[13px] text-white/50 leading-relaxed mb-4">
                  {lang === 'sq'
                    ? 'Shihni faqen e plotë të kthimeve për të gjitha detajet, kushtet dhe procedurën.'
                    : 'See the full returns page for all details, conditions and the procedure.'}
                </p>
                <Link href="/returns" className="text-[13px] text-[#32FF6A] hover:underline font-medium">
                  {lang === 'sq' ? 'Politika e plotë e kthimeve →' : 'Full returns policy →'}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Help CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 text-center py-12 border-t border-white/5"
        >
          <Mail className="w-5 h-5 text-[#32FF6A] mx-auto mb-4" />
          <h2 className="text-lg font-bold tracking-tight mb-2">{t('shipping.questions')}</h2>
          <p className="text-[13px] text-white/40 mb-6">
            {t('shipping.questionsDesc')}
          </p>
          <Link href="/contact" className="btn-primary inline-block">
            {t('shipping.contactUs')}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
