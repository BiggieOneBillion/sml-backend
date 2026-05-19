# SML Stock Market — Backend Implementation Handoff
> **For AI Agents & Engineers:** This document is the single source of truth for continuing backend development. Read it completely before writing any code. Every decision made is recorded here with its rationale.

---

## 🧭 Quick Orientation

| Item | Value |
|------|-------|
| **Project** | SML Stock Market Backend API |
| **Stack** | NestJS · TypeScript (strict) · PostgreSQL · Prisma · Zod · Docker |
| **Architecture** | Modular Monolith → Domain-Driven Design |
| **Current Phase** | Phase 0 Complete — Infrastructure & Auth Foundation |
| **Next Task** | Users Module (profiles, interests, discovery) |
| **Source of Requirements** | `/docs/PROJECT_OVERVIEW.md` (read this too) |

---

## 📁 Project File Tree (Current State)

```
sml-backend/
│
├── docs/
│   ├── HANDOFF.md                          ← YOU ARE HERE
│   └── PROJECT_OVERVIEW.md                 ← Non-technical overview + diagrams
│
├── prisma/
│   └── schema.prisma                       ← Complete domain model (20 entities, all enums)
│
├── src/
│   ├── main.ts                             ← Bootstrap: Helmet, CORS, Swagger, shutdown hooks
│   ├── app.module.ts                       ← Root module: global guards, interceptors, filters
│   │
│   ├── config/
│   │   ├── env.validation.ts               ← Zod schema for ALL env vars (fail-fast validation)
│   │   ├── app-config.service.ts           ← Typed config wrapper (inject this, not ConfigService)
│   │   └── app-config.module.ts            ← @Global() — available everywhere without import
│   │
│   ├── logger/
│   │   ├── logger.config.ts                ← Winston: JSON in prod, pretty in dev
│   │   └── app-logger.service.ts           ← Typed logger with PII-safe methods
│   │
│   ├── database/
│   │   ├── prisma.service.ts               ← PrismaClient wrapper, lifecycle hooks, slow-query log
│   │   └── database.module.ts              ← @Global() — PrismaService available everywhere
│   │
│   ├── common/
│   │   ├── types/
│   │   │   └── api-response.types.ts       ← ApiSuccessResponse, ApiErrorResponse, ResponseBuilder
│   │   ├── exceptions/
│   │   │   └── app.exceptions.ts           ← All typed business exceptions (DuplicateEmail, etc.)
│   │   ├── filters/
│   │   │   └── global-exception.filter.ts  ← Catches ALL exceptions → standard error envelope
│   │   ├── interceptors/
│   │   │   ├── request-logging.interceptor.ts  ← Attaches X-Request-ID, logs timing
│   │   │   └── transform.interceptor.ts        ← Wraps returns in { success: true, data }
│   │   ├── pipes/
│   │   │   └── zod-validation.pipe.ts      ← Validates request body against Zod schemas
│   │   └── utils/
│   │       └── helpers.ts                  ← maskEmail, generateSlug, toPrismaPage, decimalToNumber
│   │
│   └── modules/
│       └── auth/
│           ├── auth.service.ts             ← Register, login, refresh, logout, email verify
│           ├── auth.controller.ts          ← POST /auth/* endpoints with rate limiting
│           ├── auth.module.ts              ← Wires JWT, Passport, AuthService
│           ├── auth.service.spec.ts        ← Unit tests (register, login, resend flows)
│           ├── dto/
│           │   ├── auth.dto.ts             ← Zod schemas + inferred TypeScript types
│           │   └── zod-dto.helper.ts       ← createZodDto() factory (Zod ↔ NestJS bridge)
│           ├── strategies/
│           │   └── jwt-access.strategy.ts  ← Passport JWT strategy, JwtPayload type
│           ├── guards/
│           │   └── jwt-auth.guard.ts       ← Global guard: secure-by-default, @Public() opt-out
│           └── decorators/
│               ├── public.decorator.ts     ← @Public() — marks route as unauthenticated
│               └── current-user.decorator.ts ← @CurrentUser() — typed user from request
│
├── Dockerfile                              ← Multi-stage: builder → production (non-root user)
├── docker-compose.yml                      ← Postgres 16 + Redis 7 + Adminer + Redis Commander
├── .env.example                            ← Every env var documented with descriptions
├── tsconfig.json                           ← Strict mode, path aliases (@common/*, @modules/*)
└── package.json                            ← Scripts: start:dev, db:migrate, test, db:studio
```

