'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

interface OrderItem {
  id: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string | null;
  notes: string | null;
  paymentMethod: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  items: OrderItem[];
  createdAt: string;
}

const FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export default function OrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { t, lang } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) {
        setOrder(await res.json());
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-[#32FF6A] animate-spin" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="text-center py-20 border border-white/10">
        <XCircle size={44} className="text-white/20 mx-auto mb-4" />
        <p className="text-white/40 mb-6">{t('order.notFound')}</p>
        <Link href="/account/orders" className="text-[#32FF6A] text-sm uppercase tracking-wider hover:underline">
          {t('order.backToOrders')}
        </Link>
      </div>
    );
  }

  const cancelled = order.status === 'cancelled';
  const currentIdx = FLOW.indexOf(order.status);

  const dateStr = new Date(order.createdAt).toLocaleDateString(lang === 'sq' ? 'sq-AL' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm uppercase tracking-wider transition-colors"
      >
        <ArrowLeft size={16} /> {t('order.backToOrders')}
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-wider mb-1">{t('order.orderNumber')}</p>
          <p className="text-2xl font-mono font-bold text-white">#{order.orderNumber}</p>
          <p className="text-white/40 text-xs mt-1">{dateStr}</p>
        </div>
        <p className="text-3xl font-bold text-[#32FF6A]">€{order.total.toFixed(2)}</p>
      </div>

      {/* Status timeline */}
      {cancelled ? (
        <div className="flex items-center gap-3 border border-red-500/30 bg-red-500/5 p-4">
          <XCircle size={20} className="text-red-400" />
          <span className="text-red-400 uppercase tracking-wider text-sm font-medium">
            {t('orderStatus.cancelled')}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          {FLOW.map((step, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div key={step} className="flex-1 flex flex-col items-center relative">
                {i < FLOW.length - 1 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-0.5 ${
                      i < currentIdx ? 'bg-[#32FF6A]' : 'bg-white/10'
                    }`}
                  />
                )}
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                    done ? 'bg-[#32FF6A] text-black' : 'bg-white/10 text-white/40'
                  } ${active ? 'ring-4 ring-[#32FF6A]/20' : ''}`}
                >
                  {done ? <CheckCircle2 size={16} /> : <Clock size={14} />}
                </div>
                <span
                  className={`mt-2 text-[10px] sm:text-xs uppercase tracking-wider text-center ${
                    done ? 'text-white' : 'text-white/40'
                  }`}
                >
                  {t(`orderStatus.${step}`)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Items */}
      <div className="border border-white/10">
        <h2 className="text-sm uppercase tracking-wider text-white/40 p-5 border-b border-white/10">
          {t('order.items')}
        </h2>
        <div className="divide-y divide-white/5">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-5">
              <div className="relative w-14 h-16 bg-white/5 flex-shrink-0">
                {item.productImage && (
                  <Image src={item.productImage} alt={item.productName} fill className="object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm">{item.productName}</p>
                <p className="text-white/40 text-xs mt-1">
                  {item.size} / {item.color} × {item.quantity}
                </p>
              </div>
              <span className="text-white text-sm">€{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-white/10 p-5">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3">{t('orders.deliveryAddress')}</p>
          <p className="text-white">{order.firstName} {order.lastName}</p>
          <p className="text-white/60 text-sm mt-1">{order.address}</p>
          <p className="text-white/60 text-sm">
            {order.city}{order.postalCode ? `, ${order.postalCode}` : ''}
          </p>
          <p className="text-white/60 text-sm mt-1" suppressHydrationWarning>{order.phone}</p>
        </div>
        <div className="border border-white/10 p-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/50">{t('checkout.subtotal')}</span>
            <span className="text-white">€{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/50">{t('checkout.shipping')}</span>
            <span className="text-white">
              {order.shippingCost === 0 ? t('checkout.freeShipping') : `€${order.shippingCost.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-3 mt-3">
            <span className="text-white uppercase tracking-wider text-sm font-bold">{t('checkout.total')}</span>
            <span className="text-[#32FF6A] font-bold">€{order.total.toFixed(2)}</span>
          </div>
          <p className="text-white/40 text-xs mt-4">
            {order.paymentMethod === 'cod' ? t('checkout.cod') : t('checkout.bankTransfer')}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
