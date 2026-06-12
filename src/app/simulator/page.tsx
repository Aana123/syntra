"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  HeartPulse,
  Loader2,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  BrainCircuit,
  Zap,
  Cpu,
  ArrowLeft,
  BarChart3,
  FlaskConical,
  SlidersHorizontal,
  Clock,
  ChevronRight,
  TrendingDown,
  BookOpen,
  Play,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ─── TYPES ──────────────────────────────────────────────────────── */
type Domain = "health" | "finance" | "career";
type RiskLevel = "low" | "medium" | "high" | "critical";
type TradeOff = {
  domain: Domain;
  impact: "positive" | "negative" | "neutral";
  magnitude: number;
  explanation: string;
};
type TimelinePoint = { week: string; projection: string };
type AIAnalysis = {
  scenarioTitle: string;
  primaryOutcome: string;
  tradeOffs: TradeOff[];
  timelineProjection: TimelinePoint[];
  riskLevel: RiskLevel;
  recommendedPath: string;
  confidence: number;
};
type SimulationResponse = {
  success: boolean;
  simulation: any;
  aiAnalysis: AIAnalysis;
  goal?: { title: string; targetDate?: string; priority?: string } | null;
};

/* ─── COPY ───────────────────────────────────────────────────────── */
const TYPEWRITER_PHRASES = [
  "What Would Happen If…",
  "Explore Your Scenarios",
  "See Your Future, Today",
  "Model Better Decisions",
];

const DOMAIN_COPY = {
  health:  { label: "Health",  color: "#16a34a", bg: "rgba(22,163,74,0.07)",  border: "rgba(22,163,74,0.18)",  chartColor: "#16a34a" },
  finance: { label: "Finance", color: "#f59e0b", bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.18)", chartColor: "#f59e0b" },
  career:  { label: "Career",  color: "#0047D4", bg: "rgba(0,71,212,0.07)",   border: "rgba(0,71,212,0.18)",   chartColor: "#0047D4" },
};

const RISK_CONFIG = {
  low:      { bg: "#f0fdf4", color: "#16a34a", border: "rgba(22,163,74,0.2)",  label: "Low Risk"      },
  medium:   { bg: "#fffbeb", color: "#d97706", border: "#fde68a",              label: "Medium Risk"   },
  high:     { bg: "#fef2f2", color: "#dc2626", border: "#fecaca",              label: "High Risk"     },
  critical: { bg: "#fef2f2", color: "#7f1d1d", border: "#fca5a5",              label: "Critical Risk" },
} as const;

const BRAND = "#0047D4";

const NAV_LINKS = [
  { href: "/dashboard",          label: "Dashboard" },
  { href: "/ingestion",          label: "Ingestion" },
  { href: "/goals",              label: "Goals" },
  { href: "/simulator",          label: "Simulator" },
  { href: "/insights",           label: "Insights" },
  { href: "/profile",            label: "Profile" },
];

/* ─── ANIMATED COUNTER ───────────────────────────────────────────── */
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 900, step = 16;
    const inc = (value - start) / (duration / step);
    const t = setInterval(() => {
      start += inc;
      if (start >= value) { setDisplay(value); clearInterval(t); }
      else setDisplay(Math.round(start));
    }, step);
    return () => clearInterval(t);
  }, [value]);
  return <>{display}{suffix}</>;
}

/* ─── TYPEWRITER ─────────────────────────────────────────────────── */
function Typewriter({ phrases }: { phrases: string[] }) {
  const [display, setDisplay] = useState("");
  const [pi, setPi] = useState(0);
  useEffect(() => {
    let ci = 0, deleting = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = phrases[pi];
      if (!deleting) {
        setDisplay(full.slice(0, ci + 1)); ci++;
        if (ci === full.length) { deleting = true; t = setTimeout(tick, 2600); }
        else t = setTimeout(tick, 72);
      } else {
        setDisplay(full.slice(0, ci - 1)); ci--;
        if (ci === 0) { deleting = false; setPi(p => (p + 1) % phrases.length); t = setTimeout(tick, 380); }
        else t = setTimeout(tick, 36);
      }
    };
    t = setTimeout(tick, 300);
    return () => clearTimeout(t);
  }, [pi]);
  return (
    <span>
      {display}
      <span style={{
        display: "inline-block", width: "2px", height: "0.9em",
        background: BRAND, marginLeft: "3px", verticalAlign: "text-bottom",
        borderRadius: "1px", animation: "tw-blink 1s step-end infinite",
      }}/>
    </span>
  );
}

