# SML Stock Market — Project Overview & Documentation
> **Who this is for:** Everyone — product team, new developers, stakeholders, and anyone who wants to understand what we're building and how it works without needing to read code.

---

## 🌍 What Is SML Stock Market?

SML Stock Market is a **mobile app** that connects two types of people:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   FOUNDERS                          INVESTORS                   │
│   (Idea Owners)                                                 │
│                                                                 │
│   "I have a great        ←→        "I have money and           │
│    business idea but               want to support             │
│    need funding."                  great ideas."               │
│                                                                 │
│   ✅ List your idea                ✅ Browse real ideas         │
│   ✅ Upload your pitch             ✅ Invest from $1,000        │
│   ✅ Reach investors               ✅ Track your portfolio      │
│   ✅ Get funded                    ✅ Message founders          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

         "Where Ideas Meet Investors. Where Investors Meet Ideas."
```

Think of it as a mix between **AngelList** (startup investing), **LinkedIn** (professional networking), and **Kickstarter** (crowdfunding) — built specifically for the Malaysian and African markets.

---

## 💰 How Does SML Make Money?

SML has two revenue streams:

```
┌──────────────────────────┐     ┌──────────────────────────────┐
│   INVESTOR PLAN          │     │   IDEA OWNER PLAN            │
│                          │     │                              │
│   $19 / month            │     │   $8  one-time               │
│                          │     │                              │
│   Recurring subscription │     │   Per idea listed            │
│   Cancel anytime         │     │   Pay once, stay listed      │
│                          │     │                              │
│   Unlocks:               │     │   Unlocks:                   │
│   • Full idea details    │     │   • Idea goes live           │
│   • Business plans       │     │   • Visible to investors     │
│   • Invest in ideas      │     │   • Receive investment       │
│   • Message founders     │     │   • Founder dashboard        │
│   • Portfolio tracking   │     │   • Post updates             │
└──────────────────────────┘     └──────────────────────────────┘
```

A user can subscribe to **both** plans simultaneously (they can be both an investor AND a founder).

---

## 👤 Who Uses SML? (User Types)

```
                    ┌─────────────────────────────────────────┐
                    │              ALL USERS                  │
                    └──────────────────┬──────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
     ┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
     │   FREE USER     │    │ INVESTOR PREMIUM  │    │ FOUNDER PREMIUM  │
     │                 │    │                  │    │                  │
     │ Can browse      │    │ $19/month        │    │ $8 one-time      │
     │ limited info    │    │ + KYC verified   │    │ per idea         │
     │ Save watchlist  │    │                  │    │                  │
     │ Connect with    │    │ Full access to   │    │ Can list ideas   │
     │ people          │    │ invest & track   │    │ and receive      │
     └─────────────────┘    └──────────────────┘    └──────────────────┘
                                       │
                            ┌──────────────────┐
                            │     ADMIN        │
                            │   (Internal)     │
                            │                  │
                            │ Reviews ideas    │
                            │ Verifies KYC     │
                            │ Manages platform │
                            └──────────────────┘
```

---

## 🗺️ The User Journey (Step by Step)

### Journey A: Becoming an Investor

```
  DOWNLOAD APP
      │
      ▼
  CREATE ACCOUNT ──── Enter name, email, password
      │                Agree to Terms of Service
      │
      ▼
  VERIFY EMAIL ─────── Click link sent to inbox
      │
      ▼
  SET UP PROFILE ───── Photo, occupation, industry, location, bio
      │
      ▼
  PICK INTERESTS ───── Technology, Agriculture, Startups, etc.
      │
      ▼
  CHOOSE PATH ──────── Select "I want to invest"
      │
      ▼
  VERIFY IDENTITY ──── Submit ID + address proof (KYC)
  (KYC - 1-3 days)     Wait for approval
      │
      ▼
  SUBSCRIBE ────────── Pay $19/month with card / Apple Pay / Google Pay
      │
      ▼
  INVESTOR DASHBOARD ── Browse ideas, invest, track portfolio
      │
      ├─── Browse ideas by category / stage / location
      ├─── View full business plans and financials
      ├─── Invest from $1,000
      ├─── Message founders directly
      └─── Track investment growth and updates
