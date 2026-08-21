'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

const STORAGE_KEY = 'elev8_wishlist';
const CHANGE_EVENT = 'elev8-wishlist-change';

function readWishlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeWishlist(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* ignore quota / privacy errors */
  }
}

/**
 * Wishlist hook backed by localStorage for instant UI, synced with the user's
 * account when logged in.
 * - Guests: localStorage only.
 * - On login: the guest list is merged into the account, then the account
 *   becomes the source of truth (mirrored back to localStorage).
 * - Toggling while logged in writes through to the server.
 * SSR-safe: starts empty on the server / first client render, hydrates in effect.
 */
export function useWishlist() {
  const { data: session, status } = useSession() || {};
  const isAuthed = status === 'authenticated';
  const [ids, setIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const mergedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    setIds(readWishlist());

    const sync = () => setIds(readWishlist());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // On login, merge the local guest wishlist into the account once, then adopt
  // the server list as the source of truth.
  useEffect(() => {
    if (!mounted || !isAuthed || mergedRef.current) return;
    mergedRef.current = true;
    const local = readWishlist();
    fetch('/api/wishlist/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: local }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ids && Array.isArray(d.ids)) {
          writeWishlist(d.ids);
          setIds(d.ids);
        }
      })
      .catch(() => {});
  }, [mounted, isAuthed]);

  // Reset merge guard on logout so a subsequent login re-merges.
  useEffect(() => {
    if (status === 'unauthenticated') mergedRef.current = false;
  }, [status]);

  const isWishlisted = useCallback(
    (id: string) => mounted && ids.includes(id),
    [ids, mounted]
  );

  const toggle = useCallback((id: string) => {
    if (!id) return;
    const current = readWishlist();
    const adding = !current.includes(id);
    const next = adding ? [...current, id] : current.filter((x) => x !== id);
    writeWishlist(next);
    setIds(next);

    if (isAuthed) {
      if (adding) {
        fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: id }),
        }).catch(() => {});
      } else {
        fetch(`/api/wishlist?productId=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }).catch(() => {});
      }
    }
  }, [isAuthed]);

  return { ids, isWishlisted, toggle, mounted, count: ids.length };
}
