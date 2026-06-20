"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { NetWorthPanel } from "@/components/NetWorthPanel";
import {
  HeartPulse, Wallet, Briefcase, Zap,
  Droplets, Moon, Dumbbell, Activity, TrendingUp,
  AlertTriangle, CheckCircle2, Send, Upload, MessageSquare,
  Sparkles, Star, Bell, Settings, Search, LayoutDashboard,
  LineChart, Target, History, Plug, Edit3, Heart,
  Menu, X, ArrowLeft, ChevronRight, BarChart3,
  RefreshCw, Check,
} from "lucide-react";

/* ─── TYPES ─────────────────────────────────────────────────────── */
interface HealthData {
  sleepHours: number; workoutMinutes: number; stressLevel: number;
  moodScore: number; energyLevel: number; waterGlasses: number;
  skippedMeals: string[]; caloriesConsumed: string;
  calorieGoal: string; mealsEatenToday: string;
  spentTimeWithFriends: boolean; socialCount: number;
  relationshipQuality: number;
}
interface FinanceData {
  amountSaved: string; discretionarySpent: string; spendingCategory: string;
  biggestExpenseToday: string; impulseSpend: boolean;
}
interface CareerData {
  hoursStudied: string; productivityRating: number; sessionsCompleted: string;
  courseName: string; goalWorkedOn: string; blockerToday: string;
}
interface LatestData {
  health: { data: any; date: string } | null;
  finance: { data: any; date: string } | null;
  career: { data: any; date: string } | null;
  reflection: { data: any; date: string } | null;
}

type SidebarPanel = "manual" | "social" | "assets" | "uploads" | "api";

const NAV_LINKS = [
  { href: "/dashboard",          label: "Dashboard" },
  { href: "/ingestion",          label: "Ingestion" },
  { href: "/goals",              label: "Goals" },
  { href: "/simulator",          label: "Simulator" },
  { href: "/insights",           label: "Insights" },
  { href: "/profile",            label: "Profile" },
];

/* ─── SCORE HELPERS ──────────────────────────────────────────────── */
function previewHealthScore(h: HealthData) {
  let s = 0;
  if (h.sleepHours >= 7 && h.sleepHours <= 9) s += 40;
  else if (h.sleepHours >= 6 || h.sleepHours === 10) s += 20;
  else s += 5;

  if (h.workoutMinutes >= 60) s += 40;
  else if (h.workoutMinutes >= 30) s += 25;
  else if (h.workoutMinutes > 0) s += 10;

  s += Math.max(0, 20 - h.stressLevel * 2);

  if (h.waterGlasses >= 8) s += 5;
  else if (h.waterGlasses <= 2) s -= 3;

  return Math.max(0, Math.min(100, s));
}
function previewFinanceScore(f: FinanceData, profile: any) {
  let score = 50;
  const saved = Number(f.amountSaved) || 0;
  const spent = Number(f.discretionarySpent) || 0;

  const monthlyIncome = profile?.monthlyIncome || 50000;
  const monthlyBudget = profile?.monthlyBudget || 15000;

  const dailyIncome = monthlyIncome / 30;
  const dailyBudget = monthlyBudget / 30;

  const savingsRate = dailyIncome > 0 ? (saved / dailyIncome) : 0;
  if (savingsRate >= 0.30) score += 30;
  else if (savingsRate >= 0.20) score += 20;
  else if (savingsRate >= 0.10) score += 15;
  else if (saved > 0) score += 5;

  if (spent === 0) {
    score += 20;
  } else if (dailyBudget > 0 && spent < 0.10 * dailyBudget) {
    score += 10;
  } else if (dailyBudget > 0 && spent > 1.50 * dailyBudget) {
    score -= 30;
  } else if (dailyBudget > 0 && spent > 1.00 * dailyBudget) {
    score -= 20;
  }

  if (f.impulseSpend) score -= 5;
  return Math.max(0, Math.min(100, score));
}
function previewCareerScore(c: CareerData) {
  let s = 0;
  const hrs = Number(c.hoursStudied) || 0;
  if (hrs >= 4) s += 50; else if (hrs >= 2) s += 30; else if (hrs > 0) s += 10;
  s += c.productivityRating * 5;
  return Math.max(0, Math.min(100, s));
}

const fmtDate = (d: string) => {
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  return dd === 1 ? "Yesterday" : `${dd}d ago`;
};

/* ─── TYPEWRITER ─────────────────────────────────────────────────── */
function TypewriterTitle({ phrases }: { phrases: string[] }) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    let pi = 0, ci = 0, deleting = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = phrases[pi];
      if (!deleting) {
        setDisplay(full.slice(0, ci + 1)); ci++;
        if (ci === full.length) { deleting = true; t = setTimeout(tick, 2600); }
        else t = setTimeout(tick, 72);
      } else {
        setDisplay(full.slice(0, ci - 1)); ci--;
        if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; t = setTimeout(tick, 380); }
        else t = setTimeout(tick, 36);
      }
    };
    t = setTimeout(tick, 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <span>
      {display}
      <span style={{ display:"inline-block", width:"2px", height:"1em", background:"var(--brand)", marginLeft:"3px", verticalAlign:"text-bottom", borderRadius:"1px", animation:"cur-blink 1s step-end infinite" }}/>
    </span>
  );
}