```

### Journey B: Listing an Idea as a Founder

```
  DOWNLOAD APP
      │
      ▼
  CREATE ACCOUNT ──── Same as investor journey above
      │
      ▼
  CHOOSE PATH ──────── Select "I have an idea"
      │
      ▼
  FILL IDEA DETAILS ── Title, description, problem, solution, business model
      │
      ▼
  UPLOAD FILES ─────── Business Plan (PDF) ← optional
      │                 Pitch Deck (PDF)    ← optional
      │                 Pitch Video (MP4)   ← REQUIRED
      │
      ▼
  SET FUNDING GOAL ─── How much you need + what for
      │
      ▼
  PAY LISTING FEE ──── $8 one-time payment
      │
      ▼
  ADMIN REVIEW ─────── SML team reviews quality (1-3 business days)
      │
      │   ┌─ REJECTED ──→ Email with reason, $8 refund
      └───┤
          └─ APPROVED ──→ Idea goes LIVE on platform
                │
                ▼
          FOUNDER DASHBOARD
          ├─── See who's viewing/saving your idea
          ├─── Receive investor messages
          ├─── Track funds raised
          ├─── Post progress updates
          └─── Mark milestones completed
```

---

## 🏗️ How the System Is Built (Technical Architecture)

### The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE APPS                              │
│              iOS App          Android App                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │  HTTPS requests
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                                │
│              Rate limiting · CORS · Auth check                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SML BACKEND API                              │
│                   (This project ↓)                              │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │   Auth   │ │  Users   │ │  Ideas   │ │  Investments     │  │
│  │ Module   │ │ Module   │ │ Module   │ │  Module          │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Feed    │ │Messaging │ │Watchlist │ │  Notifications   │  │
│  │ Module   │ │ Module   │ │ Module   │ │  Module          │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│                                                                 │
└────────┬─────────────────────────┬───────────────────────────┘
         │                         │
         ▼                         ▼
┌─────────────────┐      ┌──────────────────┐
│   PostgreSQL    │      │      Redis        │
│   DATABASE      │      │      CACHE        │
│                 │      │                  │
│ All permanent   │      │ Sessions, rate   │
│ data stored     │      │ limits, feed     │
│ here            │      │ cache            │
└─────────────────┘      └──────────────────┘
```

### External Services We Connect To

```
SML Backend ──→ Stripe          (payments, subscriptions)
            ──→ AWS S3          (file storage — pitch videos, documents)
            ──→ Firebase        (push notifications to phones)
            ──→ Resend          (emails — verification, receipts)
            ──→ Twilio          (SMS for 2-factor login verification)
            ──→ CloudFront      (fast delivery of images and files)
```

---

## 📂 How the Code Is Organised

The project follows a pattern called **"Modular Monolith"** — one app, but split into clean, independent sections (modules).

