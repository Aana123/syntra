"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  ArrowLeft,
  BrainCircuit,
  HeartPulse,
  Wallet,
  Briefcase,
  Zap,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  Loader2,
  Activity,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Target,
  BarChart3,
  Lightbulb,
  RefreshCw,
  BookOpen,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";

/* ─── TYPES ──────────────────────────────────────────────────────── */
interface AIResponse {
  twinPrediction: string;
  dailyReflection: string;
  explainability: string[];
  dailyChallenge: string;
  recommendations: { health: string[]; finance: string[]; career: string[] };
  riskAlerts: string[];
  confidence: number;
}

/* ─── DESIGN TOKENS ──────────────────────────────────────────────── */
const BRAND     = "#0047D4";
const BRAND_LT  = "#EEF3FF";
const BRAND_MID = "#C7D7FA";
const HEALTH_C  = "#16A34A";
const FINANCE_C = "#F59E0B";
const CAREER_C  = "#0047D4";

const NAV_ITEMS = [
  { label: "Your Forecast",      icon: BrainCircuit },
  { label: "Domain Breakdown",   icon: BarChart3    },
  { label: "Behavior Snapshot",  icon: Activity     },
  { label: "Why Syntra Says So", icon: Lightbulb    },
];

/* ─── TYPEWRITER ─────────────────────────────────────────────────── */
function Typewriter({ phrases }: { phrases: string[] }) {
  const [display, setDisplay] = useState("");
  const [pi, setPi] = useState(0);
  useEffect(() => {
    let ci = 0, del = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = phrases[pi];
      if (!del) {
        setDisplay(full.slice(0, ci + 1)); ci++;
        if (ci === full.length) { del = true; t = setTimeout(tick, 2800); }
        else t = setTimeout(tick, 80);
      } else {
        setDisplay(full.slice(0, ci - 1)); ci--;
        if (ci === 0) { del = false; setPi(p => (p + 1) % phrases.length); t = setTimeout(tick, 400); }
        else t = setTimeout(tick, 38);
      }
    };
    t = setTimeout(tick, 220);
    return () => clearTimeout(t);
  }, [pi]);
  return (
    <span style={{ color: BRAND }}>
      {display}
      <span style={{
        display: "inline-block", width: "2px", height: "0.88em",
        background: BRAND, marginLeft: "3px", verticalAlign: "text-bottom",
        borderRadius: "1px", animation: "tw-blink 1s step-end infinite",
      }}/>
    </span>
  );
}

/* ─── CONFIDENCE RING ────────────────────────────────────────────── */
function ConfidenceRing({ value }: { value: number }) {
  const r = 32, circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const color = value >= 70 ? "#4ade80" : value >= 40 ? "#fbbf24" : "#f87171";
  return (
    <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5"/>
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff", fontFamily: '"JetBrains Mono", monospace', lineHeight: 1 }}>{value}%</span>
        <span style={{ fontSize: "0.52rem", fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 2 }}>Accuracy</span>
      </div>
    </div>
  );
}

