

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Cpu, Shield, Sparkles, Briefcase, HeartPulse, Wallet,
  ArrowLeft, CheckCircle2, User, Mail, Calendar, LogOut,
  Edit3, X, Save, Lock, Eye, EyeOff, Check, RefreshCw,
  BookOpen, Trophy, Star, Zap, Target, Flame, Award,
  ChevronRight, Camera, BarChart3, Layers, Menu,
} from "lucide-react";

/* ─── TYPES ──────────────────────────────────────────────────────── */
type SyncStatus = "idle" | "syncing" | "synced";
type OptVector  = "career" | "health" | "finance";

/* ─── NAV LINKS ──────────────────────────────────────────────────── */
const NAV_LINKS = [
  { href: "/dashboard",          label: "Dashboard" },
  { href: "/ingestion",          label: "Ingestion" },
  { href: "/goals",              label: "Goals" },
  { href: "/simulator",          label: "Simulator" },
  { href: "/insights",           label: "Insights" },
  { href: "/profile",            label: "Profile" },
];

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
              className={`top-nav-link${l.href === "/profile" ? " top-nav-link-active" : ""}`}
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
            className={`top-nav-mobile-link${l.href === "/profile" ? " active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── AVATARS — same as onboarding ──────────────────────────────── */
const AVATARS = [
  {
    id:"chronos", numId:"1", name:"Chronos", focus:"Learning · Growth · Knowledge",
    accent:"#0044DD", lightBg:"#eff4ff",
    svg:(
      <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
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
    id:"apex", numId:"2", name:"Apex", focus:"Productivity · Discipline · Execution",
    accent:"#dc2626", lightBg:"#fff5f5",
    svg:(
      <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
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
    id:"nexus", numId:"3", name:"Nexus", focus:"Wealth · Planning · Stability",
    accent:"#059669", lightBg:"#f0fdf4",
    svg:(
      <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
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
    id:"titan", numId:"4", name:"Titan", focus:"Fitness · Energy · Health",
    accent:"#d97706", lightBg:"#fffbeb",
    svg:(
      <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
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

const getAvatarByNumId = (numId: string) =>
  AVATARS.find(a => a.numId === String(numId)) || AVATARS[0];

/* ─── NAV SECTIONS (updated — no neural sync) ───────────────────── */
const NAV_SECTIONS = [
  { id:"sec-profile",      icon:User,      label:"Twin Profile",   sub:"Identity & settings"  },
  { id:"sec-optimization", icon:BarChart3, label:"Optimisation",   sub:"Active vector"         },
  { id:"sec-data",         icon:Layers,    label:"Data Layers",    sub:"Connected sources"     },
];

/* ─── TYPEWRITER ─────────────────────────────────────────────────── */
function useTypewriter(fullText: string) {
  const [displayed, setDisplayed] = useState("");
  const phaseRef = useRef<"typing"|"pause"|"erasing"|"pauseEmpty">("typing");
  const indexRef = useRef(0);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const phase = phaseRef.current;
      if (phase === "typing") {
        setDisplayed(fullText.slice(0, indexRef.current));
        indexRef.current += 1;
        if (indexRef.current > fullText.length) { phaseRef.current = "pause"; t = setTimeout(tick, 1900); }
        else t = setTimeout(tick, 88);
      } else if (phase === "pause") {
        phaseRef.current = "erasing"; t = setTimeout(tick, 400);
      } else if (phase === "erasing") {
        if (indexRef.current > 0) { indexRef.current -= 1; setDisplayed(fullText.slice(0, indexRef.current)); t = setTimeout(tick, 52); }
        else { phaseRef.current = "pauseEmpty"; t = setTimeout(tick, 500); }
      } else { indexRef.current = 0; phaseRef.current = "typing"; t = setTimeout(tick, 300); }
    };
    t = setTimeout(tick, 88);
    return () => clearTimeout(t);
  }, [fullText]);
  return displayed;
}

/* ─── INFO ROW ───────────────────────────────────────────────────── */
function InfoRow({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <div className="info-row">
      <div className="info-icon"><Icon size={14} color={accent ? "#0047D4" : "#94a3b8"}/></div>
      <div className="info-content">
        <span className="info-label">{label}</span>
        <span className="info-value" style={accent ? { color:"#0047D4" } : {}}>{value || "—"}</span>
      </div>
    </div>
  );
}

/* ─── AVATAR MODAL ───────────────────────────────────────────────── */
function AvatarModal({ currentNumId, onSave, onClose }: {
  currentNumId: string; onSave: (numId: string) => void; onClose: () => void;
}) {
  const [preview, setPreview] = useState(currentNumId);
  const previewAv = getAvatarByNumId(preview);
  return (
    <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}><X size={15}/></button>
        <div className="modal-title">Choose Your Avatar</div>
        <div className="modal-sub">Select an avatar that reflects your Syntra focus.</div>
        <div className="modal-preview">
          <div className="modal-preview-ring" style={{ background: previewAv.lightBg, border:`2.5px solid ${previewAv.accent}` }}>
            <div style={{ width:68, height:68 }}>{previewAv.svg}</div>
          </div>
          <div>
            <div className="modal-preview-name" style={{ color: previewAv.accent }}>{previewAv.name}</div>
            <div className="modal-preview-focus">{previewAv.focus}</div>
          </div>
        </div>
        <div className="modal-grid">
          {AVATARS.map(av => {
            const sel = preview === av.numId;
            return (
              <button key={av.id}
                className={`modal-av-btn${sel?" modal-av-selected":""}`}
                style={sel ? { borderColor:av.accent, background:av.lightBg, boxShadow:`0 6px 20px ${av.accent}22` } : {}}
                onClick={() => setPreview(av.numId)}>
                <div className="modal-av-img" style={sel ? { boxShadow:`0 0 0 3px ${av.accent}55` } : {}}>
                  {av.svg}
                </div>
                <span className="modal-av-name" style={sel ? { color:av.accent } : {}}>{av.name}</span>
                <span className="modal-av-focus">{av.focus}</span>
                {sel && <div className="modal-av-check" style={{ background:av.accent }}><Check size={9} color="#fff"/></div>}
              </button>
            );
          })}
        </div>
        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-btn-save" onClick={() => onSave(preview)} disabled={preview===currentNumId}>
            <Check size={13}/> Save Avatar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── SECTION HEADING ────────────────────────────────────────────── */
function SectionHeading({ icon: Icon, title, sub, color = "#0047D4" }: {
  icon: any; title: string; sub: string; color?: string;
}) {
  return (
    <div className="section-heading">
      <div className="sh-icon" style={{ background:`${color}12`, color }}><Icon size={16}/></div>
      <div>
        <div className="sh-title">{title}</div>
        <div className="sh-sub">{sub}</div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { data: session } = useSession();
  const [mounted, setMounted]                 = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [activeSection, setActiveSection]     = useState("sec-profile");

  /* ── Section refs ── */
  const refProfile      = useRef<HTMLDivElement>(null);
  const refOptimization = useRef<HTMLDivElement>(null);
  const refData         = useRef<HTMLDivElement>(null);
  const scrollRef       = useRef<HTMLDivElement>(null);

  const isProgrammaticScroll         = useRef(false);
  const programmaticScrollTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sectionOrder = ["sec-profile", "sec-optimization", "sec-data"] as const;

  const sectionRefs: Record<string, React.RefObject<HTMLDivElement>> = {
    "sec-profile":      refProfile,
    "sec-optimization": refOptimization,
    "sec-data":         refData,
  };

  const { data: profileRes, mutate: mutateProfile } = useSWR<any>("/api/profile", fetcher);
  const { data: dashData }                           = useSWR<any>("/api/dashboard", fetcher, { dedupingInterval:60000, revalidateOnFocus:true });

  const [profile, setProfile] = useState({
    name:"", email:"", age:"", avatarId:"1",
    optimizationVector:"career" as OptVector,
    gender:"male", height:"", weight:"",
    averageSleep:"7", workoutFrequency:"3",
    activityLevel:"moderately_active", healthConstraints:"none",
    customHealthConstraint:"",
    monthlyIncome:"", currentSavings:"", spendingStyle:"3",
    hoursStudied:"3", learningProfile:"", archetype:"", personalMission:"",
  });

  const [editMode,             setEditMode]             = useState(false);
  const [editName,             setEditName]             = useState("");
  const [editEmail,            setEditEmail]            = useState("");
  const [editAge,              setEditAge]              = useState("");
  const [editGender,           setEditGender]           = useState("male");
  const [editHeight,           setEditHeight]           = useState("");
  const [editWeight,           setEditWeight]           = useState("");
  const [editSleep,            setEditSleep]            = useState("7");
  const [editWorkouts,         setEditWorkouts]         = useState("3");
  const [editActivity,         setEditActivity]         = useState("moderately_active");
  const [editConstraints,      setEditConstraints]      = useState("none");
  const [editCustomConstraint, setEditCustomConstraint] = useState("");
  const [editIncome,           setEditIncome]           = useState("");
  const [editSavings,          setEditSavings]          = useState("");
  const [editSpending,         setEditSpending]         = useState("3");
  const [editStudy,            setEditStudy]            = useState("3");
  const [editLearning,         setEditLearning]         = useState("");
  const [editArchetype,        setEditArchetype]        = useState("");
  const [editMission,          setEditMission]          = useState("");

  const [credsOpen,    setCredsOpen]    = useState(false);
  const [currentPw,    setCurrentPw]    = useState("");
  const [newPw,        setNewPw]        = useState("");
  const [confirmPw,    setConfirmPw]    = useState("");
  const [showCurPw,    setShowCurPw]    = useState(false);
  const [showNewPw,    setShowNewPw]    = useState(false);
  const [showConPw,    setShowConPw]    = useState(false);
  const [pwError,      setPwError]      = useState("");
  const [pwSuccess,    setPwSuccess]    = useState(false);
  const [vectorPulse,  setVectorPulse]  = useState(false);

  const twinText = useTypewriter("Twin Profile");

  /* ── Populate from API ── */
  useEffect(() => {
    setMounted(true);
    if (profileRes?.success && profileRes?.user) {
      const u = profileRes.user, p = u.profile || {};
      setProfile({
        name: u.name||"", email: u.email||"",
        age: u.age!=null ? String(u.age) : "",
        avatarId: String(u.avatarId||"1"),
        optimizationVector: u.optimizationVector||"career",
        gender: p.gender||"male",
        height: p.height!=null ? String(p.height) : "",
        weight: p.weight!=null ? String(p.weight) : "",
        averageSleep: String(p.averageSleep||"7"),
        workoutFrequency: String(p.workoutFrequency||"3"),
        activityLevel: p.activityLevel||"moderately_active",
        healthConstraints: u.healthConstraints||"none",
        customHealthConstraint: !["none","diabetes","hypertension","asthma"].includes(u.healthConstraints||"none") ? (u.healthConstraints||"") : "",
        monthlyIncome: p.monthlyIncome!=null ? String(p.monthlyIncome) : "",
        currentSavings: p.currentSavings!=null ? String(p.currentSavings) : "",
        spendingStyle: String(p.spendingStyle||"3"),
        hoursStudied: String(p.hoursStudied||"3"),
        learningProfile: p.learningProfile||"",
        archetype: p.archetype||"",
        personalMission: u.personalMission||"",
      });
    } else if (session?.user) {
      setProfile(p => ({ ...p, name:session.user?.name||"", email:session.user?.email||"" }));
    }
  }, [profileRes, session]);

  /* ── Scroll spy ── */
  const computeActiveSection = useCallback((): string => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return "sec-profile";

    const containerTop    = scrollEl.getBoundingClientRect().top;
    const containerBottom = containerTop + scrollEl.clientHeight;

    let bestId: typeof sectionOrder[number] = sectionOrder[0];
    let bestVisible = -1;

    for (const id of sectionOrder) {
      const el = sectionRefs[id]?.current;
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      const visTop    = Math.max(rect.top,    containerTop);
      const visBottom = Math.min(rect.bottom, containerBottom);
      const visible   = Math.max(0, visBottom - visTop);

      if (visible > bestVisible) {
        bestVisible = visible;
        bestId      = id;
      }
    }

    return bestId;
  }, []);

  const handleScroll = useCallback(() => {
    if (isProgrammaticScroll.current) return;
    setActiveSection(computeActiveSection());
  }, [computeActiveSection]);

  useEffect(() => {
    if (!mounted) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    const raf = requestAnimationFrame(() => setActiveSection(computeActiveSection()));

    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(raf);
    };
  }, [mounted, handleScroll, computeActiveSection]);

  const scrollToSection = useCallback((id: string) => {
    const el = sectionRefs[id]?.current;
    if (!el) return;

    isProgrammaticScroll.current = true;
    if (programmaticScrollTimer.current) clearTimeout(programmaticScrollTimer.current);

    setActiveSection(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });

    programmaticScrollTimer.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
      setActiveSection(computeActiveSection());
    }, 750);
  }, [computeActiveSection]);

  const selectedAvatar = getAvatarByNumId(profile.avatarId);

  const vectorMeta: Record<OptVector,{ label:string; color:string; bg:string; icon:any; desc:string }> = {
    career:  { label:"Career",  color:"#0066FF", bg:"#eff6ff", icon:Briefcase, desc:"Focus time and productivity output." },
    health:  { label:"Health",  color:"#ef4444", bg:"#fef2f2", icon:HeartPulse,desc:"Sleep, energy and fitness metrics." },
    finance: { label:"Finance", color:"#10b981", bg:"#f0fdf4", icon:Wallet,    desc:"Savings rate and spending patterns." },
  };
  const activeVector = vectorMeta[profile.optimizationVector];

  /* ── Handlers ── */
  const handleEditStart = () => {
    setEditName(profile.name); setEditEmail(profile.email); setEditAge(profile.age);
    setEditGender(profile.gender); setEditHeight(profile.height); setEditWeight(profile.weight);
    setEditSleep(profile.averageSleep); setEditWorkouts(profile.workoutFrequency);
    setEditActivity(profile.activityLevel);
    const std = ["none","diabetes","hypertension","asthma"].includes(profile.healthConstraints||"none");
    setEditConstraints(std ? (profile.healthConstraints||"none") : "custom");
    setEditCustomConstraint(std ? "" : (profile.healthConstraints||""));
    setEditIncome(profile.monthlyIncome); setEditSavings(profile.currentSavings);
    setEditSpending(profile.spendingStyle); setEditStudy(profile.hoursStudied);
    setEditLearning(profile.learningProfile); setEditArchetype(profile.archetype);
    setEditMission(profile.personalMission); setEditMode(true);
  };

  const handleEditSave = async () => {
    setLoading(true);
    try {
      const finalHC = editConstraints==="custom" ? (editCustomConstraint||"none") : editConstraints;
      const res = await fetch("/api/profile", {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          name:editName, age:editAge?Number(editAge):undefined,
          avatarId:Number(profile.avatarId)||1,
          optimizationVector:profile.optimizationVector,
          personalMission:editMission, healthConstraints:finalHC,
          gender:editGender,
          height:editHeight?Number(editHeight):undefined,
          weight:editWeight?Number(editWeight):undefined,
          averageSleep:Number(editSleep)||7, workoutFrequency:Number(editWorkouts)||3,
          activityLevel:editActivity,
          monthlyIncome:editIncome?Number(editIncome):undefined,
          currentSavings:editSavings?Number(editSavings):undefined,
          spendingStyle:Number(editSpending)||3,
          hoursStudied:Number(editStudy)||3,
          learningProfile:editLearning, archetype:editArchetype,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error||"Failed to update profile.");
      mutateProfile(); setEditMode(false);
      window.dispatchEvent(new Event("syntra-refresh"));
    } catch(e:any) { alert(e.message||"Save failed."); }
    finally { setLoading(false); }
  };

  const handleAvatarSave = async (numId: string) => {
    setProfile(p => ({ ...p, avatarId:numId }));
    setAvatarModalOpen(false);
    try {
      await fetch("/api/profile", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ avatarId:Number(numId) }) });
      mutateProfile(); window.dispatchEvent(new Event("syntra-refresh"));
    } catch(e) { console.error(e); }
  };

  const handleVectorSelect = async (v: OptVector) => {
    setProfile(p => ({ ...p, optimizationVector:v }));
    setVectorPulse(true); setTimeout(()=>setVectorPulse(false), 600);
    try {
      await fetch("/api/profile", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ optimizationVector:v }) });
      mutateProfile(); window.dispatchEvent(new Event("syntra-refresh"));
    } catch(e) { console.error(e); }
  };

  const handlePwSubmit = () => {
    setPwError("");
    if (!currentPw) { setPwError("Enter your current password."); return; }
    if (newPw.length<8) { setPwError("New password must be at least 8 characters."); return; }
    if (newPw!==confirmPw) { setPwError("Passwords do not match."); return; }
    fetch("/api/auth/change-password", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ currentPassword:currentPw, newPassword:newPw }) })
      .then(async res=>{ const d=await res.json(); if(!res.ok) throw new Error(d.error||"Failed."); setPwSuccess(true); setTimeout(()=>{ setPwSuccess(false); setCredsOpen(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }, 2200); })
      .catch(err=>setPwError(err.message));
  };

  if (!mounted) return null;

  const spendLabel    = (v:string) => v==="1"?"Very frugal":v==="2"?"Careful":v==="3"?"Balanced":v==="4"?"Generous":"Big spender";
  const activityLabel = (v:string) => v==="sedentary"?"Mostly sitting":v==="lightly_active"?"Lightly active":v==="moderately_active"?"Moderately active":v==="very_active"?"Very active":"Athlete";
  const learnLabel    = (v:string) => v==="student"?"Student — exams or placement prep":v==="professional"?"Working professional":v==="founder"?"Founder / builder":v==="freelancer"?"Freelancer":v==="job_seeker"?"Actively job seeking":v;

  return (
    <div className="pf-root">
      <style>{CSS}</style>

      {/* ── TOP NAVBAR ── */}
      <TopNav />

      {/* ── AVATAR MODAL ── */}
      {avatarModalOpen && <AvatarModal currentNumId={profile.avatarId} onSave={handleAvatarSave} onClose={()=>setAvatarModalOpen(false)}/>}

      {/* ── CREDENTIALS MODAL ── */}
      {credsOpen && (
        <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) setCredsOpen(false); }}>
          <div className="modal-box" style={{ maxWidth:400 }}>
            <button className="modal-close" onClick={()=>setCredsOpen(false)}><X size={15}/></button>
            <div className="modal-title">Update Password</div>
            <div className="modal-sub">Changes apply immediately after saving.</div>
            {pwSuccess ? (
              <div className="pw-success"><CheckCircle2 size={16} color="#10b981"/> Password updated successfully!</div>
            ) : (
              <>
                {pwError && <div className="pw-error"><X size={12}/> {pwError}</div>}
                {[
                  { label:"Current Password", val:currentPw, set:setCurrentPw, show:showCurPw, toggle:()=>setShowCurPw(v=>!v), ph:"Enter current password" },
                  { label:"New Password",     val:newPw,     set:setNewPw,     show:showNewPw, toggle:()=>setShowNewPw(v=>!v), ph:"At least 8 characters"  },
                  { label:"Confirm Password", val:confirmPw, set:setConfirmPw, show:showConPw, toggle:()=>setShowConPw(v=>!v), ph:"Repeat new password"     },
                ].map(f=>(
                  <div key={f.label} className="pw-field">
                    <label className="pw-label">{f.label}</label>
                    <div className="pw-input-wrap">
                      <input className="pw-input" type={f.show?"text":"password"} placeholder={f.ph}
                        value={f.val} onChange={e=>f.set(e.target.value)}
                        onKeyDown={f.label==="Confirm Password"?(e=>e.key==="Enter"&&handlePwSubmit()):undefined}/>
                      <button className="pw-toggle" onClick={f.toggle}>{f.show?<EyeOff size={14}/>:<Eye size={14}/>}</button>
                    </div>
                  </div>
                ))}
                <button className="pw-submit" onClick={handlePwSubmit}>Update Password</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ PAGE BODY ═══════════════ */}
      <div className="pf-body">

        {/* ═══════════════ SIDEBAR ═══════════════ */}
        <div className="sidebar">
          <div className="sb-grid"/>
          <div className="sidebar-top-rule"/>

          {/* Brand */}
          <div className="sb-brand-block">
            <div className="sb-logo"><div className="sb-logo-dot"/>Syntra</div>
            <div className="sb-heading">Twin Profile</div>
            <div className="sb-sub">Your digital identity and AI twin configuration.</div>
          </div>

          {/* Scroll-anchor navigation */}
          <div className="sb-sections">
            {NAV_SECTIONS.map(item => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  className={`sb-section-item${isActive?" sb-section-active":""}`}
                  onClick={() => scrollToSection(item.id)}
                >
                  <div className="sb-section-icon"><item.icon size={14}/></div>
                  <div className="sb-section-text">
                    <span className="sb-section-label">{item.label}</span>
                    <span className="sb-section-sub">{item.sub}</span>
                  </div>
                  {isActive && <ChevronRight size={12} className="sb-section-arrow"/>}
                </button>
              );
            })}
          </div>

          {/* Status pill */}
          <div className="sb-status">
            <div className="sb-status-dot"/>
            <div>
              <div className="sb-status-label">Twin Status</div>
              <div className="sb-status-val">Online & Syncing</div>
            </div>
          </div>

          {/* Sign out */}
          <button className="sb-signout" onClick={()=>signOut({ callbackUrl:"/" })}>
            <LogOut size={13}/> Sign Out
          </button>
        </div>

        {/* ═══════════════ SCROLLABLE CONTENT ═══════════════ */}
        <div className="pf-right" ref={scrollRef}>
          <div className="pf-inner">

            {/* Back + page heading */}
            <div className="pf-topbar">
              <button className="back-btn" onClick={()=>history.back()}>
                <ArrowLeft size={13}/> Return to Dashboard
              </button>
              {!editMode && (
                <button className="edit-config-btn" onClick={handleEditStart}>
                  <Edit3 size={13}/> Edit Configuration
                </button>
              )}
            </div>

            <div className="pf-heading-block">
              <h1 className="pf-title">
                <span style={{ color:"#0047D4" }}>{twinText.slice(0,4)||""}</span>
                <span style={{ color:"#0D1117" }}>{twinText.slice(4)||""}</span>
                <span className="pf-cursor"/>
              </h1>
              <p className="pf-subtitle">Your digital identity, settings, and AI twin configuration — all in one place.</p>
            </div>

            {/* ══════════════════════════════════════
                SECTION 1 — TWIN PROFILE
            ══════════════════════════════════════ */}
            <div ref={refProfile} id="sec-profile" className="content-section">
              <SectionHeading icon={User} title="Twin Profile" sub="Your personal information and identity settings" color="#0047D4"/>

              {/* Hero identity card */}
              <div className="card mb-14">
                <div className="hero-banner"/>
                <div className="hero-body">
                  <div className="avatar-row">
                    <div className="avatar-outer" onClick={()=>setAvatarModalOpen(true)} title="Click to change avatar">
                      <div className="avatar-glow"/>
                      <div className="avatar-ring" style={{ background:selectedAvatar.lightBg }}>
                        <div style={{ width:80, height:80 }}>{selectedAvatar.svg}</div>
                      </div>
                      <div className="avatar-edit-overlay"><Camera size={14} color="#fff"/></div>
                    </div>
                    <div className="avatar-meta">
                      <div className="hero-name">{profile.name||"Your Name"}</div>
                      <div className="twin-badge"><Sparkles size={9} style={{ color:"#0047D4" }}/> Syntra Twin — {selectedAvatar.name}</div>
                      <div className="avatar-change-hint" onClick={()=>setAvatarModalOpen(true)}><Camera size={10}/> Change avatar</div>
                    </div>
                  </div>

                  {editMode ? (
                    <div className="edit-grid-single">
                      {[
                        { label:"Full Name",       val:editName,    set:setEditName,    type:"text",  ph:"Full name" },
                        { label:"Email Address",   val:editEmail,   set:setEditEmail,   type:"email", ph:"Email address" },
                        { label:"Age",             val:editAge,     set:setEditAge,     type:"number",ph:"Age" },
                        { label:"Personal Mission",val:editMission, set:setEditMission, type:"text",  ph:"What you're working toward" },
                      ].map(f=>(
                        <div key={f.label} className="form-group">
                          <label className="form-label">{f.label}</label>
                          <input className="form-input" type={f.type} placeholder={f.ph} value={f.val} onChange={e=>f.set(e.target.value)}/>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="info-section">
                      <InfoRow icon={User}     label="Full Name"        value={profile.name}/>
                      <div className="info-divider"/>
                      <InfoRow icon={Mail}     label="Email Address"    value={profile.email}/>
                      <div className="info-divider"/>
                      <InfoRow icon={Calendar} label="Age"              value={profile.age?`${profile.age} years`:""}/>
                      <div className="info-divider"/>
                      <InfoRow icon={Target}   label="Personal Mission" value={profile.personalMission||"Achieve Personal Optimisation"}/>
                      <div className="info-divider"/>
                      <InfoRow icon={Shield}   label="Access Level"     value="Authenticated Member" accent/>
                      <button className="creds-btn" onClick={()=>setCredsOpen(true)}><Lock size={11}/> Update Password</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Telemetry card */}
              <div className="card mb-0">
                <div className="card-header">
                  <div className="card-hicon" style={{ background:"rgba(0,68,221,0.07)" }}><Cpu size={17} color="#0044DD"/></div>
                  <div>
                    <div className="card-title">Twin Telemetry Settings</div>
                    <div className="card-sub">Health, financial, and behavioural parameters from your onboarding</div>
                  </div>
                </div>
                <div className="card-body">
                  {editMode ? (
                    <div style={{ display:"flex",flexDirection:"column",gap:24 }}>
                      {/* Health edit */}
                      <div>
                        <div className="section-divider-label" style={{ color:"#ef4444" }}><HeartPulse size={11}/> Health & Body</div>
                        <div className="edit-grid">
                          {[
                            { label:"Gender", field:"sel", val:editGender, set:setEditGender, opts:[{v:"male",l:"Male"},{v:"female",l:"Female"},{v:"non-binary",l:"Non-Binary"}] },
                            { label:"Height (cm)", field:"num", val:editHeight, set:setEditHeight, ph:"cm" },
                            { label:"Weight (kg)", field:"num", val:editWeight, set:setEditWeight, ph:"kg" },
                            { label:"Activity Level", field:"sel", val:editActivity, set:setEditActivity, opts:[
                              {v:"sedentary",l:"Mostly sitting"},{v:"lightly_active",l:"Lightly active"},
                              {v:"moderately_active",l:"Moderately active"},{v:"very_active",l:"Very active"},{v:"athlete",l:"Athlete"}
                            ] },
                          ].map(f=>(
                            <div key={f.label} className="form-group">
                              <label className="form-label">{f.label}</label>
                              {f.field==="sel"
                                ? <select className="form-select" value={f.val} onChange={e=>f.set(e.target.value)}>
                                    {(f.opts||[]).map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                                  </select>
                                : <input className="form-input" type="number" value={f.val} onChange={e=>f.set(e.target.value)} placeholder={(f as any).ph||""}/>
                              }
                            </div>
                          ))}
                        </div>
                        <div className="edit-grid-single">
                          {[
                            { label:`Sleep per night — ${editSleep}h`,     val:editSleep,    set:setEditSleep,    min:"4",  max:"10", step:"0.5" },
                            { label:`Workouts per week — ${editWorkouts}×`, val:editWorkouts, set:setEditWorkouts, min:"0",  max:"7",  step:"1"   },
                          ].map(s=>(
                            <div key={s.label} className="form-group">
                              <label className="form-label">{s.label}</label>
                              <input className="form-slider" type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e=>s.set(e.target.value)}/>
                            </div>
                          ))}
                          <div className="form-group">
                            <label className="form-label">Health Conditions</label>
                            <select className="form-select" value={editConstraints} onChange={e=>setEditConstraints(e.target.value)}>
                              <option value="none">None</option>
                              <option value="diabetes">Diabetes</option>
                              <option value="hypertension">High Blood Pressure</option>
                              <option value="asthma">Asthma</option>
                              <option value="custom">Other</option>
                            </select>
                          </div>
                          {editConstraints==="custom"&&(
                            <div className="form-group">
                              <label className="form-label">Describe condition</label>
                              <input className="form-input" value={editCustomConstraint} onChange={e=>setEditCustomConstraint(e.target.value)} placeholder="e.g. Thyroid, Migraines…"/>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Finance edit */}
                      <div>
                        <div className="section-divider-label" style={{ color:"#10b981" }}><Wallet size={11}/> Finances</div>
                        <div className="edit-grid">
                          <div className="form-group">
                            <label className="form-label">Monthly Income (₹)</label>
                            <input className="form-input" type="number" value={editIncome} onChange={e=>setEditIncome(e.target.value)} placeholder="Monthly income"/>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Current Savings (₹)</label>
                            <input className="form-input" type="number" value={editSavings} onChange={e=>setEditSavings(e.target.value)} placeholder="Total savings"/>
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Spending Style — {spendLabel(editSpending)}</label>
                          <input className="form-slider" type="range" min="1" max="5" step="1" value={editSpending} onChange={e=>setEditSpending(e.target.value)}/>
                        </div>
                      </div>
                      {/* Career edit */}
                      <div>
                        <div className="section-divider-label" style={{ color:"#0066FF" }}><Briefcase size={11}/> Career & Habits</div>
                        <div className="edit-grid">
                          <div className="form-group">
                            <label className="form-label">Your Situation</label>
                            <select className="form-select" value={editLearning} onChange={e=>setEditLearning(e.target.value)}>
                              <option value="">Select…</option>
                              <option value="student">Student — exams or placement</option>
                              <option value="professional">Working professional</option>
                              <option value="founder">Founder / builder</option>
                              <option value="freelancer">Freelancer</option>
                              <option value="job_seeker">Actively job seeking</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Focus Archetype</label>
                            <select className="form-select" value={editArchetype} onChange={e=>setEditArchetype(e.target.value)}>
                              <option value="">Select…</option>
                              <option value="chronos">Chronos — Learning & Growth</option>
                              <option value="apex">Apex — Productivity & Discipline</option>
                              <option value="nexus">Nexus — Wealth & Planning</option>
                              <option value="titan">Titan — Fitness & Energy</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Daily Study / Work Hours — {editStudy}h</label>
                          <input className="form-slider" type="range" min="0" max="14" step="0.5" value={editStudy} onChange={e=>setEditStudy(e.target.value)}/>
                        </div>
                      </div>
                      <div className="edit-actions">
                        <button className="btn-save" onClick={handleEditSave} disabled={loading}>
                          {loading?<RefreshCw size={13} style={{animation:"spin 0.8s linear infinite"}}/>:<Save size={13}/>} Save All Changes
                        </button>
                        <button className="btn-cancel" onClick={()=>setEditMode(false)}><X size={13}/> Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="info-section">
                      <div className="section-divider-label" style={{ color:"#ef4444",marginBottom:6 }}><HeartPulse size={11}/> Health & Body</div>
                      <InfoRow icon={User}      label="Gender"         value={profile.gender==="non-binary"?"Non-Binary":(profile.gender?profile.gender.replace(/\b\w/g,c=>c.toUpperCase()):"")}/>
                      <div className="info-divider"/>
                      <InfoRow icon={Calendar}  label="Height / Weight" value={profile.height&&profile.weight?`${profile.height} cm / ${profile.weight} kg`:""}/>
                      <div className="info-divider"/>
                      <InfoRow icon={HeartPulse}label="Activity Level"  value={activityLabel(profile.activityLevel)}/>
                      <div className="info-divider"/>
                      <InfoRow icon={Zap}       label="Sleep per Night" value={profile.averageSleep?`${profile.averageSleep}h`:""}/>
                      <div className="info-divider"/>
                      <InfoRow icon={Flame}     label="Workouts / Week" value={profile.workoutFrequency?`${profile.workoutFrequency}×`:""}/>
                      <div className="info-divider"/>
                      <InfoRow icon={Shield}    label="Health Conditions" value={profile.healthConstraints==="none"?"None (Generally healthy)":profile.healthConstraints==="diabetes"?"Diabetes":profile.healthConstraints==="hypertension"?"High Blood Pressure":profile.healthConstraints==="asthma"?"Asthma":(profile.healthConstraints||"")}/>
                      <div className="section-divider-label" style={{ color:"#10b981",marginTop:18,marginBottom:6 }}><Wallet size={11}/> Finances</div>
                      <InfoRow icon={Wallet}    label="Monthly Income"   value={profile.monthlyIncome?`₹${Number(profile.monthlyIncome).toLocaleString("en-IN")}`:""} accent/>
                      <div className="info-divider"/>
                      <InfoRow icon={Trophy}    label="Current Savings"  value={profile.currentSavings?`₹${Number(profile.currentSavings).toLocaleString("en-IN")}`:""} accent/>
                      <div className="info-divider"/>
                      <InfoRow icon={Briefcase} label="Spending Style"   value={spendLabel(profile.spendingStyle)}/>
                      <div className="section-divider-label" style={{ color:"#0066FF",marginTop:18,marginBottom:6 }}><Briefcase size={11}/> Career & Habits</div>
                      <InfoRow icon={Zap}       label="Current Situation" value={learnLabel(profile.learningProfile)}/>
                      <div className="info-divider"/>
                      <InfoRow icon={BookOpen}  label="Focus Archetype"   value={profile.archetype==="chronos"?"Chronos — Learning & Growth":profile.archetype==="apex"?"Apex — Productivity & Discipline":profile.archetype==="nexus"?"Nexus — Wealth & Planning":profile.archetype==="titan"?"Titan — Fitness & Energy":(profile.archetype||"")}/>
                      <div className="info-divider"/>
                      <InfoRow icon={Target}    label="Daily Study Hours" value={profile.hoursStudied?`${profile.hoursStudied}h/day`:""}/>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════
                SECTION 2 — OPTIMISATION
            ══════════════════════════════════════ */}
            <div ref={refOptimization} id="sec-optimization" className="content-section">
              <SectionHeading icon={BarChart3} title="Optimisation" sub="Choose which area Syntra should prioritise in its recommendations" color={activeVector.color}/>
              <div className="card mb-0">
                <div className="card-body">
                  <div className="vector-grid">
                    {(["health","finance","career"] as OptVector[]).map(v=>{
                      const m=vectorMeta[v], VIcon=m.icon, sel=profile.optimizationVector===v;
                      return (
                        <div key={v}
                          className={`vector-card${sel?" vector-selected":""}${sel&&vectorPulse?" vector-pulse":""}`}
                          style={{ background:m.bg, ["--vc" as any]:m.color }}
                          onClick={()=>handleVectorSelect(v)}>
                          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                            <div className="vector-icon" style={{ background:`${m.color}16` }}><VIcon size={17} color={m.color}/></div>
                            {sel&&<div className="vector-active-chip" style={{ background:`${m.color}14`,color:m.color,border:`1px solid ${m.color}28` }}><CheckCircle2 size={9}/> Active</div>}
                          </div>
                          <div className="vector-name" style={{ color:m.color }}>{m.label}</div>
                          <div className="vector-desc">{m.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════
                SECTION 3 — DATA LAYERS
            ══════════════════════════════════════ */}
            <div ref={refData} id="sec-data" className="content-section" style={{ paddingBottom:80 }}>
              <SectionHeading icon={Layers} title="Data Layers" sub="Overview of all active data sources powering your twin" color="#7c3aed"/>
              <div className="card mb-0">
                <div className="card-body">
                  <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                    {[
                      { icon:HeartPulse, label:"Health Layer",      value:"Biometrics, sleep, workouts",  color:"#ef4444", status:"active" },
                      { icon:Wallet,     label:"Finance Layer",     value:"Income, savings, spending",    color:"#10b981", status:"active" },
                      { icon:Briefcase,  label:"Career Layer",      value:"Study hours, focus, archetype",color:"#0066FF", status:"active" },
                      { icon:BarChart3,  label:"Behavioural Layer", value:"Daily logs, patterns",         color:"#7c3aed", status:"active" },
                    ].map((layer,i)=>(
                      <div key={i} className="data-layer-row">
                        <div className="data-layer-icon" style={{ background:`${layer.color}12`, color:layer.color }}>
                          <layer.icon size={15}/>
                        </div>
                        <div style={{ flex:1 }}>
                          <div className="data-layer-label">{layer.label}</div>
                          <div className="data-layer-value">{layer.value}</div>
                        </div>
                        <div className="data-layer-status" style={{ color:"#10b981" }}>
                          <div className="data-layer-dot" style={{ background:"#10b981" }}/>
                          Active
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>{/* pf-inner */}
        </div>{/* pf-right */}
      </div>{/* pf-body */}
    </div>
  );
}

/* ─── CSS ────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root {
    --brand:#0047D4; --brand-lt:#EEF3FF; --brand-mid:#C7D7FA;
    --surface:#FFFFFF; --bg:#F4F6FB; --border:#E4E9F4; --border-h:#C7D7FA;
    --txt-1:#0D1117; --txt-2:#52637A; --txt-muted:#94A3B8;
    --sh-sm:0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);
    --sh-md:0 4px 16px rgba(0,0,0,0.07),0 1px 4px rgba(0,0,0,0.04);
    --sh-lg:0 8px 32px rgba(0,71,212,0.10),0 2px 8px rgba(0,0,0,0.04);
    --r-md:12px; --r-lg:16px; --r-xl:20px; --r-2xl:24px;
    --nav-h:70px;
  }
  body { background:var(--bg); font-family:"Inter",sans-serif; -webkit-font-smoothing:antialiased; color:var(--txt-1); }

  @keyframes spin     { to{transform:rotate(360deg);} }
  @keyframes fadeIn   { from{opacity:0;}to{opacity:1;} }
  @keyframes slideUp  { from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);} }
  @keyframes lp-pulse { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:.62;transform:scale(1.36);} }
  @keyframes curBlink { 0%,100%{opacity:.88;}48%,52%{opacity:0;} }
  @keyframes vPulse   { 0%{transform:scale(1.02);}50%{transform:scale(1.04);}100%{transform:scale(1.02);} }

  /* ═══ TOP NAVBAR ═══ */
  .top-nav {
    position:fixed; top:0; left:0; width:100%;
    z-index:500; height:var(--nav-h);
    background:rgba(255,255,255,0.92);
    backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    border-bottom:1px solid rgba(214,220,232,0.6);
    transition:background 0.28s ease,border-color 0.28s ease,box-shadow 0.28s ease;
  }
  .top-nav.top-nav-scrolled { background:#ffffff; border-color:#e2e6f0; box-shadow:0 2px 20px rgba(0,0,0,0.08); }
  .top-nav-inner { max-width:1600px; margin:0 auto; height:100%; display:flex; align-items:center; justify-content:space-between; padding:0 2.5rem; }
  .top-nav-logo { font-family:"DM Sans",sans-serif; font-size:1.55rem; font-weight:300; color:var(--brand); text-decoration:none; letter-spacing:0.2em; text-transform:uppercase; transition:opacity 0.2s; }
  .top-nav-logo:hover { opacity:0.78; }
  .top-nav-logo strong { font-weight:800; letter-spacing:0.1em; }
  .top-nav-links { display:flex; align-items:center; gap:4px; }
  .top-nav-link { font-family:"Inter",sans-serif; font-size:0.84rem; font-weight:500; color:#555; text-decoration:none; padding:7px 14px; border-radius:9999px; transition:all 0.2s; letter-spacing:0.01em; }
  .top-nav-link:hover { background:#f0f4ff; color:var(--brand); }
  .top-nav-link-active { background:var(--brand) !important; color:#fff !important; font-weight:600; }
  .top-nav-hamburger { display:none; flex-direction:column; gap:5px; cursor:pointer; padding:8px; border:1.5px solid #e0e0e0; border-radius:10px; background:#f5f5f5; transition:all 0.2s; }
  .top-nav-hamburger:hover { border-color:var(--brand-mid); background:var(--brand-lt); }
  .top-nav-hamburger span { display:block; width:20px; height:2px; background:#333; border-radius:2px; }
  .top-nav-mobile-menu { display:none; flex-direction:column; gap:5px; position:absolute; top:calc(var(--nav-h) + 4px); right:20px; width:210px; padding:12px; border-radius:16px; background:rgba(255,255,255,0.97); backdrop-filter:blur(20px); border:1px solid #e8ebf4; box-shadow:0 12px 40px rgba(0,68,220,0.12); z-index:600; }
  .top-nav-mobile-menu.open { display:flex; }
  .top-nav-mobile-link { font-family:"Inter",sans-serif; font-size:0.88rem; font-weight:500; color:#333; text-decoration:none; padding:10px 14px; border-radius:10px; transition:all 0.16s; }
  .top-nav-mobile-link:hover { background:#f0f4ff; color:var(--brand); }
  .top-nav-mobile-link.active { background:var(--brand-lt); color:var(--brand); font-weight:700; }

  /* ═══ LAYOUT ═══ */
  .pf-root { display:flex; flex-direction:column; min-height:100vh; background:var(--bg); }
  .pf-body { display:flex; flex:1; padding-top:var(--nav-h); }

  /* ═══ SIDEBAR ═══ */
  .sidebar {
    width:288px; flex-shrink:0;
    background:linear-gradient(160deg,#0036BB 0%,#0052E8 45%,#2A18E8 100%);
    display:flex; flex-direction:column;
    position:sticky; top:var(--nav-h); height:calc(100vh - var(--nav-h)); overflow:hidden;
    box-shadow:4px 0 24px rgba(0,36,187,0.18); z-index:10;
  }
  .sidebar::before { content:''; position:absolute; top:-90px; left:-70px; width:260px; height:260px; border-radius:50%; background:radial-gradient(circle,rgba(255,255,255,0.12) 0%,transparent 70%); pointer-events:none; }
  .sidebar::after  { content:''; position:absolute; bottom:-60px; right:-50px; width:220px; height:220px; border-radius:50%; background:radial-gradient(circle,rgba(255,255,255,0.08) 0%,transparent 70%); pointer-events:none; }
  .sb-grid { position:absolute; inset:0; pointer-events:none; background-image:linear-gradient(rgba(255,255,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.035) 1px,transparent 1px); background-size:44px 44px; }
  .sidebar-top-rule { height:3px; background:linear-gradient(90deg,rgba(255,255,255,0.22),rgba(255,255,255,0.06)); flex-shrink:0; position:relative; z-index:2; }

  .sb-brand-block { padding:20px 22px 16px; position:relative; z-index:2; border-bottom:1px solid rgba(255,255,255,0.1); }
  .sb-logo { display:inline-flex; align-items:center; gap:7px; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.2); border-radius:9999px; padding:5px 14px; font-size:0.68rem; font-weight:800; color:#fff; letter-spacing:0.13em; text-transform:uppercase; margin-bottom:16px; font-family:"DM Sans",sans-serif; }
  .sb-logo-dot { width:6px; height:6px; border-radius:50%; background:#4ade80; box-shadow:0 0 8px rgba(74,222,128,0.85); animation:lp-pulse 2.2s infinite; flex-shrink:0; }
  .sb-heading { font-family:"DM Sans",sans-serif; font-size:1.35rem; font-weight:800; color:#fff; letter-spacing:-0.03em; line-height:1.2; }
  .sb-sub { font-size:0.76rem; color:rgba(255,255,255,0.58); margin-top:6px; line-height:1.58; }

  .sb-sections { padding:16px 12px; display:flex; flex-direction:column; gap:6px; flex:1; position:relative; z-index:2; overflow-y:auto; }
  .sb-section-item { width:100%; display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:13px; border:1px solid transparent; background:transparent; cursor:pointer; text-align:left; transition:all 0.22s cubic-bezier(0.16,1,0.3,1); }
  .sb-section-item:hover { background:rgba(255,255,255,0.09); border-color:rgba(255,255,255,0.12); }
  .sb-section-active { background:rgba(255,255,255,0.16) !important; border-color:rgba(255,255,255,0.26) !important; box-shadow:0 4px 14px rgba(0,0,0,0.12); }
  .sb-section-icon { width:36px; height:36px; border-radius:10px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.14); display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.55); flex-shrink:0; transition:all 0.2s; }
  .sb-section-active .sb-section-icon { background:rgba(255,255,255,0.22); border-color:rgba(255,255,255,0.36); color:#fff; }
  .sb-section-text { display:flex; flex-direction:column; gap:1px; flex:1; min-width:0; }
  .sb-section-label { font-family:"DM Sans",sans-serif; font-size:0.85rem; font-weight:600; color:rgba(255,255,255,0.52); transition:color 0.2s; white-space:nowrap; }
  .sb-section-active .sb-section-label { color:#fff; font-weight:700; }
  .sb-section-sub { font-size:0.68rem; color:rgba(255,255,255,0.34); }
  .sb-section-arrow { color:rgba(255,255,255,0.6); flex-shrink:0; }

  .sb-status { margin:0 12px 14px; padding:14px 15px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:16px; display:flex; align-items:center; gap:12px; position:relative; z-index:2; }
  .sb-status-dot { width:8px; height:8px; border-radius:50%; background:#4ade80; box-shadow:0 0 0 3px rgba(74,222,128,0.22); flex-shrink:0; animation:lp-pulse 2s infinite; }
  .sb-status-label { font-size:0.7rem; font-weight:600; color:rgba(255,255,255,0.48); }
  .sb-status-val   { font-size:0.72rem; font-weight:700; color:#4ade80; }
  .sb-signout { display:flex; align-items:center; justify-content:center; gap:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:11px 14px; color:rgba(255,255,255,0.45); font-size:0.78rem; font-weight:600; cursor:pointer; transition:all 0.2s; margin:0 12px 16px; font-family:"Inter",sans-serif; position:relative; z-index:2; }
  .sb-signout:hover { background:rgba(255,80,80,0.14); border-color:rgba(255,120,120,0.28); color:#fca5a5; }

  /* ═══ SCROLLABLE RIGHT ═══ */
  .pf-right { flex:1; background:var(--bg); overflow-y:auto; overflow-x:hidden; display:flex; justify-content:center; align-items:flex-start; border-left:1px solid var(--border); }
  .pf-right::-webkit-scrollbar { width:5px; }
  .pf-right::-webkit-scrollbar-thumb { background:rgba(0,71,212,0.14); border-radius:4px; }
  .pf-inner { max-width:760px; width:100%; padding:40px 48px 0; }

  /* ═══ TOP BAR ═══ */
  .pf-topbar { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:28px; }
  .back-btn { display:inline-flex; align-items:center; gap:8px; font-size:0.82rem; font-weight:600; color:var(--txt-2); background:var(--surface); border:1px solid var(--border); border-radius:9999px; padding:8px 18px; cursor:pointer; transition:all 0.2s; box-shadow:var(--sh-sm); }
  .back-btn:hover { color:var(--brand); border-color:var(--brand-mid); background:var(--brand-lt); transform:translateX(-2px); }
  .edit-config-btn { display:inline-flex; align-items:center; gap:7px; background:var(--brand-lt); border:1.5px solid var(--brand-mid); border-radius:11px; padding:9px 16px; font-size:0.78rem; font-weight:700; color:var(--brand); cursor:pointer; transition:all 0.2s; white-space:nowrap; flex-shrink:0; }
  .edit-config-btn:hover { background:rgba(0,71,212,0.12); border-color:rgba(0,71,212,0.35); transform:translateY(-1px); box-shadow:0 4px 14px rgba(0,71,212,0.14); }

  /* ═══ PAGE HEADING ═══ */
  .pf-heading-block { margin-bottom:40px; }
  .pf-title { font-family:"DM Sans",sans-serif; font-size:clamp(1.75rem,3vw,2.1rem); font-weight:800; letter-spacing:-0.045em; line-height:1.12; min-height:2.5rem; display:block; }
  .pf-cursor { display:inline-block; width:2px; height:0.9em; background:var(--brand); margin-left:3px; vertical-align:text-bottom; border-radius:1px; animation:curBlink 1.1s ease-in-out infinite; }
  .pf-subtitle { font-size:0.87rem; color:var(--txt-2); margin-top:8px; max-width:540px; line-height:1.65; }

  /* ═══ CONTENT SECTIONS ═══ */
  .content-section { margin-bottom:52px; scroll-margin-top:32px; }

  /* ═══ SECTION HEADING ═══ */
  .section-heading { display:flex; align-items:center; gap:13px; margin-bottom:18px; padding-bottom:16px; border-bottom:1px solid var(--border); }
  .sh-icon { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .sh-title { font-family:"DM Sans",sans-serif; font-size:1.05rem; font-weight:800; color:var(--txt-1); letter-spacing:-0.02em; }
  .sh-sub   { font-size:0.71rem; color:var(--txt-muted); font-weight:500; margin-top:2px; }

  /* ═══ CARDS ═══ */
  .card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-2xl); overflow:hidden; box-shadow:var(--sh-sm); transition:box-shadow 0.22s; }
  .card:hover { box-shadow:var(--sh-lg); border-color:var(--border-h); }
  .mb-0  { margin-bottom:0; }
  .mb-14 { margin-bottom:14px; }
  .mt-14 { margin-top:14px; }
  .card-header { padding:18px 24px 14px; border-bottom:1px solid #F4F6FB; display:flex; align-items:center; gap:13px; }
  .card-hicon  { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .card-title  { font-family:"DM Sans",sans-serif; font-size:0.95rem; font-weight:800; color:var(--txt-1); }
  .card-sub    { font-size:0.7rem; color:var(--txt-muted); font-weight:500; margin-top:2px; }
  .card-body   { padding:22px 24px; }

  /* ═══ HERO CARD ═══ */
  .hero-banner { height:76px; background:linear-gradient(120deg,#0047D4 0%,#0066FF 50%,#2A18E8 100%); position:relative; overflow:hidden; }
  .hero-banner::before { content:''; position:absolute; top:-40px; right:-40px; width:160px; height:160px; border-radius:50%; background:radial-gradient(circle,rgba(255,255,255,0.14) 0%,transparent 70%); }
  .hero-banner::after  { content:''; position:absolute; bottom:-30px; left:60px; width:120px; height:120px; border-radius:50%; background:radial-gradient(circle,rgba(255,255,255,0.07) 0%,transparent 70%); }
  .hero-body   { padding:0 24px 24px; }
  .avatar-row  { display:flex; align-items:flex-end; gap:18px; margin-top:-44px; margin-bottom:20px; }
  .avatar-outer { position:relative; flex-shrink:0; cursor:pointer; }
  .avatar-glow { position:absolute; inset:-4px; border-radius:50%; background:conic-gradient(from 0deg,#0047D4,#0066FF,#2A18E8,#0047D4); opacity:0.55; filter:blur(5px); transition:opacity 0.2s; }
  .avatar-outer:hover .avatar-glow { opacity:0.8; }
  .avatar-ring { width:88px; height:88px; border-radius:50%; border:3px solid #fff; box-shadow:0 6px 20px rgba(0,71,212,0.22); display:flex; align-items:center; justify-content:center; overflow:hidden; position:relative; z-index:1; }
  .avatar-edit-overlay { position:absolute; inset:0; border-radius:50%; background:rgba(0,0,0,0.38); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s; z-index:2; }
  .avatar-outer:hover .avatar-edit-overlay { opacity:1; }
  .avatar-meta { padding-bottom:5px; }
  .hero-name   { font-family:"DM Sans",sans-serif; font-size:1.3rem; font-weight:800; color:var(--txt-1); letter-spacing:-0.03em; }
  .twin-badge  { display:inline-flex; align-items:center; gap:5px; background:var(--brand-lt); border:1px solid var(--brand-mid); border-radius:9999px; padding:4px 10px; font-size:0.67rem; font-weight:700; color:var(--brand); letter-spacing:0.05em; text-transform:uppercase; margin-top:6px; }
  .avatar-change-hint { display:inline-flex; align-items:center; gap:4px; margin-top:6px; font-size:0.71rem; font-weight:600; color:var(--txt-muted); cursor:pointer; transition:color 0.18s; }
  .avatar-change-hint:hover { color:var(--brand); }

  /* ═══ INFO ROWS ═══ */
  .info-section { display:flex; flex-direction:column; gap:2px; }
  .info-row { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:10px; transition:background 0.14s; }
  .info-row:hover { background:#F7F9FF; }
  .info-icon { width:30px; height:30px; border-radius:9px; background:#F1F5F9; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .info-content { display:flex; flex-direction:column; gap:1px; flex:1; }
  .info-label { font-size:0.67rem; color:var(--txt-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.07em; }
  .info-value { font-size:0.87rem; color:var(--txt-1); font-weight:600; }
  .info-divider { height:1px; background:#F4F6FB; margin:2px 12px; }
  .section-divider-label { display:flex; align-items:center; gap:6px; font-size:0.71rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; margin:0 12px 4px; }

  .creds-btn { display:inline-flex; align-items:center; gap:7px; background:var(--bg); border:1px solid var(--border); border-radius:9px; padding:8px 14px; font-size:0.77rem; font-weight:600; color:var(--txt-2); cursor:pointer; transition:all 0.16s; margin:14px 12px 0; }
  .creds-btn:hover { border-color:var(--brand-mid); color:var(--brand); background:var(--brand-lt); }

  /* ═══ EDIT FORM ═══ */
  .edit-grid        { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:12px; }
  .edit-grid-single { display:flex; flex-direction:column; gap:12px; }
  .form-group  { display:flex; flex-direction:column; gap:5px; }
  .form-label  { font-size:0.72rem; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:0.06em; }
  .form-input  { padding:10px 12px; border-radius:10px; border:1.5px solid var(--border); font-size:0.86rem; color:var(--txt-1); outline:none; transition:all 0.16s; font-family:"Inter",sans-serif; background:var(--bg); height:42px; width:100%; }
  .form-input:focus  { border-color:var(--brand); background:var(--surface); box-shadow:0 0 0 3px rgba(0,71,212,0.09); }
  .form-select { padding:10px 12px; border-radius:10px; border:1.5px solid var(--border); font-size:0.86rem; color:var(--txt-1); outline:none; transition:all 0.16s; font-family:"Inter",sans-serif; background:var(--bg); height:42px; width:100%; -webkit-appearance:none; }
  .form-select:focus { border-color:var(--brand); }
  .form-slider { -webkit-appearance:none; width:100%; height:4px; border-radius:99px; background:var(--border); outline:none; cursor:pointer; }
  .form-slider::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background:#fff; border:3px solid var(--brand); box-shadow:0 2px 6px rgba(0,71,212,0.3); cursor:pointer; transition:transform 0.14s; }
  .form-slider::-webkit-slider-thumb:hover { transform:scale(1.2); }
  .edit-actions { display:flex; gap:9px; margin-top:6px; }
  .btn-save   { display:flex; align-items:center; gap:6px; background:var(--brand); border:none; border-radius:10px; padding:10px 18px; color:#fff; font-size:0.8rem; font-weight:700; cursor:pointer; transition:all 0.18s; font-family:"Inter",sans-serif; }
  .btn-save:hover:not(:disabled) { background:#0036BB; transform:translateY(-1px); box-shadow:0 4px 14px rgba(0,71,212,0.28); }
  .btn-save:disabled { opacity:0.5; cursor:not-allowed; }
  .btn-cancel { display:flex; align-items:center; gap:6px; background:var(--bg); border:1px solid var(--border); border-radius:10px; padding:10px 18px; color:var(--txt-2); font-size:0.8rem; font-weight:700; cursor:pointer; transition:all 0.18s; font-family:"Inter",sans-serif; }
  .btn-cancel:hover { background:var(--border); }

  /* ═══ VECTOR ═══ */
  .vector-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
  .vector-card { border-radius:14px; padding:16px 14px; display:flex; flex-direction:column; gap:8px; border:2px solid transparent; cursor:pointer; transition:all 0.22s; }
  .vector-card:hover { transform:scale(1.02); }
  .vector-selected { border-color:var(--vc) !important; box-shadow:0 0 0 3px color-mix(in srgb,var(--vc) 18%,transparent); }
  .vector-pulse { animation:vPulse 0.55s ease-out; }
  .vector-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
  .vector-name { font-size:0.88rem; font-weight:800; }
  .vector-desc { font-size:0.69rem; color:var(--txt-2); line-height:1.4; }
  .vector-active-chip { display:inline-flex; align-items:center; gap:4px; font-size:0.63rem; font-weight:700; padding:3px 9px; border-radius:9999px; }

  /* ═══ DATA LAYERS ═══ */
  .data-layer-row { display:flex; align-items:center; gap:14px; padding:14px 16px; background:var(--bg); border:1px solid var(--border); border-radius:var(--r-lg); transition:all 0.2s; }
  .data-layer-row:hover { background:var(--surface); box-shadow:var(--sh-sm); border-color:var(--border-h); }
  .data-layer-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .data-layer-label { font-family:"DM Sans",sans-serif; font-size:0.88rem; font-weight:800; color:var(--txt-1); margin-bottom:2px; }
  .data-layer-value { font-size:0.75rem; color:var(--txt-muted); font-weight:500; }
  .data-layer-status { display:flex; align-items:center; gap:6px; font-size:0.72rem; font-weight:700; flex-shrink:0; }
  .data-layer-dot { width:7px; height:7px; border-radius:50%; }

  /* ═══ MODALS ═══ */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.36); backdrop-filter:blur(5px); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn 0.2s ease; }
  .modal-box { background:var(--surface); border-radius:24px; padding:32px 28px; width:100%; max-width:520px; box-shadow:0 24px 80px rgba(0,0,0,0.18); animation:slideUp 0.25s cubic-bezier(0.16,1,0.3,1); position:relative; max-height:90vh; overflow-y:auto; }
  .modal-close { position:absolute; top:18px; right:18px; width:32px; height:32px; border-radius:9px; background:var(--bg); border:1px solid var(--border); cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--txt-2); transition:all 0.15s; }
  .modal-close:hover { background:var(--border); color:var(--txt-1); }
  .modal-title { font-family:"DM Sans",sans-serif; font-size:1.1rem; font-weight:800; color:var(--txt-1); margin-bottom:4px; }
  .modal-sub   { font-size:0.79rem; color:var(--txt-muted); margin-bottom:22px; }
  .modal-preview { display:flex; align-items:center; gap:16px; padding:14px 18px; background:var(--bg); border:1px solid var(--border); border-radius:14px; margin-bottom:20px; }
  .modal-preview-ring { width:68px; height:68px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .modal-preview-name  { font-family:"DM Sans",sans-serif; font-size:1rem; font-weight:800; }
  .modal-preview-focus { font-size:0.76rem; color:var(--txt-muted); margin-top:4px; }
  .modal-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:20px; }
  .modal-av-btn { border-radius:16px; padding:16px 12px; border:2px solid var(--border); background:var(--bg); cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center; transition:all 0.22s; position:relative; }
  .modal-av-btn:hover { border-color:var(--border-h); background:var(--surface); transform:translateY(-2px); }
  .modal-av-selected { transform:translateY(-2px); }
  .modal-av-img  { width:72px; height:72px; border-radius:50%; overflow:hidden; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
  .modal-av-name  { font-family:"DM Sans",sans-serif; font-size:0.86rem; font-weight:800; color:var(--txt-1); }
  .modal-av-focus { font-size:0.69rem; color:var(--txt-muted); line-height:1.4; }
  .modal-av-check { position:absolute; top:8px; right:8px; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
  .modal-actions { display:flex; gap:10px; }
  .modal-btn-cancel { flex:1; padding:11px; border-radius:12px; border:1.5px solid var(--border); background:var(--bg); color:var(--txt-2); font-size:0.84rem; font-weight:700; cursor:pointer; transition:all 0.18s; font-family:"Inter",sans-serif; }
  .modal-btn-cancel:hover { background:var(--border); }
  .modal-btn-save { flex:2; padding:11px; border-radius:12px; border:none; background:linear-gradient(135deg,var(--brand),#0066FF); color:#fff; font-size:0.84rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px; transition:all 0.2s; box-shadow:0 4px 14px rgba(0,71,212,0.24); font-family:"Inter",sans-serif; }
  .modal-btn-save:hover:not(:disabled) { filter:brightness(1.07); transform:translateY(-1px); }
  .modal-btn-save:disabled { background:#94A3B8; box-shadow:none; cursor:default; }
  .pw-error   { display:flex; align-items:center; gap:7px; background:#fef2f2; border:1px solid #fecaca; border-radius:9px; padding:10px 13px; color:#dc2626; font-size:0.79rem; font-weight:600; margin-bottom:14px; }
  .pw-success { display:flex; align-items:center; justify-content:center; gap:8px; background:#f0fdf4; border:1px solid #a7f3d0; border-radius:12px; padding:14px; font-size:0.82rem; font-weight:600; color:#10b981; }
  .pw-field   { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
  .pw-label   { font-size:0.71rem; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:0.07em; }
  .pw-input-wrap { display:flex; align-items:center; background:var(--bg); border:1.5px solid var(--border); border-radius:10px; overflow:hidden; transition:border-color 0.15s; }
  .pw-input-wrap:focus-within { border-color:var(--brand); background:var(--brand-lt); }
  .pw-input  { flex:1; border:none; background:transparent; padding:10px 12px; font-size:0.85rem; font-weight:500; color:var(--txt-1); outline:none; font-family:"Inter",sans-serif; }
  .pw-toggle { padding:0 12px; border:none; background:transparent; cursor:pointer; color:var(--txt-muted); display:flex; align-items:center; transition:color 0.15s; }
  .pw-toggle:hover { color:var(--brand); }
  .pw-submit { width:100%; background:var(--brand); border:none; border-radius:11px; padding:12px; color:#fff; font-size:0.85rem; font-weight:700; cursor:pointer; transition:all 0.18s; font-family:"Inter",sans-serif; margin-top:4px; }
  .pw-submit:hover { background:#0036BB; transform:translateY(-1px); box-shadow:0 5px 18px rgba(0,71,212,0.28); }

  /* ═══ RESPONSIVE ═══ */
  @media (max-width:960px) {
    .sidebar { display:none; }
    .top-nav-links { display:none; }
    .top-nav-hamburger { display:flex; }
    .pf-right { border-left:none; display:block; }
    .pf-inner { padding:24px 20px 0; max-width:100%; }
    .edit-grid { grid-template-columns:1fr; }
    .vector-grid { grid-template-columns:1fr 1fr; }
  }
  @media (max-width:560px) {
    :root { --nav-h:58px; }
    .top-nav-logo { font-size:1.3rem; }
    .pf-inner { padding:20px 16px 0; }
    .modal-grid { grid-template-columns:1fr 1fr; }
    .pf-topbar { flex-direction:column; align-items:flex-start; gap:10px; }
    .edit-config-btn { align-self:stretch; justify-content:center; }
    .top-nav-inner { padding:0 14px; }
  }
`;

