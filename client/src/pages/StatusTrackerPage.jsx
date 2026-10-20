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
      <div className="card" style={{ padding: '28px 24px', marginBottom: 24, textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8, background: 'rgba(124, 58, 237, 0.08)', padding: '6px 14px', borderRadius: 9999 }}>
          <span style={{ fontSize: 14, color: 'var(--primary-600)', fontFamily: 'monospace', fontWeight: 700 }}>
            #{data.uniqueReference}
          </span>
          <CopyButton text={data.uniqueReference} label="Reference" />
        </div>
        <h2 style={{ fontSize: 24, margin: '6px 0 12px 0' }}>{t('queueTrackerTitle')}</h2>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <QueueBadge status={data.status} />
        </div>

        {/* Dynamic Queue Rank Display */}
        {(isQueued || isFiling) && (
          <div style={{ background: 'rgba(124, 58, 237, 0.1)', borderRadius: 'var(--radius-md)', padding: 24, margin: '24px 0 12px 0', border: '1px solid rgba(124, 58, 237, 0.25)' }}>
            <span style={{ fontSize: 13, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
              {t('currentPosition')}
            </span>
            <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--primary-600)', lineHeight: 1.2, margin: '6px 0' }}>
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
            background: 'var(--bg-card)',
            border: '2px solid var(--success)',
            padding: 36,
            textAlign: 'center',
            marginBottom: 24,
            boxShadow: '0 0 30px rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
            <ShieldCheck size={28} color="#10b981" />
          </div>

          <span className="badge badge-success" style={{ marginBottom: 12 }}>ይፋዊ የዲቪ ማረጋገጫ / Official Confirmation</span>
          <h3 style={{ fontSize: 20, color: 'var(--text-main)', marginBottom: 6, fontWeight: 700 }}>{t('officialConfirmationTitle')}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            ይህ ባለ 16 ዲጂት ቁጥር የእርስዎ የግል ንብረት ነው። ማመልከቻዎ በይፋዊው የአሜሪካ ድረ-ገጽ ላይ ገብቷል።
          </p>

          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 18, marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: 4, color: 'var(--primary-600)', fontFamily: 'monospace' }}>
              {data.confirmationNumber}
            </span>
            <CopyButton text={data.confirmationNumber} label="Confirmation Number" />
          </div>

          <div style={{ background: 'rgba(56, 189, 248, 0.1)', borderLeft: '4px solid #38bdf8', borderRadius: 4, padding: 12, textAlign: 'left', fontSize: 13, lineHeight: 1.5, color: 'var(--text-main)', marginBottom: 24 }}>
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

      {/* Progress Timeline (Accurate to actual stage) */}
      <div className="card" style={{ padding: 24, marginBottom: 24, borderRadius: 'var(--radius-lg)' }}>
        <h4 style={{ fontSize: 16, marginBottom: 20, color: 'var(--text-main)', fontWeight: 700 }}>የሂደቱ ደረጃዎች / Status Timeline</h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* STEP 1: Form Filled & Submitted */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: data.status !== 'DRAFT' ? 'var(--success)' : 'rgba(245, 158, 11, 0.15)',
                color: data.status !== 'DRAFT' ? '#fff' : 'var(--warning)',
                border: data.status !== 'DRAFT' ? 'none' : '1.5px solid var(--warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {data.status !== 'DRAFT' ? '✓' : '1'}
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>
                {data.status !== 'DRAFT' ? 'ቅጹ ተሞልቶ ገብቷል (Form Submitted)' : 'ቅጹ በረቂቅ ደረጃ ላይ ነው (Draft in Progress)'}
              </strong>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {data.status !== 'DRAFT'
                  ? 'የDS-5501 ቅጽና ፎቶግራፍ በተሳካ ሁኔታ ተሞልቶ ቀርቧል'
                  : 'የDV-2027 ቅጽዎን መሙላት አልጨረሱም። ቅጹን መሙላት ይቀጥሉ።'}
              </div>
              {data.status === 'DRAFT' && (
                <button
                  onClick={() => onNavigate('wizard', { entryId: data.entryId || entryId })}
                  className="btn btn-primary"
                  style={{ marginTop: 8, padding: '6px 14px', fontSize: 12 }}
                >
                  ቅጹን መሙላት ቀጥል / Continue Filling Form →
                </button>
              )}
            </div>
          </div>

          {/* STEP 2: Payment */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: (data.paymentApprovedAt || isQueued || isFiling || isConfirmed)
                  ? 'var(--success)'
                  : data.status === 'PAYMENT_SUBMITTED'
                  ? 'rgba(124, 58, 237, 0.2)'
                  : data.status === 'PAYMENT_PENDING'
                  ? 'rgba(245, 158, 11, 0.2)'
                  : 'var(--bg-input)',
                color: (data.paymentApprovedAt || isQueued || isFiling || isConfirmed)
                  ? '#fff'
                  : (data.status === 'PAYMENT_SUBMITTED' || data.status === 'PAYMENT_PENDING')
                  ? 'var(--primary-600)'
                  : 'var(--text-subtle)',
                border: '1.5px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {(data.paymentApprovedAt || isQueued || isFiling || isConfirmed) ? '✓' : '2'}
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>
                {(data.paymentApprovedAt || isQueued || isFiling || isConfirmed)
                  ? 'ክፍያ ተረጋግጧል (Payment Verified)'
                  : data.status === 'PAYMENT_SUBMITTED'
                  ? 'ክፍያ በማጣራት ላይ (Payment Under Review)'
                  : data.status === 'PAYMENT_PENDING'
                  ? 'ክፍያ ይጠበቃል (Payment Pending)'
                  : 'ክፍያ (Payment)'}
              </strong>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {(data.paymentApprovedAt || isQueued || isFiling || isConfirmed)
                  ? 'የ1,000 ብር ክፍያ ደረሰኝ በአድሚን ተቀባይነት አግኝቷል'
                  : data.status === 'PAYMENT_SUBMITTED'
                  ? 'ያስገቡት የቴሌብር ወይም ንግድ ባንክ ደረሰኝ በኦፕሬተር በመረጋገጥ ላይ ነው'
                  : data.status === 'PAYMENT_PENDING'
                  ? 'የ1,000 ብር የአገልግሎት ክፍያ በቴሌብር ወይም በንግድ ባንክ (CBE) ይክፈሉ'
                  : 'ቅጹ ሲጠናቀቅ የሚፈጸም የ1,000 ብር ክፍያ'}
              </div>
              {data.status === 'PAYMENT_PENDING' && (
                <button
                  onClick={() => onNavigate('payment', { entryId: data.entryId || entryId })}
                  className="btn btn-accent"
                  style={{ marginTop: 8, padding: '6px 14px', fontSize: 12 }}
                >
                  ክፍያ ፈጽም / Pay 1,000 ETB →
                </button>
              )}
            </div>
          </div>

          {/* STEP 3: Queue */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: (isQueued || isFiling || isConfirmed) ? 'var(--success)' : 'var(--bg-input)',
                color: (isQueued || isFiling || isConfirmed) ? '#fff' : 'var(--text-subtle)',
                border: '1.5px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {(isQueued || isFiling || isConfirmed) ? '✓' : '3'}
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>
                {(isQueued || isFiling || isConfirmed) ? 'በቅደም ተከተል ተመዝግቧል (Queued)' : 'የቅደም ተከተል ሰሌዳ (Queue)'}
              </strong>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {(isQueued || isFiling || isConfirmed)
                  ? `በከፈሉበት ሰዓት ቅደም ተከተል መሰረት ለመሞላት ተሰልፏል (ተራ #${data.position || 1})`
                  : 'ክፍያው ሲረጋገጥ ቅደም ተከተል ይሰጥዎታል'}
              </div>
            </div>
          </div>

          {/* STEP 4: Official US Submission */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: isConfirmed ? 'var(--success)' : isFiling ? 'var(--primary-600)' : 'var(--bg-input)',
                color: (isConfirmed || isFiling) ? '#fff' : 'var(--text-subtle)',
                border: '1.5px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {isConfirmed ? '✓' : '4'}
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 14, color: 'var(--text-main)' }}>
                {isConfirmed
                  ? 'ይፋዊ ማመልከቻ ገብቷል (Confirmed)'
                  : isFiling
                  ? 'በኦፕሬተር በመሞላት ላይ... (Filing in Progress)'
                  : 'ኦፊሴላዊ የዲቪ ማረጋገጫ ቁጥር (Confirmation)'}
              </strong>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {isConfirmed
                  ? 'በአሜሪካ ስቴት ዲፓርትመንት ፖርታል ላይ ተመዝግቦ ባለ 16 ዲጂት ቁጥሩ ተሰጥቷል'
                  : isFiling
                  ? 'ባለሙያችን በአሜሪካ ድረ-ገጽ ላይ ማመልከቻዎን እየሞላ ነው'
                  : 'ይፋዊው ባለ 16 ዲጂት የማረጋገጫ ቁጥር ይሰጥዎታል'}
              </div>
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
