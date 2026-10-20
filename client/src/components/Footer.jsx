import React from 'react';
import { useLanguage } from '../i18n/index.jsx';
import { Shield, ExternalLink, HelpCircle, FileCheck } from 'lucide-react';

export default function Footer({ onNavigate }) {
  const { t } = useLanguage();

  return (
    <footer className="footer">
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 30, marginBottom: 30 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Shield size={18} color="var(--primary-600)" />
              <strong style={{ color: 'var(--text-main)', fontSize: 16 }}>{t('brandName')}</strong>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)' }}>
              {t('heroSubtitle')}
            </p>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-main)', fontSize: 14, marginBottom: 12, fontWeight: 700 }}>ፈጣን ሊንኮች / Quick Links</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('faq'); }} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                  <HelpCircle size={13} style={{ display: 'inline', marginRight: 6 }} />
                  {t('faq')}
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('refund'); }} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                  <FileCheck size={13} style={{ display: 'inline', marginRight: 6 }} />
                  {t('refundPolicy')}
                </a>
              </li>
              <li>
                <a
                  href="https://dvprogram.state.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary-600)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}
                >
                  ይፋዊው የአሜሪካ ድረ-ገጽ (dvprogram.state.gov)
                  <ExternalLink size={12} />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-main)', fontSize: 14, marginBottom: 12, fontWeight: 700 }}>ድጋፍና ግንኙነት / Support</h4>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text-muted)' }}>
              📞 ደንበኞች አገልግሎት: <a href="tel:0949478933" style={{ color: 'var(--primary-600)', fontWeight: 700, textDecoration: 'none' }}>0949478933</a><br />
              የቴሌግራም ቦት: <strong>@DV2027EthiopiaBot</strong><br />
              የስራ ሰዓት: 24/7 ክፍት (Customer Support)<br />
              አድራሻ: አዲስ አበባ፣ ኢትዮጵያ
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-subtle)', lineHeight: 1.5 }}>
          <p style={{ marginBottom: 6 }}>
            <strong>ማሳሰቢያ / Disclaimer:</strong> {t('disclaimer')}
          </p>
          <p>© {new Date().getFullYear()} {t('brandName')} - Independent Application Service. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
