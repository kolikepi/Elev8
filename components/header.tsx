'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Menu, X, User, LogOut, ChevronDown, Globe, ChevronRight, Search, Heart, Package } from 'lucide-react';
import { CartDrawer } from './cart-drawer';
import { SearchOverlay } from './search-overlay';
import { useLanguage } from '@/lib/language-context';
import { useWishlist } from '@/lib/use-wishlist';

interface NavDropdownItem {
  label: string;
  href: string;
}

interface NavCategory {
  key: string;
  label: string;
  items: NavDropdownItem[];
}

// Routes that render on a light (white/off-white) background and therefore
// need dark header text/logo for contrast. Single adaptive header system.
const LIGHT_ROUTE_PREFIXES = ['/shop', '/product', '/men', '/women', '/running', '/training', '/collections', '/wishlist', '/account', '/dtf-printing'];

export function Header() {
  const [mounted, setMounted] = useState(false);
  const sessionData = useSession();
  const session = sessionData?.data;
  const status = sessionData?.status ?? 'loading';
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const { count: wishlistCount, mounted: wishlistMounted } = useWishlist();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { lang, setLang, t } = useLanguage();
  const pathname = usePathname();

  // Adaptive theme: light pages get a dark-on-light header; everything else
  // keeps the original white-on-dark header. When the mobile menu is open we
  // always use the dark overlay treatment regardless of route.
  const lightMode = LIGHT_ROUTE_PREFIXES.some((p) => (pathname ?? '').startsWith(p));
  const onDark = !lightMode || isMobileMenuOpen;

  const cls = {
    logoText: onDark ? 'text-white' : 'text-black',
    navIdle: onDark ? 'text-white/70 hover:text-white' : 'text-black/60 hover:text-black',
    navActive: onDark ? 'text-white' : 'text-black',
    divider: onDark ? 'bg-white/10' : 'bg-black/10',
    panel: onDark ? 'bg-black border-white/10' : 'bg-white border-black/10',
    panelItem: onDark
      ? 'text-white/50 hover:text-white hover:bg-white/5'
      : 'text-black/50 hover:text-black hover:bg-black/[0.04]',
    icon: onDark ? 'text-white/70 hover:text-white' : 'text-black/60 hover:text-black',
    iconFaint: onDark ? 'text-white/60 hover:text-white' : 'text-black/50 hover:text-black',
  };

  const scrolledBg = onDark
    ? 'bg-black/90 backdrop-blur-xl border-b border-white/5'
    : 'bg-white/90 backdrop-blur-xl border-b border-black/5';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (mounted && session?.user) {
      fetchCartCount();
    }
  }, [mounted, session]);

  useEffect(() => {
    const sync = () => {
      if (session?.user) fetchCartCount();
    };
    window.addEventListener('elev8-cart-change', sync);
    return () => window.removeEventListener('elev8-cart-change', sync);
  }, [session]);

  const fetchCartCount = async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const items = await res.json();
        const count = (items ?? []).reduce((sum: number, item: { quantity?: number }) => sum + (item?.quantity ?? 0), 0);
        setCartCount(count);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  // Build nav categories with dropdowns
  const navCategories: NavCategory[] = [
    {
      key: 'men',
      label: t('nav.men'),
      items: [
        { label: t('nav.allProducts'), href: '/shop?gender=men' },
        { label: t('nav.tshirts'), href: '/shop?gender=men&category=T-Shirts' },
        { label: t('nav.hoodies'), href: '/shop?gender=men&category=Hoodies' },
        { label: t('nav.pants'), href: '/shop?gender=men&category=Pants' },
      ],
    },
    {
      key: 'women',
      label: t('nav.women'),
      items: [
        { label: t('nav.allProducts'), href: '/shop?gender=women' },
        { label: t('nav.tshirts'), href: '/shop?gender=women&category=T-Shirts' },
        { label: t('nav.leggings'), href: '/shop?gender=women&category=Leggings' },
        { label: t('nav.hoodies'), href: '/shop?gender=women&category=Hoodies' },
      ],
    },
    {
      key: 'running',
      label: t('nav.running'),
      items: [
        { label: t('nav.allProducts'), href: '/shop?activity=running' },
        { label: t('nav.tshirts'), href: '/shop?activity=running&category=T-Shirts' },
        { label: t('nav.leggings'), href: '/shop?activity=running&category=Leggings' },
        { label: t('nav.pants'), href: '/shop?activity=running&category=Pants' },
      ],
    },
    {
      key: 'training',
      label: t('nav.training'),
      items: [
        { label: t('nav.allProducts'), href: '/shop?activity=training' },
        { label: t('nav.tshirts'), href: '/shop?activity=training&category=T-Shirts' },
        { label: t('nav.hoodies'), href: '/shop?activity=training&category=Hoodies' },
        { label: t('nav.pants'), href: '/shop?activity=training&category=Pants' },
      ],
    },
  ];

  const secondaryLinks = [
    { href: '/shop?badge=NEW', label: t('nav.newArrivals') },
    { href: '/shop', label: t('nav.shopAll') },
  ];

  const infoLinks = [
    { href: '/about', label: t('nav.about') },
    { href: '/size-guide', label: t('nav.sizeGuide') },
    { href: '/contact', label: t('nav.contact') },
  ];

  const handleDropdownEnter = (key: string) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setActiveDropdown(key);
  };

  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled || (lightMode && !isMobileMenuOpen) ? scrolledBg : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-[70px]">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 relative z-10">
              <span className={`text-[22px] font-bold tracking-[0.2em] ${cls.logoText}`}>
                ELEV<span className="text-[#32FF6A]">8</span>
              </span>
            </Link>

            {/* Center Navigation - Desktop with Dropdowns */}
            <nav className="hidden lg:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
              {navCategories.map((cat) => (
                <div
                  key={cat.key}
                  className="relative"
                  onMouseEnter={() => handleDropdownEnter(cat.key)}
                  onMouseLeave={handleDropdownLeave}
                >
                  <Link
                    href={cat.items[0]?.href ?? '/shop'}
                    className={`text-[13px] font-medium uppercase tracking-[0.15em] transition-colors duration-300 flex items-center gap-1 ${
                      activeDropdown === cat.key ? cls.navActive : cls.navIdle
                    }`}
                  >
                    {cat.label}
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${
                      activeDropdown === cat.key ? 'rotate-180' : ''
                    }`} />
                  </Link>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {activeDropdown === cat.key && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute top-full left-0 mt-2 w-48 border py-2 ${cls.panel}`}
                        onMouseEnter={() => handleDropdownEnter(cat.key)}
                        onMouseLeave={handleDropdownLeave}
                      >
                        {cat.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`block px-5 py-2.5 text-[12px] uppercase tracking-[0.1em] transition-colors ${cls.panelItem}`}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              {/* Divider */}
              <div className={`w-px h-4 ${cls.divider}`} />

              {/* Secondary links */}
              {secondaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[13px] font-medium transition-colors duration-300 uppercase tracking-[0.15em] ${cls.navIdle}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Icons */}
            <div className="flex items-center space-x-5">
              {/* Search */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className={`transition-colors duration-300 ${cls.icon}`}
                title={t('nav.search')}
                aria-label={t('nav.search')}
              >
                <Search className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>

              {/* Wishlist */}
              <Link
                href="/wishlist"
                className={`relative hidden sm:block transition-colors duration-300 ${cls.icon}`}
                title={t('nav.wishlist')}
                aria-label={t('nav.wishlist')}
              >
                <Heart className="w-[18px] h-[18px]" strokeWidth={1.5} />
                {wishlistMounted && wishlistCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#32FF6A] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Language Toggle */}
              <button
                onClick={() => setLang(lang === 'sq' ? 'en' : 'sq')}
                className={`flex items-center space-x-1.5 transition-colors duration-300 ${cls.iconFaint}`}
                title={lang === 'sq' ? 'Switch to English' : 'Kalo në Shqip'}
              >
                <Globe className="w-[16px] h-[16px]" strokeWidth={1.5} />
                <span className="text-[11px] font-medium uppercase tracking-[0.1em]">
                  {lang === 'sq' ? 'EN' : 'SQ'}
                </span>
              </button>

              {mounted && status === 'authenticated' && session?.user ? (
                <>
                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className={`flex items-center space-x-1 transition-colors duration-300 ${cls.icon}`}
                    >
                      <User className="w-[18px] h-[18px]" strokeWidth={1.5} />
                    </button>
                    <AnimatePresence>
                      {isUserMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.2 }}
                          className={`absolute right-0 mt-3 w-52 border shadow-2xl py-1 ${cls.panel}`}
                        >
                          <div className={`px-4 py-3 border-b ${onDark ? 'border-white/10' : 'border-black/10'}`}>
                            <p className={`text-[11px] uppercase tracking-wider mb-1 ${onDark ? 'text-white/40' : 'text-black/40'}`}>{t('nav.account')}</p>
                            <p className={`text-sm truncate ${onDark ? 'text-white' : 'text-black'}`}>
                              {session?.user?.name ?? session?.user?.email ?? 'User'}
                            </p>
                          </div>
                          <Link
                            href="/account"
                            onClick={() => setIsUserMenuOpen(false)}
                            className={`w-full px-4 py-3 text-left text-[13px] flex items-center space-x-2 transition-colors ${cls.panelItem}`}
                          >
                            <User className="w-4 h-4" />
                            <span>{t('nav.account')}</span>
                          </Link>
                          <Link
                            href="/account/orders"
                            onClick={() => setIsUserMenuOpen(false)}
                            className={`w-full px-4 py-3 text-left text-[13px] flex items-center space-x-2 transition-colors ${cls.panelItem}`}
                          >
                            <Package className="w-4 h-4" />
                            <span>{t('nav.orders')}</span>
                          </Link>
                          <Link
                            href="/wishlist"
                            onClick={() => setIsUserMenuOpen(false)}
                            className={`w-full px-4 py-3 text-left text-[13px] flex items-center space-x-2 transition-colors ${cls.panelItem}`}
                          >
                            <Heart className="w-4 h-4" />
                            <span>{t('nav.wishlist')}</span>
                          </Link>
                          <button
                            onClick={() => {
                              signOut();
                              setIsUserMenuOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-left text-[13px] flex items-center space-x-2 transition-colors border-t ${onDark ? 'border-white/10' : 'border-black/10'} ${cls.panelItem}`}
                          >
                            <LogOut className="w-4 h-4" />
                            <span>{t('nav.signOut')}</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={() => setIsCartOpen(true)}
                    className={`relative transition-colors duration-300 ${cls.icon}`}
                  >
                    <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.5} />
                    {cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#32FF6A] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </button>
                </>
              ) : mounted ? (
                <Link
                  href="/login"
                  className={`text-[13px] font-medium transition-colors duration-300 uppercase tracking-[0.1em] ${cls.navIdle}`}
                >
                  {t('nav.signIn')}
                </Link>
              ) : null}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`lg:hidden transition-colors ${cls.icon}`}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu - Full screen overlay with accordion sections (always dark) */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden fixed inset-0 top-[70px] bg-black z-40 overflow-y-auto"
            >
              <nav className="px-6 py-8">
                {/* Search trigger */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsSearchOpen(true);
                  }}
                  className="w-full flex items-center gap-3 py-4 mb-4 border-b border-white/10 text-white/80 hover:text-white uppercase tracking-[0.15em] text-lg font-medium transition-colors"
                >
                  <Search className="w-5 h-5" strokeWidth={1.5} />
                  {t('nav.search')}
                </button>

                {/* Shop categories with accordions */}
                <div className="space-y-0 border-b border-white/10 pb-4 mb-4">
                  {navCategories.map((cat, i) => (
                    <motion.div
                      key={cat.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                    >
                      <button
                        onClick={() => setMobileAccordion(mobileAccordion === cat.key ? null : cat.key)}
                        className="flex items-center justify-between w-full py-4 text-left border-b border-white/5"
                      >
                        <span className="text-lg font-medium text-white uppercase tracking-[0.15em]">
                          {cat.label}
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 text-white/40 transition-transform duration-200 ${
                            mobileAccordion === cat.key ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                      <AnimatePresence>
                        {mobileAccordion === cat.key && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-4 py-2 space-y-1">
                              {cat.items.map((item) => (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="block py-2.5 text-[13px] text-white/50 hover:text-white uppercase tracking-[0.1em] transition-colors"
                                >
                                  {item.label}
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>

                {/* Secondary links */}
                <div className="space-y-0 border-b border-white/10 pb-4 mb-4">
                  {secondaryLinks.map((link, i) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (navCategories.length + i) * 0.05, duration: 0.3 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-4 text-lg font-medium text-white/80 hover:text-white uppercase tracking-[0.15em] transition-colors"
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Account section */}
                <div className="space-y-0 border-b border-white/10 pb-4 mb-4">
                  {mounted && status === 'authenticated' && session?.user ? (
                    <>
                      <Link
                        href="/account"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 py-4 text-lg font-medium text-white/80 hover:text-white uppercase tracking-[0.15em] transition-colors"
                      >
                        <User className="w-5 h-5" strokeWidth={1.5} /> {t('nav.account')}
                      </Link>
                      <Link
                        href="/account/orders"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 py-4 text-lg font-medium text-white/80 hover:text-white uppercase tracking-[0.15em] transition-colors"
                      >
                        <Package className="w-5 h-5" strokeWidth={1.5} /> {t('nav.orders')}
                      </Link>
                      <Link
                        href="/wishlist"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 py-4 text-lg font-medium text-white/80 hover:text-white uppercase tracking-[0.15em] transition-colors"
                      >
                        <Heart className="w-5 h-5" strokeWidth={1.5} /> {t('nav.wishlist')}
                        {wishlistMounted && wishlistCount > 0 && (
                          <span className="ml-1 text-[#32FF6A] text-sm">({wishlistCount})</span>
                        )}
                      </Link>
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          signOut({ callbackUrl: '/' });
                        }}
                        className="w-full flex items-center gap-3 py-4 text-lg font-medium text-white/80 hover:text-red-400 uppercase tracking-[0.15em] transition-colors"
                      >
                        <LogOut className="w-5 h-5" strokeWidth={1.5} /> {t('nav.signOut')}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/wishlist"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 py-4 text-lg font-medium text-white/80 hover:text-white uppercase tracking-[0.15em] transition-colors"
                      >
                        <Heart className="w-5 h-5" strokeWidth={1.5} /> {t('nav.wishlist')}
                        {wishlistMounted && wishlistCount > 0 && (
                          <span className="ml-1 text-[#32FF6A] text-sm">({wishlistCount})</span>
                        )}
                      </Link>
                      <Link
                        href="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 py-4 text-lg font-medium text-white/80 hover:text-white uppercase tracking-[0.15em] transition-colors"
                      >
                        <User className="w-5 h-5" strokeWidth={1.5} /> {t('nav.signIn')}
                      </Link>
                    </>
                  )}
                </div>

                {/* Info links */}
                <div className="space-y-0">
                  {infoLinks.map((link, i) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (navCategories.length + secondaryLinks.length + i) * 0.05, duration: 0.3 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-3 text-[13px] text-white/40 hover:text-white/70 uppercase tracking-[0.15em] transition-colors"
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCartUpdate={fetchCartCount}
      />

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
