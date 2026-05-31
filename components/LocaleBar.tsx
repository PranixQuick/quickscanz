'use client';

import { useT } from '../lib/i18n/provider';
import LanguageSwitcher from './LanguageSwitcher';

// Global, always-visible locale bar. The tagline is real product text pulled
// from the vendored catalog — switching language visibly re-renders it, proving
// the runtime works end-to-end. Any component can now call useT() to localize.
export default function LocaleBar() {
  const t = useT();
  return (
    <div className="fixed top-2 right-2 z-50 flex items-center gap-2 rounded-full border border-black/5 bg-cream-50/90 px-3 py-1 shadow-sm backdrop-blur">
      <span className="hidden sm:inline text-xs text-ink-900/70">{t('app.tagline')}</span>
      <LanguageSwitcher />
    </div>
  );
}
