# Syntra — Deployment

## Target Platform

Syntra is designed for **Vercel** deployment. It uses `@vercel/functions` (`waitUntil`) for background task support after response delivery.

---

## Required Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret (32+ char random string) |
| `NEXTAUTH_URL` | Yes | Full URL of deployed app (`https://syntra.vercel.app`) |
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `ENCRYPTION_KEY` | Yes | AES-256 encryption key (32+ char) |

### Local Development (`.env.local`)
```env
MONGODB_URI=mongodb+srv://...
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
GEMINI_API_KEY=<from Google AI Studio>
ENCRYPTION_KEY=<generate with: openssl rand -base64 32>
```

> **SECURITY NOTE**: The `.env.local` file in this repo contains real credentials. These MUST be rotated before any public deployment or repository exposure. See [repository-audit.md](repository-audit.md) — Critical Security Issue #1.

### Production (Vercel Dashboard)
Set all five variables in Vercel → Project → Settings → Environment Variables.
`NEXTAUTH_URL` must match your deployed domain exactly.

---

## External Services

### MongoDB Atlas
- **Connection string format**: `mongodb+srv://user:password@cluster.mongodb.net/dbname`
- **Required network access**: Allow `0.0.0.0/0` for Vercel (dynamic IPs) or use Vercel's static IP add-on
- **Recommended tier**: M10+ for production (M0 free tier has connection limits)
- **Collections created automatically**: `users`, `logs`, `telemetries` on first write

### Google Gemini API
- **Model used**: `gemini-2.5-flash`
- **API key source**: [Google AI Studio](https://aistudio.google.com)
- **Quota**: Default is 15 req/min on free tier
- **Pricing**: Gemini 2.5 Flash is billed per 1M tokens
- **Rate limit handling**: Built-in retry with exponential backoff (2 attempts, 500ms base)

---

## Build Requirements

### Node.js Version
- **Minimum**: Node.js 18.x (Next.js 14 requirement)
- **Recommended**: Node.js 20.x LTS

### Build Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# TypeScript check
npm run type-check  # (if configured)
```

### TypeScript Configuration
- **Target**: ES2017
- **Strict mode**: Enabled
- **Path alias**: `@/*` → `./src/*`
- `tsconfig.tsbuildinfo` is gitignored (incremental build cache)

---

## Vercel-Specific Configuration

### `next.config.mjs`
Minimal configuration — no special rewrites or image domains required currently.

### Function Configuration
By default, Next.js API routes on Vercel run as Edge or Node.js functions:
- Routes using Mongoose **must** run as Node.js functions (not Edge)
- No explicit `runtime` export found — defaults to Node.js (correct)
- `waitUntil` requires Vercel Pro plan for extended function lifetime

### Recommended `vercel.json` (not currently in repo)
```json
{
  "functions": {
    "src/app/api/**": {
      "maxDuration": 30
    }
  }
}
```

AI routes may take 5–15 seconds; default 10s timeout will cause failures.

---

## Runtime Dependencies

### Production (`dependencies` in package.json)
```
next: 14.2.3
react: 18.2.0
react-dom: 18.2.0
mongoose: 8.4.0
next-auth: 4.24.14
bcryptjs: 2.4.3
zod: 4.4.3
xlsx: 0.18.5
swr: 2.4.1
@google/generative-ai: (latest)
@vercel/functions: (latest)
framer-motion: 12.40.0
recharts: 3.8.1
lucide-react: 1.16.0
```

### Development Only (`devDependencies`)
```
typescript
@types/node
@types/react
@types/react-dom
@types/bcryptjs
eslint
eslint-config-next
```

---

## Database Setup

No manual schema setup required. Mongoose creates collections on first write.

### Recommended Atlas Indexes (run once)
```javascript
// In MongoDB Atlas console or mongosh:
db.logs.createIndex({ userId: 1, date: -1 });
db.logs.createIndex({ userId: 1, domain: 1 });
db.telemetries.createIndex({ timestamp: -1 });
db.users.createIndex({ email: 1 }, { unique: true });
```

*These are also defined in the Mongoose schema as `schema.index()` calls, so they will be created automatically on application start.*

---

## Demo Setup

A demo account can be seeded via:
```
GET /api/setup/demo?secret=<DEMO_SECRET>
```

This creates `demo@syntra.com` with 14 days of engineered logs showing a sleep collapse → stress spending spike → recovery pattern.

**Note**: The current demo secret is hardcoded in the route. For production, move this to an environment variable.

---

## Health Check

No explicit health check endpoint exists. A basic check can be performed against:
```
GET /api/mock?type=profile
```
Returns 200 with static data — no DB required, confirms Next.js routing is working.

---

## Deployment Checklist

- [ ] All 5 environment variables set in Vercel dashboard
- [ ] MongoDB Atlas network access allows Vercel IPs
- [ ] `NEXTAUTH_URL` matches deployed domain
- [ ] `NEXTAUTH_SECRET` is a new, random 32+ char value (not the dev value)
- [ ] `ENCRYPTION_KEY` is a new, random 32+ char value
- [ ] `GEMINI_API_KEY` is production key with appropriate quota
- [ ] Vercel function timeout increased to 30s for AI routes
- [ ] Demo secret updated or removed
- [ ] `.env.local` not committed to repository (verify `.gitignore`)