```
sml-backend/
│
├── 📁 src/                         ← All source code lives here
│   │
│   ├── 📁 config/                  ← App settings (reads .env file)
│   │   └── Validates all settings at startup. If a setting is
│   │       missing or wrong, the app refuses to start — no
│   │       silent failures.
│   │
│   ├── 📁 database/                ← Database connection
│   │   └── One connection shared across the whole app.
│   │       Handles startup/shutdown gracefully.
│   │
│   ├── 📁 logger/                  ← Application logging
│   │   └── Writes structured logs. In development: easy to
│   │       read. In production: machine-readable JSON for
│   │       monitoring tools.
│   │
│   ├── 📁 common/                  ← Shared building blocks
│   │   ├── Every API response has the same shape (wrapper)
│   │   ├── All errors are caught in one place and formatted
│   │   │   consistently
│   │   ├── Validation runs automatically on every request
│   │   └── Useful helper functions (mask emails, generate
│   │       slugs, paginate results)
│   │
│   └── 📁 modules/                 ← Feature modules
│       ├── auth/                   ← ✅ DONE: Login, register, tokens
│       ├── users/                  ← 🔄 NEXT: Profiles, discovery
│       ├── kyc/                    ← ⏳ TODO: Identity verification
│       ├── ideas/                  ← ⏳ TODO: Idea listings
│       ├── investments/            ← ⏳ TODO: Invest + track
│       ├── subscriptions/          ← ⏳ TODO: Plans, billing
│       ├── feed/                   ← ⏳ TODO: Community posts
│       ├── messaging/              ← ⏳ TODO: Direct messages
│       ├── watchlist/              ← ⏳ TODO: Saved items
│       ├── notifications/          ← ⏳ TODO: Alerts
│       └── admin/                  ← ⏳ TODO: Admin panel
│
├── 📁 prisma/                      ← Database schema
│   └── schema.prisma               ← Defines ALL data tables
│                                     (20 tables, all relationships)
│
├── 📄 Dockerfile                   ← How to package for production
├── 📄 docker-compose.yml           ← Run everything locally
└── 📄 .env.example                 ← Template for configuration
```

---

## 🗃️ What Data We Store (Database Tables)

We have 20 database tables. Here's a plain-English map:

```
PEOPLE
├── users              ← Login credentials, account status
├── user_profiles      ← Name, photo, bio, location, occupation
└── user_interests     ← What topics they care about (Technology, etc.)

SECURITY
├── email_verification_tokens  ← One-time links sent to verify email
├── refresh_tokens             ← "Remember me" tokens for staying logged in
└── kyc_verifications          ← Identity documents submitted for verification

PAYMENTS
├── subscriptions              ← $19/month investor plan tracking
├── listing_payments           ← $8 one-time founder listing fee
├── wallets                    ← In-app balance per user
└── wallet_transactions        ← Every credit/debit in the wallet

IDEAS
├── ideas              ← The core idea listing (title, stage, goal, etc.)
├── idea_files         ← Uploaded PDFs and videos
├── idea_milestones    ← Progress checkpoints (Prototype, Launch, etc.)
└── idea_updates       ← Founder progress updates posted to investors

INVESTMENTS
└── investments        ← Every investment transaction

SOCIAL
├── connections        ← Who is connected with whom
├── message_threads    ← Conversation channels between two people
├── messages           ← Individual messages within a thread
├── watchlist_items    ← Saved ideas and people
├── posts              ← Community feed posts (ideas, updates, requests)
├── post_likes         ← Who liked what
└── post_comments      ← Comments on posts

SYSTEM
├── notifications      ← In-app alerts (investment confirmed, KYC approved, etc.)
├── device_tokens      ← Phone tokens for push notifications
└── audit_logs         ← Immutable record of all important actions
```

---

## 🔄 How a Request Works (End to End)

Here's what happens when a user presses "Invest Now" in the app:

