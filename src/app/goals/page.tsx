"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import {
  HeartPulse, Wallet, Briefcase, Trash2, Target,
  CheckCircle2, ArrowLeft, Plus, Rocket, Calendar,
  Sparkles, Pencil, AlertTriangle, Flag, TrendingUp,
  X, Activity, ChevronRight, BarChart3, Clock, Star,
  Menu, Home, Trophy, Award, Flame, Zap, Lock,
  Shield, Crown, Medal, ChevronUp,
} from "lucide-react";

/* ─── TYPES ──────────────────────────────────────────────────────── */
type Milestone = { _id?: string; text: string; completed: boolean };
type Goal = {
  _id?: string; title: string;
  domain: "health" | "finance" | "career";
  priority: string; targetDate?: string;
  milestones?: Milestone[];
};
type Screen = "home" | "goals-list" | "add-goal" | "gamification";

/* ─── DESIGN TOKENS ──────────────────────────────────────────────── */
const DC = {
  health:  { label: "Health",  color: "#16a34a", bg: "rgba(22,163,74,0.08)",   border: "rgba(22,163,74,0.18)",  icon: <HeartPulse size={16}/> },
  finance: { label: "Finance", color: "#0369a1", bg: "rgba(3,105,161,0.08)",   border: "rgba(3,105,161,0.18)",  icon: <Wallet size={16}/>     },
  career:  { label: "Career",  color: "#7c3aed", bg: "rgba(124,58,237,0.08)",  border: "rgba(124,58,237,0.18)", icon: <Briefcase size={16}/>  },
};
const DC_FORM = {
  health:  { label: "Health",  color: "#16a34a", bg: "#dcfce7", icon: <HeartPulse size={16}/> },
  finance: { label: "Finance", color: "#0369a1", bg: "#e0f2fe", icon: <Wallet size={16}/>     },
  career:  { label: "Career",  color: "#7c3aed", bg: "#ede9fe", icon: <Briefcase size={16}/>  },
};
const PRIO = {
  high:   { color: "#dc2626", bg: "rgba(220,38,38,0.07)",   label: "High",   emoji: "🔥" },
  medium: { color: "#d97706", bg: "rgba(217,119,6,0.07)",   label: "Medium", emoji: "⚡" },
  low:    { color: "#16a34a", bg: "rgba(22,163,74,0.07)",   label: "Low",    emoji: "🌿" },
};
const BRAND = "#0047D4";

const SCREEN_COPY: Record<Screen, { title: string; phrases: string[]; sub: string }> = {
  "home":           { title: "Overview",        phrases: ["Goal Overview", "Track Your Progress", "Build Momentum"],                      sub: "A live snapshot of your goals, milestones, and progress." },
  "goals-list":     { title: "My Goals",        phrases: ["My Goals", "Stay On Track", "Progress Every Day"],                             sub: "Manage and complete all your active goals." },
  "add-goal":       { title: "Add Goal",        phrases: ["Create A Goal", "Define Your Target", "Build Your Roadmap"],                   sub: "Set a clear target, break it into steps, and start moving." },
  "gamification":   { title: "Achievement Hub", phrases: ["Achievement Hub", "Level Up Your Life", "Track. Earn. Grow.", "Build Winning Habits"], sub: "Transform goals into achievements through streaks, XP, badges, challenges, and progress tracking." },
};

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ingestion",  label: "Ingestion" },
  { href: "/goals",      label: "Goals" },
  { href: "/simulator",  label: "Simulator" },
  { href: "/insights",   label: "Insights" },
  { href: "/profile",    label: "Profile" },
];

/* ─── GAMIFICATION DATA ──────────────────────────────────────────── */
const STREAK_DAYS = ["M","T","W","T","F","S","S"];
const STREAK_DONE = [true,true,true,true,true,true,false];

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
function Typewriter({ phrases }: { phrases: string[] }) {
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
      <span style={{ display:"inline-block", width:"2px", height:"1em", background:BRAND, marginLeft:"3px", verticalAlign:"text-bottom", borderRadius:"1px", animation:"cur-blink 1s step-end infinite" }}/>
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
            <Link key={l.href} href={l.href} className={`top-nav-link${l.href === "/goals" ? " top-nav-link-active" : ""}`}>{l.label}</Link>
          ))}
        </nav>
        <button className="top-nav-hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>
      <div className={`top-nav-mobile-menu${menuOpen ? " open" : ""}`}>
        {NAV_LINKS.map(l => (
          <Link key={l.href} href={l.href} className={`top-nav-mobile-link${l.href === "/goals" ? " active" : ""}`} onClick={() => setMenuOpen(false)}>{l.label}</Link>
        ))}
      </div>
    </div>
  );
}

/* ─── DESKTOP NAV ITEM ───────────────────────────────────────────── */
function NavItem({ icon, label, sub, active, onClick, badge }: {
  icon: React.ReactNode; label: string; sub?: string; active: boolean;
  onClick: () => void; badge?: number;
}) {
  return (
    <button className={`nav-item${active ? " nav-item-active" : ""}`} onClick={onClick}>
      <div className="nav-item-icon">{icon}</div>
      <div className="nav-item-text">
        <span className="nav-item-label">{label}</span>
        {sub && <span className="nav-item-sub">{sub}</span>}
      </div>
      {badge !== undefined && badge > 0 && <span className="nav-badge">{badge}</span>}
      <ChevronRight size={13} className="nav-arrow" />
    </button>
  );
}

