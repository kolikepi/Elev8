'use client';

import { useEffect, useState } from 'react';
import { AdminTableSkeleton } from '@/components/skeletons';
import {
  MessageSquare,
  Mail,
  Clock,
  Check,
  Trash2,
  X,
  AlertCircle,
  Eye,
  Archive,
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  createdAt: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'read' | 'archived'>('all');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/admin/contacts');
      const data = await res.json();
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch('/api/admin/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
      if (selectedContact?.id === id) {
        setSelectedContact({ ...selectedContact, status });
      }
      setMessage({ type: 'success', text: 'Status updated!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to update status.' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/admin/contacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirm(null);
      if (selectedContact?.id === id) {
        setSelectedContact(null);
      }
      setMessage({ type: 'success', text: 'Message deleted!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete message.' });
    }
  };

  const filteredContacts = contacts.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500/20 text-blue-400';
      case 'read':
        return 'bg-green-500/20 text-green-400';
      case 'archived':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-white/10 text-white/60';
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="space-y-6">
          <div className="animate-pulse h-8 bg-white/[0.06] rounded w-1/4" />
          <AdminTableSkeleton rows={4} cols={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Contact Messages</h1>
        <p className="text-white/60 mt-1">View and manage customer inquiries</p>
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

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'new', 'read', 'archived'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-semibold capitalize transition-colors ${
              filter === f
                ? 'bg-[#32FF6A] text-black'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            {f}
            {f !== 'all' && (
              <span className="ml-2 text-sm">
                ({contacts.filter((c) => c.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Delete Message?</h3>
            <p className="text-white/70 mb-6">
              Are you sure you want to delete this message? This action cannot be undone.
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

      {/* Message Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-gray-900 rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Message Details</h2>
              <button
                onClick={() => setSelectedContact(null)}
                className="text-white/60 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedContact.status)}`}>
                  {selectedContact.status}
                </span>
                <span className="text-white/40 text-sm">{formatDate(selectedContact.createdAt)}</span>
              </div>
              <div>
                <p className="text-white/40 text-sm">From</p>
                <p className="text-white font-semibold">{selectedContact.name}</p>
                <a href={`mailto:${selectedContact.email}`} className="text-[#32FF6A] text-sm hover:underline">
                  {selectedContact.email}
                </a>
              </div>
              {selectedContact.subject && (
                <div>
                  <p className="text-white/40 text-sm">Subject</p>
                  <p className="text-white">{selectedContact.subject}</p>
                </div>
              )}
              <div>
                <p className="text-white/40 text-sm">Message</p>
                <p className="text-white whitespace-pre-wrap bg-white/5 p-4 rounded-lg mt-2">
                  {selectedContact.message}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between p-6 border-t border-white/10">
              <div className="flex gap-2">
                {selectedContact.status !== 'read' && (
                  <button
                    onClick={() => updateStatus(selectedContact.id, 'read')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                  >
                    <Check size={18} />
                    Mark as Read
                  </button>
                )}
                {selectedContact.status !== 'archived' && (
                  <button
                    onClick={() => updateStatus(selectedContact.id, 'archived')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30"
                  >
                    <Archive size={18} />
                    Archive
                  </button>
                )}
              </div>
              <a
                href={`mailto:${selectedContact.email}?subject=Re: ${selectedContact.subject || 'Your inquiry'}`}
                className="flex items-center gap-2 px-4 py-2 bg-[#32FF6A] text-black font-semibold rounded-lg hover:bg-[#32FF6A]/90"
              >
                <Mail size={18} />
                Reply
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/60">
            {filter === 'all' ? 'No messages yet.' : `No ${filter} messages.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className={`bg-white/5 border rounded-xl p-4 hover:bg-white/10 transition-colors ${
                contact.status === 'new' ? 'border-blue-500/30' : 'border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-white">{contact.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(contact.status)}`}>
                      {contact.status}
                    </span>
                  </div>
                  <p className="text-[#32FF6A] text-sm">{contact.email}</p>
                  {contact.subject && (
                    <p className="text-white/80 text-sm mt-1">{contact.subject}</p>
                  )}
                  <p className="text-white/50 text-sm mt-2 line-clamp-2">{contact.message}</p>
                  <div className="flex items-center gap-1 mt-3 text-white/40 text-xs">
                    <Clock size={12} />
                    {formatDate(contact.createdAt)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedContact(contact);
                      if (contact.status === 'new') {
                        updateStatus(contact.id, 'read');
                      }
                    }}
                    className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                    title="View"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(contact.id)}
                    className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
