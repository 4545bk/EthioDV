import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './i18n/index.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import DisclaimerBanner from './components/DisclaimerBanner.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import SocialProofToast from './components/SocialProofToast.jsx';
import UnpaidReminderBanner from './components/UnpaidReminderBanner.jsx';
import FloatingSupportWidget from './components/FloatingSupportWidget.jsx';
import NotificationPrompt from './components/NotificationPrompt.jsx';

// Pages
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import FormWizardPage from './pages/FormWizardPage.jsx';
import PaymentPage from './pages/PaymentPage.jsx';
import StatusTrackerPage from './pages/StatusTrackerPage.jsx';
import RefundPolicyPage from './pages/RefundPolicyPage.jsx';
import FaqPage from './pages/FaqPage.jsx';
import OperatorStationPage from './pages/OperatorStationPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import PhotoGuidePage from './pages/PhotoGuidePage.jsx';


function getInitialPage() {
  const path = window.location.pathname.replace(/^\//, '').toLowerCase();
  if (path === 'photo-tool' || path === 'photo-guide' || path === 'photo') return 'photo-guide';
  if (path === 'login') return 'login';
  if (path === 'dashboard') return 'dashboard';
  if (path === 'faq') return 'faq';
  if (path === 'refund') return 'refund';
  if (path === 'operator') return 'operator';
  if (path === 'admin') return 'admin';
  if (path === 'wizard') return 'wizard';
  if (path === 'tracker') return 'tracker';
  return 'home';
}

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [pageParams, setPageParams] = useState({});

  const navigateTo = (page, params = {}) => {
    setCurrentPage(page);
    setPageParams(params);
    const targetPath = page === 'home' ? '/' : `/${page === 'photo-guide' ? 'photo-tool' : page}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getInitialPage());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Route protection
  useEffect(() => {
    if (!loading) {
      if ((currentPage === 'operator' || currentPage === 'admin') && (!user || user.role === 'applicant')) {
        setCurrentPage('login');
      }
      if (currentPage === 'dashboard' && !user) {
        setCurrentPage('login');
      }
    }
  }, [currentPage, user, loading]);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <LandingPage onNavigate={navigateTo} />;
      case 'login':
        return <LoginPage onNavigate={navigateTo} />;
      case 'dashboard':
        return <DashboardPage onNavigate={navigateTo} />;
      case 'wizard':
        return <FormWizardPage onNavigate={navigateTo} entryId={pageParams.entryId} />;
      case 'payment':
        return <PaymentPage onNavigate={navigateTo} entryId={pageParams.entryId} />;
      case 'tracker':
        return <StatusTrackerPage onNavigate={navigateTo} entryId={pageParams.entryId} searchRef={pageParams.ref} />;
      case 'refund':
        return <RefundPolicyPage onNavigate={navigateTo} entryId={pageParams.entryId} />;
      case 'faq':
        return <FaqPage onNavigate={navigateTo} />;
      case 'operator':
        return <OperatorStationPage onNavigate={navigateTo} />;
      case 'admin':
        return <AdminDashboardPage onNavigate={navigateTo} />;
      case 'photo-guide':
        return <PhotoGuidePage onNavigate={navigateTo} />;
      default:
        return <LandingPage onNavigate={navigateTo} />;
    }
  };

  if (currentPage === 'admin') {
    if (loading) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Verifying credentials...</p>
          </div>
        </div>
      );
    }
    if (!user || user.role === 'applicant') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <DisclaimerBanner />
          <Navbar onNavigate={navigateTo} currentPage="login" />
          <main className="main-content">
            <LoginPage onNavigate={navigateTo} />
          </main>
          <Footer onNavigate={navigateTo} />
        </div>
      );
    }
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <AdminDashboardPage onNavigate={navigateTo} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Mandatory US Government disclaimer on every page */}
      <DisclaimerBanner />

      <Navbar onNavigate={navigateTo} currentPage={currentPage} />

      {/* Persistent reminder banner for logged-in users with unpaid applications */}
      <UnpaidReminderBanner onNavigate={navigateTo} currentPage={currentPage} />

      {/* Polite native browser push notification prompt */}
      <NotificationPrompt />

      <main className="main-content">
        {renderPage()}
      </main>

      {/* Subtle, live entrant activity toast */}
      <SocialProofToast />

      {/* Floating 24/7 phone & Telegram customer support widget */}
      <FloatingSupportWidget onNavigate={navigateTo} />

      <Footer onNavigate={navigateTo} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
