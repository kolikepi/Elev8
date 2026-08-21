'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number | null;
  imageUrl: string;
  category: string;
  inStock?: boolean;
}

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
      setSearched(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const runSearch = useCallback((q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((d) => {
        setResults(d.results ?? []);
        setSearched(true);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 bg-white z-[61] shadow-xl"
          >
            <div className="max-w-[900px] mx-auto px-6 lg:px-10 py-6">
              <div className="flex items-center gap-4 border-b border-black/10 pb-4">
                <Search className="w-5 h-5 text-black/40 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('search.placeholder')}
                  className="flex-1 bg-transparent text-black text-lg placeholder-black/30 focus:outline-none"
                />
                {loading && <Loader2 className="w-4 h-4 text-black/40 animate-spin flex-shrink-0" />}
                <button
                  onClick={onClose}
                  className="text-black/40 hover:text-black transition-colors flex-shrink-0"
                  aria-label={t('common.close')}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto mt-4">
                {query.trim().length >= 2 && !loading && searched && results.length === 0 && (
                  <p className="text-center text-black/40 text-sm py-12">
                    {t('search.noResults')} “{query}”
                  </p>
                )}

                {query.trim().length < 2 && (
                  <p className="text-center text-black/30 text-sm py-12">{t('search.hint')}</p>
                )}

                {results.length > 0 && (
                  <div className="divide-y divide-black/5">
                    {results.map((r) => (
                      <Link
                        key={r.id}
                        href={`/product/${r.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-4 py-3 hover:bg-black/[0.03] transition-colors px-2 -mx-2"
                      >
                        <div className="relative w-14 h-16 bg-[#f0f0f0] flex-shrink-0 overflow-hidden">
                          <Image src={r.imageUrl} alt={r.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-black/40">{r.category}</p>
                          <p className="text-sm font-medium text-black truncate">{r.name}</p>
                          <p className="text-sm text-black/70 mt-0.5">€{r.price.toFixed(2)}</p>
                        </div>
                        {r.inStock === false && (
                          <span className="text-[10px] uppercase tracking-wider text-black/40 flex-shrink-0">
                            {t('product.outOfStock')}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
