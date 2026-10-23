import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest, uploadFileDirect } from '../services/api.js';
import Alert from '../components/Alert.jsx';
import CopyButton from '../components/CopyButton.jsx';
import AdminFullFormModal from '../components/AdminFullFormModal.jsx';
import AdminDeleteConfirmModal from '../components/AdminDeleteConfirmModal.jsx';
import {
  LayoutGrid,
  Ticket,
  Users,
  UserCheck,
  BookOpen,
  Clock,
  Star,
  FileSpreadsheet,
  Settings,
  Search,
  Bell,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  TrendingUp,
  TrendingDown,
  Download,
  Trash2,
  Printer,
  CheckCircle2,
  XCircle,
  Send,
  Zap,
  ExternalLink,
  Shield,
  Key,
  Filter,
  Sparkles,
  Calendar,
  Layers,
  ArrowUpRight,
  Check,
  X,
  RefreshCw,
  FileCheck,
  Menu,
  Phone
} from 'lucide-react';

export default function AdminDashboardPage({ onNavigate }) {
  // Navigation & Drawer State
  const [activeNav, setActiveNav] = useState('overview'); // 'overview' | 'filing' | 'tickets' | 'clients' | 'reports' | '2fa'
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [ticketSubFilter, setTicketSubFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'QUEUED' | 'CONFIRMED'
  const [userTypeFilter, setUserTypeFilter] = useState('ALL'); // 'ALL' | 'PAID' | 'NORMAL'

  // Real Database Data State
  const [entries, setEntries] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [payments, setPayments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activityTab, setActivityTab] = useState('today'); // 'today' | 'yesterday' | 'week'
  const [timeframe, setTimeframe] = useState('Last 7 Days');

  // Modals
  const [selectedEntryForForm, setSelectedEntryForForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'entry' | 'user', id, name }
  const [isDeleting, setIsDeleting] = useState(false);
  const [rejectModalPayment, setRejectModalPayment] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // 2FA Setup
  const [qrCode, setQrCode] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpVerifyCode, setTotpVerifyCode] = useState('');

  // Alerts & Messages
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  // Table selection
  const [selectedRows, setSelectedRows] = useState([]);

  // Filing Station State
  const [activeFilingData, setActiveFilingData] = useState(null);
  const [filingLoading, setFilingLoading] = useState(false);
  const [confirmationNumberInput, setConfirmationNumberInput] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [isSubmittingFiling, setIsSubmittingFiling] = useState(false);
  const [filingStatusMessage, setFilingStatusMessage] = useState('');
  const [filingErrorMessage, setFilingErrorMessage] = useState('');
  const [filingTimeLeft, setFilingTimeLeft] = useState(1800); // 30 mins
  const [isApplicantDataExpanded, setIsApplicantDataExpanded] = useState(true);

  // Load Real Data from Backend
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [entriesRes, usersRes, paymentsRes, analyticsRes, activityRes] = await Promise.all([
        apiRequest('/admin/entries?limit=100').catch(() => ({ data: { entries: [] } })),
        apiRequest('/admin/users?limit=100').catch(() => ({ data: { users: [] } })),
        apiRequest('/admin/payments?status=PENDING_VERIFICATION').catch(() => ({ data: [] })),
        apiRequest('/admin/analytics').catch(() => ({ data: null })),
        apiRequest('/admin/recent-activity').catch(() => ({ data: [] })),
      ]);

      if (entriesRes.success) setEntries(entriesRes.data?.entries || []);
      if (usersRes.success) setUsersList(usersRes.data?.users || []);
      if (paymentsRes.success) setPayments(paymentsRes.data || []);
      if (analyticsRes.success) setAnalytics(analyticsRes.data || null);
      if (activityRes.success) setActivityFeed(activityRes.data || []);
    } catch (err) {
      console.error('Failed loading admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Check if current operator already holds an active lock without claiming someone new
  const checkActiveFilingEntry = async () => {
    try {
      setFilingLoading(true);
      setFilingErrorMessage('');
      const res = await apiRequest('/admin/queue/active');
      if (res.success && res.data?.entry) {
        setActiveFilingData(res.data);
        if (res.data.entry.lockExpiresAt) {
          const diff = Math.floor((new Date(res.data.entry.lockExpiresAt).getTime() - Date.now()) / 1000);
          setFilingTimeLeft(Math.max(0, diff));
        }
      } else {
        setActiveFilingData(null);
      }
    } catch (err) {
      console.warn('Could not check active filing lock:', err.message);
    } finally {
      setFilingLoading(false);
    }
  };

  // Claim next priority entry for filing
  const claimNextFilingEntry = async () => {
    try {
      setFilingLoading(true);
      setFilingErrorMessage('');
      setFilingStatusMessage('');
      setConfirmationNumberInput('');
      setScreenshotFile(null);

      const res = await apiRequest('/admin/queue/claim-next', { method: 'POST' });
      if (res.success && res.data.entry) {
        setActiveFilingData(res.data);
        setIsApplicantDataExpanded(true);
        if (res.data.entry.lockExpiresAt) {
          const diff = Math.floor((new Date(res.data.entry.lockExpiresAt).getTime() - Date.now()) / 1000);
          setFilingTimeLeft(Math.max(0, diff));
        }
      } else {
        setActiveFilingData(null);
        setFilingStatusMessage(res.data.message || 'Queue is currently empty! All approved entries have been filed.');
      }
    } catch (err) {
      setFilingErrorMessage(err.message || 'Failed to claim entry from queue.');
    } finally {
      setFilingLoading(false);
    }
  };

  // Lock countdown timer
  useEffect(() => {
    if (!activeFilingData || filingTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setFilingTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeFilingData, filingTimeLeft]);

  // Release lock
  const handleReleaseFilingLock = async () => {
    if (!activeFilingData) return;
    try {
      await apiRequest(`/admin/queue/release/${activeFilingData.entry.id}`, { method: 'POST' });
      setActiveFilingData(null);
      setFilingStatusMessage('Lock released. Entry returned to queue.');
      loadDashboardData();
    } catch (err) {
      setFilingErrorMessage(err.message || 'Failed to release lock');
    }
  };

  // Submit official confirmation number
  const handleCompleteFiling = async (e) => {
    e.preventDefault();
    if (!confirmationNumberInput.trim()) {
      setFilingErrorMessage('Please enter the 16-character confirmation number.');
      return;
    }

    try {
      setIsSubmittingFiling(true);
      setFilingErrorMessage('');

      let screenshotKey = null;
      if (screenshotFile) {
        screenshotKey = await uploadFileDirect('confirmations', screenshotFile);
      }

      const res = await apiRequest(`/admin/entries/${activeFilingData.entry.id}/file`, {
        method: 'POST',
        body: JSON.stringify({
          confirmationNumber: confirmationNumberInput.trim().toUpperCase(),
          officialSubmissionScreenshotKey: screenshotKey,
        }),
      });

      if (res.success) {
        setFilingStatusMessage(`✅ Successfully filed ${confirmationNumberInput}! Confirmation delivered to applicant.`);
        loadDashboardData();
        setTimeout(() => {
          claimNextFilingEntry();
        }, 1500);
      }
    } catch (err) {
      setFilingErrorMessage(err.message || 'Failed to record confirmation number.');
    } finally {
      setIsSubmittingFiling(false);
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Dispatch daily executive Telegram report
  const handleSendTelegramReport = async () => {
    try {
      setIsSendingReport(true);
      setErrorMessage('');
      setMessage('');
      const res = await apiRequest('/admin/telegram-report', { method: 'POST' });
      if (res.success) {
        setMessage('✅ Daily Executive Report dispatched to Telegram Admin Alerts channel!');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to dispatch Telegram report');
    } finally {
      setIsSendingReport(false);
    }
  };

  // Dispatch reminders to all unpaid applicants
  const handleSendReminders = async () => {
    try {
      setIsSendingReminders(true);
      setErrorMessage('');
      setMessage('');
      const res = await apiRequest('/admin/reminders/send-unpaid-reminders', { method: 'POST' });
      if (res.success) {
        setMessage(`📢 ${res.data?.message || 'Reminders dispatched successfully!'}`);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to dispatch reminders');
    } finally {
      setIsSendingReminders(false);
    }
  };

  // Approve Payment
  const handleApprovePayment = async (paymentId) => {
    try {
      setErrorMessage('');
      const res = await apiRequest(`/admin/payments/${paymentId}/approve`, { method: 'POST' });
      if (res.success) {
        setMessage('Payment approved and entry placed in queue! Telegram channel notified.');
        loadDashboardData();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Approval failed');
    }
  };

  // Confirm Reject Payment
  const handleConfirmReject = async () => {
    if (!rejectModalPayment) return;
    try {
      setIsRejecting(true);
      setErrorMessage('');
      const res = await apiRequest(`/admin/payments/${rejectModalPayment.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() || 'Payment unverified' }),
      });
      if (res.success) {
        setMessage(`Payment for #${rejectModalPayment.entryRef || ''} rejected. Telegram notified.`);
        setRejectModalPayment(null);
        setRejectReason('');
        loadDashboardData();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reject payment');
    } finally {
      setIsRejecting(false);
    }
  };

  // Delete Action Confirm
  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      setErrorMessage('');
      if (deleteTarget.type === 'entry') {
        const res = await apiRequest(`/admin/entries/${deleteTarget.id}`, { method: 'DELETE' });
        if (res.success) {
          setMessage(`Entry #${deleteTarget.name} deleted permanently.`);
          setEntries((prev) => prev.filter((e) => e.id !== deleteTarget.id));
        }
      } else if (deleteTarget.type === 'user') {
        const res = await apiRequest(`/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
        if (res.success) {
          setMessage(`User ${deleteTarget.name} deleted permanently.`);
          setUsersList((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        }
      }
      setDeleteTarget(null);
    } catch (err) {
      setErrorMessage(err.message || 'Delete operation failed');
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick sequential photo download for an entry
  const handleQuickDownloadPhotos = async (entryId, entryRef) => {
    try {
      setMessage(`Fetching photos for #${entryRef}...`);
      const token = localStorage.getItem('token') || localStorage.getItem('staffToken');
      const res = await fetch(`/api/v1/admin/entries/${entryId}/full-data`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      if (!json.success || !json.data?.photos?.length) {
        alert('No photo files found for this applicant.');
        return;
      }

      for (const item of json.data.photos) {
        if (!item.photoUrl) continue;
        try {
          const pRes = await fetch(item.photoUrl);
          const blob = await pRes.blob();
          const bUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = bUrl;
          a.download = item.filename || `photo_${item.role.toLowerCase().replace(/\s+/g, '_')}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(bUrl);
          await new Promise((r) => setTimeout(r, 400));
        } catch (e) {
          window.open(item.photoUrl, '_blank');
        }
      }
      setMessage(`✅ All photos for #${entryRef} downloaded successfully.`);
    } catch (err) {
      setErrorMessage('Could not download photos: ' + err.message);
    }
  };

  // Filtered entries list
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      if (ticketSubFilter === 'PENDING' && item.status !== 'PAYMENT_PENDING') return false;
      if (ticketSubFilter === 'QUEUED' && item.status !== 'QUEUED') return false;
      if (ticketSubFilter === 'CONFIRMED' && item.status !== 'CONFIRMED' && item.status !== 'FILED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRef = item.uniqueReference?.toLowerCase().includes(q);
        const matchName = item.applicantName?.toLowerCase().includes(q);
        const matchEmail = item.applicantEmail?.toLowerCase().includes(q);
        return matchRef || matchName || matchEmail;
      }
      return true;
    });
  }, [entries, ticketSubFilter, searchQuery]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      if (userTypeFilter === 'PAID' && !u.isPaid) return false;
      if (userTypeFilter === 'NORMAL' && u.isPaid) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchName = u.fullName?.toLowerCase().includes(q);
        const matchTg = u.telegramUsername?.toLowerCase().includes(q);
        return matchEmail || matchName || matchTg;
      }
      return true;
    });
  }, [usersList, userTypeFilter, searchQuery]);

  // Checkbox row toggles
  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(filteredEntries.map((item) => item.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleToggleRow = (id) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((rId) => rId !== id) : [...prev, id]));
  };

  // REAL DATABASE NUMBERS
  const realTotalApplications = analytics?.counts?.totalApplications ?? entries.length;
  const realTotalUsers = analytics?.counts?.totalUsers ?? usersList.length;
  const realTotalPaid = analytics?.counts?.totalPaid ?? payments.filter((p) => p.status === 'APPROVED').length;
  const realTotalQueued = analytics?.counts?.totalQueued ?? entries.filter((e) => ['QUEUED', 'FILING_IN_PROGRESS'].includes(e.status)).length;
  const realTotalDrafts = analytics?.counts?.totalDrafts ?? entries.filter((e) => e.status === 'DRAFT').length;
  const realTotalPendingPayment = analytics?.counts?.totalPendingPayment ?? entries.filter((e) => e.status === 'PAYMENT_PENDING').length;
  const realConversionRate = analytics?.funnel?.conversionRateOverall ?? (realTotalUsers > 0 ? ((realTotalPaid / realTotalUsers) * 100).toFixed(1) + '%' : '0%');

  // Real 7-day chart bars
  const chartDays = analytics?.volumeByDay || [
    { day: 'Sun', count: 0 },
    { day: 'Mon', count: 0 },
    { day: 'Tue', count: 0 },
    { day: 'Wed', count: 0 },
    { day: 'Thu', count: 0 },
    { day: 'Fri', count: 0 },
    { day: 'Sat', count: 0 },
  ];
  const maxDayCount = Math.max(1, ...chartDays.map((d) => d.count));

  const primaryFiling = activeFilingData?.formData?.primary;

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0f172a',
        position: 'relative',
      }}
    >
      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 998,
          }}
        />
      )}

      {/* ========================================================= */}
      {/* SIDEBAR (RESPONSIVE: FIXED DESKTOP / DRAWER MOBILE)       */}
      {/* ========================================================= */}
      <aside
        className={`admin-sidebar ${mobileDrawerOpen ? 'drawer-open' : ''}`}
        style={{
          width: 256,
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          flexShrink: 0,
          zIndex: 999,
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Brand Header */}
        <div
          onClick={() => onNavigate('home')}
          title="Click to visit EthioDV Public Site"
          style={{
            padding: '20px 20px 16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 16,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
              }}
            >
              DV
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.4, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 4 }}>
                EthioDV
                <ArrowUpRight size={13} color="#94a3b8" />
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Admin Console
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              background: '#f1f5f9',
              fontSize: 11,
              fontWeight: 600,
              color: '#475569',
            }}
          >
            Site ↗
          </div>
        </div>

        {/* Global Search Input */}
        <div style={{ padding: '0 16px 14px 16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '7px 10px',
              gap: 8,
            }}
          >
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search applicant, ref, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 13,
                color: '#0f172a',
                width: '100%',
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: '#94a3b8',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 4,
                padding: '1px 5px',
                fontWeight: 600,
              }}
            >
              ⌘K
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px 12px' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: 1,
              padding: '8px 10px 4px 10px',
              textTransform: 'uppercase',
            }}
          >
            MAIN NAVIGATION
          </div>

          <button
            onClick={() => {
              setActiveNav('overview');
              setMobileDrawerOpen(false);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeNav === 'overview' ? '#f1f5f9' : 'transparent',
              color: activeNav === 'overview' ? '#0f172a' : '#475569',
              textAlign: 'left',
            }}
          >
            <LayoutGrid size={17} color={activeNav === 'overview' ? '#0f172a' : '#64748b'} />
            <span>Overview</span>
          </button>

          {/* Filing Station Link */}
          <button
            onClick={() => {
              setActiveNav('filing');
              setMobileDrawerOpen(false);
              if (!activeFilingData) checkActiveFilingEntry();
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeNav === 'filing' ? '#0f172a' : 'transparent',
              color: activeNav === 'filing' ? '#ffffff' : '#0f172a',
              textAlign: 'left',
              marginTop: 2,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileCheck size={17} color={activeNav === 'filing' ? '#ffffff' : '#4f46e5'} />
              <span>Filing Station</span>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                background: activeNav === 'filing' ? 'rgba(255,255,255,0.2)' : '#e0e7ff',
                color: activeNav === 'filing' ? '#ffffff' : '#4338ca',
                padding: '2px 7px',
                borderRadius: 9999,
              }}
            >
              {realTotalQueued} Ready
            </span>
          </button>

          {/* Applications Accordion */}
          <div style={{ marginTop: 2 }}>
            <button
              onClick={() => {
                setActiveNav('tickets');
                setMobileDrawerOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeNav === 'tickets' ? '#f1f5f9' : 'transparent',
                color: activeNav === 'tickets' ? '#0f172a' : '#475569',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Ticket size={17} color={activeNav === 'tickets' ? '#0f172a' : '#64748b'} />
                <span>Applications</span>
              </div>
              <ChevronDown size={14} color="#94a3b8" />
            </button>

            <div style={{ paddingLeft: 28, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button
                onClick={() => {
                  setActiveNav('tickets');
                  setTicketSubFilter('ALL');
                  setMobileDrawerOpen(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '5px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: ticketSubFilter === 'ALL' && activeNav === 'tickets' ? 700 : 500,
                  color: ticketSubFilter === 'ALL' && activeNav === 'tickets' ? '#0f172a' : '#64748b',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>All Entrants</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{realTotalApplications}</span>
              </button>
              <button
                onClick={() => {
                  setActiveNav('tickets');
                  setTicketSubFilter('PENDING');
                  setMobileDrawerOpen(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '5px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: ticketSubFilter === 'PENDING' ? 700 : 500,
                  color: ticketSubFilter === 'PENDING' ? '#0f172a' : '#64748b',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Pending Payment</span>
                {realTotalPendingPayment > 0 && (
                  <span style={{ fontSize: 10, background: '#fee2e2', color: '#ef4444', padding: '1px 6px', borderRadius: 9999, fontWeight: 700 }}>
                    {realTotalPendingPayment}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveNav('tickets');
                  setTicketSubFilter('QUEUED');
                  setMobileDrawerOpen(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '5px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: ticketSubFilter === 'QUEUED' ? 700 : 500,
                  color: ticketSubFilter === 'QUEUED' ? '#0f172a' : '#64748b',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Ready in Queue</span>
                <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>{realTotalQueued}</span>
              </button>
            </div>
          </div>

          {/* Clients Link */}
          <button
            onClick={() => {
              setActiveNav('clients');
              setMobileDrawerOpen(false);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeNav === 'clients' ? '#f1f5f9' : 'transparent',
              color: activeNav === 'clients' ? '#0f172a' : '#475569',
              textAlign: 'left',
              marginTop: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={17} color={activeNav === 'clients' ? '#0f172a' : '#64748b'} />
              <span>Clients / Users</span>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: '#f1f5f9',
                color: '#475569',
                padding: '1px 7px',
                borderRadius: 9999,
              }}
            >
              {realTotalUsers}
            </span>
          </button>

          {/* Guidelines */}
          <button
            onClick={() => onNavigate('photo-guide')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: '#475569',
              textAlign: 'left',
              marginTop: 2,
            }}
          >
            <BookOpen size={17} color="#64748b" />
            <span>DV Guidelines</span>
          </button>

          {/* Telegram Reports */}
          <button
            onClick={handleSendTelegramReport}
            title="Dispatch Telegram report"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: '#475569',
              textAlign: 'left',
              marginTop: 2,
            }}
          >
            <Zap size={17} color="#64748b" />
            <span>Telegram Channel</span>
          </button>

          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: 1,
              padding: '18px 10px 4px 10px',
              textTransform: 'uppercase',
            }}
          >
            REPORTS & SECURITY
          </div>

          <button
            onClick={() => {
              setActiveNav('reports');
              setMobileDrawerOpen(false);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: activeNav === 'reports' ? 700 : 500,
              border: 'none',
              cursor: 'pointer',
              background: activeNav === 'reports' ? '#f1f5f9' : 'transparent',
              color: activeNav === 'reports' ? '#0f172a' : '#475569',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileSpreadsheet size={16} color={activeNav === 'reports' ? '#0f172a' : '#64748b'} />
              <span>Executive Reports</span>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: 4 }}>
              LIVE
            </span>
          </button>

          <button
            onClick={() => {
              setActiveNav('2fa');
              setMobileDrawerOpen(false);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: activeNav === '2fa' ? 700 : 500,
              border: 'none',
              cursor: 'pointer',
              background: activeNav === '2fa' ? '#f1f5f9' : 'transparent',
              color: activeNav === '2fa' ? '#0f172a' : '#475569',
              textAlign: 'left',
            }}
          >
            <Settings size={16} color={activeNav === '2fa' ? '#0f172a' : '#64748b'} />
            <span>Staff 2FA Security</span>
          </button>
        </div>

        {/* Profile Pill */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 9px',
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5, #0f172a)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 12,
                  position: 'relative',
                }}
              >
                YM
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#10b981',
                    border: '1.5px solid #ffffff',
                  }}
                />
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Yohannes Molla</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Super Admin • 0949478933</div>
              </div>
            </div>
            <ChevronsUpDown size={15} color="#94a3b8" />
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN VIEWPORT (100% RESPONSIVE)                           */}
      {/* ========================================================= */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Header Bar */}
        <header
          className="admin-header-container"
          style={{
            padding: '20px 24px 0 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Mobile Drawer Trigger (Visible only on mobile/tablet) */}
              <button
                className="mobile-hamburger-btn"
                onClick={() => setMobileDrawerOpen(true)}
                title="Toggle sidebar menu"
                style={{
                  display: 'none',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                <Menu size={20} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
                <LayoutGrid size={14} color="#64748b" />
                <span>EthioDV</span>
                <span>/</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>
                  {activeNav === 'filing' ? 'Filing Station' : activeNav === 'clients' ? 'Clients Directory' : 'Dashboard'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                <Calendar size={13} color="#64748b" />
                <span>{timeframe}</span>
                <ChevronDown size={13} color="#94a3b8" />
              </button>

              <button
                onClick={() => setActiveNav('tickets')}
                title="Pending payments"
                style={{
                  position: 'relative',
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                <Bell size={15} />
                {payments.length > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 7,
                      right: 7,
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#ef4444',
                    }}
                  />
                )}
              </button>

              <button
                onClick={() => onNavigate('home')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#4f46e5',
                  cursor: 'pointer',
                }}
              >
                Public Site <ArrowUpRight size={13} />
              </button>
            </div>
          </div>

          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px 0', color: '#0f172a', letterSpacing: -0.5 }}>
              Hello, Yohannes Molla 👋
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Live Overview: <strong>{realTotalApplications}</strong> Applications • <strong>{realTotalUsers}</strong> Registered Users • <strong>{realTotalQueued}</strong> Ready in Queue.
            </p>
          </div>
        </header>

        {/* Alerts Banner */}
        <div style={{ padding: '14px 24px 0 24px' }}>
          {message && <Alert type="success" message={message} onClose={() => setMessage('')} />}
          {errorMessage && <Alert type="danger" message={errorMessage} onClose={() => setErrorMessage('')} />}
        </div>

        {/* Dashboard Dynamic Body */}
        <div className="admin-body-padding" style={{ padding: '18px 24px 40px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* ========================================================= */}
          {/* VIEW: FILING STATION (INTEGRATED)                         */}
          {/* ========================================================= */}
          {activeNav === 'filing' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Station Control Bar */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                      Official DV-2027 Filing Assistant
                    </h2>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Official filing portal: <strong style={{ color: '#0f172a' }}>dvprogram.state.gov</strong>
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {activeFilingData && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: 8 }}>
                      <Clock size={14} color="#ef4444" />
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#dc2626' }}>
                        Lock: {formatTimer(filingTimeLeft)}
                      </span>
                    </div>
                  )}

                  <a
                    href="https://dvprogram.state.gov"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      background: '#0f172a',
                      color: '#ffffff',
                      textDecoration: 'none',
                    }}
                  >
                    Open dvprogram.state.gov <ExternalLink size={12} />
                  </a>

                  {activeFilingData && (
                    <button
                      onClick={handleReleaseFilingLock}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      Release Lock
                    </button>
                  )}

                  <button
                    onClick={claimNextFilingEntry}
                    disabled={filingLoading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={12} /> {filingLoading ? 'Claiming...' : 'Claim Next Entry'}
                  </button>
                </div>
              </div>

              {filingStatusMessage && <Alert type="info" message={filingStatusMessage} onClose={() => setFilingStatusMessage('')} />}
              {filingErrorMessage && <Alert type="danger" message={filingErrorMessage} onClose={() => setFilingErrorMessage('')} />}

              {!activeFilingData ? (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '50px 20px', textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', color: '#64748b' }}>
                    <FileCheck size={24} />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                    No Active Entry Locked
                  </h3>
                  <p style={{ fontSize: 13, color: '#64748b', maxWidth: 440, margin: '0 auto 18px auto' }}>
                    Click &quot;Claim Next Entry&quot; to lock the highest priority approved applicant for 30 minutes.
                  </p>
                  <button
                    onClick={claimNextFilingEntry}
                    disabled={filingLoading}
                    style={{
                      padding: '9px 20px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Claim Top Priority Entry
                  </button>
                </div>
              ) : (
                <div className="filing-dual-pane" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
                  {/* Left Column: Form Fields with One-Click Copy */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>
                          Ref: #{activeFilingData.entry?.uniqueReference}
                        </span>
                        <h3 style={{ fontSize: 17, fontWeight: 800, margin: '2px 0 0 0', color: '#0f172a' }}>
                          {primaryFiling?.name?.lastName}, {primaryFiling?.name?.firstName} {primaryFiling?.name?.middleName || ''}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setIsApplicantDataExpanded((prev) => !prev)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            fontSize: 11,
                            fontWeight: 700,
                            background: '#ffffff',
                            color: '#0f172a',
                            cursor: 'pointer',
                          }}
                        >
                          {isApplicantDataExpanded ? (
                            <>
                              <ChevronDown size={14} /> Collapse Entrant Data
                            </>
                          ) : (
                            <>
                              <ChevronRight size={14} /> Expand Entrant Data
                            </>
                          )}
                        </button>

                        {primaryFiling?.photoDownloadUrl && (
                          <a
                            href={primaryFiling.photoDownloadUrl}
                            download={`photo_${activeFilingData.entry.uniqueReference}.jpg`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 12px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#0f172a',
                              textDecoration: 'none',
                              background: '#f8fafc',
                            }}
                          >
                            <Download size={12} /> Download Photo
                          </a>
                        )}
                      </div>
                    </div>

                    {!isApplicantDataExpanded ? (
                      <div
                        style={{
                          padding: '12px 14px',
                          background: '#f8fafc',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 10,
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', border: '1px solid #cbd5e1', background: '#ffffff', flexShrink: 0 }}>
                            {primaryFiling?.photoDownloadUrl ? (
                              <img src={primaryFiling.photoDownloadUrl} alt="Entrant" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#94a3b8' }}>N/A</div>
                            )}
                          </div>
                          <span style={{ color: '#64748b' }}>
                            Entrant: <strong style={{ color: '#0f172a' }}>{primaryFiling?.name?.firstName} {primaryFiling?.name?.lastName}</strong> ({primaryFiling?.gender === 'M' ? 'Male' : 'Female'}) • {primaryFiling?.birthCountry || 'Ethiopia'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsApplicantDataExpanded(true)}
                          style={{ border: 'none', background: 'none', color: '#4f46e5', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
                        >
                          Show full 14 form fields →
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Applicant Photo */}
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                          <div style={{ width: 90, height: 90, borderRadius: 8, overflow: 'hidden', border: '2px solid #10b981', background: '#ffffff', flexShrink: 0 }}>
                            {primaryFiling?.photoDownloadUrl ? (
                              <img src={primaryFiling.photoDownloadUrl} alt="Entrant" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No Photo</div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                              <CheckCircle2 size={13} /> 600×600 px Validated Photo
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              Ready for official state department submission.
                            </div>
                          </div>
                        </div>

                        {/* Copyable Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[
                            { label: '1. Last Name', val: primaryFiling?.name?.lastName },
                            { label: '2. First Name', val: primaryFiling?.name?.firstName },
                            { label: '3. Middle Name', val: primaryFiling?.name?.middleName || 'No Middle Name' },
                            { label: '4. Gender', val: primaryFiling?.gender === 'M' ? 'Male' : 'Female' },
                            {
                              label: '5. Birth Date',
                              val: primaryFiling?.birthDate ? `${primaryFiling.birthDate.month}/${primaryFiling.birthDate.day}/${primaryFiling.birthDate.year}` : 'N/A',
                            },
                            { label: '6. Birth City', val: primaryFiling?.birthCity || 'Addis Ababa' },
                            { label: '7. Birth Country', val: primaryFiling?.birthCountry || 'Ethiopia' },
                            { label: '8. Country of Eligibility', val: primaryFiling?.eligibilityCountry || 'Ethiopia' },
                            { label: '9. Address', val: primaryFiling?.mailingAddress?.addressLine1 || primaryFiling?.mailingAddress || 'Addis Ababa' },
                            { label: '10. Phone', val: primaryFiling?.phone || 'N/A' },
                            { label: '11. Email', val: primaryFiling?.email || 'N/A' },
                            { label: '12. Education Level', val: primaryFiling?.educationLevel || 'N/A' },
                            { label: '13. Marital Status', val: primaryFiling?.maritalStatus || 'UNMARRIED' },
                            { label: '14. Number of Children', val: String(primaryFiling?.childrenCount ?? 0) },
                          ].map((f, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '7px 10px',
                                background: '#f8fafc',
                                borderRadius: 6,
                                border: '1px solid #f1f5f9',
                              }}
                            >
                              <div style={{ minWidth: 0, paddingRight: 8 }}>
                                <div style={{ fontSize: 10, color: '#64748b' }}>{f.label}</div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>{f.val}</div>
                              </div>
                              <CopyButton text={f.val} label={f.label} />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right Column: Complete Official Filing Card */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, alignSelf: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px 0', color: '#0f172a' }}>
                        Complete Official Filing
                      </h3>
                      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                        Submit the DS-5501 form on dvprogram.state.gov, then enter the 16-character confirmation number below:
                      </p>
                    </div>

                    <form onSubmit={handleCompleteFiling} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>
                          Confirmation Number (16 chars) *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={16}
                          placeholder="20271O0DZWY3DOV9"
                          value={confirmationNumberInput}
                          onChange={(e) => setConfirmationNumberInput(e.target.value.toUpperCase())}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: 8,
                            border: '1.5px solid #cbd5e1',
                            fontSize: 14,
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            letterSpacing: 2,
                            outline: 'none',
                          }}
                        />
                        <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                          Must start with &quot;2027&quot; (Example: 20271O0DZWY3DOV9)
                        </span>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>
                          Official Screenshot (Optional)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                          style={{
                            width: '100%',
                            padding: '6px',
                            borderRadius: 8,
                            border: '1px dashed #cbd5e1',
                            background: '#f8fafc',
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingFiling || !confirmationNumberInput.trim()}
                        style={{
                          padding: '11px 18px',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          background: '#0f172a',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                        }}
                      >
                        <Check size={15} />
                        {isSubmittingFiling ? 'Saving & Notifying...' : 'Complete Filing & Notify Applicant'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================= */
            /* VIEW: DEFAULT DASHBOARD OVERVIEW & REAL DATA METRICS      */
            /* ========================================================= */
            <>
              {/* ROW 1: 3 METRIC CARDS WITH REAL DATA */}
              <div className="admin-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                {/* Metric Card 1: Total Applications */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Total Applications</span>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <Ticket size={15} />
                    </div>
                  </div>

                  <div style={{ margin: '12px 0 8px 0' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: -0.5 }}>
                      {realTotalApplications.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#64748b' }}>
                      <strong>{realTotalDrafts}</strong> Drafts • <strong>{realTotalApplications - realTotalDrafts}</strong> Submitted
                    </span>
                    <span style={{ fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <TrendingUp size={13} /> Live DB
                    </span>
                  </div>
                </div>

                {/* Metric Card 2: Paid & Queued (Ready) */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Paid & Queued (Ready)</span>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <Zap size={15} />
                    </div>
                  </div>

                  <div style={{ margin: '12px 0 8px 0' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: -0.5 }}>
                      {realTotalPaid.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#64748b' }}>
                      <strong>{realTotalPendingPayment}</strong> Awaiting Payment
                    </span>
                    <span style={{ fontWeight: 700, color: '#14b8a6', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <CheckCircle2 size={13} /> Verified
                    </span>
                  </div>
                </div>

                {/* Metric Card 3: Payment Conversion Rate */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Registered User Conversion</span>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <Clock size={15} />
                    </div>
                  </div>

                  <div style={{ margin: '12px 0 8px 0' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: -0.5 }}>
                      {realConversionRate}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#64748b' }}>
                      From <strong>{realTotalUsers}</strong> Registered Accounts
                    </span>
                    <span style={{ fontWeight: 700, color: '#6366f1' }}>Real Funnel</span>
                  </div>
                </div>
              </div>

              {/* ROW 2: REAL VOLUME TREND + LIVE ACTIVITY FEED */}
              <div className="admin-middle-grid" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 16 }}>
                {/* Volume Trend Chart */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Layers size={16} color="#64748b" />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Application Volume Trend</span>
                    </div>

                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Past 7 Days: <strong>{analytics?.recentWeekCount ?? entries.length}</strong> created
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 18 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
                      {realTotalApplications} Total Records
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>Live Synced</span>
                  </div>

                  {/* Responsive Bar Chart based on real 7-day counts */}
                  <div style={{ flex: 1, minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-around',
                        height: 150,
                        borderBottom: '1px solid #e2e8f0',
                        paddingBottom: 4,
                      }}
                    >
                      {chartDays.map((bar, idx) => {
                        const barHeight = Math.max(12, Math.round((bar.count / maxDayCount) * 110));
                        const isToday = new Date().getDay() === idx;
                        return (
                          <div key={bar.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, position: 'relative' }}>
                            {bar.count > 0 && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                                {bar.count}
                              </span>
                            )}
                            <div
                              style={{
                                width: 18,
                                height: barHeight,
                                borderRadius: 4,
                                background: isToday ? '#0f172a' : '#cbd5e1',
                                transition: 'height 0.3s ease',
                              }}
                            />
                            <span style={{ fontSize: 11, color: isToday ? '#0f172a' : '#64748b', marginTop: 8, fontWeight: isToday ? 700 : 500 }}>
                              {bar.day}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Card: Live Database Operations Feed */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 20px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Live System Activity</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{activityFeed.length} records</span>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 250 }}>
                    {activityFeed.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: 12 }}>
                        No new operational events recorded yet.
                      </div>
                    ) : (
                      activityFeed.map((act) => {
                        const isPayment = act.type === 'PAYMENT';
                        const isEntry = act.type === 'ENTRY';
                        const IconComponent = isPayment ? Sparkles : isEntry ? FileCheck : Users;
                        const iconBg = isPayment ? '#ecfdf5' : isEntry ? '#eff6ff' : '#faf5ff';
                        const iconColor = isPayment ? '#059669' : isEntry ? '#2563eb' : '#9333ea';

                        return (
                          <div key={act.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '4px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              <div style={{ width: 30, height: 30, borderRadius: 8, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <IconComponent size={15} />
                              </div>
                              <div style={{ minWidth: 0, lineHeight: 1.25 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {act.title}
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {act.description}
                                </div>
                              </div>
                            </div>
                            <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', fontWeight: 500 }}>
                              {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* ROW 3: APPLICANT QUEUE & DATA MANAGEMENT TABLE */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={16} color="#0f172a" />
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                        {activeNav === 'clients' ? 'Clients Directory' : 'Applicant Queue & Operations'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', background: '#f1f5f9', padding: 2, borderRadius: 8 }}>
                      <button
                        onClick={() => setActiveNav('overview')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          background: activeNav === 'overview' ? '#0f172a' : 'transparent',
                          color: activeNav === 'overview' ? '#ffffff' : '#64748b',
                        }}
                      >
                        Applications ({entries.length})
                      </button>
                      <button
                        onClick={() => setActiveNav('clients')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          background: activeNav === 'clients' ? '#0f172a' : 'transparent',
                          color: activeNav === 'clients' ? '#ffffff' : '#64748b',
                        }}
                      >
                        Clients / Users ({usersList.length})
                      </button>
                      <button
                        onClick={() => {
                          setActiveNav('tickets');
                          setTicketSubFilter('PENDING');
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          background: activeNav === 'tickets' ? '#0f172a' : 'transparent',
                          color: activeNav === 'tickets' ? '#ffffff' : '#64748b',
                        }}
                      >
                        Pending Review ({payments.length})
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', gap: 6 }}>
                      <Search size={13} color="#94a3b8" />
                      <input
                        type="text"
                        placeholder="Search applicant, ref, email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: '#0f172a', width: 170 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Table with responsive horizontal scroll */}
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  {activeNav === 'clients' ? (
                    <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>
                          <th style={{ padding: '10px 12px', width: 36 }}>
                            <input type="checkbox" />
                          </th>
                          <th style={{ padding: '10px 12px' }}>User Email & Profile</th>
                          <th style={{ padding: '10px 12px' }}>Account Status</th>
                          <th style={{ padding: '10px 12px' }}>Joined Date & Timestamp</th>
                          <th style={{ padding: '10px 12px' }}>Entries</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                              No users found matching query.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px' }}>
                                <input type="checkbox" />
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.isPaid ? '#dcfce7' : '#f1f5f9', color: u.isPaid ? '#15803d' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
                                    {u.email?.[0]?.toUpperCase() || 'U'}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.email}</div>
                                    <div style={{ fontSize: 11, color: '#64748b' }}>
                                      {u.fullName || (u.telegramUsername ? `@${u.telegramUsername}` : 'Applicant')}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                {u.isPaid ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>
                                    <Check size={12} /> Paid User (Active)
                                  </span>
                                ) : (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#64748b' }}>
                                    <Clock size={11} /> Normal (Unpaid)
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                  {new Date(u.createdAt).toLocaleDateString()}
                                </div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                  {new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <strong>{u.entriesCount}</strong> entries
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                <button
                                  onClick={() => setDeleteTarget({ type: 'user', id: u.id, name: u.email })}
                                  style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #fee2e2', background: '#ffffff', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                                >
                                  <Trash2 size={12} /> Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>
                          <th style={{ padding: '10px 12px', width: 36 }}>
                            <input
                              type="checkbox"
                              onChange={handleToggleSelectAll}
                              checked={selectedRows.length > 0 && selectedRows.length === filteredEntries.length}
                            />
                          </th>
                          <th style={{ padding: '10px 12px' }}>Ref Code</th>
                          <th style={{ padding: '10px 12px' }}>Applicant Name & Details</th>
                          <th style={{ padding: '10px 12px' }}>Priority</th>
                          <th style={{ padding: '10px 12px' }}>Status</th>
                          <th style={{ padding: '10px 12px' }}>Registered Date & Time</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions & Dossier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEntries.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                              No application records found.
                            </td>
                          </tr>
                        ) : (
                          filteredEntries.map((e) => {
                            const isSelected = selectedRows.includes(e.id);
                            return (
                              <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? '#f8fafc' : 'transparent' }}>
                                <td style={{ padding: '10px 12px' }}>
                                  <input type="checkbox" checked={isSelected} onChange={() => handleToggleRow(e.id)} />
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                                    #{e.uniqueReference}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{e.applicantName}</div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>
                                    {e.applicantEmail} • {e.gender === 'M' ? 'Male' : e.gender === 'F' ? 'Female' : 'N/A'}
                                  </div>
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: e.status === 'PAYMENT_PENDING' ? '#ef4444' : e.status === 'QUEUED' ? '#f59e0b' : '#10b981',
                                    }}
                                  >
                                    ● {e.status === 'PAYMENT_PENDING' ? 'High' : e.status === 'QUEUED' ? 'Medium' : 'Standard'}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  {e.status === 'CONFIRMED' || e.status === 'FILED' ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>
                                      <CheckCircle2 size={11} /> Delivered
                                    </span>
                                  ) : e.status === 'QUEUED' ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: '#ffedd5', color: '#c2410c' }}>
                                      <Clock size={11} /> In Queue
                                    </span>
                                  ) : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8' }}>
                                      <Clock size={11} /> In Review
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                    {new Date(e.createdAt).toLocaleDateString()}
                                  </div>
                                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                    {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                    <button
                                      onClick={() => setSelectedEntryForForm(e.id)}
                                      title="Full Form PDF"
                                      style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                    >
                                      <Printer size={12} /> Form PDF
                                    </button>
                                    <button
                                      onClick={() => handleQuickDownloadPhotos(e.id, e.uniqueReference)}
                                      title="Download Photos"
                                      style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: 11, cursor: 'pointer' }}
                                    >
                                      <Download size={12} />
                                    </button>
                                    <button
                                      onClick={() => setDeleteTarget({ type: 'entry', id: e.id, name: e.uniqueReference })}
                                      title="Delete Entry"
                                      style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #fee2e2', background: '#ffffff', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modal 1: Full DS-5501 Form Dossier (PDF / Print + Photos) */}
      {selectedEntryForForm && (
        <AdminFullFormModal entryId={selectedEntryForForm} onClose={() => setSelectedEntryForForm(null)} />
      )}

      {/* Modal 2: Delete Confirmation */}
      {deleteTarget && (
        <AdminDeleteConfirmModal
          title={`Delete ${deleteTarget.type === 'user' ? 'User' : 'Entry'} #${deleteTarget.name}`}
          subtitle={`Are you sure you want to permanently delete this ${deleteTarget.type}? Associated records will be removed.`}
          isDeleting={isDeleting}
          onConfirm={handleExecuteDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {/* Modal 3: Reject Payment */}
      {rejectModalPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)', zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, maxWidth: 500, width: '100%', padding: 24, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', border: '1px solid #fee2e2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <XCircle size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Reject Deposit</h3>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Ref: #{rejectModalPayment.entryRef || 'N/A'} • {rejectModalPayment.amountETB} ETB
                  </span>
                </div>
              </div>
              <button onClick={() => setRejectModalPayment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              style={{ width: '100%', borderRadius: 8, border: '1px solid #cbd5e1', padding: 10, fontSize: 13, marginBottom: 16, outline: 'none' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setRejectModalPayment(null)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" disabled={isRejecting || !rejectReason.trim()} onClick={handleConfirmReject} style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#ef4444', color: '#ffffff', border: 'none', cursor: 'pointer' }}>
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: 2FA TOTP Setup */}
      {activeNav === '2fa' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)', zIndex: 10003, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, maxWidth: 480, width: '100%', padding: 28, textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', color: '#6366f1' }}>
              <Key size={24} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a' }}>
              Staff Two-Factor Authentication (2FA)
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Protect administrative access with Google Authenticator or Microsoft Authenticator.
            </p>

            {!qrCode ? (
              <button
                onClick={async () => {
                  try {
                    const res = await apiRequest('/auth/staff/setup-2fa', { method: 'POST' });
                    if (res.success) {
                      setQrCode(res.data.qrCode);
                      setTotpSecret(res.data.secret);
                    }
                  } catch (err) {
                    setErrorMessage(err.message);
                  }
                }}
                style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#0f172a', color: '#ffffff', border: 'none', cursor: 'pointer' }}
              >
                Generate 2FA QR Code
              </button>
            ) : (
              <div>
                <img src={qrCode} alt="2FA QR Code" style={{ borderRadius: 8, margin: '0 auto 14px auto', display: 'block', maxWidth: 190 }} />
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                  Secret: <code style={{ color: '#6366f1' }}>{totpSecret}</code>
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const res = await apiRequest('/auth/staff/verify-2fa', { method: 'POST', body: JSON.stringify({ code: totpVerifyCode }) });
                      if (res.success) {
                        setMessage('✅ 2FA successfully activated on staff account!');
                        setQrCode('');
                        setActiveNav('overview');
                      }
                    } catch (err) {
                      setErrorMessage(err.message);
                    }
                  }}
                  style={{ display: 'flex', gap: 8, maxWidth: 280, margin: '0 auto' }}
                >
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={totpVerifyCode}
                    onChange={(e) => setTotpVerifyCode(e.target.value)}
                    style={{ flex: 1, textAlign: 'center', fontSize: 18, letterSpacing: 4, fontWeight: 700, borderRadius: 8, border: '1px solid #cbd5e1', padding: '8px 12px' }}
                  />
                  <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: '#10b981', color: '#ffffff', border: 'none', cursor: 'pointer' }}>
                    Verify
                  </button>
                </form>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <button onClick={() => setActiveNav('overview')} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Reports & Dispatch */}
      {activeNav === 'reports' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)', zIndex: 10003, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, maxWidth: 540, width: '100%', padding: 28, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileSpreadsheet size={22} color="#0f172a" />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                  Executive Reports & Reminders
                </h3>
              </div>
              <button onClick={() => setActiveNav('overview')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Trigger automated operational digests to your Telegram Admin Alerts channel or re-engage unpaid applicants:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Daily Executive Report</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Sends financial ledger and queue stats to Telegram</div>
                </div>
                <button onClick={handleSendTelegramReport} disabled={isSendingReport} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#0284c7', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Send size={13} /> {isSendingReport ? 'Sending...' : 'Send Telegram Report'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Applicant Payment Reminders</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Sends bot & email reminders to applicants with unpaid forms</div>
                </div>
                <button onClick={handleSendReminders} disabled={isSendingReminders} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#7c3aed', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Bell size={13} /> {isSendingReminders ? 'Sending...' : 'Send Reminders'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setActiveNav('overview')} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS for 100% Mobile & Tablet Responsiveness */}
      <style>{`
        @media (max-width: 1024px) {
          .admin-sidebar {
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            transform: translateX(-100%);
            box-shadow: 0 20px 40px rgba(0,0,0,0.25);
          }
          .admin-sidebar.drawer-open {
            transform: translateX(0) !important;
          }
          .mobile-hamburger-btn {
            display: inline-flex !important;
          }
          .admin-middle-grid {
            grid-template-columns: 1fr !important;
          }
          .filing-dual-pane {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .admin-header-container {
            padding: 16px 16px 0 16px !important;
          }
          .admin-body-padding {
            padding: 14px 16px 32px 16px !important;
          }
          .admin-metrics-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
