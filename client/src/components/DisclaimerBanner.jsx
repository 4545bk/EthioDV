import React from 'react';
import { useLanguage } from '../i18n/index.jsx';
import { AlertTriangle } from 'lucide-react';

export default function DisclaimerBanner() {
  const { t } = useLanguage();

  return (
    <aside className="disclaimer-banner" role="complementary" aria-label="Official Disclaimer">
      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
      <span>{t('disclaimer')}</span>
    </aside>
  );
}
