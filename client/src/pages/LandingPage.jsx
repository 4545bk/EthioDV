import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/index.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiRequest } from '../services/api.js';
import { Shield, ShieldCheck, CheckCircle2, Clock, Smartphone, ArrowRight, HelpCircle, AlertCircle, Search } from 'lucide-react';

export default function LandingPage({ onNavigate }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [trackRef, setTrackRef] = useState('');
  const [trackError, setTrackError] = useState('');

  useEffect(() => {
    apiRequest('/settings')
      .then((res) => {
        if (res.success) setSettings(res.data);
      })
      .catch(() => {});
  }, []);

  const handleQuickTrack = (e) => {
    e.preventDefault();
    if (!trackRef.trim()) return;
    onNavigate('tracker', { ref: trackRef.trim().toUpperCase() });
  };

  return (
    <div>
      {/* Hero Section */}
      <section style={{ padding: '40px 0 60px 0', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 840 }}>
          {/* Capacity Status Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 9999, background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.25)', marginBottom: 20 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: 13, color: 'var(--primary-600)', fontWeight: 600 }}>
              DV-2027 ምዝገባ ክፍት ነው | Registration Active ({settings?.approvedToday || 0}/{settings?.maxDailyCapacity || 160} today)
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', lineHeight: 1.15, marginBottom: 18 }}>
            {t('heroTitle')}
          </h1>

          <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 30, maxWidth: 720, margin: '0 auto 30px auto' }}>
            {t('heroSubtitle')}
          </p>

          <div className="hero-buttons" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
            <button
              onClick={() => {
                if (user) onNavigate('wizard');
                else onNavigate('login');
              }}
              className="btn btn-primary w-full-mobile"
              style={{ padding: '14px 28px', fontSize: 16, justifyContent: 'center' }}
            >
              {t('heroCta')}
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => onNavigate('faq')}
              className="btn btn-secondary w-full-mobile"
              style={{ padding: '14px 24px', fontSize: 15, justifyContent: 'center' }}
            >
              {t('faq')}
            </button>
          </div>

          {/* Quick Track Input */}
          <form onSubmit={handleQuickTrack} className="card" style={{ maxWidth: 480, margin: '0 auto', padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="የማመልከቻ መለያ (e.g. DV27-XXXXXX)"
              value={trackRef}
              onChange={(e) => setTrackRef(e.target.value)}
              className="form-input"
              style={{ textTransform: 'uppercase', fontSize: 14, flex: 1, minWidth: 180 }}
            />
            <button type="submit" className="btn btn-accent w-full-mobile" style={{ padding: '10px 18px', justifyContent: 'center' }}>
              <Search size={15} />
              {t('trackQueue')}
            </button>
          </form>
        </div>
      </section>

      {/* 90% Money-Back Guarantee Section (Prominent, High-Trust Visual Placement) */}
      <section style={{ padding: '10px 0 30px 0' }}>
        <div className="container" style={{ maxWidth: 840 }}>
          <div
            className="card animate-fade-in"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.09), rgba(124, 58, 237, 0.06))',
              border: '2px solid rgba(16, 185, 129, 0.35)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px 24px',
              boxShadow: '0 8px 30px rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)',
              }}
            >
              <ShieldCheck size={32} />
            </div>

            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10b981',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 9999,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  🛡️ ይፋዊ የዋስትና ደንብ / Official Guarantee
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>• 100% የታመነ</span>
              </div>

              <h3 style={{ fontSize: 20, margin: '4px 0 8px 0', color: 'var(--text-main)', fontWeight: 800 }}>
                የ 90% የተመላሽ ገንዘብ ዋስትና (90% Money-Back Guarantee)
              </h3>

              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted)' }}>
                ከእኛ በኩል በሚፈጠር ማንኛውም ቴክኒካል ወይም የአሰራር መስተጓጎል ማመልከቻዎ በጊዜ ገደቡ ሳይገባ ቢቀር፣ 
                የከፈሉት ገንዘብ <strong style={{ color: 'var(--text-main)' }}>90% (900 ብር) ሙሉ በሙሉ ተመላሽ</strong> ይደረግልዎታል 
                (10% የባንክና ቴሌኮም ሂደት ወጪ ብቻ ተቀንሶ)።
              </p>
              <p style={{ margin: '6px 0 0 0', fontSize: 12, color: 'var(--primary-600)', fontWeight: 600 }}>
                ✓ Peace of mind guaranteed: 90% of your funds returned immediately if anything happens from our side.
              </p>
            </div>

            <div style={{ flexShrink: 0 }} className="w-full-mobile">
              <button
                onClick={() => onNavigate('refund')}
                className="btn btn-secondary w-full-mobile"
                style={{ padding: '8px 16px', fontSize: 13, borderRadius: 9999, borderColor: 'rgba(16, 185, 129, 0.4)', justifyContent: 'center' }}
              >
                ደንቡን ይመልከቱ / Details →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing & Transparency Card */}
      <section style={{ padding: '20px 0 50px 0' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="card" style={{ border: '1.5px solid rgba(124, 58, 237, 0.3)', textAlign: 'center', padding: '40px 32px', borderRadius: 'var(--radius-lg)' }}>
            <span className="badge badge-success" style={{ marginBottom: 14, padding: '6px 16px' }}>ግልጽ የአገልግሎት ዋጋ / Transparent Flat Fee</span>
            <h2 style={{ fontSize: 36, marginBottom: 8 }}>
              {settings?.priceETB || 1000} ETB <span style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 400 }}>/ ለአንድ ማመልከቻ</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, maxWidth: 520, margin: '0 auto 24px auto' }}>
              የአሜሪካ መንግስት ለዲቪ ምዝገባ ምንም አይነት ክፍያ አይጠይቅም። የኛ ክፍያ ቅጽዎን በሙያዊ መንገድ ለማዘጋጀት፣ የፎቶዎን መስፈርት ለማረጋገጥ እና በይፋዊው ድረ-ገጽ ላይ ለመመዝገብ የሚደረግ የአገልግሎት ክፍያ ነው።
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, textAlign: 'left', marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>ቴሌብር ወይም ንግድ ባንክ (CBE)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>ባለ 600x600 ፎቶ ማስተካከል</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>ቅደም ተከተል በከፈሉበት ሰዓት</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>ይፋዊ ባለ 16 ዲጂት ማረጋገጫ ቁጥር</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, gridColumn: '1 / -1', background: 'rgba(16, 185, 129, 0.08)', padding: '8px 12px', borderRadius: 8 }}>
                <ShieldCheck size={16} color="#10b981" />
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>የ 90% የተመላሽ ገንዘብ ዋስትና (90% Money-Back Guarantee)</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate(user ? 'wizard' : 'login')}
              className="btn btn-primary"
              style={{ width: '100%', maxWidth: 360, margin: '0 auto', padding: '12px 24px', fontSize: 15 }}
            >
              {t('heroCta')}
            </button>
          </div>
        </div>
      </section>

      {/* 4-Step Process Section */}
      <section style={{ padding: '40px 0' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: 36, fontSize: 26 }}>
            እንዴት እንደሚሰራ / How It Works
          </h2>

          <div className="grid-2" style={{ gap: 20 }}>
            <div className="card card-hover">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <span style={{ fontWeight: 800, color: 'var(--primary-400)' }}>1</span>
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>{t('step1Title')}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>{t('step1Desc')}</p>
            </div>

            <div className="card card-hover">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(20, 184, 166, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <span style={{ fontWeight: 800, color: 'var(--accent-400)' }}>2</span>
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>{t('step2Title')}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>{t('step2Desc')}</p>
            </div>

            <div className="card card-hover">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <span style={{ fontWeight: 800, color: 'var(--warning)' }}>3</span>
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>{t('step3Title')}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>{t('step3Desc')}</p>
            </div>

            <div className="card card-hover">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <span style={{ fontWeight: 800, color: 'var(--success)' }}>4</span>
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>{t('step4Title')}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>{t('step4Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section style={{ padding: '40px 0 60px 0' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <h2 style={{ textAlign: 'center', marginBottom: 28, fontSize: 24 }}>
            ተደጋግመው የሚጠየቁ ጥያቄዎች (FAQ)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 20, borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: 15, marginBottom: 6, color: 'var(--text-main)', fontWeight: 700 }}>ይፋዊው የማረጋገጫ ቁጥር (Confirmation Number) የማን ነው?</h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                የእርስዎ የግል ንብረት ነው። ማመልከቻዎ እንደተገባ ሙሉ ባለ 16 ዲጂት ቁጥሩ በቴሌግራም፣ በኢሜል እንዲሁም በዌብሳይቱ ላይ ወዲያውኑ ይሰጥዎታል። በሜይ ወር ውጤትዎን በ dvprogram.state.gov በግልዎ ማየት ይችላሉ።
              </p>
            </div>

            <div className="card" style={{ padding: 20, borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: 15, marginBottom: 6, color: 'var(--text-main)', fontWeight: 700 }}>ፓስፖርት ግዴታ ነው?</h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                በቅርብ ዓመታት የዲቪ ህግ መሰረት ለሎተሪው ለመመዝገብ ፓስፖርት ግዴታ አይደለም። ትክክለኛ የልደት መረጃና መስፈርቱን የሚያሟላ ፎቶግራፍ ብቻ በቂ ነው።
              </p>
            </div>

            <div className="card" style={{ padding: 20, borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: 15, marginBottom: 6, color: 'var(--text-main)', fontWeight: 700 }}>ገንዘቤ ተመላሽ የሚደረገው በምን ሁኔታ ነው? (Refund Guarantee)</h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                ከእኛ በኩል በሚፈጠር ቴክኒካል ወይም የአሰራር መስተጓጎል ማመልከቻዎን በጊዜ ገደቡ ማስገባት ካልቻልን፣ የከፈሉት ገንዘብ <strong>90% (900 ብር)</strong> ሙሉ በሙሉ ተመላሽ ይደረግልዎታል (10% የባንክና ቴሌኮም ሂደት ወጪ ብቻ ተቀንሶ)። ክፍያዎ ፀድቆ ወደ አሜሪካ ድረ-ገጽ ከመግባቱ በፊት በግል ፍላጎትዎ ማቋረጥ ከፈለጉ 50% ተመላሽ ይደረጋል። ይፋዊው የማረጋገጫ ቁጥር (Confirmation Number) ከተሰጠ በኋላ ግን አገልግሎቱ ስለተጠናቀቀ ተመላሽ አይደረግም።
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
