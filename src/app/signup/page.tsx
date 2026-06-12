"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./signup.css";

// ─── Syntra Monogram Logo ────────────────────────────────────────────────────
function SyntraMonogram() {
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id="glow-a" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#7EB2FF" stopOpacity="1" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.6" />
        </radialGradient>
        <radialGradient id="glow-b" cx="60%" cy="60%" r="60%">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="1" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.6" />
        </radialGradient>
        <filter id="blur-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="soft-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
          </feMerge>
        </filter>
      </defs>

      <ellipse cx="20" cy="26" rx="14" ry="14" fill="url(#glow-a)" filter="url(#soft-glow)" opacity="0.5" />
      <ellipse cx="32" cy="26" rx="14" ry="14" fill="url(#glow-b)" filter="url(#soft-glow)" opacity="0.5" />
      <circle cx="20" cy="26" r="13" fill="none" stroke="url(#glow-a)" strokeWidth="2.2" filter="url(#blur-glow)" opacity="0.95" />
      <circle cx="32" cy="26" r="13" fill="none" stroke="url(#glow-b)" strokeWidth="2.2" filter="url(#blur-glow)" opacity="0.95" />
      <path d="M26 14.2 C29.8 17.8 31.8 21.8 31.8 26 C31.8 30.2 29.8 34.2 26 37.8 C22.2 34.2 20.2 30.2 20.2 26 C20.2 21.8 22.2 17.8 26 14.2 Z" fill="white" opacity="0.08" />
      <path d="M20.5 19 Q26 15 31.5 19" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d="M20.5 33 Q26 37 31.5 33" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.55" />
      <line x1="26" y1="14" x2="26" y2="38" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      <circle cx="26" cy="26" r="2.5" fill="white" opacity="0.9" />
      <circle cx="26" cy="26" r="1.2" fill="#A5C8FF" />
    </svg>
  );
}

// ─── FieldError ──────────────────────────────────────────────────────────────
function FieldError({ message }: { message: string }) {
  return (
    <p className="field-error">
      <span aria-hidden="true">·</span>
      {message}
    </p>
  );
}

// ─── Password validation rules ────────────────────────────────────────────────
const PASSWORD_RULES = [
  { label: "8+ characters", test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One number", test: (v: string) => /\d/.test(v) },
  { label: "One special character", test: (v: string) => /[^a-zA-Z0-9]/.test(v) },
];

// ─── PasswordField ────────────────────────────────────────────────────────────
function PasswordField({
  value,
  onChange,
  focused,
  onFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  focused: boolean;
  onFocus: () => void;
}) {
  const [touched, setTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const failedRules = PASSWORD_RULES.filter((r) => !r.test(value));
  const showErrors = touched && failedRules.length > 0;

  return (
    <div className="input-group">
      <label className="input-label">Password</label>
      <div className="input-wrap">
        <span className={`input-icon ${focused ? "active" : ""}`}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
        <input
          type={showPassword ? "text" : "password"}
          name="password"
          required
          placeholder="Create a password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={() => setTouched(true)}
          className="form-input"
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowPassword((s) => !s)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {showErrors && (
        <div role="group" aria-label="Password requirements not met">
          {failedRules.map((r) => (
            <FieldError key={r.label} message={r.label} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ── On submit: validate only — save to sessionStorage — go to /onboarding ──
  const handleInitialise = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNameError("");
    setEmailError("");

    if (!formData.name.trim()) {
      setNameError("Name is required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    const failedRules = PASSWORD_RULES.filter((r) => !r.test(formData.password));
    if (failedRules.length > 0) {
      setError(`Password needs: ${failedRules.map((r) => r.label).join(", ")}.`);
      return;
    }

    // Store credentials temporarily — onboarding will use these to register
    sessionStorage.setItem("syntra_pending_signup", JSON.stringify(formData));

    // Navigate to onboarding — no account created yet
    router.push("/onboarding");
  };

  return (
    <div className="signup-page">
      <div className="signup-card">

        {/* ── Syntra Monogram ─────────────────────────────────────────── */}
        <div className="logo-mark">
          <div className="logo-circle">
            <SyntraMonogram />
          </div>
        </div>

        <h1 className="signup-title">Create your twin</h1>
        <p className="signup-subtitle">
          Set up your account to get started
        </p>

        {/* ── Form ─────────────────────────────────────────────────────── */}
        <form onSubmit={handleInitialise}>

          {/* Name */}
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <div className="input-wrap">
              <span className={`input-icon ${nameFocused ? "active" : ""}`}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                type="text"
                name="name"
                required
                placeholder="Your full name"
                value={formData.name}
                onChange={handleChange}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                className="form-input"
              />
            </div>
            {nameError && <FieldError message={nameError} />}
          </div>

          {/* Email */}
          <div className="input-group">
            <label className="input-label">Email</label>
            <div className="input-wrap">
              <span className={`input-icon ${emailFocused ? "active" : ""}`}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                className="form-input"
              />
            </div>
            {emailError && <FieldError message={emailError} />}
          </div>

          {/* Password */}
          <PasswordField
            value={formData.password}
            onChange={(v) => setFormData({ ...formData, password: v })}
            focused={passwordFocused}
            onFocus={() => setPasswordFocused(true)}
          />

          {error && (
            <div className="error-box" style={{ marginTop: "1rem" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="signup-btn" disabled={loading}>
            {loading ? (
              <span className="btn-content">
                <span className="spinner">
                  <span className="ring ring-outer" />
                  <span className="ring ring-inner" />
                  <span className="ring ring-dot" />
                </span>
                <span>Setting up...</span>
                <span className="loading-dots">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
              </span>
            ) : (
              <span className="btn-content">Initialise AI Twin →</span>
            )}
          </button>
        </form>

        <div className="trust-row">
          <span className="trust-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Secure &amp; Private
          </span>
          <span className="trust-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Free to Join
          </span>
          <span className="trust-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            No Spam Ever
          </span>
        </div>

        <div className="bottom-text">
          Already have an account?{" "}
          <Link href="/login" className="login-link">
            Log in →
          </Link>
        </div>
      </div>
    </div>
  );
}