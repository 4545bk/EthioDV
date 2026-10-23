import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/index.jsx';
import { AlertTriangle, X } from 'lucide-react';

export default function DisclaimerBanner() {
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(true); // default true until checked

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('ethiodv_disclaimer_dismissed');
    if (!isDismissed) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('ethiodv_disclaimer_dismissed', 'true');
    setDismissed(true);
  };

  if (dismissed) {
    return null;
  }

  return (
    <aside
      className="disclaimer-banner"
      role="complementary"
      aria-label="Official Disclaimer"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 16px',
        position: 'relative',
        zIndex: 50,
      }}
    >
      <div style={{ width: 24, flexShrink: 0 }} /> {/* Spacer to balance close button */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          flex: 1,
          textAlign: 'center',
          padding: '0 8px',
        }}
      >
        <AlertTriangle size={15} style={{ flexShrink: 0 }} />
        <span style={{ lineHeight: 1.4 }}>{t('disclaimer')}</span>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Close disclaimer banner"
        title="Dismiss notice"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          padding: 4,
          borderRadius: 4,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.75,
          transition: 'opacity 0.15s ease',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.75')}
      >
        <X size={15} />
      </button>
    </aside>
  );
}
