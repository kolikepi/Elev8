'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  Check,
  AlertCircle,
  ImageIcon,
  Package,
  Boxes,
} from 'lucide-react';
import { AdminTableSkeleton } from '@/components/skeletons';
import { VariantManager } from './_components/variant-manager';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number | null;
  category: string;
  sizes: string[];
  colors: string[];
  colorHexCodes: string[];
  gsm: number | null;
  fabricType: string | null;
  imageUrl: string;
  imageUrls: string[];
  careInstructions: string[];
  features: string[];
  isFeatured: boolean;
  isBestSeller: boolean;
  inStock: boolean;
  gender: string | null;
  activity: string | null;
  collection: string | null;
  fit: string | null;
  sku: string | null;
  badge: string | null;
  modelHeight: string | null;
  modelSize: string | null;
  status: string;
}

const defaultCategories = ['T-Shirts', 'Leggings', 'Hoodies', 'Pants'];
const allSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const genderOptions = ['men', 'women', 'unisex'] as const;
const activityOptions = ['running', 'training', 'lifestyle'] as const;
const fitOptions = ['regular', 'slim', 'oversized', 'compression'] as const;
const badgeOptions = ['NEW', 'BEST', 'SALE', 'LIMITED'] as const;

const emptyProduct = {
  name: '',
  description: '',
  price: '',
  originalPrice: '',
  category: 'T-Shirts',
  sizes: ['S', 'M', 'L', 'XL'],
  colors: [''],
  colorHexCodes: ['#000000'],
  gsm: '',
  fabricType: '',
  imageUrl: '',
  imageUrls: [] as string[],
  careInstructions: ['Machine wash cold', 'Do not bleach', 'Tumble dry low'],
  features: [''],
  isFeatured: false,
  isBestSeller: false,
  inStock: true,
  gender: '',
  activity: '',
  collection: '',
  fit: '',
  sku: '',
  badge: '',
  modelHeight: '',
  modelSize: '',
  status: 'active',
};

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  // Dynamic categories from products + defaults
  const dynamicCategories = Array.from(
    new Set([...defaultCategories, ...products.map((p) => p.category)])
  ).sort();

  useEffect(() => {
    fetchProducts();
    if (searchParams?.get('action') === 'new') {
      setShowForm(true);
    }
  }, [searchParams]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const [urlUploading, setUrlUploading] = useState(false);

  const handleImageFromUrl = async (externalUrl: string) => {
    if (!externalUrl || !externalUrl.startsWith('http')) return;
    
    // If it's already an S3/CDN URL from our storage, use it directly
    const s3Domain = '.s3.';
    const cdnDomain = 'cdn.abacus';
    if (externalUrl.includes(s3Domain) || externalUrl.includes(cdnDomain)) {
      setFormData((prev) => ({
        ...prev,
        imageUrl: externalUrl,
        imageUrls: [...prev.imageUrls, externalUrl],
      }));
      return;
    }

    setUrlUploading(true);
    try {
      const res = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: externalUrl }),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to upload image');
      }

      const { publicUrl } = await res.json();
      setFormData((prev) => ({
        ...prev,
        imageUrl: publicUrl,
        imageUrls: [...prev.imageUrls, publicUrl],
      }));
      setMessage({ type: 'success', text: 'Image uploaded from URL!' });
    } catch (err) {
      console.error('URL upload error:', err);
      setMessage({ type: 'error', text: 'Could not upload image from this URL. Try uploading the file directly.' });
    } finally {
      setUrlUploading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      // Get presigned URL
      const presignRes = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
        }),
      });
      const { uploadUrl, publicUrl } = await presignRes.json();

      // Check if content-disposition is in signed headers
      const url = new URL(uploadUrl);
      const signedHeaders = url.searchParams.get('X-Amz-SignedHeaders') || '';
      const headers: Record<string, string> = { 'Content-Type': file.type };
      if (signedHeaders.includes('content-disposition')) {
        headers['Content-Disposition'] = 'attachment';
      }

      // Upload directly to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers,
      });

      // Set the image URL
      setFormData((prev) => ({
        ...prev,
        imageUrl: publicUrl,
        imageUrls: [...prev.imageUrls, publicUrl],
      }));
      setMessage({ type: 'success', text: 'Image uploaded successfully!' });
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: 'Failed to upload image. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const url = editingId
        ? `/api/admin/products/${editingId}`
        : '/api/admin/products';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: formData.price,
          originalPrice: formData.originalPrice || null,
          gsm: formData.gsm || null,
          colors: formData.colors.filter(Boolean),
          features: formData.features.filter(Boolean),
          gender: formData.gender || null,
          activity: formData.activity || null,
          collection: formData.collection || null,
          fit: formData.fit || null,
          sku: formData.sku || null,
          badge: formData.badge || null,
          modelHeight: formData.modelHeight || null,
          modelSize: formData.modelSize || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      setMessage({ type: 'success', text: editingId ? 'Product updated!' : 'Product created!' });
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyProduct);
      fetchProducts();
    } catch {
      setMessage({ type: 'error', text: 'Failed to save product. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString() || '',
      category: product.category,
      sizes: product.sizes,
      colors: product.colors.length ? product.colors : [''],
      colorHexCodes: product.colorHexCodes.length ? product.colorHexCodes : ['#000000'],
      gsm: product.gsm?.toString() || '',
      fabricType: product.fabricType || '',
      imageUrl: product.imageUrl,
      imageUrls: product.imageUrls,
      careInstructions: product.careInstructions,
      features: product.features.length ? product.features : [''],
      isFeatured: product.isFeatured,
      isBestSeller: product.isBestSeller,
      inStock: product.inStock,
      gender: product.gender || '',
      activity: product.activity || '',
      collection: product.collection || '',
      fit: product.fit || '',
      sku: product.sku || '',
      badge: product.badge || '',
      modelHeight: product.modelHeight || '',
      modelSize: product.modelSize || '',
      status: product.status || 'active',
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Product deleted!' });
      setDeleteConfirm(null);
      fetchProducts();
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete product.' });
    }
  };

  const addArrayItem = (field: 'colors' | 'features' | 'colorHexCodes') => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], field === 'colorHexCodes' ? '#000000' : ''],
    }));
  };

  const updateArrayItem = (field: 'colors' | 'features' | 'colorHexCodes', index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const removeArrayItem = (field: 'colors' | 'features' | 'colorHexCodes', index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const toggleSize = (size: string) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size],
    }));
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="space-y-6">
          <div className="animate-pulse h-8 bg-white/[0.06] rounded w-1/4" />
          <AdminTableSkeleton rows={4} cols={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Products</h1>
          <p className="text-white/60 mt-1">Manage your product catalog</p>
        </div>
        <button
          onClick={() => {
            setFormData(emptyProduct);
            setEditingId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#32FF6A] text-black font-semibold rounded-lg hover:bg-[#32FF6A]/90 transition-colors"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center overflow-y-auto py-8">
          <div className="bg-gray-900 rounded-xl w-full max-w-3xl mx-4 my-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">
                {editingId ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData(emptyProduct);
                }}
                className="text-white/60 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#32FF6A]">Basic Information</h3>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                    placeholder="e.g., Performance T-Shirt - Black"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={3}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                    placeholder="Describe your product..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Price (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                      placeholder="45.00"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Original Price (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.originalPrice}
                      onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                      placeholder="55.00 (leave empty if no discount)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">Category *</label>
                  <div className="relative">
                    <input
                      list="category-options"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Select or type a new category..."
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A] placeholder-white/40"
                      required
                    />
                    <datalist id="category-options">
                      {dynamicCategories.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Classification */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#32FF6A]">Classification</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                    >
                      <option value="" className="bg-gray-900">— Not set —</option>
                      {genderOptions.map((g) => (
                        <option key={g} value={g} className="bg-gray-900">{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Activity</label>
                    <select
                      value={formData.activity}
                      onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                    >
                      <option value="" className="bg-gray-900">— Not set —</option>
                      {activityOptions.map((a) => (
                        <option key={a} value={a} className="bg-gray-900">{a.charAt(0).toUpperCase() + a.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Fit</label>
                    <select
                      value={formData.fit}
                      onChange={(e) => setFormData({ ...formData, fit: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                    >
                      <option value="" className="bg-gray-900">— Not set —</option>
                      {fitOptions.map((f) => (
                        <option key={f} value={f} className="bg-gray-900">{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Badge</label>
                    <select
                      value={formData.badge}
                      onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                    >
                      <option value="" className="bg-gray-900">— None —</option>
                      {badgeOptions.map((b) => (
                        <option key={b} value={b} className="bg-gray-900">{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Publication Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                    >
                      <option value="active" className="bg-gray-900">Active (visible on site)</option>
                      <option value="draft" className="bg-gray-900">Draft (hidden from site)</option>
                    </select>
                    <p className="text-white/40 text-xs mt-1">Only Active products appear on the public store.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Collection</label>
                    <input
                      type="text"
                      value={formData.collection}
                      onChange={(e) => setFormData({ ...formData, collection: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                      placeholder="e.g., Summer 2026, Essentials"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">SKU</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                      placeholder="e.g., ELV-TS-BLK-001"
                    />
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#32FF6A]">Product Image</h3>
                
                <div className="flex items-start gap-4">
                  {formData.imageUrl ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-white/10">
                      <Image
                        src={formData.imageUrl}
                        alt="Product"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: '', imageUrls: [] })}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-white/10 flex items-center justify-center">
                      <ImageIcon size={32} className="text-white/40" />
                    </div>
                  )}

                  <div className="flex-1">
                    <label className="block">
                      <span className="flex items-center gap-2 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white cursor-pointer hover:bg-white/20 transition-colors">
                        <Upload size={20} />
                        {uploading ? 'Uploading...' : 'Upload Image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                        }}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    <p className="text-white/40 text-sm mt-2">Or paste an image URL:</p>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="url"
                        id="image-url-input"
                        className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-[#32FF6A]"
                        placeholder="https://..."
                        disabled={urlUploading}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;
                            if (input.value) handleImageFromUrl(input.value);
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={urlUploading}
                        onClick={() => {
                          const input = document.getElementById('image-url-input') as HTMLInputElement;
                          if (input?.value) handleImageFromUrl(input.value);
                        }}
                        className="px-4 py-2 bg-[#32FF6A] text-black text-sm font-semibold rounded-lg hover:bg-[#32FF6A]/80 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {urlUploading ? 'Uploading...' : 'Upload URL'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sizes */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#32FF6A]">Available Sizes</h3>
                <div className="flex flex-wrap gap-2">
                  {allSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        formData.sizes.includes(size)
                          ? 'bg-[#32FF6A] text-black'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#32FF6A]">Colors</h3>
                {formData.colors.map((color, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.colorHexCodes[index] || '#000000'}
                      onChange={(e) => updateArrayItem('colorHexCodes', index, e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => updateArrayItem('colors', index, e.target.value)}
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                      placeholder="Color name (e.g., Black)"
                    />
                    {formData.colors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          removeArrayItem('colors', index);
                          removeArrayItem('colorHexCodes', index);
                        }}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    addArrayItem('colors');
                    addArrayItem('colorHexCodes');
                  }}
                  className="text-[#32FF6A] text-sm hover:underline"
                >
                  + Add another color
                </button>
              </div>

              {/* Fabric Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#32FF6A]">Fabric Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">GSM (Fabric Weight)</label>
                    <input
                      type="number"
                      value={formData.gsm}
                      onChange={(e) => setFormData({ ...formData, gsm: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                      placeholder="e.g., 180"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Fabric Type</label>
                    <input
                      type="text"
                      value={formData.fabricType}
                      onChange={(e) => setFormData({ ...formData, fabricType: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                      placeholder="e.g., 92% Polyester, 8% Spandex"
                    />
                  </div>
                </div>
              </div>

              {/* Model Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#32FF6A]">Model Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Model Height</label>
                    <input
                      type="text"
                      value={formData.modelHeight}
                      onChange={(e) => setFormData({ ...formData, modelHeight: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                      placeholder="e.g., 185cm"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Model Wears Size</label>
                    <input
                      type="text"
                      value={formData.modelSize}
                      onChange={(e) => setFormData({ ...formData, modelSize: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                      placeholder="e.g., M"
                    />
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#32FF6A]">Product Features</h3>
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => updateArrayItem('features', index, e.target.value)}
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#32FF6A]"
                      placeholder="e.g., Moisture-wicking"
                    />
                    {formData.features.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('features', index)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('features')}
                  className="text-[#32FF6A] text-sm hover:underline"
                >
                  + Add another feature
                </button>
              </div>

              {/* Toggles */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#32FF6A]">Display Options</h3>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-5 h-5 rounded border-white/20 bg-white/10 checked:bg-[#32FF6A] checked:border-[#32FF6A]"
                    />
                    <span className="text-white">Featured Product</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isBestSeller}
                      onChange={(e) => setFormData({ ...formData, isBestSeller: e.target.checked })}
                      className="w-5 h-5 rounded border-white/20 bg-white/10 checked:bg-[#32FF6A] checked:border-[#32FF6A]"
                    />
                    <span className="text-white">Best Seller</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.inStock}
                      onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                      className="w-5 h-5 rounded border-white/20 bg-white/10 checked:bg-[#32FF6A] checked:border-[#32FF6A]"
                    />
                    <span className="text-white">In Stock</span>
                  </label>
                </div>
              </div>
            </form>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4 p-6 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData(emptyProduct);
                }}
                className="px-6 py-3 text-white/70 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-3 bg-[#32FF6A] text-black font-semibold rounded-lg hover:bg-[#32FF6A]/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Delete Product?</h3>
            <p className="text-white/70 mb-6">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-white/70 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/60">No products yet. Add your first product!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
            >
              <div className="relative aspect-square bg-white/10">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={48} className="text-white/20" />
                  </div>
                )}
                {!product.inStock && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-semibold">Out of Stock</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                  {product.badge && (
                    <span className="px-2 py-1 bg-white text-black text-xs font-semibold rounded">
                      {product.badge}
                    </span>
                  )}
                  {product.isFeatured && (
                    <span className="px-2 py-1 bg-[#32FF6A] text-black text-xs font-semibold rounded">
                      Featured
                    </span>
                  )}
                  {product.isBestSeller && (
                    <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-semibold rounded">
                      Best Seller
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white/40 text-sm">{product.category}</p>
                  {product.gender && (
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-white/10 text-white/50 rounded">{product.gender}</span>
                  )}
                  {product.activity && (
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-white/10 text-white/50 rounded">{product.activity}</span>
                  )}
                </div>
                <h3 className="text-white font-semibold mt-1 truncate">{product.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[#32FF6A] font-bold">€{product.price.toFixed(2)}</span>
                  {product.originalPrice && (
                    <span className="text-white/40 line-through text-sm">
                      €{product.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <Pencil size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => setVariantProduct(product)}
                    title="Inventory & Variants"
                    className="flex items-center justify-center px-3 py-2 bg-[#32FF6A]/15 text-[#32FF6A] rounded-lg hover:bg-[#32FF6A]/25 transition-colors"
                  >
                    <Boxes size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(product.id)}
                    className="flex items-center justify-center px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {variantProduct && (
        <VariantManager
          product={variantProduct}
          onClose={() => setVariantProduct(null)}
          onSaved={fetchProducts}
        />
      )}
    </div>
  );
}
