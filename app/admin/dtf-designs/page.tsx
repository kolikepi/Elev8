'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, X, Upload, Check, AlertCircle, Eye, EyeOff, Layers } from 'lucide-react';

interface DtfDesign {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  active: boolean;
  sortOrder: number;
}

export default function DtfDesignsPage() {
  const [designs, setDesigns] = useState<DtfDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Logo');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchDesigns();
  }, []);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const fetchDesigns = async () => {
    try {
      const res = await fetch('/api/admin/dtf-designs');
      const data = await res.json();
      if (Array.isArray(data)) setDesigns(data);
    } catch (err) {
      console.error('Error fetching designs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const presignRes = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });
      const { uploadUrl, publicUrl } = await presignRes.json();

      const url = new URL(uploadUrl);
      const signedHeaders = url.searchParams.get('X-Amz-SignedHeaders') || '';
      const headers: Record<string, string> = { 'Content-Type': file.type };
      if (signedHeaders.includes('content-disposition')) {
        headers['Content-Disposition'] = 'attachment';
      }
      await fetch(uploadUrl, { method: 'PUT', body: file, headers });

      setImageUrl(publicUrl);
      if (!name) setName(file.name.replace(/\.[^.]+$/, ''));
      setMessage({ type: 'success', text: 'Image uploaded!' });
    } catch (err) {
      console.error('Upload error:', err);
      setMessage({ type: 'error', text: 'Failed to upload image. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!imageUrl) {
      setMessage({ type: 'error', text: 'Please upload a design image first.' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/dtf-designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, imageUrl }),
      });
      if (!res.ok) throw new Error('save failed');
      setMessage({ type: 'success', text: 'Design added!' });
      setShowForm(false);
      setName('');
      setCategory('Logo');
      setImageUrl('');
      fetchDesigns();
    } catch {
      setMessage({ type: 'error', text: 'Failed to save design.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (d: DtfDesign) => {
    try {
      await fetch(`/api/admin/dtf-designs/${d.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !d.active }),
      });
      setDesigns((prev) => prev.map((x) => (x.id === d.id ? { ...x, active: !x.active } : x)));
    } catch {
      setMessage({ type: 'error', text: 'Failed to update design.' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/dtf-designs/${id}`, { method: 'DELETE' });
      setDesigns((prev) => prev.filter((x) => x.id !== id));
      setDeleteConfirm(null);
      setMessage({ type: 'success', text: 'Design deleted.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete design.' });
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
            <Layers className="text-[#32FF6A]" size={28} /> DTF Designs
          </h1>
          <p className="text-white/60 mt-1">Manage the ready-made ELEV8 designs customers can print</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setName(''); setCategory('Logo'); setImageUrl(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#32FF6A] text-black font-semibold rounded-lg hover:bg-[#32FF6A]/90 transition-colors"
        >
          <Plus size={20} /> Add Design
        </button>
      </div>

      {message && (
        <div className={`mb-6 flex items-center gap-2 px-4 py-3 rounded-lg ${message.type === 'success' ? 'bg-[#32FF6A]/10 text-[#32FF6A]' : 'bg-red-500/10 text-red-400'}`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="text-white/60">Loading...</div>
      ) : designs.length === 0 ? (
        <div className="text-center py-20 border border-white/10 rounded-lg">
          <Layers className="mx-auto text-white/20 mb-4" size={40} />
          <p className="text-white/60">No designs yet. Click &quot;Add Design&quot; to upload your first ELEV8 logo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {designs.map((d) => (
            <div key={d.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden group">
              <div className="relative aspect-square bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22https://placehold.co/1200x600/e2e8f0/1e293b?text=a_20x20_pixel_SVG_pattern_with_two_10x10_squares_f width=%2220%22 height=%2220%22><rect width=%2210%22 height=%2210%22 fill=%22%23e5e5e5%22/><rect x=%2210%22 y=%2210%22 width=%2210%22 height=%2210%22 fill=%22%23e5e5e5%22/></svg>')] bg-white">
                <Image src={d.imageUrl} alt={d.name} fill className="object-contain p-3" sizes="200px" />
                {!d.active && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-[11px] uppercase tracking-wider text-white/70">Hidden</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-white text-sm font-medium truncate">{d.name}</p>
                <p className="text-white/40 text-xs mb-3">{d.category}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(d)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs rounded transition-colors"
                    title={d.active ? 'Hide from editor' : 'Show in editor'}
                  >
                    {d.active ? <Eye size={14} /> : <EyeOff size={14} />}
                    {d.active ? 'Visible' : 'Hidden'}
                  </button>
                  {deleteConfirm === d.id ? (
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="px-3 py-2 bg-red-500 text-white text-xs rounded"
                    >
                      Confirm
                    </button>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(d.id)}
                      className="px-2.5 py-2 bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-gray-950 border border-white/10 rounded-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Add DTF Design</h2>
              <button onClick={() => setShowForm(false)} className="text-white/60 hover:text-white"><X size={24} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm mb-2">Design Image *</label>
                {imageUrl ? (
                  <div className="relative aspect-square w-40 mx-auto bg-white rounded-lg overflow-hidden">
                    <Image src={imageUrl} alt="preview" fill className="object-contain p-2" sizes="160px" />
                    <button onClick={() => setImageUrl('')} className="absolute top-2 right-2 p-1 bg-red-500 rounded-full"><X size={14} /></button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-lg p-8 cursor-pointer hover:border-[#32FF6A]/50 transition-colors">
                    <Upload size={24} className="text-white/40 mb-2" />
                    <span className="text-white/60 text-sm">{uploading ? 'Uploading...' : 'Click to upload (PNG recommended)'}</span>
                    <span className="text-white/30 text-xs mt-1">Transparent PNG works best</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                  placeholder="e.g., ELEV8 Logo White"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-2">Category</label>
                <input
                  list="dtf-cat-options"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                  placeholder="e.g., Logo"
                />
                <datalist id="dtf-cat-options">
                  <option value="Logo" />
                  <option value="Graphic" />
                  <option value="Text" />
                  <option value="Slogan" />
                </datalist>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-3 text-white/70 hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || uploading || !imageUrl}
                className="flex-1 px-4 py-3 bg-[#32FF6A] text-black font-semibold rounded-lg hover:bg-[#32FF6A]/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Design'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
