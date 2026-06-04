# Drevlo 🚀

Drevlo is a production-grade Developer Productivity SaaS that turns raw GitHub activities (commits, pull requests, and review latencies) into real-time team intelligence. Powered by **Google Gemini 2.5 Flash**, Drevlo compiles daily standups, weekly health indexes, and end-of-sprint retrospectives to help modern software teams eliminate engineering bottlenecks and ship faster.

---

## ✨ Key Features

### 1. GitHub App Integration & Sync
* **Real-time Webhooks:** Listens to `push`, `pull_request`, and `pull_request_review` events using cryptographically verified webhook handlers (`HMAC-SHA256`).
* **Surgical Synchronization:** Periodically pulls commit and pull request histories in the background using the official Octokit SDK to keep dashboards accurate.

### 2. Google Gemini AI Engine
* **Daily Standup Summaries:** Merges logged developer tasks with their actual git commit history to produce clean, 3-bullet daily status highlights.
* **Sprint Retrospectives:** Automatically drafts sprint retro documents detailing shipped features, reported blockers, velocity charts, and actionable engineering recommendations.
* **Weekly Team Health Score:** Computes a weekly score (0-100) based on PR cycle times, review turnaround latency, commit frequency per day, and standup completion rates.
* **Automated Code Reviews:** Analyzes changes on PR merge to summarize strengths, improvement items, and coding recommendations.

### 3. Subscription & Limit Enforcement
* **Stripe Seat Billing:** Supports seat-based subscription billing ($9/dev/month) with checkout flow and self-service Stripe Customer Portal redirection.
* **Free Plan Limits:** Restricts free tier workspaces to a maximum of **4 members** and **3 connected repositories**. Upgrades to Pro automatically unlock unlimited capacity.
* **Transactional Emails:** Integrates **Resend** to dispatch workspace invites, subscription confirmations, and billing receipts.

---

## 🛠️ Architecture & Tech Stack

Drevlo is built as a unified web application using modern, secure frameworks:

* **Frontend & Backend:** [Next.js 16 (App Router)](https://nextjs.org) using TypeScript in strict mode.
* **Styling:** Vanilla Tailwind CSS v4 for glassmorphic dark-theme layouts.
* **ORM:** [Prisma 7](https://prisma.io) with standard PostgreSQL adapter drivers.
* **Authentication:** Stateless sessions signed as JWT cookies using `jose` with `httpOnly`, `secure`, and `sameSite` configuration.
* **Security:** Hardened Next.js response headers, strict signature validations for webhooks, and tagged prompt inputs to prevent prompt injection.
* **Testing:** [Vitest](https://vitest.dev) assertion framework.
* **Observability:** [Sentry SDK](https://sentry.io) for production edge, client, and server error tracing.

---

## ⚙️ Environment Configuration

To run Drevlo locally, create a `.env.local` file in the root directory and configure the following variables:

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

# Database URL (Prisma Local PostgreSQL Server)
DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Spin Up Local Database Dev Server
Drevlo uses Prisma's local database server for testing and development. Boot up the database container:
```bash
npx prisma dev
```

### 3. Start Next.js Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the landing page.

---

## 🧪 Verification & Testing

### Run Unit Tests
Unit tests verify JWT parsing, date-timezone helpers, limit gating controls, and sprint metrics aggregations:
```bash
npm run test
```

### Validate Production Build
To test compilation, typecheck, and static page generation before deploying:
```bash
npm run build
```

---

## 🔒 Security Specifications

1. **Row-Level checks:** All data fetching routes verify workspace team membership before returning database tables (preventing IDOR).
2. **Production Webhook Enforcement:** Stripe and GitHub webhook signature verifications are strictly mandatory in production mode (`NODE_ENV === 'production'`).
3. **Prompt Injection Filters:** AI templates wrap all dynamic inputs in XML tags, instructing Gemini to handle them strictly as untrusted data rather than instructions.
4. **Security Headers:** Adds clickjacking (`X-Frame-Options: DENY`), MIME-sniffing, and HSTS protections.
