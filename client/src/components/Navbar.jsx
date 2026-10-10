import React from 'react';
import { useLanguage } from '../i18n/index.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Globe, Shield, User, LogOut, FileText, CheckCircle2 } from 'lucide-react';

export default function Navbar({ onNavigate, currentPage }) {
  const { language, setLanguage, t } = useLanguage();
  const { user, logout } = useAuth();

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
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--primary-600), var(--accent-500))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(99, 102, 241, 0.5)',
            }}
          >
            <Shield size={20} color="#ffffff" />
          </div>
          <span className="text-gradient">{t('brandName')}</span>
        </a>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Main Navigation Links */}
          <button
            onClick={() => onNavigate('home')}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: 13, background: currentPage === 'home' ? 'rgba(99,102,241,0.2)' : undefined }}
          >
            {t('home')}
          </button>

          {user && !isStaff && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: 13, background: currentPage === 'dashboard' ? 'rgba(99,102,241,0.2)' : undefined }}
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
                style={{ padding: '6px 12px', fontSize: 13, borderColor: 'var(--primary-400)', background: currentPage === 'operator' ? 'rgba(99,102,241,0.2)' : undefined }}
              >
                <CheckCircle2 size={14} color="#818cf8" />
                {t('operatorStation')}
              </button>

              {user?.role === 'superadmin' && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 13, borderColor: 'var(--accent-500)', background: currentPage === 'admin' ? 'rgba(20,184,166,0.2)' : undefined }}
                >
                  <Shield size={14} color="#2dd4bf" />
                  {t('adminDashboard')}
                </button>
              )}
            </>
          )}

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'am' ? 'en' : 'am')}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: 12, gap: 4 }}
            title="Switch Language / ቋንቋ ቀይር"
          >
            <Globe size={13} />
            <strong>{language === 'am' ? 'EN' : 'አማርኛ'}</strong>
          </button>

          {/* Auth State */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {user.email || user.username || user.telegramUsername || 'User'}
              </span>
              <button
                onClick={logout}
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: 12 }}
                title={t('logout')}
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="btn btn-primary"
              style={{ padding: '7px 16px', fontSize: 13 }}
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
