'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Building2, Truck, RotateCcw, CreditCard } from 'lucide-react';

type Tab = 'business' | 'shipping' | 'returns' | 'payments';

interface SiteSettings {
  businessName: string;
  publicEmail: string | null;
  adminEmail: string | null;
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
  orderStatusEmailsEnabled: boolean;
}

interface ShippingConfig {
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  tiranaEnabled: boolean;
  tiranaRate: number;
  tiranaDeliveryText: string | null;
  albaniaEnabled: boolean;
  standardRate: number;
  albaniaDeliveryText: string | null;
  internationalEnabled: boolean;
  internationalRate: number;
  internationalDeliveryText: string | null;
}

const inputCls =
  'w-full px-4 py-3 bg-black border border-white/15 text-white rounded-lg focus:outline-none focus:border-[#32FF6A]/50 text-sm';
const labelCls = 'block text-xs uppercase tracking-wider text-white/50 mb-2';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="text-white/30 text-xs mt-1">{hint}</p>}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-sm text-white"
    >
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-[#32FF6A]' : 'bg-white/20'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
      {label}
    </button>
  );
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>('business');
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [shipping, setShipping] = useState<ShippingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/shipping').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([s, sh]) => {
        if (s) setSettings(s);
        if (sh) setShipping(sh);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upd = (key: keyof SiteSettings, value: string | boolean | number | null) =>
    setSettings((p) => (p ? { ...p, [key]: value } : p));
  const updSh = (key: keyof ShippingConfig, value: string | boolean | number | null) =>
    setShipping((p) => (p ? { ...p, [key]: value } : p));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        }),
        shipping
          ? fetch('/api/admin/shipping', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(shipping),
            })
          : Promise.resolve(null as unknown as Response),
      ]);
      if (r1.ok) setSettings(await r1.json());
      if (r2 && r2.ok) setShipping(await r2.json());
      if (r1.ok && (!r2 || r2.ok)) {
        setMessage({ type: 'success', text: 'Settings saved successfully.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save some settings.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Building2 }[] = [
    { id: 'business', label: 'Business', icon: Building2 },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'returns', label: 'Returns', icon: RotateCcw },
    { id: 'payments', label: 'Payments', icon: CreditCard },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Configure real ELEV8 business information. Empty fields are hidden on the public site.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tb) => {
          const Icon = tb.icon;
          return (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === tb.id ? 'bg-[#32FF6A] text-black' : 'bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              <Icon size={16} /> {tb.label}
            </button>
          );
        })}
      </div>

      {loading || !settings ? (
        <div className="flex items-center gap-2 text-white/50 py-12">
          <Loader2 size={18} className="animate-spin" /> Loading...
        </div>
      ) : (
        <div className="bg-[#111] border border-white/10 rounded-xl p-6 lg:p-8 space-y-5">
          {tab === 'business' && (
            <>
              <Field label="Official Business Name">
                <input className={inputCls} value={settings.businessName} onChange={(e) => upd('businessName', e.target.value)} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Public Customer Email" hint="Shown to customers on the site.">
                  <input className={inputCls} value={settings.publicEmail ?? ''} onChange={(e) => upd('publicEmail', e.target.value)} placeholder="e.g. info@elev8.al" />
                </Field>
                <Field label="Internal Admin Email" hint="Receives order & contact notifications. Never public.">
                  <input className={inputCls} value={settings.adminEmail ?? ''} onChange={(e) => upd('adminEmail', e.target.value)} placeholder="e.g. owner@gmail.com" />
                </Field>
                <Field label="Phone">
                  <input className={inputCls} value={settings.phone ?? ''} onChange={(e) => upd('phone', e.target.value)} placeholder="e.g. +355 6X XXX XXXX" />
                </Field>
                <Field label="WhatsApp">
                  <input className={inputCls} value={settings.whatsapp ?? ''} onChange={(e) => upd('whatsapp', e.target.value)} placeholder="e.g. +355 6X XXX XXXX" />
                </Field>
              </div>
              <Field label="Address">
                <input className={inputCls} value={settings.addressLine ?? ''} onChange={(e) => upd('addressLine', e.target.value)} placeholder="Street, City" />
              </Field>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Country">
                  <input className={inputCls} value={settings.country ?? ''} onChange={(e) => upd('country', e.target.value)} />
                </Field>
                <Field label="Currency" hint="ISO code, e.g. EUR, ALL.">
                  <input className={inputCls} value={settings.currency} onChange={(e) => upd('currency', e.target.value)} />
                </Field>
                <Field label="Instagram">
                  <input className={inputCls} value={settings.instagram ?? ''} onChange={(e) => upd('instagram', e.target.value)} placeholder="https://instagram.com/..." />
                </Field>
                <Field label="TikTok">
                  <input className={inputCls} value={settings.tiktok ?? ''} onChange={(e) => upd('tiktok', e.target.value)} placeholder="https://tiktok.com/@..." />
                </Field>
              </div>
              <Field label="Website URL">
                <input className={inputCls} value={settings.websiteUrl ?? ''} onChange={(e) => upd('websiteUrl', e.target.value)} placeholder="https://elev8.al" />
              </Field>
            </>
          )}

          {tab === 'shipping' && shipping && (
            <>
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-white font-medium text-sm">Free Shipping</p>
                  <p className="text-white/30 text-xs">Orders at/above the threshold ship free.</p>
                </div>
                <Toggle label="" checked={shipping.freeShippingEnabled} onChange={(v) => updSh('freeShippingEnabled', v)} />
              </div>
              {shipping.freeShippingEnabled && (
                <Field label={`Free Shipping Threshold (${settings.currency})`}>
                  <input type="number" min="0" step="0.01" className={inputCls} value={shipping.freeShippingThreshold} onChange={(e) => updSh('freeShippingThreshold', e.target.value === '' ? 0 : parseFloat(e.target.value))} />
                </Field>
              )}

              <div className="flex items-center justify-between border-t border-white/10 pt-5">
                <p className="text-white font-medium text-sm">Tirana</p>
                <Toggle label="Enabled" checked={shipping.tiranaEnabled} onChange={(v) => updSh('tiranaEnabled', v)} />
              </div>
              {shipping.tiranaEnabled && (
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label={`Tirana Rate (${settings.currency})`}>
                    <input type="number" min="0" step="0.01" className={inputCls} value={shipping.tiranaRate} onChange={(e) => updSh('tiranaRate', e.target.value === '' ? 0 : parseFloat(e.target.value))} />
                  </Field>
                  <Field label="Estimated Delivery Text" hint="Leave empty to hide.">
                    <input className={inputCls} value={shipping.tiranaDeliveryText ?? ''} onChange={(e) => updSh('tiranaDeliveryText', e.target.value)} placeholder="e.g. 1-2 business days" />
                  </Field>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-white/10 pt-5">
                <p className="text-white font-medium text-sm">Rest of Albania</p>
                <Toggle label="Enabled" checked={shipping.albaniaEnabled} onChange={(v) => updSh('albaniaEnabled', v)} />
              </div>
              {shipping.albaniaEnabled && (
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label={`Standard Rate (${settings.currency})`}>
                    <input type="number" min="0" step="0.01" className={inputCls} value={shipping.standardRate} onChange={(e) => updSh('standardRate', e.target.value === '' ? 0 : parseFloat(e.target.value))} />
                  </Field>
                  <Field label="Estimated Delivery Text" hint="Leave empty to hide.">
                    <input className={inputCls} value={shipping.albaniaDeliveryText ?? ''} onChange={(e) => updSh('albaniaDeliveryText', e.target.value)} placeholder="e.g. 2-4 business days" />
                  </Field>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-white/10 pt-5">
                <div>
                  <p className="text-white font-medium text-sm">International</p>
                  <p className="text-white/30 text-xs">Optional — off by default.</p>
                </div>
                <Toggle label="Enabled" checked={shipping.internationalEnabled} onChange={(v) => updSh('internationalEnabled', v)} />
              </div>
              {shipping.internationalEnabled && (
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label={`International Rate (${settings.currency})`}>
                    <input type="number" min="0" step="0.01" className={inputCls} value={shipping.internationalRate} onChange={(e) => updSh('internationalRate', e.target.value === '' ? 0 : parseFloat(e.target.value))} />
                  </Field>
                  <Field label="Estimated Delivery Text" hint="Leave empty to hide.">
                    <input className={inputCls} value={shipping.internationalDeliveryText ?? ''} onChange={(e) => updSh('internationalDeliveryText', e.target.value)} placeholder="e.g. 7-14 business days" />
                  </Field>
                </div>
              )}
            </>
          )}

          {tab === 'returns' && (
            <>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Return Window (days)" hint="Leave empty if not offered yet.">
                  <input type="number" min="0" className={inputCls} value={settings.returnWindowDays ?? ''} onChange={(e) => upd('returnWindowDays', e.target.value === '' ? null : parseInt(e.target.value))} placeholder="e.g. 14" />
                </Field>
                <Field label="Return Shipping Paid By">
                  <select className={inputCls} value={settings.returnShippingPaidBy ?? ''} onChange={(e) => upd('returnShippingPaidBy', e.target.value || null)}>
                    <option value="">Not configured</option>
                    <option value="customer">Customer</option>
                    <option value="merchant">Merchant</option>
                  </select>
                </Field>
              </div>
              <Toggle label="Exchanges Allowed" checked={settings.exchangeAllowed} onChange={(v) => upd('exchangeAllowed', v)} />
              <Field label="Return Conditions">
                <textarea rows={3} className={inputCls} value={settings.returnConditions ?? ''} onChange={(e) => upd('returnConditions', e.target.value)} placeholder="e.g. Items must be unworn, with tags attached." />
              </Field>
              <Field label="Non-returnable Items">
                <textarea rows={2} className={inputCls} value={settings.nonReturnableItems ?? ''} onChange={(e) => upd('nonReturnableItems', e.target.value)} placeholder="e.g. Custom DTF-printed items, underwear." />
              </Field>
              <Field label="Contact Procedure">
                <textarea rows={2} className={inputCls} value={settings.returnProcedure ?? ''} onChange={(e) => upd('returnProcedure', e.target.value)} placeholder="e.g. Email us within the return window with your order number." />
              </Field>
            </>
          )}

          {tab === 'payments' && (
            <>
              <Toggle label="Cash on Delivery (COD)" checked={settings.codEnabled} onChange={(v) => upd('codEnabled', v)} />
              <div className="border-t border-white/10 pt-5">
                <Toggle label="Bank Transfer" checked={settings.bankTransferEnabled} onChange={(v) => upd('bankTransferEnabled', v)} />
              </div>
              {settings.bankTransferEnabled && (
                <div className="space-y-5 pl-1">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field label="Bank Name">
                      <input className={inputCls} value={settings.bankName ?? ''} onChange={(e) => upd('bankName', e.target.value)} />
                    </Field>
                    <Field label="Account Holder">
                      <input className={inputCls} value={settings.bankAccountHolder ?? ''} onChange={(e) => upd('bankAccountHolder', e.target.value)} />
                    </Field>
                    <Field label="IBAN">
                      <input className={inputCls} value={settings.bankIban ?? ''} onChange={(e) => upd('bankIban', e.target.value)} />
                    </Field>
                    <Field label="SWIFT / BIC">
                      <input className={inputCls} value={settings.bankSwift ?? ''} onChange={(e) => upd('bankSwift', e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Payment Instructions">
                    <textarea rows={2} className={inputCls} value={settings.bankInstructions ?? ''} onChange={(e) => upd('bankInstructions', e.target.value)} placeholder="e.g. Use your order number as the payment reference." />
                  </Field>
                </div>
              )}
              <div className="border-t border-white/10 pt-5">
                <Toggle label="Card Payments (coming soon — no provider connected)" checked={settings.cardPaymentsEnabled} onChange={(v) => upd('cardPaymentsEnabled', v)} />
                <p className="text-white/30 text-xs mt-2">Reserved for a future card provider. No fake provider is integrated.</p>
              </div>
              <div className="border-t border-white/10 pt-5">
                <Toggle label="Send order status update emails to customers" checked={settings.orderStatusEmailsEnabled} onChange={(v) => upd('orderStatusEmailsEnabled', v)} />
              </div>
            </>
          )}

          {message && (
            <div
              className={`text-sm px-4 py-3 rounded-lg ${
                message.type === 'success'
                  ? 'bg-[#32FF6A]/10 text-[#32FF6A] border border-[#32FF6A]/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#32FF6A] text-black font-semibold rounded-lg hover:bg-[#32FF6A]/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
