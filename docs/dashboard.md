# Syntra — Dashboard

## Overview

The dashboard (`src/app/dashboard/page.tsx`) is the primary experience — a 2,500+ line single-page application that renders all four twin layers simultaneously. It pulls from `/api/ai/recommend` (AI snapshot), `/api/log/latest` (current scores), and the user session for real-time display.

---

## Architecture

```
dashboard/page.tsx (Client Component)
    │
    ├── Session: useSession()        ← name, avatarId, streak, optimizationVector
    ├── Data: useSWR("/api/ai/recommend")      ← Full AI payload
    ├── Data: useSWR("/api/log/latest")        ← Latest logs + scores
    ├── Data: useSWR("/api/goals")             ← Active goals
    └── State: useState (local UI states)
```

## Data Sources

| Section | API Endpoint | Refresh Policy |
|---|---|---|
| Twin scores, streak | `/api/log/latest` | SWR default (on focus) |
| AI reflection | `/api/ai/recommend` | 5min cache (s-maxage=300) |
| Goals, milestones | `/api/goals` | SWR default |
| User profile | Session (JWT) | On session refresh |
| Domain analysis | `/api/ai/domain?domain=X` | Per-click, 5min cache |

---

## Dashboard Sections

### 1. Hero Section
- **Animated greeting**: Typewriter effect with rotating motivational phrases
- **Personal mission**: Displays `user.personalMission` if set
- **Twin Sync Ring**: Animated circular progress indicator showing `syntraCore %`
  - SVG circle with `strokeDashoffset` calculated from sync percentage
  - Color-coded: green (≥70%), yellow (40–69%), red (<40%)
- **Twin State Badge**: Derived from score trajectory:
  - "Stable" — all scores within ±5 of 7-day avg
  - "Recovery Mode" — any score dropped >10 points recently
  - "Accelerating" — all scores trending upward
  - "Drifting" — driftIndex > 40
- **Top 3 Constraints**: Displays `user.healthConstraints` or optimization gaps

### 2. Domain Scorecard Row
Three interactive cards (Health, Finance, Career):
- **Score gauge**: Radial progress (0–100 arc)
- **Trend arrow**: ↑ improving / ↓ declining / → stable
- **Click behavior**: Smooth-scrolls to corresponding twin section
- **Color tokens**: health = cyan, finance = emerald, career = violet

### 3. Mission Control Panel
- **Active goal**: Displays highest-priority incomplete goal
- **Milestone progress bar**: Animated fill showing `completed/total` milestones
- **Days remaining**: Countdown from `goal.targetDate` to today
- **Completion projection**: Estimated date based on current velocity

### 4. Anatomical Twin Section
Displays biometric data from latest health log:
- Sleep hours with quality indicator
- Workout minutes with streak
- Stress level gauge (inverted — lower is better)
- Mood score and energy level (if logged)
- Hydration tracker
- Calorie adherence ring

### 5. Financial Twin Section
Two sub-panels:

**Wealth Goals Panel** (from AI payload `finance.wealthGoals[]`):
- Goal type icon (home/car/education/etc.)
- Target amount display
- Monthly requirement vs actual savings
- Deficit indicator with color coding
- Timeline to goal completion

**Spending Intelligence Panel**:
- Budget utilization bar
- Discretionary spend trend (last 7 days)
- Impulse spend flag count
- Category breakdown (if data available)

### 6. Behavioral Twin Section
- **AI Explainability list**: `ai.explainability[]` — plain-language score drivers
- **Behavioral flag indicators**: Stress-spending correlation, sleep-career correlation, etc.
- **Accuracy indicator**: Confidence % from AI response
- **Trend chips**: Improving/declining badges per domain

### 7. AI Recommendations Section

**Daily Reflection Card**:
- `ai.dailyReflection` prose
- `ai.twinPrediction` prediction
- Confidence bar

**Daily Challenge Card**:
- `ai.dailyChallenge.title` and `description`
- Domain badge
- XP reward display
- Accept/complete button (triggers gamification event)

