'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Package, MapPin, Heart, Pencil, Check, X, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { useToast } from '@/components/toast-provider';

interface Profile {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  _count: { orders: number; addresses: number; wishlistItems: number };
}

export default function AccountProfilePage() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/account');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setNameInput(data?.name ?? '');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveName = async () => {
    if (!nameInput.trim() || nameInput.trim().length < 2) return;
    setSaving(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((p) => (p ? { ...p, name: data.name } : p));
        setEditing(false);
        showToast(t('account.saved'), 'success');
      } else {
        showToast(t('account.saveError'), 'error');
      }
    } catch {
      showToast(t('account.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-[#32FF6A] animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const stats = [
    { label: t('account.totalOrders'), value: profile._count.orders, icon: Package, href: '/account/orders' },
    { label: t('account.savedAddresses'), value: profile._count.addresses, icon: MapPin, href: '/account/addresses' },
    { label: t('account.savedItems'), value: profile._count.wishlistItems, icon: Heart, href: '/wishlist' },
  ];

  const memberSince = new Date(profile.createdAt).toLocaleDateString(lang === 'sq' ? 'sq-AL' : 'en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className="space-y-8">
      <p className="text-white/50">
        {t('account.greeting')}, <span className="text-white font-medium">{profile.name || profile.email}</span>
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="border border-white/10 hover:border-[#32FF6A]/50 p-5 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon size={20} className="text-[#32FF6A]" />
              </div>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-white/40 text-xs uppercase tracking-wider mt-1 group-hover:text-white/60 transition-colors">
                {s.label}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Profile details */}
      <div className="border border-white/10 p-6">
        <h2 className="text-sm uppercase tracking-wider text-white/40 mb-5">{t('account.profile')}</h2>
        <div className="space-y-5">
          {/* Name */}
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">{t('account.name')}</p>
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="flex-1 max-w-sm bg-white/[0.04] border border-white/15 px-3 py-2 text-white text-sm focus:border-[#32FF6A] focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={saveName}
                  disabled={saving}
                  className="p-2 bg-[#32FF6A] text-black hover:bg-[#2de05f] transition-colors disabled:opacity-50"
                  aria-label={t('account.save')}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setNameInput(profile.name ?? '');
                  }}
                  className="p-2 border border-white/15 text-white/60 hover:text-white transition-colors"
                  aria-label={t('account.cancel')}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-white">{profile.name || '—'}</p>
                <button
                  onClick={() => setEditing(true)}
                  className="text-white/40 hover:text-[#32FF6A] transition-colors"
                  aria-label={t('account.edit')}
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
          </div>
          {/* Email */}
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">{t('account.email')}</p>
            <p className="text-white" suppressHydrationWarning>{profile.email}</p>
          </div>
          {/* Member since */}
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">{t('account.memberSince')}</p>
            <p className="text-white">{memberSince}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
