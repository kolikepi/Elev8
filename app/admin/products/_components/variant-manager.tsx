'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Boxes, Wand2, Save, Trash2, Check, AlertCircle } from 'lucide-react';

interface Variant {
  id?: string;
  color: string;
  colorHex: string | null;
  size: string;
  sku: string | null;
  stockQuantity: number;
  lowStockThreshold: number | null;
  active: boolean;
}

interface VariantManagerProps {
  product: {
    id: string;
    name: string;
    colors: string[];
    colorHexCodes: string[];
    sizes: string[];
  };
  onClose: () => void;
  onSaved?: () => void;
}

export function VariantManager({ product, onClose, onSaved }: VariantManagerProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bulkStock, setBulkStock] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchVariants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/variants`);
      if (res.ok) setVariants(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const flash = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'generate' }),
      });
      if (res.ok) {
        const data = await res.json();
        setVariants(data.variants ?? []);
        flash('success', `Generated ${data.created ?? 0} new combination(s).`);
      } else {
        flash('error', 'Failed to generate combinations.');
      }
    } catch {
      flash('error', 'Failed to generate combinations.');
    } finally {
      setGenerating(false);
    }
  };

  const updateRow = (idx: number, patch: Partial<Variant>) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const applyBulkStock = () => {
    const n = Math.max(0, parseInt(bulkStock, 10) || 0);
    setVariants((prev) => prev.map((v) => ({ ...v, stockQuantity: n })));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants }),
      });
      if (res.ok) {
        const data = await res.json();
        setVariants(data.variants ?? []);
        flash('success', 'Inventory saved.');
        onSaved?.();
      } else {
        flash('error', 'Failed to save inventory.');
      }
    } catch {
      flash('error', 'Failed to save inventory.');
    } finally {
      setSaving(false);
    }
  };

  const deleteVariant = async (idx: number) => {
    const v = variants[idx];
    if (v.id) {
      try {
        await fetch(`/api/admin/variants/${v.id}`, { method: 'DELETE' });
      } catch {
        flash('error', 'Failed to delete variant.');
        return;
      }
    }
    setVariants((prev) => prev.filter((_, i) => i !== idx));
    onSaved?.();
  };

  const totalStock = variants.reduce((s, v) => s + (v.active ? v.stockQuantity : 0), 0);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#32FF6A]" />
            <div>
              <h3 className="text-white font-semibold">Inventory &amp; Variants</h3>
              <p className="text-white/40 text-xs">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-white/10">
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm disabled:opacity-40"
          >
            <Wand2 size={15} />
            {generating ? 'Generating...' : 'Generate from colors × sizes'}
          </button>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={bulkStock}
              onChange={(e) => setBulkStock(e.target.value)}
              placeholder="Qty"
              className="w-20 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
            />
            <button
              onClick={applyBulkStock}
              className="px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
            >
              Set all stock
            </button>
          </div>
          <span className="ml-auto text-white/50 text-sm">
            Total active stock: <span className="text-[#32FF6A] font-semibold">{totalStock}</span>
          </span>
        </div>

        {msg && (
          <div
            className={`mx-4 mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              msg.type === 'success'
                ? 'bg-[#32FF6A]/15 text-[#32FF6A]'
                : 'bg-red-500/15 text-red-400'
            }`}
          >
            {msg.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
            {msg.text}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-7 h-7 border-2 border-[#32FF6A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : variants.length === 0 ? (
            <div className="text-center py-12">
              <Boxes size={40} className="mx-auto text-white/20 mb-3" />
              <p className="text-white/60 text-sm">
                No variants yet. Use &ldquo;Generate&rdquo; to create combinations from this
                product&apos;s colors and sizes, then enter stock quantities.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/40 text-xs uppercase tracking-wider">
                  <th className="py-2 pr-3">Color</th>
                  <th className="py-2 pr-3">Size</th>
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Stock</th>
                  <th className="py-2 pr-3">Low-stock at</th>
                  <th className="py-2 pr-3">Active</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, idx) => (
                  <tr key={v.id ?? `${v.color}-${v.size}`} className="border-t border-white/5">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-4 h-4 rounded-full border border-white/20"
                          style={{ backgroundColor: v.colorHex ?? '#000' }}
                        />
                        <span className="text-white/80">{v.color}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-white/80">{v.size}</td>
                    <td className="py-2 pr-3">
                      <input
                        value={v.sku ?? ''}
                        onChange={(e) => updateRow(idx, { sku: e.target.value })}
                        placeholder="—"
                        className="w-28 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min={0}
                        value={v.stockQuantity}
                        onChange={(e) =>
                          updateRow(idx, { stockQuantity: Math.max(0, parseInt(e.target.value, 10) || 0) })
                        }
                        className="w-20 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min={0}
                        value={v.lowStockThreshold ?? ''}
                        onChange={(e) =>
                          updateRow(idx, {
                            lowStockThreshold:
                              e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0),
                          })
                        }
                        placeholder="off"
                        className="w-20 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <button
                        onClick={() => updateRow(idx, { active: !v.active })}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          v.active ? 'bg-[#32FF6A]' : 'bg-white/20'
                        }`}
                        aria-label="Toggle active"
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            v.active ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => deleteVariant(idx)}
                        className="text-white/40 hover:text-red-400 transition-colors"
                        aria-label="Delete variant"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/70 hover:text-white transition-colors text-sm"
          >
            Close
          </button>
          <button
            onClick={saveAll}
            disabled={saving || variants.length === 0}
            className="flex items-center gap-2 px-5 py-2 bg-[#32FF6A] text-black font-semibold rounded-lg hover:bg-[#2de05f] transition-colors text-sm disabled:opacity-40"
          >
            <Save size={15} />
            {saving ? 'Saving...' : 'Save inventory'}
          </button>
        </div>
      </div>
    </div>
  );
}
