import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, X } from 'lucide-react';
import { useLanguage } from '../i18n/index.jsx';

const ACTIVITIES = [
  { location: 'Addis Ababa (Bole)', actionAm: 'የቅድሚያ ተራ (Priority Slot) አስይዘዋል', actionEn: 'reserved a priority filing slot', time: '2 mins ago' },
  { location: 'Hawassa', actionAm: '600x600 የዲቪ ፎቶ አረጋግጠዋል', actionEn: 'verified 600x600 compliant photo', time: '4 mins ago' },
  { location: 'Bahir Dar', actionAm: 'የDV-2027 ቅጽ አጠናቀው ወደ ሰልፍ ገብተዋል', actionEn: 'completed application & entered queue', time: '7 mins ago' },
  { location: 'Addis Ababa (CMC)', actionAm: 'የቤተሰብ ማመልከቻ አስመዝግበዋል', actionEn: 'registered family DV application', time: '9 mins ago' },
  { location: 'Adama (Nazret)', actionAm: 'የቅድመ-ምዝገባ ተራ አስይዘዋል', actionEn: 'reserved early-bird queue spot', time: '12 mins ago' },
  { location: 'Dire Dawa', actionAm: 'ፎቶውን በ AI አስተካክለው ጨርሰዋል', actionEn: 'aligned passport photo with AI', time: '15 mins ago' },
  { location: 'Mekelle', actionAm: 'የቅድሚያ ማስገቢያ ቦታ ያዙ', actionEn: 'secured Batch #1 submission spot', time: '18 mins ago' },
  { location: 'Gondar', actionAm: 'የDV-2027 ቅጽ ሞልተው አስገብተዋል', actionEn: 'completed DV-2027 registration', time: '22 mins ago' },
  { location: 'Addis Ababa (Piassa)', actionAm: 'የዲቪ ፎቶ ትክክለኛነት አረጋገጡ', actionEn: 'verified photo compliance', time: '25 mins ago' },
  { location: 'Jimma', actionAm: 'የቅድሚያ ተራ አስይዘዋል', actionEn: 'joined the early filing queue', time: '29 mins ago' },
];

export default function SocialProofToast() {
  const { language } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    // First appearance after 8 seconds
    const initialTimer = setTimeout(() => {
      showNextToast();
    }, 8000);

    return () => clearTimeout(initialTimer);
  }, [dismissed]);

  const showNextToast = () => {
    if (dismissed) return;
    const randomItem = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
    setCurrentActivity(randomItem);
    setVisible(true);

    // Auto-hide after 6 seconds
    setTimeout(() => {
      setVisible(false);

      // Schedule next toast in 24 - 40 seconds
      const nextDelay = Math.floor(Math.random() * 16000) + 24000;
      setTimeout(() => {
        showNextToast();
      }, nextDelay);
    }, 6000);
  };

  if (!visible || !currentActivity || dismissed) return null;

  const isAmharic = language === 'am';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        zIndex: 9998,
        maxWidth: 340,
        background: 'var(--bg-card)',
        border: '1.5px solid rgba(124, 58, 237, 0.25)',
        borderRadius: 14,
        padding: '12px 14px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'auto',
      }}
    >
      {/* Live Pulsing Beacon */}
      <div style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <CheckCircle2 size={18} color="#10b981" />
        <span
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px #10b981',
          }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
          <strong style={{ fontSize: 13, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentActivity.location}
          </strong>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {currentActivity.time}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.35 }}>
          {isAmharic ? currentActivity.actionAm : currentActivity.actionEn}
        </p>
      </div>

      <button
        onClick={() => {
          setVisible(false);
          setDismissed(true);
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.6,
        }}
        title="Dismiss"
      >
        <X size={14} />
      </button>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (max-width: 640px) {
          div[style*="position: fixed"] {
            left: 12px !important;
            right: 12px !important;
            bottom: 16px !important;
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
}
