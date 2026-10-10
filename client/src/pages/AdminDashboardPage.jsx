import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api.js';
import { Shield, DollarSign, Users, CheckCircle, XCircle, TrendingUp, Key, ExternalLink, Send, Sparkles, AlertTriangle } from 'lucide-react';

export default function AdminDashboardPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' | 'analytics' | 'audit' | '2fa'
  const [payments, setPayments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSendingReport, setIsSendingReport] = useState(false);

  // 2FA Setup State
  const [qrCode, setQrCode] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpVerifyCode, setTotpVerifyCode] = useState('');

  // Load Payments
  const fetchPayments = async () => {
    try {
      const res = await apiRequest('/admin/payments?status=PENDING_VERIFICATION');
      if (res.success) setPayments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Analytics
  const fetchAnalytics = async () => {
    try {
      const res = await apiRequest('/admin/analytics');
      if (res.success) setAnalytics(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Audit Logs
  const fetchAuditLogs = async () => {
    try {
      const res = await apiRequest('/admin/audit-logs');
      if (res.success) setAuditLogs(res.data.logs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPayments(), fetchAnalytics(), fetchAuditLogs()]).finally(() => setLoading(false));
  }, []);

  // Send Daily Executive Report to Telegram Channel
  const handleSendTelegramReport = async () => {
    try {
      setIsSendingReport(true);
      setErrorMessage('');
      setMessage('');
      const res = await apiRequest('/admin/telegram-report', { method: 'POST' });
      if (res.success) {
        setMessage('✅ Daily Executive Report successfully dispatched to Telegram Admin Alerts channel!');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to dispatch Telegram report');
    } finally {
      setIsSendingReport(false);
    }
  };

  // Approve Payment
  const handleApprove = async (paymentId) => {
    try {
      setErrorMessage('');
      const res = await apiRequest(`/admin/payments/${paymentId}/approve`, { method: 'POST' });
      if (res.success) {
        setMessage('Payment approved and placed in queue!');
        fetchPayments();
        fetchAnalytics();
      }
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Reject Payment
  const handleReject = async (paymentId) => {
    const reason = prompt('Please enter rejection reason (will be sent to applicant):', 'Payment could not be verified on bank statement');
    if (!reason) return;

    try {
      setErrorMessage('');
      const res = await apiRequest(`/admin/payments/${paymentId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      if (res.success) {
        setMessage('Payment rejected.');
        fetchPayments();
      }
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Setup 2FA
  const handleStart2FASetup = async () => {
    try {
      const res = await apiRequest('/auth/staff/setup-2fa', { method: 'POST' });
      if (res.success) {
        setQrCode(res.data.qrCode);
        setTotpSecret(res.data.secret);
      }
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/auth/staff/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({ code: totpVerifyCode }),
      });
      if (res.success) {
        setMessage('2FA has been successfully verified and activated on your staff account!');
        setQrCode('');
      }
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={28} color="#2dd4bf" />
          <div>
            <h1 style={{ fontSize: 24, margin: 0 }}>Super Admin Command Center</h1>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Financial Ledger, Queue Metrics & Staff Security</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleSendTelegramReport}
            disabled={isSendingReport}
            className="btn btn-secondary"
            style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, borderColor: '#38bdf8', color: '#38bdf8' }}
          >
            <Send size={14} /> {isSendingReport ? 'Sending Report...' : 'Send Telegram Report'}
          </button>
          <button onClick={() => onNavigate('operator')} className="btn btn-secondary" style={{ fontSize: 13 }}>
            Open Filing Station →
          </button>
        </div>
      </div>

      {message && (
        <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 18 }}>
          {message}
        </div>
      )}

      {errorMessage && (
        <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 18 }}>
          {errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: 24, gap: 10 }}>
        <button
          onClick={() => setActiveTab('payments')}
          className={`btn ${activeTab === 'payments' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: 13 }}
        >
          Pending Payments ({payments.length})
        </button>
        <button
          onClick={() => { setActiveTab('analytics'); fetchAnalytics(); }}
          className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: 13 }}
        >
          Financial Analytics
        </button>
        <button
          onClick={() => { setActiveTab('audit'); fetchAuditLogs(); }}
          className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: 13 }}
        >
          Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('2fa')}
          className={`btn ${activeTab === '2fa' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: 13 }}
        >
          Staff 2FA Security
        </button>
      </div>

      {/* TAB 1: Payment Approvals */}
      {activeTab === 'payments' && (
        <div>
          {payments.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              No pending payments awaiting review.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {payments.map((p) => (
                <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <strong style={{ fontSize: 16, color: '#ffffff' }}>{p.amountETB} ETB</strong>
                      <span className="badge badge-warning">{p.provider}</span>
                      <span style={{ fontSize: 13, color: 'var(--primary-300)', fontFamily: 'monospace' }}>
                        #{p.entryRef}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Sender: <strong>{p.senderName || 'N/A'}</strong> | Txn Code: <code style={{ color: '#38bdf8' }}>{p.claimedTransactionCode || 'N/A'}</code>
                    </div>

                    {/* AI OCR Verification Badge */}
                    {p.ocrVerified ? (
                      <div style={{ margin: '6px 0', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#34d399' }}>
                        <Sparkles size={13} />
                        <strong>AI Vision: Verified Match</strong> ({p.ocrBank || p.provider} • <code style={{ color: '#ffffff' }}>{p.ocrTxCode}</code> • {p.ocrAmount || 1000} ETB)
                      </div>
                    ) : p.ocrTxCode ? (
                      <div style={{ margin: '6px 0', padding: '4px 10px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#fbbf24' }}>
                        <AlertTriangle size={13} />
                        <strong>AI Vision: Review Needed</strong> (Detected: <code>{p.ocrTxCode}</code> vs Claimed: <code>{p.claimedTransactionCode || 'None'}</code>)
                      </div>
                    ) : p.ocrIsReceipt === false ? (
                      <div style={{ margin: '6px 0', padding: '4px 10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f87171' }}>
                        <XCircle size={13} />
                        <strong>AI Vision: Invalid Receipt Screenshot</strong>
                      </div>
                    ) : null}

                    <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
                      Applicant: {p.userEmail || p.userTelegram || 'User'} | {new Date(p.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {p.receiptUrl && (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: '7px 12px' }}
                      >
                        View Receipt <ExternalLink size={12} />
                      </a>
                    )}
                    <button
                      onClick={() => handleApprove(p.id)}
                      className="btn btn-accent"
                      style={{ fontSize: 12, padding: '7px 14px' }}
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(p.id)}
                      className="btn btn-danger"
                      style={{ fontSize: 12, padding: '7px 14px' }}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Financial & Funnel Analytics */}
      {activeTab === 'analytics' && analytics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Revenue KPI Cards */}
          <div className="grid-3">
            <div className="card" style={{ padding: 20 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gross Revenue (ጠቅላላ ገቢ)</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
                {analytics.financials.grossRevenueETB.toLocaleString()} ETB
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>From {analytics.counts.totalPaid} approved entries</span>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Filing Costs + Refunds</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f87171', margin: '4px 0' }}>
                {(analytics.financials.directFilingCostETB + analytics.financials.totalRefundsETB).toLocaleString()} ETB
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Refunds: {analytics.financials.totalRefundsETB} ETB</span>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Net Profit (የተጣራ ትርፍ)</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#38bdf8', margin: '4px 0' }}>
                {analytics.financials.netProfitETB.toLocaleString()} ETB
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Gross Revenue - Total Costs</span>
            </div>
          </div>

          {/* Funnel Conversion Breakdown */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Conversion Funnel Performance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, textAlign: 'center' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 14, borderRadius: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Step 1: Registered</span>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{analytics.funnel.step1_registered}</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 14, borderRadius: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Step 2: Form Completed</span>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{analytics.funnel.step2_submittedForm}</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 14, borderRadius: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Step 3: Paid & Queued</span>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{analytics.funnel.step3_paymentApproved}</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 14, borderRadius: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Step 4: Officially Filed</span>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}>{analytics.funnel.step4_officiallyFiled}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Immutable Security Audit Trail</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 12px' }}>Timestamp</th>
                  <th style={{ padding: '8px 12px' }}>Actor</th>
                  <th style={{ padding: '8px 12px' }}>Action</th>
                  <th style={{ padding: '8px 12px' }}>Target</th>
                  <th style={{ padding: '8px 12px' }}>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log._id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-subtle)' }}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{log.actorUsername} ({log.actorRole})</td>
                    <td style={{ padding: '10px 12px' }}><span className="badge badge-info">{log.action}</span></td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{log.targetEntity}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-subtle)' }}>{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Staff 2FA Security Setup */}
      {activeTab === '2fa' && (
        <div className="card" style={{ maxWidth: 540, margin: '0 auto', padding: 28, textAlign: 'center' }}>
          <Key size={36} color="var(--primary-400)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>Staff Two-Factor Authentication (2FA)</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            Protect your staff account using Google Authenticator, Microsoft Authenticator, or 1Password.
          </p>

          {!qrCode ? (
            <button onClick={handleStart2FASetup} className="btn btn-primary">
              Generate 2FA QR Code
            </button>
          ) : (
            <div>
              <img src={qrCode} alt="2FA QR Code" style={{ borderRadius: 8, margin: '0 auto 16px auto', display: 'block', maxWidth: 200 }} />
              <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginBottom: 16 }}>
                Secret Key: <code style={{ color: '#38bdf8' }}>{totpSecret}</code>
              </p>

              <form onSubmit={handleVerify2FA} style={{ display: 'flex', gap: 10, maxWidth: 300, margin: '0 auto' }}>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="000000"
                  value={totpVerifyCode}
                  onChange={(e) => setTotpVerifyCode(e.target.value)}
                  className="form-input"
                  style={{ textAlign: 'center', fontSize: 18, letterSpacing: 4, fontWeight: 700 }}
                />
                <button type="submit" className="btn btn-accent" style={{ padding: '0 16px' }}>
                  Verify
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