---

## ✅ Completed Work

### Phase 0: Infrastructure & Foundation

#### 1. Environment Configuration (`src/config/`)
- **What:** Zod schema validates ALL environment variables at startup. App crashes immediately with a clear error if any required variable is missing or wrong-typed.
- **Pattern:** `AppConfigService` is the only way to access config in the codebase. Never inject raw `ConfigService<Record<string,unknown>>`.
- **Key rule:** Every new env var must be added to `env.validation.ts` first, then exposed via a getter in `AppConfigService`.

#### 2. Logging (`src/logger/`)
- **What:** Winston logger. JSON format in production (for Datadog/CloudWatch ingestion), colorized pretty-print in development.
- **Pattern:** Inject `AppLogger`, call `this.logger.setContext('ServiceName')` in constructor, then use `this.logger.log/warn/error`.
- **PII rule:** NEVER log raw emails, phone numbers, or names. Use `maskEmail()` and `maskPhone()` from `helpers.ts`.

#### 3. Database (`src/database/`, `prisma/schema.prisma`)
- **What:** Complete Prisma schema with all 20 entities matching the architecture analysis. PrismaService extends PrismaClient with lifecycle hooks.
- **Pattern:** Use `prisma.runTransaction(async (tx) => { ... })` for any operation that touches multiple tables atomically. Never use `this.prisma.$transaction` directly in services.
- **Key rule:** All monetary amounts use `Decimal` type in Prisma (`@db.Decimal(14, 2)`). Never use `Float`. When returning amounts to the client, use `decimalToNumber()` from helpers.

#### 4. Standard Response Format (`src/common/`)
- **Success:** `{ success: true, data: T, meta?: PaginationMeta | CursorMeta }`
- **Error:** `{ success: false, error: { code: string, message: string, details?: [], requestId: string } }`
- **Pattern:** Controllers return plain objects. `TransformInterceptor` wraps them automatically. For paginated responses, use `ResponseBuilder.paginated(data, { page, limit, total })`.

#### 5. Exception Handling (`src/common/exceptions/`)
- **What:** Typed exception classes with machine-readable error codes.
- **Pattern:** Throw the most specific exception available. Add new exceptions to `app.exceptions.ts`. Never throw generic `Error` from business logic.
- **`GlobalExceptionFilter`** catches everything and maps to standard error envelope. 4xx → `warn` log. 5xx → `error` log with stack. Production: internal details hidden from client.

#### 6. Authentication (`src/modules/auth/`)
- **What:** Full JWT auth with access + refresh token rotation, email verification, bcrypt password hashing, timing-attack prevention.
- **Access token:** RS256 (asymmetric), 15-minute TTL. Payload: `{ sub: userId, email, status }`.
- **Refresh token:** Stored as bcrypt hash in DB (never raw). 30-day TTL. Rotated on every use. Token reuse → all tokens revoked.
- **Guard:** `JwtAuthGuard` applied globally in `app.module.ts`. All routes are protected by default. Use `@Public()` to opt out.
- **Rate limiting:** Auth routes use `@Throttle({ default: { limit: 5, ttl: 60_000 } })`. General API: 100 req/min via global `ThrottlerGuard`.
- **Security:** Constant-time bcrypt comparison even for non-existent users (prevents email enumeration via timing).

---

## 🚧 What Is NOT Done Yet

Everything below needs to be built. Work through phases in order.

---

## 📋 Implementation Phases

### Phase 1: Core Features (Build Next)

#### Module 1.1 — Users Module ← **START HERE**

**What it covers:**
- Own profile CRUD (`GET/PATCH /users/me/profile`)
- Interests management (`PUT /users/me/interests`)
- Notification preferences (`PUT /users/me/notification-preferences`)
- Security settings (`PATCH /users/me/security`) — toggle 2FA
- Public user discovery (`GET /users`, `GET /users/:id`) — Strategic Partners page
- Avatar upload flow (pre-signed S3 URL)
- Role/path preference (`PATCH /users/me/role-preference`)

