"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f5f7ff; }

        /* ── PAGE LAYOUT ── */
        .login-page {
          min-height: 100vh;
          background: #f0f3ff;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          position: relative;
          overflow: hidden;
        }

        /* Decorative blobs */
        .login-page::before,
        .login-page::after {
          content: '';
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .login-page::before {
          width: 520px; height: 520px;
          background: radial-gradient(circle, rgba(0,85,238,0.18) 0%, transparent 70%);
          top: -120px; right: -80px;
          animation: blobDrift 10s ease-in-out infinite alternate;
        }
        .login-page::after {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(99,179,255,0.14) 0%, transparent 70%);
          bottom: -80px; left: -60px;
          animation: blobDrift 13s ease-in-out infinite alternate-reverse;
        }

        @keyframes blobDrift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, 20px) scale(1.06); }
        }

        /* ── CARD ── */
        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 460px;
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(0,85,238,0.10);
          border-radius: 28px;
          padding: 3rem 2.8rem;
          box-shadow:
            0 4px 6px rgba(0,85,238,0.04),
            0 20px 60px rgba(0,85,238,0.10),
            0 1px 0px rgba(255,255,255,0.9) inset;
          animation: cardIn 0.6s cubic-bezier(0.22,1,0.36,1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ── LOGO MARK ── */
        .logo-mark {
          display: flex;
          justify-content: center;
          margin-bottom: 1.8rem;
          animation: cardIn 0.6s 0.1s cubic-bezier(0.22,1,0.36,1) both;
        }

        .logo-circle {
          width: 56px; height: 56px;
          border-radius: 16px;
          background: linear-gradient(135deg, #0055EE 0%, #3b8fff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(0,85,238,0.35);
        }

        .logo-circle svg { width: 28px; height: 28px; }

        /* ── HEADING ── */
        .login-title {
          font-family: 'Sora', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          color: #0b0f1a;
          text-align: center;
          letter-spacing: -0.5px;
          margin-bottom: 0.4rem;
          animation: cardIn 0.6s 0.15s cubic-bezier(0.22,1,0.36,1) both;
        }

        .login-subtitle {
          text-align: center;
          color: #6b7280;
          font-size: 0.95rem;
          font-weight: 400;
          margin-bottom: 2.2rem;
          animation: cardIn 0.6s 0.2s cubic-bezier(0.22,1,0.36,1) both;
        }

        /* ── INPUT GROUP ── */
        .input-group {
          margin-bottom: 1rem;
          position: relative;
          animation: cardIn 0.6s 0.25s cubic-bezier(0.22,1,0.36,1) both;
        }

        .input-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.45rem;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }

        .input-wrap {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
          transition: color 0.2s;
          display: flex;
          align-items: center;
        }

        .input-icon.active { color: #0055EE; }

        .login-input {
          width: 100%;
          height: 56px;
          border: 1.5px solid #e5e7eb;
          border-radius: 14px;
          background: #ffffff;
          padding: 0 48px 0 46px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.95rem;
          color: #111827;
          outline: none;
          transition: border-color 0.25s, box-shadow 0.25s;
        }

        .login-input::placeholder { color: #c4c9d4; }

        .login-input:focus {
          border-color: #0055EE;
          box-shadow: 0 0 0 4px rgba(0,85,238,0.10);
        }

        .password-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 6px;
          transition: color 0.2s;
        }
        .password-toggle:hover { color: #0055EE; }

        /* ── FORGOT ── */
        .forgot-row {
          display: flex;
          justify-content: flex-end;
          margin: 0.3rem 0 1.6rem;
          animation: cardIn 0.6s 0.3s cubic-bezier(0.22,1,0.36,1) both;
        }

        .forgot-link {
          color: #0055EE;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          transition: opacity 0.2s;
        }
        .forgot-link:hover { opacity: 0.7; }

        /* ── ERROR ── */
        .error-box {
          background: #fef2f2;
          border: 1px solid #fca5a5;
          color: #b91c1c;
          padding: 11px 16px;
          border-radius: 10px;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }

        @keyframes shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }

        /* ── BUTTON ── */
        .login-btn {
          width: 100%;
          height: 58px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #0055EE 0%, #2f80ff 100%);
          color: white;
          font-family: 'Sora', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 6px 24px rgba(0,85,238,0.38);
          animation: cardIn 0.6s 0.35s cubic-bezier(0.22,1,0.36,1) both;
          letter-spacing: 0.2px;
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(0,85,238,0.46);
        }

        .login-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 4px 12px rgba(0,85,238,0.3);
        }

        .login-btn:disabled { cursor: not-allowed; opacity: 0.85; }

        /* Shimmer */
        .login-btn::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          transform: skewX(-20deg);
          animation: shimmer 2.5s infinite;
        }

        @keyframes shimmer {
          0%   { left: -100%; }
          100% { left: 200%; }
        }

        /* ── LOADING CONTENT ── */
        .btn-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          position: relative;
          z-index: 1;
        }

        /* Multi-ring spinner */
        .spinner {
          width: 24px;
          height: 24px;
          position: relative;
          flex-shrink: 0;
        }

        .ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2.5px solid transparent;
        }

        .ring-outer {
          border-top-color: rgba(255,255,255,0.9);
          border-right-color: rgba(255,255,255,0.3);
          animation: spinCW 0.8s linear infinite;
        }

        .ring-inner {
          inset: 5px;
          border-bottom-color: rgba(255,255,255,0.8);
          border-left-color: rgba(255,255,255,0.25);
          animation: spinCCW 0.6s linear infinite;
        }

        .ring-dot {
          inset: 10px;
          border-top-color: white;
          animation: spinCW 0.4s linear infinite;
        }

        @keyframes spinCW  { to { transform: rotate(360deg);  } }
        @keyframes spinCCW { to { transform: rotate(-360deg); } }

        .loading-text {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .dot {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: white;
          animation: dotPulse 1.2s ease-in-out infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40%           { opacity: 1;   transform: scale(1.2); }
        }

        /* ── DIVIDER ── */
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 1.6rem 0;
          animation: cardIn 0.6s 0.4s cubic-bezier(0.22,1,0.36,1) both;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }

        .divider-text {
          font-size: 0.8rem;
          color: #9ca3af;
          font-weight: 500;
          white-space: nowrap;
        }

        /* ── BOTTOM TEXT ── */
        .bottom-text {
          text-align: center;
          margin-top: 1.6rem;
          font-size: 0.92rem;
          color: #6b7280;
          animation: cardIn 0.6s 0.45s cubic-bezier(0.22,1,0.36,1) both;
        }

        .signup-link {
          color: #0055EE;
          font-weight: 700;
          text-decoration: none;
          transition: opacity 0.2s;
        }
        .signup-link:hover { opacity: 0.7; }

        /* ── TRUST BADGES ── */
        .trust-row {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 1.8rem;
          animation: cardIn 0.6s 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }

        .trust-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.75rem;
          color: #9ca3af;
          font-weight: 500;
        }

        .trust-badge svg { color: #0055EE; }
      `}</style>

      <div className="login-card">

        {/* Logo */}
        <div className="logo-mark">
          <div className="logo-circle">
            <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 14C6 9.58 9.58 6 14 6C16.2 6 18.2 6.9 19.66 8.34L22 6C19.93 4.12 17.1 3 14 3C7.92 3 3 7.92 3 14C3 20.08 7.92 25 14 25C20.08 25 25 20.08 25 14H22C22 18.42 18.42 22 14 22C9.58 22 6 18.42 6 14Z" fill="white" fillOpacity="0.8"/>
              <circle cx="20" cy="8" r="4" fill="white"/>
            </svg>
          </div>
        </div>

        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">Sign in to continue to your account</p>

        <form onSubmit={handleLogin}>

          {/* Email */}
          <div className="input-group">
            <label className="input-label">Email</label>
            <div className="input-wrap">
              <span className={`input-icon ${emailFocused ? "active" : ""}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </span>
              <input
                type="email"
                className="login-input"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </div>
          </div>

          {/* Password */}
          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-wrap">
              <span className={`input-icon ${passwordFocused ? "active" : ""}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                className="login-input"
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="forgot-row">
            <Link href="#" className="forgot-link">Forgot password?</Link>
          </div>

          {error && (
            <div className="error-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span className="btn-content">
                <span className="spinner">
                  <span className="ring ring-outer"/>
                  <span className="ring ring-inner"/>
                  <span className="ring ring-dot"/>
                </span>
                <span>Signing you in</span>
                <span className="loading-text">
                  <span className="dot"/>
                  <span className="dot"/>
                  <span className="dot"/>
                </span>
              </span>
            ) : (
              <span className="btn-content">Log In</span>
            )}
          </button>
        </form>

        {/* Trust signals */}
        <div className="trust-row">
          <span className="trust-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            SSL Secured
          </span>
          <span className="trust-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            256-bit Encrypted
          </span>
          <span className="trust-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            24/7 Protected
          </span>
        </div>

        <div className="bottom-text">
          Don't have an account?{" "}
          <Link href="/signup" className="signup-link">Create one free →</Link>
        </div>
      </div>
    </div>
  );
}