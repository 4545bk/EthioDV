import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../services/api.js';
import Alert from '../components/Alert.jsx';
import AdminFullFormModal from '../components/AdminFullFormModal.jsx';
import AdminDeleteConfirmModal from '../components/AdminDeleteConfirmModal.jsx';
import {
  LayoutGrid,
  Ticket,
  Users,
  UserCheck,
  BookOpen,
  Share2,
  Clock,
  Star,
  BarChart3,
  FileSpreadsheet,
  MessageSquare,
  HelpCircle,
  Settings,
  Search,
  Bell,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronsUpDown,
  TrendingUp,
  TrendingDown,
  Download,
  Trash2,
  Printer,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
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
  ArrowDownRight,
  Check,
  X
} from 'lucide-react';

export default function AdminDashboardPage({ onNavigate }) {
  // Navigation View State
  const [activeNav, setActiveNav] = useState('overview'); // 'overview' | 'tickets' | 'clients' | 'analytics' | 'reports' | '2fa'
  const [ticketSubFilter, setTicketSubFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'QUEUED' | 'CONFIRMED'
  const [userTypeFilter, setUserTypeFilter] = useState('ALL'); // 'ALL' | 'PAID' | 'NORMAL'

  // Data State
  const [entries, setEntries] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [payments, setPayments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activityTab, setActivityTab] = useState('today'); // 'today' | 'yesterday' | 'week'
  const [timeframe, setTimeframe] = useState('Last week');

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

  // Fetch all core dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [entriesRes, usersRes, paymentsRes, analyticsRes, activityRes] = await Promise.all([
        apiRequest('/admin/entries?limit=50').catch(() => ({ data: { entries: [] } })),
        apiRequest('/admin/users?limit=50').catch(() => ({ data: { users: [] } })),
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

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0f172a',
      }}
    >
      {/* ========================================================= */}
      {/* LEFT SIDEBAR (EXACT KRAVIO STYLING)                       */}
      {/* ========================================================= */}
      <aside
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
          zIndex: 40,
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '20px 20px 16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              K
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.4, color: '#0f172a' }}>
              Kravio
            </span>
          </div>

          <button
            title="Collapse sidebar"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 4,
              borderRadius: 6,
            }}
          >
            <Layers size={17} />
          </button>
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
              placeholder="Search anything"
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

        {/* Scrollable Nav Sections */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px 12px' }}>
          {/* Section: MAIN NAVIGATION */}
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

          {/* Nav Item: Overview */}
          <button
            onClick={() => setActiveNav('overview')}
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
              transition: 'background 0.15s ease',
            }}
          >
            <LayoutGrid size={17} color={activeNav === 'overview' ? '#0f172a' : '#64748b'} />
            <span>Overview</span>
          </button>

          {/* Nav Item: Tickets / Applications */}
          <div style={{ marginTop: 2 }}>
            <button
              onClick={() => setActiveNav('tickets')}
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
                <span>Tickets</span>
              </div>
              <ChevronDown size={14} color="#94a3b8" />
            </button>

            {/* Sub-items */}
            <div style={{ paddingLeft: 28, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button
                onClick={() => {
                  setActiveNav('tickets');
                  setTicketSubFilter('ALL');
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
                }}
              >
                All / My Queue
              </button>
              <button
                onClick={() => {
                  setActiveNav('tickets');
                  setTicketSubFilter('PENDING');
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
                <span>SLA Breach Risk</span>
                {payments.length > 0 && (
                  <span style={{ fontSize: 10, background: '#fee2e2', color: '#ef4444', padding: '1px 6px', borderRadius: 9999, fontWeight: 700 }}>
                    {payments.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveNav('tickets');
                  setTicketSubFilter('QUEUED');
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
                }}
              >
                Escalations
              </button>
            </div>
          </div>

          {/* Nav Item: Clients (The Users & Joined Timestamps View) */}
          <button
            onClick={() => setActiveNav('clients')}
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
              <span>Clients</span>
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
              {usersList.length || 0}
            </span>
          </button>

          {/* Nav Item: Agents & Teams (Operator Station) */}
          <button
            onClick={() => onNavigate('operator')}
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
              background: 'transparent',
              color: '#475569',
              textAlign: 'left',
              marginTop: 2,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserCheck size={17} color="#64748b" />
              <span>Agents & Teams</span>
            </div>
            <ChevronRight size={14} color="#94a3b8" />
          </button>

          {/* Nav Item: Knowledge Base */}
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
            <span>Knowledge Base</span>
          </button>

          {/* Nav Item: Integrations */}
          <button
            onClick={handleSendTelegramReport}
            title="Click to trigger instant Telegram test report"
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
            <span>Integrations</span>
          </button>

          {/* Section: ANALYTICS & INSIGHTS */}
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
            ANALYTICS & INSIGHTS
          </div>

          <button
            onClick={() => setActiveNav('overview')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: '#475569',
              textAlign: 'left',
            }}
          >
            <Clock size={16} color="#64748b" />
            <span>SLA Compliance</span>
          </button>

          <button
            onClick={() => setActiveNav('overview')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: '#475569',
              textAlign: 'left',
            }}
          >
            <Star size={16} color="#64748b" />
            <span>CSAT & NPS</span>
          </button>

          <button
            onClick={() => setActiveNav('overview')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: '#475569',
              textAlign: 'left',
            }}
          >
            <BarChart3 size={16} color="#64748b" />
            <span>Workload Analytics</span>
          </button>

          <button
            onClick={() => setActiveNav('reports')}
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
              <span>Reports</span>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: 4 }}>
              LIVE
            </span>
          </button>

          {/* Section: SUPPORT */}
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
            SUPPORT
          </div>

          <button
            onClick={() => onNavigate('faq')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: '#475569',
              textAlign: 'left',
            }}
          >
            <MessageSquare size={16} color="#64748b" />
            <span>Feedback</span>
          </button>

          <button
            onClick={() => onNavigate('faq')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              color: '#475569',
              textAlign: 'left',
            }}
          >
            <HelpCircle size={16} color="#64748b" />
            <span>Help & Support</span>
          </button>

          <button
            onClick={() => setActiveNav('2fa')}
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
            <span>Settings</span>
          </button>
        </div>

        {/* Bottom Profile Pill (Exact Kravio Avatar Box) */}
        <div
          style={{
            padding: '12px 14px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
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
                  background: '#e2e8f0',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 12,
                  position: 'relative',
                }}
              >
                SW
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
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Samantha Walker</div>
                <div style={{ fontSize: 11, color: '#64748b', maxWidth: 125, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  samanwalker@gmail.com
                </div>
              </div>
            </div>
            <ChevronsUpDown size={15} color="#94a3b8" />
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA                                         */}
      {/* ========================================================= */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top Header Row */}
        <header
          style={{
            padding: '24px 32px 0 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Breadcrumbs + Right Tools */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
              <LayoutGrid size={14} color="#64748b" />
              <span>Overview</span>
              <span>/</span>
              <span style={{ color: '#0f172a', fontWeight: 600 }}>Dashboard</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Date Filter Dropdown */}
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                <Calendar size={14} color="#64748b" />
                <span>{timeframe}</span>
                <ChevronDown size={14} color="#94a3b8" />
              </button>

              {/* Notification Bell */}
              <button
                title="Notifications"
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
                <Bell size={16} />
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

              {/* Settings Cog */}
              <button
                onClick={() => setActiveNav('2fa')}
                title="Staff Settings & 2FA"
                style={{
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
                <Settings size={16} />
              </button>

              {/* Public Site Link */}
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
                  fontWeight: 600,
                  color: '#6366f1',
                  cursor: 'pointer',
                }}
              >
                Public Site <ArrowUpRight size={13} />
              </button>
            </div>
          </div>

          {/* Large Greeting Header */}
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px 0', color: '#0f172a', letterSpacing: -0.5 }}>
              Hello, Samantha Walker 👋
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
              Here are the latest insights from your customer interactions.
            </p>
          </div>
        </header>

        {/* Alerts Banner */}
        <div style={{ padding: '16px 32px 0 32px' }}>
          {message && <Alert type="success" message={message} onClose={() => setMessage('')} />}
          {errorMessage && <Alert type="danger" message={errorMessage} onClose={() => setErrorMessage('')} />}
        </div>

        {/* Dashboard Body Container */}
        <div style={{ padding: '20px 32px 40px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* ========================================================= */}
          {/* ROW 1: 3 METRIC CARDS WITH SPARKLINES                     */}
          {/* ========================================================= */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {/* Metric Card 1: Current Tickets */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Current Tickets</span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                  }}
                >
                  <Ticket size={15} />
                </div>
              </div>

              <div style={{ margin: '14px 0 10px 0' }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', letterSpacing: -0.5 }}>
                  {analytics?.counts?.totalSubmitted ? analytics.counts.totalSubmitted.toLocaleString() : '3,484'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#10b981' }}>
                  <TrendingUp size={13} />
                  <span>+7.1%</span>
                  <span style={{ color: '#94a3b8', fontWeight: 500 }}>vs last week</span>
                </div>
                {/* Green Sparkline SVG */}
                <svg width="84" height="24" viewBox="0 0 84 24" fill="none">
                  <path
                    d="M1 18C12 18 16 7 24 10C32 13 36 3 45 7C54 11 60 4 70 8C76 10 79 3 83 2"
                    stroke="#10b981"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Metric Card 2: Daily Avg. Resolution */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Daily Avg. Resolution</span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                  }}
                >
                  <Zap size={15} />
                </div>
              </div>

              <div style={{ margin: '14px 0 10px 0' }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', letterSpacing: -0.5 }}>
                  {analytics?.counts?.totalPaid ? analytics.counts.totalPaid.toLocaleString() : '486'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#14b8a6' }}>
                  <TrendingUp size={13} />
                  <span>+2%</span>
                  <span style={{ color: '#94a3b8', fontWeight: 500 }}>vs last week</span>
                </div>
                {/* Teal Sparkline SVG */}
                <svg width="84" height="24" viewBox="0 0 84 24" fill="none">
                  <path
                    d="M1 20C10 20 18 12 28 14C38 16 42 6 52 8C62 10 68 3 75 5C78 6 81 2 83 2"
                    stroke="#14b8a6"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Metric Card 3: SLA Compliance Rate */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>SLA Compliance Rate</span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                  }}
                >
                  <Clock size={15} />
                </div>
              </div>

              <div style={{ margin: '14px 0 10px 0' }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', letterSpacing: -0.5 }}>
                  {analytics?.funnel?.conversionRateOverall || '92%'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#f43f5e' }}>
                  <TrendingDown size={13} />
                  <span>-1.3%</span>
                  <span style={{ color: '#94a3b8', fontWeight: 500 }}>vs last week</span>
                </div>
                {/* Coral Sparkline SVG */}
                <svg width="84" height="24" viewBox="0 0 84 24" fill="none">
                  <path
                    d="M1 6C14 6 22 17 32 15C42 13 48 20 58 18C68 16 74 21 83 22"
                    stroke="#f43f5e"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* ROW 2: TICKET VOLUME TREND CHART + LATEST UPDATES FEED    */}
          {/* ========================================================= */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1.1fr', gap: 16 }}>
            {/* Chart: Ticket Volume Trend */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '22px 24px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Chart Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={16} color="#64748b" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Ticket Volume Trend</span>
                </div>

                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    fontSize: 12,
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  <Calendar size={12} />
                  <span>Last week</span>
                  <ChevronDown size={12} />
                </button>
              </div>

              {/* Chart Headline Metric */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>4,790</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>+8% vs last week</span>
              </div>

              {/* Realistic SVG / CSS Bar Chart with Tue: 584 highlighted tooltip */}
              <div style={{ flex: 1, minHeight: 220, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                {/* Horizontal reference lines & Y-axis labels */}
                <div style={{ position: 'absolute', inset: '0 0 28px 0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                  {[800, 600, 400, 200].map((y) => (
                    <div key={y} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <div style={{ flex: 1, borderTop: y === 600 ? '1px dashed #cbd5e1' : '1px solid #f1f5f9' }} />
                      <span style={{ fontSize: 11, color: '#94a3b8', width: 34, textAlign: 'right', paddingLeft: 6 }}>
                        {y}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bars Area (Sun - Sat) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-around',
                    height: 180,
                    paddingRight: 34,
                    zIndex: 2,
                  }}
                >
                  {[
                    { day: 'Sun', h1: 85, h2: 110, active: false },
                    { day: 'Mon', h1: 105, h2: 135, active: false },
                    { day: 'Tue', h1: 140, h2: 165, val: 584, active: true },
                    { day: 'Wed', h1: 115, h2: 145, active: false },
                    { day: 'Thu', h1: 130, h2: 155, active: false },
                    { day: 'Fri', h1: 90, h2: 120, active: false },
                    { day: 'Sat', h1: 65, h2: 85, active: false },
                  ].map((bar) => (
                    <div
                      key={bar.day}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative',
                        width: 48,
                      }}
                    >
                      {/* Active Tue Tooltip */}
                      {bar.active && (
                        <div
                          style={{
                            position: 'absolute',
                            top: -34,
                            background: '#0f172a',
                            color: '#ffffff',
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span>Tue : {bar.val}</span>
                          <div
                            style={{
                              position: 'absolute',
                              bottom: -4,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: 0,
                              height: 0,
                              borderLeft: '4px solid transparent',
                              borderRight: '4px solid transparent',
                              borderTop: '4px solid #0f172a',
                            }}
                          />
                        </div>
                      )}

                      {/* Bar Group (two pill bars) */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                        <div
                          style={{
                            width: 14,
                            height: bar.h1,
                            borderRadius: 4,
                            background: bar.active ? '#1e293b' : '#e2e8f0',
                            transition: 'height 0.3s ease',
                          }}
                        />
                        <div
                          style={{
                            width: 14,
                            height: bar.h2,
                            borderRadius: 4,
                            background: bar.active ? '#0f172a' : '#cbd5e1',
                            transition: 'height 0.3s ease',
                          }}
                        />
                      </div>

                      {/* Day Label */}
                      <span style={{ fontSize: 11, color: '#64748b', marginTop: 10, fontWeight: 500 }}>
                        {bar.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Card: Latest Updates (Activity Feed) */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '22px 20px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Latest Updates</span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <MoreVertical size={16} />
                </button>
              </div>

              {/* Segmented Filter Pills */}
              <div
                style={{
                  display: 'flex',
                  background: '#f1f5f9',
                  padding: 3,
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'week', label: 'This week' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActivityTab(t.id)}
                    style={{
                      flex: 1,
                      padding: '5px 0',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: activityTab === t.id ? '#0f172a' : 'transparent',
                      color: activityTab === t.id ? '#ffffff' : '#64748b',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Search activities */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '6px 10px',
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                <Search size={13} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search activities"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: 12,
                    color: '#0f172a',
                    width: '100%',
                  }}
                />
              </div>

              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, fontWeight: 500 }}>
                {activityFeed.length ? `${activityFeed.length} new activities today` : '8 new activities today'}
              </div>

              {/* Activity Feed Items */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  {
                    icon: Ticket,
                    iconBg: '#eff6ff',
                    iconColor: '#3b82f6',
                    title: 'Ticket Updated',
                    sub: 'Ticket #2319 SLA updated',
                    time: '11:20 AM',
                  },
                  {
                    icon: Users,
                    iconBg: '#f0fdf4',
                    iconColor: '#16a34a',
                    title: 'New Client Added',
                    sub: 'PT. Alpha Indonesia registered',
                    time: '11:15 AM',
                  },
                  {
                    icon: MessageSquare,
                    iconBg: '#faf5ff',
                    iconColor: '#9333ea',
                    title: 'Agent Reassigned',
                    sub: 'Ticket #2322 moved to Michael Wong',
                    time: '11:00 AM',
                  },
                  {
                    icon: AlertTriangle,
                    iconBg: '#fef2f2',
                    iconColor: '#ef4444',
                    title: 'SLA Breach Risk',
                    sub: 'Ticket #2320 "Login issue"',
                    time: '10:45 AM',
                  },
                  {
                    icon: BookOpen,
                    iconBg: '#f0fdfa',
                    iconColor: '#0d9488',
                    title: 'Knowledge Base',
                    sub: 'New article published: "Login Troubleshooting"',
                    time: '10:30 AM',
                  },
                  {
                    icon: Star,
                    iconBg: '#fefce8',
                    iconColor: '#ca8a04',
                    title: 'Customer Feedback',
                    sub: '"Great support response, thanks Sarah!"',
                    time: '10:30 AM',
                  },
                ].map((act, i) => {
                  const Icon = act.icon;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: act.iconBg,
                            color: act.iconColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={16} />
                        </div>
                        <div style={{ minWidth: 0, lineHeight: 1.25 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{act.title}</div>
                          <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {act.sub}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {act.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* ROW 3: SLA MONITORING / DATA MANAGEMENT TABLE             */}
          {/* ========================================================= */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Table Header & Tabs */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 14,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={18} color="#0f172a" />
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    {activeNav === 'clients' ? 'Clients & Users Directory' : 'SLA Monitoring'}
                  </span>
                </div>

                {/* View Tabs */}
                <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
                  <button
                    onClick={() => setActiveNav('overview')}
                    style={{
                      padding: '4px 12px',
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
                      padding: '4px 12px',
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
                      padding: '4px 12px',
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

              {/* Table Controls (Search, Filter, Actions) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '6px 12px',
                    gap: 6,
                  }}
                >
                  <Search size={14} color="#94a3b8" />
                  <input
                    type="text"
                    placeholder={activeNav === 'clients' ? 'Search user email / name...' : 'Search ticket or applicant...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: 13,
                      color: '#0f172a',
                      width: 170,
                    }}
                  />
                </div>

                {activeNav === 'clients' ? (
                  <div style={{ display: 'flex', background: '#f1f5f9', padding: 2, borderRadius: 6 }}>
                    {['ALL', 'PAID', 'NORMAL'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setUserTypeFilter(f)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          background: userTypeFilter === f ? '#ffffff' : 'transparent',
                          color: userTypeFilter === f ? '#0f172a' : '#64748b',
                          boxShadow: userTypeFilter === f ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        }}
                      >
                        {f === 'ALL' ? 'All' : f === 'PAID' ? 'Paid Users' : 'Normal / Unpaid'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 12px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    <Filter size={13} />
                    <span>Filter</span>
                  </button>
                )}

                <button
                  title="More actions"
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  <MoreVertical size={15} />
                </button>
              </div>
            </div>

            {/* TABLE CONTENT */}
            {activeNav === 'clients' ? (
              /* ========================================================= */
              /* CLIENTS / USERS VIEW (EMAILS, NORMAL/PAID, TIMESTAMPS)    */
              /* ========================================================= */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>
                      <th style={{ padding: '10px 14px', width: 40 }}>
                        <input type="checkbox" />
                      </th>
                      <th style={{ padding: '10px 14px' }}>User Email & Profile ⇅</th>
                      <th style={{ padding: '10px 14px' }}>Account Status ⇅</th>
                      <th style={{ padding: '10px 14px' }}>Joined Date & Timestamp ⇅</th>
                      <th style={{ padding: '10px 14px' }}>Applications ⇅</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                          No users found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr
                          key={u.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '12px 14px' }}>
                            <input type="checkbox" />
                          </td>

                          {/* Email & Avatar */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: u.isPaid ? '#dcfce7' : '#f1f5f9',
                                  color: u.isPaid ? '#15803d' : '#64748b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: 12,
                                }}
                              >
                                {u.email?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.email}</div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                  {u.fullName || (u.telegramUsername ? `@${u.telegramUsername}` : 'Applicant')} • Auth:{' '}
                                  {u.authProvider}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Account Status: Normal vs Paid */}
                          <td style={{ padding: '12px 14px' }}>
                            {u.isPaid ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '3px 10px',
                                  borderRadius: 9999,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  background: '#dcfce7',
                                  color: '#15803d',
                                }}
                              >
                                <Check size={13} /> Paid User (Active)
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '3px 10px',
                                  borderRadius: 9999,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  background: '#f1f5f9',
                                  color: '#64748b',
                                }}
                              >
                                <Clock size={12} /> Normal (Unpaid)
                              </span>
                            )}
                          </td>

                          {/* Joined Date & Exact Timestamp */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {new Date(u.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>
                              {new Date(u.createdAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </div>
                          </td>

                          {/* Applications Count */}
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{u.entriesCount}</span>
                            <span style={{ color: '#64748b', fontSize: 12 }}> entries</span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                              <button
                                onClick={() =>
                                  setDeleteTarget({
                                    type: 'user',
                                    id: u.id,
                                    name: u.email,
                                  })
                                }
                                title="Delete user"
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #fee2e2',
                                  background: '#ffffff',
                                  color: '#ef4444',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ========================================================= */
              /* APPLICATIONS / TICKETS VIEW (EXACT SLA MONITORING COLUMNS)*/
              /* ========================================================= */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>
                      <th style={{ padding: '10px 14px', width: 40 }}>
                        <input
                          type="checkbox"
                          onChange={handleToggleSelectAll}
                          checked={selectedRows.length > 0 && selectedRows.length === filteredEntries.length}
                        />
                      </th>
                      <th style={{ padding: '10px 14px' }}>Ticket ID ⇅</th>
                      <th style={{ padding: '10px 14px' }}>Subject & Applicant ⇅</th>
                      <th style={{ padding: '10px 14px' }}>Priority ⇅</th>
                      <th style={{ padding: '10px 14px' }}>Assigned To ⇅</th>
                      <th style={{ padding: '10px 14px' }}>Status ⇅</th>
                      <th style={{ padding: '10px 14px' }}>Created Date ⇅</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>SLA Due / Actions ⇅</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                          No application records found.
                        </td>
                      </tr>
                    ) : (
                      filteredEntries.map((e) => {
                        const isSelected = selectedRows.includes(e.id);
                        return (
                          <tr
                            key={e.id}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: isSelected ? '#f8fafc' : 'transparent',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <td style={{ padding: '12px 14px' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleRow(e.id)}
                              />
                            </td>

                            {/* Ticket ID */}
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                                #{e.uniqueReference}
                              </span>
                            </td>

                            {/* Subject & Applicant */}
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{e.applicantName}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                {e.applicantEmail} • {e.gender === 'M' ? 'Male' : e.gender === 'F' ? 'Female' : 'N/A'} • Edu:{' '}
                                {e.education || 'High School'}
                              </div>
                            </td>

                            {/* Priority */}
                            <td style={{ padding: '12px 14px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color:
                                    e.status === 'PAYMENT_PENDING'
                                      ? '#ef4444'
                                      : e.status === 'QUEUED'
                                      ? '#f59e0b'
                                      : '#10b981',
                                }}
                              >
                                <span style={{ fontSize: 14 }}>●</span>
                                {e.status === 'PAYMENT_PENDING' ? 'High' : e.status === 'QUEUED' ? 'Medium' : 'Low'}
                              </span>
                            </td>

                            {/* Assigned To */}
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <div
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    background: '#e2e8f0',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {e.applicantName?.[0] || 'A'}
                                </div>
                                <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
                                  {e.status === 'CONFIRMED' || e.status === 'FILED' ? 'Filing Bot' : 'Sarah Lee'}
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '12px 14px' }}>
                              {e.status === 'CONFIRMED' || e.status === 'FILED' ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '3px 10px',
                                    borderRadius: 9999,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: '#dcfce7',
                                    color: '#15803d',
                                  }}
                                >
                                  <CheckCircle2 size={12} /> Delivered
                                </span>
                              ) : e.status === 'QUEUED' ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '3px 10px',
                                    borderRadius: 9999,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: '#ffedd5',
                                    color: '#c2410c',
                                  }}
                                >
                                  <Clock size={12} /> In Progress
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '3px 10px',
                                    borderRadius: 9999,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                  }}
                                >
                                  <Clock size={12} /> In Review
                                </span>
                              )}
                            </td>

                            {/* Created Date with exact timestamp */}
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                {new Date(e.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                })}
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                {new Date(e.createdAt).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </td>

                            {/* SLA Due / Actions */}
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                {/* Download Form (PDF) */}
                                <button
                                  onClick={() => setSelectedEntryForForm(e.id)}
                                  title="Download / Print Full Form in PDF"
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#0f172a',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <Printer size={13} /> Form PDF
                                </button>

                                {/* Download Photos */}
                                <button
                                  onClick={() => handleQuickDownloadPhotos(e.id, e.uniqueReference)}
                                  title="Download All Photos"
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: 6,
                                    border: '1px solid #cbd5e1',
                                    background: '#f8fafc',
                                    color: '#0f172a',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <Download size={13} />
                                </button>

                                {/* Delete Entry */}
                                <button
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: 'entry',
                                      id: e.id,
                                      name: e.uniqueReference,
                                    })
                                  }
                                  title="Delete Entry"
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: 6,
                                    border: '1px solid #fee2e2',
                                    background: '#ffffff',
                                    color: '#ef4444',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: FULL DS-5501 FORM DOSSIER (PDF / PRINT + PHOTOS) */}
      {/* ========================================================= */}
      {selectedEntryForForm && (
        <AdminFullFormModal
          entryId={selectedEntryForForm}
          onClose={() => setSelectedEntryForForm(null)}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 2: DELETE CONFIRMATION DIALOG                       */}
      {/* ========================================================= */}
      {deleteTarget && (
        <AdminDeleteConfirmModal
          title={`Delete ${deleteTarget.type === 'user' ? 'User' : 'Entry'} #${deleteTarget.name}`}
          subtitle={`Are you sure you want to permanently delete this ${deleteTarget.type}? All associated documents, submissions, and payments will be removed.`}
          isDeleting={isDeleting}
          onConfirm={handleExecuteDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 3: REJECT PAYMENT WITH PRESETS                      */}
      {/* ========================================================= */}
      {rejectModalPayment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            zIndex: 10002,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isRejecting) setRejectModalPayment(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 500,
              width: '100%',
              padding: 24,
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              border: '1px solid #fee2e2',
            }}
          >
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

            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              Select a preset or enter the specific reason why this bank deposit could not be verified:
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {[
                'ደረሰኙ በባንክ ስቴትመንት ላይ አልተገኘም (Unverified)',
                'ደረሰኙ በግልጽ አይነበብም (Blurry/Unreadable)',
                'የትራንዛክሽን ቁጥሩ የተሳሳተ ነው (Invalid Txn Code)',
                'አስቀድሞ በሌላ አመልካች የተመዘገበ ኮድ (Duplicate claim)',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRejectReason(preset)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 9999,
                    fontSize: 11,
                    border: '1px solid',
                    borderColor: rejectReason === preset ? '#ef4444' : '#e2e8f0',
                    background: rejectReason === preset ? '#fef2f2' : '#ffffff',
                    color: rejectReason === preset ? '#ef4444' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              style={{
                width: '100%',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                padding: 10,
                fontSize: 13,
                marginBottom: 16,
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                disabled={isRejecting}
                onClick={() => setRejectModalPayment(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRejecting || !rejectReason.trim()}
                onClick={handleConfirmReject}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                }}
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: STAFF 2FA TOTP SECURITY SETUP                    */}
      {/* ========================================================= */}
      {activeNav === '2fa' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            zIndex: 10003,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveNav('overview');
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              padding: 28,
              textAlign: 'center',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
                color: '#6366f1',
              }}
            >
              <Key size={24} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a' }}>
              Staff Two-Factor Authentication (2FA)
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Protect your administrative access using Google Authenticator, Microsoft Authenticator, or 1Password.
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
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                }}
              >
                Generate 2FA QR Code
              </button>
            ) : (
              <div>
                <img
                  src={qrCode}
                  alt="2FA QR Code"
                  style={{ borderRadius: 8, margin: '0 auto 14px auto', display: 'block', maxWidth: 190 }}
                />
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                  Secret: <code style={{ color: '#6366f1' }}>{totpSecret}</code>
                </p>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const res = await apiRequest('/auth/staff/verify-2fa', {
                        method: 'POST',
                        body: JSON.stringify({ code: totpVerifyCode }),
                      });
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
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: 18,
                      letterSpacing: 4,
                      fontWeight: 700,
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      padding: '8px 12px',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Verify
                  </button>
                </form>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <button
                onClick={() => setActiveNav('overview')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: REPORTS & TELEGRAM DISPATCH CENTER               */}
      {/* ========================================================= */}
      {activeNav === 'reports' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            zIndex: 10003,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveNav('overview');
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 540,
              width: '100%',
              padding: 28,
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
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
              Trigger automated operational digests to your Telegram Admin Alerts channel, or re-engage applicants who have not completed payment:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Daily Executive Report</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Sends financial ledger, queue volume, and filing stats to Telegram channel
                  </div>
                </div>
                <button
                  onClick={handleSendTelegramReport}
                  disabled={isSendingReport}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Send size={13} /> {isSendingReport ? 'Sending...' : 'Send Telegram Report'}
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Applicant Payment Reminders</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Sends Telegram bot and email reminders to applicants with unpaid forms
                  </div>
                </div>
                <button
                  onClick={handleSendReminders}
                  disabled={isSendingReminders}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    background: '#7c3aed',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Bell size={13} /> {isSendingReminders ? 'Sending...' : 'Send Reminders'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setActiveNav('overview')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
