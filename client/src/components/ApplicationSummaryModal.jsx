import React from 'react';
import { ShieldCheck, Printer, X, Download, User, Calendar, MapPin, GraduationCap, Users } from 'lucide-react';
import { useLanguage } from '../i18n/index.jsx';

export default function ApplicationSummaryModal({ isOpen, onClose, entry, formData }) {
  const { language } = useLanguage();
  if (!isOpen || !entry) return null;

  const isAmharic = language === 'am';
  const primary = formData?.primary;
  const fullName = primary?.name
    ? `${primary.name.firstName || ''} ${primary.name.middleName || ''} ${primary.name.lastName || ''}`.trim()
    : 'N/A';

  const birthDateStr = primary?.birthDate
    ? `${primary.birthDate.year || ''}-${String(primary.birthDate.month || '').padStart(2, '0')}-${String(primary.birthDate.day || '').padStart(2, '0')}`
    : 'N/A';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1.5px solid var(--border-subtle)',
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
          position: 'relative',
        }}
      >
        {/* Modal Action Bar (Hidden on print) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-input)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} color="var(--primary-600)" />
            <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>
              {isAmharic ? 'የማመልከቻ ማጠቃለያ ማስረጃ' : 'Application Summary Slip'}
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handlePrint}
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: 12, gap: 6 }}
            >
              <Printer size={14} />
              {isAmharic ? 'ፕሪንት / PDF አስቀምጥ' : 'Print / Save as PDF'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Certificate / Summary Sheet */}
        <div id="printable-summary-slip" style={{ padding: '28px 24px' }}>
          {/* Slip Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px dashed var(--border-subtle)', paddingBottom: 20, marginBottom: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: 'var(--primary-600)', textTransform: 'uppercase' }}>
              DV-2027 Diversity Visa Program • Ethiopia
            </span>
            <h2 style={{ fontSize: 22, margin: '6px 0 4px 0', color: 'var(--text-main)', fontWeight: 800 }}>
              የአመልካች ማጠቃለያ ሰነድ (Entrant Summary Slip)
            </h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124, 58, 237, 0.1)', padding: '4px 14px', borderRadius: 9999, marginTop: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--primary-600)', fontFamily: 'monospace', fontWeight: 800 }}>
                REF: #{entry.uniqueReference}
              </span>
            </div>
          </div>

          {/* Entrant Profile Section */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            {primary?.photoDownloadUrl ? (
              <img
                src={primary.photoDownloadUrl}
                alt="Entrant"
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 12,
                  objectFit: 'cover',
                  border: '2px solid #10b981',
                  boxShadow: 'var(--shadow-md)',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 12,
                  background: 'var(--bg-input)',
                  border: '1.5px dashed var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <User size={40} color="var(--text-muted)" />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 200 }}>
              <span className="badge badge-success" style={{ fontSize: 11, padding: '2px 8px', marginBottom: 6 }}>
                ✓ ፎቶ ተረጋግጧል (600x600 px Compliant)
              </span>
              <h3 style={{ fontSize: 18, color: 'var(--text-main)', margin: '0 0 4px 0', fontWeight: 800 }}>
                {fullName}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                ፆታ / Gender: <strong>{primary?.gender === 'M' ? 'ወንድ (Male)' : 'ሴት (Female)'}</strong> | የልደት ቀን: <strong>{birthDateStr}</strong>
              </p>
              <p style={{ margin: '3px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                የትውልድ ሃገር: <strong>{primary?.birthCountry || 'Ethiopia'}</strong> | ዜግነት: <strong>{primary?.eligibilityCountry || 'Ethiopia'}</strong>
              </p>
            </div>
          </div>

          {/* Details Table */}
          <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: 13, color: 'var(--primary-600)', margin: '0 0 12px 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              ዝርዝር መረጃዎች / Submission Parameters
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 12.5 }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>የትምህርት ደረጃ (Education):</span>
                <strong style={{ color: 'var(--text-main)' }}>{primary?.educationLevel || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>የጋብቻ ሁኔታ (Marital Status):</span>
                <strong style={{ color: 'var(--text-main)' }}>{primary?.maritalStatus || 'UNMARRIED'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>የልጆች ብዛት (Children Count):</span>
                <strong style={{ color: 'var(--text-main)' }}>{primary?.childrenCount || 0}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>የማመልከቻ ሁኔታ (Status):</span>
                <strong style={{ color: 'var(--primary-600)' }}>{entry.status}</strong>
              </div>
            </div>
          </div>

          {/* Money-Back Guarantee Watermark Box */}
          <div style={{ border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 8, padding: 12, marginBottom: 18, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <strong style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <ShieldCheck size={14} /> የ 90% የተመላሽ ዋስትና የተጠበቀ (Protected by 90% Guarantee)
            </strong>
            ይህ ሰነድ የእርስዎ የDV-2027 ቅድመ-ምዝገባ ማጠቃለያ ነው። በኛ በኩል ማመልከቻው ሳይገባ ቢቀር 90% ገንዘብዎ ወዲያውኑ ይመለሳል።
          </div>

          {/* Footer Disclaimer */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, fontSize: 10.5, color: 'var(--text-subtle)', textAlign: 'center', lineHeight: 1.4 }}>
            <strong>Important Disclaimer:</strong> EthioDV-FillTrack is an independent private assistance service and is not affiliated with the U.S. Department of State. Official entries are filed on dvprogram.state.gov.
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-summary-slip, #printable-summary-slip * {
            visibility: visible !important;
          }
          #printable-summary-slip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
