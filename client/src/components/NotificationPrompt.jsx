import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../i18n/index.jsx';

export default function NotificationPrompt() {
  const { language } = useLanguage();
  const [showPrompt, setShowPrompt] = useState(false);
  const [grantedMessage, setGrantedMessage] = useState(false);

  const isAmharic = language === 'am';

  useEffect(() => {
    if (!('Notification' in window)) return;

    // Check if dismissed previously or already decided
    const isDismissed = localStorage.getItem('dv_notif_dismissed');
    if (Notification.permission === 'default' && !isDismissed) {
      // Delay prompt appearance by 12 seconds so user settles into the site
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 12000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setShowPrompt(false);
        setGrantedMessage(true);

        // Send a reassuring instant welcome notification
        try {
          new Notification('EthioDV-FillTrack • DV-2027', {
            body: isAmharic
              ? 'ማሳወቂያዎች በርተዋል! የDV-2027 ፖርታል ሲከፈት እና የማመልከቻዎ ሁኔታ ሲቀየር ወዲያውኑ ይደርስዎታል።'
              : 'Notifications enabled! You will receive instant updates when the portal opens and your entry status changes.',
            icon: '/favicon.ico',
          });
        } catch (e) {
          console.warn('System notification display:', e);
        }

        setTimeout(() => setGrantedMessage(false), 4000);
      } else {
        setShowPrompt(false);
        localStorage.setItem('dv_notif_dismissed', 'true');
      }
    } catch (err) {
      console.warn('Notification permission error:', err);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('dv_notif_dismissed', 'true');
  };

  if (grantedMessage) {
    return (
      <div
        className="animate-fade-in"
        style={{
          position: 'fixed',
          top: 70,
          right: 20,
          zIndex: 9999,
          background: 'rgba(16, 185, 129, 0.95)',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <CheckCircle2 size={18} />
        <span>{isAmharic ? 'ማሳወቂያዎች በርተዋል!' : 'Alerts successfully enabled!'}</span>
      </div>
    );
  }

  if (!showPrompt) return null;

  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        top: 70,
        right: 20,
        zIndex: 9999,
        maxWidth: 360,
        background: 'var(--bg-card)',
        border: '1.5px solid rgba(124, 58, 237, 0.35)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'rgba(124, 58, 237, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-600)',
            flexShrink: 0,
          }}
        >
          <Bell size={20} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: 13.5, color: 'var(--text-main)', display: 'block', marginBottom: 3 }}>
            {isAmharic ? 'የDV-2027 ማሳወቂያዎችን ያብሩ' : 'Enable DV-2027 Live Alerts'}
          </strong>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {isAmharic
              ? 'ይፋዊው ፖርታል ሲከፈት እና የማመልከቻዎ ይፋዊ ስክሪንሾት ሲደርስ ወዲያውኑ ማሳወቂያ እንዲደርስዎ ያብሩ።'
              : 'Get instant alerts when official registration opens and when your confirmation screenshot is ready.'}
          </p>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={handleRequestPermission}
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: 12, borderRadius: 9999 }}
            >
              {isAmharic ? 'አብራ / Enable' : 'Enable Alerts'}
            </button>
            <button
              onClick={handleDismiss}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 9999 }}
            >
              {isAmharic ? 'አሁን አይደለም' : 'Not Now'}
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 2,
          }}
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
