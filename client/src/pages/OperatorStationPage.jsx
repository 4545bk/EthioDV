import React, { useState, useEffect } from 'react';
import { apiRequest, uploadFileDirect } from '../services/api.js';
import CopyButton from '../components/CopyButton.jsx';
import { Shield, Clock, ExternalLink, Download, CheckCircle, AlertTriangle, RefreshCw, Upload } from 'lucide-react';

export default function OperatorStationPage({ onNavigate }) {
  const [activeData, setActiveData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  // Lock countdown timer
  const [timeLeft, setTimeLeft] = useState(1800); // 30 mins in sec

  const claimNextEntry = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      setStatusMessage('');
      setConfirmationNumber('');
      setScreenshotFile(null);

      const res = await apiRequest('/admin/queue/claim-next', { method: 'POST' });
      if (res.success && res.data.entry) {
        setActiveData(res.data);
        if (res.data.entry.lockExpiresAt) {
          const diff = Math.floor((new Date(res.data.entry.lockExpiresAt).getTime() - Date.now()) / 1000);
          setTimeLeft(Math.max(0, diff));
        }
      } else {
        setActiveData(null);
        setStatusMessage(res.data.message || 'Queue is currently empty.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to claim entry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    claimNextEntry();
  }, []);

  // Countdown effect
  useEffect(() => {
    if (!activeData || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeData, timeLeft]);

  // Release lock
  const handleReleaseLock = async () => {
    if (!activeData) return;
    try {
      await apiRequest(`/admin/queue/release/${activeData.entry.id}`, { method: 'POST' });
      setActiveData(null);
      claimNextEntry();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Submit official confirmation number
  const handleCompleteFiling = async (e) => {
    e.preventDefault();
    if (!confirmationNumber.trim()) {
      setErrorMessage('Please enter the 16-character confirmation number.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      let screenshotKey = null;
      if (screenshotFile) {
        screenshotKey = await uploadFileDirect('confirmations', screenshotFile);
      }

      const res = await apiRequest(`/admin/entries/${activeData.entry.id}/file`, {
        method: 'POST',
        body: JSON.stringify({
          confirmationNumber: confirmationNumber.trim().toUpperCase(),
          officialSubmissionScreenshotKey: screenshotKey,
        }),
      });

      if (res.success) {
        setStatusMessage(`✓ Successfully filed ${confirmationNumber}! Applicant notified.`);
        setTimeout(() => {
          claimNextEntry();
        }, 1500);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to record confirmation number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const primary = activeData?.formData?.primary;
  const spouse = activeData?.formData?.spouse;
  const children = activeData?.formData?.children || [];

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="container" style={{ maxWidth: 1200 }}>
      {/* Station Control Bar */}
      <div className="card" style={{ padding: '16px 24px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={24} color="#818cf8" />
          <div>
            <h2 style={{ fontSize: 18, margin: 0 }}>Operator Filing Station (Dual-Pane Assistant)</h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Official filing target: <strong>dvprogram.state.gov</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {activeData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 12px', borderRadius: 8 }}>
              <Clock size={14} color="#ef4444" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>
                Lock: {formatTimer(timeLeft)}
              </span>
            </div>
          )}

          <a
            href="https://dvprogram.state.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ fontSize: 13, padding: '7px 14px', borderColor: 'var(--accent-400)', color: 'var(--accent-400)' }}
          >
            Open dvprogram.state.gov <ExternalLink size={14} />
          </a>

          <button onClick={claimNextEntry} disabled={loading} className="btn btn-primary" style={{ fontSize: 13, padding: '7px 14px' }}>
            <RefreshCw size={14} /> Claim Next Entry
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: 12, borderRadius: 8, fontSize: 14, marginBottom: 18 }}>
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 12, borderRadius: 8, fontSize: 14, marginBottom: 18 }}>
          {errorMessage}
        </div>
      )}

      {!activeData ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px auto' }} />
          <h3>No Entries Currently Locked</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
            Click "Claim Next Entry" above to claim the highest priority approved entry from the queue.
          </p>
          <button onClick={claimNextEntry} className="btn btn-primary">
            Claim Top Entry from Queue
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
          {/* LEFT PANE: Applicant DS-5501 Data with 1-Click Copy Helpers */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
              <div>
                <h3 style={{ fontSize: 16 }}>DS-5501 Form Fields</h3>
                <span style={{ fontSize: 12, color: 'var(--primary-300)', fontFamily: 'monospace' }}>
                  #{activeData.entry.uniqueReference}
                </span>
              </div>
              <button onClick={handleReleaseLock} className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}>
                Release Lock
              </button>
            </div>

            {primary && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* 1. Name */}
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 12, borderRadius: 8 }}>
                  <label className="form-label">1. Name (Last, First, Middle)</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                    <input readOnly value={primary.name.lastName} className="form-input" style={{ flex: 1 }} />
                    <CopyButton text={primary.name.lastName} label="Last Name" />
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                    <input readOnly value={primary.name.firstName} className="form-input" style={{ flex: 1 }} />
                    <CopyButton text={primary.name.firstName} label="First Name" />
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input readOnly value={primary.name.hasNoMiddleName ? 'NO MIDDLE NAME' : primary.name.middleName} className="form-input" style={{ flex: 1 }} />
                    {!primary.name.hasNoMiddleName && <CopyButton text={primary.name.middleName} label="Middle Name" />}
                  </div>
                </div>

                {/* 2. Gender & 3. Birth Date */}
                <div className="grid-2">
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 12, borderRadius: 8 }}>
                    <label className="form-label">2. Gender</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input readOnly value={primary.gender === 'M' ? 'MALE' : 'FEMALE'} className="form-input" />
                      <CopyButton text={primary.gender} label="Gender" />
                    </div>
                  </div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 12, borderRadius: 8 }}>
                    <label className="form-label">3. Birth Date (M / D / Y)</label>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input readOnly value={`${primary.birthDate.month}/${primary.birthDate.day}/${primary.birthDate.year}`} className="form-input" />
                      <CopyButton text={primary.birthDate.year} label="Birth Year" />
                    </div>
                  </div>
                </div>

                {/* 4. Birth City & 5. Birth Country */}
                <div className="grid-2">
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 12, borderRadius: 8 }}>
                    <label className="form-label">4. Birth City</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input readOnly value={primary.birthCity} className="form-input" />
                      <CopyButton text={primary.birthCity} label="Birth City" />
                    </div>
                  </div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 12, borderRadius: 8 }}>
                    <label className="form-label">5. Birth Country</label>
                    <input readOnly value={primary.birthCountry || 'Ethiopia'} className="form-input" />
                  </div>
                </div>

                {/* 7. Photograph Download */}
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label className="form-label" style={{ margin: 0 }}>7. Entrant Photograph (600x600)</label>
                    <span style={{ fontSize: 12, color: 'var(--success)' }}>✓ Pre-validated JPEG</span>
                  </div>
                  {primary.photoDownloadUrl ? (
                    <a
                      href={primary.photoDownloadUrl}
                      download={`principal_${primary.name.lastName}.jpg`}
                      className="btn btn-primary"
                      style={{ fontSize: 12, padding: '6px 12px' }}
                    >
                      <Download size={13} /> Download Photo
                    </a>
                  ) : (
                    <span style={{ color: 'var(--danger)', fontSize: 12 }}>No photo URL</span>
                  )}
                </div>

                {/* 8. Mailing Address & 10. Phone & 11. Email */}
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 12, borderRadius: 8 }}>
                  <label className="form-label">8. Mailing Address</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <input readOnly value={primary.mailingAddress?.addressLine1 || 'N/A'} className="form-input" />
                    <CopyButton text={primary.mailingAddress?.addressLine1} label="Address" />
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <input readOnly value={primary.mailingAddress?.city || 'ADDIS ABABA'} className="form-input" />
                    <CopyButton text={primary.mailingAddress?.city} label="City" />
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input readOnly value={primary.email} className="form-input" />
                    <CopyButton text={primary.email} label="Email" />
                  </div>
                </div>

                {/* 12. Education & 13. Marital Status */}
                <div className="grid-2">
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 12, borderRadius: 8 }}>
                    <label className="form-label">12. Education Level</label>
                    <input readOnly value={primary.educationLevel} className="form-input" />
                  </div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 12, borderRadius: 8 }}>
                    <label className="form-label">13. Marital Status</label>
                    <input readOnly value={primary.maritalStatus} className="form-input" />
                  </div>
                </div>

                {/* 14. Children Count */}
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 12, borderRadius: 8 }}>
                  <label className="form-label">14. Number of Children</label>
                  <input readOnly value={primary.childrenCount || 0} className="form-input" />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANE: Confirmation Entry & Submission Module */}
          <div className="card" style={{ padding: 24, height: 'fit-content' }}>
            <h3 style={{ fontSize: 16, marginBottom: 14, color: '#38bdf8' }}>
              Record Official Confirmation
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
              After completing submission on <strong>dvprogram.state.gov</strong>, paste the 16-character confirmation number below.
            </p>

            <form onSubmit={handleCompleteFiling}>
              <div className="form-group">
                <label className="form-label">Confirmation Number (e.g. 20271O0DZWY3DOV9) *</label>
                <input
                  type="text"
                  required
                  maxLength={16}
                  placeholder="2027XXXXXXXXXXXX"
                  value={confirmationNumber}
                  onChange={(e) => setConfirmationNumber(e.target.value.toUpperCase())}
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: 2, fontWeight: 700, color: '#38bdf8' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Submission Page Screenshot (Optional)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                  className="form-input"
                  style={{ fontSize: 12 }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px 0', fontSize: 15, marginBottom: 14 }}
              >
                {isSubmitting ? 'Recording & Encrypting...' : '✓ Mark Filed & Deliver Number'}
              </button>
            </form>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <button
                type="button"
                onClick={handleReleaseLock}
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: 13 }}
              >
                Skip / Release Back to Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
