'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Pencil, Trash2, Loader2, X, Check, Star } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { useToast } from '@/components/toast-provider';

interface Address {
  id: string;
  label: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string | null;
  isDefault: boolean;
}

const emptyForm = {
  label: '',
  firstName: '',
  lastName: '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
  isDefault: false,
};

export default function AddressesPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/addresses');
      if (res.ok) setAddresses(await res.json());
    } catch (err) {
      console.error('Error fetching addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (a: Address) => {
    setForm({
      label: a.label ?? '',
      firstName: a.firstName,
      lastName: a.lastName,
      phone: a.phone,
      address: a.address,
      city: a.city,
      postalCode: a.postalCode ?? '',
      isDefault: a.isDefault,
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.phone || !form.address || !form.city) return;
    setSaving(true);
    try {
      const url = editingId ? `/api/addresses/${editingId}` : '/api/addresses';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        showToast(t('address.saved'), 'success');
        closeForm();
        fetchAddresses();
      } else {
        showToast(t('address.error'), 'error');
      }
    } catch {
      showToast(t('address.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t('address.deleteConfirm'))) return;
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(t('address.deleted'), 'success');
        fetchAddresses();
      } else {
        showToast(t('address.error'), 'error');
      }
    } catch {
      showToast(t('address.error'), 'error');
    }
  };

  const setDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) fetchAddresses();
    } catch (err) {
      console.error(err);
    }
  };

  const inputCls =
    'w-full bg-white/[0.04] border border-white/15 px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:border-[#32FF6A] focus:outline-none';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-[#32FF6A] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-wider text-white/40">{t('address.title')}</h2>
        {!showForm && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#32FF6A] text-black text-xs font-bold uppercase tracking-wider hover:bg-[#2de05f] transition-colors"
          >
            <Plus size={16} /> {t('address.add')}
          </button>
        )}
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={save}
            className="overflow-hidden border border-white/15 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white uppercase tracking-wider text-sm font-bold">
                {editingId ? t('address.editTitle') : t('address.addNew')}
              </h3>
              <button type="button" onClick={closeForm} className="text-white/40 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div>
              <input
                type="text"
                placeholder={t('address.label')}
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder={t('address.firstName')} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputCls} required />
              <input type="text" placeholder={t('address.lastName')} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputCls} required />
            </div>
            <input type="tel" placeholder={t('address.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} required />
            <input type="text" placeholder={t('address.address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} required />
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder={t('address.city')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} required />
              <input type="text" placeholder={`${t('address.postalCode')} (${t('address.optional')})`} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className={inputCls} />
            </div>
            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="accent-[#32FF6A]" />
              {t('address.setDefault')}
            </label>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#32FF6A] text-black text-xs font-bold uppercase tracking-wider hover:bg-[#2de05f] transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t('address.save')}
              </button>
              <button type="button" onClick={closeForm} className="px-6 py-2.5 border border-white/15 text-white/60 text-xs uppercase tracking-wider hover:text-white transition-colors">
                {t('address.cancel')}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* List */}
      {addresses.length === 0 && !showForm ? (
        <div className="text-center py-16 border border-white/10">
          <MapPin size={44} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-1">{t('address.empty')}</p>
          <p className="text-white/40 text-sm">{t('address.emptyDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className={`border p-5 ${a.isDefault ? 'border-[#32FF6A]/50' : 'border-white/10'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {a.label && <span className="text-white text-sm font-medium">{a.label}</span>}
                  {a.isDefault && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#32FF6A] bg-[#32FF6A]/10 px-2 py-0.5">
                      <Star size={10} /> {t('address.default')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(a)} className="text-white/40 hover:text-[#32FF6A] transition-colors" aria-label={t('address.editTitle')}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => remove(a.id)} className="text-white/40 hover:text-red-400 transition-colors" aria-label={t('address.delete')}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <p className="text-white text-sm">{a.firstName} {a.lastName}</p>
              <p className="text-white/60 text-sm mt-1">{a.address}</p>
              <p className="text-white/60 text-sm">{a.city}{a.postalCode ? `, ${a.postalCode}` : ''}</p>
              <p className="text-white/60 text-sm mt-1" suppressHydrationWarning>{a.phone}</p>
              {!a.isDefault && (
                <button onClick={() => setDefault(a.id)} className="mt-3 text-xs uppercase tracking-wider text-white/40 hover:text-[#32FF6A] transition-colors">
                  {t('address.setDefault')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
