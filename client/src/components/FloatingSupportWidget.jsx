import React, { useState, useEffect, useRef } from 'react';
import { Phone, MessageCircle, X, HelpCircle, ShieldCheck, Send, PhoneCall } from 'lucide-react';
import { useLanguage } from '../i18n/index.jsx';

export default function FloatingSupportWidget({ onNavigate }) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef(null);

  const isAmharic = language === 'am';

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  return (
    <div
      ref={widgetRef}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'auto',
      }}
    >
      {/* Expanded Support Menu Popup */}
      {isOpen && (
        <div
          className="animate-fade-in"
          style={{
            marginBottom: 14,
            width: 320,
            maxWidth: 'calc(100vw - 32px)',
            background: 'var(--bg-card)',
            border: '1.5px solid rgba(124, 58, 237, 0.3)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: 18,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>
                  {isAmharic ? 'የደንበኞች አገልግሎት' : 'Customer Support Desk'}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                {isAmharic ? '24/7 ማንኛውንም ጥያቄ ለመመለስ ዝግጁ ነን' : 'Online & ready to assist with your DV application'}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Action 1: Direct Phone Call */}
          <a
            href="tel:0949478933"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.04))',
              border: '1.5px solid rgba(16, 185, 129, 0.3)',
              textDecoration: 'none',
              marginBottom: 10,
              transition: 'all 0.2s ease',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
              }}
            >
              <PhoneCall size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: 13, color: 'var(--text-main)' }}>
                {isAmharic ? 'በስልክ ደውል (Direct Call)' : 'Direct Phone Call'}
              </strong>
              <span style={{ fontSize: 14, color: '#10b981', fontWeight: 800, fontFamily: 'monospace' }}>
                0949478933
              </span>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                ዮሐንስ ሞላ (Yohannes Mola)
              </div>
            </div>
          </a>

          {/* Action 2: Telegram Bot / Support Chat */}
          <a
            href="https://t.me/DV2027EthioDv_Bot"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(56, 189, 248, 0.04))',
              border: '1.5px solid rgba(56, 189, 248, 0.3)',
              textDecoration: 'none',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <Send size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: 13, color: 'var(--text-main)' }}>
                {isAmharic ? 'በቴሌግራም መልዕክት ላክ' : 'Chat on Telegram'}
              </strong>
              <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 600 }}>
                @DV2027EthioDv_Bot
              </span>
            </div>
          </a>

          {/* Action 3: FAQ Quick Link */}
          {onNavigate && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate('faq');
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: 12,
                cursor: 'pointer',
                justifyContent: 'center',
              }}
            >
              <HelpCircle size={14} />
              <span>{isAmharic ? 'የተደጋጋሚ ጥያቄዎችና መልሶች (FAQ)' : 'Frequently Asked Questions (FAQ)'}</span>
            </button>
          )}

          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <ShieldCheck size={13} color="#10b981" />
            <span>90% Money-Back Guarantee Protected</span>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.45)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'transform 0.2s ease',
          transform: isOpen ? 'rotate(90deg)' : 'none',
        }}
        title="Customer Support / ደንበኞች አገልግሎት"
        aria-label="Customer Support"
      >
        {isOpen ? <X size={24} /> : <Phone size={22} />}

        {/* Pulsing indicator badge */}
        {!isOpen && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#22c55e',
              border: '2px solid #ffffff',
              boxShadow: '0 0 8px #22c55e',
            }}
          />
        )}
      </button>
    </div>
  );
}
