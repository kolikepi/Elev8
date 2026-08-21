'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { useToast } from '@/components/toast-provider';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data?.success) {
        setSuccess(true);
        setEmail('');
        showToast(t('newsletter.success'), 'success');
      } else {
        setError(data?.error ?? 'Something went wrong');
      }
    } catch {
      setError('Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-24 lg:py-32 bg-black border-t border-white/5">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#32FF6A] mb-4">{t('newsletter.label')}</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
            {t('newsletter.title')}
          </h2>
          <p className="text-[14px] text-white/40 leading-relaxed mb-8">
            {t('newsletter.desc')}
          </p>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center space-x-2 text-[#32FF6A]"
            >
              <Check className="w-5 h-5" />
              <span className="text-[14px] font-medium">{t('newsletter.success')}</span>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="flex border border-white/15">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('newsletter.placeholder')}
                  className="flex-1 px-5 py-4 bg-transparent text-[14px] text-white placeholder-white/30 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 bg-white text-black hover:bg-[#32FF6A] transition-colors duration-300 disabled:opacity-50 flex items-center"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {error && (
                <p className="mt-3 text-[12px] text-red-400">{error}</p>
              )}
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
