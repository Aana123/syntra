"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Cpu, HeartPulse, Wallet, Briefcase, Users } from "lucide-react";

/* ── Avatar Data ─────────────────────────────── */
const AVATARS = [
  {
    id: "chronos", name: "Chronos", focus: "Learning · Growth · Knowledge",
    accent: "#0044DD", lightBg: "#eff4ff", borderActive: "#0044DD",
    svg: (
      <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="60" height="60">
        <defs>
          <radialGradient id="ch-f" cx="50%" cy="42%" r="55%"><stop offset="0%" stopColor="#BFDBFE"/><stop offset="100%" stopColor="#60A5FA"/></radialGradient>
          <radialGradient id="ch-g" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/><stop offset="100%" stopColor="#1E40AF" stopOpacity="0"/></radialGradient>
          <filter id="ch-blur"><feGaussianBlur stdDeviation="2"/></filter>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#ch-g)" filter="url(#ch-blur)"/>
        <ellipse cx="40" cy="37" rx="19" ry="21" fill="url(#ch-f)"/>
        <path d="M24 25 Q40 11 56 25" stroke="#93C5FD" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7"/>
        <circle cx="40" cy="12" r="2" fill="#60A5FA" opacity="0.85"/>
        <path d="M21 35 H15 V27 H19" stroke="#60A5FA" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
        <path d="M59 35 H65 V27 H61" stroke="#60A5FA" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6"/>
        <ellipse cx="33" cy="36" rx="4" ry="4" fill="#0EA5E9"/><ellipse cx="47" cy="36" rx="4" ry="4" fill="#0EA5E9"/>
        <ellipse cx="33" cy="36" rx="2.2" ry="2.2" fill="#E0F2FE"/><ellipse cx="47" cy="36" rx="2.2" ry="2.2" fill="#E0F2FE"/>
        <circle cx="33" cy="36" r="0.9" fill="#0369A1"/><circle cx="47" cy="36" r="0.9" fill="#0369A1"/>
        <circle cx="33.8" cy="35" r="0.7" fill="white" opacity="0.9"/><circle cx="47.8" cy="35" r="0.7" fill="white" opacity="0.9"/>
        <path d="M35 51 Q40 55 45 51" stroke="#BFDBFE" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M23 70 Q23 59 40 57 Q57 59 57 70" fill="#1D4ED8" opacity="0.9"/>
      </svg>
    ),
  },
  {
    id: "apex", name: "Apex", focus: "Productivity · Discipline · Execution",
    accent: "#dc2626", lightBg: "#fff5f5", borderActive: "#dc2626",
    svg: (
      <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="60" height="60">
        <defs>
          <radialGradient id="ap-f" cx="50%" cy="42%" r="55%"><stop offset="0%" stopColor="#FECACA"/><stop offset="100%" stopColor="#F87171"/></radialGradient>
          <radialGradient id="ap-g" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#EF4444" stopOpacity="0.3"/><stop offset="100%" stopColor="#7F1D1D" stopOpacity="0"/></radialGradient>
          <filter id="ap-blur"><feGaussianBlur stdDeviation="2"/></filter>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#ap-g)" filter="url(#ap-blur)"/>
        <ellipse cx="40" cy="37" rx="19" ry="21" fill="url(#ap-f)"/>
        <polygon points="40,9 44,17 36,17" fill="#F87171" opacity="0.9"/>
        <polygon points="33,11 35.5,18 29.5,16" fill="#FCA5A5" opacity="0.6"/>
        <polygon points="47,11 50.5,16 44.5,18" fill="#FCA5A5" opacity="0.6"/>
        <path d="M21 37 H14 M14 37 L14 29" stroke="#F87171" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7"/>
        <path d="M59 37 H66 M66 37 L66 29" stroke="#F87171" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7"/>
        <ellipse cx="33" cy="36" rx="4" ry="4" fill="#DC2626"/><ellipse cx="47" cy="36" rx="4" ry="4" fill="#DC2626"/>
        <ellipse cx="33" cy="36" rx="2.2" ry="2.2" fill="#FEF2F2"/><ellipse cx="47" cy="36" rx="2.2" ry="2.2" fill="#FEF2F2"/>
        <circle cx="33" cy="36" r="0.9" fill="#7F1D1D"/><circle cx="47" cy="36" r="0.9" fill="#7F1D1D"/>
        <circle cx="33.8" cy="35" r="0.7" fill="white" opacity="0.9"/><circle cx="47.8" cy="35" r="0.7" fill="white" opacity="0.9"/>
        <path d="M35 51 Q40 55 45 51" stroke="#FECACA" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M23 70 Q23 59 40 57 Q57 59 57 70" fill="#B91C1C" opacity="0.9"/>
      </svg>
    ),
  },
  {
    id: "nexus", name: "Nexus", focus: "Wealth · Planning · Stability",
    accent: "#059669", lightBg: "#f0fdf4", borderActive: "#059669",
    svg: (
      <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="60" height="60">
        <defs>
          <radialGradient id="nx-f" cx="50%" cy="42%" r="55%"><stop offset="0%" stopColor="#D1FAE5"/><stop offset="100%" stopColor="#6EE7B7"/></radialGradient>
          <radialGradient id="nx-g" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#10B981" stopOpacity="0.3"/><stop offset="100%" stopColor="#065F46" stopOpacity="0"/></radialGradient>
          <filter id="nx-blur"><feGaussianBlur stdDeviation="2"/></filter>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#nx-g)" filter="url(#nx-blur)"/>
        <ellipse cx="40" cy="37" rx="19" ry="21" fill="url(#nx-f)"/>
        <polygon points="40,10 44,14 44,20 40,24 36,20 36,14" fill="none" stroke="#6EE7B7" strokeWidth="1.4" opacity="0.75"/>
        <circle cx="40" cy="17" r="1.8" fill="#10B981" opacity="0.9"/>
        <path d="M21 35 H15 V43 H19" stroke="#34D399" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.65"/>
        <path d="M59 35 H65 V43 H61" stroke="#34D399" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.65"/>
        <ellipse cx="33" cy="36" rx="4" ry="4" fill="#059669"/><ellipse cx="47" cy="36" rx="4" ry="4" fill="#059669"/>
        <ellipse cx="33" cy="36" rx="2.2" ry="2.2" fill="#ECFDF5"/><ellipse cx="47" cy="36" rx="2.2" ry="2.2" fill="#ECFDF5"/>
        <circle cx="33" cy="36" r="0.9" fill="#065F46"/><circle cx="47" cy="36" r="0.9" fill="#065F46"/>
        <circle cx="33.8" cy="35" r="0.7" fill="white" opacity="0.9"/><circle cx="47.8" cy="35" r="0.7" fill="white" opacity="0.9"/>
        <polygon points="40,28 42,31 40,34 38,31" fill="#A7F3D0" opacity="0.6"/>
        <path d="M35 51 Q40 55 45 51" stroke="#A7F3D0" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M23 70 Q23 59 40 57 Q57 59 57 70" fill="#047857" opacity="0.9"/>
      </svg>
    ),
  },
  {
    id: "titan", name: "Titan", focus: "Fitness · Energy · Health",
    accent: "#d97706", lightBg: "#fffbeb", borderActive: "#d97706",
    svg: (
      <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="60" height="60">
        <defs>
          <radialGradient id="ti-f" cx="50%" cy="42%" r="55%"><stop offset="0%" stopColor="#FEF3C7"/><stop offset="100%" stopColor="#FCD34D"/></radialGradient>
          <radialGradient id="ti-g" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3"/><stop offset="100%" stopColor="#78350F" stopOpacity="0"/></radialGradient>
          <filter id="ti-blur"><feGaussianBlur stdDeviation="2"/></filter>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#ti-g)" filter="url(#ti-blur)"/>
        <ellipse cx="40" cy="37" rx="19" ry="21" fill="url(#ti-f)"/>
        <line x1="40" y1="15" x2="40" y2="9" stroke="#FCD34D" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
        <line x1="33" y1="18" x2="29" y2="12" stroke="#FCD34D" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
        <line x1="47" y1="18" x2="51" y2="12" stroke="#FCD34D" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
        <path d="M21 37 H15 V31" stroke="#FCD34D" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7"/>
        <path d="M59 37 H65 V31" stroke="#FCD34D" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7"/>
        <ellipse cx="33" cy="36" rx="4" ry="4" fill="#D97706"/><ellipse cx="47" cy="36" rx="4" ry="4" fill="#D97706"/>
        <ellipse cx="33" cy="36" rx="2.2" ry="2.2" fill="#FFFBEB"/><ellipse cx="47" cy="36" rx="2.2" ry="2.2" fill="#FFFBEB"/>
        <circle cx="33" cy="36" r="0.9" fill="#92400E"/><circle cx="47" cy="36" r="0.9" fill="#92400E"/>
        <circle cx="33.8" cy="35" r="0.7" fill="white" opacity="0.9"/><circle cx="47.8" cy="35" r="0.7" fill="white" opacity="0.9"/>
        <path d="M35 51 Q40 55 45 51" stroke="#FDE68A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <circle cx="26" cy="44" r="1.4" fill="#FCD34D" opacity="0.4"/><circle cx="54" cy="44" r="1.4" fill="#FCD34D" opacity="0.4"/>
        <path d="M23 70 Q23 59 40 57 Q57 59 57 70" fill="#B45309" opacity="0.9"/>
      </svg>
    ),
  },
];

