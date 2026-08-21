'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Package, Truck, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { AdminTableSkeleton } from '@/components/skeletons';

interface OrderItem {
  id: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string | null;
  notes: string | null;
  paymentMethod: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  items: OrderItem[];
  createdAt: string;
}

const statuses = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle },
  { value: 'processing', label: 'Processing', color: 'bg-purple-500/20 text-purple-400', icon: Package },
  { value: 'shipped', label: 'Shipped', color: 'bg-cyan-500/20 text-cyan-400', icon: Truck },
  { value: 'delivered', label: 'Delivered', color: 'bg-[#32FF6A]/20 text-[#32FF6A]', icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/20 text-red-400', icon: XCircle },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [trackingDraft, setTrackingDraft] = useState<Record<string, { carrier: string; trackingNumber: string; trackingUrl: string }>>({});

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) setOrders(await res.json());
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Order updated to ${newStatus}` });
        fetchOrders();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error updating:', err);
      setMessage({ type: 'error', text: 'Failed to update order' });
    }
  };

  const saveTracking = async (orderId: string) => {
    const draft = trackingDraft[orderId];
    if (!draft) return;
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          carrier: draft.carrier,
          trackingNumber: draft.trackingNumber,
          trackingUrl: draft.trackingUrl,
        }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Tracking info saved' });
        fetchOrders();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error saving tracking:', err);
      setMessage({ type: 'error', text: 'Failed to save tracking' });
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filterStatus !== 'all' && order.status !== filterStatus) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        order.firstName.toLowerCase().includes(q) ||
        order.lastName.toLowerCase().includes(q) ||
        order.email.toLowerCase().includes(q) ||
        order.phone.includes(q)
      );
    }
    return true;
  });

  const statusCounts = statuses.reduce((acc, s) => {
    acc[s.value] = orders.filter(o => o.status === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="animate-pulse h-8 bg-white/[0.06] rounded w-1/4 mb-4" />
          <AdminTableSkeleton rows={5} cols={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-white/40 text-sm mt-1">{orders.length} total orders</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
            filterStatus === 'all' ? 'bg-[#32FF6A] text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          All ({orders.length})
        </button>
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilterStatus(s.value)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
              filterStatus === s.value ? s.color : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {s.label} ({statusCounts[s.value] || 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Search by order number, name, email, phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#32FF6A]"
        />
      </div>

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-20">
          <Package size={48} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const statusInfo = statuses.find(s => s.value === order.status) || statuses[0];
            const StatusIcon = statusInfo.icon;
            return (
              <div key={order.id} className="border border-white/10 rounded-lg overflow-hidden">
                {/* Row */}
                <button
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <StatusIcon size={18} className={statusInfo.color.split(' ')[1]} />
                    <div className="text-left">
                      <p className="text-white font-mono font-bold text-sm">#{order.orderNumber}</p>
                      <p className="text-white/40 text-xs">{order.firstName} {order.lastName} — {order.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-white/40 text-xs hidden sm:block">
                      {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    <span className="text-[#32FF6A] font-bold min-w-[70px] text-right">€{order.total.toFixed(2)}</span>
                    {expandedId === order.id ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
                  </div>
                </button>

                {/* Expanded */}
                {expandedId === order.id && (
                  <div className="border-t border-white/10 p-5 bg-white/[0.02]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Customer info */}
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-white/40 mb-3">Customer</h4>
                        <p className="text-white text-sm">{order.firstName} {order.lastName}</p>
                        <p className="text-white/60 text-sm">{order.email}</p>
                        <p className="text-white/60 text-sm">{order.phone}</p>
                      </div>
                      {/* Delivery */}
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-white/40 mb-3">Delivery</h4>
                        <p className="text-white text-sm">{order.address}</p>
                        <p className="text-white/60 text-sm">{order.city} {order.postalCode || ''}</p>
                        <p className="text-white/60 text-sm">Payment: {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Bank Transfer'}</p>
                        {order.notes && <p className="text-white/40 text-xs mt-2 italic">Note: {order.notes}</p>}
                      </div>
                      {/* Status change */}
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-white/40 mb-3">Update Status</h4>
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-[#32FF6A]"
                        >
                          {statuses.map(s => (
                            <option key={s.value} value={s.value} className="bg-black">{s.label}</option>
                          ))}
                        </select>

                        {/* Tracking info */}
                        <div className="mt-4">
                          <h4 className="text-xs uppercase tracking-wider text-white/40 mb-2">Shipping Tracking</h4>
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Carrier (e.g. Albanian Post)"
                              defaultValue={order.carrier || ''}
                              onChange={(e) => setTrackingDraft(prev => ({ ...prev, [order.id]: { carrier: e.target.value, trackingNumber: prev[order.id]?.trackingNumber ?? order.trackingNumber ?? '', trackingUrl: prev[order.id]?.trackingUrl ?? order.trackingUrl ?? '' } }))}
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-[#32FF6A]"
                            />
                            <input
                              type="text"
                              placeholder="Tracking number"
                              defaultValue={order.trackingNumber || ''}
                              onChange={(e) => setTrackingDraft(prev => ({ ...prev, [order.id]: { carrier: prev[order.id]?.carrier ?? order.carrier ?? '', trackingNumber: e.target.value, trackingUrl: prev[order.id]?.trackingUrl ?? order.trackingUrl ?? '' } }))}
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-[#32FF6A]"
                            />
                            <input
                              type="text"
                              placeholder="Tracking URL (optional)"
                              defaultValue={order.trackingUrl || ''}
                              onChange={(e) => setTrackingDraft(prev => ({ ...prev, [order.id]: { carrier: prev[order.id]?.carrier ?? order.carrier ?? '', trackingNumber: prev[order.id]?.trackingNumber ?? order.trackingNumber ?? '', trackingUrl: e.target.value } }))}
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-[#32FF6A]"
                            />
                            <button
                              onClick={() => saveTracking(order.id)}
                              className="w-full px-3 py-2 bg-[#32FF6A] text-black text-sm font-medium rounded-lg hover:bg-[#2ce85f] transition-colors"
                            >
                              Save Tracking
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="mt-5 pt-5 border-t border-white/10">
                      <h4 className="text-xs uppercase tracking-wider text-white/40 mb-3">Items ({order.items.length})</h4>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <div className="relative w-10 h-12 bg-white/5 flex-shrink-0 rounded">
                              {item.productImage && (
                                <Image src={item.productImage} alt={item.productName} fill className="object-cover rounded" />
                              )}
                            </div>
                            <div className="flex-1">
                              <span className="text-white text-sm">{item.productName}</span>
                              <span className="text-white/40 text-xs ml-2">({item.size}/{item.color}) ×{item.quantity}</span>
                            </div>
                            <span className="text-white/60 text-sm">€{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end gap-6 mt-4 pt-3 border-t border-white/10 text-sm">
                        <span className="text-white/40">Subtotal: €{order.subtotal.toFixed(2)}</span>
                        <span className="text-white/40">Shipping: {order.shippingCost === 0 ? 'Free' : `€${order.shippingCost.toFixed(2)}`}</span>
                        <span className="text-[#32FF6A] font-bold">Total: €{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
