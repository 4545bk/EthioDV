import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/index.jsx';
import { apiRequest, uploadFileDirect } from '../services/api.js';
import CopyButton from '../components/CopyButton.jsx';
import Alert from '../components/Alert.jsx';
import { CreditCard, Upload, CheckCircle2, AlertCircle, ArrowLeft, Sparkles, RefreshCw, AlertTriangle, Phone, PhoneCall } from 'lucide-react';

export default function PaymentPage({ onNavigate, entryId }) {
  const { t } = useLanguage();

  const [settings, setSettings] = useState(null);
  const [entry, setEntry] = useState(null);
  const [provider, setProvider] = useState('TELEBIRR');
  const [transactionCode, setTransactionCode] = useState('');
  const [senderName, setSenderName] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // AI Vision OCR States
  const [ocrData, setOcrData] = useState(null);
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrMessage, setOcrMessage] = useState('');

  useEffect(() => {
    apiRequest('/settings').then((res) => {
      if (res.success) setSettings(res.data);
    });

    if (entryId) {
      apiRequest(`/entries/${entryId}`).then((res) => {
        if (res.success) {
          setEntry(res.data.entry);
        }
      });
    }
  }, [entryId]);

  const runOcrScan = async (dataUrl, mimeType) => {
    try {
      setIsScanningOcr(true);
      setOcrMessage('ደረሰኙ በ Gemini AI በመተንተን ላይ ነው...');

      const base64Content = dataUrl.includes('base64,') ? dataUrl.split('base64,')[1] : dataUrl;
      const res = await apiRequest('/payments/scan-receipt', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: base64Content,
          mimeType: mimeType || 'image/jpeg',
        }),
      });

      if (res.success && res.data) {
        setOcrData(res.data);
        if (res.data.isReceipt) {
          if (res.data.transactionCode) {
            setTransactionCode(res.data.transactionCode);
          }
          if (res.data.bankName) {
            const bName = res.data.bankName.toUpperCase();
            if (bName.includes('TELEBIRR')) {
              setProvider('TELEBIRR');
            } else if (bName.includes('CBE') || bName.includes('COMMERCIAL')) {
              setProvider('CBE_TRANSFER');
            }
          }
          setOcrMessage('ደረሰኙ በ AI በተሳካ ሁኔታ ተመርምሮ ተሞልቷል!');
        } else {
          setOcrMessage(res.data.reasonIfInvalid || 'ምስሉ የቴሌብር ወይም የንግድ ባንክ ደረሰኝ አይመስልም። እባክዎ በትክክል ያረጋግጡ።');
        }
      }
    } catch (err) {
      console.warn('OCR error:', err);
      setOcrMessage('AI OCR scanning unavailable. Please confirm transaction code manually.');
    } finally {
      setIsScanningOcr(false);
    }
  };

  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);
    setOcrData(null);
    setOcrMessage('');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setReceiptPreview(result);
      runOcrScan(result, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!receiptFile) {
      setErrorMessage('እባክዎ የክፍያ ደረሰኙን ፎቶ ያስገቡ / Receipt screenshot is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      // 1. Direct upload receipt screenshot
      const receiptFileKey = await uploadFileDirect('receipts', receiptFile);

      // 2. Submit payment record with OCR verification data
      const res = await apiRequest('/payments/submit', {
        method: 'POST',
        body: JSON.stringify({
          entryId,
          provider,
          claimedTransactionCode: transactionCode.trim(),
          senderName: senderName.trim(),
          receiptFileKey,
          ocrData,
        }),
      });

      if (res.success) {
        setSuccessMessage('ክፍያዎ በተሳካ ሁኔታ ገብቷል! ወደ ቅደም ተከተል ገጽ በመዛወር ላይ...');
        setTimeout(() => {
          onNavigate('tracker', { entryId });
        }, 1500);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Payment submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 680 }}>
      <button onClick={() => onNavigate('dashboard')} className="btn btn-secondary" style={{ marginBottom: 20, padding: '6px 12px', fontSize: 13 }}>
        <ArrowLeft size={14} /> ማመልከቻዎቼ / Back
      </button>

      <div className="card" style={{ padding: '36px 30px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span className="badge badge-primary" style={{ marginBottom: 12, padding: '5px 14px', fontSize: 12 }}>
            ደረጃ 2: ክፍያ / Step 2: Payment
          </span>
          <h2 style={{ fontSize: 26, marginBottom: 8 }}>{t('paymentTitle')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t('paymentDesc')}</p>
        </div>

        {/* Customer Service Help Call Banner */}
        <div
          className="card animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(56, 189, 248, 0.08))',
            border: '1.5px solid rgba(124, 58, 237, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary-600), #9333ea)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
              }}
            >
              <PhoneCall size={20} />
            </div>
            <div>
              <strong style={{ fontSize: 14, color: 'var(--text-main)', display: 'block' }}>
                እገዛ ይፈልጋሉ? ወደ ደንበኞች አገልግሎት ይደውሉ (Need Help?)
              </strong>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                ማንኛውም የክፍያ ወይም የቅጽ አሞላል ጥያቄ ካለዎት በቀጥታ ይደውሉልን
              </span>
            </div>
          </div>
          <a
            href="tel:0949478933"
            className="btn btn-primary"
            style={{ padding: '8px 18px', fontSize: 14, borderRadius: 9999, gap: 8, textDecoration: 'none' }}
          >
            <Phone size={15} /> 0949478933
          </a>
        </div>

        {/* Account Details Box (Aspio Clean Sub-Card) */}
        <div className="sub-card" style={{ marginBottom: 24, border: '1.5px solid var(--border-subtle)', padding: '20px' }}>
          <h4 style={{ fontSize: 15, color: 'var(--primary-600)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <CreditCard size={18} /> ኦፊሴላዊ የክፍያ አካውንቶች / Official Payment Accounts
          </h4>

          {/* Telebirr Details */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-primary" style={{ fontSize: 11, padding: '3px 8px' }}>ቴሌብር (Telebirr)</span>
                <strong style={{ color: 'var(--text-main)', fontSize: 16, fontFamily: 'monospace' }}>0949478933</strong>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5 }}>
                የተቀባይ ስም / Recipient Name: <strong style={{ color: 'var(--text-main)' }}>ዮሐንስ ሞላ ገሰሰ (Yohannes Mola Gesese)</strong>
              </div>
            </div>
            <CopyButton text="0949478933" label="Telebirr Number" />
          </div>

          {/* CBE Details */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-accent" style={{ fontSize: 11, padding: '3px 8px' }}>የኢትዮጵያ ንግድ ባንክ (CBE)</span>
                <strong style={{ color: 'var(--text-main)', fontSize: 16, fontFamily: 'monospace' }}>1000301164328</strong>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5 }}>
                የተቀባይ ስም / Recipient Name: <strong style={{ color: 'var(--text-main)' }}>ዮሐንስ ሞላ ገሰሰ (Yohannes Mola Gesese)</strong>
              </div>
            </div>
            <CopyButton text="1000301164328" label="CBE Account" />
          </div>
        </div>

        {/* 90% Money-Back Guarantee Policy Box */}
        <div className="info-box" style={{ marginBottom: 24, borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.08)' }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontSize: 14, marginBottom: 6 }}>
            🛡️ የ 90% ተመላሽ ዋስትና / 90% Money-Back Guarantee
          </strong>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-main)' }}>
            ከእኛ በኩል በሚፈጠር ማንኛውም ቴክኒካል ወይም የአሰራር መስተጓጎል ማመልከቻዎን በጊዜ ገደቡ ማስገባት ካልቻልን፣ የከፈሉት ገንዘብ <strong>90% (900 ብር)</strong> ሙሉ በሙሉ ወዲያውኑ ወደ አካውንትዎ ይመለሳል (10% የባንክና ቴሌኮም ሂደት ወጪ ብቻ ተቀንሶ)።
          </p>
          <p style={{ margin: '6px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            (If anything unforeseen or technical happens from our side preventing filing, 90% of your payment is guaranteed to be returned to you immediately.)
          </p>
        </div>

        {errorMessage && (
          <Alert
            type="danger"
            message={errorMessage}
            onClose={() => setErrorMessage('')}
          />
        )}

        {successMessage && (
          <Alert
            type="success"
            message={successMessage}
          />
        )}

        {/* Payment Submission Form */}
        <form onSubmit={handleSubmitPayment}>
          <div className="form-group">
            <label className="form-label">የክፍያ ዘዴ / Payment Provider</label>
            <div style={{ display: 'flex', gap: 18, marginTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
                <input
                  type="radio"
                  name="provider"
                  value="TELEBIRR"
                  checked={provider === 'TELEBIRR'}
                  onChange={(e) => setProvider(e.target.value)}
                  style={{ accentColor: 'var(--primary-600)' }}
                />
                ቴሌብር (Telebirr)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
                <input
                  type="radio"
                  name="provider"
                  value="CBE_TRANSFER"
                  checked={provider === 'CBE_TRANSFER'}
                  onChange={(e) => setProvider(e.target.value)}
                  style={{ accentColor: 'var(--primary-600)' }}
                />
                ንግድ ባንክ (CBE Transfer)
              </label>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">{t('transactionIdLabel')}</label>
              <input
                type="text"
                placeholder="e.g. DIR96IMI19 or FT24..."
                value={transactionCode}
                onChange={(e) => setTransactionCode(e.target.value.toUpperCase())}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">የከፋይ ስም (Sender Name)</label>
              <input
                type="text"
                placeholder="e.g. Biruh Gizaw"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Aspio Dashed Receipt Upload Box */}
          <div className="form-group">
            <label className="form-label">{t('uploadReceiptLabel')} *</label>
            <div
              className="upload-dropzone"
              onClick={() => document.getElementById('receipt-upload-input')?.click()}
            >
              <input
                id="receipt-upload-input"
                type="file"
                accept="image/*"
                required={!receiptFile}
                onChange={handleReceiptChange}
                style={{ display: 'none' }}
              />

              {receiptPreview ? (
                <div>
                  <img src={receiptPreview} alt="Receipt preview" style={{ maxHeight: 200, borderRadius: 12, margin: '0 auto 12px auto', display: 'block', boxShadow: 'var(--shadow-md)' }} />
                  <p style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>✓ ደረሰኙ ተመርጧል (ለመቀየር ይጫኑ / Click to change)</p>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'rgba(124, 58, 237, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px auto',
                    }}
                  >
                    <Upload size={24} color="var(--primary-600)" />
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-main)', fontWeight: 600, marginBottom: 4 }}>
                    የደረሰኝ ስክሪንሾት ይጫኑ / Upload your payment proof
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    PNG, JPG, WEBP or PDF · Max 10MB
                  </p>
                </div>
              )}
            </div>

            {/* AI Vision Scan Status & Badges */}
            {isScanningOcr && (
              <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#c7d2fe' }}>
                <RefreshCw size={16} className="animate-spin" />
                <div>
                  <strong>AI Vision እያጣራ ነው...</strong>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>የደረሰኙን የግብይት ቁጥር፣ ባንክ እና መጠን በራስ-ሰር በመለየት ላይ...</div>
                </div>
              </div>
            )}

            {ocrData?.isReceipt && !isScanningOcr && (
              <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34d399', fontWeight: 700, fontSize: 13 }}>
                    <Sparkles size={16} /> 🤖 AI Vision ተለይቷል / Auto-Detected
                  </div>
                  {receiptPreview && (
                    <button
                      type="button"
                      onClick={() => runOcrScan(receiptPreview, receiptFile?.type)}
                      disabled={isScanningOcr}
                      className="btn btn-secondary"
                      style={{ padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <RefreshCw size={11} /> ድጋሚ መርምር
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#e2e8f0' }}>
                  <span>ባንክ: <strong style={{ color: '#ffffff' }}>{ocrData.bankName || provider}</strong></span>
                  <span>የግብይት ኮድ: <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{ocrData.transactionCode || 'N/A'}</strong></span>
                  {ocrData.amountETB && <span>መጠን: <strong style={{ color: '#34d399' }}>{ocrData.amountETB} ETB</strong></span>}
                  {ocrData.confidenceScore && <span>እርግጠኝነት: <strong>{Math.round(ocrData.confidenceScore * 100)}%</strong></span>}
                </div>
              </div>
            )}

            {ocrData && !ocrData.isReceipt && !isScanningOcr && (
              <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 8, fontSize: 12, color: '#fca5a5', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>የደረሰኝ ማረጋገጫ ማስጠንቀቂያ</strong>
                  <div>{ocrMessage || 'ምስሉ የቴሌብር ወይም የንግድ ባንክ ደረሰኝ አይመስልም። እባክዎ ትክክለኛውን ደረሰኝ ማያያዝዎን ያረጋግጡ።'}</div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '13px 0', fontSize: 15 }}
          >
            {isSubmitting ? 'ደረሰኙ እየተላከ ነው...' : t('submitPaymentBtn')}
          </button>
        </form>
      </div>
    </div>
  );
}
