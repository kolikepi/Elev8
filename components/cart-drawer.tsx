'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingBag, Trash2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { useToast } from '@/components/toast-provider';

interface Variant {
  id: string;
  stockQuantity: number;
  lowStockThreshold: number | null;
  active: boolean;
}

interface CartItem {
  id: string;
  quantity: number;
  size: string;
  color: string;
  variantId?: string | null;
  variant?: Variant | null;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    inStock?: boolean;
  };
}

interface ShippingConfig {
  freeShippingThreshold: number;
  tiranaRate: number;
  standardRate: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCartUpdate?: () => void;
}

export function CartDrawer({ isOpen, onClose, onCartUpdate }: CartDrawerProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [shipping, setShipping] = useState<ShippingConfig>({ freeShippingThreshold: 50, tiranaRate: 3, standardRate: 5 });
  const { t } = useLanguage();
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchCart();
      fetch('/api/shipping')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) setShipping(d); })
        .catch(() => {});
    }
  }, [isOpen]);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        setItems(data ?? []);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  // Max quantity available for a line item: variant stock if tracked, else generous cap.
  const maxStock = (item: CartItem): number => {
    if (item.variant) return item.variant.active ? item.variant.stockQuantity : 0;
    if (item.product?.inStock === false) return 0;
    return 99;
  };

  const isOutOfStock = (item: CartItem): boolean => maxStock(item) <= 0;

  const updateQuantity = async (item: CartItem, quantity: number) => {
    if (quantity < 0) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/cart/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });

      if (res.ok) {
        await fetchCart();
        onCartUpdate?.();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data?.error || t('cart.stockError'), 'error');
        await fetchCart();
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      showToast(t('cart.stockError'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setBusyId(itemId);
    try {
      const res = await fetch(`/api/cart/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchCart();
        onCartUpdate?.();
      }
    } catch (error) {
      console.error('Error removing item:', error);
    } finally {
      setBusyId(null);
    }
  };

  const subtotal = items?.reduce?.(
    (sum, item) => sum + ((item?.product?.price ?? 0) * (item?.quantity ?? 0)),
    0
  ) ?? 0;

  const hasStockIssue = items.some((item) => isOutOfStock(item) || item.quantity > maxStock(item));

  const remainingForFree = Math.max(0, shipping.freeShippingThreshold - subtotal);
  const freeProgress = shipping.freeShippingThreshold > 0
    ? Math.min(100, (subtotal / shipping.freeShippingThreshold) * 100)
    : 100;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-black border-l border-white/10 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-[#32FF6A]" />
                <h2 className="text-lg font-bold text-white uppercase tracking-wider">{t('cart.title')}</h2>
              </div>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors"
                aria-label={t('common.close')}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-8 h-8 border-2 border-[#32FF6A] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : items?.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingBag className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60 mb-6">{t('cart.empty')}</p>
                  <button
                    onClick={() => { onClose(); window.location.href = '/shop'; }}
                    className="px-6 py-3 border border-white/20 text-white text-sm uppercase tracking-wider hover:border-[#32FF6A] hover:text-[#32FF6A] transition-colors"
                  >
                    {t('cart.continueShopping')}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {items?.map?.((item) => {
                    const stock = maxStock(item);
                    const oos = stock <= 0;
                    const overStock = item.quantity > stock;
                    const lowStock = !oos && item.variant?.lowStockThreshold != null
                      && stock > 0 && stock <= (item.variant.lowStockThreshold ?? 0);
                    const atMax = item.quantity >= stock;
                    return (
                      <div
                        key={item?.id}
                        className={`flex space-x-4 bg-white/5 rounded-lg p-4 ${oos || overStock ? 'ring-1 ring-red-500/40' : ''}`}
                      >
                        <div className="relative w-20 h-24 bg-white/10 rounded-md overflow-hidden flex-shrink-0">
                          <Image
                            src={item?.product?.imageUrl ?? ''}
                            alt={item?.product?.name ?? 'Product'}
                            fill
                            className={`object-cover ${oos ? 'opacity-50' : ''}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-white truncate">
                            {item?.product?.name ?? 'Product'}
                          </h3>
                          <p className="text-xs text-white/60 mt-1">
                            {item?.size ?? 'Size'} / {item?.color ?? 'Color'}
                          </p>
                          <p className="text-sm font-semibold text-[#32FF6A] mt-2">
                            €{(item?.product?.price ?? 0).toFixed(2)}
                          </p>

                          {(oos || overStock) && (
                            <p className="flex items-center gap-1 text-xs text-red-400 mt-2">
                              <AlertCircle className="w-3 h-3" />
                              {oos ? t('product.outOfStock') : `${t('cart.onlyLeft')} ${stock}`}
                            </p>
                          )}
                          {lowStock && !overStock && (
                            <p className="text-xs text-amber-400 mt-2">{`${t('cart.onlyLeft')} ${stock}`}</p>
                          )}

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-2">
                              <button
                                disabled={busyId === item.id}
                                onClick={() => updateQuantity(item, (item?.quantity ?? 1) - 1)}
                                className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-40"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-sm text-white w-6 text-center">
                                {item?.quantity ?? 0}
                              </span>
                              <button
                                disabled={busyId === item.id || oos || atMax}
                                onClick={() => updateQuantity(item, (item?.quantity ?? 0) + 1)}
                                className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              disabled={busyId === item.id}
                              onClick={() => removeItem(item?.id)}
                              className="text-white/40 hover:text-red-500 transition-colors disabled:opacity-40"
                              aria-label={t('cart.remove')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {(items?.length ?? 0) > 0 && (
              <div className="p-6 border-t border-white/10">
                {/* Free shipping progress */}
                {shipping.freeShippingThreshold > 0 && (
                  <div className="mb-4">
                    {remainingForFree > 0 ? (
                      <p className="text-xs text-white/60 mb-2">
                        {t('cart.addForFree')} <span className="text-[#32FF6A] font-semibold">€{remainingForFree.toFixed(2)}</span> {t('cart.forFreeShipping')}
                      </p>
                    ) : (
                      <p className="text-xs text-[#32FF6A] mb-2 font-semibold">🚚 {t('cart.freeShippingUnlocked')}</p>
                    )}
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#32FF6A] transition-all duration-500" style={{ width: `${freeProgress}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/60">{t('cart.subtotal')}</span>
                  <span className="text-xl font-bold text-white">€{subtotal.toFixed(2)}</span>
                </div>

                {hasStockIssue && (
                  <p className="flex items-center gap-1 text-xs text-red-400 mb-3">
                    <AlertCircle className="w-3 h-3" />
                    {t('cart.fixStockToCheckout')}
                  </p>
                )}

                <button
                  disabled={hasStockIssue}
                  className="w-full py-4 bg-[#32FF6A] text-black font-bold uppercase tracking-wider rounded-md hover:bg-[#2de05f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => { onClose(); window.location.href = '/checkout'; }}
                >
                  {t('cart.checkout')}
                </button>
                <p className="text-xs text-white/40 text-center mt-3">
                  {t('cart.shippingCalc')}
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
