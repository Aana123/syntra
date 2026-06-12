# Syntra — Frontend Structure

## Overview

Syntra uses Next.js 14 App Router with React 18 Client Components for all interactive pages. The frontend is entirely TypeScript with no separate component library — all UI components are inline within page files.

---

## Page Hierarchy

```
src/app/
├── layout.tsx              ← Root layout (Providers wrapper, metadata)
├── page.tsx                ← Landing/home page (public)
├── login/
│   └── page.tsx            ← Authentication page (public)
├── signup/
│   └── page.tsx            ← Registration + avatar selection (public)
├── onboarding/
│   └── page.tsx            ← 4-step calibration questionnaire (protected)
├── dashboard/
│   └── page.tsx            ← Main experience, 2500+ lines (protected)
├── ingestion/
│   └── page.tsx            ← Daily log submission form (protected)
├── goals/
│   └── page.tsx            ← Goal management (protected)
├── insights/
│   └── page.tsx            ← Domain analysis & twin insights (protected)
├── simulator/
│   └── page.tsx            ← What-if scenario engine (protected)
└── api/                    ← Backend routes (see api-reference.md)
```

### Authentication Guard Pattern
Protected pages use:
```typescript
import { useSession } from "next-auth/react";
const { data: session, status } = useSession();
if (status === "loading") return <LoadingSpinner />;
if (!session) redirect("/login");
```

---

## Page Descriptions

### `app/page.tsx` — Landing Page
- Typewriter headline animation with rotating phrases
- Feature highlights (3 cards)
- Testimonial carousel (3.5M 5-star display)
- FAQ accordion
- CTA buttons to `/signup`
- Sticky navbar with user detection (redirects logged-in users to dashboard)
- Responsive mobile menu
- No data fetching — fully static content

### `app/login/page.tsx` — Login
- Email + password form
- Show/hide password toggle (eye icon)
- Shimmer skeleton loading on submit
- Multi-ring spinner animation
- Shake animation on error
- Trust badges (SSL, encryption indicators)
- `signIn("credentials")` from NextAuth

### `app/signup/page.tsx` — Registration
- Avatar picker: 4 cards with glow effects and selection animation
- Name, email, password fields
- Live password requirements validation (uppercase, number, special char)
- `POST /api/auth/register` → success → `signIn()` → `/onboarding`

### `app/onboarding/page.tsx` — Onboarding
- 4-step form with progress indicator
- Step 1: Physical profile
- Step 2: Financial profile
- Step 3: Behavioral profile
- Step 4: Identity + mission
- `POST /api/profile/onboard` → `/dashboard`

### `app/dashboard/page.tsx` — Dashboard
- Main application experience
- 2,500+ lines — all components inlined
- See [dashboard.md](dashboard.md) for full details

### `app/ingestion/page.tsx` — Log Entry
- Tabbed interface: Health / Finance / Career
- Domain-specific forms
- Optionally unified daily submission
- Success animation on submit
- Shows computed score preview before submitting

### `app/goals/page.tsx` — Goals
- Goal list with domain badges
- Inline milestone creation
- Priority indicator chips
- Progress bar per goal
- Delete confirmation (inline, not modal)
- CRUD via `/api/goals` and `/api/goals/milestone`

### `app/insights/page.tsx` — Insights
- Domain selector (tabs: Health / Finance / Career)
- Per-domain AI analysis display
- Trend charts (Recharts)
- Data from `GET /api/ai/domain?domain=X`

### `app/simulator/page.tsx` — Simulator
- Scenario input textarea
- Domain focus selector
- Timeframe dropdown
- Result display: narrative + projected scores + trade-offs
- Timeline visualization
- `POST /api/simulate`

---

## Shared Infrastructure

### `app/layout.tsx`
```typescript
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### `app/Providers.tsx`
```typescript
"use client";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

This is the only global context provider. No Redux, no Zustand, no React Context beyond sessions.

---

## Hooks

No custom hooks directory (`src/hooks/`) exists in the codebase.

Data fetching uses **SWR** directly in page components:
```typescript
import useSWR from "swr";
const fetcher = (url: string) => fetch(url).then(r => r.json());
const { data, isLoading, error } = useSWR("/api/ai/recommend", fetcher);
```

Session access uses `useSession()` from NextAuth:
```typescript
import { useSession } from "next-auth/react";
const { data: session } = useSession();
```

---

## State Management Philosophy

Syntra uses **minimal state**:

| Type | Tool |
|---|---|
| Server state | SWR (cache + revalidation) |
| Authentication | NextAuth session + JWT |
| Local UI state | React `useState` |
| Forms | Controlled components with `useState` |
| Navigation | Next.js `router.push()` |

No global state store (no Redux, Zustand, Jotai, or Context API beyond SessionProvider).

---

## Animations

**Framer Motion** is imported and used for:
- Page entrance animations (`motion.div` with `initial/animate/exit`)
- Stagger effects on lists
- Score card reveal animations
- Twin sync ring pulse

**CSS Animations** (inline styles + Tailwind) for:
- Typewriter text effect
- Shimmer loading skeletons
- Shake animation on form errors
- Glow effects on avatar cards

---

## Styling Approach

- **Tailwind CSS** for utility classes
- **Inline styles** for dynamic values (computed gradients, animated properties)
- **CSS custom properties** for design tokens (color variables)
- No separate CSS modules or styled-components

### Color Tokens (used across pages)
```css
--health:  #06b6d4  (cyan-500)
--finance: #10b981  (emerald-500)
--career:  #8b5cf6  (violet-500)
--gold:    #f59e0b  (amber-500)
--danger:  #ef4444  (red-500)
```

---

## Data Fetching Pattern

All pages that need fresh data follow this pattern:
```typescript
const { data, isLoading, error, mutate } = useSWR<ResponseType>(
  "/api/endpoint",
  fetcher,
  {
    revalidateOnFocus: true,
    refreshInterval: 0,  // No polling — only revalidate on focus
  }
);
```

After mutations (log submission, goal creation), pages call:
```typescript
mutate(); // Revalidate SWR cache for affected endpoints
```

---

## TypeScript Integration

All pages are fully typed:
- Session user from `next-auth.d.ts` augmentation
- API response types from `src/types/ai.ts`
- Zod schema types inferred from validators
- Mongoose document types from `src/models/`

### Path Alias
```typescript
// tsconfig.json
"@/*": ["./src/*"]

// Usage
import { calculateHealthScore } from "@/lib/scoring";
import type { TwinContext } from "@/types/ai";
```

---

## Performance Considerations

- **`"use client"` directive** only on pages that need it (all 8 app pages are client components)
- **No server components with data fetching** — all data fetched client-side via SWR
- **Image optimization**: Next.js `<Image>` not used — avatars are emoji/CSS-based
- **Bundle size**: No heavy UI library; main dependencies are Recharts and Framer Motion
- **Code splitting**: Automatic per-route by Next.js App Router
