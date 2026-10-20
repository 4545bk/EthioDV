import React, { useState } from 'react';
import { useLanguage } from '../i18n/index.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiRequest } from '../services/api.js';
import GoogleLoginButton from '../components/GoogleLoginButton.jsx';
import Alert from '../components/Alert.jsx';
import { Mail, Lock, User, Send, Shield, AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

export default function LoginPage({ onNavigate }) {
  const { t } = useLanguage();
  const { loginWithToken } = useAuth();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'otp'
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sign In Form States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);

  // Sign Up Form States
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // Email OTP States
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Unified Handler on Successful Authentication
  const handleAuthSuccess = (data) => {
    loginWithToken(data.token, data.user);
    if (data.user.role === 'superadmin') {
      onNavigate('admin');
    } else if (data.user.role === 'operator') {
      onNavigate('operator');
    } else {
      onNavigate('dashboard');
    }
  };

  // 1. Unified Sign In (Auto-detects Superadmin, Operator, or Applicant)
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMessage('እባክዎ ኢሜይል/የተጠቃሚ ስም እና የይለፍ ቃል ያስገቡ / Please enter email and password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier,
          password,
          totpCode: totpCode || undefined,
        }),
      });

      if (res.success && res.data) {
        handleAuthSuccess(res.data);
      }
    } catch (err) {
      if (err.details?.requires2FA || err.code === 'TOTP_REQUIRED') {
        setRequires2FA(true);
        setErrorMessage('እባክዎ ባለ 6 ዲጂት የ Authenticator ኮድዎን ያስገቡ / Please enter your 2FA code.');
      } else {
        setErrorMessage(err.message || 'ኢሜይል ወይም የይለፍ ቃል ተሳስቷል / Invalid email or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Applicant Sign Up
  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword) {
      setErrorMessage('እባክዎ ሁሉንም አስፈላጊ መረጃዎች ያስገቡ / Please fill in all required fields.');
      return;
    }

    if (signupPassword.length < 6) {
      setErrorMessage('የይለፍ ቃል ቢያንስ 6 ፊደላት መሆን አለበት / Password must be at least 6 characters.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('የይለፍ ቃሎቹ አይመሳሰሉም / Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const res = await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          fullName: signupFullName,
        }),
      });

      if (res.success && res.data) {
        handleAuthSuccess(res.data);
      }
    } catch (err) {
      setErrorMessage(err.message || 'መለያ መፍጠር አልተቻለም / Failed to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Request Email OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!otpEmail || !otpEmail.includes('@')) {
      setErrorMessage('ትክክለኛ የኢሜይል አድራሻ ያስገቡ / Enter a valid email address.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const res = await apiRequest('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ email: otpEmail }),
      });

      if (res.success) {
        setOtpSent(true);
        if (res.data?.devOtpCode) {
          setOtpCode(res.data.devOtpCode);
          setSuccessMessage(`🧪 የሙከራ ኮድ (Dev Mode): [${res.data.devOtpCode}] በራስ-ሰር ተሞልቷል! እውነተኛ ኢሜይል ወደ inbox እንዲላክ RESEND_API_KEY ያክሉ።`);
        } else {
          setSuccessMessage('ባለ 6 ዲጂት ኮድ ወደ ኢሜይልዎ ተልኳል / Verification code sent to your email.');
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'ኮድ መላክ አልተቻለም / Failed to send code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Verify Email OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setErrorMessage('ባለ 6 ዲጂት ኮዱን ያስገቡ / Enter the 6-digit code.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const res = await apiRequest('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email: otpEmail, code: otpCode }),
      });

      if (res.success && res.data) {
        handleAuthSuccess(res.data);
      }
    } catch (err) {
      setErrorMessage(err.message || 'የተሳሳተ ኮድ / Incorrect code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 440, padding: '40px 20px' }}>
      <button
        onClick={() => onNavigate('home')}
        className="btn btn-secondary"
        style={{ marginBottom: 20, padding: '6px 12px', fontSize: 13 }}
      >
        <ArrowLeft size={14} />
        ወደ ዋና ገጽ / Back to Home
      </button>

      <div className="card" style={{ padding: '36px 32px', borderRadius: 'var(--radius-lg)' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: 24, marginBottom: 6 }}>
            {mode === 'signup' ? 'አዲስ መለያ ይፍጠሩ' : 'እንኳን ደህና መጡ'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {mode === 'signup'
              ? 'የDV-2027 ፎርምዎን ለመሙላትና ሁኔታዎን ለመከታተል ይመዝገቡ'
              : 'ወደ EthioDV-FillTrack መለያዎ ይግቡ'}
          </p>
        </div>

        {/* Tab Switcher: Segmented Pill Control */}
        {mode !== 'otp' && (
          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: 4, borderRadius: 'var(--radius-md)', marginBottom: 24, border: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMessage(''); setSuccessMessage(''); }}
              style={{
                flex: 1,
                padding: '9px 0',
                background: mode === 'signin' ? 'var(--bg-card)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                boxShadow: mode === 'signin' ? 'var(--shadow-sm)' : 'none',
                color: mode === 'signin' ? 'var(--primary-600)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              ይግቡ / Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMessage(''); setSuccessMessage(''); }}
              style={{
                flex: 1,
                padding: '9px 0',
                background: mode === 'signup' ? 'var(--bg-card)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                boxShadow: mode === 'signup' ? 'var(--shadow-sm)' : 'none',
                color: mode === 'signup' ? 'var(--primary-600)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              ይመዝገቡ / Sign Up
            </button>
          </div>
        )}

        {/* Feedback Alerts */}
        {errorMessage && (
          <Alert
            type="danger"
            message={errorMessage}
            onClose={() => setErrorMessage('')}
          />
        )}

        {successMessage && (
          <Alert
            type="success"
            message={successMessage}
            onClose={() => setSuccessMessage('')}
          />
        )}

        {/* ================= MODE 1: SIGN IN ================= */}
        {mode === 'signin' && (
          <div>
            {/* 1-Click Google Sign In */}
            <GoogleLoginButton
              text="continue_with"
              onSuccess={handleAuthSuccess}
              onError={(err) => setErrorMessage(err)}
            />

            <div style={{ margin: '20px 0', textAlign: 'center', position: 'relative' }}>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />
              <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-card)', padding: '0 12px', fontSize: 12, color: 'var(--text-muted)' }}>
                ወይም በይለፍ ቃል / OR
              </span>
            </div>

            <form onSubmit={handleSignIn}>
              <div className="form-group">
                <label className="form-label">ኢሜይል ወይም የተጠቃሚ ስም (Email or Username)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="name@example.com or admin"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: 38 }}
                  />
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">የይለፍ ቃል (Password)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: 38 }}
                  />
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                </div>
              </div>

              {requires2FA && (
                <div className="form-group animate-fade-in">
                  <label className="form-label" style={{ color: '#38bdf8' }}>ባለ 6 ዲጂት የ2FA ኮድ (Authenticator Code)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      className="form-input"
                      style={{ textAlign: 'center', fontSize: 20, letterSpacing: 6, fontWeight: 700, paddingLeft: 38 }}
                    />
                    <Shield size={16} color="#38bdf8" style={{ position: 'absolute', left: 12, top: 12 }} />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px 0', fontSize: 14, marginTop: 4 }}
              >
                {isLoading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Loader2 size={16} className="animate-spin" /> እየገባ ነው... / Signing In...
                  </span>
                ) : (
                  'ይግቡ / Sign In'
                )}
              </button>
            </form>

            {/* Alternative OTP Login Option */}
            <div style={{ textAlign: 'center', marginTop: 18 }}>
              <button
                type="button"
                onClick={() => { setMode('otp'); setErrorMessage(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary-400)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
              >
                በኢሜይል ማረጋገጫ ኮድ መግባት እፈልጋለሁ (Login via OTP)
              </button>
            </div>
          </div>
        )}

        {/* ================= MODE 2: SIGN UP ================= */}
        {mode === 'signup' && (
          <div>
            {/* 1-Click Google Sign Up */}
            <GoogleLoginButton
              text="signup_with"
              onSuccess={handleAuthSuccess}
              onError={(err) => setErrorMessage(err)}
            />

            <div style={{ margin: '20px 0', textAlign: 'center', position: 'relative' }}>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />
              <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-card)', padding: '0 12px', fontSize: 12, color: 'var(--text-muted)' }}>
                ወይም በኢሜይል / OR with Email
              </span>
            </div>

            <form onSubmit={handleSignUp}>
              <div className="form-group">
                <label className="form-label">ሙሉ ስም (Full Name) - አማራጭ</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Abebe Kebede"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: 38 }}
                  />
                  <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ኢሜይል አድራሻ (Email Address)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: 38 }}
                  />
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">የይለፍ ቃል (Password - min 6 chars)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: 38 }}
                  />
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">የይለፍ ቃል አረጋግጥ (Confirm Password)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••••••"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: 38 }}
                  />
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px 0', fontSize: 14, marginTop: 4 }}
              >
                {isLoading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Loader2 size={16} className="animate-spin" /> እየተፈጠረ ነው... / Creating Account...
                  </span>
                ) : (
                  'መለያ ፍጠር / Create Account'
                )}
              </button>
            </form>
          </div>
        )}

        {/* ================= MODE 3: EMAIL OTP ================= */}
        {mode === 'otp' && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleRequestOtp}>
                <div className="form-group">
                  <label className="form-label">ኢሜይል አድራሻ (Email Address)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: 38 }}
                    />
                    <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px 0', fontSize: 14 }}
                >
                  {isLoading ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Loader2 size={16} className="animate-spin" /> እየተላከ ነው...
                    </span>
                  ) : (
                    <>
                      የማረጋገጫ ኮድ ላክ / Send Code <Send size={15} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>ባለ 6 ዲጂት ኮድ (6-Digit OTP)</label>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary-400)', fontSize: 12, cursor: 'pointer' }}
                    >
                      ኢሜይል ቀይር
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="form-input"
                    style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 700 }}
                  />
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                    ኮዱ ወደ <strong>{otpEmail}</strong> ተልኳል
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px 0', fontSize: 14 }}
                >
                  {isLoading ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Loader2 size={16} className="animate-spin" /> እየተረጋገጠ ነው...
                    </span>
                  ) : (
                    'ኮዱን አረጋግጥና ግባ / Verify & Login'
                  )}
                </button>
              </form>
            )}

            <div style={{ textAlign: 'center', marginTop: 18 }}>
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMessage(''); setSuccessMessage(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}
              >
                ← ወደ መደበኛ መግቢያ ተመለስ / Back to Password Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
