'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MapPin, Phone, Send, Check, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { useToast } from '@/components/toast-provider';
import { useSiteSettings } from '@/lib/use-settings';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { settings } = useSiteSettings();
  const hasAnyContact = !!(settings.publicEmail || settings.phone || settings.whatsapp || settings.addressLine);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data?.success) {
        setSuccess(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
        showToast(t('contact.successMessage'), 'success');
      } else {
        setError(data?.error ?? t('contact.errorGeneric'));
        showToast(data?.error ?? t('contact.errorGeneric'), 'error');
      }
    } catch {
      setError(t('contact.errorSend'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e?.target ?? {};
    if (name) {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="min-h-screen bg-black pt-[70px]">
      {/* Header */}
      <div className="border-b border-white/5">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#32FF6A] mb-3">{t('contact.label')}</p>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              {t('contact.title')}
            </h1>
          </motion.div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-10"
          >
            <div>
              <h2 className="text-xl font-bold tracking-tight mb-4">
                {t('contact.getInTouch')}
              </h2>
              <p className="text-[14px] text-white/50 leading-relaxed">
                {t('contact.intro')}
              </p>
            </div>

            <div className="space-y-6">
              {settings.publicEmail && (
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-[#32FF6A]" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-medium mb-1">{t('contact.email')}</h3>
                    <a href={`mailto:${settings.publicEmail}`} className="text-[13px] text-white/50 hover:text-[#32FF6A] transition-colors" suppressHydrationWarning>{settings.publicEmail}</a>
                  </div>
                </div>
              )}

              {settings.phone && (
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-[#32FF6A]" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-medium mb-1">{t('contact.phone')}</h3>
                    <a href={`tel:${settings.phone.replace(/\s+/g, '')}`} className="text-[13px] text-white/50 hover:text-[#32FF6A] transition-colors" suppressHydrationWarning>{settings.phone}</a>
                  </div>
                </div>
              )}

              {settings.whatsapp && (
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-white/5 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-[#32FF6A]" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-medium mb-1">WhatsApp</h3>
                    <a href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[13px] text-white/50 hover:text-[#32FF6A] transition-colors" suppressHydrationWarning>{settings.whatsapp}</a>
                  </div>
                </div>
              )}

              {settings.addressLine && (
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-white/5 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-[#32FF6A]" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-medium mb-1">{t('contact.location')}</h3>
                    <p className="text-[13px] text-white/50" suppressHydrationWarning>{settings.addressLine}{settings.country ? `, ${settings.country}` : ''}</p>
                  </div>
                </div>
              )}

              {!hasAnyContact && (
                <p className="text-[13px] text-white/40">{t('contact.detailsSoon')}</p>
              )}
            </div>

            <div className="p-6 bg-white/5">
              <h3 className="text-[13px] font-medium mb-3">{t('contact.quickHelp')}</h3>
              <ul className="text-[13px] text-white/50 space-y-2">
                <li>• <a href="/size-guide" className="text-[#32FF6A] hover:underline">{t('contact.sizeGuideLink')}</a></li>
                <li>• <a href="/shipping-returns" className="text-[#32FF6A] hover:underline">{t('contact.shippingLink')}</a></li>
                <li>• {t('contact.quickHelp3')}</li>
              </ul>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            {success ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#32FF6A] flex items-center justify-center mx-auto mb-6">
                    <Check className="w-8 h-8 text-black" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{t('contact.success')}</h3>
                  <p className="text-[14px] text-white/50">{t('contact.successDesc')}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2">
                    {t('contact.name')}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3.5 bg-transparent border border-white/15 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-white/40 transition-colors"
                    placeholder={t('contact.namePlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2">
                    {t('contact.emailLabel')}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3.5 bg-transparent border border-white/15 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-white/40 transition-colors"
                    placeholder={t('contact.emailPlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2">
                    {t('contact.subject')}
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 bg-transparent border border-white/15 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-white/40 transition-colors"
                    placeholder={t('contact.subjectPlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2">
                    {t('contact.message')}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3.5 bg-transparent border border-white/15 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-white/40 transition-colors resize-none"
                    placeholder={t('contact.messagePlaceholder')}
                  />
                </div>

                {error && (
                  <div className="py-3 px-4 border border-red-500/20 text-[13px] text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-white text-black font-medium text-[13px] uppercase tracking-[0.15em] hover:bg-[#32FF6A] transition-all duration-300 disabled:opacity-40 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <span>{t('contact.sending')}</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{t('contact.send')}</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-white/30 text-center">
                  {t('contact.privacy')}
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
