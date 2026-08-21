'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Package,
  Settings as SettingsIcon,
  Truck,
  ExternalLink,
} from 'lucide-react';

interface LaunchProduct {
  id: string;
  name: string;
  slug: string;
  status: string;
  variantCount: number;
  missing: string[];
  ready: boolean;
}

interface LaunchData {
  products: LaunchProduct[];
  totalProducts: number;
  activeCount: number;
  draftCount: number;
  readyCount: number;
}

const FIELD_LABELS: Record<string, string> = {
  price: 'Price',
  gender: 'Gender',
  activity: 'Activity',
  sizes: 'Sizes',
  colors: 'Colors',
  images: 'Images',
  inventory: 'Inventory (variants)',
  fabricType: 'Fabric type',
  fit: 'Fit',
  careInstructions: 'Care instructions',
};

export default function LaunchReadinessPage() {
  const [data, setData] = useState<LaunchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [shipping, setShipping] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/launch').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/settings').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/shipping').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([l, s, sh]) => {
        setData(l);
        setBusiness(s);
        setShipping(sh);
      })
      .finally(() => setLoading(false));
  }, []);

  const businessChecks = business
    ? [
        { label: 'Business name', ok: !!business.businessName },
        { label: 'Public contact email', ok: !!business.publicEmail },
        { label: 'Admin notification email', ok: !!business.adminEmail },
        { label: 'Phone or WhatsApp', ok: !!(business.phone || business.whatsapp) },
        { label: 'Address', ok: !!business.addressLine },
        {
          label: 'At least one payment method enabled',
          ok: !!(business.codEnabled || business.bankTransferEnabled),
        },
        {
          label: 'Bank details (if bank transfer enabled)',
          ok: !business.bankTransferEnabled || !!(business.bankName && business.bankIban),
        },
        { label: 'Return window configured', ok: business.returnWindowDays != null },
      ]
    : [];

  const shippingChecks = shipping
    ? [
        {
          label: 'At least one shipping region enabled',
          ok: !!(shipping.tiranaEnabled || shipping.albaniaEnabled || shipping.internationalEnabled),
        },
        {
          label: 'Free-shipping threshold set (if enabled)',
          ok: !shipping.freeShippingEnabled || shipping.freeShippingThreshold > 0,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Rocket className="w-6 h-6 text-[#32FF6A]" />
        <div>
          <h1 className="text-2xl font-bold text-white">Launch Readiness</h1>
          <p className="text-sm text-white/40">
            Review what still needs real data before going live. Draft products stay hidden from
            the public site until you set them to Active.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-white/40">Loading…</div>
      ) : (
        <>
          {/* Summary cards */}
          {data && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#111] rounded-lg p-5">
                <p className="text-3xl font-bold text-white">{data.totalProducts}</p>
                <p className="text-xs text-white/40 mt-1">Total products</p>
              </div>
              <div className="bg-[#111] rounded-lg p-5">
                <p className="text-3xl font-bold text-[#32FF6A]">{data.activeCount}</p>
                <p className="text-xs text-white/40 mt-1">Active (public)</p>
              </div>
              <div className="bg-[#111] rounded-lg p-5">
                <p className="text-3xl font-bold text-white/70">{data.draftCount}</p>
                <p className="text-xs text-white/40 mt-1">Draft (hidden)</p>
              </div>
              <div className="bg-[#111] rounded-lg p-5">
                <p className="text-3xl font-bold text-white">{data.readyCount}</p>
                <p className="text-xs text-white/40 mt-1">Complete data</p>
              </div>
            </div>
          )}

          {/* Business + shipping config */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#111] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <SettingsIcon className="w-4 h-4 text-[#32FF6A]" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
                  Business settings
                </h2>
                <Link
                  href="/admin/settings"
                  className="ml-auto text-xs text-[#32FF6A] hover:underline flex items-center gap-1"
                >
                  Edit <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <ul className="space-y-2.5">
                {businessChecks.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-sm">
                    {c.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-[#32FF6A] shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className={c.ok ? 'text-white/70' : 'text-amber-300/90'}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#111] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-4 h-4 text-[#32FF6A]" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
                  Shipping
                </h2>
                <Link
                  href="/admin/settings"
                  className="ml-auto text-xs text-[#32FF6A] hover:underline flex items-center gap-1"
                >
                  Edit <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <ul className="space-y-2.5">
                {shippingChecks.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-sm">
                    {c.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-[#32FF6A] shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className={c.ok ? 'text-white/70' : 'text-amber-300/90'}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Product checklist */}
          <div className="bg-[#111] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-5">
              <Package className="w-4 h-4 text-[#32FF6A]" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
                Products
              </h2>
            </div>
            {data && data.products.length === 0 ? (
              <p className="text-sm text-white/40">No products yet.</p>
            ) : (
              <div className="space-y-3">
                {data?.products.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-2 sm:w-64 shrink-0">
                      {p.ready ? (
                        <CheckCircle2 className="w-4 h-4 text-[#32FF6A] shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <span className="text-sm text-white font-medium truncate">{p.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wide shrink-0 ${
                          p.status === 'active'
                            ? 'bg-[#32FF6A]/15 text-[#32FF6A]'
                            : 'bg-white/10 text-white/50'
                        }`}
                      >
                        {p.status === 'active' ? 'Active' : 'Draft'}
                      </span>
                    </div>
                    <div className="flex-1">
                      {p.missing.length === 0 ? (
                        <span className="text-xs text-[#32FF6A]">All data complete</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {p.missing.map((m) => (
                            <span
                              key={m}
                              className="text-[11px] bg-amber-400/10 text-amber-300/90 px-2 py-0.5 rounded"
                            >
                              {FIELD_LABELS[m] || m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Link
                      href="/admin/products"
                      className="text-xs text-[#32FF6A] hover:underline shrink-0"
                    >
                      Edit
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
