import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
} from '../../../../packages/shared/src/i18n';

type LanguageContextValue = {
  locale: Locale;
  isRTL: boolean;
  enabledLocales: Locale[];
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  tx: (source: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = 'servenow-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try { return detectLocale(localStorage.getItem(STORAGE_KEY) || 'en'); } catch { return 'en'; }
  });
  const [enabledLocales, setEnabledLocales] = useState<Locale[]>(DEFAULT_LOCALES);
  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  };
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr';
  }, [locale]);
  useEffect(() => {
    fetch('/api/platform-settings/languages', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('language settings unavailable')))
      .then((body) => {
        const next = filterSupportedLocales(body?.data?.enabledLocales);
        setEnabledLocales(next);
        setLocaleState((current) => next.includes(current) ? current : detectLocale(body?.data?.defaultLocale));
      })
      .catch(() => {});
  }, []);
  const value = useMemo(() => ({ locale, isRTL: isRTL(locale), enabledLocales, setLocale, t: (key: TranslationKey) => translate(locale, key), tx: (source: string) => translateText(locale, source) }), [locale, enabledLocales]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
}

export function LanguageSelect() {
  const { locale, enabledLocales, setLocale, t } = useLanguage();
  return (
    <label className="inline-flex items-center gap-2 text-xs font-semibold text-white/60">
      <span className="sr-only">{t('language.select')}</span>
      <select
        aria-label={t('language.select')}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white outline-none focus:border-violet-400"
      >
        {enabledLocales.map((item) => <option key={item} value={item} className="bg-[#161B27]">{LOCALE_LABELS[item]}</option>)}
      </select>
    </label>
  );
}

export { LOCALE_LABELS, SUPPORTED_LOCALES };