```
  📱 USER TAPS "INVEST NOW"
         │
         │  POST /api/v1/investments/initiate
         │  Headers: Authorization: Bearer eyJhbGc...
         │  Body: { ideaId: "abc", amount: 1000, paymentMethod: "CARD" }
         │
         ▼
  ┌──────────────────────┐
  │   RATE LIMITER       │  Is this user making too many requests?
  │                      │  (100 per minute max)
  └──────────┬───────────┘
             │ OK — continue
             ▼
  ┌──────────────────────┐
  │   AUTH GUARD         │  Is the JWT token valid?
  │                      │  Is the user active (not suspended)?
  └──────────┬───────────┘
             │ Valid — attach user to request
             ▼
  ┌──────────────────────┐
  │   VALIDATION PIPE    │  Is the request body valid?
  │                      │  Is amount >= 1000?
  │                      │  Is ideaId a valid UUID?
  └──────────┬───────────┘
             │ Valid — continue
             ▼
  ┌──────────────────────┐
  │   CONTROLLER         │  Route the request to the right service
  │                      │  Extract: user ID from token, body data
  └──────────┬───────────┘
             │
             ▼
  ┌──────────────────────┐
  │   SERVICE            │  Business logic:
  │                      │  1. Does this idea exist and is it LIVE?
  │                      │  2. Is user KYC verified?
  │                      │  3. Does user have active subscription?
  │                      │  4. Create Stripe payment intent
  │                      │  5. Lock the idea row in DB
  │                      │  6. Create investment record
  │                      │  7. Update idea's raised_amount
  │                      │  8. Write audit log
  └──────────┬───────────┘
             │
             ▼
  ┌──────────────────────┐
  │   DATABASE           │  All steps 5-8 happen in ONE transaction
  │   (PostgreSQL)       │  Either ALL succeed or NONE do
  └──────────┬───────────┘
             │
             ▼
  ┌──────────────────────┐
  │  TRANSFORM           │  Wrap result in standard envelope:
  │  INTERCEPTOR         │  { success: true, data: { investmentId, ... } }
  └──────────┬───────────┘
             │
             ▼
  📱 APP RECEIVES RESPONSE
     Shows "Investment confirmed!" screen
```

---

## 🛡️ How We Keep Data Safe

### 1. Authentication — Proving Who You Are

```
LOGIN FLOW:
User sends email + password
       │
       ▼
Server verifies password (bcrypt — even if hacked, hashes are useless)
       │
       ▼
Server issues TWO tokens:
  ┌────────────────────────────┐  ┌────────────────────────────────┐
  │   ACCESS TOKEN             │  │   REFRESH TOKEN                │
  │                            │  │                                │
  │   Lives: 15 minutes        │  │   Lives: 30 days               │
  │   Used: Every API call     │  │   Used: Get new access token   │
  │   Stored: In app memory    │  │   Stored: Secure storage       │
  └────────────────────────────┘  └────────────────────────────────┘
         │
         ▼
After 15 min, app uses refresh token to get new access token
(User never has to log in again unless 30 days pass)

SECURITY: If refresh token is stolen and used, we detect it
(token reuse attack) and immediately log out ALL devices.
```

### 2. What We Never Store

```
❌ Plain text passwords        → We store a bcrypt HASH only
❌ Raw credit card numbers     → Stripe handles all card data (PCI compliant)
❌ KYC document content        → Stored encrypted in private AWS S3 only
❌ Full emails in logs         → We log  a***@gmail.com  not the real email
❌ JWT tokens in database      → We store a hash of the refresh token only
```

### 3. Every Action Is Logged

```
AUDIT LOG (append-only, can never be edited or deleted):
┌────────────────┬────────────────────────┬──────────────────────────┐
│ Timestamp      │ Action                 │ Who + What               │
├────────────────┼────────────────────────┼──────────────────────────┤
│ 2025-05-17     │ USER_REGISTERED        │ user_id: abc123, ip: ... │
│ 2025-05-17     │ EMAIL_VERIFIED         │ user_id: abc123          │
│ 2025-05-17     │ KYC_SUBMITTED          │ user_id: abc123          │
│ 2025-05-17     │ INVESTMENT_CONFIRMED   │ user_id: abc123, $1000   │
│ 2025-05-17     │ IDEA_APPROVED          │ admin_id: xyz, idea: ... │
└────────────────┴────────────────────────┴──────────────────────────┘
This log is used for compliance, fraud investigation, and disputes.
```

---

## 💳 How Payments Work

### Investor Subscription ($19/month)

