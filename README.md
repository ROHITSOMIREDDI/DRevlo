# Drevlo 🚀

[![Production Build](https://img.shields.io/badge/Next.js-16.2.6-black.svg?style=flat-squared)](https://nextjs.org)
[![Database](https://img.shields.io/badge/Prisma-7.8.0-blue.svg?style=flat-squared)](https://prisma.io)
[![Test Suite](https://img.shields.io/badge/Vitest-4.1.7-green.svg?style=flat-squared)](https://vitest.dev)
[![Security Level](https://img.shields.io/badge/Security-Hardened-success.svg?style=flat-squared)](#-security-architecture)

Drevlo is a production-grade Developer Productivity SaaS that turns raw GitHub activities (commits, pull requests, and review latencies) into real-time team intelligence. Powered by **Google Gemini 2.5 Flash**, Drevlo compiles daily standups, weekly health indexes, and end-of-sprint retrospectives to help modern software teams eliminate engineering bottlenecks, maximize velocity, and ship higher quality code.

---

## ✨ Core Highlights

* **Real-time Team Intelligence:** Instantly translate git activities into actionable reports.
* **Automatic Standup Compilation:** Generates clean status summaries from recent developer commits.
* **Weekly Team Health Metric:** Translates review latency and PR cycle times into a developer health index.
* **Enterprise-grade Security:** Engineered with stateless JWT rotation, Row-Level Security, strict CSRF validation, and rate-limiting.

---

## 🛠️ Repository Architecture & Directory Layout

To maintain a clean and professional directory layout, configuration and entry-point files reside in the root, while core application code is organized logically by component and concern.

```
├── app/                      # Next.js 16 App Router (Pages, Layouts & API Endpoints)
│   ├── (auth)/               # Authentication pages
│   ├── (dashboard)/          # Application views (Dashboard, Commits, PRs, Standups, etc.)
│   └── api/                  # REST and Webhook API routes (Gemini, Stripe, GitHub)
├── components/               # Reusable React components & Context Providers
├── lib/                      # Business logic, database clients, and utility modules
│   ├── ai.ts                 # Google Gemini API integration
│   ├── jwt.ts                # JWT authentication services
│   ├── rate-limit.ts         # Global request & webhook rate limiters
│   └── stripe.ts             # Stripe checkout and billing portal helpers
├── prisma/                   # Database schema definitions & migrations
│   ├── schema.prisma         # Prisma schema
│   ├── enable_rls.sql        # RLS Policy migration definitions
│   └── apply-rls.ts          # Automated script to apply RLS policy migrations
├── prompts/                  # Structured system prompt templates for Gemini AI models
├── public/                   # Static assets (icons, SVGs, etc.)
└── tests/                    # Vitest integration and unit testing suites
```

### ⚙️ Root Configuration Files
In compliance with standard ecosystem standards, tooling configuration files remain in the root directory for automated detection by compiler and deployment processes:
* `next.config.ts` / `postcss.config.mjs` / `eslint.config.mjs`: Build and style pipeline controls.
* `tsconfig.json` / `next-env.d.ts`: TypeScript compiler rules.
* `vitest.config.ts`: Automated test suite options.
* `prisma.config.ts`: Data access configurations.
* `proxy.ts`: Next.js 16 edge-routing request pre-processor (replacing `middleware.ts`).
* `sentry.*.config.ts`: Error logging configuration.

---

## 🔒 Security Architecture

Drevlo implements robust, defense-in-depth security standards across all layers of the application stack.

### 1. Token-Rotated Session Management
* **Short-lived Access Tokens (`drevlo_access`):** Expires after **15 minutes**.
* **Rotated Refresh Tokens (`drevlo_refresh`):** Expires after **7 days**.
* **Automatic Session Refresh:** Next.js 16 [proxy.ts](file:///c:/ROHIT%20A%20SPACE/MY%20WORKS/DRevlo/proxy.ts) intercepts outgoing requests when the access token has expired and automatically exchanges the refresh token for a new set of cookies in the backchannel, preventing user session drops.
* **Reuse Detection & Revocation:** Every refresh token rotation revokes the previous token in the database. If a reuse attack is detected (an old token is presented), the entire refresh token family is instantly invalidated.

### 2. Row-Level Security (RLS) & Tenant Isolation
All tables in the Postgres database utilize strict RLS policies, ensuring tenant isolation:
* Users can query only their own `User` profiles.
* Members can access `Sprints`, `Standups`, `Repositories`, `Commits`, `PRs`, and `AI Reports` only for the Teams they are actively part of.
* Subscriptions and Refresh Tokens are accessible exclusively by their owner.
* The DB initialization script [apply-rls.ts](file:///c:/ROHIT%20A%20SPACE/MY%20WORKS/DRevlo/prisma/apply-rls.ts) applies the security policies defined in [enable_rls.sql](file:///c:/ROHIT%20A%20SPACE/MY%20WORKS/DRevlo/prisma/enable_rls.sql).

### 3. Double-Submit CSRF Protection
State-changing HTTP operations (`POST`, `PUT`, `PATCH`, `DELETE`) are protected against Cross-Site Request Forgery:
* Next.js 16 [proxy.ts](file:///c:/ROHIT%20A%20SPACE/MY%20WORKS/DRevlo/proxy.ts) validates that the value of the custom `x-csrf-token` header matches the `drevlo_csrf` cookie.
* The frontend uses [csrf-provider.tsx](file:///c:/ROHIT%20A%20SPACE/MY%20WORKS/DRevlo/components/csrf-provider.tsx) to automatically inject the token into all API calls transparently.

### 4. API Rate Limiting & Webhook Replay Protection
* **Global API Rate Limiting:** Limits requests on `/api/*` routes to **60 requests/minute** per IP.
* **Webhook Replay Prevention:** GitHub webhook deliveries are tracked using the `X-GitHub-Delivery` header. Duplicate payloads are discarded immediately.
* **Cryptographic Signatures:** Stripe and GitHub webhooks validate signatures using SHA-256 HMAC in production.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
Create a `.env.local` file in the root directory:
```bash
# Next.js Server Configurations
JWT_SECRET="your-32-character-minimum-jwt-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# GitHub App credentials
GITHUB_CLIENT_ID="your-github-app-client-id"
GITHUB_CLIENT_SECRET="your-github-app-client-secret"
GITHUB_APP_ID="your-github-app-id"
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GITHUB_WEBHOOK_SECRET="your-webhook-hmac-secret"
NEXT_PUBLIC_GITHUB_APP_NAME="your-github-app-slug-name"

# Google Gemini API
GEMINI_API_KEY="your-gemini-studio-api-key"

# Stripe Configurations
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Resend Email Configuration
RESEND_API_KEY="re_..."

# Sentry DSN
NEXT_PUBLIC_SENTRY_DSN="https://..."

# Database Connection
DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"
```

### 3. Spin Up Database & Apply Security Policies
Ensure your local PostgreSQL server is active, and then push the schemas and apply the RLS policies:
```bash
# Start the local database server
npx prisma dev

# Push schema changes to database
npx prisma db push

# Apply Row Level Security (RLS) policies
npx tsx prisma/apply-rls.ts
```

### 4. Start the Application
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000) to view the development dashboard.

---

## 🧪 Verification & Testing

### Unit and Security Tests
Verify JWT signing, session rotation, CSRF protection, timezone parsing, and webhook replay protection using the test runner:
```bash
npm run test
```

### Production Bundling
Ensure TypeScript validation and Turbopack builds compile cleanly:
```bash
npm run build
```
