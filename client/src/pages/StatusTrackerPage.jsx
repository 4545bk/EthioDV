import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useLanguage } from '../i18n/index.jsx';
import { apiRequest } from '../services/api.js';
import QueueBadge from '../components/QueueBadge.jsx';
import CopyButton from '../components/CopyButton.jsx';
import { CheckCircle2, Clock, ShieldCheck, ArrowLeft, Download, ExternalLink, AlertCircle } from 'lucide-react';

export default function StatusTrackerPage({ onNavigate, entryId, searchRef }) {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        let idToFetch = entryId;

        // If accessed by reference code from landing search
        if (!idToFetch && searchRef) {
          const searchRes = await apiRequest(`/entries?search=${searchRef}`);
          if (searchRes.success && searchRes.data.length > 0) {
            idToFetch = searchRes.data[0].id;
          } else {
            setError(`የማመልከቻ መለያ #${searchRef} አልተገኘም።`);
            setLoading(false);
            return;
          }
        }

        if (!idToFetch) {
          setError('No entry specified');
          setLoading(false);
          return;
        }

        const res = await apiRequest(`/queue/status/${idToFetch}`);
        if (res.success) {
          setData(res.data);
          if (res.data.status === 'CONFIRMED') {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // Poll updates every 20 seconds while in queue
    const timer = setInterval(fetchStatus, 20000);
    return () => clearInterval(timer);
  }, [entryId, searchRef]);

  if (loading) {
    return <div className="container" style={{ textAlign: 'center', padding: '60px 0' }}>የማመልከቻው ሁኔታ በመጫን ላይ ነው...</div>;
  }

  if (error || !data) {
    return (
      <div className="container" style={{ maxWidth: 540, textAlign: 'center', padding: '40px 20px' }}>
        <div className="card" style={{ padding: 32 }}>
          <AlertCircle size={36} color="var(--danger)" style={{ margin: '0 auto 12px auto' }} />
          <h3>ማመልከቻው አልተገኘም</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>{error}</p>
          <button onClick={() => onNavigate('dashboard')} className="btn btn-primary">
            ወደ ማመልከቻዎቼ ተመለስ
          </button>
        </div>
      </div>
    );
  }

  const isConfirmed = data.status === 'CONFIRMED' || data.status === 'FILED';
  const isQueued = data.status === 'QUEUED';
  const isFiling = data.status === 'FILING_IN_PROGRESS';

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <button onClick={() => onNavigate('dashboard')} className="btn btn-secondary" style={{ marginBottom: 20, padding: '6px 12px', fontSize: 13 }}>
        <ArrowLeft size={14} /> ማመልከቻዎቼ / Back
      </button>

      {/* Main Status Header Card */}
      <div className="card" style={{ padding: 28, marginBottom: 24, textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--primary-300)', fontFamily: 'monospace', fontWeight: 600 }}>
          #{data.uniqueReference}
        </span>
        <h2 style={{ fontSize: 24, margin: '8px 0 12px 0' }}>{t('queueTrackerTitle')}</h2>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <QueueBadge status={data.status} />
        </div>

        {/* Dynamic Queue Rank Display */}
        {(isQueued || isFiling) && (
          <div style={{ background: 'rgba(99, 102, 241, 0.15)', borderRadius: 12, padding: 24, margin: '24px 0 12px 0', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <span style={{ fontSize: 13, color: 'var(--primary-300)', textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('currentPosition')}
            </span>
            <div style={{ fontSize: 48, fontWeight: 800, color: '#38bdf8', lineHeight: 1.2, margin: '6px 0' }}>
              #{data.position || 1}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {t('outOfQueued')} <strong>{data.totalInQueue}</strong> | {t('estimatedWait')}: ~{data.estimatedHoursRemaining || 1} ሰዓታት
            </p>
          </div>
        )}
      </div>

      {/* Official Confirmation Certificate Card */}
      {isConfirmed && data.confirmationNumber && (
        <div
          id="confirmation-certificate"
          className="card animate-pulse-glow"
          style={{
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)',
            border: '2px solid var(--success)',
            padding: 36,
            textAlign: 'center',
            marginBottom: 24,
            boxShadow: '0 0 30px rgba(16, 185, 129, 0.25)',
          }}
        >
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
            <ShieldCheck size={28} color="#10b981" />
          </div>

          <span className="badge badge-success" style={{ marginBottom: 12 }}>ይፋዊ የዲቪ ማረጋገጫ / Official Confirmation</span>
          <h3 style={{ fontSize: 20, color: '#ffffff', marginBottom: 6 }}>{t('officialConfirmationTitle')}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            ይህ ባለ 16 ዲጂት ቁጥር የእርስዎ የግል ንብረት ነው። ማመልከቻዎ በይፋዊው የአሜሪካ ድረ-ገጽ ላይ ገብቷል።
          </p>

          <div style={{ background: '#090d16', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 18, marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: 4, color: '#38bdf8', fontFamily: 'monospace' }}>
              {data.confirmationNumber}
            </span>
            <CopyButton text={data.confirmationNumber} label="Confirmation Number" />
          </div>

          <div style={{ background: 'rgba(56, 189, 248, 0.1)', borderLeft: '4px solid #38bdf8', borderRadius: 4, padding: 12, textAlign: 'left', fontSize: 13, lineHeight: 1.5, color: '#bae6fd', marginBottom: 24 }}>
            <strong>ውጤት መቼ ይታያል?</strong><br />
            ውጤቱ በሜይ ወር በ <strong>dvprogram.state.gov</strong> ላይ ይፋ ይሆናል። ውጤትዎን ለማየት ይህን የማረጋገጫ ቁጥር፣ የአያት ስምዎን እና የትውልድ ዓመትዎን ማስገባት አለብዎት።
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => window.print()} className="btn btn-primary" style={{ fontSize: 13 }}>
              <Download size={14} /> {t('downloadCertificate')}
            </button>
            <a
              href="https://dvprogram.state.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ fontSize: 13 }}
            >
              ይፋዊ ድረ-ገጽ <ExternalLink size={13} />
            </a>
          </div>
        </div>
      )}

      {/* Progress Timeline */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h4 style={{ fontSize: 15, marginBottom: 18, color: '#ffffff' }}>የሂደቱ ደረጃዎች / Status Timeline</h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--success)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>✓</div>
            <div>
              <strong style={{ fontSize: 14, color: '#ffffff' }}>ቅጹ ተሞልቶ ገብቷል</strong>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>የDS-5501 ቅጽና ፎቶግራፍ በተሳካ ሁኔታ ተያይዟል</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: data.paymentApprovedAt ? 'var(--success)' : 'rgba(148,163,184,0.3)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
              {data.paymentApprovedAt ? '✓' : '2'}
            </div>
            <div>
              <strong style={{ fontSize: 14, color: data.paymentApprovedAt ? '#ffffff' : 'var(--text-muted)' }}>ክፍያ ተረጋግጧል</strong>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>የ1,000 ብር ክፍያ ደረሰኝ በአድሚን ተቀባይነት አግኝቷል</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: (isQueued || isFiling || isConfirmed) ? 'var(--success)' : 'rgba(148,163,184,0.3)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
              {(isQueued || isFiling || isConfirmed) ? '✓' : '3'}
            </div>
            <div>
              <strong style={{ fontSize: 14, color: (isQueued || isFiling || isConfirmed) ? '#ffffff' : 'var(--text-muted)' }}>በቅደም ተከተል ተመዝግቧል (Queued)</strong>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>በከፈሉበት ሰዓት ቅደም ተከተል መሰረት ለመሞላት ተሰልፏል</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: isConfirmed ? 'var(--success)' : isFiling ? 'var(--info)' : 'rgba(148,163,184,0.3)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
              {isConfirmed ? '✓' : '4'}
            </div>
            <div>
              <strong style={{ fontSize: 14, color: isConfirmed ? '#ffffff' : isFiling ? '#38bdf8' : 'var(--text-muted)' }}>ይፋዊ ማመልከቻ ገብቷል (Confirmed)</strong>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>በአሜሪካ ስቴት ዲፓርትመንት ፖርታል ላይ ተመዝግቦ ቁጥሩ ተሰጥቷል</div>
            </div>
          </div>
        </div>
      </div>

      {/* Refund Trigger (Eligible only if QUEUED before filing) */}
      {isQueued && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => onNavigate('refund', { entryId: data.entryId })}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}
          >
            ማመልከቻውን ማቋረጥና 50% ተመላሽ መጠየቅ ይፈልጋሉ?
          </button>
        </div>
      )}
    </div>
  );
}