**Files to create:**
```
src/modules/users/
  users.module.ts
  users.service.ts
  users.controller.ts
  users.service.spec.ts
  dto/
    update-profile.dto.ts       ← Zod: fullName, bio≤150, occupation, industry, location, etc.
    update-interests.dto.ts     ← Zod: interests[] (Industry enum array, min 1)
    update-preferences.dto.ts   ← Zod: notificationTypes, deliveryMethod
    update-security.dto.ts      ← Zod: twoFaEnabled, twoFaMethod
    query-users.dto.ts          ← Zod: role?, industry?, country?, q?, page, limit
  types/
    user-profile.types.ts       ← UserProfileResponse, PublicUserResponse
```

**Key business rules:**
- Bio max 150 characters (enforced in Zod schema AND DB constraint)
- Email cannot be changed via profile update (separate, gated flow — not in MVP)
- Avatar: generate S3 pre-signed PUT URL, client uploads directly, client sends back the final URL
- `GET /users` returns paginated results. Free users see basic info. Premium users see more detail.
- `GET /users/:id` — if requesting own profile, redirect to full detail; other users get public view

**DB entities touched:** `User`, `UserProfile`, `UserInterest`, `DeviceToken`

---

#### Module 1.2 — KYC Module

**What it covers:**
- Personal info submission (`POST /kyc/submit`)
- Document upload (pre-signed S3 URL flow, private bucket)
- Status polling (`GET /kyc/status`)
- Admin review endpoints (`POST /admin/kyc/:id/verify`, `POST /admin/kyc/:id/reject`)

**Files to create:**
```
src/modules/kyc/
  kyc.module.ts
  kyc.service.ts
  kyc.controller.ts
  dto/
    submit-kyc.dto.ts           ← fullLegalName, countryOfResidence, DOB, nationality, phone
    upload-document.dto.ts      ← fileType (ID_FRONT | ADDRESS_PROOF), fileName, fileSizeBytes
  types/
    kyc.types.ts
```

**Key business rules:**
- Documents go to PRIVATE S3 bucket. Never generate public URLs for KYC docs.
- Pre-signed URL expires in 15 minutes.
- After upload: client calls `POST /kyc/documents/confirm` with the S3 key to register in DB.
- Status transitions: `NOT_STARTED → SUBMITTED → UNDER_REVIEW → VERIFIED | REJECTED`
- Only VERIFIED KYC users can invest. Gate in Investment module, not here.
- Audit log entry for every status change.

**DB entities touched:** `KycVerification`, `AuditLog`

---

#### Module 1.3 — Ideas Module

**What it covers:**
- Create/update draft idea (`POST /ideas`, `PATCH /ideas/:id`)
- File uploads (business plan PDF, pitch deck PDF, pitch video)
- Set funding goal
- Pay listing fee ($8)
- Idea listing/discovery (`GET /ideas`)
- Idea detail (gated by subscription)
- Review status tracking
- Admin: approve/reject

**Files to create:**
```
src/modules/ideas/
  ideas.module.ts
  ideas.service.ts
  ideas.controller.ts
  ideas.service.spec.ts
  dto/
    create-idea.dto.ts
    update-idea.dto.ts
    set-funding-goal.dto.ts
    query-ideas.dto.ts          ← category?, stage?, q?, page, limit, sort
    upload-file.dto.ts
  types/
    idea.types.ts               ← IdeaSummaryResponse (free), IdeaDetailResponse (premium)
```

**Key business rules:**
- Slug generated from title via `generateSlug()` — must be unique.
- Pitch video is REQUIRED before listing fee payment can proceed.
- Listing fee payment (`POST /ideas/:id/listing-fee/initiate`) → creates Stripe PaymentIntent → client confirms → Stripe webhook `payment_intent.succeeded` → idea moves to `SUBMITTED`.
- Free users: `GET /ideas/:slug` returns `{ title, tagline, stage, category, fundingProgress, investorCount }`.
- Premium investors: full detail + time-limited pre-signed URLs for documents.
- View count incremented asynchronously (do not block the response — use `setImmediate` or a queue).
- `raised_amount` is a denormalized field. Only updated via the Investment module's transaction.

**DB entities touched:** `Idea`, `IdeaFile`, `IdeaMilestone`, `ListingPayment`, `AuditLog`

