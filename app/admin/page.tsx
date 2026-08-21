'use client';

import { useEffect, useState } from 'react';
import { Package, MessageSquare, Mail, Users, AlertCircle, ShoppingCart, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { StatGridSkeleton } from '@/components/skeletons';

interface Stats {
  products: number;
  contacts: number;
  subscribers: number;
  users: number;
  newContacts: number;
  orders: number;
  pendingOrders: number;
  revenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="space-y-6">
          <div className="animate-pulse h-8 bg-white/[0.06] rounded w-1/4"></div>
          <StatGridSkeleton count={6} />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Orders',
      value: stats?.orders || 0,
      icon: ShoppingCart,
      color: 'bg-[#32FF6A]/20 text-[#32FF6A]',
      href: '/admin/orders',
      badge: stats?.pendingOrders,
    },
    {
      label: 'Revenue',
      value: `€${(stats?.revenue || 0).toFixed(0)}`,
      icon: DollarSign,
      color: 'bg-emerald-500/20 text-emerald-400',
      href: '/admin/orders',
    },
    {
      label: 'Total Products',
      value: stats?.products || 0,
      icon: Package,
      color: 'bg-blue-500/20 text-blue-400',
      href: '/admin/products',
    },
    {
      label: 'Messages',
      value: stats?.contacts || 0,
      icon: MessageSquare,
      color: 'bg-purple-500/20 text-purple-400',
      href: '/admin/contacts',
      badge: stats?.newContacts,
    },
    {
      label: 'Newsletter',
      value: stats?.subscribers || 0,
      icon: Mail,
      color: 'bg-green-500/20 text-green-400',
      href: '/admin/newsletter',
    },
    {
      label: 'Users',
      value: stats?.users || 0,
      icon: Users,
      color: 'bg-orange-500/20 text-orange-400',
      href: '#',
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-white/60 mt-1">Welcome to your ELEV8 admin panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors relative"
            >
              {stat.badge && stat.badge > 0 && (
                <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {stat.badge} new
                </span>
              )}
              <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center mb-4`}>
                <Icon size={24} />
              </div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-white/60 text-sm">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/products?action=new"
            className="flex items-center gap-3 p-4 bg-[#32FF6A]/10 border border-[#32FF6A]/30 rounded-lg text-[#32FF6A] hover:bg-[#32FF6A]/20 transition-colors"
          >
            <Package size={20} />
            <span className="font-semibold">Add New Product</span>
          </Link>
          <Link
            href="/admin/contacts"
            className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-colors"
          >
            <MessageSquare size={20} />
            <span className="font-semibold">View Messages</span>
          </Link>
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 p-4 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
          >
            <AlertCircle size={20} />
            <span className="font-semibold">View Website</span>
          </Link>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-[#32FF6A]/5 border border-[#32FF6A]/20 rounded-xl p-6">
        <h2 className="text-lg font-bold text-[#32FF6A] mb-2">Need Help?</h2>
        <p className="text-white/70">
          Use the sidebar to navigate between sections. You can add, edit, or delete products,
          view contact messages, and manage newsletter subscribers - all without any coding!
        </p>
      </div>
    </div>
  );
}
