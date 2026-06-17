"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight, Wallet, HeartPulse, Briefcase,
  Activity, BrainCircuit, Clock, ChevronRight,
  RefreshCw, TrendingUp, Zap, Target, Sparkles,
  CheckCircle2, Flame, Trophy, Lock, ChevronDown, ChevronUp, Star,
} from "lucide-react";
import {
  getAverageHealthMetrics,
  calculateRecoveryScore,
  calculateFatigueIndex,
  calculateBiologicalAge
} from "@/lib/healthMath";

/* ─── TYPES ─────────────────────────────────────────────────────── */
type LogType = { domain: string; date: string; domainData?: any };
type GoalType = {
  _id?: string; title: string; domain: string; priority: string;
  targetDate?: string; milestones?: { _id?: string; text: string; completed: boolean }[];
};
type DashboardData = {
  user?: { name?: string; email?: string; personalMission?: string; age?: number; profile?: any };
  syntraCore?: number;
  scorecards?: { health?: number; finance?: number; career?: number };
  gamification?: { totalPoints?: number; currentStreak?: number; badges?: string[] };
  goals?: GoalType[];
  timeline?: LogType[];
};

const DC = {
  health:  { label: "Health",  color: "#16a34a", bg: "rgba(22,163,74,0.08)",   border: "rgba(22,163,74,0.18)",  icon: <HeartPulse size={16}/> },
  finance: { label: "Finance", color: "#0369a1", bg: "rgba(3,105,161,0.08)",   border: "rgba(3,105,161,0.18)",  icon: <Wallet size={16}/>     },
  career:  { label: "Career",  color: "#7c3aed", bg: "rgba(124,58,237,0.08)",  border: "rgba(124,58,237,0.18)", icon: <Briefcase size={16}/>  },
} as any;

const PRIO = {
  high:   { color: "#dc2626", bg: "rgba(220,38,38,0.07)",   label: "High",   emoji: "🔥" },
  medium: { color: "#d97706", bg: "rgba(217,119,6,0.07)",   label: "Medium", emoji: "⚡" },
  low:    { color: "#16a34a", bg: "rgba(22,163,74,0.07)",   label: "Low",    emoji: "🌿" },
} as any;

const ALL_BADGES = [
  { id: "Habit Builder",   icon: "⚡", label: "Habit Builder",   level: "Level 1", color: "#7c3aed" },
  { id: "Focus Master",    icon: "🎯", label: "Focus Master",    level: "Level 1", color: "#0047D4" },
  { id: "Goal Getter",     icon: "⭐", label: "Goal Getter",     level: "Level 1", color: "#d97706" },
  { id: "Rising Twin",     icon: "🔥", label: "Rising Twin",     level: "Level 1", color: "#dc2626" },
  { id: "Week Warrior",    icon: "📅", label: "Week Warrior",    level: "Level 1", color: "#16a34a" },
  { id: "Month Master",    icon: "👑", label: "Month Master",    level: "Level 1", color: "#7c3aed" },
  { id: "Savings Streak",  icon: "💰", label: "Savings Streak",  level: "Level 1", color: "#0284c7" },
  { id: "Learning Machine",icon: "🧠", label: "Learning Machine",level: "Level 1", color: "#6d28d9" },
];

/* ─── TYPEWRITER ─────────────────────────────────────────────────── */
function TypewriterGreeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState("");
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    let timeText = "Good Night";
    if (hour >= 5 && hour < 12) timeText = "Good Morning";
    else if (hour >= 12 && hour < 17) timeText = "Good Afternoon";
    else if (hour >= 17 && hour < 21) timeText = "Good Evening";
    const phrases = [`${timeText}, ${name || "User"}`, "Tracking your growth in real time"];
    const current = phrases[phase];
    let i = 0;
    const interval = window.setInterval(() => {
      setGreeting(current.slice(0, i + 1));
      i++;
      if (i === current.length) {
        window.clearInterval(interval);
        window.setTimeout(() => {
          setVisible(false);
          window.setTimeout(() => {
            setPhase((p) => (p + 1) % phrases.length);
            setGreeting("");
            setVisible(true);
          }, 500);
        }, 1800);
      }
    }, 38);
    timerRef.current = interval;
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [phase, name]);

  return (
    <h1 className="dash-greeting" style={{ opacity: visible ? 1 : 0 }}>
      {greeting}<span className="dash-cursor" />
    </h1>
  );
}

/* ─── CIRCLE SCORE CARD ─────────────────────────────────────────── */
function CircleScore({ value, label, icon, suffix, formulaText }: {
  value: number; label: string; icon: React.ReactNode; suffix?: string; formulaText: string;
}) {
  const size = 130; const strokeW = 11;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const isPercent = !suffix;
  const pct = isPercent ? Math.max(0, Math.min(100, value)) : Math.min(100, (value / 500) * 100);
  const dash = (pct / 100) * circ;

  let trackColor = "#22c55e";
  let statusLabel = "Excellent";
  let statusBg = "#dcfce7";
  let statusColor = "#15803d";

  if (isPercent) {
    if (value < 40) { trackColor = "#ef4444"; statusLabel = "Needs Attention"; statusBg = "#fee2e2"; statusColor = "#b91c1c"; }
    else if (value < 70) { trackColor = "#f59e0b"; statusLabel = "Moderate"; statusBg = "#fef9c3"; statusColor = "#92400e"; }
  } else {
    trackColor = "#0066FF"; statusLabel = value > 200 ? "High Activity" : "Building Up";
    statusBg = "#eff6ff"; statusColor = "#1d4ed8";
  }

  return (
    <div className="circle-card">
      <div className="cc-top">
        <div className="cc-icon-label">
          <span className="cc-icon" style={{ color: trackColor }}>{icon}</span>
          <span className="cc-label-text">{label}</span>
        </div>
      </div>
      <div className="circle-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={strokeW} />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={trackColor} strokeWidth={strokeW} strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="circle-center">
          <span className="circle-num" style={{ color: trackColor }}>{value}{suffix ?? ""}</span>
          <span className="circle-denom">{isPercent ? "/100" : ""}</span>
        </div>
      </div>
      <div className="cc-bottom-section">
        <span className="cc-status-pill" style={{ background: statusBg, color: statusColor }}>{statusLabel}</span>
        <p className="cc-formula-text">{formulaText}</p>
      </div>
    </div>
  );
}