---

#### Module 1.4 — Subscriptions Module

**What it covers:**
- Get available plans (`GET /subscriptions/plans`)
- Subscribe as investor (`POST /subscriptions/investor/subscribe`)
- Current subscription status (`GET /subscriptions/current`)
- Cancel subscription (`DELETE /subscriptions/current`)
- Stripe webhook handler (`POST /webhooks/stripe`)

**Files to create:**
```
src/modules/subscriptions/
  subscriptions.module.ts
  subscriptions.service.ts
  subscriptions.controller.ts
  stripe-webhook.controller.ts  ← Separate controller, raw body required
  dto/
    subscribe.dto.ts
  types/
    subscription.types.ts
```

**Key business rules:**
- Stripe webhook handler MUST use raw body (`express.raw({ type: 'application/json' })`). Do NOT use global JSON body parser for this route.
- Idempotency: check `stripeSubscriptionId` before processing webhook — Stripe can deliver same event multiple times.
- On `customer.subscription.deleted` → set status to `CANCELLED`, revoke premium access immediately.
- On `invoice.payment_failed` → set status to `PAST_DUE`, send notification to user.
- 7-day money-back: `DELETE /subscriptions/current` within 7 days of creation → issue Stripe refund.

**DB entities touched:** `Subscription`, `AuditLog`

---

### Phase 2: Growth Features

#### Module 2.1 — Investments Module
- `POST /investments/initiate` — choose amount, payment method
- `POST /investments/confirm` — agree to terms, process payment
- `GET /investments` — investor's portfolio
- `GET /investments/:id/tracking` — single investment detail
- **Critical:** Use `prisma.runTransaction` with `SELECT FOR UPDATE` on `ideas` row to prevent race conditions on `raised_amount`
- Idempotency key: generated as `inv-{investorId}-{ideaId}-{minuteBucket}`
- Minimum investment: $1,000 (server-enforced, not just client-side)

#### Module 2.2 — Wallet Module
- `GET /wallet/balance`
- `POST /wallet/top-up` — initiates Stripe PaymentIntent
- `GET /wallet/transactions` — paginated ledger

#### Module 2.3 — Messaging Module
- `GET /messages/threads` — list conversations
- `GET /messages/threads/:id` — thread with messages (cursor pagination)
- `POST /messages/threads` — start new conversation
- `POST /messages/threads/:id/messages` — send message
- Gate: investors can only message founders of ideas they've viewed or invested in (premium feature)
- Real-time: Add Socket.io in Phase 3

#### Module 2.4 — Connections Module
- `POST /connections/request`
- `PATCH /connections/:id` — accept / decline
- `GET /connections` — list connections

#### Module 2.5 — Watchlist Module
- `GET /watchlist` — paginated, filterable by type
- `POST /watchlist` — save idea or user
- `DELETE /watchlist/:id`
- `PUT /watchlist/:id/alerts` — toggle alerts

#### Module 2.6 — Feed Module
- `GET /feed` — personalized (tabs: for_you, ideas, funding_updates, insights)
- `POST /posts` — create typed post
- `POST /posts/:id/like` / `DELETE /posts/:id/like`
- `POST /posts/:id/comments`
- Feed algorithm: filter by user interests + connections. Start simple (most recent matching interests), optimize later.

#### Module 2.7 — Notifications Module
- `GET /notifications` — paginated with unread filter
- `PUT /notifications/:id/read`
- `PUT /notifications/read-all`
- `PUT /users/me/notification-preferences` — update delivery preferences
- `POST /users/me/device-tokens` — register FCM/APNs token

#### Module 2.8 — Founder Dashboard Module
- `GET /founder/dashboard/:ideaId`
- `GET /founder/ideas/:id/analytics`
- `POST /founder/ideas/:id/updates`
- `PATCH /founder/ideas/:id/milestones/:milestoneId`

#### Module 2.9 — Admin Module
- `GET /admin/review-queue` — pending ideas
- `POST /admin/ideas/:id/approve`
- `POST /admin/ideas/:id/reject`
- `GET /admin/kyc-queue`
- `POST /admin/kyc/:id/verify`
- `POST /admin/kyc/:id/reject`
- Requires separate `AdminGuard` — check user has admin role (add `isAdmin` field to User or use a separate `AdminUser` table)