```
User clicks "Subscribe as Investor"
          │
          ▼
Our server creates a Stripe Customer + Subscription
          │
          ▼
App shows Stripe's payment form (we never see card details)
          │
          ▼
User enters card, Stripe processes payment
          │
          ▼
Stripe sends a webhook (like a notification) to our server:
"Payment succeeded for customer XYZ"
          │
          ▼
Our server marks subscription ACTIVE
User can now invest, view full details, message founders
```

### Founder Listing Fee ($8)

```
Founder completes idea details + uploads pitch video
          │
          ▼
Our server creates a $8 Stripe PaymentIntent
          │
          ▼
Founder pays (card, PayPal, Apple Pay, Google Pay)
          │
          ▼
Stripe webhook confirms payment
          │
          ▼
Idea status changes from DRAFT → SUBMITTED
Admin team gets notified to review
```

### Investment Transaction ($1,000+)

```
Investor clicks "Invest Now" → chooses amount + payment method
          │
          ▼
Our server creates investment record (status: PENDING)
+ locks the idea row in the database (prevents race conditions)
          │
          ▼
Payment processed (card via Stripe, or wallet balance)
          │
          ▼
If payment succeeds:
  • Investment status → COMPLETED
  • Idea's raised_amount increases by investment amount
  • Investor count increases by 1
  • Founder receives notification
  • Audit log entry created
          │
If payment fails:
  • Investment status → FAILED
  • Raised amount NOT changed (atomic transaction — all or nothing)
  • User notified of failure
```

---

## 📊 The Idea Review Process

Every idea goes through a quality gate before going live:

```
FOUNDER SUBMITS IDEA + PAYS $8
          │
          ▼
  ┌───────────────────┐
  │   SUBMITTED       │  Idea is in the review queue
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │  UNDER REVIEW     │  Admin team checks (1-3 business days):
  │                   │  • Is the idea genuine?
  │                   │  • Is the video pitch present and clear?
  │                   │  • Are the documents legitimate?
  │                   │  • Is the funding goal realistic?
  └─────────┬─────────┘
            │
     ┌──────┴──────┐
     │             │
     ▼             ▼
 APPROVED       REJECTED
     │             │
     ▼             ▼
  LIVE on      Email to founder
  platform     with reason
               (+ $8 refund)
```

---

## 🌐 API Endpoints Overview

Every endpoint follows this URL pattern: `https://api.sml.com/api/v1/[resource]`

All responses look like this:

```json
// Success
{
  "success": true,
  "data": { "...actual data here..." },
  "meta": { "page": 1, "total": 128 }
}

// Error
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Idea with id 'abc' was not found",
    "requestId": "abc-123"
  }
}
```

### Endpoints by Feature Area