/* ─── SECTION HEADER ─────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, title, sub, color = BRAND }: { icon: any; title: string; sub: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 22 }}>
      <div style={{ width: 44, height: 44, borderRadius: 13, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={18} style={{ color }}/>
      </div>
      <div>
        <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 800, fontSize: "1.05rem", color: "#0D1117", letterSpacing: "-0.02em" }}>{title}</div>
        <div style={{ fontSize: "0.68rem", color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}

/* ─── STAT PILL ──────────────────────────────────────────────────── */
function StatPill({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 5, padding: "14px 18px",
      background: "#fff", borderRadius: 14, border: "1px solid #E4E9F4",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)", flex: "1 1 auto",
      transition: "all 0.2s",
    }}>
      <span style={{ fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94A3B8" }}>{label}</span>
      <span style={{ fontSize: "1.1rem", fontWeight: 900, color: accent, letterSpacing: "-0.03em", fontFamily: '"DM Sans", sans-serif' }}>{value}</span>
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────────── */
export default function InsightsPage() {
  const router = useRouter();
  const [mounted, setMounted]         = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [domainTab, setDomainTab]     = useState<"health"|"finance"|"career">("health");
  const [animating, setAnimating]     = useState(false);

  const PHRASES = ["Your Personal Summary", "What Syntra Found", "Your Progress Decoded", "Insights Just For You"];

  useEffect(() => { setMounted(true); }, []);

  const { data, isLoading, mutate } = useSWR<any>("/api/ai/recommend", fetcher, {
    dedupingInterval: 300000, revalidateOnFocus: false, errorRetryCount: 1,
  });

  useEffect(() => {
    const refresh = () => mutate();
    window.addEventListener("syntra-refresh", refresh);
    return () => window.removeEventListener("syntra-refresh", refresh);
  }, [mutate]);

  const ai: AIResponse | null = data?.ai || null;
  const isCalib = (ai?.confidence || 0) <= 10;

  const goToSection = (idx: number) => {
    if (animating || idx === activeSection) return;
    setAnimating(true);
    setTimeout(() => { setActiveSection(idx); setAnimating(false); }, 260);
  };

  if (!mounted) return null;

  /* ── LOADING ── */
  if (isLoading) return (
    <div className="ins-root"><style>{CSS}</style>
      <PageShell activeSection={activeSection} onNav={goToSection} confidence={null} isCalib={false}>
        <div className="state-center">
          <Loader2 size={36} style={{ color: BRAND, animation: "spin 1.1s linear infinite" }}/>
          <p className="state-title">Analysing your data…</p>
          <p className="state-sub">Syntra is reviewing your health, finance, and career patterns.</p>
        </div>
      </PageShell>
    </div>
  );

  /* ── ERROR ── */
  if (!ai) return (
    <div className="ins-root"><style>{CSS}</style>
      <PageShell activeSection={activeSection} onNav={goToSection} confidence={null} isCalib={false}>
        <div className="state-center">
          <ShieldAlert size={36} style={{ color: "#dc2626" }}/>
          <p className="state-title">Could not load your insights.</p>
          <p className="state-sub">Check your connection and try refreshing.</p>
          <button className="btn-primary" onClick={() => mutate()} style={{ marginTop: 16 }}><RefreshCw size={14}/> Try Again</button>
        </div>
      </PageShell>
    </div>
  );

  /* ── SECTION RENDERER ── */
  const renderSection = () => {
    const healthRecs  = ai.recommendations?.health || [];
    const financeRecs = ai.recommendations?.finance || [];
    const careerRecs  = ai.recommendations?.career || [];

    switch (activeSection) {

      /* ── 0: YOUR FORECAST ── */
      case 0: return (
        <div className={`sec-wrap ${animating ? "sec-exit" : "sec-enter"}`}>
          <SectionHeader icon={BrainCircuit} title="Your Personal Forecast" sub="Syntra's overview of your progress"/>

          {/* Forecast card */}
          <div className="ins-card mb-20">
            <div className="card-stripe" style={{ background: `linear-gradient(90deg, ${BRAND}, #0066FF)` }}/>
            <div className="card-body-p">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: BRAND_LT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <TrendingUp size={19} style={{ color: BRAND }}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.69rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: BRAND, marginBottom: 8 }}>What's likely to happen next</div>
                  <p style={{ margin: 0, fontSize: "0.96rem", color: "#0D1117", lineHeight: 1.75, fontWeight: 500, fontStyle: "italic" }}>
                    {isCalib
                      ? "Syntra is still getting to know you. Keep logging your daily habits and it'll start showing you what to expect in the weeks ahead."
                      : `"${ai.twinPrediction}"`}
                  </p>
                </div>
              </div>
              <div style={{ height: 1, background: "#E4E9F4", marginBottom: 18 }}/>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <StatPill label="Confidence"       value={`${ai.confidence}%`} accent={BRAND}/>
                <StatPill label="Areas Tracked"    value="3"                   accent={HEALTH_C}/>
                <StatPill label="Active Warnings"  value={`${ai.riskAlerts?.length ?? 0}`} accent={ai.riskAlerts?.length > 0 ? "#dc2626" : HEALTH_C}/>
              </div>
            </div>
          </div>

          {/* Today's focus */}
          <div className="ins-card mb-20" style={{ border: `1.5px solid ${BRAND_MID}`, background: `linear-gradient(135deg, ${BRAND_LT} 0%, #F8FAFF 100%)` }}>
            <div className="card-body-p">
              <div style={{ fontSize: "0.69rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: BRAND, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={13} style={{ color: BRAND }}/> Today's Focus
              </div>
              <p style={{ margin: "0 0 20px", fontSize: "0.94rem", color: "#0D1117", lineHeight: 1.75, fontWeight: 500 }}>{ai.dailyChallenge}</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn-primary" onClick={() => router.push("/ingestion")}><Zap size={13}/> Log Today's Data</button>
                <button className="btn-outline" onClick={() => router.push("/goals")}><Target size={13}/> Add to Goals</button>
              </div>
            </div>
          </div>

          {/* Calibration notice */}
          {isCalib && (
            <div style={{ display: "flex", gap: 10, padding: "13px 16px", borderRadius: 12, background: "rgba(245,158,11,0.06)", border: "1.5px solid rgba(245,158,11,0.22)", color: "#92400e", fontSize: "0.83rem", fontWeight: 600, alignItems: "center" }}>
              <Activity size={14} style={{ flexShrink: 0 }}/> Syntra is still learning your patterns. Log a few more days of data to unlock your full insights.
            </div>
          )}
        </div>
      );

      /* ── 1: DOMAIN BREAKDOWN ── */
      case 1: {
        const healthData  = data?.health  || {};
        const financeData = data?.finance || {};
        const careerData  = data?.career  || {};
        const currentRecs = domainTab === "health" ? healthRecs : domainTab === "finance" ? financeRecs : careerRecs;
        const domainColor = domainTab === "health" ? HEALTH_C : domainTab === "finance" ? FINANCE_C : CAREER_C;

        return (
          <div className={`sec-wrap ${animating ? "sec-exit" : "sec-enter"}`}>
            <SectionHeader icon={BarChart3} title="Health, Finance & Career Breakdown" sub="A closer look at each area of your life" color={domainColor}/>

            {/* Domain tab bar */}
            <div className="domain-tabbar mb-24">
              {([
                { key: "health",  label: "Health",  icon: HeartPulse,  color: HEALTH_C  },
                { key: "finance", label: "Finance", icon: Wallet,      color: FINANCE_C },
                { key: "career",  label: "Career",  icon: Briefcase,   color: CAREER_C  },
              ] as const).map(t => (
                <button
                  key={t.key}
                  className={`domain-tab ${domainTab === t.key ? "domain-tab-on" : ""}`}
                  style={domainTab === t.key ? {
                    borderColor: t.color, background: `${t.color}10`, color: t.color,
                    boxShadow: `0 4px 14px ${t.color}18`,
                  } : {}}
                  onClick={() => setDomainTab(t.key)}
                >
                  <t.icon size={14}/> {t.label}
                </button>
              ))}
            </div>

            {/* ── HEALTH ── */}
            {domainTab === "health" && (
              <div className="domain-board">
                <div className="ins-card mb-20">
                  <div className="card-stripe" style={{ background: HEALTH_C }}/>
                  <div className="card-body-p">
                    <div className="widget-title" style={{ color: HEALTH_C }}><Sparkles size={13}/> Today's Meal Plan</div>
                    <div className="meal-grid">
                      {(healthData.todaysMealPlan || []).map((meal: any, i: number) => (
                        <div key={i} className="meal-card" style={{ borderColor: `${HEALTH_C}18` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 800, fontSize: "0.88rem", color: "#0D1117" }}>{meal.meal}</span>
                            <span className="badge" style={{ background: `${HEALTH_C}12`, color: HEALTH_C, border: `1px solid ${HEALTH_C}25` }}>{meal.calories} kcal</span>
                          </div>
                          <p style={{ margin: "0 0 10px", fontSize: "0.8rem", color: "#52637A", lineHeight: 1.55, fontWeight: 500 }}>{meal.items}</p>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.71rem", fontWeight: 700, color: "#94A3B8", borderTop: "1px solid #F0F2F8", paddingTop: 8 }}>
                            <span>⏱ {meal.prepTime}</span>
                            <span style={{ color: BRAND }}>✨ {meal.fix}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <RecCard recs={currentRecs} color={HEALTH_C} title="Health Suggestions"/>
              </div>
            )}

            {/* ── FINANCE ── */}
            {domainTab === "finance" && (
              <div className="domain-board">
                <div className="ins-card mb-20">
                  <div className="card-stripe" style={{ background: FINANCE_C }}/>
                  <div className="card-body-p">
                    <div className="widget-title" style={{ color: FINANCE_C }}><TrendingUp size={13}/> Your Savings Goals at a Glance</div>
                    {(financeData.wealthGoals || []).length > 0 ? (
                      (financeData.wealthGoals || []).map((goal: any, i: number) => (
                        <div key={i} className="wealth-card mb-12">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <span style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 800, fontSize: "0.94rem", color: "#0D1117" }}>{goal.goalLabel}</span>
                            <span className="badge" style={{ background: goal.deficit > 0 ? "rgba(220,38,38,0.08)" : "rgba(22,163,74,0.08)", color: goal.deficit > 0 ? "#dc2626" : HEALTH_C, border: `1px solid ${goal.deficit > 0 ? "rgba(220,38,38,0.18)" : "rgba(22,163,74,0.18)"}` }}>
                              {goal.deficit > 0 ? "Needs Attention" : "On Track"}
                            </span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                            <div className="stat-box">
                              <span className="stat-lbl">Monthly Savings Needed</span>
                              <span className="stat-val">₹{goal.requiredMonthlySavings?.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="stat-box">
                              <span className="stat-lbl">Months Remaining</span>
                              <span className="stat-val">{goal.monthsRemaining} months</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 13px", borderRadius: 10, background: goal.deficit > 0 ? "rgba(220,38,38,0.04)" : "rgba(22,163,74,0.04)", border: `1px solid ${goal.deficit > 0 ? "rgba(220,38,38,0.14)" : "rgba(22,163,74,0.14)"}` }}>
                            <AlertTriangle size={13} style={{ color: goal.deficit > 0 ? "#dc2626" : HEALTH_C, flexShrink: 0 }}/>
                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: goal.deficit > 0 ? "#7f1d1d" : "#14532d", lineHeight: 1.5 }}>{goal.deficitText}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="wealth-card">
                        <p style={{ margin: 0, fontSize: "0.86rem", color: "#52637A", fontWeight: 500 }}>No savings goals set yet. Head to Goals to create one.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Investment checklist */}
                <div className="ins-card mb-20">
                  <div className="card-stripe" style={{ background: FINANCE_C }}/>
                  <div className="card-body-p">
                    <div className="widget-title" style={{ color: FINANCE_C }}><CheckCircle2 size={13}/> Smart Money Checklist</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[
                        { done: true,  title: "Index Fund Contributions",     sub: "Putting a share of savings into a broad index fund each week." },
                        { done: true,  title: "Emergency Fund",               sub: "Three months of expenses kept in a liquid, accessible account." },
                        { done: false, title: "Tax-Saving Investments (80C)", sub: "Investing in ELSS funds to reduce your annual tax bill." },
                      ].map((item, i) => (
                        <div key={i} className="check-row" style={item.done ? { borderLeft: `3px solid ${FINANCE_C}` } : {}}>
                          <input type="checkbox" checked={item.done} readOnly style={{ marginTop: 3, flexShrink: 0 }}/>
                          <div>
                            <strong style={{ fontSize: "0.86rem", color: "#0D1117", display: "block", marginBottom: 2, fontFamily: '"DM Sans", sans-serif' }}>{item.title}</strong>
                            <p style={{ margin: 0, fontSize: "0.78rem", color: "#52637A", fontWeight: 500 }}>{item.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <RecCard recs={currentRecs} color={FINANCE_C} title="Finance Suggestions"/>
              </div>
            )}

            {/* ── CAREER ── */}
            {domainTab === "career" && (
              <div className="domain-board">
                <div className="ins-card mb-20">
                  <div className="card-stripe" style={{ background: CAREER_C }}/>
                  <div className="card-body-p">
                    <div className="widget-title" style={{ color: CAREER_C }}><Target size={13}/> Skills Worth Your Time (80/20 Rule)</div>
                    <div style={{ overflowX: "auto" }}>
                      <table className="skill-table">
                        <thead>
                          <tr>
                            <th>Skill</th>
                            <th>Priority</th>
                            <th>Time to Learn</th>
                            <th>Where to Learn</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(careerData.paretoSkills || []).map((s: any, i: number) => (
                            <tr key={i}>
                              <td><strong style={{ color: "#0D1117" }}>{s.skill}</strong></td>
                              <td><span className={`prio-badge prio-${s.priority?.toLowerCase()}`}>{s.priority}</span></td>
                              <td style={{ color: "#52637A" }}>{s.hoursRequired}</td>
                              <td style={{ color: BRAND, fontWeight: 700 }}>{s.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Study blocks */}
                <div className="ins-card mb-20">
                  <div className="card-stripe" style={{ background: CAREER_C }}/>
                  <div className="card-body-p">
                    <div className="widget-title" style={{ color: CAREER_C }}><BookOpen size={13}/> Recommended Study Schedule</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {(careerData.studyBlocks || []).map((b: any, i: number) => (
                        <div key={i} className="study-block">
                          <div className="study-time" style={{ color: CAREER_C }}><Clock size={11}/> {b.time}</div>
                          <div>
                            <strong style={{ fontSize: "0.86rem", color: "#0D1117", fontFamily: '"DM Sans", sans-serif' }}>{b.day}</strong>
                            <p style={{ margin: "2px 0 0", fontSize: "0.79rem", color: "#52637A", fontWeight: 500, lineHeight: 1.5 }}>{b.focus}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <RecCard recs={currentRecs} color={CAREER_C} title="Career Suggestions"/>
              </div>
            )}
          </div>
        );
      }

      /* ── 2: BEHAVIOR SNAPSHOT ── */
      case 2: return (
        <div className={`sec-wrap ${animating ? "sec-exit" : "sec-enter"}`}>
          <SectionHeader icon={Activity} title="How You've Been Doing" sub="Syntra's read on your recent patterns"/>

          <div className="ins-card mb-20">
            <div className="card-stripe" style={{ background: `linear-gradient(90deg, ${BRAND}, #0066FF)` }}/>
            <div className="card-body-p">
              <div style={{ fontSize: "0.69rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: BRAND, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={12} style={{ color: BRAND }}/> Syntra's Take
              </div>
              <p style={{ margin: "0 0 20px", color: "#0D1117", lineHeight: 1.78, fontSize: "0.94rem", fontWeight: 500 }}>
                {isCalib
                  ? "Syntra hasn't collected enough of your data yet to give a detailed reflection. Keep logging your health, finance, and career activity and your insights will improve quickly."
                  : ai.dailyReflection}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 15px", borderRadius: 12, background: BRAND_LT, border: `1.5px solid ${BRAND_MID}` }}>
                <BrainCircuit size={16} style={{ color: BRAND, flexShrink: 0 }}/>
                <span style={{ fontSize: "0.84rem", color: "#0D1117", lineHeight: 1.6, fontWeight: 500 }}>
                  Syntra is currently <strong style={{ color: BRAND }}>{ai.confidence}%</strong> confident in this assessment, based on your recent activity.
                </span>
              </div>
            </div>
          </div>

          {/* Risk alerts */}
          {!isCalib && ai.riskAlerts?.length > 0 && (
            <div className="ins-card" style={{ borderColor: "rgba(220,38,38,0.2)" }}>
              <div className="card-stripe" style={{ background: "#dc2626" }}/>
              <div className="card-body-p">
                <div style={{ fontSize: "0.69rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#dc2626", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={13}/> Things to Watch Out For
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {ai.riskAlerts.map((alert, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "12px 14px", background: "rgba(220,38,38,0.04)", borderRadius: 11, border: "1px solid rgba(220,38,38,0.14)" }}>
                      <ShieldAlert size={14} style={{ color: "#dc2626", flexShrink: 0, marginTop: 2 }}/>
                      <span style={{ fontSize: "0.86rem", color: "#7f1d1d", lineHeight: 1.6, fontWeight: 500 }}>{alert}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );

      /* ── 3: WHY SYNTRA SAYS SO ── */
      case 3: return (
        <div className={`sec-wrap ${animating ? "sec-exit" : "sec-enter"}`}>
          <SectionHeader icon={Lightbulb} title="How Syntra Works This Out" sub="The reasoning behind your insights"/>
          <div className="ins-card">
            <div className="card-stripe" style={{ background: `linear-gradient(90deg, ${BRAND}, #7c3aed)` }}/>
            <div className="card-body-p">
              <p style={{ fontSize: "0.86rem", color: "#52637A", lineHeight: 1.78, marginBottom: 20, fontStyle: "italic", borderLeft: `3px solid ${BRAND}`, paddingLeft: 13 }}>
                {isCalib
                  ? "Syntra is still establishing your baseline. The more you log, the more specific and useful this section becomes."
                  : "Syntra reviewed your recent health, finance, and career activity — looking at consistency, patterns, and how each area affects the others."}
              </p>
              <div style={{ height: 1, background: "#E4E9F4", marginBottom: 18 }}/>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ai.explainability?.length > 0 ? ai.explainability.map((item, i) => (
                  <div key={i} className="reasoning-row" style={{ animationDelay: `${i * 0.055}s` }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: BRAND_LT, border: `1px solid ${BRAND_MID}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.68rem", fontWeight: 800, color: BRAND, fontFamily: '"JetBrains Mono", monospace' }}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <span style={{ fontSize: "0.87rem", color: "#0D1117", lineHeight: 1.65, fontWeight: 500 }}>{item}</span>
                  </div>
                )) : (
                  <p style={{ fontSize: "0.84rem", color: "#94A3B8", textAlign: "center", padding: "20px 0", margin: 0 }}>
                    Keep logging data and this section will explain Syntra's reasoning in detail.
                  </p>
                )}
              </div>
              <div style={{ marginTop: 20, padding: "13px 15px", background: "rgba(22,163,74,0.05)", borderRadius: 12, border: "1px solid rgba(22,163,74,0.18)", display: "flex", gap: 9, alignItems: "center" }}>
                <CheckCircle2 size={14} style={{ color: HEALTH_C, flexShrink: 0 }}/>
                <span style={{ fontSize: "0.8rem", color: "#14532d", fontWeight: 700, lineHeight: 1.5 }}>Analysis complete. Syntra's models are up to date with your latest activity.</span>
              </div>
            </div>
          </div>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div className="ins-root">
      <style>{CSS}</style>
      <PageShell activeSection={activeSection} onNav={goToSection} confidence={ai.confidence} isCalib={isCalib}>
        {/* Back + refresh row */}
        <button className="back-btn" onClick={() => router.push("/dashboard")}>
          <ArrowLeft size={13}/> Return to Dashboard
        </button>

        {/* Page heading */}
        <div className="page-heading-block">
          <div className="page-eyebrow">
            <div className="eyebrow-dot"/>
            <span className="eyebrow-text">Insights</span>
          </div>
          <h1 className="page-title">
            <Typewriter phrases={PHRASES}/>
          </h1>
          <p className="page-subtitle">Your health, finances, and career activity — all in one place, explained in plain English.</p>
        </div>

        {/* Mobile section tabs */}
        <div className="mobile-tabs mb-24">
          {NAV_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <button key={i} className={`mobile-tab ${i === activeSection ? "mobile-tab-on" : ""}`} onClick={() => goToSection(i)}>
                <Icon size={12}/> <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Refresh */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button className="btn-outline btn-sm" onClick={() => mutate()}><RefreshCw size={12}/> Refresh</button>
        </div>

        {renderSection()}

        <div style={{ textAlign: "center", marginTop: 52, fontSize: "0.74rem", color: "#94A3B8", fontWeight: 600 }}>
          Syntra · Insights · Your data, working for you
        </div>
      </PageShell>
    </div>
  );
}

/* ─── RECOMMENDATION CARD ────────────────────────────────────────── */
function RecCard({ recs, color, title }: { recs: string[]; color: string; title: string }) {
  return (
    <div className="ins-card mb-20">
      <div className="card-stripe" style={{ background: color }}/>
      <div className="card-body-p">
        <div className="widget-title" style={{ color }}><Lightbulb size={13}/> {title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {recs.map((rec, i) => (
            <div key={i} className="rec-row" style={{ borderLeft: `3px solid ${color}30`, background: `${color}05` }}>
              <CheckCircle2 size={13} style={{ color, flexShrink: 0, marginTop: 2 }}/>
              <span style={{ fontSize: "0.86rem", color: "#0D1117", lineHeight: 1.6, fontWeight: 500 }}>{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── PAGE SHELL (sidebar + right content) ───────────────────────── */
function PageShell({ children, activeSection, onNav, confidence, isCalib }: {
  children: React.ReactNode;
  activeSection: number;
  onNav: (i: number) => void;
  confidence: number | null;
  isCalib: boolean;
}) {
  return (
    <div className="shell">
      {/* ── LEFT SIDEBAR ── */}
      <div className="sidebar">
        <div className="sidebar-grid"/>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo"><div className="logo-dot"/> Syntra</div>
          <div className="sidebar-heading">Your Insights</div>
          <div className="sidebar-sub">Your personal overview across health, finances, and career — decoded by Syntra.</div>
        </div>

        {/* Nav */}
        <div className="sidebar-nav">
          {NAV_ITEMS.map((item, i) => {
            const Icon = item.icon;
            const active = i === activeSection;
            return (
              <button key={i} className={`sidebar-nav-item ${active ? "sidebar-nav-active" : ""}`} onClick={() => onNav(i)}>
                <div className={`sidebar-nav-icon ${active ? "sidebar-nav-icon-active" : ""}`}><Icon size={15}/></div>
                <span className={`sidebar-nav-label ${active ? "sidebar-nav-label-on" : ""}`}>{item.label}</span>
                {active && <ChevronRight size={13} style={{ color: "rgba(255,255,255,0.65)", marginLeft: "auto" }}/>}
              </button>
            );
          })}
        </div>

        {/* Confidence */}
        {confidence !== null && (
          <div className="sidebar-conf-card">
            <ConfidenceRing value={confidence}/>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 4 }}>Prediction Accuracy</div>
              <div style={{ fontSize: "0.71rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.55, fontWeight: 500 }}>
                {isCalib ? "Still calibrating…" : confidence >= 70 ? "High accuracy" : confidence >= 40 ? "Moderate accuracy" : "Building your profile"}
              </div>
              {isCalib && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, fontSize: "0.69rem", fontWeight: 700, color: "#fde68a" }}>
                  <Activity size={11}/> More data needed
                </div>
              )}
            </div>
          </div>
        )}

        {/* Back at bottom */}
        <div className="sidebar-back">
          <a href="/dashboard" className="sidebar-back-btn"><ArrowLeft size={12}/> Back to Dashboard</a>
        </div>
      </div>

      {/* ── RIGHT CONTENT ── */}
      <div className="right-content">
        <div className="right-inner">{children}</div>
      </div>
    </div>
  );
}

/* ─── CSS ────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --brand:       #0047D4;
    --brand-lt:    #EEF3FF;
    --brand-mid:   #C7D7FA;
    --surface:     #FFFFFF;
    --bg:          #F4F6FB;
    --border:      #E4E9F4;
    --border-h:    #C7D7FA;
    --txt-1:       #0D1117;
    --txt-2:       #52637A;
    --txt-muted:   #94A3B8;
    --health:      #16A34A;
    --finance:     #F59E0B;
    --career:      #0047D4;
    --sh-sm:  0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --sh-md:  0 4px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
    --sh-lg:  0 8px 32px rgba(0,71,212,0.10), 0 2px 8px rgba(0,0,0,0.04);
    --sh-hov: 0 12px 36px rgba(0,71,212,0.12), 0 2px 8px rgba(0,0,0,0.05);
    --r-md: 12px; --r-lg: 16px; --r-xl: 20px; --r-2xl: 24px;
  }
  body { background: var(--bg); font-family: "Inter", sans-serif; -webkit-font-smoothing: antialiased; color: var(--txt-1); }

  @keyframes tw-blink  { 50% { opacity: 0; } }
  @keyframes spin      { to { transform: rotate(360deg); } }
  @keyframes scr-in    { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes sec-enter { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
  @keyframes sec-exit  { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(-14px); } }
  @keyframes fade-up   { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes lp-pulse  { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.6;transform:scale(1.4);} }
  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.65;transform:scale(1.38);} }

  /* ═══ SHELL LAYOUT ═══ */
  .ins-root { min-height: 100vh; background: var(--bg); }
  .shell {
    display: flex; min-height: 100vh;
  }

  /* ═══ SIDEBAR ═══ */
  .sidebar {
    width: 288px; flex-shrink: 0; min-height: 100vh;
    background: linear-gradient(160deg, #0036BB 0%, #0052E8 45%, #2A18E8 100%);
    display: flex; flex-direction: column;
    position: sticky; top: 0; height: 100vh; overflow: hidden;
    box-shadow: 4px 0 24px rgba(0,36,187,0.18); z-index: 10;
  }
  .sidebar::before {
    content: ''; position: absolute; top: -90px; left: -70px;
    width: 260px; height: 260px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%); pointer-events: none;
  }
  .sidebar::after {
    content: ''; position: absolute; bottom: -60px; right: -50px;
    width: 220px; height: 220px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%); pointer-events: none;
  }
  .sidebar-grid {
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
    background-size: 44px 44px;
  }
  .sidebar-brand {
    padding: 28px 22px 20px; position: relative; z-index: 2;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  .sidebar-logo {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
    border-radius: 9999px; padding: 5px 14px;
    font-size: 0.68rem; font-weight: 800; color: #fff;
    letter-spacing: 0.13em; text-transform: uppercase; margin-bottom: 16px;
    font-family: "DM Sans", sans-serif;
  }
  .logo-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #4ade80; box-shadow: 0 0 8px rgba(74,222,128,0.85);
    animation: lp-pulse 2.2s infinite;
  }
  .sidebar-heading {
    font-family: "DM Sans", sans-serif; font-size: 1.35rem; font-weight: 800;
    color: #fff; letter-spacing: -0.03em; line-height: 1.2;
  }
  .sidebar-sub { font-size: 0.76rem; color: rgba(255,255,255,0.58); margin-top: 6px; line-height: 1.58; }

  /* sidebar nav */
  .sidebar-nav { padding: 16px 12px; display: flex; flex-direction: column; gap: 5px; flex: 1; position: relative; z-index: 2; overflow-y: auto; }
  .sidebar-nav-item {
    width: 100%; display: flex; align-items: center; gap: 11px;
    padding: 11px 13px; border-radius: 13px;
    border: 1px solid transparent; background: transparent;
    cursor: pointer; text-align: left;
    transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
  }
  .sidebar-nav-item:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.14); }
  .sidebar-nav-active {
    background: rgba(255,255,255,0.17) !important;
    border-color: rgba(255,255,255,0.28) !important;
    box-shadow: 0 4px 14px rgba(0,0,0,0.14);
  }
  .sidebar-nav-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: rgba(255,255,255,0.11); border: 1px solid rgba(255,255,255,0.16);
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.55); flex-shrink: 0; transition: all 0.2s;
  }
  .sidebar-nav-icon-active { background: rgba(255,255,255,0.24) !important; border-color: rgba(255,255,255,0.38) !important; color: #fff !important; }
  .sidebar-nav-label { font-family: "DM Sans", sans-serif; font-size: 0.86rem; font-weight: 600; color: rgba(255,255,255,0.55); }
  .sidebar-nav-label-on { color: #fff !important; font-weight: 700 !important; }

  /* confidence */
  .sidebar-conf-card {
    margin: 0 12px 16px; padding: 18px 16px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 18px; display: flex; align-items: center; gap: 14px;
    position: relative; z-index: 2; transition: all 0.2s;
  }
  .sidebar-conf-card:hover { border-color: rgba(255,255,255,0.18); background: rgba(255,255,255,0.07); }

  /* back */
  .sidebar-back { padding: 14px 16px; border-top: 1px solid rgba(255,255,255,0.1); position: relative; z-index: 2; }
  .sidebar-back-btn {
    display: inline-flex; align-items: center; gap: 7px;
    font-size: 0.77rem; font-weight: 600; color: rgba(255,255,255,0.58);
    cursor: pointer; background: none; border: none;
    transition: color 0.18s; font-family: "Inter", sans-serif; text-decoration: none;
  }
  .sidebar-back-btn:hover { color: #fff; }

  /* ═══ RIGHT CONTENT — THE FIX ═══
     Mirrors the Twin Profile .pf-right exactly:
     display:flex + justify-content:center centres .right-inner
     within the available space after the sidebar.              */
  .right-content {
    flex: 1; min-height: 100vh; overflow-y: auto;
    background: var(--bg);
    border-left: 1px solid var(--border);
    display: flex;
    justify-content: center;
  }
  .right-content::-webkit-scrollbar { width: 5px; }
  .right-content::-webkit-scrollbar-thumb { background: rgba(0,71,212,0.14); border-radius: 4px; }

  /* max-width + width:100% so it shrinks on narrow viewports */
  .right-inner {
    max-width: 780px;
    width: 100%;
    padding: 44px 52px 80px;
  }

  /* ═══ BACK BTN ═══ */
  .back-btn {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 0.82rem; font-weight: 600; color: var(--txt-2);
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 9999px; padding: 8px 18px; cursor: pointer;
    transition: all 0.2s; box-shadow: var(--sh-sm);
    margin-bottom: 32px; text-decoration: none;
  }
  .back-btn:hover { color: var(--brand); border-color: var(--brand-mid); background: var(--brand-lt); transform: translateX(-2px); }

  /* ═══ PAGE HEADING ═══ */
  .page-heading-block { padding-bottom: 32px; border-bottom: 1px solid var(--border); margin-bottom: 32px; }
  .page-eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .eyebrow-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--brand); box-shadow: 0 0 0 2px rgba(0,71,212,0.18); animation: pulse-dot 2.4s infinite; }
  .eyebrow-text { font-size: 0.7rem; font-weight: 700; color: var(--brand); letter-spacing: 0.12em; text-transform: uppercase; }
  .page-title {
    font-family: "DM Sans", sans-serif;
    font-size: clamp(1.75rem, 3.2vw, 2.2rem);
    font-weight: 800; letter-spacing: -0.045em; line-height: 1.12;
    min-height: 2.6rem; color: var(--txt-1);
  }
  .page-subtitle { font-size: 0.88rem; color: var(--txt-2); line-height: 1.7; margin-top: 9px; max-width: 540px; }

  /* ═══ MOBILE TABS ═══ */
  .mobile-tabs { display: none; gap: 7px; flex-wrap: wrap; }
  .mobile-tab {
    display: flex; align-items: center; gap: 6px; padding: 8px 14px;
    border-radius: 9999px; border: 1px solid var(--border); background: var(--surface);
    font-family: "Inter", sans-serif; font-size: 0.78rem; font-weight: 700;
    color: var(--txt-2); cursor: pointer; transition: all 0.2s; box-shadow: var(--sh-sm);
  }
  .mobile-tab:hover { border-color: var(--brand-mid); color: var(--brand); background: var(--brand-lt); }
  .mobile-tab-on { background: var(--brand) !important; color: #fff !important; border-color: var(--brand) !important; box-shadow: 0 4px 14px rgba(0,71,212,0.22) !important; }

  /* ═══ SECTION WRAPPERS ═══ */
  .sec-wrap { animation: sec-enter 0.3s cubic-bezier(0.22,1,0.36,1) forwards; }
  .sec-exit { animation: sec-exit 0.26s ease forwards; }

  /* ═══ INSIGHT CARDS ═══ */
  .ins-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-2xl); overflow: hidden;
    box-shadow: var(--sh-sm);
    transition: all 0.24s cubic-bezier(0.16,1,0.3,1);
    position: relative;
  }
  .ins-card:hover { box-shadow: var(--sh-lg); border-color: var(--border-h); transform: translateY(-2px); }
  .card-stripe { height: 3px; }
  .card-body-p { padding: 22px 24px; }

  /* ═══ DOMAIN TABS ═══ */
  .domain-tabbar {
    display: flex; gap: 8px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 5px; box-shadow: var(--sh-sm);
  }
  .domain-tab {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
    padding: 10px 10px; border-radius: var(--r-md);
    border: 1.5px solid transparent; background: transparent;
    font-family: "Inter", sans-serif; font-size: 0.8rem; font-weight: 700;
    color: var(--txt-2); cursor: pointer; transition: all 0.2s;
  }
  .domain-tab:hover { background: var(--bg); }
  .domain-tab-on { /* individual colors applied inline */ }
  .domain-board { display: flex; flex-direction: column; }

  /* ═══ WIDGET TITLE ═══ */
  .widget-title {
    display: flex; align-items: center; gap: 7px;
    font-size: 0.69rem; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.09em;
    margin-bottom: 18px; padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }

  /* ═══ MEAL GRID ═══ */
  .meal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 600px) { .meal-grid { grid-template-columns: 1fr; } }
  .meal-card {
    background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 15px;
    transition: all 0.2s;
  }
  .meal-card:hover { background: var(--surface); box-shadow: var(--sh-sm); transform: translateY(-1px); }

  /* ═══ BADGE ═══ */
  .badge {
    font-size: 0.67rem; font-weight: 800; padding: 3px 9px;
    border-radius: 9999px; font-family: "JetBrains Mono", monospace;
  }

  /* ═══ WEALTH CARD ═══ */
  .wealth-card {
    background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 16px;
    transition: all 0.2s;
  }
  .wealth-card:hover { background: var(--surface); box-shadow: var(--sh-sm); }
  .stat-box {
    display: flex; flex-direction: column; gap: 4px; padding: 11px 13px;
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md);
  }
  .stat-lbl { font-size: 0.63rem; font-weight: 700; color: var(--txt-muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .stat-val { font-family: "DM Sans", sans-serif; font-weight: 800; font-size: 0.97rem; color: var(--txt-1); }

  /* ═══ CHECK ROW ═══ */
  .check-row {
    display: flex; align-items: flex-start; gap: 12px; padding: 13px 15px;
    background: var(--bg); border: 1px solid var(--border); border-radius: var(--r-md);
    transition: all 0.2s;
  }
  .check-row:hover { background: var(--surface); box-shadow: var(--sh-sm); }

  /* ═══ SKILL TABLE ═══ */
  .skill-table { width: 100%; border-collapse: collapse; font-size: 0.84rem; text-align: left; }
  .skill-table th { padding: 11px 13px; font-weight: 800; color: var(--txt-muted); border-bottom: 1.5px solid var(--border); text-transform: uppercase; font-size: 0.66rem; letter-spacing: 0.06em; white-space: nowrap; }
  .skill-table td { padding: 13px; border-bottom: 1px solid var(--bg); font-weight: 500; }
  .prio-badge { padding: 3px 8px; border-radius: 6px; font-size: 0.64rem; font-weight: 800; text-transform: uppercase; font-family: "JetBrains Mono", monospace; }
  .prio-badge.high   { background: #fee2e2; color: #dc2626; }
  .prio-badge.medium { background: #fef3c7; color: #d97706; }
  .prio-badge.low    { background: #dcfce7; color: #16a34a; }

  /* ═══ STUDY BLOCK ═══ */
  .study-block {
    display: flex; gap: 16px; padding: 13px 15px;
    background: var(--bg); border: 1px solid var(--border); border-radius: var(--r-md);
    transition: all 0.2s;
  }
  .study-block:hover { background: var(--surface); box-shadow: var(--sh-sm); transform: translateX(3px); }
  .study-time {
    display: flex; align-items: center; gap: 5px;
    font-size: 0.74rem; font-weight: 800; width: 120px; flex-shrink: 0;
    border-right: 1px solid var(--border); padding-right: 10px;
    font-family: "JetBrains Mono", monospace;
  }

  /* ═══ REC ROW ═══ */
  .rec-row {
    display: flex; gap: 10px; align-items: flex-start;
    padding: 12px 14px; border-radius: var(--r-md);
    transition: all 0.18s;
  }
  .rec-row:hover { transform: translateX(3px); }

  /* ═══ REASONING ROW ═══ */
  .reasoning-row {
    display: flex; gap: 13px; align-items: flex-start;
    padding: 13px 15px; background: var(--bg);
    border: 1px solid var(--border); border-radius: var(--r-md);
    animation: fade-up 0.35s ease both; transition: all 0.2s;
  }
  .reasoning-row:hover { background: var(--surface); box-shadow: var(--sh-sm); transform: translateY(-1px); }

  /* ═══ BUTTONS ═══ */
  .btn-primary {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 11px 20px; border-radius: var(--r-md); border: none;
    background: linear-gradient(135deg, var(--brand), #0066FF);
    color: #fff; font-family: "Inter", sans-serif; font-size: 0.84rem; font-weight: 700;
    cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 16px rgba(0,71,212,0.24);
    height: 42px; white-space: nowrap;
  }
  .btn-primary:hover { filter: brightness(1.07); transform: translateY(-1px); box-shadow: 0 7px 20px rgba(0,71,212,0.3); }
  .btn-outline {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 11px 20px; border-radius: var(--r-md);
    border: 1.5px solid var(--border); background: var(--surface);
    color: var(--txt-2); font-family: "Inter", sans-serif; font-size: 0.84rem; font-weight: 700;
    cursor: pointer; transition: all 0.2s; height: 42px; white-space: nowrap;
    box-shadow: var(--sh-sm);
  }
  .btn-outline:hover { border-color: var(--brand-mid); color: var(--brand); background: var(--brand-lt); transform: translateY(-1px); }
  .btn-sm { padding: 7px 14px; height: auto; font-size: 0.78rem; }

  /* ═══ STATE CENTER ═══ */
  .state-center {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 12px; min-height: 50vh;
    text-align: center;
  }
  .state-title { font-family: "DM Sans", sans-serif; font-size: 1.05rem; font-weight: 800; color: var(--txt-1); margin: 0; }
  .state-sub   { font-size: 0.86rem; color: var(--txt-2); margin: 0; font-weight: 500; }

  /* ═══ UTILITIES ═══ */
  .mb-12 { margin-bottom: 12px; }
  .mb-16 { margin-bottom: 16px; }
  .mb-20 { margin-bottom: 20px; }
  .mb-24 { margin-bottom: 24px; }

  /* ═══ RESPONSIVE ═══ */
  @media (max-width: 1060px) {
    .sidebar { display: none; }
    .right-content { border-left: none; display: block; }
    .right-inner { padding: 28px 24px 60px; }
    .mobile-tabs { display: flex; }
  }
  @media (max-width: 520px) {
    .page-title { font-size: 1.65rem; }
    .right-inner { padding: 20px 16px 60px; }
    .domain-tabbar { flex-direction: column; }
    .mobile-tab span { display: none; }
  }
`;