### Phase 3: Scale & Polish
- Real-time messaging (Socket.io + Redis adapter)
- Server-Sent Events for notification badge counts
- BullMQ job queues: email worker, push notification worker, view-count batch worker
- Email sending (Resend integration)
- Push notifications (Firebase Admin SDK)
- SMS / 2FA (Twilio Verify integration)
- Video transcoding webhook (Mux or AWS MediaConvert)
- Full-text search optimization
- Multi-currency support

---

## 🏗️ Architecture Patterns (Mandatory)

Every new module MUST follow these patterns exactly.

### Pattern 1: Module Structure

```typescript
// Every module follows this exact shape
@Module({
  imports: [],                  // Only import what this module needs
  controllers: [XController],
  providers: [XService, AppLogger],
  exports: [XService],          // Export service if other modules need it
})
export class XModule {}
```

### Pattern 2: Service Structure

```typescript
@Injectable()
export class XService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(XService.name);
  }

  async doSomething(dto: SomeDto, userId: string): Promise<SomeResult> {
    // 1. Validate business rules (throw typed exceptions)
    // 2. Query DB
    // 3. Transform result
    // 4. Log meaningful events (with masked PII)
    // 5. Return plain object (interceptor wraps it)
  }
}
```

### Pattern 3: Controller Structure

```typescript
@ApiTags('ModuleName')
@Controller('resource')
export class XController {
  constructor(private readonly service: XService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '...' })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryDto,        // validated by ZodValidationPipe
  ) {
    return this.service.list(user.sub, query);
    // TransformInterceptor wraps this in { success: true, data: ... }
  }
}
```

### Pattern 4: DTO / Validation

```typescript
// Always define schema first, derive type from it
export const UpdateProfileSchema = z.object({
  bio: z.string().max(150).optional(),
  industry: z.nativeEnum(Industry).optional(),
  // ... other fields
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

// In controller: @UsePipes(new ZodValidationPipe(UpdateProfileSchema))
```

### Pattern 5: Database Queries

```typescript
// GOOD — explicit field selection (never select passwordHash accidentally)
const user = await this.prisma.user.findUnique({
  where: { id: userId, deletedAt: null },
  select: { id: true, email: true, fullName: true, status: true },
});

// GOOD — atomic transaction for multi-table operations
await this.prisma.runTransaction(async (tx) => {
  await tx.investment.create({ ... });
  await tx.idea.update({
    where: { id: ideaId },
    data: {
      raisedAmount: { increment: amount },
      investorCount: { increment: 1 },
    },
  });
});

// BAD — never do this (selects all fields including sensitive ones)
const user = await this.prisma.user.findUnique({ where: { id: userId } });
```

### Pattern 6: Error Handling

```typescript
// GOOD — specific typed exception
throw new ResourceNotFoundException('Idea', ideaId);
throw new BusinessRuleException('IDEA_NOT_LIVE', 'This idea is not accepting investments');
throw new SubscriptionRequiredException('view full idea details');

// BAD — generic errors
throw new Error('Something went wrong');
throw new HttpException('Not found', 404);
```

### Pattern 7: Pagination

```typescript
// Offset pagination (management lists, partners page)
const { skip, take } = toPrismaPage({ page: dto.page, limit: dto.limit });
const [items, total] = await Promise.all([
  this.prisma.idea.findMany({ skip, take, where, orderBy }),
  this.prisma.idea.count({ where }),
]);
return ResponseBuilder.paginated(items, { page: dto.page, limit: dto.limit, total });

// Cursor pagination (feeds — use for infinite scroll)
const items = await this.prisma.post.findMany({
  take: limit + 1,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' },
});
const hasMore = items.length > limit;
const nextCursor = hasMore ? items[limit - 1].id : null;
return ResponseBuilder.cursor(items.slice(0, limit), { nextCursor, hasMore });
```

---

## 🔐 Security Rules (Non-Negotiable)