/* ─── LOADING ────────────────────────────────────────────────────── */
function TerminalLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", color: "#0055EE" }}>
      <div style={{ width: 280, height: 2, background: "#eef1f8", borderRadius: 2, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ height: "100%", background: "linear-gradient(90deg,#0055EE,#4499FF)", width: "40%", borderRadius: 2, animation: "ldbar 1.6s infinite ease-in-out" }} />
      </div>
      <div style={{ fontSize: 11, letterSpacing: "0.4em", textTransform: "uppercase", color: "#7788aa", fontWeight: 700 }}>Loading your dashboard…</div>
      <style>{`@keyframes ldbar{0%{margin-left:-40%}100%{margin-left:140%}}`}</style>
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [aiData, setAiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [floatId, setFloatId] = useState<string | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
  const handleToggleMilestone = async (gid: string, mid: string, wasDone: boolean) => {
    try {
      const res = await fetch("/api/goals/milestone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ goalId: gid, milestoneId: mid, completed: !wasDone }),
      });
      const d = await res.json();
      if (d.success) {
        setData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            goals: d.goals,
            gamification: {
              ...prev.gamification,
              totalPoints: d.gamification?.totalPoints,
              currentStreak: d.gamification?.currentStreak,
              badges: d.badges
            }
          };
        });
        if (!wasDone) {
          setFloatId(mid);
          setTimeout(() => setFloatId(null), 1400);
        }
      }
    } catch (err) {
      console.error("Failed to toggle milestone", err);
    }
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/ingestion", label: "Ingestion" },
    { href: "/goals", label: "Goals" },
    { href: "/simulator", label: "Simulator" },
    { href: "/insights", label: "Insights" },
    { href: "/profile", label: "Profile" },
  ];

  const fetchAll = async () => {
    setSyncing(true);
    setAiLoading(true);
    
    // Fetch core dashboard data first (extremely fast)
    fetch("/api/dashboard", { cache: "no-store", credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const d = await res.json();
          setData(d.dashboard);
        }
      })
      .catch((e) => console.error("Dashboard load failed:", e))
      .finally(() => setLoading(false));

    // Fetch AI recommendations in parallel, but do not block the page load
    fetch("/api/ai/recommend", { cache: "no-store", credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const a = await res.json();
          setAiData(a.ai);
        }
      })
      .catch((e) => console.error("AI load failed:", e))
      .finally(() => {
        setSyncing(false);
        setAiLoading(false);
      });
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    fetchAll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loading || !data) return <TerminalLoading />;

  /* derived values */
  const name = data.user?.name || "User";
  const rawMission = data.user?.personalMission || "Achieve Personal Optimization";
  const mission = rawMission.replace(/^["']|["']$/g, "");
  const healthScore = data.scorecards?.health ?? 72;
  const financeScore = data.scorecards?.finance ?? 82;
  const careerScore = data.scorecards?.career ?? 88;
  const twinSync = data.syntraCore ?? 82;
  const streak = data.gamification?.currentStreak ?? 0;
  const totalPoints = data.gamification?.totalPoints ?? 0;
  const logs = data.timeline || [];
  const goals = data.goals || [];
  const badges = data.gamification?.badges || [];

  // Streak Week generator
  const daysOfWeek = ["Su", "M", "T", "W", "Th", "F", "S"];
  const today = new Date();
  
  const streakWeek = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    const dayLabel = daysOfWeek[d.getDay()];
    // Color dots for recent days based on currentStreak (streak variable)
    const isCompleted = (6 - i) < streak;
    const isToday = i === 6;
    return {
      label: dayLabel,
      done: isCompleted,
      current: isToday
    };
  });

  const chronoAge = data.user?.age || 25.0;
  const avgHealthMetrics = getAverageHealthMetrics(logs);
  const recoveryScore = calculateRecoveryScore(avgHealthMetrics);
  const fatigueIndex = calculateFatigueIndex(avgHealthMetrics);
  const { biologicalAge: bioAge, reasons: bioReasons } = calculateBiologicalAge(chronoAge, avgHealthMetrics);

  // Dynamic Trajectory & 12-Month Projections — declared here so profile is available for all derived values below
  const profile = data.user?.profile;

  const latestHealthLog = logs.find(l => l.domain === "health")?.domainData || {};
  const currentSleep = latestHealthLog.sleepHours || 6.1;
  const currentStudy = logs.find(l => l.domain === "career")?.domainData?.hoursStudied || 3.4;
  // Use the user's directly-entered profile settings (income - budget) representing their monthly savings,
  // falling back to their latest finance log or 10,000 as default, so it aligns with their account configuration.
  const profileSavings = (profile?.monthlyIncome && profile?.monthlyBudget) ? (profile.monthlyIncome - profile.monthlyBudget) : 0;
  const logsSavings = (logs.find(l => l.domain === "finance")?.domainData?.amountSaved ?? 0) * 30;
  const currentMonthlySavings = profileSavings || logsSavings || 10000;


  const activeGoal = data.goals?.[0] ?? null;
  let daysRemaining = 412;
  if (activeGoal?.targetDate) {
    const diff = new Date(activeGoal.targetDate).getTime() - Date.now();
    if (diff > 0) daysRemaining = Math.ceil(diff / 86400000);
  }

  const scores = [
    { label: "Health",    value: healthScore,  icon: <HeartPulse size={16} />,  suffix: undefined, formula: "Sleep Quality + Physical Activity + Emotional Stability + Energy Consistency + Nutrition Balance − Stress Load" },
    { label: "Finance",   value: financeScore,  icon: <Wallet size={16} />,      suffix: undefined, formula: "Savings Consistency + Budget Adherence + Investment Discipline + Income Stability − Financial Risk" },
    { label: "Career",    value: careerScore,   icon: <Briefcase size={16} />,   suffix: undefined, formula: "Skill Growth + Learning Consistency + Goal Completion + Productivity − Burnout Risk" },
    { label: "Twin Sync", value: twinSync,      icon: <Activity size={16} />,    suffix: undefined, formula: "Behavior Alignment + Goal Alignment + Habit Consistency + Prediction Accuracy" },
    { label: "XP Points", value: totalPoints,   icon: <BrainCircuit size={16} />,suffix: " XP",     formula: "Tasks Completed + Daily Logs + Goal Progress + Consistency Bonus" },
    { label: "Streak",    value: streak,        icon: <Clock size={16} />,       suffix: "d",       formula: "Twin Intelligence = Behavior Patterns + Decision Quality + Habit Consistency + Adaptive Growth" },
  ];

  // Dynamic Trajectory & 12-Month Projections
  const targetSleep = profile?.averageSleep || 8.0;
  const targetSavingsRate = profile?.targetSavingsRate || 20;
  const monthlyIncome = profile?.monthlyIncome || 50000;
  const targetMonthlySavings = monthlyIncome * (targetSavingsRate / 100) || 10000;
  const targetStudy = profile?.hoursStudied || 4.0;

  // Real-time projections utilizing Twin Sync as consistency driver
  const projectedSleep = Number((currentSleep + (8.0 - currentSleep) * (twinSync / 100)).toFixed(1));
  const projectedMonthlySavings = currentMonthlySavings >= targetMonthlySavings 
    ? Math.round(currentMonthlySavings * (1 + (twinSync / 1000))) 
    : Math.round(currentMonthlySavings + (targetMonthlySavings - currentMonthlySavings) * (twinSync / 100));
  const projectedStudy = currentStudy >= targetStudy 
    ? Number((currentStudy * (1 + (twinSync / 1000))).toFixed(1))
    : Number((currentStudy + (targetStudy - currentStudy) * (twinSync / 100)).toFixed(1));

  const projectedHealthScore = Math.round(healthScore + (95 - healthScore) * (twinSync / 100));
  const projectedFinanceScore = Math.round(financeScore + (95 - financeScore) * (twinSync / 100));
  const projectedCareerScore = Math.round(careerScore + (98 - careerScore) * (twinSync / 100));

  const projectedCoreScore = Math.round((projectedHealthScore + projectedFinanceScore + projectedCareerScore) / 3);
  const deltaScore = projectedCoreScore - twinSync;

  const cvfMetrics = [
    { label: "Daily Sleep",      now: `${currentSleep}h`,                           future: `${projectedSleep}h`,      nowPct: Math.min(100, Math.round((currentSleep/9)*100)),    futurePct: Math.min(100, Math.round((projectedSleep/9)*100)), warn: currentSleep < 6.5 },
    { label: "Monthly Savings",  now: `₹${currentMonthlySavings.toLocaleString("en-IN")}`, future: `₹${projectedMonthlySavings.toLocaleString("en-IN")}`, nowPct: Math.min(100, Math.round((currentMonthlySavings/(targetMonthlySavings || 1))*100)), futurePct: Math.min(100, Math.round((projectedMonthlySavings/(targetMonthlySavings || 1))*100)), warn: false },
    { label: "Study Hours/Day",  now: `${currentStudy}h`,                           future: `${projectedStudy}h`,      nowPct: Math.min(100, Math.round((currentStudy/8)*100)),     futurePct: Math.min(100, Math.round((projectedStudy/8)*100)), warn: false },
    { label: "Health Score",     now: `${healthScore}`,                             future: `${projectedHealthScore}`,        nowPct: healthScore,  futurePct: projectedHealthScore, warn: healthScore < 60 },
    { label: "Career Score",     now: `${careerScore}`,                             future: `${projectedCareerScore}`,        nowPct: careerScore,  futurePct: projectedCareerScore, warn: careerScore < 60 },
  ];

  /* overall progress % across all metrics */
  const overallProgress = Math.round(cvfMetrics.reduce((a, m) => a + m.nowPct, 0) / cvfMetrics.length);

  return (
    <div style={{ background: "#ffffff", color: "#111111", fontFamily: '"DM Sans","Inter",-apple-system,sans-serif', overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.09) 50%, rgba(0,0,0,0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          display: inline-block;
          height: 1em;
        }

        /* ── NAV ── */
        .nav-wrapper { position: fixed; top: 0; left: 0; width: 100%; z-index: 1000; transition: all 0.3s ease; background: rgba(255,255,255,0); }
        .nav-wrapper.scrolled { background: #ffffff; box-shadow: 0 1px 24px rgba(0,0,0,0.07); border-bottom: 1px solid #eeeeee; }
        .nav-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; height: 72px; padding: 0 2rem; }
        .logo { font-family: 'DM Sans', sans-serif; font-size: 1.75rem; font-weight: 300; color: #ffffff; text-decoration: none; letter-spacing: 0.22em; text-transform: uppercase; transition: color 0.3s ease; }
        .logo strong { font-weight: 800; letter-spacing: 0.1em; }
        .nav-wrapper.scrolled .logo { color: #0055EE; }
        .nav-links-desktop { display: flex; align-items: center; gap: 6px; }
        .nav-link-item { font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 500; color: rgba(255,255,255,0.85); text-decoration: none; padding: 8px 16px; border-radius: 9999px; transition: all 0.2s ease; letter-spacing: 0.02em; }
        .nav-wrapper.scrolled .nav-link-item { color: #555; }
        .nav-link-item:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .nav-wrapper.scrolled .nav-link-item:hover { background: #f0f4ff; color: #0055EE; }
        .nav-link-active { background: rgba(255,255,255,0.18) !important; color: #fff !important; font-weight: 600; }
        .nav-wrapper.scrolled .nav-link-active { background: #0055EE !important; color: #fff !important; }
        .hamburger-btn { display: none; flex-direction: column; gap: 5px; cursor: pointer; padding: 8px; border: 1.5px solid rgba(255,255,255,0.3); border-radius: 10px; background: rgba(255,255,255,0.08); transition: all 0.2s; }
        .nav-wrapper.scrolled .hamburger-btn { border-color: #e0e0e0; background: #f5f5f5; }
        .hamburger-btn span { display: block; width: 22px; height: 2px; background: #fff; border-radius: 2px; }
        .nav-wrapper.scrolled .hamburger-btn span { background: #333; }
        .mobile-menu { display: none; flex-direction: column; gap: 6px; position: absolute; top: 76px; right: 20px; width: 230px; padding: 14px; border-radius: 18px; background: rgba(255,255,255,0.96); backdrop-filter: blur(20px); border: 1px solid #e8ebf4; box-shadow: 0 12px 40px rgba(0,68,220,0.12); }
        .mobile-menu.open { display: flex; }
        .mobile-nav-link { font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 500; color: #333; text-decoration: none; padding: 11px 16px; border-radius: 12px; transition: all 0.18s; }
        .mobile-nav-link:hover { background: #f0f4ff; color: #0055EE; }

        /* ── HERO ── */
        .dash-hero { background: linear-gradient(140deg, #0044DD 0%, #0066FF 55%, #3322EE 100%); padding: 130px 2rem 80px; position: relative; overflow: hidden; }
        .hero-grid-overlay { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 60px 60px; }
        .hero-inner { max-width: 1100px; margin: 0 auto; position: relative; z-index: 2; text-align: center; }
        .hero-pill { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.22); border-radius: 9999px; padding: 7px 18px; font-family: 'Inter', sans-serif; font-size: 0.78rem; font-weight: 600; color: rgba(255,255,255,0.85); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 22px; }
        .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 10px rgba(34,197,94,0.7); animation: pulse 2s infinite; flex-shrink: 0; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.3)} }
        .dash-greeting { font-family: 'DM Sans', sans-serif; font-size: clamp(2.2rem, 5vw, 3.8rem); font-weight: 800; color: #fff; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 10px; transition: opacity 0.5s; }
        .dash-cursor { display: inline-block; width: 3px; height: 0.82em; background: #fff; margin-left: 4px; vertical-align: middle; animation: blink 1s step-end infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .dash-domains { font-family: 'Inter', sans-serif; font-size: 1rem; color: rgba(255,255,255,0.75); font-weight: 400; margin-bottom: 20px; letter-spacing: 0.04em; }
        .dash-meta { display: flex; gap: 18px; flex-wrap: wrap; align-items: center; justify-content: center; font-family: 'Inter', sans-serif; font-size: 0.82rem; color: rgba(255,255,255,0.7); }

        /* ── LAYOUT ── */
        .section-wrap { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }
        .section-header { display: flex; align-items: center; gap: 16px; margin: 56px 0 28px; }
        .section-tag { font-family: 'Inter', sans-serif; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: #0055EE; padding: 5px 12px; border: 1.5px solid #d0dfff; border-radius: 9999px; background: #f0f4ff; white-space: nowrap; }
        .section-line { flex: 1; height: 1px; background: #e8ebf4; }
        .sync-btn { display: inline-flex; align-items: center; gap: 7px; font-family: 'Inter', sans-serif; font-size: 0.75rem; font-weight: 700; color: #0055EE; background: #f0f4ff; border: 1.5px solid #d0dfff; border-radius: 9999px; padding: 7px 16px; cursor: pointer; transition: all 0.2s; letter-spacing: 0.04em; text-transform: uppercase; }
        .sync-btn:hover { background: #0055EE; color: #fff; border-color: #0055EE; }
        .sync-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .spin { animation: rotate 1s linear infinite; }
        @keyframes rotate { to { transform: rotate(360deg); } }

        /* ── SCORE CARDS ── */
        .scores-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .circle-card { background: #ffffff; border: 1px solid #e8ebf4; border-radius: 24px; padding: 24px; display: flex; flex-direction: column; align-items: stretch; gap: 20px; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; box-shadow: 0 4px 18px rgba(0,68,220,0.05); min-height: 380px; }
        .circle-card:hover { transform: translateY(-6px); box-shadow: 0 14px 36px rgba(0,68,220,0.12); border-color: #c0d0f8; }
        .cc-top { display: flex; align-items: center; justify-content: center; }
        .cc-icon-label { display: flex; align-items: center; gap: 8px; }
        .cc-icon { display: flex; align-items: center; transform: scale(1.15); }
        .cc-label-text { font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 700; color: #111; letter-spacing: -0.01em; }
        .circle-wrap { position: relative; width: 130px; height: 130px; display: flex; align-items: center; justify-content: center; align-self: center; }
        .circle-wrap svg { position: absolute; inset: 0; }
        .circle-center { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; line-height: 1; }
        .circle-num { font-family: 'DM Sans', sans-serif; font-size: 1.85rem; font-weight: 800; letter-spacing: -0.04em; }
        .circle-denom { font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #9ca3af; font-weight: 500; margin-top: 2px; }
        .cc-bottom-section { display: flex; flex-direction: column; gap: 12px; border-top: 1px solid #f0f2f8; padding-top: 16px; }
        .cc-status-pill { font-family: 'Inter', sans-serif; font-size: 0.72rem; font-weight: 700; padding: 5px 12px; border-radius: 9999px; white-space: nowrap; letter-spacing: 0.02em; align-self: flex-start; }
        .cc-formula-text { font-family: 'Inter', sans-serif; font-size: 0.78rem; line-height: 1.6; color: #71717a; font-style: italic; font-weight: 500; }

        /* ════════════════════════════════════════════
           REDESIGNED CVF CARD
        ════════════════════════════════════════════ */

        /* outer wrapper */
        .cvf-card { background: #ffffff; border: 1px solid #e8ebf4; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,68,220,0.06); margin-bottom: 56px; }

        /* ── hero banner ── */
        .cvf-hero-banner {
          background: linear-gradient(135deg, #0044DD 0%, #0066FF 55%, #3322EE 100%);
          padding: 36px 40px 32px;
          position: relative;
          overflow: hidden;
        }
        .cvf-hero-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }
        /* decorative blur blobs */
        .cvf-hero-banner::after {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 260px; height: 260px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .cvf-hero-inner {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 32px;
          align-items: center;
        }

        /* left text block */
        .cvf-hero-left {}
        .cvf-hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 9999px;
          padding: 5px 14px;
          font-family: 'Inter', sans-serif;
          font-size: 0.68rem;
          font-weight: 700;
          color: rgba(255,255,255,0.9);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }
        .cvf-hero-title {
          font-family: 'DM Sans', sans-serif;
          font-size: clamp(1.6rem, 3vw, 2.1rem);
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin-bottom: 10px;
        }
        .cvf-hero-sub {
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.7);
          font-weight: 400;
          line-height: 1.5;
          margin-bottom: 24px;
          max-width: 460px;
        }

        /* stat pills row */
        .cvf-pill-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .cvf-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.22);
          border-radius: 12px;
          padding: 9px 16px;
        }
        .cvf-pill-val {
          font-family: 'DM Sans', sans-serif;
          font-size: 1.25rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1;
        }
        .cvf-pill-lbl {
          font-family: 'Inter', sans-serif;
          font-size: 0.62rem;
          font-weight: 700;
          color: rgba(255,255,255,0.6);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          line-height: 1.3;
        }
        .cvf-pill-divider { width: 1px; height: 24px; background: rgba(255,255,255,0.2); }

        /* right ring block — FIXED: larger container, text centred properly */
        .cvf-hero-ring-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .cvf-ring-container {
          position: relative;
          width: 148px;
          height: 148px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cvf-ring-container svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
          animation: breathe 5s ease-in-out infinite;
        }
        @keyframes breathe { 0%,100%{transform:rotate(-90deg) scale(1)} 50%{transform:rotate(-90deg) scale(1.03)} }
        /* inner content — sits on top of SVG with z-index */
        .cvf-ring-inner {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .cvf-ring-pct {
          font-family: 'DM Sans', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1;
          letter-spacing: -0.04em;
        }
        .cvf-ring-label {
          font-family: 'Inter', sans-serif;
          font-size: 0.6rem;
          font-weight: 700;
          color: rgba(255,255,255,0.65);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-top: 4px;
        }
        .cvf-ring-caption {
          font-family: 'Inter', sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          color: rgba(255,255,255,0.55);
          text-align: center;
          letter-spacing: 0.04em;
        }

        /* ── overall progress bar strip (below hero) ── */
        .cvf-progress-strip {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 16px 40px;
          background: #f8faff;
          border-bottom: 1px solid #e8ebf4;
        }
        .cvf-progress-strip-label {
          font-family: 'Inter', sans-serif;
          font-size: 0.72rem;
          font-weight: 700;
          color: #7788aa;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          white-space: nowrap;
        }
        .cvf-progress-track {
          flex: 1;
          height: 8px;
          background: #e8ebf4;
          border-radius: 9999px;
          overflow: hidden;
        }
        .cvf-progress-fill {
          height: 100%;
          border-radius: 9999px;
          background: linear-gradient(90deg, #0055EE, #3322EE);
          transition: width 1.4s cubic-bezier(0.16,1,0.3,1);
        }
        .cvf-progress-pct {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 800;
          color: #0055EE;
          white-space: nowrap;
        }

        /* ── outcome strip ── */
        .cvf-outcome-strip {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin: 24px 40px 0;
          padding: 18px 22px;
          background: linear-gradient(135deg, #f0f4ff 0%, #eef2ff 100%);
          border: 1px solid #dbe4ff;
          border-radius: 16px;
        }
        .cvf-outcome-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, #0055EE, #3322EE);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .cvf-outcome-body {}
        .cvf-outcome-eyebrow {
          font-family: 'Inter', sans-serif;
          font-size: 0.62rem;
          font-weight: 800;
          color: #0055EE;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          margin-bottom: 4px;
        }
        .cvf-outcome-text {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.92rem;
          font-weight: 600;
          color: #1a2a5e;
          line-height: 1.5;
        }

        /* ── comparison grid ── */
        .cvf-compare {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding: 24px 40px 28px;
        }

        .cvf-self-card {
          background: #fff;
          border: 1px solid #e8ebf4;
          border-radius: 18px;
          overflow: hidden;
        }

        /* card header */
        .cvf-self-card-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 20px;
          border-bottom: 1px solid #f0f2f8;
        }
        .cvf-self-dot {
          width: 9px; height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .cvf-self-title {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #555;
        }
        .cvf-self-badge {
          margin-left: auto;
          font-family: 'Inter', sans-serif;
          font-size: 0.62rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* rows */
        .cvf-self-metrics { display: flex; flex-direction: column; }
        .cvf-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 13px 20px;
          border-bottom: 1px solid #f8fafc;
          transition: background 0.15s;
        }
        .cvf-row:last-child { border-bottom: none; }
        .cvf-row:hover { background: #fafbff; }
        .cvf-row-label {
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
          color: #6b7280;
          min-width: 115px;
        }
        .cvf-row-bar-wrap { flex: 1; }
        .cvf-row-bar-track {
          height: 6px;
          background: #f1f5f9;
          border-radius: 3px;
          overflow: hidden;
        }
        .cvf-row-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 1.3s cubic-bezier(0.16,1,0.3,1);
        }
        .cvf-row-val {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 800;
          min-width: 72px;
          text-align: right;
        }

        /* ── mission footer ── */
        .cvf-mission-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 40px 28px;
          background: #f8faff;
          border: 1px solid #e8ebf4;
          border-radius: 12px;
          padding: 13px 18px;
        }
        .cvf-mission-text {
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          color: #444;
          line-height: 1.5;
        }

        /* ── LOWER GRID (projection chart + insights) ── */
        .lower-grid { display: grid; grid-template-columns: 1fr 380px; gap: 20px; margin-bottom: 56px; }
        .proj-card { background: #fff; border: 1px solid #e8ebf4; border-radius: 20px; padding: 28px; box-shadow: 0 2px 12px rgba(0,68,220,0.04); }
        .proj-title { font-family: 'DM Sans', sans-serif; font-size: 1.3rem; font-weight: 800; color: #111; letter-spacing: -0.02em; margin-bottom: 4px; }
        .proj-sub { font-family: 'Inter', sans-serif; font-size: 0.8rem; color: #9ca3af; font-weight: 500; margin-bottom: 22px; }
        .proj-trajectory { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
        .proj-traj-row { display: flex; justify-content: space-between; align-items: center; font-family: 'Inter', sans-serif; font-size: 0.82rem; font-weight: 600; color: #7788aa; }
        .proj-traj-val { font-weight: 700; padding: 4px 10px; border-radius: 8px; font-size: 0.76rem; }
        .proj-bar-track { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; margin-top: 4px; }
        .proj-bar-fill { height: 100%; border-radius: 3px; }
        .proj-stats { display: flex; gap: 32px; border-top: 1px solid #f0f2f8; padding-top: 18px; margin-top: 10px; align-items: center; }
        .proj-stat-label { font-family: 'Inter', sans-serif; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 4px; }
        .proj-stat-val { font-family: 'DM Sans', sans-serif; font-size: 1.1rem; font-weight: 800; color: #111; }
        .proj-open-btn { display: inline-flex; align-items: center; gap: 6px; font-family: 'Inter', sans-serif; font-size: 0.8rem; font-weight: 600; color: #0055EE; text-decoration: none; padding: 9px 18px; border: 1.5px solid #d0dfff; border-radius: 9999px; background: #f0f4ff; transition: all 0.2s; }
        .proj-open-btn:hover { background: #0055EE; color: #fff; border-color: #0055EE; }
        .insights-col { display: flex; flex-direction: column; gap: 14px; }
        .insights-col-label { font-family: 'Inter', sans-serif; font-size: 0.78rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.14em; margin-bottom: 2px; }
        .insight-card { background: #fff; border: 1px solid #e8ebf4; border-left: 4px solid #0055EE; border-radius: 16px; padding: 18px 20px; box-shadow: 0 2px 8px rgba(0,68,220,0.04); transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
        .insight-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,68,220,0.1); }
        .insight-tag-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .insight-tag { font-family: 'Inter', sans-serif; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #0055EE; }
        .insight-text { font-family: 'Inter', sans-serif; font-size: 0.88rem; line-height: 1.65; color: #5a5a6a; }

        /* ── QUICK ACTIONS ── */
        .actions-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 64px; }
        .action-card { background: #fff; border: 1px solid #e8ebf4; border-radius: 20px; padding: 28px 24px; text-decoration: none; color: inherit; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; box-shadow: 0 2px 12px rgba(0,68,220,0.04); display: block; }
        .action-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,68,220,0.12); border-color: #c0d0f8; }
        .action-card-num { font-family: 'DM Sans', sans-serif; font-size: 3rem; font-weight: 800; color: #0055EE; opacity: 0.1; line-height: 1; margin-bottom: -10px; }
        .action-card-title { font-family: 'DM Sans', sans-serif; font-size: 1.3rem; font-weight: 800; color: #111; letter-spacing: -0.02em; margin-bottom: 10px; }
        .action-card-desc { font-family: 'Inter', sans-serif; font-size: 0.88rem; line-height: 1.7; color: #7788aa; font-weight: 400; }
        .action-arrow { display: inline-flex; align-items: center; gap: 4px; font-family: 'Inter', sans-serif; font-size: 0.78rem; font-weight: 600; color: #0055EE; margin-top: 14px; }

        /* ── GAMIFICATION & ACTIVE GOALS INTEGRATION ── */
        .active-goals-panel {
          display: flex;
          flex-direction: column;
        }

        @keyframes float-xp {
          0% { opacity: 0; transform: translateY(4px) scale(0.8); }
          15% { opacity: 1; transform: translateY(0) scale(1); }
          85% { opacity: 1; transform: translateY(-20px); }
          100% { opacity: 0; transform: translateY(-28px) scale(0.85); }
        }

        .xp-float {
          position: absolute;
          right: 0;
          top: -4px;
          font-size: 0.71rem;
          font-weight: 800;
          color: #16a34a;
          animation: float-xp 1.4s ease forwards;
          pointer-events: none;
          white-space: nowrap;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 1024px) {
          .scores-grid { grid-template-columns: repeat(2,1fr); gap: 18px; }
          .cvf-compare { grid-template-columns: 1fr; }
          .cvf-hero-inner { grid-template-columns: 1fr; }
          .cvf-hero-ring-block { flex-direction: row; justify-content: flex-start; }
          .lower-grid { grid-template-columns: 1fr; }
          .actions-grid { grid-template-columns: repeat(2,1fr); }
          .nav-links-desktop { display: none; }
          .hamburger-btn { display: flex; }
        }
        @media (max-width: 768px) {
          .cvf-hero-banner { padding: 28px 22px 24px; }
          .cvf-compare { padding: 20px 18px 24px; }
          .cvf-outcome-strip { margin: 20px 18px 0; }
          .cvf-progress-strip { padding: 14px 22px; }
          .cvf-mission-footer { margin: 0 18px 22px; }
          .cvf-pill-row { gap: 8px; }
        }
        @media (max-width: 640px) {
          .scores-grid { grid-template-columns: 1fr; }
          .actions-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <div className={`nav-wrapper${scrolled ? " scrolled" : ""}`}>
        <div className="nav-container">
          <Link href="/" className="logo">syn<strong>tra</strong></Link>
          <nav className="nav-links-desktop">
            {navLinks.map(l => (
              <Link key={l.href} href={l.href} className={`nav-link-item${l.href === "/dashboard" ? " nav-link-active" : ""}`}>{l.label}</Link>
            ))}
          </nav>
          <button className="hamburger-btn" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
        <div className={`mobile-menu${menuOpen ? " open" : ""}`}>
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} className="mobile-nav-link" onClick={() => setMenuOpen(false)}>{l.label}</Link>
          ))}
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="dash-hero">
        <div className="hero-grid-overlay" />
        <div className="hero-inner">
          <div className="hero-pill"><span className="live-dot" />Syntra AI — Personal Dashboard</div>
          <TypewriterGreeting name={name} />
          <p className="dash-domains">Health · Finance · Career · Growth</p>
          <div className="dash-meta">
            <span className="live-dot" />
            <span>AI Active</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <Clock size={13} style={{ opacity: 0.6 }} />
            <span>Last sync: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </section>

      <div className="section-wrap">

        {/* ── SCORES ── */}
        <div className="section-header">
          <span className="section-tag">Your Scores</span>
          <div className="section-line" />
          <button className="sync-btn" onClick={fetchAll} disabled={syncing}>
            <RefreshCw size={11} className={syncing ? "spin" : ""} />
            {syncing ? "Syncing…" : "Sync Now"}
          </button>
        </div>
        <div className="scores-grid">
          {scores.map(s => (
            <CircleScore key={s.label} value={s.value} label={s.label} icon={s.icon} suffix={s.suffix} formulaText={s.formula} />
          ))}
        </div>

        {/* ── CURRENT SELF VS FUTURE SELF ── */}
        <div className="section-header">
          <span className="section-tag">Self Trajectory</span>
          <div className="section-line" />
        </div>

        <div className="cvf-card">

          {/* ══ HERO BANNER ══ */}
          <div className="cvf-hero-banner">
            <div className="cvf-hero-inner">

              {/* LEFT — title + pills */}
              <div className="cvf-hero-left">
                <div className="cvf-hero-eyebrow">
                  <span className="live-dot" style={{ width: 6, height: 6 }} />
                  AI-Powered Projection
                </div>
                <div className="cvf-hero-title">Current Self vs Future Self</div>
                <div className="cvf-hero-sub">AI-driven 12-month projection based on your behavioural telemetry</div>

                <div className="cvf-pill-row">
                  <div className="cvf-pill">
                    <div>
                      <div className="cvf-pill-val" style={{ color: "#60aaff" }}>{daysRemaining}</div>
                      <div className="cvf-pill-lbl">Days Left</div>
                    </div>
                  </div>
                  <div className="cvf-pill">
                    <div>
                      <div className="cvf-pill-val" style={{ color: "#4ade80" }}>
                        {aiLoading ? (
                          <span className="shimmer-text" style={{ width: 34, height: 20, verticalAlign: "middle" }} />
                        ) : (
                          `${aiData?.confidence || 84}%`
                        )}
                      </div>
                      <div className="cvf-pill-lbl">Confidence</div>
                    </div>
                  </div>
                  <div className="cvf-pill">
                    <div>
                      <div className="cvf-pill-val" style={{ color: "#fbbf24" }}>
                        {deltaScore >= 0 ? `+${deltaScore}` : deltaScore}
                      </div>
                      <div className="cvf-pill-lbl">Delta Score</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT — readiness ring (FIXED: larger + text centred) */}
              <div className="cvf-hero-ring-block">
                <div className="cvf-ring-container">
                  {/* SVG ring */}
                  <svg viewBox="0 0 148 148" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#60aaff" />
                        <stop offset="100%" stopColor="#ffffff" />
                      </linearGradient>
                    </defs>
                    {/* track */}
                    <circle cx="74" cy="74" r="60" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
                    {/* fill */}
                    <circle
                      cx="74" cy="74" r="60"
                      fill="none"
                      stroke="url(#ringGrad)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${(twinSync / 100) * 2 * Math.PI * 60} ${2 * Math.PI * 60}`}
                      style={{ filter: "drop-shadow(0 0 8px rgba(96,170,255,0.5))" }}
                    />
                  </svg>
                  {/* centred text — rendered as a flex child inside the container, NOT inside SVG */}
                  <div className="cvf-ring-inner">
                    <span className="cvf-ring-pct">{twinSync}%</span>
                    <span className="cvf-ring-label">Readiness</span>
                  </div>
                </div>
                <div className="cvf-ring-caption">Twin Sync Index</div>
              </div>

            </div>
          </div>

          {/* ══ PROGRESS BAR STRIP ══ */}
          <div className="cvf-progress-strip">
            <span className="cvf-progress-strip-label">Overall Progress</span>
            <div className="cvf-progress-track">
              <div className="cvf-progress-fill" style={{ width: `${overallProgress}%` }} />
            </div>
            <span className="cvf-progress-pct">{overallProgress}%</span>
          </div>

          {/* ══ OUTCOME STRIP ══ */}
          <div className="cvf-outcome-strip">
            <div className="cvf-outcome-icon">
              <Zap size={16} color="#fff" />
            </div>
            <div className="cvf-outcome-body" style={{ width: "100%" }}>
              <div className="cvf-outcome-eyebrow">Projected Outcome</div>
              <div className="cvf-outcome-text" style={{ width: "100%" }}>
                {aiLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", marginTop: 4 }}>
                    <span className="shimmer-text" style={{ width: "95%", height: 14 }} />
                    <span className="shimmer-text" style={{ width: "70%", height: 14 }} />
                  </div>
                ) : (
                  aiData?.twinPrediction || "Career Acceleration Likely in 4–6 months. Consistently logging your sleep and spending this week will significantly improve prediction accuracy."
                )}
              </div>
            </div>
          </div>

          {/* ══ COMPARISON CARDS ══ */}
          <div className="cvf-compare">

            {/* TODAY */}
            <div className="cvf-self-card">
              <div className="cvf-self-card-head">
                <div className="cvf-self-dot" style={{ background: "#ef4444", boxShadow: "0 0 6px rgba(239,68,68,0.5)" }} />
                <span className="cvf-self-title">Today</span>
              </div>
              <div className="cvf-self-metrics">
                {cvfMetrics.map((m, i) => (
                  <div key={i} className="cvf-row">
                    <span className="cvf-row-label">{m.label}</span>
                    <div className="cvf-row-bar-wrap">
                      <div className="cvf-row-bar-track">
                        <div className="cvf-row-bar-fill" style={{ width: `${m.nowPct}%`, background: m.warn ? "#ef4444" : "#0055EE" }} />
                      </div>
                    </div>
                    <span className="cvf-row-val" style={{ color: m.warn ? "#ef4444" : "#111" }}>{m.now}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 12-MONTH PROJECTION */}
            <div className="cvf-self-card">
              <div className="cvf-self-card-head">
                <div className="cvf-self-dot" style={{ background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.5)" }} />
                <span className="cvf-self-title">12-Month Projection</span>
                <span className="cvf-self-badge" style={{ background: "#f0fdf4", color: "#15803d" }}>AI Projected</span>
              </div>
              <div className="cvf-self-metrics">
                {cvfMetrics.map((m, i) => (
                  <div key={i} className="cvf-row">
                    <span className="cvf-row-label">{m.label}</span>
                    <div className="cvf-row-bar-wrap">
                      <div className="cvf-row-bar-track">
                        <div className="cvf-row-bar-fill" style={{ width: `${m.futurePct}%`, background: "#22c55e" }} />
                      </div>
                    </div>
                    <span className="cvf-row-val" style={{ color: "#22c55e" }}>{m.future}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ANATOMICAL TWIN DIAGNOSTICS */}
            <div className="cvf-self-card" style={{ borderColor: bioAge > chronoAge ? "#ef4444" : "#22c55e" }}>
              <div className="cvf-self-card-head">
                <div className="cvf-self-dot" style={{ background: bioAge > chronoAge ? "#ef4444" : "#22c55e", boxShadow: `0 0 6px ${bioAge > chronoAge ? "rgba(239,68,68,0.5)" : "rgba(34,197,94,0.5)"}` }} />
                <span className="cvf-self-title">Anatomical Twin</span>
                <span className="cvf-self-badge" style={{ background: bioAge > chronoAge ? "#fee2e2" : "#f0fdf4", color: bioAge > chronoAge ? "#b91c1c" : "#15803d" }}>
                  {bioAge > chronoAge ? "Aging Accelerated" : "Optimal Speed"}
                </span>
              </div>
              <div className="cvf-self-metrics" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Chronological Age</div>
                    <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#111" }}>{chronoAge.toFixed(1)} <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>yrs</span></div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Biological Age</div>
                    <div style={{ fontSize: "1.45rem", fontWeight: 800, color: bioAge > chronoAge ? "#ef4444" : "#22c55e" }}>{bioAge.toFixed(1)} <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>yrs</span></div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1, background: "#f8fafc", padding: "10px", borderRadius: 12, border: "1px solid #e8ebf4" }}>
                    <div style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Recovery Score</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: recoveryScore > 70 ? "#22c55e" : "#f59e0b" }}>{recoveryScore}%</div>
                  </div>
                  <div style={{ flex: 1, background: "#f8fafc", padding: "10px", borderRadius: 12, border: "1px solid #e8ebf4" }}>
                    <div style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Fatigue Index</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: fatigueIndex > 60 ? "#ef4444" : "#22c55e" }}>{fatigueIndex}%</div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #f0f2f8", paddingTop: 12 }}>
                  <div style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>Telemetry Drivers:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {bioReasons.slice(0, 3).map((r, i) => (
                      <div key={i} style={{ fontSize: "0.74rem", color: bioAge > chronoAge ? "#b91c1c" : "#15803d", display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: bioAge > chronoAge ? "#ef4444" : "#22c55e", flexShrink: 0 }} />
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ══ MISSION FOOTER ══ */}
          <div className="cvf-mission-footer">
            <Sparkles size={15} style={{ color: "#3322EE", flexShrink: 0 }} />
            <span className="cvf-mission-text">{mission}</span>
          </div>

        </div>

        {/* ── ACTIVE FOCUS GOALS ── */}
        <div className="section-header">
          <span className="section-tag">Active Focus Goals</span>
          <div className="section-line" />
        </div>

        <div className="active-goals-panel" style={{ width: "100%", marginBottom: 56 }}>
          <div className="panel-title-block" style={{ marginBottom: 20 }}>
            <h2 className="panel-title" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1.3rem", fontWeight: 800, color: "#111" }}>Active Focus Goals</h2>
            <p className="panel-sub" style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#9ca3af", fontWeight: 500 }}>Complete milestones to level up your Neural Twin</p>
          </div>

          {goals.length === 0 ? (
            <div className="dash-goals-empty" style={{ textAlign: "center", padding: "40px 20px", border: "1.5px dashed #e8ebf4", borderRadius: 20, background: "#fff" }}>
              <Target size={28} style={{ color: "#9ca3af", marginBottom: 8, margin: "0 auto 10px" }} />
              <div className="dash-empty-title" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1rem", fontWeight: 800, color: "#111", marginBottom: 4 }}>No Active Goals</div>
              <p className="dash-empty-sub" style={{ fontSize: "0.82rem", color: "#7788aa", lineHeight: 1.5, marginBottom: 16 }}>Create a goal to start tracking progress and milestones.</p>
              <Link href="/goals" className="dash-goals-btn" style={{ display: "inline-flex", alignItems: "center", padding: "8px 16px", background: "#0055EE", color: "#fff", borderRadius: 10, textDecoration: "none", fontSize: "0.8rem", fontWeight: 700 }}>Set A Goal</Link>
            </div>
          ) : (
            <div className="dash-goals-stack" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {goals.slice(0, 3).map((g, index) => {
                const dc = DC[g.domain] || DC.health;
                const total = g.milestones?.length ?? 0;
                const done  = g.milestones?.filter(m => m.completed).length ?? 0;
                const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
                const isExpanded = expandedGoals[g._id || ""] ?? (index === 0);
                const p = PRIO[g.priority] || PRIO.medium;
                
                return (
                  <div key={g._id || index} className="dash-goal-card" style={{ background: "#ffffff", border: "1px solid #e8ebf4", borderRadius: 20, overflow: "hidden", display: "flex", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <div className="dash-goal-bar" style={{ width: 5, background: dc.color, flexShrink: 0 }} />
                    <div className="dash-goal-card-body" style={{ flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 11 }}>
                      <div className="dash-goal-header" style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setExpandedGoals(prev => ({ ...prev, [g._id || ""]: !isExpanded }))}>
                        <div className="dash-goal-domain-icon" style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: dc.bg, color: dc.color, flexShrink: 0 }}>{dc.icon}</div>
                        <div className="dash-goal-meta" style={{ flex: 1, minWidth: 0 }}>
                          <h3 className="dash-goal-title" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem", fontWeight: 800, color: "#111", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.title}</h3>
                          <div className="dash-goal-tags" style={{ display: "flex", gap: 4, marginTop: 4 }}>
                            <span className="tag" style={{ background: p.bg, color: p.color, fontSize: "0.62rem", fontWeight: 700, padding: "2px 6px", borderRadius: 9999 }}>{p.emoji} {p.label}</span>
                            <span className="tag tag-neutral" style={{ background: "#EEF2F8", color: "#64748B", fontSize: "0.62rem", fontWeight: 700, padding: "2px 6px", borderRadius: 9999 }}>{dc.label}</span>
                          </div>
                        </div>
                        
                        <div className="dash-goal-pct-block" style={{ textAlign: "right", marginRight: 8 }}>
                          <span className="dash-goal-pct-text" style={{ display: "block", fontSize: "0.95rem", fontWeight: 800, color: dc.color, lineHeight: 1 }}>{pct}%</span>
                          <span className="dash-goal-pct-sub" style={{ fontSize: "0.65rem", color: "#9ca3af", fontWeight: 500 }}>{done}/{total} steps</span>
                        </div>

                        <button className="dash-goal-chevron" style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center" }}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>

                      <div className="dash-goal-progress-bar" style={{ height: 4, background: "#EEF1F8", borderRadius: 9999, overflow: "hidden" }}>
                        <div className="dash-goal-progress-fill" style={{ height: "100%", width: `${pct}%`, background: dc.color, borderRadius: 9999, transition: "width 0.6s ease" }} />
                      </div>

                      {isExpanded && total > 0 && (
                        <div className="dash-goal-milestones" style={{ background: "#F5F8FC", border: "1px solid #E8EDF5", borderRadius: 12, padding: "11px 14px", display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                          {g.milestones?.map((m) => (
                            <div key={m._id} className="dash-ms-row" style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
                              <div
                                className={`dash-ms-checkbox ${m.completed ? "done" : ""}`}
                                style={{
                                  width: 18, height: 18, borderRadius: 5, border: m.completed ? `1px solid ${dc.color}` : "2.5px solid #BFC9D8",
                                  background: m.completed ? dc.color : "transparent",
                                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.18s"
                                }}
                                onClick={() => g._id && m._id && handleToggleMilestone(g._id, m._id, m.completed)}
                              >
                                {m.completed && <CheckCircle2 size={10} color="#fff" />}
                              </div>
                              <span className={`dash-ms-text ${m.completed ? "done" : ""}`} style={{ fontSize: "0.78rem", fontWeight: 500, color: m.completed ? "#8a9bb5" : "#0d1117", textDecoration: m.completed ? "line-through" : "none", flex: 1 }}>{m.text}</span>
                              {floatId === m._id && <span className="xp-float" style={{ position: "absolute", right: 0, top: -4, fontSize: "0.71rem", fontWeight: 800, color: "#16a34a", pointerEvents: "none", whiteSpace: "nowrap" }}>+100 XP 🎉</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Link href="/goals" className="dash-goals-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", fontWeight: 700, color: "#0055EE", textDecoration: "none" }}>Manage all goals <ChevronRight size={13} /></Link>
              </div>
            </div>
          )}
        </div>

        {/* ── PROJECTION & AI INSIGHTS ── */}
        <div className="section-header">
          <span className="section-tag">Projection & Insights</span>
          <div className="section-line" />
        </div>

        <div className="lower-grid">
          <div className="proj-card">
            <div className="proj-title">Future Trajectory</div>
            <div className="proj-sub">AI-powered projection based on your logs</div>

            <div className="proj-trajectory">
              {[
                { label: "Health Path", current: healthScore, target: projectedHealthScore, color: "#22c55e" },
                { label: "Finance Path", current: financeScore, target: projectedFinanceScore, color: "#0055EE" },
                { label: "Career Path",  current: careerScore, target: projectedCareerScore, color: "#3322EE" },
              ].map((t, i) => (
                <div key={i}>
                  <div className="proj-traj-row">
                    <span>{t.label}</span>
                    <span className="proj-traj-val" style={{ background: `${t.color}12`, color: t.color }}>{t.current} → {t.target}</span>
                  </div>
                  <div className="proj-bar-track">
                    <div className="proj-bar-fill" style={{ width: `${t.current}%`, background: `linear-gradient(90deg, ${t.color}88, ${t.color})` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="proj-stats">
              <div><div className="proj-stat-label">Confidence</div><div className="proj-stat-val">{aiData?.confidence || 84}%</div></div>
              <div><div className="proj-stat-label">Days Tracked</div><div className="proj-stat-val">{Math.max(12, logs.length * 3 + streak * 2 + 10)}</div></div>
              <div style={{ marginLeft: "auto" }}>
                <Link href="/simulator" className="proj-open-btn">Open Simulator <ChevronRight size={13} /></Link>
              </div>
            </div>
          </div>

          <div className="insights-col">
            <div className="insights-col-label">AI Insight Feed</div>
            {aiLoading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="insight-card">
                  <div className="insight-tag-row">
                    <span className="shimmer-text" style={{ width: 100, height: 12 }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    <span className="shimmer-text" style={{ width: "100%", height: 14 }} />
                    <span className="shimmer-text" style={{ width: "80%", height: 14 }} />
                  </div>
                </div>
              ))
            ) : (
              [
                { tag: "Twin Prediction", text: aiData?.twinPrediction || "Your career trajectory is projected to improve significantly with consistent study habits." },
                { tag: "Daily Reflection", text: aiData?.dailyReflection || "Your consistency over the past week is building strong long-term momentum." },
                { tag: "Daily Challenge", text: aiData?.dailyChallenge || "Log all three domains today to expand your Twin Sync calibration index." },
              ].map((ins, idx) => (
                <div key={idx} className="insight-card">
                  <div className="insight-tag-row">
                    <span className="insight-tag">{ins.tag}</span>
                    <ArrowUpRight size={14} style={{ color: "#9ca3af" }} />
                  </div>
                  <div className="insight-text">{ins.text}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div className="section-header">
          <span className="section-tag">Quick Actions</span>
          <div className="section-line" />
        </div>

        <div className="actions-grid">
          {[
            { href: "/ingestion", num: "01", title: "Data Ingestion",   desc: "Connect your health, finance, and career data sources to keep your twin up to date." },
            { href: "/goals",     num: "02", title: "Goals & Plans",    desc: "Set targets for health, money, and career — then let Syntra map out how to get there." },
            { href: "/insights",  num: "03", title: "Insights Feed",    desc: "See personalized findings and recommended actions across all areas of your life." },
          ].map(a => (
            <Link key={a.href} href={a.href} className="action-card">
              <div className="action-card-num">{a.num}</div>
              <div className="action-card-title">{a.title}</div>
              <div className="action-card-desc">{a.desc}</div>
              <div className="action-arrow">Explore <ChevronRight size={13} /></div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}