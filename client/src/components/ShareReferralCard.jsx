import React, { useState } from 'react';
import { Share2, Send, Copy, Check, Heart, Users } from 'lucide-react';
import { useLanguage } from '../i18n/index.jsx';

export default function ShareReferralCard({ entryRef }) {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);

  const isAmharic = language === 'am';
  const siteUrl = 'https://ethiodv-rho.vercel.app';
  const shareText = isAmharic
    ? `የDV-2027 ማመልከቻዎን በ 600x600 ፒክሰል የፎቶ ማስተካከያ እና በ 90% የተመላሽ ገንዘብ ዋስትና አሁኑኑ ያስመዝግቡ! ይፋዊው ድረ-ገጽ ሳይከፈት የቅድሚያ ተራ (Priority Queue) ይያዙ:`
    : `Register your DV-2027 application with guaranteed 600x600 photo compliance & 90% Money-Back Guarantee! Reserve your priority queue slot before portal opens:`;

  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(siteUrl)}&text=${encodeURIComponent(shareText)}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${siteUrl}`)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${shareText}\n${siteUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="card animate-fade-in"
      style={{
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(16, 185, 129, 0.08))',
        border: '1.5px solid rgba(124, 58, 237, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 22px',
        margin: '24px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
              flexShrink: 0,
            }}
          >
            <Share2 size={20} />
          </div>

          <div>
            <strong style={{ fontSize: 15, color: 'var(--text-main)', display: 'block' }}>
              {isAmharic ? 'ለቤተሰብና ጓደኞች ያጋሩ (Share with Friends)' : 'Share with Family & Friends'}
            </strong>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {isAmharic
                ? 'የምትወዷቸው ሰዎችም አስተማማኝ የDV-2027 ምዝገባ እንዲያገኙ በቴሌግራም ወይም ዋትስአፕ ያጋሩ'
                : 'Help loved ones register with 100% verified photo and 90% money-back guarantee'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }} className="w-full-mobile">
          <a
            href={telegramShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary w-full-mobile"
            style={{
              padding: '7px 14px',
              fontSize: 12.5,
              borderRadius: 9999,
              borderColor: '#0284c7',
              color: '#0284c7',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            <Send size={13} />
            <span>ቴሌግራም ላይ አጋራ (Telegram)</span>
          </a>

          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary w-full-mobile"
            style={{
              padding: '7px 14px',
              fontSize: 12.5,
              borderRadius: 9999,
              borderColor: '#10b981',
              color: '#10b981',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            <Share2 size={13} />
            <span>ዋትስአፕ (WhatsApp)</span>
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-primary w-full-mobile"
            style={{
              padding: '7px 14px',
              fontSize: 12.5,
              borderRadius: 9999,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              justifyContent: 'center',
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? (isAmharic ? 'ተቀድቷል! / Copied' : 'Copied!') : (isAmharic ? 'ሊንኩን ቅዳ / Copy Link' : 'Copy Link')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