1. **Passwords:** bcrypt with `config.security.bcryptRounds` (10 in dev, 12 in prod). Never log.
2. **JWT secrets:** Minimum 32 characters. Loaded from `AppConfigService`. Never hardcode.
3. **KYC documents:** Private S3 bucket ONLY. Never generate public URLs. Admin access via time-limited pre-signed URLs generated server-side.
4. **Monetary amounts:** `Decimal` in DB, `decimalToNumber()` for responses, validate as `z.number().min(1000)` for investments.
5. **Idempotency:** Every investment initiation requires a unique idempotency key. Stripe calls require idempotency keys.
6. **Soft deletes:** Always filter `deletedAt: null` in queries for user-facing endpoints.
7. **Field selection:** Always use `select: {}` in Prisma queries. Never accidentally return `passwordHash`, `twoFaSecret`, `tokenHash`.
8. **Rate limiting:** Auth endpoints: 5 req/min. General: 100 req/min. Apply `@Throttle` decorator for stricter routes.
9. **Audit logs:** Every financial event, auth event, and admin action must create an `AuditLog` record.

---

## 🗄️ Database Quick Reference

### Entity Status Machines

```
User:       PENDING_VERIFICATION → ACTIVE → SUSPENDED | DELETED
KYC:        NOT_STARTED → SUBMITTED → UNDER_REVIEW → VERIFIED | REJECTED
Idea:       DRAFT → SUBMITTED → UNDER_REVIEW → VERIFIED → APPROVED → LIVE | REJECTED | CLOSED
Investment: PENDING → PROCESSING → COMPLETED | FAILED | REFUNDED
Listing:    PENDING → COMPLETED | FAILED
Subscription: TRIALING → ACTIVE → PAST_DUE → CANCELLED
Connection: PENDING → ACCEPTED | DECLINED | BLOCKED
```

### Critical Indexes Already in Schema

- `users.email` — UNIQUE (login lookup)
- `ideas.slug` — UNIQUE (URL routing)
- `ideas.status + publishedAt DESC` — partial index for live idea listing
- `investments.idempotency_key` — UNIQUE (prevent double-charge)
- `investments.investor_id` — portfolio queries
- `notifications.user_id` — unread badge count
- `messages.thread_id + created_at DESC` — chat history

### Decimal Fields (NEVER use Float)

```
ideas.funding_goal, raised_amount, listing_fee_amount
investments.amount, platform_fee_amount, net_amount, current_value
wallet.balance
wallet_transactions.amount, balance_after
listing_payments.amount
```

---

## 🧪 Testing Conventions

```typescript
// Unit tests: mock PrismaService, test service business logic
// File: *.service.spec.ts (co-located with service)

// E2E tests: test full HTTP flow with real DB (test DB, auto-seeded)
// File: test/*.e2e-spec.ts

// Mock pattern (see auth.service.spec.ts for reference):
const mockPrismaService = {
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  runTransaction: jest.fn().mockImplementation((fn) => fn(mockPrismaService)),
};
```

**Coverage requirements:**
- All service methods must have unit tests
- All happy paths tested
- All exception paths tested
- No tests for controllers (logic is in services; controllers just wire)

---

## 🌐 API Conventions

**Base URL:** `http://localhost:3000/api/v1/`

**Auth header:** `Authorization: Bearer <accessToken>`

**Request ID:** Every response has `X-Request-ID` header for tracing.

**Response envelope (always):**
```json
// Success
{ "success": true, "data": { ... }, "meta": { "page": 1, "total": 50 } }

// Error
{ "success": false, "error": { "code": "RESOURCE_NOT_FOUND", "message": "...", "requestId": "uuid" } }
```

**Swagger UI:** `http://localhost:3000/api/docs` (dev/staging only)

---

## ⚙️ Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment name |
| `PORT` | No | `3000` | HTTP port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | **Yes** | — | Min 32 chars |
| `JWT_REFRESH_SECRET` | **Yes** | — | Min 32 chars, different from access |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | No | `30d` | Refresh token TTL |
| `REDIS_HOST` | No | `localhost` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `STRIPE_SECRET_KEY` | **Yes** | — | Starts with `sk_` |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | — | Starts with `whsec_` |
| `STRIPE_INVESTOR_PRICE_ID` | **Yes** | — | Stripe price ID for $19/month |
| `BCRYPT_ROUNDS` | No | `12` | 10 in dev, 12 in prod |
| `COOKIE_SECRET` | **Yes** | — | Min 32 chars |

Full list in `.env.example`.

---

