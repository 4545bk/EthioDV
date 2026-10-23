import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../i18n/index.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { Globe, Shield, User, LogOut, FileText, CheckCircle2, Sun, Moon, Camera, Menu, X, Phone, ShieldCheck, HelpCircle, FileCheck, Search } from 'lucide-react';

export default function Navbar({ onNavigate, currentPage }) {
  const { language, setLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isStaff = user?.role === 'operator' || user?.role === 'superadmin';

  // Close mobile drawer on route change
  const navigateAndClose = (page, params) => {
    setMobileMenuOpen(false);
    onNavigate(page, params);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitial = (
    user?.fullName?.[0] ||
    user?.name?.[0] ||
    user?.email?.[0] ||
    user?.username?.[0] ||
    'U'
  ).toUpperCase();

  const userDisplayName = user?.fullName || user?.name || user?.username || user?.email?.split('@')[0] || 'User';

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigateAndClose('home');
          }}
          className="brand-logo"
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, var(--primary-600), #9333ea)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
              flexShrink: 0,
            }}
          >
            <Shield size={20} color="#ffffff" />
          </div>
          <span className="text-gradient" style={{ fontWeight: 800, fontSize: 18 }}>{t('brandName')}</span>
        </a>

        {/* ================= DESKTOP NAVIGATION ================= */}
        <nav className="hide-on-mobile" style={{ alignItems: 'center', gap: 10 }}>
          {/* Main Navigation Links */}
          <button
            onClick={() => onNavigate('home')}
            className="btn btn-secondary"
            style={{
              padding: '7px 14px',
              fontSize: 13,
              borderRadius: 9999,
              background: currentPage === 'home' ? 'rgba(124, 58, 237, 0.12)' : undefined,
              borderColor: currentPage === 'home' ? 'var(--primary-400)' : undefined,
            }}
          >
            {t('home')}
          </button>

          {/* Photo Guidelines / Tool Route */}
          <button
            onClick={() => onNavigate('photo-guide')}
            className="btn btn-secondary"
            style={{
              padding: '7px 14px',
              fontSize: 13,
              borderRadius: 9999,
              background: currentPage === 'photo-guide' ? 'rgba(124, 58, 237, 0.12)' : undefined,
              borderColor: currentPage === 'photo-guide' ? 'var(--primary-400)' : undefined,
            }}
          >
            <Camera size={14} />
            {t('photoGuide')}
          </button>

          {user && !isStaff && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="btn btn-secondary"
              style={{
                padding: '7px 14px',
                fontSize: 13,
                borderRadius: 9999,
                background: currentPage === 'dashboard' ? 'rgba(124, 58, 237, 0.12)' : undefined,
                borderColor: currentPage === 'dashboard' ? 'var(--primary-400)' : undefined,
              }}
            >
              <FileText size={14} />
              {t('myApplications')}
            </button>
          )}

          {user?.role === 'operator' && (
            <button
              onClick={() => onNavigate('operator')}
              className="btn btn-secondary"
              style={{
                padding: '7px 14px',
                fontSize: 13,
                borderRadius: 9999,
                borderColor: 'var(--primary-400)',
                background: currentPage === 'operator' ? 'rgba(124, 58, 237, 0.15)' : undefined,
              }}
            >
              <CheckCircle2 size={14} color="#8b5cf6" />
              {t('operatorStation')}
            </button>
          )}

          {user?.role === 'superadmin' && (
            <button
              onClick={() => onNavigate('admin')}
              className="btn btn-secondary"
              style={{
                padding: '7px 14px',
                fontSize: 13,
                borderRadius: 9999,
                borderColor: 'var(--accent-500)',
                background: currentPage === 'admin' ? 'rgba(20, 184, 166, 0.15)' : undefined,
              }}
            >
              <Shield size={14} color="#14b8a6" />
              {t('adminDashboard')}
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className="btn btn-secondary"
            style={{
              padding: '7px 10px',
              borderRadius: 9999,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun size={15} color="#fbbf24" />
            ) : (
              <Moon size={15} color="#7c3aed" />
            )}
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'am' ? 'en' : 'am')}
            className="btn btn-secondary"
            style={{ padding: '7px 12px', fontSize: 12, gap: 5, borderRadius: 9999 }}
            title="Switch Language / ቋንቋ ቀይር"
          >
            <Globe size={13} />
            <strong>{language === 'am' ? 'EN' : 'አማርኛ'}</strong>
          </button>

          {/* Auth State with Avatar Dropdown */}
          {user ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="btn"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, var(--primary-600), #9333ea)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: dropdownOpen
                    ? '0 0 0 3px rgba(124, 58, 237, 0.35)'
                    : '0 2px 8px rgba(124, 58, 237, 0.25)',
                  cursor: 'pointer',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  transition: 'all var(--transition-fast)'
                }}
                title={user.email || userDisplayName}
                aria-label="User profile menu"
              >
                {userInitial}
              </button>

              {dropdownOpen && (
                <div
                  className="card animate-fade-in"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    width: 240,
                    padding: 12,
                    borderRadius: 16,
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
                    zIndex: 1000,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px 10px 6px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary-600), #9333ea)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 14,
                        flexShrink: 0
                      }}
                    >
                      {userInitial}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {userDisplayName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {user.email || user.username}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                    <button
                      onClick={() => {
                        onNavigate('dashboard');
                        setDropdownOpen(false);
                      }}
                      className="btn btn-secondary"
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: 'none' }}
                    >
                      <FileText size={14} color="var(--primary-500)" />
                      {t('myApplications')}
                    </button>

                    <button
                      onClick={() => {
                        onNavigate('photo-guide');
                        setDropdownOpen(false);
                      }}
                      className="btn btn-secondary"
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: 'none' }}
                    >
                      <Camera size={14} color="var(--primary-500)" />
                      {t('photoGuide')}
                    </button>

                    {user?.role === 'operator' && (
                      <button
                        onClick={() => {
                          onNavigate('operator');
                          setDropdownOpen(false);
                        }}
                        className="btn btn-secondary"
                        style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: 'none' }}
                      >
                        <CheckCircle2 size={14} color="#8b5cf6" />
                        {t('operatorStation')}
                      </button>
                    )}

                    {user?.role === 'superadmin' && (
                      <button
                        onClick={() => {
                          onNavigate('admin');
                          setDropdownOpen(false);
                        }}
                        className="btn btn-secondary"
                        style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: 'none' }}
                      >
                        <Shield size={14} color="#14b8a6" />
                        {t('adminDashboard')}
                      </button>
                    )}

                    <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        padding: '8px 10px',
                        fontSize: 13,
                        borderRadius: 8,
                        border: 'none',
                        color: 'var(--danger)'
                      }}
                    >
                      <LogOut size={14} color="var(--danger)" />
                      {t('logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontSize: 13, borderRadius: 9999 }}
            >
              <User size={14} />
              {t('login')}
            </button>
          )}
        </nav>

        {/* ================= MOBILE CONTROLS & HAMBURGER ================= */}
        <div className="show-on-mobile" style={{ alignItems: 'center', gap: 8 }}>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="btn btn-secondary"
            style={{ padding: '7px 9px', borderRadius: 9999, fontSize: 12 }}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="#7c3aed" />}
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'am' ? 'en' : 'am')}
            className="btn btn-secondary"
            style={{ padding: '7px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700 }}
            title="Switch Language"
          >
            {language === 'am' ? 'EN' : 'አማ'}
          </button>

          {/* User Initial / Login */}
          {user ? (
            <button
              onClick={() => navigateAndClose('dashboard')}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary-600), #9333ea)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={userDisplayName}
            >
              {userInitial}
            </button>
          ) : (
            <button
              onClick={() => navigateAndClose('login')}
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 9999 }}
            >
              {t('login')}
            </button>
          )}

          {/* Hamburger Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn btn-secondary"
            style={{
              padding: '7px 9px',
              borderRadius: 9999,
              borderColor: mobileMenuOpen ? 'var(--primary-500)' : undefined,
              background: mobileMenuOpen ? 'rgba(124, 58, 237, 0.15)' : undefined,
            }}
            aria-label="Toggle mobile navigation menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ================= MOBILE NAVIGATION DRAWER ================= */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer show-on-mobile animate-fade-in">
          {/* Customer Service Call Card on Mobile */}
          <a
            href="tel:0949478933"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(124, 58, 237, 0.1))',
              border: '1.5px solid rgba(16, 185, 129, 0.4)',
              color: 'var(--text-main)',
              textDecoration: 'none',
              marginBottom: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Phone size={16} />
              </div>
              <div>
                <strong style={{ fontSize: 13, display: 'block' }}>እገዛ ይፈልጋሉ? ደውሉልን</strong>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Customer Support (24/7)</span>
              </div>
            </div>
            <strong style={{ fontSize: 14, color: '#10b981', fontFamily: 'monospace' }}>0949478933</strong>
          </a>

          <button
            onClick={() => navigateAndClose('home')}
            className="mobile-nav-item"
            style={{ borderColor: currentPage === 'home' ? 'var(--primary-400)' : undefined }}
          >
            <Shield size={16} color="var(--primary-500)" />
            {t('home')}
          </button>

          <button
            onClick={() => navigateAndClose('photo-guide')}
            className="mobile-nav-item"
            style={{ borderColor: currentPage === 'photo-guide' ? 'var(--primary-400)' : undefined }}
          >
            <Camera size={16} color="var(--primary-500)" />
            {t('photoGuide')}
          </button>

          {user && (
            <button
              onClick={() => navigateAndClose('dashboard')}
              className="mobile-nav-item"
              style={{ borderColor: currentPage === 'dashboard' ? 'var(--primary-400)' : undefined }}
            >
              <FileText size={16} color="var(--primary-500)" />
              {t('myApplications')}
            </button>
          )}

          <button
            onClick={() => navigateAndClose('faq')}
            className="mobile-nav-item"
            style={{ borderColor: currentPage === 'faq' ? 'var(--primary-400)' : undefined }}
          >
            <HelpCircle size={16} color="var(--primary-500)" />
            {t('faq')}
          </button>

          <button
            onClick={() => navigateAndClose('refund')}
            className="mobile-nav-item"
            style={{ borderColor: currentPage === 'refund' ? 'var(--primary-400)' : undefined }}
          >
            <ShieldCheck size={16} color="#10b981" />
            {t('refundPolicy')} (90% Guarantee)
          </button>

          {isStaff && (
            <>
              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
              {user?.role === 'operator' && (
                <button
                  onClick={() => navigateAndClose('operator')}
                  className="mobile-nav-item"
                  style={{ background: 'rgba(124, 58, 237, 0.08)' }}
                >
                  <CheckCircle2 size={16} color="#8b5cf6" />
                  {t('operatorStation')}
                </button>
              )}

              {user?.role === 'superadmin' && (
                <button
                  onClick={() => navigateAndClose('admin')}
                  className="mobile-nav-item"
                  style={{ background: 'rgba(20, 184, 166, 0.08)' }}
                >
                  <Shield size={16} color="#14b8a6" />
                  {t('adminDashboard')}
                </button>
              )}
            </>
          )}

          {user ? (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="mobile-nav-item"
              style={{ marginTop: 8, color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              <LogOut size={16} color="var(--danger)" />
              {t('logout')} ({userDisplayName})
            </button>
          ) : (
            <button
              onClick={() => navigateAndClose('login')}
              className="btn btn-primary"
              style={{ marginTop: 10, width: '100%', padding: '12px 0' }}
            >
              <User size={16} />
              {t('login')} / ይመዝገቡ (Sign In)
            </button>
          )}
        </div>
      )}
    </header>
  );
}