**Domain Recommendations**:
- Three column layout (health/finance/career)
- Bullet points from `ai.recommendations.[domain][]`
- Risk alert banner (if `ai.riskAlerts` non-empty)

**Meal Plan** (from `health.todaysMealPlan`):
- Breakfast/Lunch/Dinner/Snack cards
- Food items list
- Calorie count per meal
- Total daily calories sum

**Study Schedule** (from `career.studyBlocks`):
- Time blocks: "06:00–08:00 → DSA"
- Duration in minutes
- Timeline visualization

**Pareto Skills** (from `career.paretoSkills`):
- Skill name + impact score (1–10)
- Estimated hours to proficiency
- Priority ranking

---

## Component Hierarchy

```
Dashboard (page.tsx)
├── Navbar (inline)
│   ├── Logo + nav links
│   ├── Mobile hamburger menu
│   └── User avatar + streak badge
├── HeroSection (inline)
│   ├── GreetingTypewriter
│   ├── TwinSyncRing (SVG)
│   └── TwinStateBadge
├── ScoreRow (inline)
│   ├── ScoreCard (Health)
│   ├── ScoreCard (Finance)
│   └── ScoreCard (Career)
├── MissionControl (inline)
│   ├── GoalDisplay
│   └── MilestoneProgressBar
├── AnatomicalTwin (inline)
│   └── BiometricGrid
├── FinancialTwin (inline)
│   ├── WealthGoalsList
│   └── SpendingPanel
├── BehavioralTwin (inline)
│   ├── ExplainabilityList
│   └── BehaviorFlags
└── AIRecommendations (inline)
    ├── DailyReflectionCard
    ├── DailyChallengeCard
    ├── DomainRecommendations
    ├── MealPlan
    ├── StudySchedule
    └── ParetoSkills
```

*Note: All components are inline within `page.tsx` (no separate component files). This is a single large file.*

---

## State Management

### Server State (SWR)
```typescript
const { data: aiData, isLoading: aiLoading } = useSWR("/api/ai/recommend");
const { data: logsData } = useSWR("/api/log/latest");
const { data: goalsData } = useSWR("/api/goals");
```

SWR handles:
- Automatic revalidation on window focus
- Background revalidation on mount
- Loading and error states
- Cache management

### Local State
```typescript
const [activeSection, setActiveSection] = useState<string>("health");
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
const [challengeAccepted, setChallengeAccepted] = useState(false);
const [selectedDomain, setSelectedDomain] = useState<"health"|"finance"|"career">("health");
```

### Session State
```typescript
const { data: session } = useSession();
// session.user.{ name, avatarId, streak, optimizationVector }
```

---

## AI-Driven Elements

The following sections render conditionally based on AI payload presence:

| Element | Source Field | Fallback |
|---|---|---|
| Twin prediction | `ai.twinPrediction` | "Keep logging for insights" |
| Daily reflection | `ai.dailyReflection` | Score-based generic message |
| Risk alerts | `ai.riskAlerts[]` | Hidden |
| Meal plan | `health.todaysMealPlan[]` | Hidden |
| Study blocks | `career.studyBlocks[]` | Hidden |
| Pareto skills | `career.paretoSkills[]` | Hidden |
| Wealth deficits | `finance.wealthGoals[]` | Show calculated deficit from goals |
| Confidence % | `ai.confidence` | "—" |

---

## Loading States

- **Skeleton loaders**: Score cards show animated grey boxes while fetching
- **Shimmer animation**: AI sections shimmer while `aiLoading = true`
- **Progressive display**: Hero section shows immediately (session data), deeper sections wait for API

---

## Responsive Breakpoints

```css
/* Desktop: ≥1024px — 3-column layout for scores and recommendations */
/* Tablet: 640–1023px — 2-column layout */
/* Mobile: <640px — single column, stacked */
```

Mobile-specific behavior:
- Hamburger menu replaces nav links
- Score cards stack vertically
- Twin sections collapse to accordions
- Meal plan and study schedule hide behind "View Details" toggle
