'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'sq' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'sq',
  setLang: () => {},
  t: (key: string) => key,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useT() {
  const { t } = useContext(LanguageContext);
  return t;
}

import { translations } from './translations';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('sq');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('elev8-lang') as Language | null;
    if (saved === 'en' || saved === 'sq') {
      setLangState(saved);
    }
    setMounted(true);
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('elev8-lang', newLang);
  };

  const t = (key: string): string => {
    const val = translations[lang]?.[key];
    if (val !== undefined) return val;
    // Fallback to English, then key itself
    return translations['en']?.[key] ?? key;
  };

  // Prevent hydration mismatch by rendering default (sq) on server
  // Client will update after mount
  return (
    <LanguageContext.Provider value={{ lang: mounted ? lang : 'sq', setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
