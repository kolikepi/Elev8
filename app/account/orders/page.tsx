'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Package, ChevronRight, ShoppingBag, Loader2 } from 'lucide-react';
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
  total: number;
  items: OrderItem[];
  createdAt: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  processing: 'bg-purple-500/20 text-purple-400',
  shipped: 'bg-cyan-500/20 text-cyan-400',
  delivered: 'bg-[#32FF6A]/20 text-[#32FF6A]',
  cancelled: 'bg-red-500/20 text-red-400',
};

export default function AccountOrdersPage() {
  const { t, lang } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data ?? []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
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

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 border border-white/10">
        <ShoppingBag size={48} className="text-white/20 mx-auto mb-4" />
        <p className="text-white/40 mb-6">{t('orders.noOrders')}</p>
        <Link
          href="/shop"
          className="inline-block px-8 py-3 bg-[#32FF6A] text-black font-bold uppercase tracking-wider text-sm hover:bg-[#2de05f] transition-colors"
        >
          {t('orders.startShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order, i) => (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <Link
            href={`/account/orders/${order.id}`}
            className="block border border-white/10 hover:border-white/25 transition-colors"
          >
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <Package size={20} className="text-[#32FF6A]" />
                <div>
                  <p className="text-white font-mono font-bold text-sm">#{order.orderNumber}</p>
                  <p className="text-white/40 text-xs mt-1">
                    {new Date(order.createdAt).toLocaleDateString(lang === 'sq' ? 'sq-AL' : 'en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-white/10 text-white/50'}`}>
                  {t(`orderStatus.${order.status}`)}
                </span>
                <span className="text-[#32FF6A] font-bold hidden sm:inline">€{order.total.toFixed(2)}</span>
                <ChevronRight size={18} className="text-white/40" />
              </div>
            </div>
            {/* item thumbnails */}
            <div className="flex items-center gap-2 px-5 pb-5">
              {order.items.slice(0, 5).map((item) => (
                <div key={item.id} className="relative w-10 h-12 bg-white/5 flex-shrink-0">
                  {item.productImage && (
                    <Image src={item.productImage} alt={item.productName} fill className="object-cover" />
                  )}
                </div>
              ))}
              {order.items.length > 5 && (
                <span className="text-white/40 text-xs">+{order.items.length - 5}</span>
              )}
              <span className="text-[#32FF6A] font-bold ml-auto sm:hidden">€{order.total.toFixed(2)}</span>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
