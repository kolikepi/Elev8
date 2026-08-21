'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t('login.invalidCredentials'));
        setLoading(false);
      } else if (result?.ok) {
        window.location.href = '/';
      } else {
        setError(t('login.failed'));
        setLoading(false);
      }
    } catch {
      setError(t('login.error'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <span className="text-[22px] font-bold tracking-[0.2em] text-white">
              ELEV<span className="text-[#32FF6A]">8</span>
            </span>
          </Link>
          <h1 className="mt-8 text-2xl font-bold tracking-tight">
            {t('login.title')}
          </h1>
          <p className="mt-2 text-[13px] text-white/40">
            {t('login.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2">
              {t('login.email')}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e?.target?.value ?? '')}
              required
              className="w-full px-4 py-3.5 bg-transparent border border-white/15 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-white/40 transition-colors"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2">
              {t('login.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e?.target?.value ?? '')}
                required
                className="w-full px-4 py-3.5 bg-transparent border border-white/15 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-white/40 transition-colors pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
            <span>{loading ? t('login.signingIn') : t('login.title')}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="mt-8 text-center text-[13px] text-white/40">
          {t('login.noAccount')}{' '}
          <Link href="/signup" className="text-white hover:text-[#32FF6A] transition-colors">
            {t('login.createOne')}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
