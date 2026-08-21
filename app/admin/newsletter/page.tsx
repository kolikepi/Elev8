'use client';

import { useEffect, useState } from 'react';
import { Mail, Trash2, X, Check, AlertCircle, Download, Clock } from 'lucide-react';
import { AdminTableSkeleton } from '@/components/skeletons';

interface Subscriber {
  id: string;
  email: string;
  createdAt: string;
}

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const res = await fetch('/api/admin/newsletter');
      const data = await res.json();
      setSubscribers(data);
    } catch (error) {
      console.error('Error fetching subscribers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/admin/newsletter', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
      setDeleteConfirm(null);
      setMessage({ type: 'success', text: 'Subscriber removed!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to remove subscriber.' });
    }
  };

  const exportToCSV = () => {
    const csv = ['Email,Subscribed Date'];
    subscribers.forEach((s) => {
      csv.push(`${s.email},${new Date(s.createdAt).toLocaleDateString()}`);
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elev8-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="space-y-6">
          <div className="animate-pulse h-8 bg-white/[0.06] rounded w-1/4" />
          <AdminTableSkeleton rows={4} cols={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Newsletter Subscribers</h1>
          <p className="text-white/60 mt-1">
            {subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''}
          </p>
        </div>
        {subscribers.length > 0 && (
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#32FF6A] text-black font-semibold rounded-lg hover:bg-[#32FF6A]/90 transition-colors"
          >
            <Download size={20} />
            Export CSV
          </button>
        )}
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Remove Subscriber?</h3>
            <p className="text-white/70 mb-6">
              Are you sure you want to remove this subscriber from your list?
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
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscribers List */}
      {subscribers.length === 0 ? (
        <div className="text-center py-12">
          <Mail size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/60">No subscribers yet.</p>
          <p className="text-white/40 text-sm mt-2">
            Subscribers will appear here when people sign up for your newsletter.
          </p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-white/60 font-semibold">Email</th>
                <th className="text-left p-4 text-white/60 font-semibold hidden sm:table-cell">Subscribed</th>
                <th className="text-right p-4 text-white/60 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#32FF6A]/20 rounded-full flex items-center justify-center">
                        <Mail size={18} className="text-[#32FF6A]" />
                      </div>
                      <span className="text-white">{subscriber.email}</span>
                    </div>
                  </td>
                  <td className="p-4 hidden sm:table-cell">
                    <div className="flex items-center gap-2 text-white/60">
                      <Clock size={14} />
                      {formatDate(subscriber.createdAt)}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setDeleteConfirm(subscriber.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tips */}
      <div className="mt-8 bg-[#32FF6A]/5 border border-[#32FF6A]/20 rounded-xl p-6">
        <h2 className="text-lg font-bold text-[#32FF6A] mb-2">Tips</h2>
        <ul className="space-y-2 text-white/70 text-sm">
          <li>• Use the "Export CSV" button to download your subscriber list for email marketing tools.</li>
          <li>• Subscribers signed up from the newsletter form on your website homepage and footer.</li>
          <li>• You can remove subscribers who unsubscribe by clicking the delete button.</li>
        </ul>
      </div>
    </div>
  );
}
