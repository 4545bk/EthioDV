import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiRequest } from '../services/api.js';
import { Clock, ArrowRight, ShieldCheck, X } from 'lucide-react';
import { useLanguage } from '../i18n/index.jsx';

export default function UnpaidReminderBanner({ onNavigate, currentPage }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [unpaidEntry, setUnpaidEntry] = useState(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!user) {
      setUnpaidEntry(null);
      return;
    }

    // Check if user has an unpaid entry
    apiRequest('/entries')
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          // Find first entry that needs payment and hasn't uploaded a pending receipt
          const pending = res.data.find(
            (e) => e.status === 'PAYMENT_PENDING' && e.paymentStatus !== 'PENDING_VERIFICATION'
          );
          setUnpaidEntry(pending || null);
        }
      })
      .catch(() => {});
  }, [user, currentPage]);

  // Don't show if user closed it, not logged in, no unpaid entry, or already on payment page
  if (closed || !user || !unpaidEntry || currentPage === 'payment') {
    return null;
  }

  const isAmharic = language === 'am';

  return (
    <div
      className="animate-fade-in"
      style={{
        background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
        color: '#ffffff',
        padding: '10px 16px',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
        zIndex: 998,
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          padding: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={15} color="#ffffff" />
          </span>
          <span>
            {isAmharic ? (
              <>
                <strong>የDV-2027 ማመልከቻዎ 90% ተሞልቷል!</strong> የቅድመ-ምዝገባ ተራዎን (Priority Slot) አሁኑኑ ያስይዙ።
              </>
            ) : (
              <>
                <strong>Your DV-2027 application is 90% completed!</strong> Lock in your priority early-bird queue slot now.
              </>
            )}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => onNavigate('payment', { entryId: unpaidEntry.id })}
            style={{
              background: '#ffffff',
              color: '#7c3aed',
              border: 'none',
              borderRadius: 9999,
              padding: '6px 14px',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            {isAmharic ? 'ክፍያ ፈጽም (1,000 ETB)' : 'Complete Payment (1,000 ETB)'}
            <ArrowRight size={13} />
          </button>

          <button
            onClick={() => setClosed(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.8)',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
            }}
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