/* ─── TOP NAVBAR ─────────────────────────────────────────────────── */
function TopNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className={`top-nav${scrolled ? " top-nav-scrolled" : ""}`}>
      <div className="top-nav-inner">
        <Link href="/" className="top-nav-logo">syn<strong>tra</strong></Link>
        <nav className="top-nav-links">
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href}
              className={`top-nav-link${l.href === "/ingestion" ? " top-nav-link-active" : ""}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <button className="top-nav-hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>
      <div className={`top-nav-mobile-menu${menuOpen ? " open" : ""}`}>
        {NAV_LINKS.map(l => (
          <Link key={l.href} href={l.href}
            className={`top-nav-mobile-link${l.href === "/ingestion" ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── SIDEBAR NAV ITEM ───────────────────────────────────────────── */
function NavItem({ icon, label, sub, active, onClick, badge }: {
  icon: React.ReactNode; label: string; sub?: string; active: boolean;
  onClick: () => void; badge?: string | number;
}) {
  return (
    <button className={`nav-item${active ? " nav-item-active" : ""}`} onClick={onClick}>
      <div className="nav-item-icon">{icon}</div>
      <div className="nav-item-text">
        <span className="nav-item-label">{label}</span>
        {sub && <span className="nav-item-sub">{sub}</span>}
      </div>
      {badge !== undefined && <span className="nav-badge">{badge}</span>}
      <ChevronRight size={13} className="nav-arrow" />
    </button>
  );
}

/* ─── SLIDER ─────────────────────────────────────────────────────── */
function Slider({ label, value, onChange, min, max, step, icon, unit, color, hint }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number;
  icon: React.ReactNode; unit?: string; color: string; hint?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider-box">
      <div className="slider-row-top">
        <div className="slider-label-group">
          <span style={{ color, display:"flex", alignItems:"center" }}>{icon}</span>
          <span className="slider-label">{label}</span>
        </div>
        <span className="slider-badge" style={{ background: `${color}14`, color, border: `1px solid ${color}28` }}>
          {value}{unit}
        </span>
      </div>
      <div style={{ padding:"4px 0" }}>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="range-inp"
          style={{ "--c": color, "--p": `${pct}%` } as React.CSSProperties}
        />
      </div>
      <div className="slider-ends">
        <span>{min}{unit}</span>
        {hint && <span style={{ fontSize:"0.66rem", color:"#94a3b8", fontStyle:"italic" }}>{hint}</span>}
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

/* ─── TEXT FIELD ─────────────────────────────────────────────────── */
function Field({ label, req, opt, type = "text", value, onChange, placeholder, textarea, note }: {
  label: string; req?: boolean; opt?: boolean; type?: string;
  value: string; onChange: (v: string) => void; placeholder?: string;
  textarea?: boolean; note?: string;
}) {
  return (
    <div className="field-grp">
      <label className="field-label">
        {label}
        {req && <span style={{ color:"var(--brand)" }}> *</span>}
        {opt && <span style={{ fontSize:"0.67rem", fontWeight:400, color:"var(--text-muted)" }}> — optional</span>}
      </label>
      {note && <span style={{ fontSize:"0.7rem", color:"var(--text-muted)" }}>{note}</span>}
      {textarea
        ? <textarea className="field-input f-textarea" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
        : <input type={type} className="field-input" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  );
}

/* ─── PROCESSING SCREEN ──────────────────────────────────────────── */
function ProcessingScreen() {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: "🏃", text: "Looking at your health data..." },
    { icon: "💰", text: "Reviewing your spending & savings..." },
    { icon: "📚", text: "Checking your study progress..." },
    { icon: "🧠", text: "Understanding how you felt today..." },
    { icon: "✨", text: "Building your personal insights..." },
    { icon: "🎯", text: "Your dashboard is ready!" },
  ];
  const pct = Math.round((step / (steps.length - 1)) * 100);
  useEffect(() => {
    const iv = setInterval(() => setStep(p => p < steps.length - 1 ? p + 1 : p), 650);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="proc-root">
      <div className="proc-card">
        <div className="proc-logo">
          <div className="lp-logo-dot" />
          <span>Syntra</span>
        </div>
        <div className="proc-emoji-wrap">
          <div className="proc-emoji-ring" />
          <span key={step} style={{ fontSize:"2.4rem" }}>{steps[step].icon}</span>
        </div>
        <div className="proc-step-text" key={`text-${step}`}>{steps[step].text}</div>
        <p style={{ fontSize:"0.84rem", color:"var(--text-secondary)", lineHeight:1.6, marginBottom:36 }}>
          {pct < 100 ? "Hang tight — making sense of your day." : "All done! Taking you to your dashboard."}
        </p>
        <div style={{ width:"100%", background:"var(--bg)", borderRadius:9999, height:8, overflow:"hidden", marginBottom:12 }}>
          <div style={{ height:"100%", borderRadius:9999, background:"linear-gradient(90deg,var(--brand),#0066FF)", width:`${pct}%`, transition:"width 0.65s cubic-bezier(0.34,1.56,0.64,1)" }} />
        </div>
        <div style={{ fontSize:"0.75rem", fontWeight:700, color:"var(--brand)", marginBottom:28 }}>{pct}% complete</div>
        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:7 }}>
          {steps.map((s, i) => (
            <div key={i} className={`proc-step-row ${i < step ? "done" : i === step ? "active" : "pending"}`}>
              <span>{s.icon}</span>
              <span style={{ flex:1 }}>{s.text}</span>
              {i < step && <CheckCircle2 size={14} style={{ color:"#22c55e" }} />}
              {i === step && <div className="lp-logo-dot" />}
            </div>
          ))}
        </div>
        <div style={{ marginTop:28, padding:"13px 17px", background:"var(--bg)", border:"1px solid var(--border)", borderRadius:13, fontSize:"0.77rem", color:"var(--text-secondary)", lineHeight:1.55, fontStyle:"italic", maxWidth:360, textAlign:"center" }}>
          💡 The more consistently you log, the smarter your insights become.
        </div>
      </div>
    </div>
  );
}

/* ─── API SYNC PANEL ─────────────────────────────────────────────── */
function ApiSyncPanel({
  googleFitConnected,
  setGoogleFitConnected,
  googleFitLastSync,
  setGoogleFitLastSync,
  mockConnected,
  setMockConnected,
  mockSyncTimes,
  setMockSyncTimes,
  loading,
  onSuccess
}: {
  googleFitConnected: boolean;
  setGoogleFitConnected: React.Dispatch<React.SetStateAction<boolean>>;
  googleFitLastSync: string | null;
  setGoogleFitLastSync: React.Dispatch<React.SetStateAction<string | null>>;
  mockConnected: { apple: boolean; bank: boolean; coursera: boolean; hungerbox: boolean };
  setMockConnected: React.Dispatch<React.SetStateAction<{ apple: boolean; bank: boolean; coursera: boolean; hungerbox: boolean }>>;
  mockSyncTimes: Record<string, string | null>;
  setMockSyncTimes: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
  loading: boolean;
  onSuccess?: () => void;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncStatuses, setSyncStatuses] = useState<Record<string, "idle" | "syncing" | "synced" | "error">>({});

  const toggleMockIntegration = (key: keyof typeof mockConnected) => {
    setMockConnected(p => {
      const updated = { ...p, [key]: !p[key] };
      localStorage.setItem("syntra_mock_integrations", JSON.stringify(updated));
      return updated;
    });
  };

  const handleGoogleFitClick = () => {
    if (googleFitConnected) {
      setDisconnecting(true);
      fetch("/api/auth/google-fit/disconnect", { method: "POST" })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setGoogleFitConnected(false);
            setGoogleFitLastSync(null);
          }
          setDisconnecting(false);
        })
        .catch(() => setDisconnecting(false));
    } else {
      window.location.href = "/api/auth/google-fit/connect";
    }
  };

  const handleSync = (key: string, name: string, isReal: boolean) => {
    setSyncStatuses(p => ({ ...p, [key]: "syncing" }));
    
    const url = isReal ? "/api/telemetry/sync" : "/api/ingestion/sync-prototype";
    const body = isReal ? undefined : JSON.stringify({ connector: key });
    
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      credentials: "include"
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const nowStr = new Date().toISOString();
          if (isReal) {
            setGoogleFitLastSync(fmtDate(nowStr));
          } else {
            setMockSyncTimes(p => {
              const updated = { ...p, [key]: nowStr };
              localStorage.setItem("syntra_mock_sync_times", JSON.stringify(updated));
              return updated;
            });
          }
          setSyncStatuses(p => ({ ...p, [key]: "synced" }));
          if (onSuccess) onSuccess();
          
          setTimeout(() => {
            setSyncStatuses(p => ({ ...p, [key]: "idle" }));
          }, 3000);
        } else {
          setSyncStatuses(p => ({ ...p, [key]: "error" }));
          setTimeout(() => {
            setSyncStatuses(p => ({ ...p, [key]: "idle" }));
          }, 3000);
        }
      })
      .catch((e) => {
        console.error(e);
        setSyncStatuses(p => ({ ...p, [key]: "error" }));
        setTimeout(() => {
          setSyncStatuses(p => ({ ...p, [key]: "idle" }));
        }, 3000);
      });
  };

  const integrations = [
    { key: "apple", name: "Apple Health", desc: "Sync sleep, activity, heart rate and wellness metrics.", icon: "❤️", color: "#ff3b30", bg: "#fff0f0", lastSync: mockSyncTimes.apple ? fmtDate(mockSyncTimes.apple) : null, isReal: false },
    { key: "gfit", name: "Google Fit", desc: "Sync steps, workouts, calories and health metrics.", icon: "🏃", color: "#ea580c", bg: "#fff7ed", lastSync: googleFitLastSync, isReal: true, connected: googleFitConnected },
    { key: "hungerbox", name: "HungerBox", desc: "Sync cafeteria orders, meal logs and nutrition history dynamically.", icon: "🍱", color: "#e11d48", bg: "#fff1f2", lastSync: mockSyncTimes.hungerbox ? fmtDate(mockSyncTimes.hungerbox) : null, isReal: false },
    { key: "bank", name: "Bank Account", desc: "Sync transactions, savings and spending patterns via open banking.", icon: "🏦", color: "#16a34a", bg: "#f0fdf4", lastSync: mockSyncTimes.bank ? fmtDate(mockSyncTimes.bank) : null, isReal: false },
    { key: "coursera", name: "Coursera", desc: "Sync completed courses, learning progress and certifications.", icon: "🎓", color: "var(--brand)", bg: "var(--brand-light)", lastSync: mockSyncTimes.coursera ? fmtDate(mockSyncTimes.coursera) : null, isReal: false },
  ];

  const totalConnected = (googleFitConnected ? 1 : 0) + Object.values(mockConnected).filter(Boolean).length;

  return (
    <div>
      <div className="page-top">
        <div>
          <div className="page-eyebrow"><div className="page-eyebrow-dot" /><span className="page-eyebrow-text">Check-in</span></div>
          <h1 className="page-title"><TypewriterTitle phrases={["API Sync", "Connect Your Apps", "Auto-Import Data"]} /></h1>
          <p className="page-subtitle">Connect your favourite apps to automatically import data into Syntra.</p>
        </div>
      </div>
      <div className="body-pad">
        <div className="section-hd">
          <span className="section-hd-label"><Plug size={11} /> Connected integrations</span>
          <div className="section-hd-rule" />
          <span style={{ fontSize:"0.67rem", fontWeight:700, padding:"2px 8px", borderRadius:6, background:"#f0fdf4", color:"#15803d", border:"1px solid #bbf7d0", whiteSpace:"nowrap" }}>
            {loading ? "Loading..." : `${totalConnected} connected`}
          </span>
        </div>
        <div className="integrations-grid">
          {integrations.map(intg => {
            const isConn = intg.isReal ? intg.connected : mockConnected[intg.key as keyof typeof mockConnected];
            return (
              <div key={intg.key} className="form-card" style={{ marginBottom:0 }}>
                <div className="form-card-stripe" style={{ background: isConn ? `linear-gradient(90deg,${intg.color},${intg.color}99)` : "linear-gradient(90deg,#e2e8f2,#f0f4f8)" }} />
                <div className="form-card-body" style={{ padding:"18px 20px" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                    <div style={{ width:46, height:46, borderRadius:13, background:intg.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.3rem", flexShrink:0 }}>{intg.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                        <span style={{ fontFamily:"DM Sans,sans-serif", fontSize:"0.88rem", fontWeight:800, color:"var(--text-primary)" }}>{intg.name}</span>
                        <span 
                          style={{
                            fontSize: "0.85rem",
                            cursor: intg.isReal ? "default" : "help"
                          }}
                          title={intg.isReal ? "Live Integration" : "Prototype Connector: Uses representative telemetry data matching the source platform schema."}
                        >
                          {intg.isReal ? "🟢" : "🟡"}
                        </span>
                      </div>
                      <div style={{ fontSize:"0.72rem", color:"var(--text-secondary)", lineHeight:1.45 }}>{intg.desc}</div>
                    </div>
                  </div>
                  <span className={`int-badge ${isConn ? "badge-connected" : "badge-disconnected"}`}>
                    <span className={`badge-dot ${isConn ? "dot-green" : "dot-gray"}`} />
                    {isConn ? "Connected" : "Not connected"}
                  </span>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop:13, borderTop:"1px solid var(--border)", marginTop:12 }}>
                    <span style={{ fontSize:"0.68rem", color:"var(--text-muted)", fontWeight:500 }}>
                      {intg.lastSync ? `Synced ${intg.lastSync}` : "Never synced"}
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn-sm"
                        disabled={!isConn || syncStatuses[intg.key] === "syncing"}
                        onClick={() => handleSync(intg.key, intg.name, intg.isReal)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          backgroundColor: !isConn 
                            ? "#e2e8f0" 
                            : syncStatuses[intg.key] === "synced" 
                              ? "#22c55e" 
                              : "var(--brand)",
                          color: !isConn 
                            ? "var(--text-muted)" 
                            : "#fff",
                          border: "none",
                          cursor: !isConn ? "not-allowed" : "pointer",
                          transition: "background-color 0.2s"
                        }}
                      >
                        {syncStatuses[intg.key] === "syncing" ? (
                          <>
                            <RefreshCw className="spin" size={11} />
                            <span>Syncing...</span>
                          </>
                        ) : syncStatuses[intg.key] === "synced" ? (
                          <>
                            <Check size={11} />
                            <span>Synced</span>
                          </>
                        ) : syncStatuses[intg.key] === "error" ? (
                          <span>Failed</span>
                        ) : (
                          <>
                            <RefreshCw size={11} />
                            <span>Sync</span>
                          </>
                        )}
                      </button>
                      <button
                        className={`btn-sm ${isConn ? "btn-sm-ghost" : "btn-sm-primary"}`}
                        disabled={intg.isReal && (loading || disconnecting)}
                        onClick={() => {
                          if (intg.isReal) {
                            handleGoogleFitClick();
                          } else {
                            toggleMockIntegration(intg.key as any);
                          }
                        }}
                      >
                        <Plug size={11} /> {intg.isReal && disconnecting ? "Disconnecting..." : isConn ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── ERROR FORMATTING HELPER ────────────────────────────────────── */
function formatIngestionError(errorMsg: any): string {
  if (typeof errorMsg === "string" && errorMsg.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(errorMsg);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].code) {
        const formattedIssues = parsed.map((issue: any) => {
          const pathStr = issue.path ? issue.path.join(".") : "";
          const expected = issue.expected ? ` (expected ${issue.expected})` : "";
          const pathPart = pathStr ? `Field '${pathStr}': ` : "";
          return `${pathPart}${issue.message}${expected}`;
        });
        return `Validation Error: ${formattedIssues.join("; ")}`;
      }
    } catch (_) {
      // Fallback to original string
    }
  } else if (typeof errorMsg === "object" && errorMsg !== null) {
    const arr = Array.isArray(errorMsg) ? errorMsg : [errorMsg];
    if (arr.length > 0 && arr[0].code) {
      const formattedIssues = arr.map((issue: any) => {
        const pathStr = issue.path ? issue.path.join(".") : "";
        const expected = issue.expected ? ` (expected ${issue.expected})` : "";
        const pathPart = pathStr ? `Field '${pathStr}': ` : "";
        return `${pathPart}${issue.message}${expected}`;
      });
      return `Validation Error: ${formattedIssues.join("; ")}`;
    }
  }
  return String(errorMsg);
}

/* ─── UPLOADS PANEL ──────────────────────────────────────────────── */
function UploadsPanel({ onSuccess }: { onSuccess: () => void }) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDomain, setUploadDomain] = useState<"health" | "finance" | "career">("health");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [activeType, setActiveType] = useState<"pdf" | "csv" | "excel">("pdf");

  const handleUpload = async () => {
    if (!uploadFile) { setUploadMsg({ text: "Select a file first.", ok: false }); return; }
    setUploadLoading(true); setUploadMsg(null);
    const fd = new FormData(); fd.append("file", uploadFile); fd.append("domain", uploadDomain);
    try {
      let endpoint = "/api/upload/excel";
      if (activeType === "pdf") {
        endpoint = "/api/ingestion/upload";
      } else if (activeType === "csv") {
        endpoint = "/api/upload/csv";
      }
      const res = await fetch(endpoint, { method: "POST", body: fd, credentials: "include" });
      
      let d: any = null;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          d = await res.json();
        } catch (_) {}
      }

      if (!res.ok) {
        if (d && (d.message || d.error)) {
          throw new Error(formatIngestionError(d.error || d.message));
        }
        if (res.status === 404) {
          throw new Error(`Upload failed: The requested upload service is currently unavailable or down (Status 404).`);
        }
        throw new Error(`Upload failed with status code ${res.status}.`);
      }

      if (d && d.success === false) {
        throw new Error(formatIngestionError(d.message || d.error || "Upload failed."));
      }

      setUploadMsg({ text: (d && d.message) || "File uploaded successfully!", ok: true });
      setUploadFile(null);
      onSuccess();
    } catch (err: any) { setUploadMsg({ text: err.message || "Upload failed.", ok: false }); }
    finally { setUploadLoading(false); }
  };


  const uploadTypes = [
    { key: "pdf", label: "PDF / Image Upload", sub: "Reports, salary slips, receipts, images", icon: "📄", color: "#dc2626", bg: "#fef2f2" },
    { key: "csv", label: "CSV Upload", sub: "Exported spreadsheets", icon: "📊", color: "#16a34a", bg: "#f0fdf4" },
    { key: "excel", label: "Excel Upload", sub: "Health logs, expense trackers", icon: "📋", color: "var(--brand)", bg: "var(--brand-light)" },
  ];
  const current = uploadTypes.find(t => t.key === activeType)!;

  return (
    <div>
      <div className="page-top">
        <div>
          <div className="page-eyebrow"><div className="page-eyebrow-dot" /><span className="page-eyebrow-text">Check-in</span></div>
          <h1 className="page-title"><TypewriterTitle phrases={["Data Uploads", "Import Your Files", "Sync Your Records"]} /></h1>
          <p className="page-subtitle">Import your data from documents, spreadsheets and reports.</p>
        </div>
      </div>
      <div className="body-pad">
        <div className="section-hd"><span className="section-hd-label">File Type</span><div className="section-hd-rule" /></div>
        <div className="upload-type-grid">
          {uploadTypes.map(t => (
            <button key={t.key} className={`upload-type-card${activeType === t.key ? " selected" : ""}`}
              style={activeType === t.key ? { borderColor: t.color, background: t.bg } : {}}
              onClick={() => setActiveType(t.key as any)}>
              <div style={{ width:46, height:46, borderRadius:13, background: activeType === t.key ? `${t.color}18` : "#f0f2f8", color:t.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem" }}>{t.icon}</div>
              <div style={{ fontFamily:"DM Sans,sans-serif", fontSize:"0.82rem", fontWeight:700, color:"var(--text-primary)" }}>{t.label}</div>
              <div style={{ fontSize:"0.69rem", color:"var(--text-muted)", lineHeight:1.4 }}>{t.sub}</div>
            </button>
          ))}
        </div>

        <div className="form-card">
          <div className="form-card-stripe" style={{ background:"linear-gradient(90deg,#7c3aed,#9f6ef5)" }} />
          <div className="form-card-head">
            <div className="fch-icon" style={{ background:"#f5f3ff", color:"#7c3aed" }}><Upload size={19} /></div>
            <div><div className="fch-title">{current.label}</div><div className="fch-sub">Intelligently parse and import your data</div></div>
          </div>
          <div className="form-card-body">
            <div className="field-grp">
              <label className="field-label">Which area is this file for?</label>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                {(["health", "finance", "career"] as const).map(d => (
                  <button key={d} className={`prio-btn${uploadDomain === d ? " on" : ""}`}
                    style={uploadDomain === d ? { borderColor:"var(--brand)", background:"var(--brand-light)" } : {}}
                    onClick={() => setUploadDomain(d)}>
                    <span style={{ fontSize:"1rem" }}>{d === "health" ? "🟢" : d === "finance" ? "🔵" : "🟣"}</span>
                    <span className="prio-label" style={uploadDomain === d ? { color:"var(--brand)" } : {}}>{d === "health" ? "Health" : d === "finance" ? "Money" : "Career"}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="dropzone" onClick={() => document.getElementById("file-inp-up")?.click()}>
              <input id="file-inp-up" type="file" accept={current.key === "pdf" ? ".pdf,.png,.jpg,.jpeg,.webp" : current.key === "csv" ? ".csv" : ".xlsx,.xls"} style={{ display:"none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }} />
              <Upload size={24} style={{ color:"var(--brand)" }} />
              <div style={{ fontSize:"0.84rem", color:"var(--text-secondary)", fontWeight:500, textAlign:"center" }}>
                {uploadFile
                  ? <strong style={{ color:"var(--text-primary)" }}>{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</strong>
                  : <><span style={{ color:"var(--brand)", fontWeight:700 }}>Choose a file</span> or drag it here</>}
              </div>
              <div style={{ fontSize:"0.7rem", color:"var(--text-muted)" }}>Supports {current.key === "pdf" ? ".pdf, .png, .jpg, .jpeg, .webp" : current.key === "csv" ? ".csv" : ".xlsx, .xls"}</div>
            </div>

            {uploadMsg && (
              <div className={`upload-msg${uploadMsg.ok ? " ok" : " err"}`}>
                {uploadMsg.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                {uploadMsg.text}
              </div>
            )}

            <button className="save-btn" onClick={handleUpload} disabled={!uploadFile || uploadLoading}>
              {uploadLoading ? <><Activity size={15} /> Uploading...</> : <><Send size={14} /> Upload File</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────────── */
function IngestionPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [todayLogged, setTodayLogged] = useState(false);
  const [latest, setLatest] = useState<LatestData | null>(null);
  const [currentScores, setCurrentScores] = useState({ health: 50, finance: 50, career: 50 });
  const [dailyNote, setDailyNote] = useState("");
  const [activePanel, setActivePanel] = useState<SidebarPanel>("manual");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const [googleFitConnected, setGoogleFitConnected] = useState(false);
  const [googleFitLastSync, setGoogleFitLastSync] = useState<string | null>(null);
  const [mockConnected, setMockConnected] = useState({ apple: true, bank: false, coursera: false, hungerbox: false });
  const [mockSyncTimes, setMockSyncTimes] = useState<Record<string, string | null>>({});
  const [apiLoading, setApiLoading] = useState(true);

  const handleActivePanelChange = (panel: SidebarPanel) => {
    setActivePanel(panel);
    localStorage.setItem("syntra_active_ingestion_panel", panel);
  };

  // Read ?panel= from URL so /assets-liabilities redirect lands correctly
  const searchParams = useSearchParams();
  useEffect(() => {
    const panel = searchParams?.get("panel") as SidebarPanel | null;
    if (panel && ["manual", "social", "assets", "uploads", "api"].includes(panel)) {
      setActivePanel(panel);
      localStorage.setItem("syntra_active_ingestion_panel", panel);
    } else {
      const saved = localStorage.getItem("syntra_active_ingestion_panel") as SidebarPanel | null;
      if (saved && ["manual", "social", "assets", "uploads", "api"].includes(saved)) {
        setActivePanel(saved);
      }
    }
  }, [searchParams]);

  const [health, setHealth] = useState<HealthData>({
    sleepHours: 0, workoutMinutes: 0, stressLevel: 1, moodScore: 5,
    energyLevel: 5, waterGlasses: 0, skippedMeals: [],
    caloriesConsumed: "", calorieGoal: "", mealsEatenToday: "",
    spentTimeWithFriends: false, socialCount: 0, relationshipQuality: 3,
  });
  const [finance, setFinance] = useState<FinanceData>({
    amountSaved: "", discretionarySpent: "", spendingCategory: "food",
    biggestExpenseToday: "", impulseSpend: false,
  });
  const [career, setCareer] = useState<CareerData>({
    hoursStudied: "", productivityRating: 5, sessionsCompleted: "",
    courseName: "", goalWorkedOn: "", blockerToday: "",
  });

  // Relations & Socials Profile State
  const [relations, setRelations] = useState({
    relationshipStatus: "Single",
    householdMembers: [] as Array<{ relationshipType: "partner" | "child" | "parent" | "sibling" }>,
    dependents: [] as Array<{ type: "child" | "elderly_parent"; age: number }>,
  });
  const [supportNetwork, setSupportNetwork] = useState([] as Array<{ name: string; relationshipType: string; tag: "venting" | "advice" | "distraction" | "motivation" }>);
  const [relationsSaving, setRelationsSaving] = useState(false);
  const [relationsMsg, setRelationsMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Inline form states for Dependents and Support Network
  const [activeDependentType, setActiveDependentType] = useState<"child" | "elderly_parent" | null>(null);
  const [dependentAge, setDependentAge] = useState<string>("");
  const [showAddSupport, setShowAddSupport] = useState(false);
  const [supportName, setSupportName] = useState("");
  const [supportRelationship, setSupportRelationship] = useState("");
  const [supportTag, setSupportTag] = useState<"venting" | "advice" | "distraction" | "motivation">("venting");

  const pH = useMemo(() => previewHealthScore(health), [health]);
  const pF = useMemo(() => previewFinanceScore(finance, profile), [finance, profile]);
  const pC = useMemo(() => previewCareerScore(career), [career]);

  const projectedH = useMemo(() => Math.round(currentScores.health * 0.75 + pH * 0.25), [currentScores.health, pH]);
  const projectedF = useMemo(() => Math.round(currentScores.finance * 0.75 + pF * 0.25), [currentScores.finance, pF]);
  const projectedC = useMemo(() => Math.round(currentScores.career * 0.75 + pC * 0.25), [currentScores.career, pC]);

  const refreshLatest = () => {
    fetch("/api/log/latest", { cache: "no-store", credentials: "include" })
      .then(r => r.json()).then(d => {
        if (!d.success) return;
        setLatest(d.latest);
        if (d.scores) setCurrentScores(d.scores);
        window.dispatchEvent(new Event("syntra-refresh"));
      }).catch(() => {});
  };

  useEffect(() => {
    setMounted(true);

    // Load mock integrations from localStorage
    const saved = localStorage.getItem("syntra_mock_integrations");
    if (saved) {
      try {
        setMockConnected(JSON.parse(saved));
      } catch (e) {}
    }
    // Load mock sync times from localStorage
    const savedSync = localStorage.getItem("syntra_mock_sync_times");
    if (savedSync) {
      try {
        setMockSyncTimes(JSON.parse(savedSync));
      } catch (e) {}
    }

    fetch("/api/profile", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setProfile(data.user.profile);
          if (data.user?.googleFit?.syncActive) {
            setGoogleFitConnected(true);
            if (data.user.googleFit.lastSyncedAt) {
              setGoogleFitLastSync(fmtDate(data.user.googleFit.lastSyncedAt));
            }
          }
        }
        setApiLoading(false);
      })
      .catch(() => setApiLoading(false));

    fetch("/api/log/latest", { cache: "no-store", credentials: "include" })
      .then(r => r.json()).then(d => {
        if (!d.success) return;
        setLatest(d.latest);
        if (d.scores) setCurrentScores(d.scores);
        const isT = (s: string) => new Date(s).toDateString() === new Date().toDateString();
        if ((d.latest?.health && isT(d.latest.health.date)) ||
          (d.latest?.finance && isT(d.latest.finance.date)) ||
          (d.latest?.career && isT(d.latest.career.date))) setTodayLogged(true);

        if (d.latest?.health && isT(d.latest.health.date)) {
          const h = d.latest.health.data;
          setHealth({
            sleepHours: h.sleepHours ?? 0,
            workoutMinutes: h.workoutMinutes ?? 0,
            stressLevel: h.stressLevel ?? 1,
            moodScore: h.moodScore ?? 5,
            energyLevel: h.energyLevel ?? 5,
            waterGlasses: h.waterGlasses ?? 0,
            skippedMeals: h.skippedMeals ?? [],
            caloriesConsumed: h.caloriesConsumed != null ? String(h.caloriesConsumed) : "",
            calorieGoal: h.calorieGoal != null ? String(h.calorieGoal) : "",
            mealsEatenToday: h.mealsEatenToday ?? "",
            spentTimeWithFriends: h.spentTimeWithFriends ?? false,
            socialCount: h.socialCount ?? 0,
            relationshipQuality: h.relationshipQuality ?? 3,
          });
        }
        if (d.latest?.finance && isT(d.latest.finance.date)) {
          const f = d.latest.finance.data;
          setFinance({
            amountSaved: f.amountSaved != null ? String(f.amountSaved) : "",
            discretionarySpent: f.discretionarySpent != null ? String(f.discretionarySpent) : "",
            spendingCategory: f.spendingCategory ?? "food",
            biggestExpenseToday: f.biggestExpenseToday ?? "",
            impulseSpend: f.impulseSpend ?? false,
          });
        }
        if (d.latest?.career && isT(d.latest.career.date)) {
          const c = d.latest.career.data;
          setCareer({
            hoursStudied: c.hoursStudied != null ? String(c.hoursStudied) : "",
            productivityRating: c.productivityRating ?? 5,
            sessionsCompleted: c.sessionsCompleted != null ? String(c.sessionsCompleted) : "",
            courseName: c.courseName ?? "",
            goalWorkedOn: c.goalWorkedOn ?? "",
            blockerToday: c.blockerToday ?? "",
          });
        }
        if (d.latest?.reflection && isT(d.latest.reflection.date)) {
          setDailyNote(d.latest.reflection.data?.note ?? "");
        }
      }).catch(() => {});

    fetch("/api/profile/family", { cache: "no-store", credentials: "include" })
      .then(r => r.json()).then(d => {
        if (!d.success) return;
        if (d.relations) setRelations(d.relations);
        if (d.supportNetwork) setSupportNetwork(d.supportNetwork);
      }).catch(() => {});
  }, []);

  const toggleMeal = useCallback((m: string) =>
    setHealth(p => ({ ...p, skippedMeals: p.skippedMeals.includes(m) ? p.skippedMeals.filter(x => x !== m) : [...p.skippedMeals, m] })), []);

  const canSubmit = health.sleepHours > 0 && !!finance.amountSaved && !!finance.discretionarySpent && !!career.hoursStudied;

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true); setMessage("");
    try {
      const res = await fetch("/api/log/daily", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          health: { 
            sleepHours: health.sleepHours, 
            workoutMinutes: health.workoutMinutes, 
            stressLevel: health.stressLevel, 
            moodScore: health.moodScore || undefined, 
            energyLevel: health.energyLevel || undefined, 
            waterGlasses: health.waterGlasses, 
            skippedMeals: health.skippedMeals.length ? health.skippedMeals : undefined, 
            caloriesConsumed: health.caloriesConsumed ? Number(health.caloriesConsumed) : undefined, 
            calorieGoal: health.calorieGoal ? Number(health.calorieGoal) : undefined, 
            mealsEatenToday: health.mealsEatenToday.trim() || undefined,
            spentTimeWithFriends: health.spentTimeWithFriends,
            socialCount: health.socialCount,
            relationshipQuality: health.relationshipQuality,
          },
          finance: { amountSaved: Number(finance.amountSaved), discretionarySpent: Number(finance.discretionarySpent), spendingCategory: finance.spendingCategory || undefined, biggestExpenseToday: finance.biggestExpenseToday || undefined, impulseSpend: finance.impulseSpend || undefined },
          career: { hoursStudied: Number(career.hoursStudied), productivityRating: career.productivityRating, sessionsCompleted: career.sessionsCompleted ? Number(career.sessionsCompleted) : undefined, courseName: career.courseName || undefined, goalWorkedOn: career.goalWorkedOn || undefined, blockerToday: career.blockerToday || undefined },
          dailyNote: dailyNote.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.message || "Submission failed.");
      setLoading(false); setProcessing(true);
      setTimeout(() => router.push("/dashboard"), 4200);
    } catch (err: any) { setMessage(err.message || "Submission failed."); setLoading(false); }
  };

  const PROMPTS = [
    "What was the best part of your day?",
    "What's one thing you'd do differently today?",
    "Describe how you feel right now in one sentence.",
    "What are you grateful for today?",
    "What's on your mind right now?",
  ];
  const prompt = PROMPTS[new Date().getDate() % PROMPTS.length];

  const totalConnected = (googleFitConnected ? 1 : 0) + Object.values(mockConnected).filter(Boolean).length;

  const sidebarNav = [
    { key: "manual" as const, label: "Manual Entry", sub: "Log your day", icon: <Edit3 size={15} />, badge: "3 sections" },
    { key: "social" as const, label: "Social & Family", sub: "Relations & contacts", icon: <Heart size={15} /> },
    { key: "assets" as const, label: "Net Worth", sub: "Assets & liabilities", icon: <Wallet size={15} /> },
    { key: "uploads" as const, label: "Data Uploads", sub: "Import files", icon: <Upload size={15} /> },
    { key: "api" as const, label: "API Sync", sub: `${totalConnected} connected`, icon: <Plug size={15} />, badge: totalConnected },
  ];

  const handleSaveRelations = async () => {
    if (relationsSaving) return;
    setRelationsSaving(true);
    setRelationsMsg(null);
    try {
      const res = await fetch("/api/profile/family", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          relationshipStatus: relations.relationshipStatus,
          householdMembers: relations.householdMembers,
          dependents: relations.dependents,
          supportNetwork,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) {
        throw new Error(d.error || "Failed to update family profile.");
      }
      setRelationsMsg({ text: "Family relations and support network synced successfully!", ok: true });
      if (d.relations) setRelations(d.relations);
      if (d.supportNetwork) setSupportNetwork(d.supportNetwork);
    } catch (err: any) {
      setRelationsMsg({ text: err.message || "Failed to sync relations.", ok: false });
    } finally {
      setRelationsSaving(false);
    }
  };

  if (!mounted) return null;
  if (processing) return <ProcessingScreen />;

  return (
    <div className="root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --brand:         #0047D4;
          --brand-light:   #EEF3FF;
          --brand-mid:     #C7D7FA;
          --surface:       #FFFFFF;
          --bg:            #EDF0F7;
          --bg-deep:       #E2E6F0;
          --border:        #D6DCE8;
          --border-hover:  #A8BADE;
          --text-primary:  #0D1117;
          --text-secondary:#52637A;
          --text-muted:    #8A9BB5;
          --shadow-sm:     0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05);
          --shadow-md:     0 4px 16px rgba(0,0,0,0.09), 0 2px 6px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03);
          --shadow-lg:     0 8px 28px rgba(0,71,212,0.13), 0 3px 10px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,71,212,0.06);
          --shadow-hover:  0 16px 44px rgba(0,71,212,0.16), 0 4px 14px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,71,212,0.08);
          --shadow-card:   0 2px 8px rgba(0,0,0,0.07), 0 6px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04);
          --nav-h:         70px;
          --mob-tab-h:     64px;
          --sidebar-w:     272px;
        }

        body { background: var(--bg-deep); font-family: "Inter", sans-serif; -webkit-font-smoothing: antialiased; color: var(--text-primary); }

        @keyframes cur-blink  { 50% { opacity: 0; } }
        @keyframes screen-in  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fade-up    { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lp-pulse   { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.65; transform:scale(1.35); } }
        @keyframes overlay-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin       { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }

        /* ── TOP NAVBAR ── */
        .top-nav {
          position: fixed; top: 0; left: 0; width: 100%;
          z-index: 500; height: var(--nav-h);
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(214,220,232,0.6);
          transition: background 0.28s, border-color 0.28s, box-shadow 0.28s;
        }
        .top-nav.top-nav-scrolled { background: #fff; border-color: #e2e6f0; box-shadow: 0 2px 20px rgba(0,0,0,0.08); }
        .top-nav-inner {
          max-width: 1600px; margin: 0 auto; height: 100%;
          display: flex; align-items: center; justify-content: space-between; padding: 0 2.5rem;
        }
        .top-nav-logo {
          font-family: 'DM Sans', sans-serif; font-size: 1.55rem; font-weight: 300;
          color: var(--brand); text-decoration: none; letter-spacing: 0.2em; text-transform: uppercase; transition: opacity 0.2s;
        }
        .top-nav-logo:hover { opacity: 0.78; }
        .top-nav-logo strong { font-weight: 800; letter-spacing: 0.1em; }
        .top-nav-links { display: flex; align-items: center; gap: 4px; }
        .top-nav-link {
          font-family: 'Inter', sans-serif; font-size: 0.84rem; font-weight: 500;
          color: #555; text-decoration: none; padding: 7px 14px; border-radius: 9999px; transition: all 0.2s;
        }
        .top-nav-link:hover { background: #f0f4ff; color: var(--brand); }
        .top-nav-link-active { background: var(--brand) !important; color: #fff !important; font-weight: 600; }
        .top-nav-hamburger {
          display: none; flex-direction: column; gap: 5px; cursor: pointer;
          padding: 8px; border: 1.5px solid #e0e0e0; border-radius: 10px; background: #f5f5f5; transition: all 0.2s;
        }
        .top-nav-hamburger:hover { border-color: var(--brand-mid); background: var(--brand-light); }
        .top-nav-hamburger span { display: block; width: 20px; height: 2px; background: #333; border-radius: 2px; }
        .top-nav-mobile-menu {
          display: none; flex-direction: column; gap: 5px;
          position: absolute; top: calc(var(--nav-h) + 4px); right: 20px;
          width: 210px; padding: 12px; border-radius: 16px;
          background: rgba(255,255,255,0.97); backdrop-filter: blur(20px);
          border: 1px solid #e8ebf4; box-shadow: 0 12px 40px rgba(0,68,220,0.12); z-index: 600;
        }
        .top-nav-mobile-menu.open { display: flex; }
        .top-nav-mobile-link {
          font-size: 0.88rem; font-weight: 500; color: #333; text-decoration: none;
          padding: 10px 14px; border-radius: 10px; transition: all 0.16s;
        }
        .top-nav-mobile-link:hover { background: #f0f4ff; color: var(--brand); }
        .top-nav-mobile-link.active { background: var(--brand-light); color: var(--brand); font-weight: 700; }

        /* ── LAYOUT ── */
        .root { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg-deep); }
        .page-body { display: flex; flex: 1; padding-top: var(--nav-h); }

        /* ── SIDEBAR ── */
        .left-panel {
          width: var(--sidebar-w); flex-shrink: 0;
          background: linear-gradient(160deg, #0036BB 0%, #0052E8 45%, #2A18E8 100%);
          display: flex; flex-direction: column;
          position: sticky; top: var(--nav-h);
          height: calc(100vh - var(--nav-h)); overflow: hidden;
          box-shadow: 4px 0 24px rgba(0,36,187,0.18), 0 -1px 0 rgba(255,255,255,0.08) inset;
          z-index: 10;
        }
        .left-panel::before {
          content:''; position:absolute; top:-90px; left:-70px;
          width:260px; height:260px; border-radius:50%;
          background:radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%);
          pointer-events:none;
        }
        .lp-grid {
          position:absolute; inset:0; pointer-events:none;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size:44px 44px;
        }
        .left-panel-top-rule {
          height: 3px; flex-shrink: 0; position: relative; z-index: 2;
          background: linear-gradient(90deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06));
        }
        .lp-brand {
          padding: 20px 20px 16px; position: relative; z-index: 2;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .lp-logo {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
          border-radius: 9999px; padding: 4px 12px;
          font-size: 0.66rem; font-weight: 800; color: #fff;
          letter-spacing: 0.13em; text-transform: uppercase; margin-bottom: 13px;
        }
        .lp-logo-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #4ade80; box-shadow: 0 0 8px rgba(74,222,128,0.85);
          animation: lp-pulse 2.2s infinite; flex-shrink: 0;
        }
        .lp-heading { font-family: "DM Sans",sans-serif; font-size: 1.2rem; font-weight: 800; color: #fff; letter-spacing: -0.03em; line-height: 1.2; }
        .lp-sub { font-size: 0.72rem; color: rgba(255,255,255,0.55); margin-top: 4px; line-height: 1.55; }
        .lp-stats { display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); position: relative; z-index: 2; }
        .lp-stat { flex: 1; padding: 12px 10px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1); }
        .lp-stat:last-child { border-right: none; }
        .lp-stat-num { font-family: "DM Sans",sans-serif; font-size: 1.3rem; font-weight: 800; color: #fff; line-height: 1; }
        .lp-stat-lbl { font-size: 0.57rem; font-weight: 700; color: rgba(255,255,255,0.48); text-transform: uppercase; letter-spacing: 0.07em; margin-top: 3px; }
        .lp-nav { padding: 12px 10px; display: flex; flex-direction: column; gap: 4px; flex: 1; overflow-y: auto; position: relative; z-index: 2; }
        .lp-section-lbl {
          font-size: 0.59rem; font-weight: 700; color: rgba(255,255,255,0.4);
          text-transform: uppercase; letter-spacing: 0.11em; padding: 0 4px; margin: 10px 0 5px;
        }
        .nav-item {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 13px;
          border: 1px solid transparent; background: transparent;
          cursor: pointer; text-align: left;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .nav-item:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.14); }
        .nav-item-active { background: rgba(255,255,255,0.17) !important; border-color: rgba(255,255,255,0.28) !important; box-shadow: 0 4px 14px rgba(0,0,0,0.14); }
        .nav-item-icon {
          width: 34px; height: 34px; border-radius: 10px;
          background: rgba(255,255,255,0.11); border: 1px solid rgba(255,255,255,0.16);
          display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0;
        }
        .nav-item-active .nav-item-icon { background: rgba(255,255,255,0.24); border-color: rgba(255,255,255,0.38); }
        .nav-item-text { flex: 1; min-width: 0; }
        .nav-item-label { font-family: "DM Sans",sans-serif; font-size: 0.83rem; font-weight: 700; color: #fff; display: block; }
        .nav-item-sub { font-size: 0.66rem; color: rgba(255,255,255,0.5); display: block; margin-top: 1px; }
        .nav-badge { font-size: 0.63rem; font-weight: 800; background: rgba(255,255,255,0.18); color: #fff; padding: 2px 7px; border-radius: 9999px; flex-shrink: 0; }
        .nav-item-active .nav-badge { background: rgba(255,255,255,0.32); }
        .nav-arrow { color: rgba(255,255,255,0.35); flex-shrink: 0; transition: transform 0.2s, color 0.2s; }
        .nav-item:hover .nav-arrow { transform: translateX(2px); color: rgba(255,255,255,0.65); }
        .nav-item-active .nav-arrow { color: rgba(255,255,255,0.65); }
        .lp-score-section { padding: 0 10px 16px; position: relative; z-index: 2; }
        .lp-score-block {
          background: rgba(0,0,0,0.18); border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1); padding: 13px 12px;
        }
        .lp-score-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
        .lp-score-row:last-child { margin-bottom: 0; }
        .lp-score-name { font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.7); display: flex; align-items: center; gap: 6px; }
        .lp-score-num { font-family: "JetBrains Mono",monospace; font-size: 0.86rem; font-weight: 800; color: #fff; }
        .lp-back { padding: 12px 14px; border-top: 1px solid rgba(255,255,255,0.1); position: relative; z-index: 2; }
        .lp-back-btn {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 0.74rem; font-weight: 600; color: rgba(255,255,255,0.55);
          cursor: pointer; background: none; border: none; transition: color 0.18s; font-family: "Inter",sans-serif;
        }
        .lp-back-btn:hover { color: #fff; }

        /* ── MOBILE TOPBAR ── */
        .mob-topbar {
          display: none; position: sticky; top: var(--nav-h); z-index: 200;
          height: 52px; background: linear-gradient(135deg, #0036BB, #0052E8);
          align-items: center; padding: 0 16px; gap: 12px;
          box-shadow: 0 2px 12px rgba(0,36,187,0.25);
        }
        .mob-topbar-menu {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.22);
          display: flex; align-items: center; justify-content: center;
          color: #fff; cursor: pointer; flex-shrink: 0;
        }

        /* ── MOBILE DRAWER ── */
        .mob-drawer-overlay {
          display: none; position: fixed; inset: 0; z-index: 700;
          background: rgba(0,0,0,0.45); backdrop-filter: blur(2px);
          animation: overlay-in 0.22s ease;
        }
        .mob-drawer-overlay.open { display: block; }
        .mob-drawer {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: min(300px, 88vw);
          background: linear-gradient(160deg, #0036BB 0%, #0052E8 45%, #2A18E8 100%);
          z-index: 800; display: flex; flex-direction: column;
          overflow: hidden; box-shadow: 8px 0 40px rgba(0,0,0,0.3);
          transform: translateX(-100%); transition: transform 0.28s cubic-bezier(0.32,0.72,0,1);
        }
        .mob-drawer.open { transform: translateX(0); }
        .mob-drawer-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image: linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 44px 44px;
        }
        .mob-drawer-head {
          padding: 20px 18px 16px; position: relative; z-index: 2;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          display: flex; align-items: center; gap: 12px;
        }
        .mob-drawer-close {
          width: 32px; height: 32px; border-radius: 9px;
          background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          color: #fff; cursor: pointer; margin-left: auto;
        }
        .mob-drawer-nav { padding: 12px 10px; display: flex; flex-direction: column; gap: 4px; flex: 1; overflow-y: auto; position: relative; z-index: 2; }
        .mob-tabbar {
          display: none; position: fixed; bottom: 0; left: 0; right: 0;
          height: var(--mob-tab-h); background: var(--surface);
          border-top: 1px solid var(--border); box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
          z-index: 150; padding-bottom: env(safe-area-inset-bottom, 0);
        }
        .mob-tabbar-inner { display: flex; height: 100%; }
        .mob-tab {
          flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
          background: none; border: none; cursor: pointer; padding: 0;
          -webkit-tap-highlight-color: transparent;
        }
        .mob-tab-icon {
          width: 40px; height: 32px; display: flex; align-items: center; justify-content: center;
          border-radius: 12px; transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1); color: var(--text-muted);
        }
        .mob-tab.active .mob-tab-icon { background: var(--brand-light); color: var(--brand); transform: translateY(-2px); }
        .mob-tab-label { font-size: 0.62rem; font-weight: 600; color: var(--text-muted); line-height: 1; }
        .mob-tab.active .mob-tab-label { color: var(--brand); font-weight: 700; }

        /* ── MAIN WRAPPER ── */
        .main-wrapper {
          flex: 1; min-height: calc(100vh - var(--nav-h));
          overflow-y: auto; background: var(--bg-deep);
          padding: 0 28px; display: flex; flex-direction: column;
        }
        .content-shell {
          flex: 1; background: var(--bg); border-radius: 20px 20px 16px 16px;
          margin: 22px 0 22px; overflow: hidden;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.03), 0 12px 40px rgba(0,0,0,0.07);
          min-height: calc(100vh - var(--nav-h) - 44px);
        }
        .screen { animation: screen-in 0.3s cubic-bezier(0.22,1,0.36,1); }

        /* ── PAGE TOP HEADER ── */
        .page-top {
          padding: 36px 48px 30px; border-bottom: 1px solid var(--border);
          background: var(--surface);
          display: flex; align-items: flex-end; justify-content: space-between; gap: 24px;
        }
        .page-eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
        .page-eyebrow-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--brand); box-shadow: 0 0 0 2px rgba(0,71,212,0.18); }
        .page-eyebrow-text { font-size: 0.68rem; font-weight: 700; color: var(--brand); letter-spacing: 0.1em; text-transform: uppercase; }
        .page-title {
          font-family: "DM Sans",sans-serif; font-size: 2.1rem; font-weight: 900;
          color: var(--brand); letter-spacing: -0.05em; line-height: 1.12; min-height: 2.5rem;
        }
        .page-subtitle { font-size: 0.84rem; color: var(--text-secondary); margin-top: 7px; font-weight: 400; line-height: 1.6; }

        /* ── BODY PADDING ── */
        .body-pad { padding: 32px 48px 80px; max-width: 860px; }
        .section-hd { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
        .section-hd-label { font-size: 0.65rem; font-weight: 800; color: var(--brand); text-transform: uppercase; letter-spacing: 0.12em; white-space: nowrap; display: flex; align-items: center; gap: 5px; }
        .section-hd-rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--border), transparent); }

        /* ── FORM CARDS ── */
        .form-card {
          background: var(--surface); border: 1px solid rgba(0,0,0,0.07);
          border-radius: 18px; overflow: hidden; box-shadow: var(--shadow-card);
          transition: box-shadow 0.22s, transform 0.22s; margin-bottom: 16px;
        }
        .form-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }
        .form-card-stripe { height: 4px; }
        .form-card-head {
          padding: 18px 22px 15px; display: flex; align-items: center; gap: 12px;
          border-bottom: 1px solid #F0F3F9;
        }
        .fch-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .fch-title { font-family: "DM Sans",sans-serif; font-size: 0.92rem; font-weight: 800; color: var(--text-primary); }
        .fch-sub { font-size: 0.69rem; color: var(--text-muted); margin-top: 2px; }
        .form-card-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; }

        /* ── FIELDS ── */
        .field-grp { display: flex; flex-direction: column; gap: 6px; }
        .field-label { font-size: 0.78rem; font-weight: 600; color: #374151; }
        .field-input {
          font-family: "Inter",sans-serif; font-size: 0.84rem; padding: 11px 14px;
          border-radius: 11px; border: 1.5px solid var(--border);
          background: #F8FAFD; color: var(--text-primary); transition: all 0.18s; width: 100%;
          -moz-appearance: textfield;
        }
        .field-input::-webkit-outer-spin-button, .field-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .field-input:focus { outline: none; border-color: var(--brand); background: var(--surface); box-shadow: 0 0 0 3px rgba(0,71,212,0.09); }
        .field-input::placeholder { color: #B8C4D4; }
        .f-textarea { min-height: 80px; resize: vertical; line-height: 1.55; }
        .fg-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
        .sg-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .s-div { height: 1px; background: #EEF1F8; }

        /* ── SLIDER ── */
        .slider-box { display: flex; flex-direction: column; gap: 8px; }
        .slider-row-top { display: flex; justify-content: space-between; align-items: center; }
        .slider-label-group { display: flex; align-items: center; gap: 7px; }
        .slider-label { font-size: 0.79rem; font-weight: 600; color: #374151; }
        .slider-badge { font-size: 0.79rem; font-weight: 800; padding: 3px 11px; border-radius: 9999px; font-family: "JetBrains Mono",monospace; }
        .range-inp {
          -webkit-appearance: none; appearance: none; width: 100%; height: 6px;
          border-radius: 9999px; outline: none; cursor: pointer;
          background: linear-gradient(to right, var(--c) 0%, var(--c) var(--p), #E8EDF5 var(--p), #E8EDF5 100%);
        }
        .range-inp::-webkit-slider-thumb {
          -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
          background: #fff; border: 2.5px solid var(--c); box-shadow: 0 2px 6px rgba(0,0,0,0.13); cursor: grab;
        }
        .range-inp::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.18); }
        .slider-ends { display: flex; justify-content: space-between; align-items: center; font-size: 0.66rem; color: #b0bac6; font-weight: 500; }

        /* ── PILLS ── */
        .pill-wrap { display: flex; flex-direction: column; gap: 7px; }
        .pill-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .pill {
          padding: 7px 15px; border-radius: 9999px; border: 1.5px solid var(--border);
          background: #F8FAFD; color: var(--text-secondary); font-size: 0.77rem; font-weight: 600;
          cursor: pointer; transition: all 0.18s; font-family: inherit;
        }
        .pill:hover { border-color: var(--border-hover); background: var(--brand-light); }
        .pill.on { border-color: transparent; color: #fff; background: #ef4444; }

        /* ── TOGGLE ── */
        .toggle-row {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; border-radius: 12px; background: #F8FAFD;
          border: 1.5px solid var(--border); cursor: pointer; transition: all 0.2s; user-select: none;
        }
        .toggle-row.tw { background: #fef2f2; border-color: #fca5a5; }
        .tsw { width: 38px; height: 21px; border-radius: 9999px; background: #dde3ef; position: relative; flex-shrink: 0; transition: background 0.22s; }
        .tsw.on { background: #ef4444; }
        .tknob { position: absolute; top: 3px; left: 3px; width: 15px; height: 15px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: left 0.22s; }
        .tsw.on .tknob { left: 20px; }
        .ttxt { font-size: 0.8rem; font-weight: 600; color: #475569; }
        .toggle-row.tw .ttxt { color: #dc2626; }

        /* ── SNAPSHOT CARDS ── */
        .snap-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 20px; }
        .snap-card {
          background: var(--surface); border: 1px solid var(--border); border-left-width: 3px;
          border-radius: 13px; padding: 13px 14px; box-shadow: var(--shadow-sm);
        }
        .snap-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .snap-domain { font-size: 0.69rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; font-family: "DM Sans",sans-serif; }
        .snap-time { font-size: 0.64rem; color: var(--text-muted); background: var(--bg); padding: 2px 6px; border-radius: 5px; }
        .snap-val { font-size: 0.74rem; color: var(--text-secondary); display: flex; justify-content: space-between; margin-bottom: 3px; }
        .snap-val strong { color: var(--text-primary); font-weight: 700; }

        /* ── SCORE PREVIEW ── */
        .score-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 11px; margin-bottom: 24px; }
        .score-card {
          background: var(--surface); border: 1px solid rgba(0,0,0,0.07);
          border-radius: 15px; padding: 14px 16px;
          display: flex; align-items: center; gap: 10px; box-shadow: var(--shadow-card);
          transition: all 0.22s; cursor: default;
        }
        .score-card:hover { box-shadow: var(--shadow-hover); transform: translateY(-2px); }
        .score-name { font-size: 0.65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .score-nums { display: flex; align-items: center; gap: 5px; margin-top: 2px; }
        .score-old { font-size: 0.84rem; font-weight: 600; color: var(--text-muted); }
        .score-new { font-size: 0.94rem; font-weight: 800; font-family: "JetBrains Mono",monospace; }
        .score-diff { font-size: 0.67rem; font-weight: 700; padding: 2px 6px; border-radius: 5px; font-family: "JetBrains Mono",monospace; }
        .d-up { background: #ecfdf5; color: #10b981; }
        .d-dn { background: #fef2f2; color: #ef4444; }

        /* ── PRIORITY / DOMAIN BUTTONS (reused for upload domain) ── */
        .prio-btn {
          padding: 12px 7px; border-radius: 12px; border: 1.5px solid var(--border);
          background: #F8FAFD; cursor: pointer; transition: all 0.2s;
          display: flex; flex-direction: column; align-items: center; gap: 5px; font-family: "Inter",sans-serif;
        }
        .prio-btn:hover { border-color: var(--border-hover); }
        .prio-btn.on { border-color: var(--brand); background: var(--brand-light); }
        .prio-label { font-size: 0.73rem; font-weight: 700; color: #374151; }

        /* ── SUBMIT ── */
        .save-btn {
          width: 100%; padding: 14px; border-radius: 13px; border: none; cursor: pointer;
          font-family: "DM Sans",sans-serif; font-size: 0.95rem; font-weight: 800; color: #fff;
          background: linear-gradient(135deg, #0047D4, #0066FF);
          box-shadow: 0 4px 20px rgba(0,71,212,0.30);
          display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.22s;
        }
        .save-btn:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,71,212,0.36); }
        .save-btn:disabled { background: #94A3B8 !important; box-shadow: none !important; cursor: not-allowed; transform: none; }
        .save-hint { text-align: center; font-size: 0.72rem; color: var(--text-muted); margin-top: 9px; }

        /* ── ERROR BOX ── */
        .err-box {
          display: flex; align-items: center; gap: 9px;
          padding: 11px 15px; border-radius: 11px;
          background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626;
          font-size: 0.82rem; font-weight: 600; margin-bottom: 12px;
        }

        /* ── TODAY BANNER ── */
        .today-banner {
          display: flex; align-items: center; gap: 10px;
          background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 14px;
          padding: 12px 16px; font-size: 0.82rem; font-weight: 600; color: #15803d;
          margin-bottom: 20px;
        }

        /* ── INTEGRATION CARDS ── */
        .integrations-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 0; }
        .int-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 0.67rem; font-weight: 700; padding: 3px 9px; border-radius: 9999px; margin-bottom: 0; }
        .badge-connected { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
        .badge-disconnected { background: #F8FAFD; color: var(--text-muted); border: 1px solid var(--border); }
        .badge-dot { width: 6px; height: 6px; border-radius: 50%; }
        .dot-green { background: #22c55e; }
        .dot-gray { background: #cbd5e1; }

        /* ── BUTTONS SM ── */
        .btn-sm {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 13px; border-radius: 9999px; font-size: 0.72rem; font-weight: 700;
          cursor: pointer; font-family: inherit; transition: all 0.17s; border: none;
        }
        .btn-sm-primary { background: var(--brand-light); color: var(--brand); border: 1.5px solid var(--brand-mid); }
        .btn-sm-primary:hover { background: var(--brand); color: #fff; border-color: var(--brand); }
        .btn-sm-ghost { background: #F8FAFD; color: var(--text-muted); border: 1.5px solid var(--border); }
        .btn-sm-ghost:hover { background: #fef2f2; color: #dc2626; border-color: #fca5a5; }

        /* ── UPLOAD TYPE GRID ── */
        .upload-type-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 13px; margin-bottom: 18px; }
        .upload-type-card {
          background: var(--surface); border: 1.5px solid var(--border); border-radius: 15px;
          padding: 18px 14px; text-align: center; cursor: pointer; transition: all 0.2s;
          display: flex; flex-direction: column; align-items: center; gap: 7px; box-shadow: var(--shadow-sm);
        }
        .upload-type-card:hover { border-color: var(--border-hover); background: var(--brand-light); transform: translateY(-1px); }
        .upload-type-card.selected { box-shadow: var(--shadow-md); }

        /* ── DROPZONE ── */
        .dropzone {
          border: 2px dashed var(--border-hover); border-radius: 13px; padding: 28px 16px;
          text-align: center; cursor: pointer; background: #F8FAFD; transition: all 0.2s;
          display: flex; flex-direction: column; align-items: center; gap: 7px;
        }
        .dropzone:hover { border-color: var(--brand); background: var(--brand-light); }
        .upload-msg { display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px; border-radius: 11px; font-size: 0.79rem; font-weight: 600; white-space: pre-wrap; }
        .upload-msg.ok { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
        .upload-msg.err { background: #fef2f2; border: 1px solid #fca5a5; color: #dc2626; }

        /* ── PROCESSING ── */
        .proc-root { min-height: 100vh; background: var(--bg-deep); display: flex; align-items: center; justify-content: center; padding: 24px; }
        .proc-card {
          background: var(--surface); border: 1px solid var(--border); border-radius: 28px;
          padding: 48px 40px; max-width: 480px; width: 100%;
          box-shadow: 0 12px 48px rgba(0,71,212,0.1);
          display: flex; flex-direction: column; align-items: center; text-align: center;
        }
        .proc-logo { font-family: "DM Sans",sans-serif; font-size: 0.82rem; font-weight: 800; color: var(--brand); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 36px; display: flex; align-items: center; gap: 7px; }
        .proc-emoji-wrap {
          width: 96px; height: 96px;
          background: linear-gradient(135deg, var(--brand-light), #e0e7ff); border: 2px solid #dbeafe;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          margin-bottom: 28px; position: relative;
        }
        .proc-emoji-ring {
          position: absolute; inset: -6px; border-radius: 50%;
          border: 2px solid rgba(0,71,212,0.15);
          animation: lp-pulse 2s ease-in-out infinite;
        }
        .proc-step-text { font-family: "DM Sans",sans-serif; font-size: 1.35rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em; margin-bottom: 8px; min-height: 36px; }
        .proc-step-row {
          display: flex; align-items: center; gap: 10px; padding: 9px 13px;
          border-radius: 11px; font-size: 0.81rem; font-weight: 500; color: var(--text-muted); transition: all 0.3s;
        }
        .proc-step-row.done { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; font-weight: 600; }
        .proc-step-row.active { background: var(--brand-light); border: 1px solid #dbeafe; color: var(--brand); font-weight: 700; }
        .proc-step-row.pending { background: #F8FAFD; border: 1px solid transparent; }

        /* ── RESPONSIVE ── */
        @media (max-width: 960px) {
          .left-panel { display: none; }
          .mob-topbar { display: flex; }
          .mob-tabbar { display: flex; }
          .top-nav-links { display: none; }
          .top-nav-hamburger { display: flex; }
          .main-wrapper { padding: 0; }
          .content-shell { margin: 0; border-radius: 0; box-shadow: none; }
          .page-top { padding: 24px 22px 20px; }
          .body-pad { padding: 22px 18px calc(var(--mob-tab-h) + 22px); }
          .snap-grid, .score-grid, .integrations-grid, .upload-type-grid { grid-template-columns: 1fr; }
          .sg-2, .fg-2 { grid-template-columns: 1fr; }
        }
        @media (max-width: 520px) {
          .page-top { padding: 20px 16px 16px; flex-direction: column; align-items: flex-start; gap: 13px; }
          .body-pad { padding: 18px 14px calc(var(--mob-tab-h) + 18px); }
          .form-card-head { padding: 14px 16px 11px; }
          .form-card-body { padding: 16px 16px; gap: 13px; }
          .top-nav-inner { padding: 0 14px; }
        }
      `}</style>

      <TopNav />

      {/* Mobile Drawer Overlay */}
      <div className={`mob-drawer-overlay${drawerOpen ? " open" : ""}`} onClick={() => setDrawerOpen(false)} />
      <div className={`mob-drawer${drawerOpen ? " open" : ""}`}>
        <div className="mob-drawer-grid" />
        <div className="mob-drawer-head">
          <div style={{ flex:1 }}>
            <div className="lp-logo"><div className="lp-logo-dot" /> Syntra</div>
            <div style={{ fontFamily:"DM Sans,sans-serif", fontSize:"1.1rem", fontWeight:800, color:"#fff" }}>Check-in</div>
          </div>
          <button className="mob-drawer-close" onClick={() => setDrawerOpen(false)}><X size={14} /></button>
        </div>
        <div className="mob-drawer-nav">
          <div className="lp-section-lbl">Data Sources</div>
          {sidebarNav.map(item => (
            <NavItem key={item.key} icon={item.icon} label={item.label} sub={item.sub}
              active={activePanel === item.key} badge={item.badge}
              onClick={() => { handleActivePanelChange(item.key); setDrawerOpen(false); }} />
          ))}
        </div>
      </div>

      <div className="page-body">
        {/* Desktop Sidebar */}
        <div className="left-panel">
          <div className="left-panel-top-rule" />
          <div className="lp-grid" />
          <div className="lp-brand">
            <div className="lp-logo"><div className="lp-logo-dot" /> Syntra</div>
            <div className="lp-heading">Daily Check-in</div>
            <div className="lp-sub">Log your health, finances and learning every day.</div>
          </div>
          <div className="lp-nav">
            <div className="lp-section-lbl">Data Sources</div>
            {sidebarNav.map(item => (
              <NavItem key={item.key} icon={item.icon} label={item.label} sub={item.sub}
                active={activePanel === item.key} badge={item.badge}
                onClick={() => handleActivePanelChange(item.key)} />
            ))}
          </div>
        </div>

        {/* Main Wrapper */}
        <div className="main-wrapper">
          <div className="mob-topbar">
            <button className="mob-topbar-menu" onClick={() => setDrawerOpen(true)}><Menu size={16} /></button>
            <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
              <div className="lp-logo-dot" />
              <span style={{ fontSize:"0.72rem", fontWeight:800, color:"rgba(255,255,255,0.7)", letterSpacing:"0.13em", textTransform:"uppercase" }}>Syntra&nbsp;&nbsp;</span>
              <span style={{ fontFamily:"DM Sans,sans-serif", fontSize:"0.96rem", fontWeight:800, color:"#fff" }}>
                {activePanel === "manual" ? "Check-in" : activePanel === "social" ? "Social" : activePanel === "assets" ? "Net Worth" : activePanel === "uploads" ? "Uploads" : "API Sync"}
              </span>
            </div>
          </div>

          <div className="content-shell">

            {/* ── MANUAL ENTRY ── */}
            {activePanel === "manual" && (
              <div className="screen">
                <div className="page-top">
                  <div>
                    <div className="page-eyebrow"><div className="page-eyebrow-dot" /><span className="page-eyebrow-text">Check-in</span></div>
                    <h1 className="page-title">
                      <TypewriterTitle phrases={["Today's Check-in", "Log Your Day", "How Did It Go?"]} />
                    </h1>
                    <p className="page-subtitle">Fill in what happened today — your health, money, and learning.</p>
                  </div>
                </div>

                <div className="body-pad">
                  {todayLogged && (
                    <div className="today-banner">
                      <div style={{ width:28, height:28, background:"#dcfce7", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <CheckCircle2 size={15} color="#16a34a" />
                      </div>
                      <div><strong>Already logged today.</strong> Your earlier entries are pre-filled — update and save to overwrite.</div>
                    </div>
                  )}

                  {/* Snapshot */}
                  {latest && (latest.health || latest.finance || latest.career) && (
                    <>
                      <div className="section-hd"><span className="section-hd-label">Last Entry</span><div className="section-hd-rule" /></div>
                      <div className="snap-grid" style={{ marginBottom:24 }}>
                        {[
                          { domain:"Health", color:"var(--brand)", data:latest.health, vals: latest.health ? [{ k:"Sleep", v:`${latest.health.data.sleepHours}h` },{ k:"Workout", v:`${latest.health.data.workoutMinutes}m` },{ k:"Stress", v:`${latest.health.data.stressLevel}/10` }] : [] },
                          { domain:"Finance", color:"#0055EE", data:latest.finance, vals: latest.finance ? [{ k:"Saved", v:`₹${latest.finance.data.amountSaved}` },{ k:"Spent", v:`₹${latest.finance.data.discretionarySpent}` }] : [] },
                          { domain:"Career", color:"#7c3aed", data:latest.career, vals: latest.career ? [{ k:"Study", v:`${latest.career.data.hoursStudied}h` },{ k:"Rating", v:`${latest.career.data.productivityRating}/10` }] : [] },
                        ].map(s => (
                          <div key={s.domain} className="snap-card" style={{ borderLeftColor:s.color }}>
                            <div className="snap-head">
                              <span className="snap-domain" style={{ color:s.color }}>{s.domain}</span>
                              <span className="snap-time">{s.data ? fmtDate(s.data.date) : "—"}</span>
                            </div>
                            {s.vals.length
                              ? s.vals.map(v => <div key={v.k} className="snap-val"><span>{v.k}</span><strong>{v.v}</strong></div>)
                              : <span style={{ fontSize:"0.73rem", color:"var(--text-muted)", fontStyle:"italic" }}>No data yet</span>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Score Preview */}
                  <div className="section-hd">
                    <span className="section-hd-label"><Sparkles size={11} /> Live score preview</span>
                    <div className="section-hd-rule" />
                  </div>
                  <div className="score-grid">
                    {[
                      { label:"Health", old:currentScores.health, nw:projectedH, daily:pH, color:"var(--brand)", icon:<HeartPulse size={17} /> },
                      { label:"Finance", old:currentScores.finance, nw:projectedF, daily:pF, color:"#0055EE", icon:<Wallet size={17} /> },
                      { label:"Career", old:currentScores.career, nw:projectedC, daily:pC, color:"#7c3aed", icon:<Briefcase size={17} /> },
                    ].map(c => {
                      const diff = c.nw - c.old;
                      return (
                        <div key={c.label} className="score-card">
                          <span style={{ color:c.color }}>{c.icon}</span>
                          <div>
                            <div className="score-name">{c.label}</div>
                            <div className="score-nums">
                              <span className="score-old">{c.old}</span>
                              <span style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>→</span>
                              <span className="score-new" style={{ color: diff < 0 ? "#ef4444" : diff > 0 ? "#10b981" : c.color }}>{c.nw}</span>
                              {diff !== 0 && <span className={`score-diff ${diff > 0 ? "d-up" : "d-dn"}`}>{diff > 0 ? "+" : ""}{diff}</span>}
                            </div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: 4 }}>
                              Today's Performance: <strong>{c.daily}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Health Section */}
                  <div className="section-hd"><span className="section-hd-label"><HeartPulse size={11} /> Health</span><div className="section-hd-rule" /></div>
                  <div className="form-card">
                    <div className="form-card-stripe" style={{ background:"linear-gradient(90deg,var(--brand),#0066FF)" }} />
                    <div className="form-card-head">
                      <div className="fch-icon" style={{ background:"#dbeafe", color:"var(--brand)" }}><HeartPulse size={19} /></div>
                      <div><div className="fch-title">Health</div><div className="fch-sub">Sleep, activity, stress & hydration</div></div>
                    </div>
                    <div className="form-card-body">
                      <div className="sg-2">
                        <Slider label="Sleep hours" value={health.sleepHours} onChange={v => setHealth(p => ({ ...p, sleepHours:v }))} min={0} max={12} step={0.5} icon={<Moon size={14} />} unit="h" color="var(--brand)" hint="Aim for 7–9h" />
                        <Slider label="Exercise time" value={health.workoutMinutes} onChange={v => setHealth(p => ({ ...p, workoutMinutes:v }))} min={0} max={120} step={5} icon={<Dumbbell size={14} />} unit="m" color="#10b981" hint="Even a walk counts" />
                      </div>
                      <div className="sg-2">
                        <Slider label="Stress level" value={health.stressLevel} onChange={v => setHealth(p => ({ ...p, stressLevel:v }))} min={1} max={10} step={1} icon={<Activity size={14} />} unit="/10" color="#ef4444" hint="1 = very calm" />
                        <Slider label="Water glasses" value={health.waterGlasses} onChange={v => setHealth(p => ({ ...p, waterGlasses:v }))} min={0} max={15} step={1} icon={<Droplets size={14} />} unit=" gl" color="#06b6d4" hint="8 = ideal" />
                      </div>
                      <div className="sg-2">
                        <Slider label="Mood" value={health.moodScore} onChange={v => setHealth(p => ({ ...p, moodScore:v }))} min={1} max={10} step={1} icon={<Star size={14} />} unit="/10" color="#f59e0b" hint="1 = low, 10 = great" />
                        <Slider label="Energy level" value={health.energyLevel} onChange={v => setHealth(p => ({ ...p, energyLevel:v }))} min={1} max={10} step={1} icon={<Zap size={14} />} unit="/10" color="#8b5cf6" hint="How alert?" />
                      </div>
                      <div className="s-div" />
                      <div className="pill-wrap">
                        <span className="field-label">Meals skipped today?</span>
                        <div className="pill-row">
                          {[{ v:"breakfast", l:"☕ Breakfast" },{ v:"lunch", l:"🍛 Lunch" },{ v:"dinner", l:"🍽️ Dinner" }].map(m => (
                            <button key={m.v} className={`pill${health.skippedMeals.includes(m.v) ? " on" : ""}`} onClick={() => toggleMeal(m.v)}>{m.l}</button>
                          ))}
                        </div>
                      </div>
                      <div className="s-div" />

                      <div className="pill-wrap">
                        <span className="field-label">Weekly Social Check-in</span>
                        <div className="toggle-row" style={{ marginTop: 4, width: "fit-content" }} onClick={() => setHealth(p => ({ ...p, spentTimeWithFriends: !p.spentTimeWithFriends }))}>
                          <div className={`tsw${health.spentTimeWithFriends ? " on" : ""}`} style={health.spentTimeWithFriends ? { background: "#10b981" } : {}}><div className="tknob" /></div>
                          <span className="ttxt">Did you spend time with friends or family this week?</span>
                        </div>
                      </div>

                      <div className="sg-2">
                        <Slider label="Social activity count this week" value={health.socialCount} onChange={v => setHealth(p => ({ ...p, socialCount: v }))} min={0} max={10} step={1} icon={<TrendingUp size={15} />} unit=" times" color="#10b981" hint="Face-to-face hangouts or calls" />
                        <Slider label="Relationship quality (monthly check-in)" value={health.relationshipQuality} onChange={v => setHealth(p => ({ ...p, relationshipQuality: v }))} min={1} max={5} step={1} icon={<Heart size={15} />} unit="/5" color="#ec4899" hint="1 = disconnected, 5 = fully connected" />
                      </div>

                      <div className="s-div" />

                      <div className="fg-2">
                        <Field label="Calories eaten" opt type="number" value={health.caloriesConsumed} onChange={v => setHealth(p => ({ ...p, caloriesConsumed:v }))} placeholder="e.g. 2100" />
                        <Field label="Calorie target" opt type="number" value={health.calorieGoal} onChange={v => setHealth(p => ({ ...p, calorieGoal:v }))} placeholder="e.g. 2400" />
                      </div>
                      <Field label="What did you eat today?" opt value={health.mealsEatenToday} onChange={v => setHealth(p => ({ ...p, mealsEatenToday:v }))} placeholder="e.g. Oats with honey, brown rice with paneer curry..." textarea note="Helps personalise your nutrition suggestions" />
                    </div>
                  </div>

                  {/* Finance Section */}
                  <div className="section-hd"><span className="section-hd-label"><Wallet size={11} /> Money</span><div className="section-hd-rule" /></div>
                  <div className="form-card">
                    <div className="form-card-stripe" style={{ background:"linear-gradient(90deg,#0055EE,#2A18E8)" }} />
                    <div className="form-card-head">
                      <div className="fch-icon" style={{ background:"#e0e7ff", color:"#0055EE" }}><Wallet size={19} /></div>
                      <div><div className="fch-title">Money</div><div className="fch-sub">What you saved and spent today</div></div>
                    </div>
                    <div className="form-card-body">
                      <div className="fg-2">
                        <Field label="Amount saved today" req type="number" value={finance.amountSaved} onChange={v => setFinance(p => ({ ...p, amountSaved:v }))} placeholder="₹ e.g. 350" note="Enter 0 if nothing saved today" />
                        <Field label="Discretionary spending" req type="number" value={finance.discretionarySpent} onChange={v => setFinance(p => ({ ...p, discretionarySpent:v }))} placeholder="₹ e.g. 60" note="Non-essential spending" />
                      </div>
                      <div className="fg-2">
                        <Field label="Biggest purchase today" opt value={finance.biggestExpenseToday} onChange={v => setFinance(p => ({ ...p, biggestExpenseToday:v }))} placeholder="e.g. Swiggy order, Amazon" />
                        <div className="field-grp">
                          <label className="field-label">Spending category</label>
                          <select className="field-input" value={finance.spendingCategory} onChange={e => setFinance(p => ({ ...p, spendingCategory:e.target.value }))}>
                            <option value="food">Food & Groceries</option>
                            <option value="entertainment">Entertainment</option>
                            <option value="shopping">Shopping</option>
                            <option value="transport">Transport</option>
                            <option value="other">Something else</option>
                          </select>
                        </div>
                      </div>
                      <div className={`toggle-row${finance.impulseSpend ? " tw" : ""}`} onClick={() => setFinance(p => ({ ...p, impulseSpend:!p.impulseSpend }))}>
                        <div className={`tsw${finance.impulseSpend ? " on" : ""}`}><div className="tknob" /></div>
                        <span className="ttxt">{finance.impulseSpend ? "⚠️ Yes, I made an unplanned purchase today" : "Did you buy something on impulse?"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Career Section */}
                  <div className="section-hd"><span className="section-hd-label"><Briefcase size={11} /> Learning & Work</span><div className="section-hd-rule" /></div>
                  <div className="form-card">
                    <div className="form-card-stripe" style={{ background:"linear-gradient(90deg,#7c3aed,#2A18E8)" }} />
                    <div className="form-card-head">
                      <div className="fch-icon" style={{ background:"#ede9fe", color:"#7c3aed" }}><Briefcase size={19} /></div>
                      <div><div className="fch-title">Learning & Work</div><div className="fch-sub">Study time, focus and what you worked on</div></div>
                    </div>
                    <div className="form-card-body">
                      <div className="fg-2">
                        <Field label="Hours studied / worked" req type="number" value={career.hoursStudied} onChange={v => setCareer(p => ({ ...p, hoursStudied:v }))} placeholder="e.g. 3" note="Count deep focus time" />
                        <Field label="Study sessions completed" opt type="number" value={career.sessionsCompleted} onChange={v => setCareer(p => ({ ...p, sessionsCompleted:v }))} placeholder="e.g. 3" />
                      </div>
                      <Slider label="How productive were you today?" value={career.productivityRating} onChange={v => setCareer(p => ({ ...p, productivityRating:v }))} min={1} max={10} step={1} icon={<TrendingUp size={14} />} unit="/10" color="#7c3aed" hint="Be honest — it helps!" />
                      <Field label="Course / skill worked on" opt value={career.courseName} onChange={v => setCareer(p => ({ ...p, courseName:v }))} placeholder="e.g. ML Fundamentals, DSA, System Design" />
                      <Field label="Goal you moved forward today" opt value={career.goalWorkedOn} onChange={v => setCareer(p => ({ ...p, goalWorkedOn:v }))} placeholder="e.g. Solved 5 LeetCode problems" />
                      <Field label="What got in your way today?" opt value={career.blockerToday} onChange={v => setCareer(p => ({ ...p, blockerToday:v }))} placeholder="e.g. Felt tired after work, got distracted" />
                    </div>
                  </div>

                  {/* Reflection */}
                  <div className="section-hd"><span className="section-hd-label"><MessageSquare size={11} /> Reflection</span><div className="section-hd-rule" /></div>
                  <div className="form-card">
                    <div className="form-card-stripe" style={{ background:"linear-gradient(90deg,#f59e0b,#fbbf24)" }} />
                    <div className="form-card-head">
                      <div className="fch-icon" style={{ background:"#fef3c7", color:"#f59e0b" }}><MessageSquare size={19} /></div>
                      <div><div className="fch-title">How are you feeling?</div><div className="fch-sub">A quick reflection helps your insights get personal</div></div>
                    </div>
                    <div className="form-card-body">
                      <p style={{ fontSize:"0.79rem", color:"var(--text-muted)", fontStyle:"italic" }}>💬 {prompt}</p>
                      <textarea className="field-input f-textarea" style={{ minHeight:88 }}
                        placeholder="Write anything — even a sentence is helpful..."
                        value={dailyNote} onChange={e => setDailyNote(e.target.value)} maxLength={500} />
                      <div style={{ textAlign:"right", fontSize:"0.67rem", color:"var(--text-muted)" }}>{dailyNote.length} / 500</div>
                    </div>
                  </div>

                  {message && <div className="err-box"><AlertTriangle size={15} /> {message}</div>}

                  <button className="save-btn" onClick={handleSubmit} disabled={!canSubmit || loading}>
                    {loading ? <><Activity size={17} /> Saving your day...</> : <><Send size={16} /> Save Today's Log</>}
                  </button>
                  {!canSubmit && <p className="save-hint">Fill in sleep hours, savings, spending, and study hours to save your log.</p>}
                </div>
              </div>
            )}

            {/* ── SOCIAL & FAMILY ── */}
            {activePanel === "social" && (
              <div className="screen">
                <div className="page-top">
                  <div>
                    <div className="page-eyebrow"><div className="page-eyebrow-dot" /><span className="page-eyebrow-text">Social Profile</span></div>
                    <h1 className="page-title">
                      <TypewriterTitle phrases={["Social & Family", "Your Support Circle", "Relations & Caregiving"]} />
                    </h1>
                    <p className="page-subtitle">Configure your household members, dependents, and support network.</p>
                  </div>
                </div>

                <div className="body-pad">
                  <div className="form-card">
                    <div className="form-card-stripe" style={{ background: "linear-gradient(90deg,#ec4899,#f43f5e)" }} />
                    <div className="form-card-head">
                      <div className="fch-icon" style={{ background: "#fce7f3", color: "#ec4899" }}><Heart size={19} /></div>
                      <div>
                        <div className="fch-title">Social & Relationships</div>
                        <div className="fch-sub">Household members, dependents & your support network</div>
                      </div>
                    </div>
                    <div className="form-card-body">
                      {/* Relationship Status */}
                      <div className="field-grp">
                        <label className="field-label">Relationship Status</label>
                        <select className="field-input" value={relations.relationshipStatus} onChange={e => setRelations(p => ({ ...p, relationshipStatus: e.target.value as any }))}>
                          <option value="Single">Single</option>
                          <option value="Partnered">Partnered</option>
                          <option value="Married">Married</option>
                          <option value="Separated">Separated</option>
                        </select>
                      </div>

                      <div className="s-div" />

                      {/* Household Members */}
                      <div className="pill-wrap">
                        <span className="field-label">Household Members (Living with you)</span>
                        <div className="pill-row" style={{ marginBottom: 10 }}>
                          {relations.householdMembers?.map((member, idx) => (
                            <span key={idx} className="pill on" style={{ background: "#3b82f6", display: "inline-flex", alignItems: "center", gap: 6, color: "#fff", borderColor: "transparent" }}>
                              🏠 {member.relationshipType}
                              <button type="button" onClick={() => setRelations(p => ({ ...p, householdMembers: (p.householdMembers || []).filter((_, i) => i !== idx) }))} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: "bold" }}>×</button>
                            </span>
                          ))}
                        </div>
                        <div className="dp-row" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {([
                            { v: "partner", l: "Add Partner" },
                            { v: "child", l: "Add Child" },
                            { v: "parent", l: "Add Parent" },
                            { v: "sibling", l: "Add Sibling" }
                          ] as const).map(opt => (
                            <button key={opt.v} className="btn-sm btn-sm-ghost" style={{ fontSize: "0.75rem", padding: "4px 10px" }} onClick={() => setRelations(p => ({ ...p, householdMembers: [...(p.householdMembers || []), { relationshipType: opt.v }] }))}>
                              + {opt.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="s-div" />

                      {/* Dependents & Caregiving */}
                      <div className="pill-wrap">
                        <span className="field-label">Dependents & Caregiving (People under your care)</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
                          {relations.dependents?.map((dep, idx) => (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg)", padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)" }}>
                              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
                                👶 {dep.type === "child" ? "Child" : "Elderly Parent"} (Age: {dep.age})
                              </span>
                              <button type="button" onClick={() => setRelations(p => ({ ...p, dependents: (p.dependents || []).filter((_, i) => i !== idx) }))} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>×</button>
                            </div>
                          ))}
                        </div>
                        {activeDependentType ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px", background: "var(--bg)", borderRadius: 12, border: "1px solid var(--border)", marginTop: 10, maxWidth: 320 }}>
                            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
                              Add Dependent: {activeDependentType === "child" ? "Child" : "Elderly Parent"}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Age</label>
                              <input 
                                type="number" 
                                min="0" 
                                max="120"
                                className="field-input" 
                                style={{ height: "36px", padding: "0 10px", fontSize: "0.85rem" }}
                                value={dependentAge} 
                                onChange={e => setDependentAge(e.target.value)} 
                                placeholder="Enter age"
                                autoFocus
                              />
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                              <button 
                                type="button" 
                                className="btn-sm btn-sm-primary" 
                                style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                                onClick={() => {
                                  const age = parseInt(dependentAge);
                                  if (isNaN(age) || age < 0 || age > 120) {
                                    setRelationsMsg({ text: "Please enter a valid age between 0 and 120.", ok: false });
                                    return;
                                  }
                                  setRelations(p => ({
                                    ...p,
                                    dependents: [...(p.dependents || []), { type: activeDependentType, age }]
                                  }));
                                  setActiveDependentType(null);
                                  setDependentAge("");
                                }}
                              >
                                Add
                              </button>
                              <button 
                                type="button" 
                                className="btn-sm btn-sm-ghost" 
                                style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                                onClick={() => {
                                  setActiveDependentType(null);
                                  setDependentAge("");
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button className="btn-sm btn-sm-ghost" style={{ fontSize: "0.75rem", padding: "4px 10px" }} onClick={() => {
                              setActiveDependentType("child");
                              setDependentAge("");
                            }}>+ Add Dependent Child</button>
                            <button className="btn-sm btn-sm-ghost" style={{ fontSize: "0.75rem", padding: "4px 10px" }} onClick={() => {
                              setActiveDependentType("elderly_parent");
                              setDependentAge("");
                            }}>+ Add Dependent Parent</button>
                          </div>
                        )}
                      </div>

                      <div className="s-div" />

                      {/* Support Network Setup */}
                      <div className="pill-wrap">
                        <span className="field-label">Support Network (3–5 people to connect with in tough times)</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
                          {supportNetwork?.map((net, idx) => (
                            <div key={idx} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, background: "#fdf2f8", padding: "10px 14px", borderRadius: 12, border: "1px solid #fbcfe8" }}>
                              <div style={{ flex: 1, minWidth: 150 }}>
                                <strong style={{ color: "#db2777", fontSize: "0.86rem" }}>{net.name}</strong>
                                <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginLeft: 6 }}>({net.relationshipType})</span>
                              </div>
                              <span style={{ background: "#fce7f3", color: "#db2777", fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 6, textTransform: "uppercase" }}>
                                🎯 {net.tag === "venting" ? "Venting" : net.tag === "advice" ? "Advice" : net.tag === "distraction" ? "Distraction" : "Motivation"}
                              </span>
                              <button type="button" onClick={() => setSupportNetwork(p => p.filter((_, i) => i !== idx))} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>×</button>
                            </div>
                          ))}
                          {showAddSupport ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px", background: "#fff5f8", borderRadius: 14, border: "1px solid #fbcfe8", marginTop: 10, width: "100%" }}>
                              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#db2777" }}>
                                Add Support Network Contact
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>Name</label>
                                  <input 
                                    type="text" 
                                    className="field-input" 
                                    style={{ height: "36px", padding: "0 10px", fontSize: "0.85rem" }}
                                    value={supportName} 
                                    onChange={e => setSupportName(e.target.value)} 
                                    placeholder="Enter contact name"
                                    autoFocus
                                  />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>Relationship</label>
                                  <input 
                                    type="text" 
                                    className="field-input" 
                                    style={{ height: "36px", padding: "0 10px", fontSize: "0.85rem" }}
                                    value={supportRelationship} 
                                    onChange={e => setSupportRelationship(e.target.value)} 
                                    placeholder="e.g. friend, sibling, mentor"
                                  />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>Support Type</label>
                                  <select 
                                    className="field-input" 
                                    style={{ height: "36px", padding: "0 10px", fontSize: "0.85rem" }}
                                    value={supportTag} 
                                    onChange={e => setSupportTag(e.target.value as any)}
                                  >
                                    <option value="venting">Venting (listener)</option>
                                    <option value="advice">Advice (guidance)</option>
                                    <option value="distraction">Distraction (fun/unwind)</option>
                                    <option value="motivation">Motivation (accountability)</option>
                                  </select>
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                <button 
                                  type="button" 
                                  className="btn-sm" 
                                  style={{ padding: "6px 14px", fontSize: "0.78rem", background: "linear-gradient(135deg,#ec4899,#f43f5e)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
                                  onClick={() => {
                                    if (!supportName.trim()) {
                                      setRelationsMsg({ text: "Please enter a contact name.", ok: false });
                                      return;
                                    }
                                    const relationship = supportRelationship.trim() || "Friend";
                                    setSupportNetwork(p => [...p, { name: supportName.trim(), relationshipType: relationship, tag: supportTag }]);
                                    setShowAddSupport(false);
                                    setSupportName("");
                                    setSupportRelationship("");
                                    setSupportTag("venting");
                                  }}
                                >
                                  Add Contact
                                </button>
                                <button 
                                  type="button" 
                                  className="btn-sm btn-sm-ghost" 
                                  style={{ padding: "6px 14px", fontSize: "0.78rem", borderColor: "#db2777", color: "#db2777" }}
                                  onClick={() => {
                                    setShowAddSupport(false);
                                    setSupportName("");
                                    setSupportRelationship("");
                                    setSupportTag("venting");
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            supportNetwork?.length < 5 && (
                              <button 
                                className="btn-sm btn-sm-ghost" 
                                style={{ width: "fit-content", borderColor: "#db2777", color: "#db2777", fontSize: "0.75rem", padding: "4px 10px" }} 
                                onClick={() => {
                                  setShowAddSupport(true);
                                  setSupportName("");
                                  setSupportRelationship("");
                                  setSupportTag("venting");
                                }}
                              >
                                + Add Support Contact
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      <div className="s-div" />

                      {relationsMsg && (
                        <div className={`upload-msg${relationsMsg.ok ? " ok" : " err"}`} style={{ padding: "8px 12px", borderRadius: 8, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          {relationsMsg.ok ? <CheckCircle2 size={15} style={{ color: "#22c55e" }} /> : <AlertTriangle size={15} style={{ color: "#ef4444" }} />}
                          <span style={{ color: relationsMsg.ok ? "#16a34a" : "#ef4444" }}>{relationsMsg.text}</span>
                        </div>
                      )}

                      <button className="save-btn" style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)", width: "fit-content" }} onClick={handleSaveRelations} disabled={relationsSaving}>
                        {relationsSaving ? "Syncing..." : "Sync Relations & Support Network"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── NET WORTH ── */}
            {activePanel === "assets" && (
              <div className="screen">
                <div className="page-top">
                  <div>
                    <div className="page-eyebrow"><div className="page-eyebrow-dot" /><span className="page-eyebrow-text">Wealth Architecture</span></div>
                    <h1 className="page-title">Net Worth</h1>
                    <p className="page-subtitle">Track your assets, liabilities, and real net equity in one place.</p>
                  </div>
                </div>
                <div className="body-pad">
                  <NetWorthPanel />
                </div>
              </div>
            )}

            {/* ── UPLOADS ── */}
            {activePanel === "uploads" && (
              <div className="screen">
                <UploadsPanel onSuccess={refreshLatest} />
              </div>
            )}

            {/* ── API SYNC ── */}
            {activePanel === "api" && (
              <div className="screen">
                <ApiSyncPanel 
                  onSuccess={refreshLatest}
                  googleFitConnected={googleFitConnected}
                  setGoogleFitConnected={setGoogleFitConnected}
                  googleFitLastSync={googleFitLastSync}
                  setGoogleFitLastSync={setGoogleFitLastSync}
                  mockConnected={mockConnected}
                  setMockConnected={setMockConnected}
                  mockSyncTimes={mockSyncTimes}
                  setMockSyncTimes={setMockSyncTimes}
                  loading={apiLoading}
                />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <nav className="mob-tabbar">
        <div className="mob-tabbar-inner">
          <button className={`mob-tab${activePanel === "manual" ? " active" : ""}`} onClick={() => handleActivePanelChange("manual")}>
            <div className="mob-tab-icon"><Edit3 size={19} /></div>
            <span className="mob-tab-label">Check-in</span>
          </button>
          <button className={`mob-tab${activePanel === "social" ? " active" : ""}`} onClick={() => handleActivePanelChange("social")}>
            <div className="mob-tab-icon"><Heart size={19} /></div>
            <span className="mob-tab-label">Social</span>
          </button>
          <button className={`mob-tab${activePanel === "assets" ? " active" : ""}`} onClick={() => handleActivePanelChange("assets")}>
            <div className="mob-tab-icon"><Wallet size={19} /></div>
            <span className="mob-tab-label">Net Worth</span>
          </button>
          <button className={`mob-tab${activePanel === "uploads" ? " active" : ""}`} onClick={() => handleActivePanelChange("uploads")}>
            <div className="mob-tab-icon"><Upload size={19} /></div>
            <span className="mob-tab-label">Uploads</span>
          </button>
          <button className={`mob-tab${activePanel === "api" ? " active" : ""}`} onClick={() => handleActivePanelChange("api")}>
            <div className="mob-tab-icon"><Plug size={19} /></div>
            <span className="mob-tab-label">API Sync</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default function IngestionPageWrapper() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#EDF0F7" }}>
        <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#0047D4", fontFamily: '"DM Sans", sans-serif' }}>
          Loading Ingestion Engine...
        </div>
      </div>
    }>
      <IngestionPage />
    </Suspense>
  );
}