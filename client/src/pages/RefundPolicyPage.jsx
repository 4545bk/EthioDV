import React, { useState } from 'react';
import { useLanguage } from '../i18n/index.jsx';
import { apiRequest } from '../services/api.js';
import { ShieldCheck, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function RefundPolicyPage({ onNavigate, entryId }) {
  const { t } = useLanguage();
  const [selectedEntryId, setSelectedEntryId] = useState(entryId || '');
  const [reason, setReason] = useState('');
  const [bankProvider, setBankProvider] = useState('TELEBIRR');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmitRefund = async (e) => {
    e.preventDefault();
    if (!selectedEntryId) {
      setErrorMsg('Please specify an Entry ID.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const res = await apiRequest('/refunds/request', {
        method: 'POST',
        body: JSON.stringify({
          entryId: selectedEntryId,
          reason,
          payoutAccountDetails: {
            bankOrProvider: bankProvider,
            accountOrPhone: accountNumber.trim(),
            accountHolderName: accountName.trim(),
          },
        }),
      });

      if (res.success) {
        setSuccessMsg(`✓ የገንዘብ ተመላሽ ጥያቄዎ ገብቷል! (${res.data.requestedAmountETB} ETB - 50%) በአድሚን በ24 ሰዓት ውስጥ ይረጋገጣል።`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Refund request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <button onClick={() => onNavigate('dashboard')} className="btn btn-secondary" style={{ marginBottom: 20, padding: '6px 12px', fontSize: 13 }}>
        <ArrowLeft size={14} /> ተመለስ / Back
      </button>

      <div className="card" style={{ padding: 32, marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, marginBottom: 12 }}>የገንዘብ ተመላሽ ደንብ / Refund Policy</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          [BRAND] ግልጽና ፍትሃዊ የሆነ የገንዘብ ተመላሽ ፖሊሲ ይከተላል። ተጠቃሚዎች የከፈሉትን ገንዘብ በተመለከተ ያሉት ደንቦች ከዚህ በታች ተዘርዝረዋል:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderLeft: '4px solid #10b981', padding: 16, borderRadius: 6 }}>
            <strong style={{ color: '#10b981', fontSize: 15 }}>1. 100% ሙሉ ተመላሽ (Full Refund)</strong>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
              የኛ የባለሙያ ቡድን የቴክኒክ ችግር አጋጥሞት ወይም የስቴት ዲፓርትመንት ፖርታል ተዘግቶ ማመልከቻዎን በጊዜ ገደቡ ማስገባት ካልቻለ የከፈሉት 1,000 ብር ሙሉ በሙሉ ተመላሽ ይደረጋል።
            </p>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid #f59e0b', padding: 16, borderRadius: 6 }}>
            <strong style={{ color: '#f59e0b', fontSize: 15 }}>2. 50% ከፊል ተመላሽ (Partial Refund)</strong>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
              ክፍያዎ ከፀደቀ በኋላ ነገር ግን ማመልከቻዎ ወደ አሜሪካ ድረ-ገጽ ሳይገባ በግል ፍላጎትዎ ማመልከቻዎን ማቋረጥ ከፈለጉ 500 ብር (50%) ተመላሽ ይደረግልዎታል።
            </p>
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', padding: 16, borderRadius: 6 }}>
            <strong style={{ color: '#ef4444', fontSize: 15 }}>3. ምንም ተመላሽ አይደረግም (No Refund)</strong>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
              ማመልከቻዎ በይፋዊው የአሜሪካ ድረ-ገጽ (dvprogram.state.gov) ላይ ተሞልቶ ባለ 16 ዲጂት የማረጋገጫ ቁጥር (Confirmation Number) ከተሰጠ በኋላ አገልግሎቱ ሙሉ በሙሉ ስለተጠናቀቀ ምንም አይነት ገንዘብ ተመላሽ አይደረግም።
            </p>
          </div>
        </div>

        {/* Request Refund Form */}
        <h3 style={{ fontSize: 18, marginBottom: 14 }}>የተመላሽ ጥያቄ ማቅረቢያ ቅጽ</h3>

        {successMsg && (
          <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmitRefund}>
          <div className="form-group">
            <label className="form-label">የማመልከቻ መለያ ቁጥር (Entry ID / Ref) *</label>
            <input
              type="text"
              required
              placeholder="e.g. 64f... or DV27-XXXXXX"
              value={selectedEntryId}
              onChange={(e) => setSelectedEntryId(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">የማቋረጫ ምክንያት (Reason) *</label>
            <textarea
              required
              rows={2}
              placeholder="ለምን ማቋረጥ እንደፈለጉ በአጭሩ ይግለጹ..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="form-textarea"
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">ገንዘቡ የሚላክበት አካውንት / ባንክ</label>
              <select
                value={bankProvider}
                onChange={(e) => setBankProvider(e.target.value)}
                className="form-select"
              >
                <option value="TELEBIRR">ቴሌብር (Telebirr)</option>
                <option value="CBE">የኢትዮጵያ ንግድ ባንክ (CBE)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">የስልክ / ሂሳብ ቁጥር (Phone / Account) *</label>
              <input
                type="text"
                required
                placeholder="09... or 1000..."
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">የሂሳብ ባለቤት ሙሉ ስም (Account Holder Name) *</label>
            <input
              type="text"
              required
              placeholder="ሙሉ ስም"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 0', fontSize: 14 }}
          >
            {isSubmitting ? 'በማስገባት ላይ...' : 'የተመላሽ ጥያቄ አስገባ / Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
