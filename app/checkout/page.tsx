'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, MapPin, CreditCard, CheckCircle2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { useToast } from '@/components/toast-provider';
import { useSiteSettings } from '@/lib/use-settings';

interface CartItem {
  id: string;
  quantity: number;
  size: string;
  color: string;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
  };
}

export default function CheckoutPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { settings } = useSiteSettings();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [error, setError] = useState('');
  const [shippingConfig, setShippingConfig] = useState({ freeShippingThreshold: 50, tiranaRate: 3, standardRate: 5 });

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    notes: '',
    paymentMethod: 'cod',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCart();
      if (session?.user?.email) {
        setForm(prev => ({ ...prev, email: session.user?.email || '' }));
      }
      // Prefill from saved default address
      fetch('/api/addresses')
        .then((r) => (r.ok ? r.json() : null))
        .then((list) => {
          if (Array.isArray(list) && list.length > 0) {
            const def = list.find((a: { isDefault?: boolean }) => a.isDefault) || list[0];
            if (def) {
              setForm((prev) => ({
                ...prev,
                firstName: prev.firstName || def.firstName || '',
                lastName: prev.lastName || def.lastName || '',
                phone: prev.phone || def.phone || '',
                address: prev.address || def.address || '',
                city: prev.city || def.city || '',
                postalCode: prev.postalCode || def.postalCode || '',
              }));
            }
          }
        })
        .catch(() => {});
    }
  }, [status, session]);

  useEffect(() => {
    fetch('/api/shipping')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setShippingConfig(d); })
      .catch(() => {});
  }, []);

  // Keep the selected payment method valid against the enabled methods.
  useEffect(() => {
    if (form.paymentMethod === 'cod' && settings.codEnabled === false) {
      setForm((prev) => ({ ...prev, paymentMethod: settings.bankTransferEnabled ? 'bank_transfer' : 'cod' }));
    } else if (form.paymentMethod === 'bank_transfer' && settings.bankTransferEnabled === false) {
      setForm((prev) => ({ ...prev, paymentMethod: settings.codEnabled ? 'cod' : 'bank_transfer' }));
    }
  }, [settings.codEnabled, settings.bankTransferEnabled, form.paymentMethod]);

  const fetchCart = async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        setItems(data ?? []);
        if (!data || data.length === 0) {
          router.push('/shop');
        }
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + (item?.product?.price ?? 0) * item.quantity, 0);
  const isTirana = form.city.toLowerCase().includes('tiran');
  const shippingCost = subtotal >= shippingConfig.freeShippingThreshold ? 0 : (isTirana ? shippingConfig.tiranaRate : shippingConfig.standardRate);
  const total = subtotal + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to place order');
      }

      const order = await res.json();
      setOrderNumber(order.orderNumber);
      setOrderComplete(true);
      showToast(t('checkout.orderSuccess'), 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#32FF6A] animate-spin" />
      </div>
    );
  }

  // Order success screen
  if (orderComplete) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-[#32FF6A]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-[#32FF6A]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">{t('checkout.orderSuccess')}</h1>
          <p className="text-white/60 mb-2">{t('checkout.orderNumber')}: <span className="text-[#32FF6A] font-mono font-bold">{orderNumber}</span></p>
          <p className="text-white/40 text-sm mb-8">{t('checkout.emailSent')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/account/orders"
              className="px-6 py-3 bg-[#32FF6A] text-black font-bold uppercase tracking-wider text-sm hover:bg-[#2de05f] transition-colors"
            >
              {t('checkout.viewOrders')}
            </Link>
            <Link
              href="/shop"
              className="px-6 py-3 border border-white/20 text-white font-bold uppercase tracking-wider text-sm hover:border-white/40 transition-colors"
            >
              {t('checkout.continueShopping')}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/shop" className="inline-flex items-center text-white/50 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft size={16} className="mr-2" />
            {t('checkout.backToShop')}
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-wider">{t('checkout.title')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Left: Form */}
          <div className="lg:col-span-3 space-y-8">
            {/* Delivery Info */}
            <div className="border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-6">
                <MapPin size={20} className="text-[#32FF6A]" />
                <h2 className="text-lg font-semibold text-white uppercase tracking-wider">{t('checkout.deliveryInfo')}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.3em] text-white/50 mb-2">{t('checkout.firstName')} *</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    className="w-full px-4 py-3 bg-transparent border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-[#32FF6A]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.3em] text-white/50 mb-2">{t('checkout.lastName')} *</label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    className="w-full px-4 py-3 bg-transparent border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-[#32FF6A]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.3em] text-white/50 mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full px-4 py-3 bg-transparent border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-[#32FF6A]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.3em] text-white/50 mb-2">{t('checkout.phone')} *</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+355 6X XXX XXXX"
                    className="w-full px-4 py-3 bg-transparent border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-[#32FF6A]/50 transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.3em] text-white/50 mb-2">{t('checkout.address')} *</label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="w-full px-4 py-3 bg-transparent border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-[#32FF6A]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.3em] text-white/50 mb-2">{t('checkout.city')} *</label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="w-full px-4 py-3 bg-transparent border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-[#32FF6A]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.3em] text-white/50 mb-2">{t('checkout.postalCode')}</label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={(e) => updateField('postalCode', e.target.value)}
                    className="w-full px-4 py-3 bg-transparent border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-[#32FF6A]/50 transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.3em] text-white/50 mb-2">{t('checkout.notes')}</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-transparent border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-[#32FF6A]/50 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-6">
                <CreditCard size={20} className="text-[#32FF6A]" />
                <h2 className="text-lg font-semibold text-white uppercase tracking-wider">{t('checkout.paymentMethod')}</h2>
              </div>
              <div className="space-y-3">
                {settings.codEnabled !== false && (
                <label className={`flex items-center p-4 border cursor-pointer transition-colors ${
                  form.paymentMethod === 'cod' ? 'border-[#32FF6A] bg-[#32FF6A]/5' : 'border-white/10 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={form.paymentMethod === 'cod'}
                    onChange={(e) => updateField('paymentMethod', e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 mr-4 flex items-center justify-center ${
                    form.paymentMethod === 'cod' ? 'border-[#32FF6A]' : 'border-white/30'
                  }`}>
                    {form.paymentMethod === 'cod' && <div className="w-2 h-2 rounded-full bg-[#32FF6A]" />}
                  </div>
                  <div>
                    <p className="text-white font-medium">{t('checkout.cod')}</p>
                    <p className="text-white/40 text-sm">{t('checkout.codDesc')}</p>
                  </div>
                </label>
                )}
                {settings.bankTransferEnabled !== false && (
                <label className={`flex items-center p-4 border cursor-pointer transition-colors ${
                  form.paymentMethod === 'bank_transfer' ? 'border-[#32FF6A] bg-[#32FF6A]/5' : 'border-white/10 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={form.paymentMethod === 'bank_transfer'}
                    onChange={(e) => updateField('paymentMethod', e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 mr-4 flex items-center justify-center ${
                    form.paymentMethod === 'bank_transfer' ? 'border-[#32FF6A]' : 'border-white/30'
                  }`}>
                    {form.paymentMethod === 'bank_transfer' && <div className="w-2 h-2 rounded-full bg-[#32FF6A]" />}
                  </div>
                  <div>
                    <p className="text-white font-medium">{t('checkout.bankTransfer')}</p>
                    <p className="text-white/40 text-sm">{t('checkout.bankTransferDesc')}</p>
                  </div>
                </label>
                )}
              </div>

              {/* Bank transfer details — only shown when selected and configured */}
              {form.paymentMethod === 'bank_transfer' && settings.bankTransferEnabled !== false && (
                <div className="mt-4 p-4 border border-[#32FF6A]/20 bg-[#32FF6A]/5">
                  {(settings.bankName || settings.bankAccountHolder || settings.bankIban || settings.bankSwift || settings.bankInstructions) ? (
                    <div className="space-y-2 text-sm">
                      <p className="text-[#32FF6A] font-medium uppercase tracking-wider text-xs mb-3">{t('checkout.bankDetailsTitle')}</p>
                      {settings.bankName && <div className="flex justify-between gap-4"><span className="text-white/40">{t('checkout.bankName')}</span><span className="text-white text-right" suppressHydrationWarning>{settings.bankName}</span></div>}
                      {settings.bankAccountHolder && <div className="flex justify-between gap-4"><span className="text-white/40">{t('checkout.bankHolder')}</span><span className="text-white text-right" suppressHydrationWarning>{settings.bankAccountHolder}</span></div>}
                      {settings.bankIban && <div className="flex justify-between gap-4"><span className="text-white/40">IBAN</span><span className="text-white text-right font-mono" suppressHydrationWarning>{settings.bankIban}</span></div>}
                      {settings.bankSwift && <div className="flex justify-between gap-4"><span className="text-white/40">SWIFT/BIC</span><span className="text-white text-right font-mono" suppressHydrationWarning>{settings.bankSwift}</span></div>}
                      {settings.bankInstructions && <p className="text-white/50 pt-2 border-t border-white/10 mt-2" suppressHydrationWarning>{settings.bankInstructions}</p>}
                      <p className="text-white/40 pt-2 text-xs">{t('checkout.bankReference')}</p>
                    </div>
                  ) : (
                    <p className="text-white/50 text-sm">{t('checkout.bankDetailsPending')}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-2">
            <div className="border border-white/10 p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <Package size={20} className="text-[#32FF6A]" />
                <h2 className="text-lg font-semibold text-white uppercase tracking-wider">{t('checkout.orderSummary')}</h2>
              </div>

              {/* Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-16 h-20 bg-white/5 flex-shrink-0">
                      {item?.product?.imageUrl && (
                        <Image
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item?.product?.name}</p>
                      <p className="text-white/40 text-xs mt-1">{item.size} / {item.color}</p>
                      <div className="flex justify-between mt-2">
                        <span className="text-white/40 text-xs">{t('checkout.qty')}: {item.quantity}</span>
                        <span className="text-white text-sm">€{((item?.product?.price ?? 0) * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">{t('checkout.subtotal')}</span>
                  <span className="text-white">€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">{t('checkout.shipping')}</span>
                  <span className="text-white">{shippingCost === 0 ? t('checkout.freeShipping') : `€${shippingCost.toFixed(2)}`}</span>
                </div>
                {subtotal < shippingConfig.freeShippingThreshold && (
                  <p className="text-[#32FF6A] text-xs">
                    🚚 {t('checkout.freeShippingPrefix')} €{shippingConfig.freeShippingThreshold.toFixed(0)}
                  </p>
                )}
                <div className="flex justify-between pt-3 border-t border-white/10">
                  <span className="text-white font-bold uppercase">{t('checkout.total')}</span>
                  <span className="text-[#32FF6A] font-bold text-xl">€{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-6 py-4 bg-[#32FF6A] text-black font-bold uppercase tracking-wider hover:bg-[#2de05f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {t('checkout.processing')}</>
                ) : (
                  t('checkout.placeOrder')
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
