'use client';

// Reference screen proving @pranix/i18n renders instant multilingual UI.
// Isolated route — touches no existing page. Other screens/products inherit
// this exact pattern: wrap in <I18nProvider>, call useT(), drop <LanguageSwitcher/>.

import { I18nProvider, LanguageSwitcher, useT } from '../../lib/i18n';

function Demo() {
  const t = useT();
  return (
    <div style={{ maxWidth: 520, margin: '48px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>QuickScanZ · @pranix/i18n</h1>
        <LanguageSwitcher />
      </div>
      <p style={{ marginBottom: 8 }}>{t('common.loading')}</p>
      <ul style={{ lineHeight: 1.9 }}>
        <li>{t('common.save')} · {t('common.cancel')} · {t('common.search')} · {t('common.submit')}</li>
        <li>{t('form.required')}</li>
        <li>{t('error.network')}</li>
        <li>{t('notification.saved')}</li>
        <li>{t('help.contact_support')}</li>
      </ul>
      <p style={{ opacity: 0.6, fontSize: 12, marginTop: 24 }}>
        Switch language above — strings update instantly. Indic locales are machine-draft pending native review.
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <I18nProvider>
      <Demo />
    </I18nProvider>
  );
}
