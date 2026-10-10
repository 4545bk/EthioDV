import React, { useEffect, useState, useRef } from 'react';
import { apiRequest } from '../services/api.js';

export default function GoogleLoginButton({ onSuccess, onError, text = 'continue_with' }) {
  const [loading, setLoading] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const containerRef = useRef(null);

  // Read Google Client ID from environment
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    let isMounted = true;

    if (!clientId) {
      return;
    }

    const handleCredentialResponse = async (response) => {
      if (!response?.credential) return;
      try {
        if (isMounted) setLoading(true);
        const res = await apiRequest('/auth/google', {
          method: 'POST',
          body: JSON.stringify({ credential: response.credential }),
        });

        if (res.success && res.data) {
          if (onSuccess) onSuccess(res.data);
        } else {
          throw new Error(res.error?.message || 'Google sign-in failed');
        }
      } catch (err) {
        console.error('Google Sign-In Error:', err);
        if (onError) onError(err.message || 'Google sign-in failed');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const renderButton = () => {
      if (!window.google?.accounts?.id || !containerRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: containerRef.current.clientWidth || 320,
          text: text === 'signup_with' ? 'signup_with' : 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
        if (isMounted) setIsRendered(true);
      } catch (e) {
        console.warn('Google renderButton notice:', e.message);
      }
    };

    if (window.google?.accounts?.id) {
      renderButton();
    } else {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.addEventListener('load', renderButton);
      } else {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = renderButton;
        document.body.appendChild(script);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [clientId, text, onSuccess, onError]);

  const handleFallbackClick = () => {
    if (!clientId) {
      alert('Google Sign-In setup: To enable 1-click Google authentication, please add VITE_GOOGLE_CLIENT_ID to your client/.env file.');
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Official Google Button Container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          display: isRendered ? 'flex' : 'none',
          justifyContent: 'center',
          minHeight: 44,
        }}
      />

      {/* Styled Fallback / Placeholder Button */}
      {!isRendered && (
        <button
          type="button"
          onClick={handleFallbackClick}
          className="btn"
          style={{
            width: '100%',
            minHeight: 44,
            background: '#ffffff',
            color: '#1f2937',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>{text === 'signup_with' ? 'በጉግል ይመዝገቡ / Sign up with Google' : 'በጉግል ይግቡ / Sign in with Google'}</span>
        </button>
      )}

      {loading && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--primary-400)', fontWeight: 500 }}>
          በጉግል እየገባ ነው... / Signing in with Google...
        </div>
      )}
    </div>
  );
}
