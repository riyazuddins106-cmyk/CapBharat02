import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nManager } from 'react-native';
import {
  detectLocale,
  DEFAULT_LOCALES,
  filterSupportedLocales,
  isRTL,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  translate,
  translateText,
  type Locale,
  type TranslationKey,
} from '../../../packages/shared/src/i18n';
import { storage } from '@/lib/storage';
import { API_BASE } from '@/lib/api';

type LanguageContextValue = {
  locale: Locale;
  isRTL: boolean;
  enabledLocales: Locale[];
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: TranslationKey) => string;
  tx: (source: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = 'servenow-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [enabledLocales, setEnabledLocales] = useState<Locale[]>(DEFAULT_LOCALES);
  useEffect(() => {
    storage.getItem(STORAGE_KEY).then((saved) => setLocaleState(detectLocale(saved)));
    fetch(`${API_BASE}/api/platform-settings/languages`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('language settings unavailable')))
      .then((body) => {
        const next = filterSupportedLocales(body?.data?.enabledLocales);
        setEnabledLocales(next);
        setLocaleState((current) => next.includes(current) ? current : detectLocale(body?.data?.defaultLocale));
      })
      .catch(() => {});
  }, []);
  const setLocale = async (next: Locale) => {
    setLocaleState(next);
    await storage.setItem(STORAGE_KEY, next);
    if (I18nManager.isRTL !== isRTL(next)) I18nManager.allowRTL(true);
  };
  const value = useMemo(() => ({ locale, isRTL: isRTL(locale), enabledLocales, setLocale, t: (key: TranslationKey) => translate(locale, key), tx: (source: string) => translateText(locale, source) }), [locale, enabledLocales]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
}

export { LOCALE_LABELS, SUPPORTED_LOCALES };