/* ─── CUSTOM TOOLTIP ─────────────────────────────────────────────── */
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #E4E9F4",
      borderRadius: 12, padding: "12px 14px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.07)",
      fontSize: "0.8rem",
    }}>
      <div style={{ fontWeight: 800, color: "#0D1117", marginBottom: 6, fontSize: "0.73rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {payload[0]?.payload?.month}
      </div>
      {payload.map((item: any) => (
        <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.stroke }}/>
          <span style={{ color: "#52637A", fontWeight: 600 }}>{item.name.charAt(0).toUpperCase() + item.name.slice(1)}:</span>
          <span style={{ fontWeight: 800, color: "#0D1117" }}>{item.value}/100</span>
        </div>
      ))}
    </div>
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
            <Link
              key={l.href}
              href={l.href}
              className={`top-nav-link${l.href === "/simulator" ? " top-nav-link-active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <button
          className="top-nav-hamburger"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Menu"
        >
          <span /><span /><span />
        </button>
      </div>
      <div className={`top-nav-mobile-menu${menuOpen ? " open" : ""}`}>
        {NAV_LINKS.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`top-nav-mobile-link${l.href === "/simulator" ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────────── */
function SimulatorPage() {
  const [mounted, setMounted]       = useState(false);
  const [domain, setDomain]         = useState<Domain>("career");
  const [activeVar, setActiveVar]   = useState("study_hours");
  const [baselines, setBaselines]   = useState<any>(null);
  const [userScores, setUserScores] = useState({ health: 60, finance: 60, career: 60 });
  const [userGoals, setUserGoals]   = useState<any[]>([]);
  const [baseLoading, setBaseLoading] = useState(true);

  // sliders
  const [sleepHours, setSleepHours]         = useState(7.5);
  const [workoutFreq, setWorkoutFreq]       = useState(3);
  const [studyHours, setStudyHours]         = useState(4);
  const [focusRating, setFocusRating]       = useState(7);
  const [savingsRate, setSavingsRate]       = useState(20);
  const [spendStyle, setSpendStyle]         = useState(3);

  // custom financial simulator states
  const [diningRedirectionAmount, setDiningRedirectionAmount] = useState(5000);
  const [diningCagr, setDiningCagr] = useState(12);
  const [ccBalance, setCcBalance] = useState(48000);
  const [ccApr, setCcApr] = useState(36);
  const [ccAmortMonths, setCcAmortMonths] = useState(12);
  const [sipDelayAmount, setSipDelayAmount] = useState(10000);
  const [sipDelayYears, setSipDelayYears] = useState(2);
  const [sipDelayTenure, setSipDelayTenure] = useState(15);
  const [sipDelayCagr, setSipDelayCagr] = useState(12);
  const [mortgageOutstanding, setMortgageOutstanding] = useState(4000000);
  const [mortgageRate, setMortgageRate] = useState(8.5);
  const [mortgageTenure, setMortgageTenure] = useState(20);
  const [mortgagePrepayment, setMortgagePrepayment] = useState(200000);

  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState("");
  const [result, setResult]         = useState<SimulationResponse | null>(null);
  const [checkedActions, setCheckedActions] = useState<string[]>([]);

  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
    fetch("/api/simulate", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.baselines) {
          setBaselines(data.baselines);
          setUserScores(data.scores);
          setUserGoals(data.goals || []);

          // Defaults from baselines
          const initialSleep = data.baselines.sleep_hours || 7.5;
          const initialWorkout = data.baselines.workout_frequency || 3;
          const initialStudy = data.baselines.study_hours || 4;
          const initialFocus = data.baselines.focus_rating || 7;
          const initialSavings = data.baselines.savings_rate || 20;

          // Parse params if available
          let finalDomain = domain;
          let finalActiveVar = activeVar;
          let finalSleep = initialSleep;
          let finalWorkout = initialWorkout;
          let finalStudy = initialStudy;
          let finalFocus = initialFocus;
          let finalSavings = initialSavings;

          const paramDomain = searchParams.get("domain") as Domain | null;
          const paramVariable = searchParams.get("variable");
          const paramVal = searchParams.get("val");

          if (paramDomain && ["career", "health", "finance"].includes(paramDomain)) {
            finalDomain = paramDomain;
            if (paramVariable) {
              finalActiveVar = paramVariable;
              const numericVal = paramVal ? parseFloat(paramVal) : null;
              if (numericVal !== null && !isNaN(numericVal)) {
                if (paramVariable === "sleep_hours") finalSleep = numericVal;
                else if (paramVariable === "workout_frequency") finalWorkout = numericVal;
                else if (paramVariable === "study_hours") finalStudy = numericVal;
                else if (paramVariable === "focus_rating") finalFocus = numericVal;
                else if (paramVariable === "savings_rate") finalSavings = numericVal;
              }
            } else {
              if (paramDomain === "health") finalActiveVar = "sleep_hours";
              else if (paramDomain === "finance") finalActiveVar = "savings_rate";
              else if (paramDomain === "career") finalActiveVar = "study_hours";
            }
          }

          setDomain(finalDomain);
          setActiveVar(finalActiveVar);
          setSleepHours(finalSleep);
          setWorkoutFreq(finalWorkout);
          setStudyHours(finalStudy);
          setFocusRating(finalFocus);
          setSavingsRate(finalSavings);

          if (paramDomain) {
            setTimeout(() => {
              runSimulation({
                domain: finalDomain,
                variable: finalActiveVar,
                sleepHours: finalSleep,
                workoutFreq: finalWorkout,
                studyHours: finalStudy,
                focusRating: finalFocus,
                savingsRate: finalSavings,
                baselines: data.baselines
              });
            }, 200);
          }
        }
      })
      .catch(console.error)
      .finally(() => setBaseLoading(false));
  }, [searchParams]);

  const pctChange = useMemo(() => {
    let cur = 1, sim = 1;
    if (domain === "health") {
      cur = activeVar === "sleep_hours" ? (baselines?.sleep_hours || 7.5) : (baselines?.workout_frequency || 3);
      sim = activeVar === "sleep_hours" ? sleepHours : workoutFreq;
    } else if (domain === "finance") {
      cur = activeVar === "savings_rate" ? (baselines?.savings_rate || 20) : 3;
      sim = activeVar === "savings_rate" ? savingsRate : spendStyle;
    } else {
      cur = activeVar === "study_hours" ? (baselines?.study_hours || 4) : (baselines?.focus_rating || 7);
      sim = activeVar === "study_hours" ? studyHours : focusRating;
    }
    return cur !== 0 ? Math.round(((sim - cur) / cur) * 100) : 0;
  }, [domain, activeVar, baselines, sleepHours, workoutFreq, savingsRate, spendStyle, studyHours, focusRating]);

  const impactHUD = useMemo(() => {
    const isBenefit = pctChange >= 0;
    const abs = Math.abs(pctChange);
    const goal = result?.goal || userGoals.find((g: any) => g.domain?.toLowerCase() === domain);
    const goalLabel = goal?.title || `No ${domain} goal set`;
    let impactLabel = "No Change";
    if (abs >= 30) impactLabel = isBenefit ? "Strong Positive" : "Strong Negative";
    else if (abs >= 15) impactLabel = isBenefit ? "Moderate Positive" : "Moderate Negative";
    else if (abs >= 5)  impactLabel = isBenefit ? "Slight Positive"   : "Slight Negative";
    return { goalLabel, impactLabel, isBenefit };
  }, [pctChange, result, userGoals, domain]);

  const handleDomainChange = (d: Domain) => {
    setDomain(d);
    if (d === "health")   setActiveVar("sleep_hours");
    if (d === "finance")  setActiveVar("savings_rate");
    if (d === "career")   setActiveVar("study_hours");
  };

  const runSimulation = async (override?: {
    domain: Domain;
    variable: string;
    sleepHours: number;
    workoutFreq: number;
    studyHours: number;
    focusRating: number;
    savingsRate: number;
    baselines: any;
  }) => {
    setLoading(true); setMessage("");
    try {
      const activeDomain = override ? override.domain : domain;
      const activeVarKey = override ? override.variable : activeVar;
      const activeBaselines = override ? override.baselines : baselines;
      
      let curVal = 1, simVal = 1;
      let customParams: any = {};
      const customFinanceVars = ["dining_redirect", "credit_card_clearance", "education_sip_delay", "mortgage_prepayment"];

      if (customFinanceVars.includes(activeVarKey)) {
        curVal = 50;
        simVal = 50;
        if (activeVarKey === "dining_redirect") {
          customParams = { redirectionAmount: diningRedirectionAmount, cagr: diningCagr };
        } else if (activeVarKey === "credit_card_clearance") {
          customParams = { balance: ccBalance, apr: ccApr, amortMonths: ccAmortMonths };
        } else if (activeVarKey === "education_sip_delay") {
          customParams = { sipAmount: sipDelayAmount, delayYears: sipDelayYears, tenureYears: sipDelayTenure, cagr: sipDelayCagr };
        } else if (activeVarKey === "mortgage_prepayment") {
          customParams = { outstanding: mortgageOutstanding, annualRate: mortgageRate, remainingYears: mortgageTenure, prepayment: mortgagePrepayment };
        }
      } else {
        if (activeDomain === "health") {
          curVal = activeVarKey === "sleep_hours" ? (activeBaselines?.sleep_hours || 7.5) : (activeBaselines?.workout_frequency || 3);
          simVal = activeVarKey === "sleep_hours" 
            ? (override ? override.sleepHours : sleepHours) 
            : (override ? override.workoutFreq : workoutFreq);
        } else if (activeDomain === "finance") {
          curVal = activeVarKey === "savings_rate" ? (activeBaselines?.savings_rate || 20) : (activeBaselines?.monthly_budget || 40000);
          simVal = activeVarKey === "savings_rate" 
            ? (override ? override.savingsRate : savingsRate) 
            : Math.round(curVal * (spendStyle / 3));
        } else {
          curVal = activeVarKey === "study_hours" ? (activeBaselines?.study_hours || 4) : (activeBaselines?.focus_rating || 7);
          simVal = activeVarKey === "study_hours" 
            ? (override ? override.studyHours : studyHours) 
            : (override ? override.focusRating : focusRating);
        }
      }
      const res = await fetch("/api/simulate", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ 
          scenario: { 
            domain: activeDomain, 
            variable: activeVarKey, 
            currentValue: curVal, 
            simulatedValue: simVal,
            customParams
          } 
        }),
      });
      const data = await res.json();
      if (data.success) { setResult(data); setCheckedActions([]); }
      else setMessage(data.error || "Simulation failed. Please try again.");
    } catch { setMessage("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  const checklist = useMemo(() => {
    if (!result?.aiAnalysis?.recommendedPath) return [];
    const rec = result.aiAnalysis.recommendedPath.toLowerCase();
    const items: string[] = [];
    if (rec.includes("sleep")) items.push("Keep a consistent sleep schedule — aim for the same bedtime each night.");
    if (rec.includes("meal") || rec.includes("food") || rec.includes("zomato")) items.push("Plan meals ahead of time to avoid unplanned spending on food.");
    if (rec.includes("study") || rec.includes("focus")) items.push("Block out focused work time each morning — even 90 minutes helps.");
    if (rec.includes("budget") || rec.includes("savings")) items.push("Move a fixed amount to savings on payday before spending anything else.");
    items.push("Check in with your progress weekly using this simulator.");
    return items;
  }, [result]);

  const chartData = useMemo(() => {
    const bh = userScores.health, bf = userScores.finance, bc = userScores.career;
    const m = pctChange;
    return [
      { month: "Now",     health: bh, finance: bf, career: bc },
      { month: "Month 1", health: domain==="health"?Math.min(100,Math.round(bh+m*0.15)):Math.max(0,Math.round(bh-m*0.04)), finance: domain==="finance"?Math.min(100,Math.round(bf+m*0.15)):Math.max(0,Math.round(bf-m*0.02)), career: domain==="career"?Math.min(100,Math.round(bc+m*0.18)):Math.max(0,Math.round(bc-m*0.03)) },
      { month: "Month 2", health: domain==="health"?Math.min(100,Math.round(bh+m*0.28)):Math.max(0,Math.round(bh-m*0.06)), finance: domain==="finance"?Math.min(100,Math.round(bf+m*0.28)):Math.max(0,Math.round(bf-m*0.04)), career: domain==="career"?Math.min(100,Math.round(bc+m*0.32)):Math.max(0,Math.round(bc-m*0.05)) },
      { month: "Month 3", health: domain==="health"?Math.min(100,Math.round(bh+m*0.42)):Math.max(0,Math.round(bh-m*0.08)), finance: domain==="finance"?Math.min(100,Math.round(bf+m*0.40)):Math.max(0,Math.round(bf-m*0.06)), career: domain==="career"?Math.min(100,Math.round(bc+m*0.48)):Math.max(0,Math.round(bc-m*0.07)) },
      { month: "Month 4", health: domain==="health"?Math.min(100,Math.round(bh+m*0.55)):Math.max(0,Math.round(bh-m*0.10)), finance: domain==="finance"?Math.min(100,Math.round(bf+m*0.52)):Math.max(0,Math.round(bf-m*0.07)), career: domain==="career"?Math.min(100,Math.round(bc+m*0.62)):Math.max(0,Math.round(bc-m*0.08)) },
      { month: "Month 5", health: domain==="health"?Math.min(100,Math.round(bh+m*0.72)):Math.max(0,Math.round(bh-m*0.11)), finance: domain==="finance"?Math.min(100,Math.round(bf+m*0.68)):Math.max(0,Math.round(bf-m*0.08)), career: domain==="career"?Math.min(100,Math.round(bc+m*0.78)):Math.max(0,Math.round(bc-m*0.09)) },
      { month: "Month 6", health: domain==="health"?Math.min(100,Math.round(bh+m*0.90)):Math.max(0,Math.round(bh-m*0.12)), finance: domain==="finance"?Math.min(100,Math.round(bf+m*0.85)):Math.max(0,Math.round(bf-m*0.09)), career: domain==="career"?Math.min(100,Math.round(bc+m*0.95)):Math.max(0,Math.round(bc-m*0.10)) },
    ];
  }, [domain, pctChange, userScores]);

  if (!mounted) return null;

  const dc = DOMAIN_COPY[domain];
  const isPositive = pctChange >= 0;
  const hudColor = pctChange === 0 ? BRAND : isPositive ? "#16a34a" : "#dc2626";
  const hudBg    = pctChange === 0 ? "rgba(0,71,212,0.05)"   : isPositive ? "rgba(22,163,74,0.05)"   : "rgba(220,38,38,0.05)";
  const hudBorder= pctChange === 0 ? "rgba(0,71,212,0.2)"    : isPositive ? "rgba(22,163,74,0.2)"    : "rgba(220,38,38,0.2)";

  const sliderStyle = (val: number, min: number, max: number, color: string) => ({
    flex: 1, color,
    background: `linear-gradient(to right, ${color} 0%, ${color} ${((val-min)/(max-min))*100}%, #E4E9F4 ${((val-min)/(max-min))*100}%, #E4E9F4 100%)`,
  });

  return (
    <div className="sim-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --brand:        #0047D4;
          --brand-light:  #EEF3FF;
          --brand-mid:    #C7D7FA;
          --surface:      #FFFFFF;
          --bg:           #F4F6FB;
          --border:       #E4E9F4;
          --border-h:     #C7D7FA;
          --txt-primary:  #0D1117;
          --txt-secondary:#52637A;
          --txt-muted:    #94A3B8;
          --health:       #16a34a;
          --finance:      #f59e0b;
          --career:       #0047D4;
          --danger:       #dc2626;
          --warn:         #d97706;
          --sh-sm:   0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
          --sh-md:   0 4px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
          --sh-lg:   0 8px 32px rgba(0,71,212,0.09), 0 2px 8px rgba(0,0,0,0.04);
          --sh-hov:  0 12px 36px rgba(0,71,212,0.12), 0 2px 8px rgba(0,0,0,0.05);
          --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-xl: 20px; --r-2xl: 24px;
          --nav-h: 70px;
        }
        body { background: var(--bg); font-family: "Inter", sans-serif; -webkit-font-smoothing: antialiased; color: var(--txt-primary); }

        @keyframes tw-blink   { 50% { opacity: 0; } }
        @keyframes scr-in     { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fade-up    { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scale-in   { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
        @keyframes spin       { to { transform: rotate(360deg); } }
        @keyframes pulse-dot  { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.6;transform:scale(1.4);} }

        /* ═══ TOP NAVBAR ═══ */
        .top-nav {
          position: fixed;
          top: 0; left: 0; width: 100%;
          z-index: 500;
          height: var(--nav-h);
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(228,233,244,0.6);
          transition: background 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease;
        }
        .top-nav.top-nav-scrolled {
          background: #ffffff;
          border-color: #e4e9f4;
          box-shadow: 0 2px 20px rgba(0,0,0,0.08);
        }
        .top-nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
        }
        .top-nav-logo {
          font-family: 'DM Sans', sans-serif;
          font-size: 1.55rem;
          font-weight: 300;
          color: var(--brand);
          text-decoration: none;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          transition: opacity 0.2s;
        }
        .top-nav-logo:hover { opacity: 0.78; }
        .top-nav-logo strong { font-weight: 800; letter-spacing: 0.1em; }
        .top-nav-links {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .top-nav-link {
          font-family: 'Inter', sans-serif;
          font-size: 0.84rem;
          font-weight: 500;
          color: #555;
          text-decoration: none;
          padding: 7px 14px;
          border-radius: 9999px;
          transition: all 0.2s;
          letter-spacing: 0.01em;
        }
        .top-nav-link:hover { background: #f0f4ff; color: var(--brand); }
        .top-nav-link-active {
          background: var(--brand) !important;
          color: #fff !important;
          font-weight: 600;
        }
        .top-nav-hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
          padding: 8px;
          border: 1.5px solid #e0e0e0;
          border-radius: 10px;
          background: #f5f5f5;
          transition: all 0.2s;
        }
        .top-nav-hamburger:hover { border-color: var(--brand-mid); background: var(--brand-light); }
        .top-nav-hamburger span { display: block; width: 20px; height: 2px; background: #333; border-radius: 2px; }
        .top-nav-mobile-menu {
          display: none;
          flex-direction: column;
          gap: 5px;
          position: absolute;
          top: calc(var(--nav-h) + 4px);
          right: 20px;
          width: 210px;
          padding: 12px;
          border-radius: 16px;
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(20px);
          border: 1px solid #e8ebf4;
          box-shadow: 0 12px 40px rgba(0,68,220,0.12);
          z-index: 600;
        }
        .top-nav-mobile-menu.open { display: flex; }
        .top-nav-mobile-link {
          font-family: 'Inter', sans-serif;
          font-size: 0.88rem;
          font-weight: 500;
          color: #333;
          text-decoration: none;
          padding: 10px 14px;
          border-radius: 10px;
          transition: all 0.16s;
        }
        .top-nav-mobile-link:hover { background: #f0f4ff; color: var(--brand); }
        .top-nav-mobile-link.active { background: var(--brand-light); color: var(--brand); font-weight: 700; }

        /* ═══ ROOT LAYOUT ═══ */
        .sim-root { min-height: 100vh; background: var(--bg); }
        .sim-page {
          max-width: 1180px; margin: 0 auto; padding: 0 32px 80px;
          padding-top: calc(var(--nav-h) + 0px);
        }

        /* ═══ PAGE HEADING ═══ */
        .page-heading-block { padding: 40px 0 36px; border-bottom: 1px solid var(--border); margin-bottom: 40px; }
        .page-eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .eyebrow-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--brand); box-shadow: 0 0 0 2px rgba(0,71,212,0.18); animation: pulse-dot 2.4s infinite; }
        .eyebrow-text { font-size: 0.7rem; font-weight: 700; color: var(--brand); letter-spacing: 0.12em; text-transform: uppercase; }
        .page-title {
          font-family: "DM Sans", sans-serif;
          font-size: clamp(2.5rem, 5vw, 3.8rem);
          font-weight: 900;
          color: var(--brand);
          letter-spacing: -0.045em;
          line-height: 1.1;
        }
        .page-subtitle { font-size: 0.9rem; color: var(--txt-secondary); line-height: 1.7; margin-top: 10px; max-width: 600px; }

        /* ═══ SECTION LABEL ═══ */
        .sec-label { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
        .sec-label-text { font-size: 0.67rem; font-weight: 800; color: var(--brand); text-transform: uppercase; letter-spacing: 0.12em; white-space: nowrap; }
        .sec-label-rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--border), transparent); }

        /* ═══ CARD ═══ */
        .card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--r-2xl);
          box-shadow: var(--sh-sm);
          transition: all 0.24s cubic-bezier(0.16,1,0.3,1);
          position: relative; overflow: hidden;
        }
        .card:hover { box-shadow: var(--sh-lg); border-color: var(--border-h); }
        .card-stripe { height: 3px; }
        .card-body { padding: 28px; }
        .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .card-head-left { display: flex; align-items: center; gap: 13px; }
        .card-head-icon { width: 44px; height: 44px; border-radius: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .card-head-title { font-family: "DM Sans", sans-serif; font-size: 1.02rem; font-weight: 800; color: var(--txt-primary); }
        .card-head-sub { font-size: 0.7rem; color: var(--txt-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; margin-top: 2px; }

        /* loading overlay */
        .loading-overlay {
          position: absolute; inset: 0; background: rgba(255,255,255,0.82);
          display: flex; align-items: center; justify-content: center; z-index: 10;
          border-radius: var(--r-2xl); backdrop-filter: blur(3px);
        }
        .loading-inner { display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .loading-text { font-size: 0.8rem; font-weight: 700; color: var(--txt-secondary); letter-spacing: 0.04em; }

        /* ═══ MAIN GRID ═══ */
        .main-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; margin-bottom: 24px; }
        @media (max-width: 1060px) { .main-grid { grid-template-columns: 1fr; } }

        /* ═══ DOMAIN SELECTOR TABS ═══ */
        .domain-tabs { display: flex; gap: 8px; margin-bottom: 24px; }
        .domain-tab {
          flex: 1; padding: 10px 8px; border-radius: var(--r-md);
          border: 1.5px solid var(--border); background: var(--bg);
          cursor: pointer; font-family: "Inter", sans-serif;
          font-size: 0.78rem; font-weight: 700;
          color: var(--txt-secondary);
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          transition: all 0.2s;
        }
        .domain-tab:hover { border-color: var(--border-h); background: var(--brand-light); color: var(--brand); }
        .domain-tab.active-health  { border-color: var(--health);  background: rgba(22,163,74,0.07);  color: var(--health);  box-shadow: 0 4px 12px rgba(22,163,74,0.12); }
        .domain-tab.active-finance { border-color: var(--finance); background: rgba(245,158,11,0.07); color: var(--finance); box-shadow: 0 4px 12px rgba(245,158,11,0.12); }
        .domain-tab.active-career  { border-color: var(--career);  background: rgba(0,71,212,0.07);   color: var(--career);  box-shadow: 0 4px 12px rgba(0,71,212,0.12); }
        .domain-tab-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.04); }

        /* ═══ QUICK PRESETS ═══ */
        .preset-list { display: flex; flex-direction: column; gap: 9px; margin-bottom: 24px; }
        .preset-btn {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: var(--r-lg);
          border: 1.5px solid var(--border); background: var(--bg);
          cursor: pointer; font-family: "Inter", sans-serif;
          text-align: left; transition: all 0.22s cubic-bezier(0.16,1,0.3,1);
        }
        .preset-btn:hover { transform: translateX(3px); box-shadow: var(--sh-sm); }
        .preset-btn.preset-active { box-shadow: var(--sh-md); }
        .preset-icon { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .preset-title { font-size: 0.83rem; font-weight: 800; }
        .preset-sub   { font-size: 0.71rem; opacity: 0.75; margin-top: 2px; font-weight: 500; }

        /* ═══ SLIDER SECTION ═══ */
        .slider-divider { height: 1px; background: var(--border); margin: 22px 0; }
        .slider-section-label {
          font-size: 0.68rem; font-weight: 800; color: var(--txt-muted);
          text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px;
        }
        .slider-cards { display: flex; flex-direction: column; gap: 14px; }
        .slider-card {
          border-radius: var(--r-lg); padding: 16px;
          border: 1.5px solid var(--border); background: var(--bg);
          transition: all 0.2s; cursor: pointer;
        }
        .slider-card:hover { border-color: var(--border-h); background: var(--surface); }
        .slider-card.s-active { background: var(--surface); }
        .slider-card.s-health  { border-color: rgba(22,163,74,0.2);  background: rgba(22,163,74,0.03); }
        .slider-card.s-finance { border-color: rgba(245,158,11,0.2); background: rgba(245,158,11,0.03); }
        .slider-card.s-career  { border-color: rgba(0,71,212,0.2);   background: rgba(0,71,212,0.03); }
        .slider-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; }
        .slider-name { font-size: 0.81rem; font-weight: 700; color: var(--txt-secondary); }
        .slider-value { font-size: 0.86rem; font-weight: 800; }
        .slider-baseline { font-size: 0.68rem; color: var(--txt-muted); font-weight: 500; margin-left: 5px; }
        .slider-row { display: flex; align-items: center; gap: 10px; }
        .slider-edge { font-size: 0.68rem; font-weight: 700; color: var(--txt-muted); white-space: nowrap; }
        .sim-slider {
          -webkit-appearance: none; appearance: none;
          height: 5px; border-radius: 9999px; outline: none; cursor: pointer;
        }
        .sim-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 17px; height: 17px; border-radius: 50%;
          background: #fff; border: 3px solid currentColor;
          box-shadow: 0 2px 6px rgba(0,0,0,0.14); cursor: pointer;
          transition: transform 0.15s;
        }
        .sim-slider::-webkit-slider-thumb:hover { transform: scale(1.25); }

        /* ═══ IMPACT HUD ═══ */
        .impact-hud {
          margin-top: 22px; padding: 18px 20px; border-radius: var(--r-lg);
          border: 1.5px solid; transition: all 0.3s;
        }
        .hud-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .hud-label { font-size: 0.66rem; font-weight: 800; color: var(--txt-muted); text-transform: uppercase; letter-spacing: 0.09em; }
        .hud-impact { font-size: 0.82rem; font-weight: 800; }
        .hud-goal { font-size: 0.87rem; font-weight: 800; color: var(--txt-primary); display: flex; align-items: center; gap: 7px; margin-bottom: 5px; }
        .hud-desc { font-size: 0.77rem; color: var(--txt-secondary); font-weight: 500; line-height: 1.55; }

        /* ═══ RUN BUTTON ═══ */
        .run-btn {
          width: 100%; padding: 14px; border-radius: var(--r-lg); border: none;
          background: linear-gradient(135deg, var(--brand), #0066FF);
          color: #fff; font-family: "DM Sans", sans-serif;
          font-size: 0.96rem; font-weight: 800;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px;
          transition: all 0.22s; box-shadow: 0 4px 18px rgba(0,71,212,0.28);
          letter-spacing: -0.01em; margin-top: 22px;
        }
        .run-btn:hover:not(:disabled) { filter: brightness(1.07); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,71,212,0.34); }
        .run-btn:disabled { background: #94A3B8; box-shadow: none; cursor: not-allowed; transform: none; }

        /* ═══ CHART CARD RIGHT ═══ */
        .chart-legends { display: flex; gap: 16px; margin-bottom: 18px; flex-wrap: wrap; }
        .legend-item { display: flex; align-items: center; gap: 6px; }
        .legend-dot { width: 9px; height: 9px; border-radius: 50%; }
        .legend-label { font-size: 0.78rem; font-weight: 700; color: var(--txt-secondary); }

        .insight-box {
          background: var(--bg); border: 1px solid var(--border);
          border-radius: var(--r-lg); padding: 18px 20px; margin-top: 18px;
          font-size: 0.87rem; color: var(--txt-secondary); line-height: 1.65;
        }
        .insight-title { font-family: "DM Sans", sans-serif; font-size: 0.95rem; font-weight: 800; color: var(--txt-primary); margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .insight-idle { display: flex; align-items: flex-start; gap: 10px; }
        .insight-idle-icon { width: 36px; height: 36px; border-radius: 10px; background: var(--brand-light); color: var(--brand); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        /* risk badge */
        .risk-badge {
          font-size: 0.7rem; font-weight: 800; padding: 4px 12px;
          border-radius: 9999px; border: 1.5px solid;
          text-transform: uppercase; letter-spacing: 0.07em;
        }

        /* ═══ RESULTS GRID ═══ */
        .results-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 24px; }
        @media (max-width: 1060px) { .results-grid { grid-template-columns: 1fr; } }

        /* trade-off cards */
        .tradeoff-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-top: 8px; }
        .tradeoff-card {
          border-radius: var(--r-lg); padding: 18px;
          border: 1px solid var(--border);
          transition: all 0.22s cubic-bezier(0.16,1,0.3,1);
        }
        .tradeoff-card:hover { transform: translateY(-3px); box-shadow: var(--sh-md); }
        .tradeoff-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .tradeoff-domain { font-size: 0.63rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; padding: 3px 9px; border-radius: 6px; }
        .tradeoff-num { font-family: "DM Sans", sans-serif; font-size: 2rem; font-weight: 900; line-height: 1; margin-bottom: 8px; }
        .tradeoff-desc { font-size: 0.8rem; color: var(--txt-secondary); line-height: 1.6; font-weight: 500; }

        /* timeline */
        .timeline { display: flex; flex-direction: column; gap: 14px; position: relative; padding-left: 22px; margin-left: 8px; margin-top: 4px; border-left: 2px dashed rgba(0,71,212,0.18); }
        .tl-item { position: relative; }
        .tl-item::before {
          content: ''; position: absolute; left: -30px; top: 4px;
          width: 11px; height: 11px; border-radius: 50%;
          background: var(--brand); border: 2px solid #fff;
          box-shadow: 0 0 0 3px rgba(0,71,212,0.15);
        }
        .tl-week { font-family: "DM Sans", sans-serif; font-weight: 800; font-size: 0.86rem; color: var(--txt-primary); margin-bottom: 3px; }
        .tl-proj { color: var(--txt-secondary); font-size: 0.84rem; line-height: 1.6; }

        /* confidence bar */
        .conf-track { height: 6px; background: var(--bg); border-radius: 9999px; overflow: hidden; margin: 10px 0; }
        .conf-fill   { height: 100%; border-radius: 9999px; background: linear-gradient(90deg, var(--brand), #0066FF); transition: width 1.2s cubic-bezier(0.16,1,0.3,1); }

        /* checklist */
        .checklist { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
        .check-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 11px 14px; border-radius: var(--r-md);
          background: var(--bg); border: 1px solid var(--border);
          cursor: pointer; transition: all 0.18s;
          font-size: 0.81rem; font-weight: 600; color: var(--txt-primary);
        }
        .check-item:hover { background: var(--surface); border-color: var(--border-h); }
        .check-item.checked { opacity: 0.55; text-decoration: line-through; }
        .check-box {
          width: 17px; height: 17px; border-radius: 5px;
          border: 1.5px solid var(--border-h);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 1px;
          background: var(--surface); transition: all 0.18s;
        }
        .check-item.checked .check-box { background: var(--brand); border-color: var(--brand); }

        /* await state */
        .await-card {
          display: flex; align-items: center; gap: 20px;
          padding: 28px 32px; background: var(--surface);
          border: 1.5px dashed var(--border-h); border-radius: var(--r-2xl);
          box-shadow: var(--sh-sm);
        }
        .await-icon {
          width: 56px; height: 56px; border-radius: 16px;
          background: var(--brand-light); color: var(--brand);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .await-title { font-family: "DM Sans", sans-serif; font-size: 1rem; font-weight: 800; color: var(--txt-primary); margin-bottom: 6px; }
        .await-sub { font-size: 0.86rem; color: var(--txt-secondary); line-height: 1.65; }

        /* message */
        .msg-box {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 18px; border-radius: var(--r-md);
          font-size: 0.84rem; font-weight: 600;
          margin-bottom: 20px;
        }

        /* success notice */
        .success-notice {
          display: flex; align-items: center; gap: 9px;
          padding: 12px 16px; border-radius: var(--r-md);
          background: rgba(22,163,74,0.05); border: 1px solid rgba(22,163,74,0.18);
          font-size: 0.78rem; font-weight: 700; color: var(--health);
          margin-top: 20px; line-height: 1.5;
        }

        /* responsive */
        @media (max-width: 768px) {
          .sim-page { padding: 0 16px 60px; padding-top: calc(var(--nav-h) + 0px); }
          .preset-list { gap: 7px; }
          .domain-tabs { gap: 6px; }
          .top-nav-links { display: none; }
          .top-nav-hamburger { display: flex; }
          :root { --nav-h: 58px; }
          .top-nav-inner { padding: 0 16px; }
          .top-nav-logo { font-size: 1.3rem; }
        }
      `}</style>

      {/* ═══ TOP NAVBAR ═══ */}
      <TopNav />

      <div className="sim-page">

        {/* ═══ PAGE HEADING ═══ */}
        <div className="page-heading-block">
          <div className="page-eyebrow">
            <div className="eyebrow-dot"/>
            <span className="eyebrow-text">What-If Simulator</span>
          </div>
          <h1 className="page-title"><Typewriter phrases={TYPEWRITER_PHRASES}/></h1>
          <p className="page-subtitle">
            Choose a life area — Health, Finance, or Career — adjust the sliders to model a new habit or decision, then run the simulation to see how it might affect your goals over the next 6 months.
          </p>
        </div>

        {/* message */}
        {message && (
          <div className="msg-box" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
            <ShieldAlert size={16}/> {message}
          </div>
        )}

        {/* ═══ MAIN GRID ═══ */}
        <div className="main-grid">

          {/* ── LEFT: CONFIGURE ── */}
          <div className="card" style={{ animation: "scr-in 0.3s ease" }}>
            {baseLoading && (
              <div className="loading-overlay">
                <div className="loading-inner">
                  <Loader2 size={36} style={{ color: "var(--brand)", animation: "spin 1.1s linear infinite" }}/>
                  <span className="loading-text">Loading your data…</span>
                </div>
              </div>
            )}
            <div className="card-stripe" style={{ background: "linear-gradient(90deg, #0047D4, #0066FF)" }}/>
            <div className="card-body">

              <div className="card-head">
                <div className="card-head-left">
                  <div className="card-head-icon" style={{ background: "rgba(0,71,212,0.08)", color: "var(--brand)" }}>
                    <SlidersHorizontal size={18}/>
                  </div>
                  <div>
                    <div className="card-head-title">Set Up Your Scenario</div>
                    <div className="card-head-sub">Choose an area and adjust the sliders</div>
                  </div>
                </div>
              </div>

              {/* Domain tabs */}
              <div className="domain-tabs">
                {(["career","health","finance"] as Domain[]).map(d => {
                  const ddc = DOMAIN_COPY[d];
                  const isActive = domain === d;
                  return (
                    <button
                      key={d}
                      className={`domain-tab${isActive ? ` active-${d}` : ""}`}
                      onClick={() => handleDomainChange(d)}
                    >
                      <div className="domain-tab-icon" style={isActive ? { background: `${ddc.color}18`, color: ddc.color } : {}}>
                        {d === "career" ? <Briefcase size={14}/> : d === "health" ? <HeartPulse size={14}/> : <Wallet size={14}/>}
                      </div>
                      {ddc.label}
                    </button>
                  );
                })}
              </div>

              {/* Quick presets */}
              <div className="sec-label">
                <span className="sec-label-text">Quick Presets</span>
                <div className="sec-label-rule"/>
              </div>
              <div className="preset-list">
                {[
                  { d: "career" as Domain, label: "Focus on Career Growth",  sub: "Increase daily study time and focus",       var: "study_hours",         trigger: () => { setStudyHours(8); setFocusRating(9); } },
                  { d: "health" as Domain, label: "Work Out More Often",      sub: "Add two extra workouts per week",           var: "workout_frequency",   trigger: () => setWorkoutFreq(Math.min(7, (baselines?.workout_frequency||3)+2)) },
                  { d: "finance" as Domain,label: "Cut Spending, Save More",  sub: "Switch to a more careful spending style",  var: "discretionary_spend", trigger: () => { setSpendStyle(1); setSavingsRate(Math.min(100,(baselines?.savings_rate||20)+15)); } },
                  { d: "finance" as Domain,label: "Redirection: Dining to SIP",sub: "Move ₹5,000/mo to education SIP at 12% CAGR",var: "dining_redirect",   trigger: () => { setDiningRedirectionAmount(5000); setDiningCagr(12); } },
                  { d: "finance" as Domain,label: "Debt Prepayment (Credit Card)",sub: "Prepay ₹48k balance immediately to save 36% APR",var: "credit_card_clearance",trigger: () => { setCcBalance(48000); setCcApr(36); setCcAmortMonths(12); } },
                  { d: "finance" as Domain,label: "SIP Compounding Cost of Delay",sub: "Start education SIP today vs 2 years delay cost",var: "education_sip_delay",trigger: () => { setSipDelayAmount(10000); setSipDelayYears(2); setSipDelayTenure(15); setSipDelayCagr(12); } },
                  { d: "finance" as Domain,label: "Home Loan Prepayment (₹2L)",sub: "Prepay ₹2L on ₹40L home loan to cut tenure",var: "mortgage_prepayment",trigger: () => { setMortgageOutstanding(4000000); setMortgageRate(8.5); setMortgageTenure(20); setMortgagePrepayment(200000); } },
                ].map(item => {
                  const ddc = DOMAIN_COPY[item.d];
                  const isActive = domain === item.d && activeVar === item.var;
                  return (
                    <button
                      key={item.label}
                      className={`preset-btn${isActive ? " preset-active" : ""}`}
                      style={isActive
                        ? { background: ddc.bg, borderColor: ddc.color, color: ddc.color }
                        : { color: ddc.color, borderColor: ddc.border }}
                      onClick={() => { handleDomainChange(item.d); setActiveVar(item.var); item.trigger(); }}
                    >
                      <div className="preset-icon" style={{ background: isActive ? `${ddc.color}18` : ddc.bg, color: ddc.color }}>
                        {item.d === "career" ? <Briefcase size={14}/> : item.d === "health" ? <HeartPulse size={14}/> : <Wallet size={14}/>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="preset-title">{item.label}</div>
                        <div className="preset-sub">{item.sub}</div>
                      </div>
                      {isActive && <CheckCircle2 size={14} style={{ flexShrink: 0 }}/>}
                    </button>
                  );
                })}
              </div>

              {/* Sliders */}
              <div className="slider-divider"/>
              <div className="slider-section-label">Fine-tune the numbers for {DOMAIN_COPY[domain].label}</div>
              <div className="slider-cards">
                {domain === "health" && (<>
                  <div className={`slider-card${activeVar==="sleep_hours"?" s-health":""}`} onClick={() => setActiveVar("sleep_hours")}>
                    <div className="slider-header">
                      <span className="slider-name">Hours of Sleep Per Night</span>
                      <span className="slider-value" style={{ color: "#16a34a" }}>
                        {sleepHours}h
                        <span className="slider-baseline">Current: {baselines?.sleep_hours||7.5}h</span>
                      </span>
                    </div>
                    <div className="slider-row">
                      <span className="slider-edge">4h</span>
                      <input type="range" min={4} max={10} step={0.5} value={sleepHours}
                        onChange={e=>{setSleepHours(Number(e.target.value));setActiveVar("sleep_hours");}}
                        className="sim-slider" style={sliderStyle(sleepHours,4,10,"#16a34a")}/>
                      <span className="slider-edge">10h</span>
                    </div>
                  </div>
                  <div className={`slider-card${activeVar==="workout_frequency"?" s-health":""}`} onClick={() => setActiveVar("workout_frequency")}>
                    <div className="slider-header">
                      <span className="slider-name">Workouts Per Week</span>
                      <span className="slider-value" style={{ color: "#16a34a" }}>
                        {workoutFreq}×
                        <span className="slider-baseline">Current: {baselines?.workout_frequency||3}×</span>
                      </span>
                    </div>
                    <div className="slider-row">
                      <span className="slider-edge">0×</span>
                      <input type="range" min={0} max={7} step={1} value={workoutFreq}
                        onChange={e=>{setWorkoutFreq(Number(e.target.value));setActiveVar("workout_frequency");}}
                        className="sim-slider" style={sliderStyle(workoutFreq,0,7,"#16a34a")}/>
                      <span className="slider-edge">7×</span>
                    </div>
                  </div>
                </>)}

                {domain === "finance" && (
                  !["dining_redirect", "credit_card_clearance", "education_sip_delay", "mortgage_prepayment"].includes(activeVar) ? (
                    <>
                      <div className={`slider-card${activeVar==="savings_rate"?" s-finance":""}`} onClick={() => setActiveVar("savings_rate")}>
                        <div className="slider-header">
                          <span className="slider-name">How Much of Your Income You Save</span>
                          <span className="slider-value" style={{ color: "#f59e0b" }}>
                            {savingsRate}%
                            <span className="slider-baseline">Current: {baselines?.savings_rate||20}%</span>
                          </span>
                        </div>
                        <div className="slider-row">
                          <span className="slider-edge">0%</span>
                          <input type="range" min={0} max={100} step={5} value={savingsRate}
                            onChange={e=>{setSavingsRate(Number(e.target.value));setActiveVar("savings_rate");}}
                            className="sim-slider" style={sliderStyle(savingsRate,0,100,"#f59e0b")}/>
                          <span className="slider-edge">100%</span>
                        </div>
                      </div>
                      <div className={`slider-card${activeVar==="discretionary_spend"?" s-finance":""}`} onClick={() => setActiveVar("discretionary_spend")}>
                        <div className="slider-header">
                          <span className="slider-name">Your Spending Style</span>
                          <span className="slider-value" style={{ color: "#f59e0b", textTransform: "capitalize" }}>
                            {["","Very Careful","Frugal","Balanced","Relaxed","Generous"][spendStyle]}
                          </span>
                        </div>
                        <div className="slider-row">
                          <span className="slider-edge">Very Careful</span>
                          <input type="range" min={1} max={5} step={1} value={spendStyle}
                            onChange={e=>{setSpendStyle(Number(e.target.value));setActiveVar("discretionary_spend");}}
                            className="sim-slider" style={sliderStyle(spendStyle,1,5,"#f59e0b")}/>
                          <span className="slider-edge">Generous</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {activeVar === "dining_redirect" && (
                        <div className="slider-card s-finance" style={{ cursor: "default" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f59e0b" }}>Dining Out Redirection Parameters</h4>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--txt-secondary)" }}>Monthly Redirection Amount (₹)</label>
                              <input type="number" value={diningRedirectionAmount} onChange={e => setDiningRedirectionAmount(Number(e.target.value))} style={{ background: "#fff", border: "1px solid #E4E9F4", padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem", color: "var(--txt-primary)" }}/>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--txt-secondary)" }}>Expected CAGR (%)</label>
                              <input type="number" value={diningCagr} onChange={e => setDiningCagr(Number(e.target.value))} style={{ background: "#fff", border: "1px solid #E4E9F4", padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem", color: "var(--txt-primary)" }}/>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeVar === "credit_card_clearance" && (
                        <div className="slider-card s-finance" style={{ cursor: "default" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f59e0b" }}>Credit Card Clearance Parameters</h4>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--txt-secondary)" }}>Credit Card Outstanding Balance (₹)</label>
                              <input type="number" value={ccBalance} onChange={e => setCcBalance(Number(e.target.value))} style={{ background: "#fff", border: "1px solid #E4E9F4", padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem", color: "var(--txt-primary)" }}/>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--txt-secondary)" }}>APR Interest Rate (%)</label>
                              <input type="number" value={ccApr} onChange={e => setCcApr(Number(e.target.value))} style={{ background: "#fff", border: "1px solid #E4E9F4", padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem", color: "var(--txt-primary)" }}/>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--txt-secondary)" }}>Repayment Tenure if unpaid (Months)</label>
                              <input type="number" value={ccAmortMonths} onChange={e => setCcAmortMonths(Number(e.target.value))} style={{ background: "#fff", border: "1px solid #E4E9F4", padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem", color: "var(--txt-primary)" }}/>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeVar === "education_sip_delay" && (
                        <div className="slider-card s-finance" style={{ cursor: "default" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f59e0b" }}>SIP Cost of Delay Parameters</h4>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--txt-secondary)" }}>Target Monthly SIP Amount (₹)</label>
                              <input type="number" value={sipDelayAmount} onChange={e => setSipDelayAmount(Number(e.target.value))} style={{ background: "#fff", border: "1px solid #E4E9F4", padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem", color: "var(--txt-primary)" }}/>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--txt-secondary)" }}>Delay Period (Years)</label>
                              <input type="number" value={sipDelayYears} onChange={e => setSipDelayYears(Number(e.target.value))} style={{ background: "#fff", border: "1px solid #E4E9F4", padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem", color: "var(--txt-primary)" }}/>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--txt-secondary)" }}>Total SIP Tenure (Years)</label>
                              <input type="number" value={sipDelayTenure} onChange={e => setSipDelayTenure(Number(e.target.value))} style={{ background: "#fff", border: "1px solid #E4E9F4", padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem", color: "var(--txt-primary)" }}/>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--txt-secondary)" }}>Expected CAGR (%)</label>
                              <input type="number" value={sipDelayCagr} onChange={e => setSipDelayCagr(Number(e.target.value))} style={{ background: "#fff", border: "1px solid #E4E9F4", padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem", color: "var(--txt-primary)" }}/>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeVar === "mortgage_prepayment" && (
                        <div className="slider-card s-finance" style={{ cursor: "default" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f59e0b" }}>Mortgage Prepayment Parameters</h4>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--txt-secondary)" }}>Home Loan Outstanding (₹)</label>
                              <input type="number" value={mortgageOutstanding} onChange={e => setMortgageOutstanding(Number(e.target.value))} style={{ background: "#fff", border: "1px solid #E4E9F4", padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem", color: "var(--txt-primary)" }}/>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--txt-secondary)" }}>Loan Interest Rate (%)</label>
                              <input type="number" value={mortgageRate} onChange={e => setMortgageRate(Number(e.target.value))} style={{ background: "#fff", border: "1px solid #E4E9F4", padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem", color: "var(--txt-primary)" }}/>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--txt-secondary)" }}>Remaining Tenure (Years)</label>
                              <input type="number" value={mortgageTenure} onChange={e => setMortgageTenure(Number(e.target.value))} style={{ background: "#fff", border: "1px solid #E4E9F4", padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem", color: "var(--txt-primary)" }}/>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--txt-secondary)" }}>Partial Prepayment Amount (₹)</label>
                              <input type="number" value={mortgagePrepayment} onChange={e => setMortgagePrepayment(Number(e.target.value))} style={{ background: "#fff", border: "1px solid #E4E9F4", padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem", color: "var(--txt-primary)" }}/>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}

                {domain === "career" && (<>
                  <div className={`slider-card${activeVar==="study_hours"?" s-career":""}`} onClick={() => setActiveVar("study_hours")}>
                    <div className="slider-header">
                      <span className="slider-name">Hours of Focused Work or Study Per Day</span>
                      <span className="slider-value" style={{ color: "var(--brand)" }}>
                        {studyHours}h
                        <span className="slider-baseline">Current: {baselines?.study_hours||4}h</span>
                      </span>
                    </div>
                    <div className="slider-row">
                      <span className="slider-edge">0h</span>
                      <input type="range" min={0} max={12} step={0.5} value={studyHours}
                        onChange={e=>{setStudyHours(Number(e.target.value));setActiveVar("study_hours");}}
                        className="sim-slider" style={sliderStyle(studyHours,0,12,BRAND)}/>
                      <span className="slider-edge">12h</span>
                    </div>
                  </div>
                  <div className={`slider-card${activeVar==="focus_rating"?" s-career":""}`} onClick={() => setActiveVar("focus_rating")}>
                    <div className="slider-header">
                      <span className="slider-name">How Sharp Your Focus Feels (1–10)</span>
                      <span className="slider-value" style={{ color: "var(--brand)" }}>
                        {focusRating}/10
                        <span className="slider-baseline">Current: {baselines?.focus_rating||7}/10</span>
                      </span>
                    </div>
                    <div className="slider-row">
                      <span className="slider-edge">1</span>
                      <input type="range" min={1} max={10} step={1} value={focusRating}
                        onChange={e=>{setFocusRating(Number(e.target.value));setActiveVar("focus_rating");}}
                        className="sim-slider" style={sliderStyle(focusRating,1,10,BRAND)}/>
                      <span className="slider-edge">10</span>
                    </div>
                  </div>
                </>)}
              </div>

              {/* Impact HUD */}
              <div className="impact-hud" style={{ background: hudBg, borderColor: hudBorder }}>
                <div className="hud-top">
                  <span className="hud-label">🎯 Your Active Goal</span>
                  <span className="hud-impact" style={{ color: hudColor }}>{impactHUD.impactLabel}</span>
                </div>
                <div className="hud-goal">
                  <Sparkles size={13} style={{ color: hudColor, flexShrink: 0 }}/>
                  {impactHUD.goalLabel}
                </div>
                <p className="hud-desc">
                  {pctChange === 0
                    ? "Adjust a slider to see how this change might affect your goal."
                    : impactHUD.isBenefit
                    ? "This change looks like it could help you reach your goal faster."
                    : "This change might slow down your progress toward your goal."}
                </p>
              </div>

              {/* Run button */}
              <button className="run-btn" onClick={() => runSimulation()} disabled={loading || baseLoading}>
                {loading
                  ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }}/> Running simulation…</>
                  : <><Play size={15}/> Run Simulation</>}
              </button>

            </div>
          </div>

          {/* ── RIGHT: PROJECTION CHART ── */}
          <div className="card" style={{ animation: "scr-in 0.3s 0.06s ease both" }}>
            <div className="card-stripe" style={{ background: "linear-gradient(90deg, #16a34a, #0369a1, #0047D4)" }}/>
            <div className="card-body">

              <div className="card-head">
                <div className="card-head-left">
                  <div className="card-head-icon" style={{ background: "rgba(0,71,212,0.08)", color: "var(--brand)" }}>
                    <TrendingUp size={18}/>
                  </div>
                  <div>
                    <div className="card-head-title">6-Month Projection</div>
                    <div className="card-head-sub">How your scores may change</div>
                  </div>
                </div>
                {result && (() => {
                  const rk = (result.aiAnalysis?.riskLevel || "medium").toLowerCase() as keyof typeof RISK_CONFIG;
                  const rc = RISK_CONFIG[rk] || RISK_CONFIG.medium;
                  return <span className="risk-badge" style={{ background: rc.bg, color: rc.color, borderColor: rc.border }}>{rc.label}</span>;
                })()}
              </div>

              <div className="chart-legends">
                {[["#16a34a","Health"],["#f59e0b","Finance"],["#0047D4","Career"]].map(([c,l])=>(
                  <div key={l} className="legend-item">
                    <div className="legend-dot" style={{ background: c }}/>
                    <span className="legend-label">{l}</span>
                  </div>
                ))}
              </div>

              <div style={{ width: "100%", height: 230 }}>
                <ResponsiveContainer>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <defs>
                      {[["hg","#16a34a"],["fg","#f59e0b"],["cg","#0047D4"]].map(([id, c]) => (
                        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={c} stopOpacity={0.14}/>
                          <stop offset="95%" stopColor={c} stopOpacity={0}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid stroke="#F0F2F8" strokeDasharray="4 3"/>
                    <XAxis dataKey="month" stroke="#E4E9F4" tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 600 }}/>
                    <YAxis domain={[0,100]} stroke="#E4E9F4" tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 600 }}/>
                    <Tooltip content={<ChartTooltip/>}/>
                    <Area type="monotone" dataKey="health"  stroke="#16a34a" fill="url(#hg)" strokeWidth={2.5} dot={false}/>
                    <Area type="monotone" dataKey="finance" stroke="#f59e0b" fill="url(#fg)" strokeWidth={2.5} dot={false}/>
                    <Area type="monotone" dataKey="career"  stroke="#0047D4" fill="url(#cg)" strokeWidth={2.5} dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* insight box */}
              <div className="insight-box">
                {result ? (
                  <>
                    <div className="insight-title">
                      <Zap size={14} style={{ color: "var(--brand)", flexShrink: 0 }}/>
                      {result.aiAnalysis?.scenarioTitle || "Simulation complete"}
                    </div>
                    <p style={{ fontStyle: "italic", margin: 0 }}>
                      "{result.aiAnalysis?.primaryOutcome || "Your simulation has been processed."}"
                    </p>
                  </>
                ) : loading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[90,72,82].map((w,i) => (
                      <div key={i} style={{ height: 12, width: `${w}%`, background: "#F0F2F8", borderRadius: 6 }}/>
                    ))}
                  </div>
                ) : (
                  <div className="insight-idle">
                    <div className="insight-idle-icon"><Cpu size={16}/></div>
                    <p style={{ margin: 0 }}>
                      <strong style={{ color: "var(--txt-primary)" }}>Ready to simulate.</strong> Adjust the sliders on the left to represent a change you're thinking about making, then click <em>Run Simulation</em> to see the projected impact.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* ═══ RESULTS ═══ */}
        {result ? (
          <div className="results-grid" style={{ animation: "scr-in 0.35s ease" }}>

            {/* Simulated Financial Math Details Card */}
            {(result as any).customMath && (
              <div className="card" style={{ gridColumn: "span 2", marginBottom: 8 }}>
                <div className="card-stripe" style={{ background: "linear-gradient(90deg, #10b981, #2563eb)" }}/>
                <div className="card-body">
                  <div className="card-head" style={{ marginBottom: 16 }}>
                    <div className="card-head-left">
                      <div className="card-head-icon" style={{ background: "rgba(16,185,129,0.08)", color: "#10b981" }}>
                        <TrendingUp size={18}/>
                      </div>
                      <div>
                        <div className="card-head-title">Simulated Financial Math Details</div>
                        <div className="card-head-sub">Deterministic projections and interest calculations</div>
                      </div>
                    </div>
                  </div>

                  {activeVar === "dining_redirect" && (result as any).customMath && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
                      <div style={{ background: "#f8fafc", padding: 20, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                        <h4 style={{ color: "#475569", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>5-Year SIP Goal (12% CAGR)</h4>
                        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#10b981" }}>₹{(result as any).customMath.fv5?.toLocaleString("en-IN")}</div>
                        <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 8, lineHeight: 1.5 }}>
                          Total Invested: <strong>₹{(result as any).customMath.invested5?.toLocaleString("en-IN")}</strong><br/>
                          Interest Gained: <strong>₹{(result as any).customMath.interestGained5?.toLocaleString("en-IN")}</strong>
                        </p>
                      </div>
                      <div style={{ background: "#f8fafc", padding: 20, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                        <h4 style={{ color: "#475569", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>15-Year SIP Goal (12% CAGR)</h4>
                        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0047D4" }}>₹{(result as any).customMath.fv15?.toLocaleString("en-IN")}</div>
                        <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 8, lineHeight: 1.5 }}>
                          Total Invested: <strong>₹{(result as any).customMath.invested15?.toLocaleString("en-IN")}</strong><br/>
                          Interest Gained: <strong>₹{(result as any).customMath.interestGained15?.toLocaleString("en-IN")}</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {activeVar === "credit_card_clearance" && (result as any).customMath && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
                      <div style={{ background: "#fef2f2", padding: 20, borderRadius: 16, border: "1px solid #fecaca" }}>
                        <h4 style={{ color: "#991b1b", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>Interest Saved</h4>
                        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#dc2626" }}>₹{(result as any).customMath.interestSaved?.toLocaleString("en-IN")}</div>
                        <p style={{ fontSize: "0.82rem", color: "#b91c1c", marginTop: 8, lineHeight: 1.5 }}>
                          Saved over a <strong>{(result as any).customMath.amortMonths}-month</strong> standard repayment schedule (EMI: ₹{(result as any).customMath.monthlyPayment?.toLocaleString("en-IN")}/mo).
                        </p>
                      </div>
                      <div style={{ background: "#f8fafc", padding: 20, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                        <h4 style={{ color: "#475569", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>Compounded Charges Prevented</h4>
                        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#52637a" }}>₹{(result as any).customMath.annualInterestCompounded?.toLocaleString("en-IN")}/yr</div>
                        <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 8, lineHeight: 1.5 }}>
                          Avoided annual credit card finance charges at a standard <strong>{(result as any).customMath.apr}% APR</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeVar === "education_sip_delay" && (result as any).customMath && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
                      <div style={{ background: "#fffbeb", padding: 20, borderRadius: 16, border: "1px solid #fde68a" }}>
                        <h4 style={{ color: "#92400e", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>Cost of Delay (Lost Wealth)</h4>
                        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#d97706" }}>₹{(result as any).customMath.costOfDelay?.toLocaleString("en-IN")}</div>
                        <p style={{ fontSize: "0.82rem", color: "#b45309", marginTop: 8, lineHeight: 1.5 }}>
                          Difference in wealth by starting the ₹{(result as any).customMath.sipAmount?.toLocaleString("en-IN")}/mo SIP <strong>{(result as any).customMath.delayYears} years</strong> later.
                        </p>
                      </div>
                      <div style={{ background: "#f8fafc", padding: 20, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                        <h4 style={{ color: "#475569", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>Compensating SIP Increase</h4>
                        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0047D4" }}>+₹{(result as any).customMath.extraSIPMonthly?.toLocaleString("en-IN")}/mo</div>
                        <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 8, lineHeight: 1.5 }}>
                          Must increase monthly SIP to <strong>₹{(result as any).customMath.requiredSIPDelayed?.toLocaleString("en-IN")}/mo</strong> (a +{Math.round((result as any).customMath.extraSIPMonthly / (result as any).customMath.sipAmount * 100)}% jump) to hit same corpus target.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeVar === "mortgage_prepayment" && (result as any).customMath && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
                      <div style={{ background: "#ecfdf5", padding: 20, borderRadius: 16, border: "1px solid #a7f3d0" }}>
                        <h4 style={{ color: "#065f46", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>Lifetime Interest Saved</h4>
                        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#10b981" }}>₹{(result as any).customMath.interestSaved?.toLocaleString("en-IN")}</div>
                        <p style={{ fontSize: "0.82rem", color: "#047857", marginTop: 8, lineHeight: 1.5 }}>
                          Lifetime interest saved by making a partial prepayment of ₹{(result as any).customMath.prepayment?.toLocaleString("en-IN")} on a ₹{(result as any).customMath.outstanding?.toLocaleString("en-IN")} home loan.
                        </p>
                      </div>
                      <div style={{ background: "#f8fafc", padding: 20, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                        <h4 style={{ color: "#475569", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>Tenure Reduced</h4>
                        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0047D4" }}>{Math.floor((result as any).customMath.tenureReductionMonths / 12)} Years, {(result as any).customMath.tenureReductionMonths % 12} Months</div>
                        <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 8, lineHeight: 1.5 }}>
                          Loan outstanding drops immediately, shaving off <strong>{(result as any).customMath.tenureReductionMonths} months</strong> while keeping EMI same at ₹{(result as any).customMath.emi?.toLocaleString("en-IN")}/mo.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Trade-offs + Timeline */}
            <div className="card">
              <div className="card-stripe" style={{ background: "linear-gradient(90deg, var(--brand), #0066FF)" }}/>
              <div className="card-body">

                <div className="card-head">
                  <div className="card-head-left">
                    <div className="card-head-icon" style={{ background: "rgba(0,71,212,0.08)", color: "var(--brand)" }}>
                      <Activity size={18}/>
                    </div>
                    <div>
                      <div className="card-head-title">What Else Gets Affected</div>
                      <div className="card-head-sub">Ripple effects across all areas of your life</div>
                    </div>
                  </div>
                </div>

                <div className="tradeoff-grid">
                  {(result.aiAnalysis?.tradeOffs || []).map((item, i) => {
                    const ddc = DOMAIN_COPY[item.domain];
                    return (
                      <div key={i} className="tradeoff-card" style={{ background: ddc.bg, borderColor: ddc.border }}>
                        <div className="tradeoff-header">
                          <span className="tradeoff-domain" style={{ color: ddc.color, background: `${ddc.color}15` }}>{ddc.label}</span>
                          {item.impact === "positive"
                            ? <ArrowUpRight size={14} style={{ color: "#16a34a" }}/>
                            : item.impact === "negative"
                            ? <TrendingDown size={14} style={{ color: "#dc2626" }}/>
                            : <Sparkles size={14} style={{ color: "var(--brand)" }}/>}
                        </div>
                        <div className="tradeoff-num" style={{ color: ddc.color }}>
                          <AnimatedNumber value={item.magnitude || 0}/>
                        </div>
                        <p className="tradeoff-desc">{item.explanation}</p>
                      </div>
                    );
                  })}
                </div>

                {/* timeline */}
                <div style={{ marginTop: 32, paddingTop: 28, borderTop: "1px solid var(--border)" }}>
                  <div className="sec-label">
                    <span className="sec-label-text">Month-by-Month Roadmap</span>
                    <div className="sec-label-rule"/>
                  </div>
                  <div className="timeline">
                    {(result.aiAnalysis?.timelineProjection || []).map((step, i) => (
                      <div key={i} className="tl-item">
                        <div className="tl-week">{step.week}</div>
                        <div className="tl-proj">{step.projection}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Advisory / Recommended Actions */}
            <div className="card">
              <div className="card-stripe" style={{ background: "linear-gradient(90deg, #0066FF, #0047D4)" }}/>
              <div className="card-body">

                <div className="card-head">
                  <div className="card-head-left">
                    <div className="card-head-icon" style={{ background: "rgba(0,71,212,0.08)", color: "var(--brand)" }}>
                      <BrainCircuit size={18}/>
                    </div>
                    <div>
                      <div className="card-head-title">What Syntra Recommends</div>
                      <div className="card-head-sub">Based on your simulation results</div>
                    </div>
                  </div>
                </div>

                {/* confidence */}
                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "16px 18px", marginBottom: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--txt-muted)" }}>How confident is this prediction?</span>
                    <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: "1.15rem", fontWeight: 900, color: "var(--brand)" }}>
                      <AnimatedNumber value={result.aiAnalysis?.confidence || 0} suffix="%"/>
                    </span>
                  </div>
                  <div className="conf-track">
                    <div className="conf-fill" style={{ width: `${result.aiAnalysis?.confidence || 0}%` }}/>
                  </div>
                  {result.aiAnalysis?.recommendedPath && (
                    <p style={{ marginTop: 12, color: "var(--txt-secondary)", fontSize: "0.84rem", lineHeight: 1.65, fontStyle: "italic" }}>
                      "{result.aiAnalysis.recommendedPath}"
                    </p>
                  )}
                </div>

                {/* checklist */}
                {checklist.length > 0 && (
                  <>
                    <div className="sec-label">
                      <span className="sec-label-text">Suggested Next Steps</span>
                      <div className="sec-label-rule"/>
                    </div>
                    <div className="checklist">
                      {checklist.map((item, i) => {
                        const checked = checkedActions.includes(item);
                        return (
                          <div key={i} className={`check-item${checked ? " checked" : ""}`}
                            onClick={() => setCheckedActions(p => p.includes(item) ? p.filter(x=>x!==item) : [...p, item])}>
                            <div className="check-box">
                              {checked && <CheckCircle2 size={10} style={{ color: "#fff" }}/>}
                            </div>
                            <span>{item}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <div className="success-notice">
                  <CheckCircle2 size={14} style={{ flexShrink: 0 }}/>
                  Predictions are calculated from your personal data and get more accurate the more you log.
                </div>

              </div>
            </div>

          </div>
        ) : (
          <div className="await-card" style={{ animation: "scr-in 0.3s 0.1s ease both" }}>
            <div className="await-icon">
              <BarChart3 size={22}/>
            </div>
            <div>
              <div className="await-title">Your results will appear here</div>
              <p className="await-sub">
                Pick a life area, drag the sliders to represent a habit change you're curious about, then hit <strong style={{ color: "var(--brand)" }}>Run Simulation</strong>. Syntra will project how that change could affect your Health, Finance, and Career scores over the next 6 months.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 56, borderTop: "1px solid var(--border)", paddingTop: 20, textAlign: "center", color: "var(--txt-muted)", fontSize: "0.76rem", fontWeight: 600 }}>
          Syntra · What-If Simulator · Projections are estimates based on your logged data
        </div>

      </div>
    </div>
  );
}

export default function SimulatorPageWrapper() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#F4F6FB" }}>
        <Loader2 size={36} style={{ color: "#0047D4", animation: "spin 1.1s linear infinite" }}/>
      </div>
    }>
      <SimulatorPage />
    </Suspense>
  );
}