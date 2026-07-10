'use client';

import { usePathname } from 'next/navigation';
import { useT } from '../lib/i18n/provider';
import LanguageSwitcher from './LanguageSwitcher';

// Routes that render AppHeader, which already contains its own language
// switcher. The global floating bar was being drawn on top of those headers,
// overlapping the header's switcher and the "+ Add" button in the top-right
// corner. So we render this bar ONLY on public/marketing pages (which have no
// header switcher) and hide it on authenticated app screens.
const APP_ROUTE_PREFIXES = [
  '/dashboard', '/account', '/products', '/claim', '/compare',
  '/energy', '/family', '/iot-hub', '/smart-devices',
  '/buying-assistant', '/onboarding', '/delete-account',
];

// Global locale bar for public pages. The tagline is real product text pulled
// from the vendored catalog — switching language visibly re-renders it, proving
// the runtime works end-to-end. Any component can now call useT() to localize.
export default function LocaleBar() {
  const t = useT();
  const pathname = usePathname() || '/';
  const isAppRoute = APP_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
  // App screens already show a language switcher in AppHeader — avoid overlap.
  if (isAppRoute) return null;

  return (
    <div className="fixed top-2 right-2 z-50 flex items-center gap-2 rounded-full border border-black/5 bg-cream-50/90 px-3 py-1 shadow-sm backdrop-blur">
      <span className="hidden sm:inline text-xs text-ink-900/70">{t('app.tagline')}</span>
      <LanguageSwitcher />
    </div>
  );
}
