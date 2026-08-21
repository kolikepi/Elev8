'use client';

import { useEffect, useState } from 'react';

export interface PublicSiteSettings {
  businessName: string;
  publicEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  addressLine: string | null;
  country: string | null;
  currency: string;
  instagram: string | null;
  tiktok: string | null;
  websiteUrl: string | null;
  returnWindowDays: number | null;
  exchangeAllowed: boolean;
  returnConditions: string | null;
  returnShippingPaidBy: string | null;
  nonReturnableItems: string | null;
  returnProcedure: string | null;
  codEnabled: boolean;
  bankTransferEnabled: boolean;
  bankName: string | null;
  bankAccountHolder: string | null;
  bankIban: string | null;
  bankSwift: string | null;
  bankInstructions: string | null;
  cardPaymentsEnabled: boolean;
}

export const DEFAULT_PUBLIC_SETTINGS: PublicSiteSettings = {
  businessName: 'ELEV8',
  publicEmail: null,
  phone: null,
  whatsapp: null,
  addressLine: null,
  country: 'Albania',
  currency: 'EUR',
  instagram: null,
  tiktok: null,
  websiteUrl: null,
  returnWindowDays: null,
  exchangeAllowed: false,
  returnConditions: null,
  returnShippingPaidBy: null,
  nonReturnableItems: null,
  returnProcedure: null,
  codEnabled: true,
  bankTransferEnabled: true,
  bankName: null,
  bankAccountHolder: null,
  bankIban: null,
  bankSwift: null,
  bankInstructions: null,
  cardPaymentsEnabled: false,
};

let cache: PublicSiteSettings | null = null;

/**
 * Client hook for reading the public business settings. Everything empty
 * stays null so callers can hide the related claim instead of showing a
 * placeholder as fact.
 */
export function useSiteSettings() {
  const [settings, setSettings] = useState<PublicSiteSettings>(cache ?? DEFAULT_PUBLIC_SETTINGS);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    let active = true;
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d) {
          cache = d;
          setSettings(d);
        }
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { settings, loading };
}
