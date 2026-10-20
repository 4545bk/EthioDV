import React from 'react';
import { useLanguage } from '../i18n/index.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { Globe, Shield, User, LogOut, FileText, CheckCircle2, Sun, Moon } from 'lucide-react';

export default function Navbar({ onNavigate, currentPage }) {
  const { language, setLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  const isStaff = user?.role === 'operator' || user?.role === 'superadmin';

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('home');
          }}
          className="brand-logo"
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--primary-600), #9333ea)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
            }}
          >
            <Shield size={22} color="#ffffff" />
          </div>
          <span className="text-gradient" style={{ fontWeight: 800 }}>{t('brandName')}</span>
        </a>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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

          {isStaff && (
            <>
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
            </>
          )}

          {/* Theme Toggle Button (Aspio Light / Dark Mode) */}
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
            title={isDark ? 'Switch to Light Mode (Aspio White)' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun size={15} color="#fbbf24" style={{ transition: 'transform 0.3s ease' }} />
            ) : (
              <Moon size={15} color="#7c3aed" style={{ transition: 'transform 0.3s ease' }} />
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

          {/* Auth State */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                {user.email || user.username || user.telegramUsername || 'User'}
              </span>
              <button
                onClick={logout}
                className="btn btn-secondary"
                style={{ padding: '7px 10px', fontSize: 12, borderRadius: 9999 }}
                title={t('logout')}
              >
                <LogOut size={13} />
              </button>
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
      </div>
    </header>
  );
}