/* ── Typewriter ──────────────────────────────── */
function useTypewriter(text: string, speed = 52) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(""); setDone(false); let i = 0;
    const iv = setInterval(() => {
      i++; setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return { displayed, done };
}

/* ── Validation ──────────────────────────────── */
function validateStep1(f: Record<string, string>) {
  const e: Record<string, string> = {};
  if (!f.age || +f.age < 10 || +f.age > 110) e.age = "Enter a valid age (10–110)";
  if (!f.height || +f.height < 100 || +f.height > 250) e.height = "Enter height in cm (100–250)";
  if (!f.weight || +f.weight < 30 || +f.weight > 300) e.weight = "Enter weight in kg (30–300)";
  if (!f.averageSleep || f.averageSleep === "0") e.averageSleep = "Please set your sleep hours";
  return e;
}
function validateStep2(f: Record<string, string>) {
  const e: Record<string, string> = {};
  if (f.monthlyIncomeRange === "custom" && (!f.customIncome || +f.customIncome < 0)) e.customIncome = "Please enter your income";
  if (f.currentSavings === "") e.currentSavings = "Enter your savings (0 if none)";
  return e;
}
function validateStep3(f: Record<string, string>) {
  const e: Record<string, string> = {};
  if (!f.hoursStudied || f.hoursStudied === "0") e.hoursStudied = "Please set your daily hours";
  if (!f.learningProfile) e.learningProfile = "Please select your situation";
  return e;
}
function validateStep4(arch: string): Record<string, string> {
  return arch ? {} : { archetype: "Please choose your twin" };
}

/* ── Step meta ───────────────────────────────── */
const STEPS = [
  { label: "Health",   icon: HeartPulse, color: "#dc2626" },
  { label: "Finances", icon: Wallet,     color: "#059669" },
  { label: "Habits",   icon: Briefcase,  color: "#0044DD" },
  { label: "Twin",     icon: Users,      color: "#7c3aed" },
];

/* ── Main ────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const topRef = useRef<HTMLDivElement>(null);

  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [averageSleep, setAverageSleep] = useState("0");
  const [workoutFrequency, setWorkoutFrequency] = useState("0");
  const [activityLevel, setActivityLevel] = useState("moderately_active");
  const [healthConstraints, setHealthConstraints] = useState("none");
  const [customHealthConstraint, setCustomHealthConstraint] = useState("");

  const [monthlyIncomeRange, setMonthlyIncomeRange] = useState("0-20k");
  const [customIncome, setCustomIncome] = useState("");
  const [currentSavings, setCurrentSavings] = useState("");
  const [spendingStyle, setSpendingStyle] = useState("3");

  const [hoursStudied, setHoursStudied] = useState("0");
  const [learningProfile, setLearningProfile] = useState("");

  const [archetype, setArchetype] = useState("");
  const [showWow, setShowWow] = useState(false);
  const [wowStep, setWowStep] = useState(0);

  const { displayed, done } = useTypewriter(step === 0 ? "One last thing before you dive in." : "", 48);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!showWow) return;
    const delays = [900, 900, 900, 900, 1000, 1200];
    let idx = 0;
    const run = () => {
      if (idx < delays.length) { idx++; setWowStep(idx); setTimeout(run, delays[idx - 1]); }
      else { router.push("/dashboard"); }
    };
    setTimeout(run, delays[0]);
  }, [showWow, router]);

  const goNext = () => {
    let errors: Record<string, string> = {};
    if (step === 1) errors = validateStep1({ age, height, weight, averageSleep });
    else if (step === 2) errors = validateStep2({ monthlyIncomeRange, customIncome, currentSavings });
    else if (step === 3) errors = validateStep3({ hoursStudied, learningProfile });
    else if (step === 4) errors = validateStep4(archetype);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      return;
    }
    if (step === 4) finalizeOnboarding();
    else { setStep(s => s + 1); setFieldErrors({}); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const goBack = () => { setFieldErrors({}); setStep(s => s - 1); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const finalizeOnboarding = async () => {
    setLoading(true); setApiError(null);
    try {
      const pending = sessionStorage.getItem("syntra_pending_signup");
      if (!pending) throw new Error("Signup details not found. Please go back and fill in your details.");
      const { name, email, password } = JSON.parse(pending);

      // 1. Register User
      const rr = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const rd = await rr.json();
      if (!rr.ok) {
        if (rr.status === 409 || rd.message?.toLowerCase().includes("exist")) throw new Error("An account with this email already exists.");
        throw new Error(rd.message || "Registration failed.");
      }

      // 2. Sign In immediately to establish session cookies for subsequent API calls
      const sr = await signIn("credentials", { email, password, redirect: false });
      if (sr?.error) throw new Error("Sign-in failed. Please log in manually.");

      // 3. Save Onboarding Profile (now authorized under active session)
      const or = await fetch("/api/profile/onboard", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age, gender, height, weight, averageSleep, workoutFrequency, activityLevel,
          healthConstraints: healthConstraints === "custom" ? (customHealthConstraint || "none") : healthConstraints,
          monthlyIncomeRange, customIncome, currentSavings, spendingStyle,
          hoursStudied, learningProfile, archetype,
        }),
      });
      const od = await or.json();
      if (!or.ok) throw new Error(od.message || "Failed to save profile.");

      sessionStorage.removeItem("syntra_pending_signup");
      window.dispatchEvent(new Event("syntra-refresh"));
      setShowWow(true);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const FErr = ({ field }: { field: string }) =>
    fieldErrors[field] ? (
      <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: 5, fontWeight: 500, fontFamily: "'Inter',sans-serif" }}>
        · {fieldErrors[field]}
      </p>
    ) : null;

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6fa", fontFamily: '"DM Sans","Inter",-apple-system,sans-serif', display: "flex", flexDirection: "column", alignItems: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;}

        .fld-label {
          display:block; font-size:0.73rem; font-weight:700; color:#6b7280;
          text-transform:uppercase; letter-spacing:0.07em; margin-bottom:7px;
          font-family:'Inter',sans-serif;
        }
        .fld-input,.fld-select {
          width:100%; padding:12px 14px; border-radius:10px;
          border:1.5px solid #e2e6f0; background:#fff; color:#111;
          font-family:'Inter',sans-serif; font-size:0.9rem;
          outline:none; transition:all 0.18s; height:46px; -webkit-appearance:none;
        }
        .fld-input::placeholder { color:#c4cbda; }
        .fld-input:focus,.fld-select:focus { border-color:#0044DD; box-shadow:0 0 0 3px rgba(0,68,221,0.1); background:#fff; }
        .fld-input.err,.fld-select.err { border-color:#ef4444; background:#fef9f9; }

        .ob-range {
          -webkit-appearance:none; width:100%; height:4px;
          border-radius:99px; background:#e4e8f2; outline:none; cursor:pointer;
        }
        .ob-range::-webkit-slider-thumb {
          -webkit-appearance:none; width:20px; height:20px; border-radius:50%;
          background:#0044DD; border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,68,221,0.35); transition:transform 0.15s;
        }
        .ob-range::-webkit-slider-thumb:hover { transform:scale(1.2); }

        .btn-primary {
          display:inline-flex; align-items:center; justify-content:center; gap:8px;
          padding:13px 28px; border-radius:9999px; border:none;
          background:linear-gradient(135deg,#0033CC,#0055FF);
          color:#fff; font-family:'Inter',sans-serif; font-size:0.88rem; font-weight:700;
          letter-spacing:0.04em; text-transform:uppercase;
          cursor:pointer; transition:all 0.2s;
          box-shadow:0 4px 16px rgba(0,68,221,0.3);
        }
        .btn-primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,68,221,0.4); }
        .btn-primary:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

        .btn-ghost {
          display:inline-flex; align-items:center; gap:6px;
          padding:12px 20px; border-radius:9999px;
          border:1.5px solid #dde3f0; background:transparent; color:#8896b0;
          font-family:'Inter',sans-serif; font-size:0.86rem; font-weight:600;
          cursor:pointer; transition:all 0.18s;
        }
        .btn-ghost:hover { border-color:#0044DD; color:#0044DD; background:#eff4ff; }

        .day-btn {
          flex:1; padding:11px 0; border-radius:9px;
          border:1.5px solid #e2e6f0; background:#fff;
          color:#9ca3af; font-family:'Inter',sans-serif;
          font-size:0.85rem; font-weight:700; cursor:pointer; transition:all 0.15s;
        }
        .day-btn:hover:not(.sel) { border-color:#0044DD; color:#0044DD; }
        .day-btn.sel { background:#0044DD; border-color:#0044DD; color:#fff; }

        .av-card {
          border-radius:14px; border:2px solid #e4e8f2; background:#fff;
          padding:20px 14px; cursor:pointer; display:flex; flex-direction:column;
          align-items:center; gap:9px; text-align:center; transition:all 0.2s;
          box-shadow:0 1px 4px rgba(0,0,0,0.04);
        }
        .av-card:hover { transform:translateY(-3px); box-shadow:0 10px 28px rgba(0,68,221,0.1); }

        .type-cur {
          display:inline-block; width:2.5px; height:0.85em;
          background:#0044DD; margin-left:2px; vertical-align:middle;
          animation:blink 0.72s infinite;
        }
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }
        @keyframes shimmer { 0%{background-position:200% 0}100%{background-position:-200% 0} }
        @keyframes spinX { 100%{transform:rotate(360deg)} }
        @keyframes ping2 { 75%,100%{transform:scale(1.7);opacity:0} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }

        .step-body { animation: fadeSlideUp 0.28s ease forwards; }

        @media(max-width:560px){
          .av-grid { grid-template-columns:1fr 1fr !important; }
          .two-col { grid-template-columns:1fr !important; }
          .form-card { padding:28px 20px !important; }
        }
      `}</style>

      {/* ── WELCOME ── */}
      {step === 0 && (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 20px", minHeight:"100vh", width:"100%" }}>
          <div style={{ maxWidth:520, width:"100%", textAlign:"center" }}>

            {/* Syntra mark */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:36 }}>
              <div style={{
                width:40, height:40, borderRadius:11,
                background:"linear-gradient(135deg,#0033CC,#0055FF)",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 6px 20px rgba(0,68,221,0.3)",
              }}>
                <svg width="20" height="20" viewBox="0 0 72 72" fill="none">
                  <circle cx="28" cy="36" r="14" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2"/>
                  <circle cx="44" cy="36" r="14" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2"/>
                  <circle cx="36" cy="36" r="3" fill="#fff"/>
                </svg>
              </div>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"1.05rem", fontWeight:800, color:"#0d1117", letterSpacing:"0.14em", textTransform:"uppercase" }}>SYNTRA</span>
            </div>

            <h1 style={{
              fontFamily:"'DM Sans',sans-serif",
              fontSize:"clamp(2rem,5vw,2.8rem)", fontWeight:800,
              color:"#0d1117", letterSpacing:"-0.04em",
              margin:"0 0 4px", lineHeight:1.15, minHeight:"2.4em",
            }}>
              <span style={{ background:"linear-gradient(135deg,#0033CC,#0066FF)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                {displayed}
              </span>
              {!done && <span className="type-cur"/>}
            </h1>

            <p style={{ fontFamily:"'Inter',sans-serif", fontSize:"1rem", color:"#6b7280", lineHeight:1.72, maxWidth:420, margin:"20px auto 0" }}>
              We just need a few quick details about your lifestyle, finances, and habits.
              This helps Syntra personalise everything for you from day one.
            </p>

            {/* Step preview */}
            <div style={{ display:"flex", justifyContent:"center", gap:8, flexWrap:"wrap", margin:"28px 0 32px" }}>
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} style={{
                    display:"flex", alignItems:"center", gap:6,
                    background:"#fff", border:"1.5px solid #e8ecf6",
                    borderRadius:99, padding:"6px 14px",
                    fontSize:"0.75rem", fontWeight:600, color:"#374151",
                    fontFamily:"'Inter',sans-serif",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
                  }}>
                    <Icon size={12} color={s.color}/>
                    {s.label}
                  </div>
                );
              })}
            </div>

            <button className="btn-primary" onClick={() => setStep(1)} style={{ padding:"15px 40px", fontSize:"0.92rem" }}>
              Let's go <ArrowRight size={17}/>
            </button>

            <p style={{ marginTop:14, fontSize:"0.74rem", color:"#b0b9cc", fontFamily:"'Inter',sans-serif" }}>
              2 minutes · 4 steps · Your data stays private
            </p>
          </div>
        </div>
      )}

      {/* ── STEPS 1–4 ── */}
      {step >= 1 && step <= 4 && (
        <div style={{ width:"100%", maxWidth:620, padding:"40px 16px 60px" }}>

          {/* Step indicator — top of page, above card */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, padding:"0 4px" }} ref={topRef}>
            {/* Pill steps */}
            <div style={{ display:"flex", gap:6 }}>
              {STEPS.map((s, i) => {
                const n = i + 1;
                const Icon = s.icon;
                const isActive = step === n;
                const isDone = step > n;
                return (
                  <div key={i} style={{
                    display:"flex", alignItems:"center", gap:5,
                    padding: isActive ? "6px 14px" : "6px 10px",
                    borderRadius:99,
                    background: isDone ? "#0044DD" : isActive ? "#fff" : "transparent",
                    border: isDone ? "none" : isActive ? "1.5px solid #e2e6f0" : "none",
                    boxShadow: isActive ? "0 2px 10px rgba(0,68,221,0.1)" : "none",
                    transition:"all 0.25s",
                  }}>
                    {isDone ? (
                      <CheckCircle2 size={14} color="#fff"/>
                    ) : (
                      <Icon size={14} color={isActive ? s.color : "#c4cdd8"}/>
                    )}
                    {isActive && (
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:"0.72rem", fontWeight:700, color:"#374151", whiteSpace:"nowrap" }}>
                        {s.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Step counter */}
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:"0.72rem", fontWeight:600, color:"#9ca3af" }}>
              {step} / 4
            </span>
          </div>

          {/* Thin progress bar */}
          <div style={{ height:3, background:"#e8ecf6", borderRadius:99, marginBottom:24, overflow:"hidden" }}>
            <div style={{
              height:"100%", width:`${(step / 4) * 100}%`,
              background:"linear-gradient(90deg,#0033CC,#0066FF)",
              borderRadius:99, transition:"width 0.4s cubic-bezier(0.4,0,0.2,1)",
              position:"relative", overflow:"hidden",
            }}>
              <div style={{
                position:"absolute", inset:0,
                background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.5) 50%,transparent 100%)",
                backgroundSize:"200% 100%", animation:"shimmer 1.6s linear infinite",
              }}/>
            </div>
          </div>

          {/* White card */}
          <div className="form-card" style={{
            background:"#fff", borderRadius:20, padding:"36px 36px 28px",
            border:"1px solid #eaedf5",
            boxShadow:"0 2px 20px rgba(0,40,120,0.07), 0 1px 3px rgba(0,0,0,0.04)",
          }}>

            {/* Step heading */}
            <div className="step-body" key={step} style={{ marginBottom:28 }}>
              <h2 style={{
                fontFamily:"'DM Sans',sans-serif", fontSize:"1.55rem", fontWeight:800,
                color:"#0d1117", margin:"0 0 6px", letterSpacing:"-0.03em", lineHeight:1.2,
              }}>
                {step === 1 && "Tell us about your body and lifestyle"}
                {step === 2 && "A quick look at your finances"}
                {step === 3 && "How do you spend your time?"}
                {step === 4 && "Choose your AI twin"}
              </h2>
              <p style={{ fontFamily:"'Inter',sans-serif", fontSize:"0.88rem", color:"#9ca3af", lineHeight:1.6, margin:0 }}>
                {step === 1 && "Helps Syntra understand your energy baseline and physical habits."}
                {step === 2 && "Just a starting point — you can update this anytime."}
                {step === 3 && "Be honest. Syntra works best when it knows where you actually are."}
                {step === 4 && "Pick the version of yourself Syntra should focus on helping."}
              </p>
            </div>

            {/* Error banner */}
            {hasErrors && (
              <div style={{
                background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10,
                padding:"11px 16px", color:"#dc2626", fontSize:"0.82rem", fontWeight:500,
                fontFamily:"'Inter',sans-serif", marginBottom:22, display:"flex", gap:8, alignItems:"center",
              }}>
                ⚠ Please fill in all required fields.
              </div>
            )}

            {/* ── Step 1 ── */}
            {step === 1 && (
              <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                <div className="two-col" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <div>
                    <label className="fld-label">Age *</label>
                    <input type="number" min="10" max="110" placeholder="e.g. 22"
                      className={`fld-input${fieldErrors.age?" err":""}`}
                      value={age} onChange={e => setAge(e.target.value)}/>
                    <FErr field="age"/>
                  </div>
                  <div>
                    <label className="fld-label">Gender</label>
                    <select className="fld-select" value={gender} onChange={e => setGender(e.target.value)}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non-binary">Non-Binary</option>
                    </select>
                  </div>
                </div>
                <div className="two-col" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <div>
                    <label className="fld-label">Height (cm) *</label>
                    <input type="number" min="100" max="250" placeholder="e.g. 175"
                      className={`fld-input${fieldErrors.height?" err":""}`}
                      value={height} onChange={e => setHeight(e.target.value)}/>
                    <FErr field="height"/>
                  </div>
                  <div>
                    <label className="fld-label">Weight (kg) *</label>
                    <input type="number" min="30" max="300" placeholder="e.g. 70"
                      className={`fld-input${fieldErrors.weight?" err":""}`}
                      value={weight} onChange={e => setWeight(e.target.value)}/>
                    <FErr field="weight"/>
                  </div>
                </div>
                <div>
                  <label className="fld-label">Activity level</label>
                  <select className="fld-select" value={activityLevel} onChange={e => setActivityLevel(e.target.value)}>
                    <option value="sedentary">Mostly sitting — desk job, little exercise</option>
                    <option value="lightly_active">Lightly active — occasional walks or gym</option>
                    <option value="moderately_active">Moderately active — gym 3–4× per week</option>
                    <option value="very_active">Very active — intense training 5–6× per week</option>
                    <option value="athlete">Athlete — training twice a day</option>
                  </select>
                </div>
                <div>
                  <label className="fld-label" style={{ display:"flex", justifyContent:"space-between" }}>
                    <span>Average sleep per night *</span>
                    <span style={{ color: fieldErrors.averageSleep?"#dc2626":"#0044DD", fontWeight:800, textTransform:"none", letterSpacing:0 }}>{averageSleep}h</span>
                  </label>
                  <input type="range" min="4" max="10" step="0.5" className="ob-range" value={averageSleep} onChange={e => setAverageSleep(e.target.value)}/>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                    <span style={{ fontSize:"0.7rem", color:"#c4cbda", fontFamily:"'Inter',sans-serif" }}>4h</span>
                    <span style={{ fontSize:"0.7rem", color:"#c4cbda", fontFamily:"'Inter',sans-serif" }}>10h</span>
                  </div>
                  <FErr field="averageSleep"/>
                </div>
                <div>
                  <label className="fld-label" style={{ display:"flex", justifyContent:"space-between" }}>
                    <span>Workouts per week</span>
                    <span style={{ color:"#0044DD", fontWeight:800, textTransform:"none", letterSpacing:0 }}>{workoutFrequency}×</span>
                  </label>
                  <input type="range" min="0" max="7" step="1" className="ob-range" value={workoutFrequency} onChange={e => setWorkoutFrequency(e.target.value)}/>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                    <span style={{ fontSize:"0.7rem", color:"#c4cbda", fontFamily:"'Inter',sans-serif" }}>None</span>
                    <span style={{ fontSize:"0.7rem", color:"#c4cbda", fontFamily:"'Inter',sans-serif" }}>Every day</span>
                  </div>
                </div>
                <div>
                  <label className="fld-label">Any health conditions?</label>
                  <select className="fld-select" value={healthConstraints} onChange={e => setHealthConstraints(e.target.value)}>
                    <option value="none">None — I'm generally healthy</option>
                    <option value="diabetes">Diabetes</option>
                    <option value="hypertension">High Blood Pressure</option>
                    <option value="asthma">Asthma</option>
                    <option value="custom">Other</option>
                  </select>
                </div>
                {healthConstraints === "custom" && (
                  <div>
                    <label className="fld-label">Please describe</label>
                    <input type="text" className="fld-input" placeholder="e.g. Thyroid, Migraines..."
                      value={customHealthConstraint} onChange={e => setCustomHealthConstraint(e.target.value)}/>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                <div>
                  <label className="fld-label">Monthly income (after tax)</label>
                  <select className="fld-select" value={monthlyIncomeRange} onChange={e => setMonthlyIncomeRange(e.target.value)}>
                    <option value="student">Student — no income right now</option>
                    <option value="0-20k">Up to ₹20,000 / month</option>
                    <option value="20-50k">₹20,000 – ₹50,000 / month</option>
                    <option value="50-100k">₹50,000 – ₹1,00,000 / month</option>
                    <option value="100k+">Over ₹1,00,000 / month</option>
                    <option value="custom">Enter exact amount</option>
                  </select>
                </div>
                {monthlyIncomeRange === "custom" && (
                  <div>
                    <label className="fld-label">Exact monthly income (₹) *</label>
                    <input type="number" placeholder="e.g. 45000"
                      className={`fld-input${fieldErrors.customIncome?" err":""}`}
                      value={customIncome} onChange={e => setCustomIncome(e.target.value)}/>
                    <FErr field="customIncome"/>
                  </div>
                )}
                <div>
                  <label className="fld-label">Current savings (₹) *</label>
                  <input type="number"
                    className={`fld-input${fieldErrors.currentSavings?" err":""}`}
                    placeholder="Enter 0 if you haven't started saving yet"
                    value={currentSavings} onChange={e => setCurrentSavings(e.target.value)}/>
                  <FErr field="currentSavings"/>
                </div>
                <div>
                  <label className="fld-label" style={{ display:"flex", justifyContent:"space-between" }}>
                    <span>Spending style</span>
                    <span style={{ color:"#0044DD", fontWeight:800, textTransform:"none", letterSpacing:0 }}>
                      {spendingStyle==="1"?"Very frugal":spendingStyle==="2"?"Careful":spendingStyle==="3"?"Balanced":spendingStyle==="4"?"Generous":"Big spender"}
                    </span>
                  </label>
                  <input type="range" min="1" max="5" step="1" className="ob-range" value={spendingStyle} onChange={e => setSpendingStyle(e.target.value)}/>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                    <span style={{ fontSize:"0.7rem", color:"#c4cbda", fontFamily:"'Inter',sans-serif" }}>Frugal</span>
                    <span style={{ fontSize:"0.7rem", color:"#c4cbda", fontFamily:"'Inter',sans-serif" }}>Big spender</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3 ── */}
            {step === 3 && (
              <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                <div>
                  <label className="fld-label" style={{ display:"flex", justifyContent:"space-between" }}>
                    <span>Study / work hours *</span>
                    <span style={{ color:fieldErrors.hoursStudied?"#dc2626":"#0044DD", fontWeight:800, textTransform:"none", letterSpacing:0 }}>{hoursStudied}h</span>
                  </label>
                  <input type="range" min="0" max="14" step="0.5" className="ob-range" value={hoursStudied} onChange={e => setHoursStudied(e.target.value)}/>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                    <span style={{ fontSize:"0.7rem", color:"#c4cbda", fontFamily:"'Inter',sans-serif" }}>0h</span>
                    <span style={{ fontSize:"0.7rem", color:"#c4cbda", fontFamily:"'Inter',sans-serif" }}>14h</span>
                  </div>
                  <FErr field="hoursStudied"/>
                </div>

                <div>
                  <label className="fld-label">Current situation *</label>
                  <select className={`fld-select${fieldErrors.learningProfile?" err":""}`}
                    value={learningProfile} onChange={e => setLearningProfile(e.target.value)}>
                    <option value="">Select one...</option>
                    <option value="student">Student — exams or placement prep</option>
                    <option value="professional">Working professional — career growth</option>
                    <option value="founder">Founder / builder — working on a product</option>
                    <option value="freelancer">Freelancer — managing clients and projects</option>
                    <option value="job_seeker">Actively looking for a job</option>
                  </select>
                  <FErr field="learningProfile"/>
                </div>
              </div>
            )}

            {/* ── Step 4 ── */}
            {step === 4 && (
              <div>
                <div className="av-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {AVATARS.map(av => {
                    const sel = archetype === av.id;
                    return (
                      <div key={av.id} className="av-card"
                        onClick={() => { setArchetype(av.id); setFieldErrors({}); }}
                        style={{
                          borderColor: sel ? av.borderActive : "#e4e8f2",
                          background: sel ? av.lightBg : "#fff",
                          boxShadow: sel ? `0 6px 24px ${av.accent}1a` : "0 1px 4px rgba(0,0,0,0.04)",
                          transform: sel ? "translateY(-3px)" : "",
                        }}>
                        <div style={{
                          width:80, height:80, borderRadius:"50%", background:av.lightBg,
                          border:`2px solid ${sel?av.borderActive:"#edf0f8"}`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          boxShadow: sel?`0 0 0 4px ${av.accent}18`:"none", transition:"all 0.2s",
                        }}>
                          {av.svg}
                        </div>
                        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.98rem", fontWeight:800, color:sel?av.accent:"#0d1117" }}>
                          {av.name}
                        </div>
                        <div style={{ fontSize:"0.7rem", color:"#9ca3af", lineHeight:1.5, fontFamily:"'Inter',sans-serif", fontWeight:500 }}>
                          {av.focus}
                        </div>
                        {sel && (
                          <div style={{
                            display:"inline-flex", alignItems:"center", gap:4,
                            background:av.accent, borderRadius:99, padding:"3px 10px",
                            fontSize:"0.61rem", fontWeight:700, color:"#fff",
                            textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:"'Inter',sans-serif",
                          }}>
                            <CheckCircle2 size={9}/> Selected
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <FErr field="archetype"/>
                {apiError && (
                  <div style={{
                    background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10,
                    padding:"11px 16px", color:"#dc2626", fontSize:"0.82rem", fontWeight:500,
                    fontFamily:"'Inter',sans-serif", marginTop:16,
                  }}>
                    ⚠ {apiError}
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              marginTop:32, paddingTop:22, borderTop:"1px solid #f2f4fa",
            }}>
              <button className="btn-ghost" onClick={goBack}>← Back</button>
              <button className="btn-primary" onClick={goNext} disabled={loading}>
                {loading
                  ? <><Cpu size={15} style={{ animation:"spinX 1.4s linear infinite" }}/> Activating...</>
                  : step === 4
                  ? <><CheckCircle2 size={15}/> Activate My Twin</>
                  : <>Continue <ArrowRight size={15}/></>
                }
              </button>
            </div>
          </div>

          {/* Trust line */}
          <p style={{ textAlign:"center", fontSize:"0.73rem", color:"#b8c0cc", fontFamily:"'Inter',sans-serif", marginTop:18 }}>
            🔒 Your data is encrypted &nbsp;·&nbsp; ✓ Free to join &nbsp;·&nbsp; No spam, ever
          </p>
        </div>
      )}

      {/* ── WOW ── */}
      {showWow && (
        <div style={{
          position:"fixed", inset:0, zIndex:9999,
          background:"linear-gradient(140deg,#0033CC 0%,#0055FF 60%,#2211EE 100%)",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        }}>
          <style>{`
            @keyframes ping2{75%,100%{transform:scale(1.7);opacity:0}}
            @keyframes spin2{100%{transform:rotate(360deg)}}
          `}</style>
          <div style={{ position:"relative", width:100, height:100, marginBottom:36 }}>
            <div style={{ position:"absolute", inset:-12, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.28)", animation:"ping2 1.8s cubic-bezier(0,0,0.2,1) infinite" }}/>
            <div style={{
              position:"absolute", inset:0, borderRadius:"50%",
              background:"rgba(255,255,255,0.12)", backdropFilter:"blur(8px)",
              border:"1.5px solid rgba(255,255,255,0.22)",
              display:"flex", alignItems:"center", justifyContent:"center",
              animation:"spin2 10s linear infinite",
            }}>
              <Cpu size={42} color="#fff"/>
            </div>
          </div>
          <div style={{ fontSize:"0.7rem", letterSpacing:"0.2em", color:"rgba(255,255,255,0.65)", fontWeight:700, textTransform:"uppercase", marginBottom:8, fontFamily:"'Inter',sans-serif" }}>
            Activating Your Twin
          </div>
          <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"1.75rem", fontWeight:800, color:"#fff", letterSpacing:"-0.03em", marginBottom:32 }}>
            Building Your Digital Twin...
          </h2>
          <div style={{
            background:"rgba(255,255,255,0.1)", backdropFilter:"blur(12px)",
            border:"1px solid rgba(255,255,255,0.16)",
            borderRadius:16, padding:"22px 32px", width:"100%", maxWidth:420,
            display:"flex", flexDirection:"column", gap:12,
          }}>
            {["Setting up your profile","Mapping your health habits","Analysing your finances","Understanding your work patterns","Personalising your experience","Twin is ready"].map((label, idx) => {
              const done2 = wowStep > idx, active = wowStep === idx;
              return (
                <div key={idx} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", opacity:wowStep<idx?0.28:1, transition:"opacity 0.3s" }}>
                  <span style={{ fontSize:"0.86rem", fontWeight:600, fontFamily:"'Inter',sans-serif", color:"#fff", display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", flexShrink:0, background:done2?"#4ade80":active?"#fff":"rgba(255,255,255,0.3)", boxShadow:active?"0 0 8px rgba(255,255,255,0.8)":"none" }}/>
                    {label}
                  </span>
                  <span style={{ fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", color:done2?"#4ade80":active?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.28)", fontFamily:"'Inter',sans-serif" }}>
                    {done2?"✓ Done":active?"Working...":"Pending"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}