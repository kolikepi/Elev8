'use client';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { User, Package, MapPin, Heart, LogOut, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-[70px]">
        <Loader2 size={28} className="text-[#32FF6A] animate-spin" />
      </div>
    );
  }

  const nav = [
    { href: '/account', label: t('account.profile'), icon: User, exact: true },
    { href: '/account/orders', label: t('account.orders'), icon: Package, exact: false },
    { href: '/account/addresses', label: t('account.addresses'), icon: MapPin, exact: false },
    { href: '/wishlist', label: t('account.wishlist'), icon: Heart, exact: false },
  ];

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : (pathname ?? '').startsWith(href);

  return (
    <div className="min-h-screen bg-black text-white pt-[70px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-10 lg:py-14">
        <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider mb-8">
          {t('account.title')}
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-[90px] h-max">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible border-b lg:border-b-0 border-white/10 pb-2 lg:pb-0">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 text-sm uppercase tracking-wider whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-[#32FF6A] text-black font-bold'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-3 px-4 py-3 text-sm uppercase tracking-wider whitespace-nowrap text-white/60 hover:text-red-400 hover:bg-white/[0.06] transition-colors lg:mt-4 lg:border-t lg:border-white/10"
              >
                <LogOut size={18} />
                {t('nav.signOut')}
              </button>
            </nav>
          </aside>

          {/* Content */}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
