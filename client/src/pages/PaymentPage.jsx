import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/index.jsx';
import { apiRequest, uploadFileDirect } from '../services/api.js';
import CopyButton from '../components/CopyButton.jsx';
import { CreditCard, Upload, CheckCircle2, AlertCircle, ArrowLeft, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';

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

      <div className="card" style={{ padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span className="badge badge-warning" style={{ marginBottom: 8 }}>ደረጃ 2: ክፍያ / Step 2: Payment</span>
          <h2 style={{ fontSize: 24, marginBottom: 6 }}>{t('paymentTitle')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('paymentDesc')}</p>
        </div>

        {/* Unique Reference Code Display */}
        {entry && (
          <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px dashed var(--primary-500)', borderRadius: 10, padding: 16, marginBottom: 24, textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--primary-300)', textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('referenceCode')}
            </span>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 3, color: '#ffffff', margin: '4px 0', fontFamily: 'monospace' }}>
              {entry.uniqueReference}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              ክፍያውን ሲልኩ በማስታወሻ (Remark / Reason) ቦታ ላይ ይህን ኮድ ይፃፉ።
            </p>
          </div>
        )}

        {/* Account Details Box */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: 10, padding: 20, marginBottom: 24, border: '1px solid var(--border-subtle)' }}>
          <h4 style={{ fontSize: 14, color: '#38bdf8', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CreditCard size={16} /> ኦፊሴላዊ የክፍያ አካውንቶች / Official Payment Accounts
          </h4>

          {/* Telebirr Details */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <strong style={{ color: '#ffffff', fontSize: 14 }}>ቴሌብር (Telebirr):</strong>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {settings?.telebirr?.phone || '0911234567'} ({settings?.telebirr?.name || 'DV Ethiopia'})
              </div>
            </div>
            <CopyButton text={settings?.telebirr?.phone || '0911234567'} label="Telebirr Phone" />
          </div>

          {/* CBE Details */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
            <div>
              <strong style={{ color: '#ffffff', fontSize: 14 }}>የኢትዮጵያ ንግድ ባንክ (CBE):</strong>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {settings?.cbe?.accountNumber || '1000123456789'} ({settings?.cbe?.accountName || 'DV Ethiopia'})
              </div>
            </div>
            <CopyButton text={settings?.cbe?.accountNumber || '1000123456789'} label="CBE Account" />
          </div>
        </div>

        {errorMessage && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} /> {errorMessage}
          </div>
        )}

        {successMessage && (
          <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} /> {successMessage}
          </div>
        )}

        {/* Payment Submission Form */}
        <form onSubmit={handleSubmitPayment}>
          <div className="form-group">
            <label className="form-label">የክፍያ ዘዴ / Payment Provider</label>
            <div style={{ display: 'flex', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="provider"
                  value="TELEBIRR"
                  checked={provider === 'TELEBIRR'}
                  onChange={(e) => setProvider(e.target.value)}
                />
                ቴሌብር (Telebirr)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="provider"
                  value="CBE_TRANSFER"
                  checked={provider === 'CBE_TRANSFER'}
                  onChange={(e) => setProvider(e.target.value)}
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

          {/* Receipt Upload Box */}
          <div className="form-group">
            <label className="form-label">{t('uploadReceiptLabel')} *</label>
            <div
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '24px 16px',
                textAlign: 'center',
                background: 'rgba(15, 23, 42, 0.4)',
                cursor: 'pointer',
              }}
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
                  <img src={receiptPreview} alt="Receipt preview" style={{ maxHeight: 180, borderRadius: 6, margin: '0 auto 10px auto', display: 'block' }} />
                  <p style={{ fontSize: 12, color: 'var(--accent-400)' }}>✓ ደረሰኙ ተመርጧል (Click to change)</p>
                </div>
              ) : (
                <div>
                  <Upload size={28} color="var(--primary-400)" style={{ margin: '0 auto 8px auto' }} />
                  <p style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 600 }}>የደረሰኝ ስክሪንሾት ይምረጡ / Upload Screenshot</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>JPG, PNG or PDF</p>
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
