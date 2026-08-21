'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface LegalPageProps {
  label: string;
  title: string;
  intro?: string;
  children: ReactNode;
}

/**
 * Shared dark-theme shell for all legal / policy pages so they match the
 * storefront visual language (black bg, editorial spacing, neon accent).
 */
export function LegalPage({ label, title, intro, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-black pt-[70px]">
      <div className="border-b border-white/5">
        <div className="max-w-[900px] mx-auto px-6 lg:px-10 py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#32FF6A] mb-3">{label}</p>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{title}</h1>
            {intro && <p className="mt-4 text-[14px] text-white/50 leading-relaxed max-w-2xl">{intro}</p>}
          </motion.div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 lg:px-10 py-14 lg:py-20">
        <div className="space-y-10 text-[14px] text-white/60 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold tracking-tight text-white mb-3">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/** Highlighted note for data that still needs legal confirmation. */
export function LegalPlaceholder({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-3 border border-[#32FF6A]/20 bg-[#32FF6A]/5 text-white/60 text-[13px]">
      {children}
    </p>
  );
}