```
AUTHENTICATION
  POST /auth/register           ← Create new account
  POST /auth/verify-email       ← Confirm email address
  POST /auth/resend-verification ← Resend verification email
  POST /auth/login              ← Get access + refresh tokens
  POST /auth/refresh            ← Exchange refresh token for new pair
  DELETE /auth/logout           ← Revoke refresh token

USERS (Profile)
  GET  /users/me                ← My full profile
  PATCH /users/me/profile       ← Update name, bio, location, etc.
  PUT  /users/me/interests      ← Set interest tags
  GET  /users                   ← Browse other users (Partners page)
  GET  /users/:id               ← View someone's public profile

KYC (Identity)
  POST /kyc/submit              ← Submit personal info
  POST /kyc/documents           ← Upload ID + address proof
  GET  /kyc/status              ← Check verification status

IDEAS
  GET  /ideas                   ← Browse ideas (filtered, paginated)
  POST /ideas                   ← Create draft idea
  GET  /ideas/:slug             ← View idea detail (gated by subscription)
  PATCH /ideas/:id              ← Update draft
  POST /ideas/:id/files         ← Upload business plan / pitch video
  POST /ideas/:id/listing-fee/initiate ← Pay $8 to submit
  GET  /ideas/:id/review-status ← Track admin review progress

INVESTMENTS
  POST /investments/initiate    ← Start investment transaction
  POST /investments/confirm     ← Confirm after agreeing to terms
  GET  /investments             ← My investment portfolio
  GET  /investments/:id/tracking ← Single investment detail + updates

SUBSCRIPTIONS
  GET  /subscriptions/plans     ← Available plans + pricing
  POST /subscriptions/subscribe ← Subscribe as investor
  GET  /subscriptions/current   ← My subscription status
  DELETE /subscriptions/current ← Cancel subscription

CONNECTIONS & MESSAGING
  POST /connections/request     ← Send connection request
  PATCH /connections/:id        ← Accept or decline
  GET  /messages/threads        ← All conversations
  POST /messages/threads/:id/messages ← Send a message

FEED & SOCIAL
  GET  /feed                    ← Personalized home feed
  POST /posts                   ← Create a post
  POST /posts/:id/like          ← Like a post
  POST /posts/:id/comments      ← Comment on a post

WATCHLIST
  GET  /watchlist               ← Saved ideas and people
  POST /watchlist               ← Save an item
  DELETE /watchlist/:id         ← Remove from watchlist

NOTIFICATIONS
  GET  /notifications           ← Notification history
  PUT  /notifications/read-all  ← Mark all as read

FOUNDER TOOLS
  GET  /founder/dashboard/:id   ← Analytics for my idea
  POST /founder/ideas/:id/updates ← Post a progress update
  PATCH /founder/ideas/:id/milestones/:mId ← Mark milestone done
```

---

## 🐳 Running Locally (Developer Setup)

The project uses Docker to make local setup easy. You don't need to install PostgreSQL or Redis manually.

```
WHAT DOCKER GIVES YOU:
┌─────────────────────────────────────────────────────────────┐
│                    Your Computer                            │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ PostgreSQL  │  │    Redis     │  │     Adminer      │  │
│  │ :5432       │  │    :6379     │  │  (DB viewer)     │  │
│  │             │  │              │  │     :8080        │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│  Your API runs OUTSIDE Docker in dev (hot-reload works)    │
│  API: http://localhost:3000                                 │
│  Swagger: http://localhost:3000/api/docs                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Setup steps:**
```bash
# 1. Get the code
unzip sml-backend.zip
cd sml-backend

# 2. Install dependencies
npm install

# 3. Set up configuration
cp .env.example .env.local
# Open .env.local and fill in required values

# 4. Start databases
docker compose up postgres redis -d

# 5. Create database tables
npm run db:migrate

# 6. Start the API
npm run start:dev

# 7. Open the interactive API explorer
open http://localhost:3000/api/docs
```

---

## 🧪 Testing

We test at two levels:

```
UNIT TESTS (fast — run in milliseconds)
  • Test individual service methods in isolation
  • Database is mocked (replaced with fake responses)
  • Test: "given this input, does the service do the right thing?"
  • Example: "if email already exists, does register() throw DuplicateEmailException?"

  Run: npm test

INTEGRATION / E2E TESTS (slower — use real database)
  • Test full HTTP request flows
  • Real database is used (test database, wiped between runs)
  • Test: "does the full API work end to end?"
  • Example: "POST /auth/register → check DB → GET verification email → POST verify"

  Run: npm run test:e2e
```

---

## 🚦 Implementation Status

```
PHASE 0 — Foundation                             ████████████ 100% ✅
  ✅ Project setup (NestJS, TypeScript strict)
  ✅ Environment configuration (Zod validated)
  ✅ Database setup (Prisma + PostgreSQL schema)
  ✅ Logging (Winston structured logs)
  ✅ Standard response format
  ✅ Global error handling
  ✅ Authentication (register, login, JWT, refresh)
  ✅ Email verification flow
  ✅ Rate limiting
  ✅ Docker setup

