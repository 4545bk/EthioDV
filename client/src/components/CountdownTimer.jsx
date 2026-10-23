import React, { useState, useEffect } from 'react';
import { Clock, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../i18n/index.jsx';

export default function CountdownTimer({ onNavigate }) {
  const { language } = useLanguage();
  const isAmharic = language === 'am';

  // Target date: DV-2027 opening
  // Typically first Wednesday of October at 12:00 PM EDT.
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    // Set fixed future milestone or dynamic pre-registration window
    const now = new Date();
    // Default target: October 1st of current/upcoming lottery cycle at 12:00 EDT
    let targetYear = now.getFullYear();
    let target = new Date(`October 1, ${targetYear} 19:00:00 GMT+0300`);

    if (now > target) {
      // If already past October 1, set next batch cutoff or next window
      target = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000) + (8 * 60 * 60 * 1000));
    }

    const updateCountdown = () => {
      const current = new Date();
      const difference = target.getTime() - current.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="card animate-fade-in"
      style={{
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(6, 182, 212, 0.06))',
        border: '1.5px solid rgba(124, 58, 237, 0.28)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 20px',
        maxWidth: 720,
        margin: '0 auto 36px auto',
        textAlign: 'center',
        boxShadow: '0 8px 30px rgba(124, 58, 237, 0.08)',
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(124, 58, 237, 0.15)', padding: '4px 12px', borderRadius: 9999, marginBottom: 12 }}>
        <Zap size={14} color="#a855f7" />
        <span style={{ fontSize: 12, color: 'var(--primary-600)', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {isAmharic ? 'የDV-2027 ይፋዊ ፖርታል መክፈቻ ቆጣሪ' : 'DV-2027 Official Portal Countdown'}
        </span>
      </div>

      <h3 style={{ fontSize: 'clamp(17px, 3vw, 22px)', color: 'var(--text-main)', margin: '0 0 6px 0', fontWeight: 800 }}>
        {isAmharic
          ? 'የአሜሪካ ስቴት ዲፓርትመንት ድረ-ገጽ ከመከፈቱ በፊት ተራዎን ያስይዙ!'
          : 'Reserve Your Early-Bird Queue Spot Before U.S. Portal Opens!'}
      </h3>

      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 auto 20px auto', maxWidth: 540, lineHeight: 1.5 }}>
        {isAmharic
          ? 'ፖርታሉ እንደተከፈተ በሚሊዮኖች መጨናነቅ ምክንያት ድረ-ገጹ ስለሚዘጋ (Server 504 Error)፣ አስቀድመው የተመዘገቡ አመልካቾች በመጀመሪያዎቹ ሰዓታት በቅድሚያ ይገባሉ።'
          : 'Avoid the State Department server crash in the opening week. Pre-registered applications are filed in Batch #1 priority.'}
      </p>

      {/* Digits Grid */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 'clamp(8px, 2vw, 16px)',
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        {[
          { labelAm: 'ቀናት', labelEn: 'Days', val: timeLeft.days },
          { labelAm: 'ሰዓታት', labelEn: 'Hours', val: timeLeft.hours },
          { labelAm: 'ደቂቃዎች', labelEn: 'Mins', val: timeLeft.minutes },
          { labelAm: 'ሰከንዶች', labelEn: 'Secs', val: timeLeft.seconds },
        ].map((item, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--bg-input)',
              border: '1.5px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              minWidth: 70,
              padding: '10px 8px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                fontSize: 'clamp(24px, 4.5vw, 34px)',
                fontWeight: 900,
                color: 'var(--primary-600)',
                fontFamily: 'monospace',
                lineHeight: 1,
              }}
            >
              {String(item.val).padStart(2, '0')}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4, display: 'block' }}>
              {isAmharic ? item.labelAm : item.labelEn}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button
          onClick={() => onNavigate('wizard')}
          className="btn btn-primary w-full-mobile"
          style={{ padding: '10px 22px', fontSize: 14, borderRadius: 9999, justifyContent: 'center' }}
        >
          {isAmharic ? 'ቅጹን አሁኑኑ ጀምር / Start Form' : 'Start Application Now'}
          <ArrowRight size={15} />
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={14} color="#10b981" />
          {isAmharic ? '90% የተመላሽ ዋስትና አለው' : '90% Money-Back Guarantee'}
        </span>
      </div>
    </div>
  );
}