/* ─── STAT CARD ──────────────────────────────────────────────────── */
function StatCard({ icon, iconBg, iconColor, value, suffix, label, ring }: {
  icon: React.ReactNode; iconBg: string; iconColor: string;
  value: string | number; suffix?: string; label: string;
  ring?: { pct: number; color: string };
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className="stat-icon" style={{ background: iconBg, color: iconColor }}>{icon}</div>
        {ring && (
          <div style={{ position:"relative", width:46, height:46, flexShrink:0 }}>
            <svg width="46" height="46" style={{ transform:"rotate(-90deg)", position:"absolute", inset:0 }}>
              <circle cx="23" cy="23" r="18" fill="none" stroke="#e8edf5" strokeWidth="4"/>
              <circle cx="23" cy="23" r="18" fill="none" stroke={ring.color} strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(ring.pct/100)*2*Math.PI*18} ${2*Math.PI*18}`}
                style={{ transition:"stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)" }}
              />
            </svg>
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.58rem", fontWeight:800, color:ring.color }}>
              {ring.pct}%
            </div>
          </div>
        )}
      </div>
      <div className="stat-value">{value}{suffix && <span className="stat-suffix">{suffix}</span>}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/* ─── GOAL CARD ──────────────────────────────────────────────────── */
function GoalCard({ goal, onToggle, onEdit, onDelete, floatId }: {
  goal: Goal; onToggle: (g:string,m:string,d:boolean)=>void;
  onEdit:(g:Goal)=>void; onDelete:(id:string)=>void; floatId:string|null;
}) {
  const [open, setOpen] = useState(false);
  const dc = DC[goal.domain];
  const total = goal.milestones?.length ?? 0;
  const done  = goal.milestones?.filter(m => m.completed).length ?? 0;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const daysLeft = goal.targetDate
    ? Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000))
    : null;
  const p = PRIO[goal.priority as keyof typeof PRIO] || PRIO.medium;
  const isOverdue = daysLeft === 0;
  return (
    <div className={`goal-card${open ? " goal-card-open" : ""}`}>
      <div className="goal-card-bar" style={{ background: dc.color }}/>
      <div className="goal-card-body">
        <div className="goal-card-header">
          <div className="goal-card-domain-icon" style={{ background:dc.bg, color:dc.color, border:`1px solid ${dc.border}` }}>{dc.icon}</div>
          <div className="goal-card-meta" onClick={() => total > 0 && setOpen(o => !o)} style={{ cursor: total > 0 ? "pointer" : "default" }}>
            <div className="goal-card-title">{goal.title}</div>
            <div className="goal-card-tags">
              <span className="tag" style={{ background:p.bg, color:p.color }}>{p.emoji} {p.label}</span>
              <span className="tag tag-neutral">{dc.label}</span>
              {daysLeft !== null && (
                <span className="tag" style={{ background: isOverdue ? "rgba(220,38,38,0.07)" : "rgba(0,71,212,0.06)", color: isOverdue ? "#dc2626" : BRAND }}>
                  <Clock size={9}/>&nbsp;{isOverdue ? "Overdue" : `${daysLeft}d left`}
                </span>
              )}
            </div>
          </div>
          {total > 0 && (
            <div className="goal-card-ring" onClick={() => setOpen(o => !o)}>
              <div style={{ position:"relative", width:52, height:52, cursor:"pointer" }}>
                <svg width="52" height="52" style={{ transform:"rotate(-90deg)", position:"absolute", inset:0 }}>
                  <circle cx="26" cy="26" r="21" fill="none" stroke="#e8edf5" strokeWidth="4.5"/>
                  <circle cx="26" cy="26" r="21" fill="none" stroke={dc.color} strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeDasharray={`${(pct/100)*2*Math.PI*21} ${2*Math.PI*21}`}
                    style={{ transition:"stroke-dasharray 1s ease", filter:`drop-shadow(0 0 5px ${dc.color}55)` }}
                  />
                </svg>
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:"0.64rem", fontWeight:800, color:dc.color, lineHeight:1 }}>{pct}%</span>
                </div>
              </div>
              <span className="goal-card-ring-label">{done}/{total}</span>
            </div>
          )}
          <div className="goal-card-actions">
            <button className="gc-btn" onClick={() => onEdit(goal)} title="Edit"><Pencil size={12}/></button>
            <button className="gc-btn gc-btn-del" onClick={() => goal._id && onDelete(goal._id)} title="Delete"><Trash2 size={12}/></button>
          </div>
        </div>
        {total > 0 && (
          <div className="goal-card-progress-track">
            <div className="goal-card-progress-fill" style={{ width:`${pct}%`, background:dc.color }}/>
          </div>
        )}
        {open && total > 0 && (
          <div className="goal-card-milestones">
            {goal.milestones?.map(m => (
              <div key={m._id} className="ms-check-row">
                <div
                  className={`ms-checkbox${m.completed ? " ms-checkbox-done" : ""}`}
                  style={m.completed ? { background:dc.color, borderColor:dc.color } : {}}
                  onClick={() => goal._id && m._id && onToggle(goal._id, m._id, m.completed)}
                >
                  {m.completed && <CheckCircle2 size={10} color="#fff"/>}
                </div>
                <span className={`ms-check-text${m.completed ? " ms-check-done" : ""}`}>{m.text}</span>
                {floatId === m._id && <span className="xp-float">+100 XP 🎉</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ANIMATED PROGRESS BAR ─────────────────────────────────────── */
function ProgressBar({ pct, color, height = 8, animated = false }: {
  pct: number; color: string; height?: number; animated?: boolean;
}) {
  return (
    <div style={{ height, background:"#EEF1F8", borderRadius:9999, overflow:"hidden", position:"relative" }}>
      <div style={{
        height:"100%", width:`${pct}%`, background:color, borderRadius:9999,
        transition:"width 1.2s cubic-bezier(0.16,1,0.3,1)",
        boxShadow: animated ? `0 0 12px ${color}66` : "none",
        position:"relative",
        overflow:"hidden"
      }}>
        <div style={{
          position:"absolute", inset:0,
          background:"linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)",
          animation:"progress-shine 2s infinite"
        }}/>
      </div>
    </div>
  );
}

/* ─── GAMIFICATION SCREEN ────────────────────────────────────────── */
function GamificationScreen({ 
  goals, 
  gamification, 
  badges, 
  onCompleteChallenge,
  aiChallenge
}: { 
  goals: Goal[]; 
  gamification: { totalPoints: number; currentStreak: number; lastLogDate: string | null; lastChallengeDate?: string | null };
  badges: string[];
  onCompleteChallenge: () => Promise<void>;
  aiChallenge: string | null;
}) {
  const totalMs  = goals.reduce((a, g) => a + (g.milestones?.length ?? 0), 0);
  const doneMs   = goals.reduce((a, g) => a + (g.milestones?.filter(m => m.completed).length ?? 0), 0);

  const xpTotal  = gamification.totalPoints;
  const currentLevel = Math.floor(xpTotal / 1000) + 1;
  const xpLevel  = 1000;
  const xpInCurrentLevel = xpTotal % 1000;
  const xpPct    = Math.min(100, Math.round((xpInCurrentLevel / xpLevel) * 100));
  const xpRemaining = xpLevel - xpInCurrentLevel;

  const todayStr = new Date().toDateString();
  const dbCompleted = gamification.lastChallengeDate
    ? new Date(gamification.lastChallengeDate).toDateString() === todayStr
    : false;

  const [waterCount, setWaterCount] = useState(dbCompleted ? 8 : 6);
  const [localCompleted, setLocalCompleted] = useState(false);

  const challengeCompleted = dbCompleted || localCompleted;

  useEffect(() => {
    setWaterCount(dbCompleted ? 8 : 6);
  }, [dbCompleted]);

  const handleWaterProgress = async () => {
    if (challengeCompleted) return;
    const nextCount = Math.min(8, waterCount + 1);
    setWaterCount(nextCount);
    if (nextCount === 8) {
      setLocalCompleted(true);
      await onCompleteChallenge();
    }
  };

  const handleDirectComplete = async () => {
    if (challengeCompleted) return;
    setLocalCompleted(true);
    await onCompleteChallenge();
  };

  const isFallbackChallenge = !aiChallenge || aiChallenge.includes("Log all three domains today") || aiChallenge.toLowerCase().includes("insufficient data");

  // Streak Week generator
  const daysOfWeek = ["Su", "M", "T", "W", "Th", "F", "S"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastLog = gamification.lastLogDate ? new Date(gamification.lastLogDate) : null;
  if (lastLog) lastLog.setHours(0, 0, 0, 0);

  const lastLogStr = lastLog?.toDateString();
  const yesterdayStr = new Date(Date.now() - 86400000).toDateString();

  const loggedToday = lastLogStr === todayStr;
  const loggedYesterday = lastLogStr === yesterdayStr;
  const isStreakBroken = !loggedToday && !loggedYesterday;

  const displayStreak = isStreakBroken ? 0 : gamification.currentStreak;

  const streakWeek = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    const dayLabel = daysOfWeek[d.getDay()];

    let done = false;
    if (!isStreakBroken && lastLog) {
      const daysSinceLastLog = Math.round((lastLog.getTime() - d.getTime()) / 86400000);
      if (daysSinceLastLog >= 0 && daysSinceLastLog < gamification.currentStreak) {
        done = true;
      }
    }
    const isToday = i === 6;
    return {
      label: dayLabel,
      done,
      current: isToday
    };
  });

  // Dynamic Timeline
  const completedMilestones = goals
    .flatMap(g => (g.milestones || []).filter(m => m.completed).map(m => ({
      icon: "🏆",
      label: `Completed step: "${m.text}"`,
      xp: "+100 XP",
      color: "#d97706"
    })));
  
  const earnedBadgesTimeline = badges.map(b => {
    const matchingBadge = ALL_BADGES.find(ab => ab.id === b);
    return {
      icon: matchingBadge?.icon || "⭐",
      label: `Earned "${b}" Badge`,
      xp: null,
      color: matchingBadge?.color || "#7c3aed"
    };
  });

  const timelineItems = [...earnedBadgesTimeline, ...completedMilestones].slice(0, 4);
  if (timelineItems.length === 0) {
    timelineItems.push({
      icon: "🌱",
      label: "Started your journey! Set your first goal.",
      xp: "+60 XP",
      color: "#16a34a"
    });
  }

  // Rewards definitions
  const rewards = [
    { xp: 100,  label: "Bronze Tier",  icon: <Medal size={20}/>,  color: "#cd7f32", done: xpTotal >= 100  },
    { xp: 500,  label: "Silver Tier",  icon: <Shield size={20}/>, color: "#94a3b8", done: xpTotal >= 500  },
    { xp: 1000, label: "Gold Tier",    icon: <Award size={20}/>,  color: "#d97706", done: xpTotal >= 1000 },
    { xp: 2000, label: "Master Tier",  icon: <Crown size={20}/>,  color: "#7c3aed", done: xpTotal >= 2000 },
  ];

  return (
    <div className="screen">
      {/* PAGE HEADER */}
      <div className="page-top">
        <div className="page-title-block">
          <div className="page-eyebrow">
            <div className="page-eyebrow-dot"/>
            <span className="page-eyebrow-text">Achievement Hub</span>
          </div>
          <h1 className="page-title"><Typewriter phrases={SCREEN_COPY["gamification"].phrases}/></h1>
          <p className="page-subtitle">{SCREEN_COPY["gamification"].sub}</p>
        </div>
      </div>

      <div className="body-pad">

        {/* ── SECTION 1: PROGRESS OVERVIEW BAR ── */}
        <div className="section-hd"><span className="section-hd-label">Progress Overview</span><div className="section-hd-rule"/></div>
        <div className="progress-overview-bar">
          <div className="pob-card">
            <div className="pob-icon-wrap" style={{ background:"rgba(0,71,212,0.1)", color:BRAND }}><Target size={18}/></div>
            <div className="pob-value">{goals.length}</div>
            <div className="pob-label">Active Goals</div>
          </div>
          <div className="pob-divider"/>
          <div className="pob-card">
            <div className="pob-icon-wrap" style={{ background:"rgba(22,163,74,0.1)", color:"#16a34a" }}><Flag size={18}/></div>
            <div className="pob-value">{doneMs}</div>
            <div className="pob-label">Milestones Completed</div>
          </div>
          <div className="pob-divider"/>
          <div className="pob-card">
            <div className="pob-icon-wrap pob-flame" style={{ background:"rgba(220,38,38,0.1)", color:"#ef4444" }}><Flame size={18}/></div>
            <div className="pob-value">{displayStreak}</div>
            <div className="pob-label">Current Streak</div>
          </div>
          <div className="pob-divider"/>
          <div className="pob-card">
            <div className="pob-icon-wrap" style={{ background:"rgba(217,119,6,0.1)", color:"#d97706" }}><Star size={18}/></div>
            <div className="pob-value">{xpTotal}</div>
            <div className="pob-label">XP Points</div>
          </div>
          <div className="pob-divider"/>
          <div className="pob-card pob-card-level">
            <div className="pob-icon-wrap" style={{ background:"rgba(124,58,237,0.1)", color:"#7c3aed" }}><Trophy size={18}/></div>
            <div className="pob-value">Level {currentLevel}</div>
            <div style={{ marginTop:8, width:"100%" }}>
              <ProgressBar pct={xpPct} color="#7c3aed" height={5}/>
              <div style={{ fontSize:"0.6rem", color:"var(--text-muted)", marginTop:4, textAlign:"center" }}>{xpInCurrentLevel}/{xpLevel} XP</div>
            </div>
          </div>
        </div>

        {/* ── SECTION 2 & 3: DAILY CHALLENGE + STREAK SIDE BY SIDE ── */}
        <div className="gam-two-col">

          {/* DAILY CHALLENGE */}
          <div>
            <div className="section-hd" style={{ marginBottom:0 }}><span className="section-hd-label">Today's Challenge</span><div className="section-hd-rule"/></div>
            <div className="daily-challenge-card">
              <div className="dc-header">
                <div className="dc-icon-wrap">
                  <Target size={22} color="#fff"/>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="dc-eyebrow">Today's Challenge</div>
                  <div className="dc-title">
                    {isFallbackChallenge ? "Drink 8 Glasses of Water" : "Personalized Nudge"}
                  </div>
                  {!isFallbackChallenge && (
                    <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5, fontWeight: 500 }}>
                      {aiChallenge}
                    </p>
                  )}
                  <div className="dc-xp">+20 XP</div>
                </div>
              </div>
              {isFallbackChallenge ? (
                <>
                  <div style={{ margin:"18px 0 10px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <span style={{ fontSize:"0.78rem", fontWeight:600, color:"var(--text-secondary)" }}>Progress</span>
                      <span style={{ fontSize:"0.78rem", fontWeight:800, color:BRAND }}>{waterCount} / 8 Glasses</span>
                    </div>
                    <ProgressBar pct={Math.round((waterCount/8)*100)} color="url(#brandGrad)" height={10} animated/>
                    <svg width="0" height="0"><defs>
                      <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0047D4"/>
                        <stop offset="100%" stopColor="#2A18E8"/>
                      </linearGradient>
                    </defs></svg>
                  </div>
                  <div style={{ display:"flex", gap:10, marginTop:16 }}>
                    <button className="dc-cta-btn" onClick={handleWaterProgress} disabled={challengeCompleted}>
                      {challengeCompleted ? "Challenge Completed! 🎉" : "Mark Progress"}
                    </button>
                    {waterCount > 0 && !challengeCompleted && <button className="dc-reset-btn" onClick={() => setWaterCount(0)}>Reset</button>}
                  </div>
                </>
              ) : (
                <div style={{ display:"flex", gap:10, marginTop:24 }}>
                  <button className="dc-cta-btn" onClick={handleDirectComplete} disabled={challengeCompleted}>
                    {challengeCompleted ? "Challenge Completed! 🎉" : "Mark Completed"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* STREAK TRACKER */}
          <div>
            <div className="section-hd" style={{ marginBottom:0 }}><span className="section-hd-label">Streak Tracker</span><div className="section-hd-rule"/></div>
            <div className="streak-card">
              <div className="streak-header">
                <div className="streak-flame-wrap">
                  <Flame size={28} color="#ef4444" className="streak-flame-icon"/>
                </div>
                <div>
                  <div className="streak-count">{displayStreak} <span style={{ fontSize:"1rem", fontWeight:600, color:"var(--text-secondary)" }}>Days</span></div>
                  <div className="streak-tagline">{displayStreak > 0 ? "Keep It Up! 🔥" : "Complete daily logs to build a streak!"}</div>
                </div>
              </div>
              <div className="streak-week">
                {streakWeek.map((day, i) => (
                  <div key={i} className="streak-day-col">
                    <div className="streak-day-label">{day.label}</div>
                    <div className={`streak-day-dot${day.done ? " done" : ""}${day.current ? " current" : ""}`}>
                      {day.done && <CheckCircle2 size={12} color="#fff"/>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="streak-footer">
                <div style={{ fontSize:"0.71rem", color:"var(--text-muted)" }}>Complete today's reflections to extend your streak!</div>
              </div>
            </div>
          </div>

        </div>

        {/* ── SECTION 4: BADGES ── */}
        <div className="section-hd"><span className="section-hd-label">Badges & Achievements</span><div className="section-hd-rule"/></div>
        <div className="badges-card">
          <div className="badges-header">
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:"rgba(212,160,23,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Trophy size={20} color="#d97706"/>
              </div>
              <div>
                <div style={{ fontFamily:"DM Sans,sans-serif", fontSize:"0.95rem", fontWeight:800, color:"var(--text-primary)" }}>Badges & Achievements</div>
                <div style={{ fontSize:"0.69rem", color:"var(--text-muted)" }}>Earn badges and level up</div>
              </div>
            </div>
          </div>
          <div className="badges-grid">
            {ALL_BADGES.map((b, i) => {
              const isUnlocked = badges.includes(b.id);
              if (isUnlocked) {
                return (
                  <div key={b.id} className="badge-item badge-unlocked" style={{ "--badge-color": b.color } as React.CSSProperties}>
                    <div className="badge-icon-wrap badge-icon-unlocked" style={{ background:`${b.color}18`, borderColor:`${b.color}44` }}>
                      <span style={{ fontSize:"1.6rem" }}>{b.icon}</span>
                    </div>
                    <div className="badge-label">{b.label}</div>
                    <div className="badge-level" style={{ color:b.color }}>{b.level}</div>
                  </div>
                );
              } else {
                return (
                  <div key={b.id} className="badge-item badge-locked">
                    <div className="badge-icon-wrap badge-icon-locked">
                      <Lock size={18} color="#94a3b8"/>
                    </div>
                    <div className="badge-label" style={{ color:"var(--text-muted)" }}>{b.label}</div>
                    <div className="badge-level" style={{ color:"var(--text-muted)" }}>Locked</div>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* ── SECTION 5 & 6: XP SYSTEM + TIMELINE SIDE BY SIDE ── */}
        <div className="gam-two-col">

          {/* XP SYSTEM */}
          <div>
            <div className="section-hd" style={{ marginBottom:0 }}><span className="section-hd-label">XP Progress</span><div className="section-hd-rule"/></div>
            <div className="xp-card">
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                <div style={{ width:48, height:48, borderRadius:14, background:"linear-gradient(135deg,#d97706,#f59e0b)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(217,119,6,0.3)" }}>
                  <Star size={22} color="#fff"/>
                </div>
                <div>
                  <div style={{ fontFamily:"DM Sans,sans-serif", fontSize:"0.88rem", fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.06em" }}>Current XP</div>
                  <div style={{ fontFamily:"DM Sans,sans-serif", fontSize:"2rem", fontWeight:900, color:"var(--text-primary)", letterSpacing:"-0.04em", lineHeight:1 }}>{xpTotal}</div>
                </div>
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:"0.78rem", fontWeight:600, color:"var(--text-secondary)" }}>Next Level: {xpLevel * currentLevel} XP</span>
                  <span style={{ fontSize:"0.78rem", fontWeight:800, color:"#d97706" }}>{xpPct}%</span>
                </div>
                <div style={{ height:12, background:"#EEF1F8", borderRadius:9999, overflow:"hidden", position:"relative" }}>
                  <div style={{
                    height:"100%", width:`${xpPct}%`,
                    background:"linear-gradient(90deg,#d97706,#f59e0b)",
                    borderRadius:9999, transition:"width 1.4s cubic-bezier(0.16,1,0.3,1)",
                    boxShadow:"0 0 14px rgba(217,119,6,0.4)",
                    position:"relative",
                    overflow:"hidden"
                  }}>
                    <div style={{
                      position:"absolute", inset:0,
                      background:"linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)",
                      animation:"progress-shine 2s infinite"
                    }}/>
                  </div>
                </div>
              </div>
              <div className="xp-remaining-badge">
                <ChevronUp size={14}/> {xpRemaining} XP Remaining to Level {currentLevel + 1}
              </div>
              <div style={{ display:"flex", justifyContent:"center", marginTop:16 }}>
                <div className="level-badge-display">
                  <Trophy size={16} color="#7c3aed"/>
                  <span>Level {currentLevel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ACHIEVEMENT TIMELINE */}
          <div>
            <div className="section-hd" style={{ marginBottom:0 }}><span className="section-hd-label">Recent Achievements</span><div className="section-hd-rule"/></div>
            <div className="timeline-card">
              {timelineItems.map((item, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-connector">
                    <div className="timeline-dot" style={{ background:item.color, boxShadow:`0 0 10px ${item.color}55` }}>
                      <span style={{ fontSize:"0.8rem" }}>{item.icon}</span>
                    </div>
                    {i < timelineItems.length - 1 && <div className="timeline-line"/>}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-label">{item.label}</div>
                    {item.xp && (
                      <div className="timeline-xp" style={{ color:item.color }}>{item.xp}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── SECTION 7: MOTIVATION INSIGHT CARD ── */}
        <div className="section-hd"><span className="section-hd-label">Motivation Insight</span><div className="section-hd-rule"/></div>
        <div className="motivation-card">
          <div className="motivation-glow"/>
          <div style={{ display:"flex", alignItems:"center", gap:14, position:"relative", zIndex:1 }}>
            <div style={{ width:52, height:52, borderRadius:16, background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <TrendingUp size={24} color="#fff"/>
            </div>
            <div>
              <div style={{ fontFamily:"DM Sans,sans-serif", fontSize:"1.1rem", fontWeight:800, color:"#fff", marginBottom:4 }}>
                You're performing better than last week.
              </div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.25)", borderRadius:9999, padding:"4px 12px" }}>
                <span style={{ fontSize:"0.78rem", fontWeight:800, color:"#fff" }}>+18% productivity increase</span>
              </div>
            </div>
          </div>
          <div className="motivation-sparkles">✨</div>
        </div>

        {/* ── SECTION 8: REWARDS LADDER ── */}
        <div className="section-hd"><span className="section-hd-label">Rewards Ladder</span><div className="section-hd-rule"/></div>
        <div className="rewards-ladder">
          {rewards.map((r, i) => (
            <div key={i} className={`reward-step${r.done ? " reward-done" : ""}`}>
              {i > 0 && <div className="reward-connector" style={{ background: rewards[i-1].done ? "#22c55e" : "#e2e8f0" }}/>}
              <div className="reward-icon-wrap" style={{
                background: r.done ? `${r.color}18` : "#f1f5f9",
                border: r.done ? `2px solid ${r.color}44` : "2px solid #e2e8f0",
                color: r.done ? r.color : "#94a3b8",
                boxShadow: r.done ? `0 4px 16px ${r.color}33` : "none",
              }}>
                {r.icon}
                {r.done && <div className="reward-check"><CheckCircle2 size={12} color="#22c55e"/></div>}
              </div>
              <div className="reward-xp" style={{ color: r.done ? r.color : "var(--text-muted)" }}>{r.xp} XP</div>
              <div className="reward-label" style={{ color: r.done ? "var(--text-primary)" : "var(--text-muted)" }}>{r.label}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────────── */
export default function GoalsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [floatId, setFloatId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState<Goal["domain"]>("health");
  const [priority, setPriority] = useState("medium");
  const [targetDate, setTargetDate] = useState("");
  const [milestones, setMilestones] = useState<string[]>([]);
  const [msInput, setMsInput] = useState("");

  const { data, mutate } = useSWR<any>("/api/goals", fetcher, {
    dedupingInterval: 300000, revalidateOnFocus: false, errorRetryCount: 1,
  });
  const { data: aiData } = useSWR<any>("/api/ai/recommend", fetcher, {
    dedupingInterval: 300000, revalidateOnFocus: false, errorRetryCount: 1,
  });
  const goals: Goal[] = data?.goals || [];
  const badges: string[] = data?.badges || [];
  const gamification = data?.gamification || { totalPoints: 0, currentStreak: 0, lastLogDate: null, lastChallengeDate: null };
  useEffect(() => { setMounted(true); }, []);

  const goScreen = (s: Screen) => { setScreen(s); setDrawerOpen(false); };
  const addMs = () => { if (!msInput.trim()) return; setMilestones(p => [...p, msInput.trim()]); setMsInput(""); };
  const removeMs = (i: number) => setMilestones(p => p.filter((_, idx) => idx !== i));
  const toggleSugg = (s: string) => setMilestones(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const generateSugg = async () => {
    if (!title.trim()) return;
    setSuggestLoading(true); setAiSuggestions([]);
    try {
      const res = await fetch("/api/goals/milestones/suggest", {
        method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include",
        body: JSON.stringify({ title, domain, priority }),
      });
      const d = await res.json();
      if (d.success && Array.isArray(d.suggestions)) setAiSuggestions(d.suggestions);
    } catch {} finally { setSuggestLoading(false); }
  };

  const resetForm = () => {
    setTitle(""); setDomain("health"); setPriority("medium"); setTargetDate("");
    setMilestones([]); setMsInput(""); setAiSuggestions([]);
    setEditId(null); setMsg(""); setSaved(false);
  };

  const startEdit = (g: Goal) => {
    resetForm();
    setEditId(g._id || null);
    setTitle(g.title); setDomain(g.domain); setPriority(g.priority === "med" ? "medium" : g.priority);
    setTargetDate(g.targetDate ? new Date(g.targetDate).toISOString().split("T")[0] : "");
    setMilestones(g.milestones?.map(m => m.text) || []);
    setScreen("add-goal");
  };

  const handleSave = async () => {
    if (!title.trim()) { setMsg("Please enter a goal title."); return; }
    setSaving(true); setMsg("");
    try {
      const isEdit = !!editId;
      const originalGoal = isEdit ? goals.find(g => g._id === editId) : null;
      
      const body = isEdit
        ? {
            goalId: editId,
            title,
            domain,
            priority,
            targetDate: targetDate || undefined,
            milestones: milestones.map(mText => {
              const orig = originalGoal?.milestones?.find(om => om.text === mText);
              return {
                _id: orig?._id,
                text: mText,
                completed: orig ? orig.completed : false
              };
            })
          }
        : {
            title,
            domain,
            priority,
            targetDate: targetDate || undefined,
            milestones: milestones.map(mText => ({ text: mText, completed: false }))
          };

      const res = await fetch("/api/goals", {
        method: isEdit ? "PATCH" : "POST",
        headers:{"Content-Type":"application/json"}, credentials:"include",
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.success) {
        mutate({ goals: d.goals }, false);
        setSaved(true);
        setTimeout(() => { resetForm(); setScreen("goals-list"); }, 1800);
      } else setMsg(d.error || "Failed to save goal.");
    } catch { setMsg("Save failed. Please try again."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (gid: string) => {
    try {
      const res = await fetch("/api/goals", {
        method:"DELETE", headers:{"Content-Type":"application/json"}, credentials:"include",
        body: JSON.stringify({ goalId: gid }),
      });
      const d = await res.json();
      if (d.success) mutate({ goals: d.goals }, false);
    } catch {}
  };

  const handleToggle = async (gid: string, mid: string, wasDone: boolean) => {
    try {
      const res = await fetch("/api/goals/milestone", {
        method:"PATCH", headers:{"Content-Type":"application/json"}, credentials:"include",
        body: JSON.stringify({ goalId:gid, milestoneId:mid, completed:!wasDone }),
      });
      const d = await res.json();
      if (d.success) {
        mutate(
          {
            ...data,
            goals: d.goals,
            badges: d.badges,
            gamification: d.gamification
          },
          false
        );
        if (!wasDone) { setFloatId(mid); setTimeout(() => setFloatId(null), 1400); }
      }
    } catch {}
  };

  const handleCompleteChallenge = async () => {
    try {
      const res = await fetch("/api/goals/gamification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "complete-challenge" })
      });
      const d = await res.json();
      if (d.success) {
        mutate(
          {
            ...data,
            gamification: d.gamification,
            badges: d.badges
          },
          false
        );
      }
    } catch (err) {
      console.error("Failed to complete daily challenge", err);
    }
  };

  if (!mounted) return null;

  const dfc = DC_FORM[domain];
  const daysLeft = targetDate ? Math.max(0, Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86400000)) : null;
  const totalMs  = goals.reduce((a, g) => a + (g.milestones?.length ?? 0), 0);
  const doneMs   = goals.reduce((a, g) => a + (g.milestones?.filter(m => m.completed).length ?? 0), 0);
  const overallPct = totalMs > 0 ? Math.round((doneMs / totalMs) * 100) : 0;

  return (
    <div className="root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --brand:        #0047D4;
          --brand-light:  #EEF3FF;
          --brand-mid:    #C7D7FA;
          --surface:      #FFFFFF;
          --bg:           #EDF0F7;
          --bg-deep:      #E2E6F0;
          --border:       #D6DCE8;
          --border-hover: #A8BADE;
          --text-primary: #0D1117;
          --text-secondary:#52637A;
          --text-muted:   #8A9BB5;
          --shadow-sm:    0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05);
          --shadow-md:    0 4px 16px rgba(0,0,0,0.09), 0 2px 6px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03);
          --shadow-lg:    0 8px 28px rgba(0,71,212,0.13), 0 3px 10px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,71,212,0.06);
          --shadow-hover: 0 16px 44px rgba(0,71,212,0.16), 0 4px 14px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,71,212,0.08);
          --shadow-card:  0 2px 8px rgba(0,0,0,0.07), 0 6px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04);
          --nav-h:        70px;
          --mob-tab-h:    64px;
          --sidebar-w:    272px;
        }

        body { background: var(--bg-deep); font-family:"Inter",sans-serif; -webkit-font-smoothing:antialiased; color:var(--text-primary); }

        @keyframes cur-blink  { 50% { opacity:0; } }
        @keyframes screen-in  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fade-up    { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scale-in   { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
        @keyframes float-xp   { 0%{opacity:0;transform:translateY(4px) scale(0.8);}15%{opacity:1;transform:translateY(0) scale(1);}85%{opacity:1;transform:translateY(-20px);}100%{opacity:0;transform:translateY(-28px) scale(0.85);} }
        @keyframes lp-pulse   { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:.65;transform:scale(1.35);} }
        @keyframes drawer-in  { from{transform:translateX(-100%);}to{transform:translateX(0);} }
        @keyframes overlay-in { from{opacity:0;}to{opacity:1;} }
        @keyframes flame-pulse { 0%,100%{transform:scale(1) rotate(-2deg);}50%{transform:scale(1.18) rotate(2deg);} }
        @keyframes badge-glow  { 0%,100%{box-shadow:0 0 0 0 transparent;}50%{box-shadow:0 0 18px 4px var(--badge-color,#7c3aed);} }
        @keyframes xp-fill     { from{width:0;}to{width:var(--target-w,80%);} }
        @keyframes progress-shine { 0%{transform:translateX(-100%);}100%{transform:translateX(400%);} }
        @keyframes current-day-glow { 0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,0.4);border-color:#7c3aed;}50%{box-shadow:0 0 0 6px rgba(124,58,237,0.15);border-color:#a78bfa;} }

        /* ═══════════════════════════════════════
           TOP NAVBAR
        ═══════════════════════════════════════ */
        .top-nav {
          position:fixed;top:0;left:0;width:100%;z-index:500;height:var(--nav-h);
          background:rgba(255,255,255,0.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
          border-bottom:1px solid rgba(214,220,232,0.6);transition:background 0.28s ease,border-color 0.28s ease,box-shadow 0.28s ease;
        }
        .top-nav.top-nav-scrolled { background:#ffffff;border-color:#e2e6f0;box-shadow:0 2px 20px rgba(0,0,0,0.08); }
        .top-nav-inner { max-width:1600px;margin:0 auto;height:100%;display:flex;align-items:center;justify-content:space-between;padding:0 2.5rem; }
        .top-nav-logo { font-family:'DM Sans',sans-serif;font-size:1.55rem;font-weight:300;color:var(--brand);text-decoration:none;letter-spacing:0.2em;text-transform:uppercase;transition:opacity 0.2s; }
        .top-nav-logo:hover { opacity:0.78; }
        .top-nav-logo strong { font-weight:800;letter-spacing:0.1em; }
        .top-nav-links { display:flex;align-items:center;gap:4px; }
        .top-nav-link { font-family:'Inter',sans-serif;font-size:0.84rem;font-weight:500;color:#555;text-decoration:none;padding:7px 14px;border-radius:9999px;transition:all 0.2s;letter-spacing:0.01em; }
        .top-nav-link:hover { background:#f0f4ff;color:var(--brand); }
        .top-nav-link-active { background:var(--brand) !important;color:#fff !important;font-weight:600; }
        .top-nav-hamburger { display:none;flex-direction:column;gap:5px;cursor:pointer;padding:8px;border:1.5px solid #e0e0e0;border-radius:10px;background:#f5f5f5;transition:all 0.2s; }
        .top-nav-hamburger:hover { border-color:var(--brand-mid);background:var(--brand-light); }
        .top-nav-hamburger span { display:block;width:20px;height:2px;background:#333;border-radius:2px; }
        .top-nav-mobile-menu { display:none;flex-direction:column;gap:5px;position:absolute;top:calc(var(--nav-h) + 4px);right:20px;width:210px;padding:12px;border-radius:16px;background:rgba(255,255,255,0.97);backdrop-filter:blur(20px);border:1px solid #e8ebf4;box-shadow:0 12px 40px rgba(0,68,220,0.12);z-index:600; }
        .top-nav-mobile-menu.open { display:flex; }
        .top-nav-mobile-link { font-family:'Inter',sans-serif;font-size:0.88rem;font-weight:500;color:#333;text-decoration:none;padding:10px 14px;border-radius:10px;transition:all 0.16s; }
        .top-nav-mobile-link:hover { background:#f0f4ff;color:var(--brand); }
        .top-nav-mobile-link.active { background:var(--brand-light);color:var(--brand);font-weight:700; }

        /* ═══════════════ LAYOUT SHELL ═══════════════ */
        .root { min-height:100vh;display:flex;flex-direction:column;background:var(--bg-deep); }
        .page-body { display:flex;flex:1;padding-top:var(--nav-h);gap:0; }

        /* ══════════════════════════════════════════════
           DESKTOP SIDEBAR
        ══════════════════════════════════════════════ */
        .left-panel { width:var(--sidebar-w);flex-shrink:0;background:linear-gradient(160deg,#0036BB 0%,#0052E8 45%,#2A18E8 100%);display:flex;flex-direction:column;position:sticky;top:var(--nav-h);height:calc(100vh - var(--nav-h));overflow:hidden;box-shadow:4px 0 24px rgba(0,36,187,0.18),0 -1px 0 rgba(255,255,255,0.08) inset;z-index:10; }
        .left-panel::before { content:'';position:absolute;top:-90px;left:-70px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.12) 0%,transparent 70%);pointer-events:none; }
        .left-panel::after { content:'';position:absolute;bottom:-60px;right:-50px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.07) 0%,transparent 70%);pointer-events:none; }
        .lp-grid { position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px);background-size:44px 44px; }
        .left-panel-top-rule { height:3px;background:linear-gradient(90deg,rgba(255,255,255,0.22),rgba(255,255,255,0.06));flex-shrink:0;position:relative;z-index:2; }
        .lp-brand { padding:20px 20px 16px;position:relative;z-index:2;border-bottom:1px solid rgba(255,255,255,0.1); }
        .lp-logo { display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:9999px;padding:4px 12px;font-size:0.66rem;font-weight:800;color:#fff;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:13px; }
        .lp-logo-dot { width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 8px rgba(74,222,128,0.85);animation:lp-pulse 2.2s infinite; }
        .lp-heading { font-family:"DM Sans",sans-serif;font-size:1.2rem;font-weight:800;color:#fff;letter-spacing:-0.03em;line-height:1.2; }
        .lp-sub { font-size:0.72rem;color:rgba(255,255,255,0.55);margin-top:4px;line-height:1.55; }
        .lp-stats { display:flex;border-bottom:1px solid rgba(255,255,255,0.1);position:relative;z-index:2; }
        .lp-stat { flex:1;padding:12px 10px;text-align:center;border-right:1px solid rgba(255,255,255,0.1); }
        .lp-stat:last-child { border-right:none; }
        .lp-stat-num { font-family:"DM Sans",sans-serif;font-size:1.3rem;font-weight:800;color:#fff;line-height:1; }
        .lp-stat-lbl { font-size:0.57rem;font-weight:700;color:rgba(255,255,255,0.48);text-transform:uppercase;letter-spacing:0.07em;margin-top:3px; }
        .lp-nav { padding:12px 10px;display:flex;flex-direction:column;gap:4px;flex:1;overflow-y:auto;position:relative;z-index:2; }
        .nav-item { width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:13px;border:1px solid transparent;background:transparent;cursor:pointer;text-align:left;transition:all 0.2s cubic-bezier(0.16,1,0.3,1); }
        .nav-item:hover { background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.14); }
        .nav-item-active { background:rgba(255,255,255,0.17) !important;border-color:rgba(255,255,255,0.28) !important;box-shadow:0 4px 14px rgba(0,0,0,0.14); }
        .nav-item-icon { width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.11);border:1px solid rgba(255,255,255,0.16);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;transition:all 0.2s; }
        .nav-item-active .nav-item-icon { background:rgba(255,255,255,0.24);border-color:rgba(255,255,255,0.38); }
        .nav-item-text { flex:1;min-width:0; }
        .nav-item-label { font-family:"DM Sans",sans-serif;font-size:0.83rem;font-weight:700;color:#fff;display:block; }
        .nav-item-sub   { font-size:0.66rem;color:rgba(255,255,255,0.5);display:block;margin-top:1px; }
        .nav-badge { font-size:0.63rem;font-weight:800;background:rgba(255,255,255,0.18);color:#fff;padding:2px 7px;border-radius:9999px;flex-shrink:0; }
        .nav-item-active .nav-badge { background:rgba(255,255,255,0.32); }
        .nav-arrow { color:rgba(255,255,255,0.35);flex-shrink:0;transition:transform 0.2s,color 0.2s; }
        .nav-item:hover .nav-arrow { transform:translateX(2px);color:rgba(255,255,255,0.65); }
        .nav-item-active .nav-arrow { color:rgba(255,255,255,0.65); }
        .lp-domains { padding:0 10px 14px;position:relative;z-index:2; }
        .lp-domains-lbl { font-size:0.59rem;font-weight:700;color:rgba(255,255,255,0.38);text-transform:uppercase;letter-spacing:0.11em;padding:0 4px;margin-bottom:7px; }
        .lp-domain-row { display:flex;align-items:center;gap:9px;padding:7px 10px;border-radius:10px;margin-bottom:2px;transition:background 0.17s;cursor:default; }
        .lp-domain-row:hover { background:rgba(255,255,255,0.07); }
        .lp-domain-icon { width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .lp-domain-name { font-size:0.74rem;font-weight:600;color:rgba(255,255,255,0.8);flex:1; }
        .lp-domain-count { font-family:"JetBrains Mono",monospace;font-size:0.67rem;font-weight:700;color:rgba(255,255,255,0.42); }
        .lp-back { padding:12px 14px;border-top:1px solid rgba(255,255,255,0.1);position:relative;z-index:2; }
        .lp-back-btn { display:inline-flex;align-items:center;gap:7px;font-size:0.74rem;font-weight:600;color:rgba(255,255,255,0.55);cursor:pointer;background:none;border:none;transition:color 0.18s;font-family:"Inter",sans-serif; }
        .lp-back-btn:hover { color:#fff; }

        /* ══════════════════════════════════════════════
           MOBILE TOP BAR
        ══════════════════════════════════════════════ */
        .mob-topbar { display:none;position:sticky;top:var(--nav-h);z-index:200;height:52px;background:linear-gradient(135deg,#0036BB,#0052E8);align-items:center;padding:0 16px;gap:12px;box-shadow:0 2px 12px rgba(0,36,187,0.25); }
        .mob-topbar-menu { width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;flex-shrink:0;transition:background 0.18s; }
        .mob-topbar-menu:hover { background:rgba(255,255,255,0.22); }
        .mob-topbar-brand { display:flex;align-items:center;gap:8px;flex:1; }
        .mob-topbar-dot { width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 8px rgba(74,222,128,0.85);animation:lp-pulse 2.2s infinite;flex-shrink:0; }
        .mob-topbar-logo { font-size:0.72rem;font-weight:800;color:rgba(255,255,255,0.7);letter-spacing:0.13em;text-transform:uppercase; }
        .mob-topbar-title { font-family:"DM Sans",sans-serif;font-size:0.96rem;font-weight:800;color:#fff;letter-spacing:-0.02em; }
        .mob-topbar-action { width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;flex-shrink:0; }

        /* MOBILE DRAWER */
        .mob-drawer-overlay { display:none;position:fixed;inset:0;z-index:700;background:rgba(0,0,0,0.45);backdrop-filter:blur(2px);animation:overlay-in 0.22s ease; }
        .mob-drawer-overlay.open { display:block; }
        .mob-drawer { position:fixed;top:0;left:0;bottom:0;width:min(300px,88vw);background:linear-gradient(160deg,#0036BB 0%,#0052E8 45%,#2A18E8 100%);z-index:800;display:flex;flex-direction:column;overflow:hidden;transform:translateX(-100%);transition:transform 0.28s cubic-bezier(0.32,0.72,0,1);box-shadow:8px 0 40px rgba(0,0,0,0.3); }
        .mob-drawer.open { transform:translateX(0); }
        .mob-drawer-grid { position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.035) 1px,transparent 1px);background-size:44px 44px; }
        .mob-drawer-head { padding:20px 18px 16px;position:relative;z-index:2;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;gap:12px; }
        .mob-drawer-close { width:32px;height:32px;border-radius:9px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;flex-shrink:0;margin-left:auto; }
        .mob-drawer-brand { flex:1; }
        .mob-drawer-logo { display:inline-flex;align-items:center;gap:6px;font-size:0.63rem;font-weight:800;color:rgba(255,255,255,0.7);letter-spacing:0.13em;text-transform:uppercase;margin-bottom:4px; }
        .mob-drawer-title { font-family:"DM Sans",sans-serif;font-size:1.1rem;font-weight:800;color:#fff;letter-spacing:-0.02em; }
        .mob-drawer-stats { display:flex;border-bottom:1px solid rgba(255,255,255,0.1);position:relative;z-index:2; }
        .mob-drawer-stat { flex:1;padding:12px 8px;text-align:center;border-right:1px solid rgba(255,255,255,0.1); }
        .mob-drawer-stat:last-child { border-right:none; }
        .mob-drawer-stat-num { font-family:"DM Sans",sans-serif;font-size:1.25rem;font-weight:800;color:#fff;line-height:1; }
        .mob-drawer-stat-lbl { font-size:0.57rem;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.07em;margin-top:2px; }
        .mob-drawer-nav { padding:12px 10px;display:flex;flex-direction:column;gap:4px;flex:1;overflow-y:auto;position:relative;z-index:2; }
        .mob-drawer-domains { padding:0 10px 14px;position:relative;z-index:2; }
        .mob-drawer-domains-lbl { font-size:0.59rem;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.11em;padding:0 4px;margin-bottom:7px; }
        .mob-drawer-back { padding:12px 14px;border-top:1px solid rgba(255,255,255,0.1);position:relative;z-index:2; }

        /* MOBILE BOTTOM TAB BAR */
        .mob-tabbar { display:none;position:fixed;bottom:0;left:0;right:0;height:var(--mob-tab-h);background:var(--surface);border-top:1px solid var(--border);box-shadow:0 -4px 20px rgba(0,0,0,0.08);z-index:150;padding-bottom:env(safe-area-inset-bottom,0); }
        .mob-tabbar-inner { display:flex;height:100%; }
        .mob-tab { flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:none;border:none;cursor:pointer;padding:0;position:relative;-webkit-tap-highlight-color:transparent; }
        .mob-tab-icon { width:40px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:12px;transition:all 0.22s cubic-bezier(0.34,1.56,0.64,1);color:var(--text-muted); }
        .mob-tab.active .mob-tab-icon { background:var(--brand-light);color:var(--brand);transform:translateY(-2px); }
        .mob-tab-label { font-size:0.62rem;font-weight:600;color:var(--text-muted);line-height:1; }
        .mob-tab.active .mob-tab-label { color:var(--brand);font-weight:700; }
        .mob-tab-badge { position:absolute;top:2px;right:calc(50% - 26px);width:16px;height:16px;border-radius:50%;background:var(--brand);color:#fff;font-size:0.55rem;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid var(--surface); }

        /* ══════════════════════════════════════════════
           MAIN WRAPPER & CONTENT SHELL
        ══════════════════════════════════════════════ */
        .main-wrapper { flex:1;min-height:calc(100vh - var(--nav-h));overflow-y:auto;background:var(--bg-deep);padding:0 28px 0 28px;display:flex;flex-direction:column; }
        .main-wrapper::-webkit-scrollbar { width:5px; }
        .main-wrapper::-webkit-scrollbar-thumb { background:rgba(0,71,212,0.14);border-radius:4px; }
        .content-shell { flex:1;background:var(--bg);border-radius:20px 20px 16px 16px;margin:22px 0 22px;box-shadow:0 0 0 1px rgba(0,0,0,0.05),0 4px 6px rgba(0,0,0,0.03),0 12px 40px rgba(0,0,0,0.07);overflow:hidden;min-height:calc(100vh - var(--nav-h) - 44px); }
        .screen { animation:screen-in 0.3s cubic-bezier(0.22,1,0.36,1); }

        /* PAGE HEADER */
        .page-top { padding:36px 48px 30px;border-bottom:1px solid var(--border);background:var(--surface);display:flex;align-items:flex-end;justify-content:space-between;gap:24px; }
        .page-eyebrow { display:flex;align-items:center;gap:8px;margin-bottom:9px; }
        .page-eyebrow-dot { width:7px;height:7px;border-radius:50%;background:var(--brand);box-shadow:0 0 0 2px rgba(0,71,212,0.18); }
        .page-eyebrow-text { font-size:0.68rem;font-weight:700;color:var(--brand);letter-spacing:0.1em;text-transform:uppercase; }
        .page-title { font-family:"DM Sans",sans-serif;font-size:2.1rem;font-weight:900;color:var(--brand);letter-spacing:-0.05em;line-height:1.12;min-height:2.5rem; }
        .page-subtitle { font-size:0.84rem;color:var(--text-secondary);margin-top:7px;font-weight:400;line-height:1.6; }

        /* CONTENT BODY */
        .body-pad { padding:32px 48px 72px;max-width:1000px; }
        .section-hd { display:flex;align-items:center;gap:14px;margin-bottom:16px; }
        .section-hd-label { font-size:0.65rem;font-weight:800;color:var(--brand);text-transform:uppercase;letter-spacing:0.12em;white-space:nowrap; }
        .section-hd-rule { flex:1;height:1px;background:linear-gradient(90deg,var(--border),transparent); }

        /* STAT CARDS */
        .stats-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:36px; }
        .stat-card { background:var(--surface);border:1px solid rgba(0,0,0,0.07);border-radius:18px;padding:22px 22px 20px;box-shadow:var(--shadow-card);transition:all 0.24s cubic-bezier(0.16,1,0.3,1);position:relative;overflow:hidden; }
        .stat-card::before { content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--brand),#0066FF);opacity:0;transition:opacity 0.22s; }
        .stat-card:hover { box-shadow:var(--shadow-hover);transform:translateY(-3px);border-color:rgba(0,71,212,0.12); }
        .stat-card:hover::before { opacity:1; }
        .stat-card-top { display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px; }
        .stat-icon { width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center; }
        .stat-value { font-family:"DM Sans",sans-serif;font-size:2.1rem;font-weight:900;color:var(--text-primary);letter-spacing:-0.05em;line-height:1; }
        .stat-suffix { font-size:1rem;color:var(--text-muted);font-weight:500;margin-left:2px; }
        .stat-label { font-size:0.69rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;margin-top:5px; }

        /* QUICK ACTIONS */
        .qa-grid { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:36px; }
        .qa-card { background:var(--surface);border:1px solid rgba(0,0,0,0.07);border-radius:14px;padding:18px 20px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:all 0.24s cubic-bezier(0.16,1,0.3,1);box-shadow:var(--shadow-card);text-align:left; }
        .qa-card:hover { border-color:rgba(0,71,212,0.15);box-shadow:var(--shadow-hover);transform:translateY(-3px); }
        .qa-icon { width:46px;height:46px;border-radius:13px;background:var(--brand-light);border:1px solid rgba(0,71,212,0.14);display:flex;align-items:center;justify-content:center;color:var(--brand);flex-shrink:0; }
        .qa-title { font-family:"DM Sans",sans-serif;font-size:0.9rem;font-weight:800;color:var(--text-primary);margin-bottom:2px; }
        .qa-sub { font-size:0.71rem;color:var(--text-muted);line-height:1.45; }
        .qa-arrow { color:#CBD5E1;margin-left:auto;flex-shrink:0;transition:all 0.18s; }
        .qa-card:hover .qa-arrow { color:var(--brand);transform:translateX(3px); }

        /* GOAL CARDS */
        .goals-stack { display:flex;flex-direction:column;gap:10px; }
        .goal-preview-row { background:var(--surface);border:1px solid rgba(0,0,0,0.07);border-radius:14px;padding:14px 18px;display:flex;align-items:center;gap:13px;cursor:pointer;transition:all 0.24s cubic-bezier(0.16,1,0.3,1);box-shadow:var(--shadow-card); }
        .goal-preview-row:hover { border-color:rgba(0,71,212,0.15);box-shadow:var(--shadow-hover);transform:translateY(-2px); }
        .gpr-icon { width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .gpr-title { font-family:"DM Sans",sans-serif;font-size:0.86rem;font-weight:800;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px;margin-bottom:4px; }
        .gpr-tags { display:flex;align-items:center;gap:5px;flex-wrap:wrap; }
        .gpr-arrow { color:#CBD5E1;flex-shrink:0;transition:all 0.18s; }
        .goal-preview-row:hover .gpr-arrow { color:var(--brand);transform:translateX(3px); }
        .tag { display:inline-flex;align-items:center;gap:3px;font-size:0.63rem;font-weight:700;padding:3px 7px;border-radius:9999px; }
        .tag-neutral { background:#EEF2F8;color:#64748B; }
        .empty-state { background:var(--surface);border:1.5px dashed var(--border-hover);border-radius:18px;padding:56px 32px;text-align:center;box-shadow:var(--shadow-sm); }
        .empty-state-icon { font-size:2.5rem;margin-bottom:12px; }
        .empty-state-title { font-family:"DM Sans",sans-serif;font-size:1.05rem;font-weight:800;color:var(--text-primary);margin-bottom:7px; }
        .empty-state-sub { font-size:0.82rem;color:var(--text-muted);line-height:1.65;margin-bottom:22px; }
        .btn-primary { display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:11px;border:none;background:linear-gradient(135deg,#0047D4,#0066FF);color:#fff;font-size:0.81rem;font-weight:700;cursor:pointer;transition:all 0.2s;box-shadow:0 3px 12px rgba(0,71,212,0.28),0 1px 3px rgba(0,0,0,0.12);font-family:"Inter",sans-serif; }
        .btn-primary:hover { filter:brightness(1.07);transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,71,212,0.34); }
        .btn-primary:disabled { background:#94A3B8 !important;box-shadow:none !important;cursor:not-allowed;transform:none; }

        /* GOALS LIST */
        .list-topbar { display:flex;align-items:center;justify-content:space-between;margin-bottom:20px; }
        .list-meta { font-size:0.81rem;color:var(--text-secondary); }
        .list-meta strong { font-weight:700;color:var(--brand); }
        .goals-list { display:flex;flex-direction:column;gap:12px; }
        .goal-card { background:var(--surface);border:1px solid rgba(0,0,0,0.07);border-radius:18px;display:flex;overflow:hidden;box-shadow:var(--shadow-card);transition:all 0.24s cubic-bezier(0.16,1,0.3,1); }
        .goal-card:hover { border-color:rgba(0,71,212,0.14);box-shadow:var(--shadow-hover);transform:translateY(-3px); }
        .goal-card-open { border-color:rgba(0,71,212,0.14);box-shadow:var(--shadow-md); }
        .goal-card-bar { width:5px;flex-shrink:0; }
        .goal-card-body { flex:1;padding:16px 18px;display:flex;flex-direction:column;gap:11px; }
        .goal-card-header { display:flex;align-items:center;gap:13px; }
        .goal-card-domain-icon { width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform 0.2s; }
        .goal-card:hover .goal-card-domain-icon { transform:scale(1.06); }
        .goal-card-meta { flex:1;min-width:0; }
        .goal-card-title { font-family:"DM Sans",sans-serif;font-size:0.91rem;font-weight:800;color:var(--text-primary);margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .goal-card-tags { display:flex;flex-wrap:wrap;gap:5px; }
        .goal-card-ring { display:flex;flex-direction:column;align-items:center;gap:3px; }
        .goal-card-ring-label { font-size:0.6rem;font-weight:600;color:var(--text-muted); }
        .goal-card-actions { display:flex;flex-direction:column;gap:5px;opacity:0;transition:opacity 0.18s; }
        .goal-card:hover .goal-card-actions { opacity:1; }
        .gc-btn { width:29px;height:29px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text-muted);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s; }
        .gc-btn:hover { color:var(--brand);border-color:var(--brand-mid);background:var(--brand-light); }
        .gc-btn-del:hover { color:#dc2626 !important;border-color:#fca5a5 !important;background:#fef2f2 !important; }
        .goal-card-progress-track { height:5px;background:#EEF1F8;border-radius:9999px;overflow:hidden; }
        .goal-card-progress-fill { height:100%;border-radius:9999px;transition:width 0.9s cubic-bezier(0.16,1,0.3,1); }
        .goal-card-milestones { background:#F5F8FC;border:1px solid #E8EDF5;border-radius:12px;padding:13px 15px;display:flex;flex-direction:column;gap:9px;animation:fade-up 0.2s ease; }
        .ms-check-row { display:flex;align-items:center;gap:10px;position:relative; }
        .ms-checkbox { width:20px;height:20px;border-radius:6px;border:2px solid #BFC9D8;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all 0.18s; }
        .ms-checkbox:hover { border-color:var(--brand); }
        .ms-checkbox-done { box-shadow:0 0 0 3px rgba(0,71,212,0.1); }
        .ms-check-text { font-size:0.8rem;font-weight:500;color:var(--text-primary);flex:1;line-height:1.4; }
        .ms-check-done { text-decoration:line-through;color:var(--text-muted); }
        .xp-float { position:absolute;right:0;top:-4px;font-size:0.71rem;font-weight:800;color:#16a34a;animation:float-xp 1.4s ease forwards;pointer-events:none;white-space:nowrap; }

        /* FORM SCREENS */
        .form-wrap { display:flex;flex-direction:column;gap:17px;max-width:700px; }
        .form-card { background:var(--surface);border:1px solid rgba(0,0,0,0.07);border-radius:18px;overflow:hidden;box-shadow:var(--shadow-card);transition:box-shadow 0.22s,transform 0.22s; }
        .form-card:hover { box-shadow:var(--shadow-lg);transform:translateY(-2px); }
        .form-card-stripe { height:4px; }
        .form-card-head { padding:18px 22px 15px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #F0F3F9; }
        .fch-icon { width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .fch-title { font-family:"DM Sans",sans-serif;font-size:0.92rem;font-weight:800;color:var(--text-primary); }
        .fch-sub { font-size:0.69rem;color:var(--text-muted);margin-top:2px; }
        .form-card-body { padding:20px 22px;display:flex;flex-direction:column;gap:16px; }
        .edit-banner { background:var(--brand-light);border:1px solid var(--brand-mid);border-radius:12px;padding:11px 15px;display:flex;align-items:center;justify-content:space-between;box-shadow:var(--shadow-sm); }
        .eb-label { display:flex;align-items:center;gap:8px;font-size:0.8rem;font-weight:700;color:var(--brand); }
        .eb-cancel { font-size:0.74rem;font-weight:700;color:var(--text-secondary);background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:5px 12px;cursor:pointer;transition:all 0.15s;font-family:"Inter",sans-serif; }
        .eb-cancel:hover { color:#dc2626;border-color:#fca5a5; }
        .field-grp { display:flex;flex-direction:column;gap:6px; }
        .field-label { font-size:0.78rem;font-weight:600;color:#374151; }
        .field-req { color:var(--brand); }
        .field-opt { font-size:0.67rem;font-weight:400;color:var(--text-muted); }
        .field-input { font-family:"Inter",sans-serif;font-size:0.84rem;padding:11px 14px;border-radius:11px;border:1.5px solid var(--border);background:#F8FAFD;color:var(--text-primary);transition:all 0.18s;width:100%; }
        .field-input:focus { outline:none;border-color:var(--brand);background:var(--surface);box-shadow:0 0 0 3px rgba(0,71,212,0.09); }
        .field-input::placeholder { color:#B8C4D4; }
        .field-divider { height:1px;background:#EEF1F8; }
        .domain-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:9px; }
        .domain-btn { padding:15px 7px;border-radius:13px;border:1.5px solid var(--border);background:#F8FAFD;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:7px;font-family:"Inter",sans-serif;box-shadow:0 1px 3px rgba(0,0,0,0.05); }
        .domain-btn:hover { border-color:var(--border-hover);background:var(--brand-light); }
        .domain-btn.on { box-shadow:0 4px 16px rgba(0,71,212,0.14); }
        .db-icon { width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center; }
        .db-label { font-size:0.73rem;font-weight:700;color:#374151; }
        .prio-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:9px; }
        .prio-btn { padding:13px 7px;border-radius:12px;border:1.5px solid var(--border);background:#F8FAFD;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:5px;font-family:"Inter",sans-serif; }
        .prio-btn:hover { border-color:var(--border-hover); }
        .prio-emoji { font-size:1.3rem; }
        .prio-label { font-size:0.72rem;font-weight:700;color:#374151; }
        .goal-preview-block { display:flex;align-items:center;gap:13px;padding:13px 16px;background:linear-gradient(135deg,rgba(0,71,212,0.04),rgba(42,24,232,0.03));border:1.5px solid rgba(0,71,212,0.13);border-radius:12px; }
        .gpb-icon { width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .gpb-title { font-family:"DM Sans",sans-serif;font-size:0.88rem;font-weight:800;color:var(--text-primary); }
        .gpb-tags { display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-top:5px; }
        .gpb-tag { display:inline-flex;align-items:center;gap:3px;font-size:0.65rem;font-weight:600;padding:3px 8px;border-radius:9999px;background:rgba(0,71,212,0.07);color:var(--brand); }
        .ai-row { display:flex;align-items:center;justify-content:space-between; }
        .ai-btn { display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9999px;border:none;background:linear-gradient(135deg,var(--brand),#2A18E8);color:#fff;font-size:0.72rem;font-weight:700;cursor:pointer;transition:all 0.2s;font-family:"Inter",sans-serif;box-shadow:0 2px 8px rgba(0,71,212,0.28); }
        .ai-btn:hover:not(:disabled) { filter:brightness(1.08);transform:translateY(-1px); }
        .ai-btn:disabled { background:#94A3B8;cursor:not-allowed;box-shadow:none; }
        .ai-chips { display:flex;flex-wrap:wrap;gap:7px;margin-top:10px; }
        .ai-chip { display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:9999px;border:1.5px solid var(--border);background:#F8FAFD;font-size:0.74rem;font-weight:600;color:var(--text-primary);cursor:pointer;transition:all 0.17s;font-family:"Inter",sans-serif; }
        .ai-chip:hover { border-color:var(--border-hover);background:var(--brand-light); }
        .ai-chip.on { border-color:var(--brand);background:var(--brand-light);color:var(--brand);font-weight:700; }
        .ms-input-row { display:flex;gap:9px;align-items:center; }
        .ms-add-btn { display:flex;align-items:center;gap:5px;height:42px;padding:0 15px;border-radius:11px;border:1.5px solid var(--brand-mid);background:var(--brand-light);color:var(--brand);font-size:0.78rem;font-weight:700;cursor:pointer;transition:all 0.18s;white-space:nowrap;font-family:"Inter",sans-serif; }
        .ms-add-btn:hover { background:var(--brand);color:#fff;border-color:var(--brand); }
        .ms-list { display:flex;flex-direction:column;gap:6px;margin-top:2px; }
        .ms-item { display:flex;align-items:center;gap:10px;padding:11px 13px;background:#F5F8FC;border:1px solid #E4EAF4;border-radius:11px;transition:all 0.15s;animation:fade-up 0.2s ease; }
        .ms-item:hover { background:var(--surface);border-color:var(--border-hover); }
        .ms-num { width:23px;height:23px;border-radius:7px;background:var(--brand-light);color:var(--brand);font-size:0.65rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:"JetBrains Mono",monospace; }
        .ms-text { flex:1;font-size:0.8rem;font-weight:500;color:var(--text-primary); }
        .ms-del { background:none;border:none;color:#CBD5E1;cursor:pointer;display:flex;align-items:center;padding:4px;border-radius:6px;transition:all 0.14s; }
        .ms-del:hover { color:#dc2626;background:#fef2f2; }
        .err-box { display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:11px;background:#FEF2F2;border:1px solid #FECACA;color:#DC2626;font-size:0.82rem;font-weight:600; }
        .success-card { background:var(--surface);border:1.5px solid #BBF7D0;border-radius:18px;padding:56px 32px;text-align:center;display:flex;flex-direction:column;align-items:center;box-shadow:0 4px 24px rgba(22,163,74,0.12);animation:scale-in 0.4s cubic-bezier(0.34,1.56,0.64,1); }
        .succ-icon { width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#16a34a,#15803d);display:flex;align-items:center;justify-content:center;margin-bottom:20px;box-shadow:0 6px 24px rgba(22,163,74,0.32); }
        .succ-title { font-family:"DM Sans",sans-serif;font-size:1.5rem;font-weight:800;color:var(--text-primary);letter-spacing:-0.03em;margin-bottom:9px; }
        .succ-sub { font-size:0.85rem;color:var(--text-secondary);line-height:1.65;max-width:300px; }
        .save-btn { width:100%;padding:14px;border-radius:13px;border:none;cursor:pointer;font-family:"DM Sans",sans-serif;font-size:0.95rem;font-weight:800;color:#fff;background:linear-gradient(135deg,#0047D4,#0066FF);box-shadow:0 4px 20px rgba(0,71,212,0.30);display:flex;align-items:center;justify-content:center;gap:10px;transition:all 0.22s; }
        .save-btn:hover:not(:disabled) { filter:brightness(1.06);transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,71,212,0.36); }
        .save-btn:disabled { background:#94A3B8 !important;box-shadow:none !important;cursor:not-allowed;transform:none; }
        .save-hint { text-align:center;font-size:0.72rem;color:var(--text-muted);margin-top:9px; }
        .view-all-btn { width:100%;padding:11px;border-radius:11px;border:1.5px dashed var(--border-hover);background:transparent;color:var(--brand);font-size:0.8rem;font-weight:700;cursor:pointer;transition:all 0.18s;font-family:"Inter",sans-serif; }
        .view-all-btn:hover { background:var(--brand-light); }

        /* ══════════════════════════════════════════════
           GAMIFICATION COMPONENTS
        ══════════════════════════════════════════════ */

        /* PROGRESS OVERVIEW BAR */
        .progress-overview-bar {
          display:flex;align-items:stretch;gap:0;
          background:var(--surface);border:1px solid rgba(0,0,0,0.07);
          border-radius:20px;overflow:hidden;
          box-shadow:var(--shadow-card);
          margin-bottom:32px;
        }
        .pob-card {
          flex:1;padding:20px 16px;display:flex;flex-direction:column;align-items:center;gap:8px;
          position:relative;transition:all 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .pob-card:hover { background:rgba(0,71,212,0.03); transform: translateY(-3px); }
        .pob-card-level { flex:1.4; }
        .pob-divider { width:1px;background:var(--border);margin:12px 0;flex-shrink:0; }
        .pob-icon-wrap {
          width:44px;height:44px;border-radius:14px;
          display:flex;align-items:center;justify-content:center;
          transition:transform 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .pob-card:hover .pob-icon-wrap { transform:scale(1.12); }
        .pob-flame { animation:flame-pulse 2s ease-in-out infinite; }
        .pob-value { font-family:"DM Sans",sans-serif;font-size:1.5rem;font-weight:900;color:var(--text-primary);letter-spacing:-0.04em;line-height:1; }
        .pob-label { font-size:0.63rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;text-align:center; }
 
        /* TWO COLUMN LAYOUT */
        .gam-two-col { display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px; }
 
        /* DAILY CHALLENGE CARD */
        .daily-challenge-card {
          background:var(--surface);border:1px solid rgba(0,0,0,0.07);border-radius:20px;
          padding:24px;box-shadow:var(--shadow-card);margin-top:16px;
          transition:all 0.24s cubic-bezier(0.16,1,0.3,1);position:relative;overflow:hidden;
        }
        .daily-challenge-card::before { content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#0047D4,#2A18E8); }
        .daily-challenge-card:hover { box-shadow:var(--shadow-hover);transform:translateY(-2px); }
        .dc-header { display:flex;align-items:flex-start;gap:14px; }
        .dc-icon-wrap { width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#0047D4,#2A18E8);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 6px 20px rgba(0,71,212,0.3); }
        .dc-eyebrow { font-size:0.63rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px; }
        .dc-title { font-family:"DM Sans",sans-serif;font-size:1.05rem;font-weight:800;color:var(--text-primary);letter-spacing:-0.02em; }
        .dc-xp { display:inline-flex;align-items:center;margin-top:5px;font-size:0.78rem;font-weight:800;color:#16a34a;background:rgba(22,163,74,0.1);border:1px solid rgba(22,163,74,0.2);padding:2px 10px;border-radius:9999px; }
        .dc-cta-btn { flex:1;padding:11px 18px;border-radius:12px;border:none;background:linear-gradient(135deg,#0047D4,#2A18E8);color:#fff;font-family:"Inter",sans-serif;font-size:0.84rem;font-weight:700;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 16px rgba(0,71,212,0.3); }
        .dc-cta-btn:hover { filter:brightness(1.07);transform:translateY(-1px); }
        .dc-reset-btn { padding:11px 16px;border-radius:12px;border:1.5px solid var(--border);background:transparent;color:var(--text-secondary);font-family:"Inter",sans-serif;font-size:0.84rem;font-weight:600;cursor:pointer;transition:all 0.2s; }
        .dc-reset-btn:hover { border-color:var(--brand-mid);color:var(--brand); }
 
        /* STREAK CARD */
        .streak-card {
          background:var(--surface);border:1px solid rgba(0,0,0,0.07);border-radius:20px;
          padding:24px;box-shadow:var(--shadow-card);margin-top:16px;
          transition:all 0.24s cubic-bezier(0.16,1,0.3,1);
        }
        .streak-card:hover { box-shadow:var(--shadow-hover);transform:translateY(-2px); }
        .streak-header { display:flex;align-items:center;gap:14px;margin-bottom:20px; }
        .streak-flame-wrap { width:52px;height:52px;border-radius:16px;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;border:1px solid rgba(239,68,68,0.2); }
        .streak-flame-icon { animation:flame-pulse 1.6s ease-in-out infinite; }
        .streak-count { font-family:"DM Sans",sans-serif;font-size:2rem;font-weight:900;color:var(--text-primary);letter-spacing:-0.04em;line-height:1; }
        .streak-tagline { font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-top:2px; }
        .streak-week { display:flex;justify-content:space-between;gap:4px;margin-bottom:16px; }
        .streak-day-col { display:flex;flex-direction:column;align-items:center;gap:6px;flex:1; }
        .streak-day-label { font-size:0.65rem;font-weight:700;color:var(--text-muted);text-transform:uppercase; }
        .streak-day-dot {
          width:32px;height:32px;border-radius:50%;
          background:#EEF1F8;border:2px solid var(--border);
          display:flex;align-items:center;justify-content:center;
          transition:all 0.2s;
        }
        .streak-day-dot.done { background:linear-gradient(135deg, #22c55e, #16a34a);border-color:#16a34a;box-shadow:0 2px 8px rgba(22,163,74,0.35); }
        .streak-day-dot.current { background:transparent;border-color:#7c3aed;border-width:2.5px;animation:current-day-glow 2s infinite; }
        .streak-footer { padding-top:12px;border-top:1px solid var(--border); }
 
        /* BADGES CARD */
        .badges-card {
          background:var(--surface);border:1px solid rgba(0,0,0,0.07);border-radius:20px;
          padding:24px;box-shadow:var(--shadow-card);margin-bottom:32px;
          transition:all 0.24s cubic-bezier(0.16,1,0.3,1);
        }
        .badges-card:hover { box-shadow:var(--shadow-hover); }
        .badges-header { padding-bottom:16px;border-bottom:1px solid var(--border);margin-bottom:20px; }
        .badges-grid { display:grid;grid-template-columns:repeat(6,1fr);gap:12px; }
        .badge-item { display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 8px;border-radius:16px;transition:all 0.26s cubic-bezier(0.16,1,0.3,1);cursor:default;border:1px solid transparent; }
        .badge-unlocked { background:rgba(124,58,237,0.03); border-color:rgba(124,58,237,0.05); }
        .badge-unlocked:hover { background:var(--surface);border-color:var(--badge-color,#7c3aed);transform:translateY(-4px);box-shadow: 0 10px 20px -5px rgba(0,0,0,0.05), 0 0 12px 2px var(--badge-color)22; }
        .badge-locked { opacity:0.55; }
        .badge-icon-wrap { width:60px;height:60px;border-radius:18px;display:flex;align-items:center;justify-content:center;border:2px solid transparent;transition:all 0.22s; }
        .badge-unlocked .badge-icon-wrap { animation:badge-glow 3s ease-in-out infinite; }
        .badge-icon-locked { background:#F1F5F9;border-color:#E2E8F0; }
        .badge-label { font-family:"DM Sans",sans-serif;font-size:0.72rem;font-weight:800;color:var(--text-primary);text-align:center; }
        .badge-level { font-size:0.62rem;font-weight:600;text-align:center; }
        .view-all-achievements-btn { background:none;border:none;color:var(--brand);font-family:"Inter",sans-serif;font-size:0.84rem;font-weight:700;cursor:pointer;padding:8px 16px;border-radius:8px;transition:background 0.18s; }
        .view-all-achievements-btn:hover { background:var(--brand-light); }
 
        /* XP CARD */
        .xp-card {
          background:var(--surface);border:1px solid rgba(0,0,0,0.07);border-radius:20px;
          padding:24px;box-shadow:var(--shadow-card);margin-top:16px;
          transition:all 0.24s cubic-bezier(0.16,1,0.3,1);
        }
        .xp-card:hover { box-shadow:var(--shadow-hover);transform:translateY(-2px); }
        .xp-remaining-badge { display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 14px;background:rgba(217,119,6,0.08);border:1px solid rgba(217,119,6,0.2);border-radius:9999px;font-size:0.73rem;font-weight:700;color:#d97706;width:fit-content;margin:0 auto; }
        .level-badge-display { display:inline-flex;align-items:center;gap:7px;padding:8px 18px;background:linear-gradient(135deg,rgba(124,58,237,0.08),rgba(124,58,237,0.05));border:1.5px solid rgba(124,58,237,0.2);border-radius:9999px;font-family:"DM Sans",sans-serif;font-size:0.84rem;font-weight:800;color:#7c3aed; }
 
        /* TIMELINE CARD */
        .timeline-card {
          background:var(--surface);border:1px solid rgba(0,0,0,0.07);border-radius:20px;
          padding:24px;box-shadow:var(--shadow-card);margin-top:16px;
          transition:all 0.24s cubic-bezier(0.16,1,0.3,1);
        }
        .timeline-card:hover { box-shadow:var(--shadow-hover);transform:translateY(-2px); }
        .timeline-item { display:flex;gap:14px;position:relative; transition:all 0.2s; padding: 4px; border-radius: 8px; }
        .timeline-item:hover { background:rgba(0,71,212,0.02); }
        .timeline-connector { display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:40px; }
        .timeline-dot { width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform 0.2s; }
        .timeline-item:hover .timeline-dot { transform:scale(1.1); }
        .timeline-line { width:2px;flex:1;min-height:16px;background:var(--border);margin:4px 0; }
        .timeline-content { flex:1;padding-bottom:20px; }
        .timeline-item:last-child .timeline-content { padding-bottom:0; }
        .timeline-label { font-family:"DM Sans",sans-serif;font-size:0.86rem;font-weight:700;color:var(--text-primary);line-height:1.4;margin-top:6px; }
        .timeline-xp { display:inline-flex;align-items:center;margin-top:5px;font-size:0.72rem;font-weight:800;padding:2px 9px;border-radius:9999px;background:rgba(0,0,0,0.04); }

        /* MOTIVATION CARD */
        .motivation-card {
          position:relative;overflow:hidden;
          background:linear-gradient(135deg,#0047D4,#0052E8 50%,#2A18E8);
          border-radius:20px;padding:28px 32px;
          box-shadow:0 8px 32px rgba(0,71,212,0.3);
          margin-bottom:32px;
          transition:all 0.24s;
        }
        .motivation-card:hover { box-shadow:0 14px 44px rgba(0,71,212,0.38);transform:translateY(-2px); }
        .motivation-glow { position:absolute;top:-60px;right:-40px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.12) 0%,transparent 70%);pointer-events:none; }
        .motivation-sparkles { position:absolute;top:16px;right:28px;font-size:1.6rem;opacity:0.6; }

        /* REWARDS LADDER */
        .rewards-ladder {
          display:flex;align-items:flex-start;gap:0;
          background:var(--surface);border:1px solid rgba(0,0,0,0.07);
          border-radius:20px;padding:28px;
          box-shadow:var(--shadow-card);
          margin-bottom:32px;
          position:relative;
        }
        .reward-step { flex:1;display:flex;flex-direction:column;align-items:center;gap:10px;position:relative; }
        .reward-connector { position:absolute;top:34px;right:0;width:100%;height:3px;z-index:0;transform:translateX(50%); }
        .reward-icon-wrap { width:68px;height:68px;border-radius:20px;display:flex;align-items:center;justify-content:center;position:relative;z-index:1;transition:all 0.22s;cursor:default; }
        .reward-done .reward-icon-wrap { animation:scale-in 0.4s ease; }
        .reward-step:hover .reward-icon-wrap { transform:scale(1.07) translateY(-2px); }
        .reward-check { position:absolute;bottom:-5px;right:-5px;width:22px;height:22px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.12); }
        .reward-xp { font-family:"DM Sans",sans-serif;font-size:0.78rem;font-weight:800;letter-spacing:-0.01em; }
        .reward-label { font-size:0.72rem;font-weight:600;text-align:center; }

        /* ══════════════════════════════════════════════
           RESPONSIVE — TABLET (≤ 960px)
        ══════════════════════════════════════════════ */
        @media (max-width:960px) {
          .left-panel { display:none; }
          .mob-topbar { display:flex; }
          .mob-tabbar { display:flex; }
          .top-nav-links { display:none; }
          .top-nav-hamburger { display:flex; }
          .main-wrapper { padding:0; }
          .content-shell { margin:0;border-radius:0;box-shadow:none;min-height:calc(100vh - var(--nav-h) - 52px - var(--mob-tab-h)); }
          .page-top { padding:24px 22px 20px; }
          .body-pad { padding:22px 18px calc(var(--mob-tab-h) + 22px); }
          .stats-grid { grid-template-columns:repeat(2,1fr);gap:11px; }
          .qa-grid { grid-template-columns:1fr;gap:9px; }
          .progress-overview-bar { flex-wrap:wrap;border-radius:16px; }
          .pob-card { min-width:calc(50% - 1px);padding:16px 12px; }
          .pob-divider { display:none; }
          .gam-two-col { grid-template-columns:1fr;gap:0; }
          .badges-grid { grid-template-columns:repeat(3,1fr); }
          .rewards-ladder { flex-direction:column;align-items:stretch;gap:16px;padding:20px; }
          .reward-step { flex-direction:row;align-items:center;gap:16px; }
          .reward-connector { display:none; }
          .reward-icon-wrap { width:52px;height:52px;border-radius:14px;flex-shrink:0; }
        }

        /* ══════════════════════════════════════════════
           RESPONSIVE — MOBILE (≤ 520px)
        ══════════════════════════════════════════════ */
        @media (max-width:520px) {
          :root { --nav-h:58px; }
          .top-nav-logo { font-size:1.3rem; }
          .page-title { font-size:1.6rem; }
          .page-subtitle { font-size:0.78rem; }
          .page-top { padding:20px 16px 16px;flex-direction:column;align-items:flex-start;gap:13px; }
          .body-pad { padding:18px 14px calc(var(--mob-tab-h) + 18px); }
          .stats-grid { grid-template-columns:1fr;gap:9px;margin-bottom:24px; }
          .qa-grid { grid-template-columns:1fr;gap:9px;margin-bottom:24px; }
          .stat-card { padding:16px 16px 14px; }
          .stat-value { font-size:1.8rem; }
          .goal-card-actions { opacity:1; }
          .goal-card-body { padding:13px 13px; }
          .goal-card-domain-icon { width:34px;height:34px; }
          .goal-card-title { font-size:0.84rem; }
          .form-card-head { padding:14px 16px 11px; }
          .form-card-body { padding:16px 16px;gap:13px; }
          .domain-grid { gap:7px; }
          .domain-btn { padding:11px 5px; }
          .db-icon { width:28px;height:28px; }
          .db-label { font-size:0.66rem; }
          .prio-grid { gap:7px; }
          .prio-btn { padding:10px 5px; }
          .qa-card { padding:13px 15px;gap:11px; }
          .gpr-title { max-width:170px; }
          .ms-input-row { flex-direction:column;gap:7px; }
          .ms-add-btn { width:100%;justify-content:center; }
          .empty-state { padding:40px 20px; }
          .list-topbar { flex-direction:column;align-items:flex-start;gap:9px; }
          .mob-drawer { width:min(280px,90vw); }
          .top-nav-inner { padding:0 14px; }
          .badges-grid { grid-template-columns:repeat(3,1fr);gap:8px; }
          .badge-icon-wrap { width:48px;height:48px;border-radius:14px; }
          .badge-label { font-size:0.62rem; }
          .pob-card { min-width:100%; }
          .streak-day-dot { width:26px;height:26px; }
          .rewards-ladder { padding:16px; }
        }
      `}</style>

      {/* ══════════════════ TOP NAVBAR ══════════════════════════════ */}
      <TopNav />

      {/* ══════════════════ MOBILE DRAWER OVERLAY ══════════════════ */}
      <div className={`mob-drawer-overlay${drawerOpen ? " open" : ""}`} onClick={() => setDrawerOpen(false)}/>

      {/* ══════════════════ MOBILE SLIDE DRAWER ══════════════════════ */}
      <div className={`mob-drawer${drawerOpen ? " open" : ""}`}>
        <div className="mob-drawer-grid"/>
        <div className="mob-drawer-head">
          <div className="mob-drawer-brand">
            <div className="mob-drawer-logo"><div className="lp-logo-dot"/> Syntra</div>
            <div className="mob-drawer-title">Achievement Hub</div>
          </div>
          <button className="mob-drawer-close" onClick={() => setDrawerOpen(false)}><X size={14}/></button>
        </div>
        <div className="mob-drawer-stats">
          <div className="mob-drawer-stat"><div className="mob-drawer-stat-num">{goals.length}</div><div className="mob-drawer-stat-lbl">Goals</div></div>
          <div className="mob-drawer-stat"><div className="mob-drawer-stat-num">{doneMs}</div><div className="mob-drawer-stat-lbl">Done</div></div>
          <div className="mob-drawer-stat"><div className="mob-drawer-stat-num">{overallPct}%</div><div className="mob-drawer-stat-lbl">Overall</div></div>
        </div>
        <div className="mob-drawer-nav">
          <NavItem icon={<BarChart3 size={15}/>} label="Overview"        sub="Summary & quick access"           active={screen==="home"}         onClick={()=>goScreen("home")}/>
          <NavItem icon={<Rocket size={15}/>}    label="My Goals"        sub={goals.length>0?`${goals.length} active`:"No goals yet"} active={screen==="goals-list"} onClick={()=>goScreen("goals-list")} badge={goals.length}/>
          <NavItem icon={<Trophy size={15}/>}    label="Achievement Hub" sub="Progress • Rewards • Streaks"    active={screen==="gamification"} onClick={()=>goScreen("gamification")}/>
          <NavItem icon={<Plus size={15}/>}      label="Add New Goal"    sub="Create a goal & milestones"       active={screen==="add-goal"}     onClick={()=>{resetForm();goScreen("add-goal");}}/>
        </div>
        <div className="mob-drawer-domains">
          <div className="mob-drawer-domains-lbl">By Domain</div>
          {(["health","finance","career"] as const).map(d=>{
            const dc=DC[d]; const count=goals.filter(g=>g.domain===d).length;
            return (
              <div key={d} className="lp-domain-row">
                <div className="lp-domain-icon" style={{background:"rgba(255,255,255,0.1)",color:dc.color}}>{dc.icon}</div>
                <span className="lp-domain-name">{dc.label}</span>
                <span className="lp-domain-count">{count}</span>
              </div>
            );
          })}
        </div>
        <div className="mob-drawer-back">
          <button className="lp-back-btn" onClick={()=>router.push("/dashboard")}>
            <ArrowLeft size={12}/> Return to Dashboard
          </button>
        </div>
      </div>

      {/* ══════════════════ PAGE BODY ═════════════════════════════════ */}
      <div className="page-body">

        {/* ══════════════════ DESKTOP SIDEBAR ══════════════════════════ */}
        <div className="left-panel">
          <div className="left-panel-top-rule"/>
          <div className="lp-grid"/>
          <div className="lp-brand">
            <div className="lp-logo"><div className="lp-logo-dot"/> Syntra</div>
            <div className="lp-heading">Achievement Hub</div>
            <div className="lp-sub">Streaks, XP, badges, challenges, and progress.</div>
          </div>
          <div className="lp-stats">
            <div className="lp-stat"><div className="lp-stat-num">{goals.length}</div><div className="lp-stat-lbl">Goals</div></div>
            <div className="lp-stat"><div className="lp-stat-num">{doneMs}</div><div className="lp-stat-lbl">Done</div></div>
            <div className="lp-stat"><div className="lp-stat-num">{overallPct}%</div><div className="lp-stat-lbl">Overall</div></div>
          </div>
          <div className="lp-nav">
            <NavItem icon={<BarChart3 size={15}/>} label="Overview"      sub="Summary & quick access"          active={screen==="home"}         onClick={()=>setScreen("home")}/>
            <NavItem icon={<Rocket size={15}/>}    label="My Goals"      sub={goals.length>0?`${goals.length} active`:"No goals yet"} active={screen==="goals-list"} onClick={()=>setScreen("goals-list")} badge={goals.length}/>
            <NavItem icon={<Trophy size={15}/>}    label="Achievement Hub" sub="Progress • Rewards • Streaks"   active={screen==="gamification"} onClick={()=>setScreen("gamification")}/>
            <NavItem icon={<Plus size={15}/>}      label="Add New Goal"  sub="Create a goal & milestones"      active={screen==="add-goal"}     onClick={()=>{resetForm();setScreen("add-goal");}}/>
          </div>
          <div className="lp-domains">
            <div className="lp-domains-lbl">By Domain</div>
            {(["health","finance","career"] as const).map(d=>{
              const dc=DC[d]; const count=goals.filter(g=>g.domain===d).length;
              return (
                <div key={d} className="lp-domain-row">
                  <div className="lp-domain-icon" style={{background:"rgba(255,255,255,0.1)",color:dc.color}}>{dc.icon}</div>
                  <span className="lp-domain-name">{dc.label}</span>
                  <span className="lp-domain-count">{count}</span>
                </div>
              );
            })}
          </div>
          <div className="lp-back">
            <button className="lp-back-btn" onClick={()=>router.push("/dashboard")}>
              <ArrowLeft size={12}/> Return to Dashboard
            </button>
          </div>
        </div>

        {/* ══════════════════ MAIN WRAPPER ═════════════════════════════ */}
        <div className="main-wrapper">

          {/* MOBILE SECTION BAR */}
          <div className="mob-topbar">
            <button className="mob-topbar-menu" onClick={() => setDrawerOpen(true)}><Menu size={16}/></button>
            <div className="mob-topbar-brand">
              <div className="mob-topbar-dot"/>
              <span className="mob-topbar-logo">Syntra&nbsp;&nbsp;</span>
              <span className="mob-topbar-title">{SCREEN_COPY[screen].title}</span>
            </div>
            <button className="mob-topbar-action" onClick={()=>{resetForm();goScreen("add-goal");}}><Plus size={16}/></button>
          </div>

          <div className="content-shell">

            {/* ─── GAMIFICATION ─── */}
            {screen==="gamification" && (
              <GamificationScreen 
                goals={goals} 
                gamification={gamification} 
                badges={badges} 
                onCompleteChallenge={handleCompleteChallenge}
                aiChallenge={aiData?.ai?.dailyChallenge || null}
              />
            )}

            {/* ─── OVERVIEW ─── */}
            {screen==="home" && (
              <div className="screen">
                <div className="page-top">
                  <div className="page-title-block">
                    <div className="page-eyebrow">
                      <div className="page-eyebrow-dot"/>
                      <span className="page-eyebrow-text">Achievement Hub</span>
                    </div>
                    <h1 className="page-title"><Typewriter phrases={SCREEN_COPY["home"].phrases}/></h1>
                    <p className="page-subtitle">{SCREEN_COPY["home"].sub}</p>
                  </div>
                  <div>
                    <button className="btn-primary" onClick={()=>{resetForm();setScreen("add-goal");}}>
                      <Plus size={13}/> New Goal
                    </button>
                  </div>
                </div>
                <div className="body-pad">
                  <div className="section-hd"><span className="section-hd-label">Quick Actions</span><div className="section-hd-rule"/></div>
                  <div className="qa-grid">
                    <button className="qa-card" onClick={()=>{resetForm();setScreen("add-goal");}}>
                      <div className="qa-icon"><Plus size={18}/></div>
                      <div><div className="qa-title">Add New Goal</div><div className="qa-sub">Create a goal with AI-suggested milestones</div></div>
                      <ChevronRight size={14} className="qa-arrow"/>
                    </button>
                    <button className="qa-card" onClick={()=>setScreen("goals-list")}>
                      <div className="qa-icon"><Rocket size={18}/></div>
                      <div><div className="qa-title">My Goals ({goals.length})</div><div className="qa-sub">Track progress, complete milestones</div></div>
                      <ChevronRight size={14} className="qa-arrow"/>
                    </button>
                  </div>
                  <div className="section-hd"><span className="section-hd-label">Overview</span><div className="section-hd-rule"/></div>
                  <div className="stats-grid">
                    <StatCard icon={<Target size={16}/>} iconBg="rgba(0,71,212,0.1)" iconColor={BRAND} value={goals.length} label="Active Goals" ring={{pct:overallPct,color:BRAND}}/>
                    <StatCard icon={<CheckCircle2 size={16}/>} iconBg="rgba(22,163,74,0.1)" iconColor="#16a34a" value={doneMs} suffix={`/${totalMs}`} label="Steps Completed"/>
                    <StatCard icon={<Star size={16}/>} iconBg="rgba(217,119,6,0.1)" iconColor="#d97706" value={gamification.totalPoints} label="XP Earned"/>
                  </div>
                  <div className="section-hd"><span className="section-hd-label">Recent Goals</span><div className="section-hd-rule"/></div>
                  {goals.length===0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">🎯</div>
                      <p style={{fontSize:"0.84rem",color:"var(--text-muted)",lineHeight:1.65}}>No goals yet. Create your first goal to get started.</p>
                    </div>
                  ) : (
                    <div className="goals-stack">
                      {goals.slice(0,4).map(g=>{
                        const dc=DC[g.domain]; const total=g.milestones?.length??0;
                        const done=g.milestones?.filter(m=>m.completed).length??0;
                        const pct=total>0?Math.round((done/total)*100):0;
                        const p=PRIO[g.priority as keyof typeof PRIO]||PRIO.medium;
                        return (
                          <div key={g._id} className="goal-preview-row" onClick={()=>setScreen("goals-list")}>
                            <div className="gpr-icon" style={{background:dc.bg,color:dc.color,border:`1px solid ${dc.border}`}}>{dc.icon}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div className="gpr-title">{g.title}</div>
                              <div className="gpr-tags">
                                <span className="tag" style={{background:p.bg,color:p.color}}>{p.emoji} {p.label}</span>
                                <span className="tag tag-neutral">{dc.label}</span>
                                {total>0&&<span className="tag" style={{background:"rgba(0,71,212,0.07)",color:BRAND}}>{done}/{total} steps</span>}
                              </div>
                            </div>
                            {total>0&&(
                              <div style={{position:"relative",width:36,height:36,flexShrink:0}}>
                                <svg width="36" height="36" style={{transform:"rotate(-90deg)",position:"absolute",inset:0}}>
                                  <circle cx="18" cy="18" r="14" fill="none" stroke="#E8EDF5" strokeWidth="3.5"/>
                                  <circle cx="18" cy="18" r="14" fill="none" stroke={dc.color} strokeWidth="3.5" strokeLinecap="round"
                                    strokeDasharray={`${(pct/100)*2*Math.PI*14} ${2*Math.PI*14}`}
                                    style={{transition:"stroke-dasharray .8s ease",filter:`drop-shadow(0 0 3px ${dc.color}55)`}}/>
                                </svg>
                                <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.52rem",fontWeight:800,color:dc.color}}>{pct}%</span>
                              </div>
                            )}
                            <ChevronRight size={14} className="gpr-arrow"/>
                          </div>
                        );
                      })}
                      {goals.length>4&&(
                        <button className="view-all-btn" onClick={()=>setScreen("goals-list")}>View all {goals.length} goals →</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── MY GOALS ─── */}
            {screen==="goals-list" && (
              <div className="screen">
                <div className="page-top">
                  <div className="page-title-block">
                    <div className="page-eyebrow"><div className="page-eyebrow-dot"/><span className="page-eyebrow-text">Achievement Hub</span></div>
                    <h1 className="page-title"><Typewriter phrases={SCREEN_COPY["goals-list"].phrases}/></h1>
                    <p className="page-subtitle">{SCREEN_COPY["goals-list"].sub}</p>
                  </div>
                  <div>
                    <button className="btn-primary" onClick={()=>{resetForm();setScreen("add-goal");}}>
                      <Plus size={13}/> New Goal
                    </button>
                  </div>
                </div>
                <div className="body-pad">
                  <div className="list-topbar">
                    <span className="list-meta">
                      <strong>{goals.length}</strong> goal{goals.length!==1?"s":""} &nbsp;·&nbsp; <strong>{doneMs}</strong>/{totalMs} steps &nbsp;·&nbsp; <strong>{overallPct}%</strong> overall
                    </span>
                  </div>
                  {goals.length===0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">🚀</div>
                      <div className="empty-state-title">No goals yet</div>
                      <div className="empty-state-sub">Create your first goal to start tracking progress and building momentum.</div>
                      <button className="btn-primary" onClick={()=>{resetForm();setScreen("add-goal");}}>
                        <Plus size={13}/> Create First Goal
                      </button>
                    </div>
                  ) : (
                    <div className="goals-list">
                      {goals.map(g=>(
                        <GoalCard key={g._id} goal={g} onToggle={handleToggle} onEdit={startEdit} onDelete={handleDelete} floatId={floatId}/>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── ADD / EDIT GOAL ─── */}
            {screen==="add-goal" && (
              <div className="screen">
                <div className="page-top">
                  <div className="page-title-block">
                    <div className="page-eyebrow"><div className="page-eyebrow-dot"/><span className="page-eyebrow-text">Achievement Hub</span></div>
                    <h1 className="page-title">
                      {editId ? "Edit Goal" : <Typewriter phrases={SCREEN_COPY["add-goal"].phrases}/>}
                    </h1>
                    <p className="page-subtitle">{editId ? "Update your goal details below." : SCREEN_COPY["add-goal"].sub}</p>
                  </div>
                  {editId && <div><button className="eb-cancel" onClick={()=>{resetForm();setScreen("goals-list");}}>Cancel Edit</button></div>}
                </div>
                <div className="body-pad">
                  <div className="form-wrap">
                    {editId && (
                      <div className="edit-banner">
                        <div className="eb-label"><Pencil size={12}/> Editing an existing goal</div>
                        <button className="eb-cancel" onClick={()=>{resetForm();setScreen("goals-list");}}>Cancel</button>
                      </div>
                    )}
                    {saved ? (
                      <div className="success-card">
                        <div className="succ-icon"><CheckCircle2 size={34} color="#fff"/></div>
                        <div className="succ-title">{editId?"Goal Updated! ✅":"Goal Created! 🎉"}</div>
                        <p className="succ-sub">{editId?"Your goal has been updated. Redirecting...":"Your new goal is live! Redirecting to your goals list..."}</p>
                      </div>
                    ) : (
                      <>
                        {msg && <div className="err-box"><AlertTriangle size={14}/> {msg}</div>}
                        <div className="form-card">
                          <div className="form-card-stripe" style={{background:"linear-gradient(90deg,#0047D4,#0066FF)"}}/>
                          <div className="form-card-head">
                            <div className="fch-icon" style={{background:"rgba(0,71,212,0.08)",color:BRAND}}><Target size={19}/></div>
                            <div><div className="fch-title">What's your goal?</div><div className="fch-sub">Give it a clear, specific name</div></div>
                          </div>
                          <div className="form-card-body">
                            <div className="field-grp">
                              <label className="field-label">Goal Title <span className="field-req">*</span></label>
                              <input className="field-input" type="text" style={{fontSize:"0.87rem",padding:"12px 14px"}}
                                placeholder="e.g. Save ₹1 lakh by December, Run 5km under 25 min"
                                value={title} onChange={e=>setTitle(e.target.value)}/>
                            </div>
                            <div className="field-grp">
                              <label className="field-label">Area of life</label>
                              <div className="domain-grid">
                                {(["health","finance","career"] as const).map(d=>{
                                  const dcc=DC_FORM[d]; const on=domain===d;
                                  return (
                                    <button key={d} className={`domain-btn${on?" on":""}`}
                                      style={on?{borderColor:dcc.color,background:`${dcc.color}10`}:{}}
                                      onClick={()=>setDomain(d)}>
                                      <div className="db-icon" style={{background:on?dcc.bg:"#EEF1F8",color:on?dcc.color:"#64748B"}}>{dcc.icon}</div>
                                      <span className="db-label" style={on?{color:dcc.color}:{}}>{dcc.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="form-card">
                          <div className="form-card-stripe" style={{background:"linear-gradient(90deg,#0055EE,#2A18E8)"}}/>
                          <div className="form-card-head">
                            <div className="fch-icon" style={{background:"rgba(0,85,238,0.08)",color:"#0055EE"}}><TrendingUp size={19}/></div>
                            <div><div className="fch-title">Priority & Timeline</div><div className="fch-sub">How important is this, and when by?</div></div>
                          </div>
                          <div className="form-card-body">
                            <div className="field-grp">
                              <label className="field-label">Priority level</label>
                              <div className="prio-grid">
                                {(["low","medium","high"] as const).map(p=>{
                                  const pp=PRIO[p]; const on=priority===p;
                                  return (
                                    <button key={p} className="prio-btn"
                                      style={on?{borderColor:pp.color,background:pp.bg}:{}}
                                      onClick={()=>setPriority(p)}>
                                      <span className="prio-emoji">{pp.emoji}</span>
                                      <span className="prio-label" style={on?{color:pp.color}:{}}>{pp.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="field-grp">
                              <label className="field-label">Target date <span className="field-opt">— optional</span></label>
                              <input className="field-input" type="date" value={targetDate} onChange={e=>setTargetDate(e.target.value)}/>
                            </div>
                            {(title||daysLeft!==null)&&(
                              <div className="goal-preview-block">
                                <div className="gpb-icon" style={{background:dfc.bg,color:dfc.color}}>{dfc.icon}</div>
                                <div style={{flex:1,minWidth:0}}>
                                  <div className="gpb-title" style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title||"Your Goal"}</div>
                                  <div className="gpb-tags">
                                    <span className="gpb-tag"><Flag size={9}/> {priority}</span>
                                    <span className="gpb-tag">{dfc.label}</span>
                                    {daysLeft!==null&&<span className="gpb-tag"><Calendar size={9}/> {daysLeft}d left</span>}
                                    {milestones.length>0&&<span className="gpb-tag"><CheckCircle2 size={9}/> {milestones.length} steps</span>}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="form-card">
                          <div className="form-card-stripe" style={{background:"linear-gradient(90deg,#2A18E8,#0066FF)"}}/>
                          <div className="form-card-head">
                            <div className="fch-icon" style={{background:"rgba(124,58,237,0.08)",color:"#7c3aed"}}><CheckCircle2 size={19}/></div>
                            <div><div className="fch-title">Break it into steps</div><div className="fch-sub">Milestones keep you moving — optional but powerful</div></div>
                          </div>
                          <div className="form-card-body">
                            <div>
                              <div className="ai-row">
                                <label className="field-label" style={{margin:0}}>AI Suggestions</label>
                                <button className="ai-btn" onClick={generateSugg} disabled={suggestLoading||!title.trim()}>
                                  <Sparkles size={10}/> {suggestLoading?"Thinking…":aiSuggestions.length?"Regenerate":"Suggest steps"}
                                </button>
                              </div>
                              {!title.trim()&&<p style={{fontSize:"0.71rem",color:"var(--text-muted)",marginTop:6}}>Enter a goal title first.</p>}
                              {aiSuggestions.length>0&&(
                                <div>
                                  <p style={{fontSize:"0.65rem",fontWeight:700,color:"#7c3aed",textTransform:"uppercase",letterSpacing:"0.07em",margin:"9px 0 7px",display:"flex",alignItems:"center",gap:4}}>
                                    <Sparkles size={9}/> Tap to add or remove
                                  </p>
                                  <div className="ai-chips">
                                    {aiSuggestions.map((s,i)=>(
                                      <div key={i} className={`ai-chip${milestones.includes(s)?" on":""}`} onClick={()=>toggleSugg(s)}>
                                        {milestones.includes(s)?<CheckCircle2 size={9}/>:<Plus size={9}/>} {s}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="field-divider"/>
                            <div className="field-grp">
                              <label className="field-label">Custom step <span className="field-opt">— press Enter or Add</span></label>
                              <div className="ms-input-row">
                                <input className="field-input" style={{flex:1}} type="text"
                                  placeholder="e.g. Complete week 1 training plan"
                                  value={msInput} onChange={e=>setMsInput(e.target.value)}
                                  onKeyDown={e=>e.key==="Enter"&&addMs()}/>
                                <button className="ms-add-btn" onClick={addMs}><Plus size={12}/> Add</button>
                              </div>
                            </div>
                            {milestones.length>0&&(
                              <div>
                                <p style={{fontSize:"0.67rem",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:7,display:"flex",alignItems:"center",gap:5}}>
                                  <CheckCircle2 size={10} style={{color:"#16a34a"}}/> {milestones.length} step{milestones.length!==1?"s":""} planned
                                </p>
                                <div className="ms-list">
                                  {milestones.map((m,i)=>(
                                    <div key={i} className="ms-item">
                                      <div className="ms-num">{i+1}</div>
                                      <span className="ms-text">{m}</span>
                                      <button className="ms-del" onClick={()=>removeMs(i)}><X size={12}/></button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {milestones.length===0&&aiSuggestions.length===0&&(
                              <p style={{textAlign:"center",padding:"10px 0",color:"var(--text-muted)",fontSize:"0.79rem"}}>
                                ✨ You can skip milestones or add them after creating the goal.
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <button className="save-btn" onClick={handleSave} disabled={saving||!title.trim()}>
                            {saving
                              ?<><Activity size={15}/>{editId?"Saving changes…":"Creating goal…"}</>
                              :<><Rocket size={14}/>{editId?"Update Goal":"Create Goal"}</>}
                          </button>
                          {!title.trim()&&<p className="save-hint">Enter a goal title to enable saving.</p>}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>{/* content-shell */}
        </div>{/* main-wrapper */}
      </div>{/* page-body */}

      <nav className="mob-tabbar">
        <div className="mob-tabbar-inner">
          <button className={`mob-tab${screen==="home" ? " active" : ""}`} onClick={()=>setScreen("home")}>
            <div className="mob-tab-icon"><Home size={19}/></div>
            <span className="mob-tab-label">Overview</span>
          </button>
          <button className={`mob-tab${screen==="goals-list" ? " active" : ""}`} onClick={()=>setScreen("goals-list")}>
            <div className="mob-tab-icon"><Rocket size={19}/></div>
            <span className="mob-tab-label">My Goals</span>
            {goals.length > 0 && <span className="mob-tab-badge">{goals.length > 9 ? "9+" : goals.length}</span>}
          </button>
          <button className={`mob-tab${screen==="gamification" ? " active" : ""}`} onClick={()=>setScreen("gamification")}>
            <div className="mob-tab-icon"><Trophy size={19}/></div>
            <span className="mob-tab-label">Hub</span>
          </button>
          <button className={`mob-tab${screen==="add-goal" ? " active" : ""}`} onClick={()=>{resetForm();setScreen("add-goal");}}>
            <div className="mob-tab-icon"><Plus size={19}/></div>
            <span className="mob-tab-label">Add Goal</span>
          </button>
        </div>
      </nav>

    </div>
  );
}