## 🚀 Running the Project

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env.local
# Edit .env.local — minimum: DATABASE_URL, JWT secrets, COOKIE_SECRET, STRIPE keys

# Start infrastructure (PostgreSQL + Redis)
docker compose up postgres redis -d

# Run migrations (creates all tables from prisma/schema.prisma)
npm run db:migrate

# Start in development mode (hot reload)
npm run start:dev

# Run tests
npm test

# Open Swagger
open http://localhost:3000/api/docs

# Open database GUI (optional)
npm run db:studio
```

---

## 📦 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/core` | ^10 | Framework |
| `@nestjs/jwt` | ^10 | JWT signing/verification |
| `@nestjs/passport` | ^10 | Auth strategy abstraction |
| `@nestjs/throttler` | ^5 | Rate limiting |
| `@nestjs/swagger` | ^7 | OpenAPI docs |
| `@prisma/client` | ^5 | Type-safe DB client |
| `prisma` | ^5 | Schema + migrations CLI |
| `zod` | ^3 | Runtime validation + type inference |
| `bcrypt` | ^5 | Password hashing |
| `winston` | ^3 | Structured logging |
| `nest-winston` | ^1 | NestJS ↔ Winston bridge |
| `helmet` | ^7 | Security headers |
| `compression` | ^1 | gzip responses |
| `uuid` | ^9 | UUID generation |
| `passport-jwt` | ^4 | JWT Passport strategy |

---

## 🔄 How to Add a New Module (Checklist)

When building any module from Phase 1 or 2, follow this exact sequence:

- [ ] Create `src/modules/<name>/` directory
- [ ] Write Zod schemas in `dto/<name>.dto.ts` — types inferred automatically
- [ ] Write `<name>.service.ts` — all business logic, inject PrismaService + AppLogger
- [ ] Write `<name>.service.spec.ts` — mock PrismaService, test all methods
- [ ] Write `<name>.controller.ts` — thin, just call service, use `@CurrentUser()`, `@ZodValidationPipe`
- [ ] Write `<name>.module.ts` — wire everything
- [ ] Add module to `app.module.ts` imports array
- [ ] Add new endpoints to this document under "Completed Work"
- [ ] Verify `npx tsc --noEmit` passes with zero errors

---

## ⚠️ Known Issues & Workarounds

### Prisma Client Not Generated
The Prisma client (`node_modules/.prisma/client`) must be generated before TypeScript compilation works. In this sandbox environment, `prisma generate` requires network access to fetch the query engine binary.

**Fix in your environment:**
```bash
npm install          # installs prisma CLI
npx prisma generate  # downloads engine + generates client types
npx tsc --noEmit     # should now pass
```

### Auth Module JWT `signOptions.expiresIn` Type Error
The `@nestjs/jwt` package's `JwtSignOptions.expiresIn` type requires `StringValue` from the `ms` library, not plain `string`. When you fix after Prisma generate:

In `auth.module.ts`, import from `ms`:
```typescript
import type { StringValue } from 'ms';
signOptions: { expiresIn: config.jwt.accessExpiresIn as StringValue }
```

Or pass the duration in milliseconds as a `number`.

---

## 📝 Decision Log

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| NestJS over Express | DI, modules, decorators — scales to team size | Fastify (faster but less ecosystem) |
| Zod over class-validator | Single source of truth for type + validation | class-validator (requires duplicate decorators) |
| Prisma over TypeORM | Type safety, migration tooling, readability | TypeORM (more complex, weaker types) |
| Modular Monolith | Ship fast, extract to microservices when scale demands | Microservices (too early, overkill) |
| bcrypt over argon2 | Wider compatibility, battle-tested | argon2 (slightly stronger, less portable) |
| Refresh token rotation | Detect token theft — reuse → revoke all | Non-rotating (less secure) |
| `@Global()` for DB + Config | Both needed everywhere — avoids repetitive imports | Import per module (unnecessary boilerplate) |
| Decimal for money | No floating-point rounding errors | number/float (dangerous for financial data) |
| Soft deletes via `deletedAt` | GDPR compliance, data recovery, audit trails | Hard deletes (irreversible, risky) |
| Cursor pagination for feeds | Consistent results during concurrent inserts | Offset (page drift on concurrent writes) |