PHASE 1 — Core Features                          ░░░░░░░░░░░░   0% 🔄
  🔄 Users module (profiles, discovery)           ← NEXT
  ⏳ KYC module (identity verification)
  ⏳ Ideas module (listings, uploads, review)
  ⏳ Subscriptions module (Stripe billing)

PHASE 2 — Growth Features                        ░░░░░░░░░░░░   0% ⏳
  ⏳ Investments module
  ⏳ Wallet module
  ⏳ Messaging module
  ⏳ Connections module
  ⏳ Watchlist module
  ⏳ Feed module
  ⏳ Notifications module
  ⏳ Founder dashboard module
  ⏳ Admin module

PHASE 3 — Scale & Polish                         ░░░░░░░░░░░░   0% ⏳
  ⏳ Real-time messaging (WebSocket)
  ⏳ Push notifications (Firebase)
  ⏳ Email sending (Resend)
  ⏳ SMS / 2FA (Twilio)
  ⏳ Background job queues (BullMQ)
  ⏳ Video processing pipeline
```

---

## 📐 Design Principles We Follow

### 1. Fail Fast
> If something is wrong (missing config, bad data), we catch it immediately — not quietly ignore it and cause a bug later.

### 2. Secure by Default
> All routes require authentication. Developers must explicitly mark a route as public. This prevents accidentally-open endpoints.

### 3. One Source of Truth
> Validation rules are written once (in Zod schemas) and both the TypeScript type AND the runtime validation are derived from them. No duplication.

### 4. Money Is Sacred
> All financial amounts are stored as exact decimal numbers. Never floating point (which can have rounding errors). All investment operations are wrapped in database transactions — all steps succeed or none do.

### 5. Privacy First
> Personal data (emails, phone numbers, names) is never written to log files. KYC documents are encrypted and never directly accessible from the internet.

### 6. Predictable Responses
> Every API response — success or failure — has the exact same shape. Client developers always know what to expect.

---

## ❓ Frequently Asked Questions

**Q: Why NestJS and not plain Express?**
NestJS provides structure (modules, dependency injection, decorators) that keeps a large codebase maintainable. It prevents the "pile of middleware" problem that Express projects often develop as they grow.

**Q: Why Prisma and not TypeORM or raw SQL?**
Prisma generates TypeScript types directly from the database schema. If you rename a column or remove a field, TypeScript will show compile errors everywhere that field is used — before the code ever runs. TypeORM's type system is weaker. Raw SQL is powerful but requires manual type management.

**Q: Why Zod and not class-validator?**
With class-validator, you define validation rules as decorators on a class, and separately define the TypeScript type. These can drift apart. With Zod, you write the schema once and the TypeScript type is automatically derived from it — guaranteed to be in sync.

**Q: Why a modular monolith instead of microservices?**
Microservices require much more infrastructure (service discovery, inter-service communication, distributed tracing). For a product that's still growing, a modular monolith ships faster and has fewer failure points. The code is organized in clean modules so individual sections can be extracted into separate services later if scale demands it.

**Q: How does the app scale when we have more users?**
- More API instances can run in parallel (they're stateless — no server-side sessions)
- Redis handles shared state between instances (sessions, rate limits, cache)
- PostgreSQL scales with read replicas for heavy read loads
- File uploads go directly to S3 (not through our API server)
- Background jobs run in separate worker processes

---

## 📞 Key Contacts & Resources

| Resource | Location |
|----------|----------|
| Interactive API Explorer | `http://localhost:3000/api/docs` (dev) |
| Database Schema | `prisma/schema.prisma` |
| Environment Variables | `.env.example` |
| Implementation Handoff | `docs/HANDOFF.md` |
| Architecture Analysis | `docs/ARCHITECTURE_ANALYSIS.pdf` |
| Architecture Analysis (MD) | `docs/ARCHITECTURE_ANALYSIS.md` |
