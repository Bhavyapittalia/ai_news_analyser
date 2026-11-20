# AI News Analyzer: Backend Roadmap

This document is the plan for building the **backend first** (frontend comes later). It does two things:

1. Explains **why every folder and file exists** and **how it works**, so both of us understand the design and not just the code.
2. Gives a **step-by-step task list** that two people can work on at the same time.

> Stack: Node.js + TypeScript (strict) + Fastify + PostgreSQL + Prisma + Gemini (`@google/genai`) + zod

---

## Table of Contents

1. [What the backend must do](#1-what-the-backend-must-do)
2. [Architecture in one picture](#2-architecture-in-one-picture)
3. [The layered pattern we follow](#3-the-layered-pattern-we-follow)
4. [Folder and file guide (the "why" and "how")](#4-folder-and-file-guide)
5. [TypeScript things you will notice](#5-typescript-things-you-will-notice)
6. [Roadmap: phases and tasks for two people](#6-roadmap-phases-and-tasks)
7. [How we avoid blocking each other](#7-how-we-avoid-blocking-each-other)
8. [Testing each phase by hand](#8-testing-each-phase-by-hand)
9. [Definition of done and Git rules](#9-definition-of-done-and-git-rules)

---

## 1. What the backend must do

The backend is a **pipeline plus an API**:

| Stage | Job | Output |
|---|---|---|
| Ingest | Fetch news from 3-5 providers every few minutes | `Article` rows |
| Dedupe and cluster | Merge the same event from many sources | `Story` rows |
| Analyse | Ask AI for the X-factor, edge cases, scenarios, confidence | `Analysis` + `Scenario` rows |
| Cross-check | Flag single-sourced or conflicting stories | `Story.consistency` |
| Alert | Notify when impact and confidence are both high | `Alert` rows + push |
| Backtest | Compare predictions with real price moves | `Outcome` rows + stats |
| Serve | Expose all of it through REST (and SSE for live alerts) | JSON for the future frontend |

If you can explain this table, you understand the whole backend.

---

## 2. Architecture in one picture

```
                        ┌─────────────────────────────┐
   cron schedule ─────► │  jobs/ (ingest, analyze,    │
                        │         outcome)            │
                        └──────────────┬──────────────┘
                                       │ calls
        ┌──────────────────────────────▼───────────────────────────────┐
        │                      modules/ (services)                     │
        │                                                              │
        │  sources ─► articles ─► stories ─► analysis ─► alerts        │
        │     │                                  │            │        │
        │  (adapters)                        (Gemini)     (notifier)   │
        │                                                              │
        │                    backtest ◄── market data                  │
        └──────────────────────────────┬───────────────────────────────┘
                                       │ reads/writes via repositories
                                       ▼
                               PostgreSQL (Prisma)
                                       ▲
                                       │
   HTTP request ─► routes ─► controller ─► service ─► repository
   (future React app / curl / Postman)
```

Two entry points feed the same services:

- **Jobs** (time-driven): run the pipeline in the background.
- **Routes** (request-driven): let a client read the results.

Both reuse the same service code, so we never write logic twice.

---

## 3. The layered pattern we follow

Every feature module is split in the same four layers:

```
route  ──►  controller  ──►  service  ──►  repository  ──►  DB
(URL)      (HTTP in/out)    (business      (database
                             logic)         queries only)
```

| Layer | Knows about | Must NOT know about | Why this split |
|---|---|---|---|
| **Route** | URL, HTTP method, validation schema | Business rules | One place to see every endpoint |
| **Controller** | `request` and `reply` | Prisma, Gemini | Translates HTTP to a function call and back |
| **Service** | Business rules, other services | HTTP, SQL | Reusable by routes **and** cron jobs; easy to unit test |
| **Repository** | Prisma queries | HTTP, business rules | If we change DB or query style, only this file changes |

Rule of thumb: **a cron job never calls a controller; it calls a service.** That is the whole reason services exist.

---

## 4. Folder and file guide

### 4.1 Final structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── main.ts
│   ├── app.ts
│   ├── config/
│   │   └── env.ts
│   ├── plugins/
│   │   ├── prisma.ts
│   │   ├── error-handler.ts
│   │   ├── security.ts
│   │   └── sse.ts
│   ├── lib/
│   │   ├── errors.ts
│   │   ├── hash.ts
│   │   └── text.ts
│   ├── types/
│   │   └── fastify.d.ts
│   ├── modules/
│   │   ├── health/
│   │   ├── sources/
│   │   ├── articles/
│   │   ├── stories/
│   │   ├── analysis/
│   │   ├── alerts/
│   │   ├── backtest/
│   │   └── settings/
│   └── jobs/
│       ├── scheduler.ts
│       ├── ingest.job.ts
│       ├── analyze.job.ts
│       └── outcome.job.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

### 4.2 Entry and app setup

#### `src/main.ts`: the on/off switch
- **Why:** The only file that actually starts the server. It stays tiny on purpose.
- **How:** Builds the app with `buildApp()`, starts the scheduler, calls `app.listen({ port })`, and handles shutdown signals (`SIGINT`, `SIGTERM`) so DB connections close cleanly.

```ts
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { startScheduler } from './jobs/scheduler.js';

const app = await buildApp();
startScheduler(app);
await app.listen({ port: env.PORT, host: '0.0.0.0' });
```

#### `src/app.ts`: the factory that assembles Fastify
- **Why:** If `main.ts` created and started the server in one go, we could never test it without opening a real port. Splitting "build" from "start" lets tests call `app.inject(...)` to send fake requests in memory.
- **How:** `buildApp()` creates the Fastify instance, registers plugins first (error handler, Prisma, security), then registers each module's routes with a URL prefix, and returns the app **without** listening.

```ts
export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(errorHandler);
  await app.register(prismaPlugin);
  await app.register(securityPlugin);
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(storiesRoutes, { prefix: '/stories' });
  // ...other modules
  return app;
}
```

> If your `main.ts` currently sits in the backend root, move it into `src/` and update the dev script to `tsx watch src/main.ts`.

### 4.3 `src/config/`

#### `env.ts`: one validated source of truth for environment variables
- **Why:** `process.env.X` is always `string | undefined` and a typo fails silently at 2 AM. We want the app to **refuse to start** if config is wrong, and we want typed values everywhere.
- **How:** A zod schema describes every variable. We parse `process.env` once at startup and export the typed result. Nobody else reads `process.env` directly.

```ts
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1),
  INGEST_INTERVAL_MINUTES: z.coerce.number().default(5),
  ALERT_MIN_IMPACT: z.coerce.number().default(70),
  ALERT_MIN_CONFIDENCE: z.coerce.number().default(60),
});

export const env = schema.parse(process.env);
```

`z.coerce.number()` is needed because env values are always strings.

### 4.4 `src/plugins/`

A Fastify **plugin** is a function that adds a capability to the app (a DB client, a hook, a header policy). Plugins keep `app.ts` clean and let each concern load once.

| File | Why it exists | How it works |
|---|---|---|
| `prisma.ts` | One shared DB connection for the whole app | Creates a single `PrismaClient`, attaches it as `app.prisma` using `app.decorate`, disconnects in the `onClose` hook |
| `error-handler.ts` | Every error returns the same JSON shape, and stack traces never leak | Uses `app.setErrorHandler` to map our `AppError`, zod errors and unknown errors to `{ error: { code, message } }` |
| `security.ts` | CORS, rate limit, security headers in one place | Registers `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit` with env-based config |
| `sse.ts` | Live alerts need a long-lived connection | Provides helpers to keep a set of open client connections and broadcast an event to all of them |

```ts
// src/plugins/prisma.ts
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

export default fp(async (app) => {
  const prisma = new PrismaClient();
  await prisma.$connect();
  app.decorate('prisma', prisma);
  app.addHook('onClose', async () => prisma.$disconnect());
});
```

> Why `fastify-plugin` (`fp`)? Fastify isolates plugins by default (encapsulation). Wrapping with `fp` makes `app.prisma` visible to every other plugin and route. Without it, `app.prisma` would exist only inside that one plugin.
>
> The Prisma import path depends on your Prisma version and generator settings. Use whatever your current setup already imports.

### 4.5 `src/types/fastify.d.ts`: teaching TypeScript about our decorators
- **Why:** `app.decorate('prisma', ...)` happens at runtime, so TypeScript has no idea `app.prisma` exists and would show an error.
- **How:** We "augment" Fastify's own interface so the compiler knows about our additions.

```ts
import type { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
```

### 4.6 `src/lib/`: small shared helpers with no framework dependency

| File | Why | How |
|---|---|---|
| `errors.ts` | Throw meaningful errors from anywhere | `AppError` class with `statusCode`, `code`, `message`; subclasses like `NotFoundError`, `ExternalServiceError` |
| `hash.ts` | Deduplicate articles cheaply | `sha256(normalizeUrl(url))` gives a fixed-length unique key we store as `urlHash` |
| `text.ts` | Clustering and AI prompts need clean text | Strip HTML, collapse whitespace, lowercase, remove stopwords, tokenise titles |

Rule: `lib/` must not import from `modules/`. If it needs to, it belongs in a module.

### 4.7 `prisma/`

| File | Why | How |
|---|---|---|
| `schema.prisma` | The single description of our database | Models (`Source`, `Article`, `Story`, `Analysis`, `Scenario`, `Alert`, `Outcome`, `Setting`) with relations and indexes. Prisma generates a fully typed client from it |
| `migrations/` | Version control for the database | Created by `prisma migrate dev`. Both of us apply the same migrations so our databases match. **Commit this folder** |
| `seed.ts` | Start with useful data | Inserts the list of news sources and default settings. Run with `npx prisma db seed` |

Key schema decisions (and the reason for each):

- `Article.urlHash` is **unique**: the database itself blocks duplicates, even if our code has a bug.
- `Article.storyId` is **nullable**: an article is saved first, then clustered later. This decouples ingestion from clustering.
- `Analysis` stores `model` and `promptVersion`: so backtesting can later answer "did prompt v3 beat v2?"
- `Scenario` is its own table linked to `Analysis`: one analysis has many instrument scenarios with probabilities.
- Index the columns we filter by (`publishedAt`, `storyId`, `createdAt`) so lists stay fast as data grows.

### 4.8 `src/modules/`: one folder per feature

Each module has the same shape. Not every module needs every file.

```
modules/<feature>/
├── <feature>.routes.ts       # URLs + schemas
├── <feature>.controller.ts   # HTTP in/out
├── <feature>.service.ts      # business logic
├── <feature>.repository.ts   # Prisma queries
└── <feature>.schema.ts       # zod schemas + inferred TS types
```

**Why by feature and not by type** (all controllers in one folder, all services in another)? When we work on "alerts" we want everything about alerts in one place, and two people editing different features will rarely touch the same files.

#### Worked example: how one request travels

```ts
// articles.routes.ts
export default async function articlesRoutes(app: FastifyInstance) {
  app.get('/', { schema: { querystring: listQuerySchema } }, articlesController.list);
}

// articles.controller.ts
export async function list(req: FastifyRequest, reply: FastifyReply) {
  const query = listQuerySchema.parse(req.query);
  const result = await createArticlesService(req.server).list(query);
  return reply.send(result);
}

// articles.service.ts
export function createArticlesService(app: FastifyInstance) {
  const repo = createArticlesRepository(app.prisma);
  return {
    async list({ page, limit }: ListQuery) {
      const [items, total] = await repo.findPage(page, limit);
      return { items, total, page, limit };
    },
  };
}

// articles.repository.ts
export function createArticlesRepository(prisma: PrismaClient) {
  return {
    findPage: (page: number, limit: number) =>
      Promise.all([
        prisma.article.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { publishedAt: 'desc' } }),
        prisma.article.count(),
      ]),
  };
}
```

Flow: `GET /articles?page=2` → route validates query → controller parses → service applies logic → repository hits DB → result travels back up.

#### Module by module

**`health/`**
- **Why:** Hosting platforms and uptime checkers need a cheap "are you alive?" URL.
- **How:** `GET /health` returns `{ status: 'ok' }`; a deeper check runs `SELECT 1` on the DB.

**`sources/`**: where news comes from
- **Why:** Every provider has a different format (RSS, JSON API). We hide those differences behind one interface so the rest of the code never cares where an article came from. Adding a new provider = adding one file.
- **Files:**
  - `source.adapter.ts`: the interface every provider must implement.
  - `rss.adapter.ts`: a reusable adapter for any RSS/Atom feed (most providers need only a URL).
  - `api.adapter.ts` / `<provider>.adapter.ts`: custom adapters for JSON APIs.
  - `sources.registry.ts`: reads active `Source` rows and returns the right adapter for each.
  - `sources.service.ts`, `sources.routes.ts`: list sources and toggle `isActive`.
- **How:**

```ts
export interface RawArticle {
  title: string;
  url: string;
  content: string;
  publishedAt: Date;
}

export interface NewsSourceAdapter {
  readonly sourceId: string;
  fetchLatest(): Promise<RawArticle[]>;
}
```

The ingest job loops over adapters. If one provider fails, the others still run (failure isolation).

**`articles/`**: raw news storage
- **Why:** We keep the original text so we can re-analyse later with a better prompt without re-fetching.
- **How:** `saveNew(rawArticles)` normalises the URL, computes `urlHash`, and inserts with "skip if exists". Returns only the newly inserted rows so the pipeline knows what is genuinely new.

**`stories/`**: turning many articles into one event
- **Why:** Five outlets reporting the same event should be **one** analysis, not five (cheaper, cleaner, and it enables the cross-source check).
- **Files:**
  - `clustering.ts`: decides whether a new article belongs to an existing story.
  - `consistency.ts`: sets `confirmed`, `single_source` or `conflicting`.
  - `stories.service.ts`, `stories.repository.ts`, `stories.routes.ts`, `stories.controller.ts`, `stories.schema.ts`.
- **How:**
  - **v1 clustering (simple, no AI):** normalise the title, tokenise, compare with titles from the last ~24 hours using Jaccard similarity. If similarity is above a threshold, attach to that story; otherwise create a new story.
  - **Later (v2):** use embeddings for better grouping.
  - **Consistency:** count distinct sources per story. One source means `single_source`. Several sources with contradicting claims (detected by the AI step) means `conflicting`.

**`analysis/`**: the brain
- **Why:** This is the product's core value, so it is isolated. Swapping Gemini for another model should only touch this folder.
- **Files:**
  - `gemini.client.ts`: the only file that imports `@google/genai`.
  - `prompts/v1.ts`, `v2.ts`, `v3.ts`: prompts are versioned like code.
  - `analysis.schema.ts`: zod schema for the AI's JSON output.
  - `analysis.service.ts`: `analyzeStory(story)`.
  - `analysis.repository.ts`, `analysis.routes.ts`, `analysis.controller.ts`.
- **How:**
  1. Build the prompt from the story's articles.
  2. Call Gemini and ask for **JSON only**.
  3. `JSON.parse` the reply and validate it with zod.
  4. If invalid, retry once with the error message appended; if still invalid, mark the story `analysis_failed` and move on.
  5. Save `Analysis` + `Scenario` rows with `model` and `promptVersion`.

```ts
// analysis.schema.ts
export const AnalysisOutputSchema = z.object({
  xFactor: z.string().min(1),
  primaryDirection: z.enum(['bullish', 'bearish', 'neutral']),
  impactScore: z.number().int().min(0).max(100),
  confidenceScore: z.number().int().min(0).max(100),
  edgeCases: z.array(z.string()).default([]),
  scenarios: z.array(z.object({
    instrument: z.string(),
    direction: z.enum(['bullish', 'bearish', 'neutral']),
    probability: z.number().min(0).max(1),
    reasoning: z.string(),
  })),
});
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;
```

```ts
// gemini.client.ts (shape of the call)
const res = await ai.models.generateContent({
  model: env.GEMINI_MODEL,
  contents: prompt,
  config: { responseMimeType: 'application/json' },
});
const parsed = AnalysisOutputSchema.safeParse(JSON.parse(res.text ?? '{}'));
```

Why validate when we already asked for JSON? **An AI model is an unreliable external system.** The schema is our safety net: bad output is caught here and never reaches the database.

**`alerts/`**
- **Why:** Not every analysis deserves a notification. Alerts are rare and valuable, so the rules are explicit.
- **Files:**
  - `alerts.rules.ts`: `shouldAlert(analysis, settings)` returns true when `impact >= minImpact && confidence >= minConfidence && consistency !== 'conflicting'`.
  - `alerts.service.ts`: de-duplicates (no second alert for the same story within N hours), stores the `Alert`, calls the notifier.
  - `notifier.ts` + `channels/telegram.ts` (or email/push): one function per delivery channel behind one interface.
  - `alerts.routes.ts`: `GET /alerts` history and `GET /alerts/stream` (SSE).
- **How:** After each new analysis the service evaluates the rules; if they pass it pushes to the SSE broadcaster and to the configured external channel.

**`backtest/`**
- **Why:** Without measuring real results, "confidence 80" is just a number we made up. Backtesting is how we earn trust.
- **Files:**
  - `market-data.client.ts`: fetches prices for tracked instruments.
  - `outcome.service.ts`: for each analysis older than a horizon (1h / 4h / 1d), compares price movement with the predicted direction and stores an `Outcome`.
  - `backtest.stats.ts`: hit-rate by instrument, by confidence bucket, by source.
  - `backtest.routes.ts`: `GET /backtest/summary`.
- **How:** The outcome job runs hourly, finds analyses that have "matured", and writes `wasCorrect`. Stats are simple SQL aggregates.

**`settings/`**
- **Why:** Alert thresholds and watched markets must be changeable without redeploying.
- **How:** A single settings row; `GET/PUT /settings` validated by zod; services read it at runtime.

### 4.9 `src/jobs/`: background work on a timer

| File | Why | How |
|---|---|---|
| `scheduler.ts` | One place that defines **what runs when** | Uses `node-cron` to register the jobs with intervals from `env` |
| `ingest.job.ts` | Keep news fresh | For each active source → `fetchLatest()` → `articles.saveNew()` → `stories.assign()` |
| `analyze.job.ts` | Analyse stories that have no analysis yet | Picks unanalysed stories, calls `analyzeStory()`, then `alerts.evaluate()` |
| `outcome.job.ts` | Feed the backtest | Calls `outcome.service` for matured analyses |

Job rules:
- A job is a thin wrapper: **all logic lives in services**.
- Use a simple "is running" flag so a slow run never overlaps the next tick.
- Catch and log errors inside the job so one failure never kills the process.

### 4.10 `tests/`

| Folder | Why | How |
|---|---|---|
| `unit/` | Fast checks of pure logic (clustering, rules, text helpers) | Vitest, no DB, no network |
| `integration/` | Check routes end to end | `buildApp()` + `app.inject()` against a test database |
| `fixtures/` | Stable sample data | ~10 saved real articles and sample AI JSON, so tests and AI prompt work never depend on live feeds |

### 4.11 Root files

| File | Why |
|---|---|
| `.env.example` | Documents every variable without secrets; new teammate copies it to `.env` |
| `tsconfig.json` | `strict: true`, ESM module settings. Strict mode is what makes TypeScript actually protect us |
| `package.json` scripts | `dev`, `build`, `start`, `typecheck`, `lint`, `test`, `db:migrate`, `db:seed` |
| `README.md` | How to run the backend in 10 minutes |

---

## 5. TypeScript things you will notice

These behave differently from plain Node.js and are worth understanding early.

1. **Types disappear at runtime.** TypeScript checks code **before** it runs, then erases the types. A type like `Article` cannot validate data coming from the internet or from Gemini. That is why we pair types with **zod**: zod validates at runtime, and `z.infer<typeof Schema>` gives the matching type for free, so we write the shape once.
2. **`.js` in imports.** In an ESM project we write `import { env } from './config/env.js'` even though the file is `env.ts`. TypeScript does not rewrite import paths, and Node needs the final `.js` name. Tools like `tsx` handle the rest.
3. **`import type`.** Use it for things that exist only as types (e.g. `import type { FastifyInstance } from 'fastify'`). It is erased completely and avoids accidental runtime imports.
4. **`strict` mode and `undefined`.** `process.env.X` and `res.text` can be `undefined`; the compiler forces us to handle that instead of crashing later.
5. **Module augmentation** (`fastify.d.ts`) is how we tell the compiler about things added at runtime.
6. **Avoid `any`.** Use `unknown` for untrusted data and narrow it with zod.

---

## 6. Roadmap: phases and tasks

Legend: 🅰️ Person A (**Data and Pipeline**), 🅱️ Person B (**Intelligence and API**), 🤝 together.
Effort: **S** ≤ ½ day, **M** 1-2 days, **L** 3+ days.

Why this split: A owns everything up to "article/story is stored". B owns everything from "story is analysed" onward. The handoff between us is **one agreed function and one agreed table shape**, so we can build both halves at the same time.

### Phase 0: Foundation (about 2 days)

**Goal:** The server starts with a clean structure, validated config and one working endpoint.

| # | Owner | Task | Motive | Effort | Done when |
|---|---|---|---|---|---|
| 0.1 | 🅰️ | Create the folder skeleton from section 4.1 and move the existing route/controller into `modules/health` (or the matching module) | Structure early avoids a painful refactor later | S | `npm run dev` still works |
| 0.2 | 🅰️ | `config/env.ts` with zod + `.env.example` | App fails fast on bad config | S | Removing a variable stops startup with a clear message |
| 0.3 | 🅱️ | Split `app.ts` / `main.ts` with `buildApp()` | Makes the app testable | S | A test can call `app.inject({ url: '/health' })` |
| 0.4 | 🅱️ | `lib/errors.ts` + `plugins/error-handler.ts` | One error format everywhere | S | Throwing `NotFoundError` returns `404` + standard JSON |
| 0.5 | 🅰️ | `plugins/prisma.ts` + `types/fastify.d.ts` | Shared typed DB client | S | `app.prisma.$queryRaw` compiles and runs |
| 0.6 | 🅱️ | `GET /health` with DB ping | Liveness + DB check | S | Returns `ok` |
| 0.7 | 🤝 | tsconfig strict, ESLint, Prettier, Vitest, npm scripts | Same quality rules for both | S | `lint`, `typecheck`, `test` pass |
| 0.8 | 🤝 | Agree on the Prisma schema and the `RawArticle` / `AnalysisOutput` types (sections 4.7 and 4.8) | This is our **contract**; everything else builds on it | M | Schema PR approved by both |

### Phase 1: Database layer (about 2 days)

**Goal:** Tables exist, typed repositories exist, sample data exists.

| # | Owner | Task | Motive | Effort | Done when |
|---|---|---|---|---|---|
| 1.1 | 🅰️ | Write `schema.prisma` for all models and run the first migration | Single source of truth for data | M | Tables visible in the DB |
| 1.2 | 🅰️ | `seed.ts` with 3-5 sources + default settings | Reproducible local data | S | `db:seed` is repeatable |
| 1.3 | 🅰️ | `articles.repository.ts` and `stories.repository.ts` | Keep SQL out of services | M | Unit/integration test inserts and reads |
| 1.4 | 🅱️ | `analysis.repository.ts` (save analysis with scenarios in one transaction) | Never store a half-saved analysis | S | Saving creates `Analysis` + `Scenario` rows together |
| 1.5 | 🅱️ | Create `tests/fixtures/` with 10 real article samples | B can build AI logic without waiting for ingestion | S | Fixtures cover different market topics |
| 1.6 | 🅱️ | `gemini.client.ts` smoke test (one call, JSON in, JSON out) | Prove the AI connection early | S | Script prints a valid JSON reply |

### Phase 2: Ingestion (A) and AI analysis v1 (B) in parallel (about 1 week)

**Goal A:** Real articles flow into the DB on a schedule.
**Goal B:** A story from fixtures becomes a validated analysis.

| # | Owner | Task | Motive | Effort | Done when |
|---|---|---|---|---|---|
| 2.1 | 🅰️ | `source.adapter.ts` interface + `sources.registry.ts` | Provider-agnostic design | S | Interface merged |
| 2.2 | 🅰️ | `rss.adapter.ts` (parse, strip HTML, normalise dates) | First real data | M | Articles from 1 feed print correctly |
| 2.3 | 🅰️ | `lib/hash.ts`, `lib/text.ts` | Dedupe and clean text | S | URL variants map to one hash |
| 2.4 | 🅰️ | `articles.service.saveNew()` with skip-existing | No duplicate rows | S | Running twice adds 0 new rows |
| 2.5 | 🅰️ | `ingest.job.ts` + `scheduler.ts` with failure isolation and no-overlap flag | Automatic, resilient polling | M | A broken feed does not stop the others |
| 2.6 | 🅰️ | `GET /sources`, `GET /articles` | First way to inspect data | S | curl shows paginated results |
| 2.7 | 🅱️ | `analysis.schema.ts` (zod) | Validate every AI reply | S | Valid sample passes, invalid fails |
| 2.8 | 🅱️ | `prompts/v1.ts`: X-factor, primary direction, impact, confidence | Core value, versioned | M | Works on all 10 fixtures |
| 2.9 | 🅱️ | `analysis.service.analyzeStory()` with retry-once + timeout + error mapping | AI is unreliable; the pipeline must survive | M | Bad AI output never crashes the call |
| 2.10 | 🅱️ | Dev script `npm run analyze:fixture` | Fast prompt iteration without the DB or the feeds | S | One command prints an analysis |
| 2.11 | 🅱️ | Log token usage and latency per call | Cost visibility | S | Logs show tokens per analysis |

### Phase 3: Stories and the full pipeline (about 1 week)

**Goal:** Ingest → cluster → analyse works automatically end to end.

| # | Owner | Task | Motive | Effort | Done when |
|---|---|---|---|---|---|
| 3.1 | 🅰️ | `clustering.ts` v1 (title similarity inside a time window) | One event = one story | L | Same event from 3 sources → 1 story |
| 3.2 | 🅰️ | Hook clustering into `ingest.job` | Stories are created automatically | S | New articles get a `storyId` |
| 3.3 | 🅰️ | Add 2-4 more source adapters | Needed for real cross-checking | M | 3-5 providers active |
| 3.4 | 🅰️ | `consistency.ts` (`confirmed` / `single_source` / `conflicting`) | Cuts false signals | M | Each story shows its status |
| 3.5 | 🅱️ | `analyze.job.ts`: find stories with no analysis, analyse, save | Connects A's output to B's engine | M | A new story gets an `Analysis` automatically |
| 3.6 | 🅱️ | Prompt v2: edge cases and second-order effects | Deeper than a headline summary | M | `edgeCases` populated |
| 3.7 | 🅱️ | Prompt v3: probability-weighted scenarios per instrument (probabilities sum to 1, enforced with zod `refine`) | Honest, quantified output | M | Invalid probabilities are rejected |
| 3.8 | 🅱️ | Cache by story content hash; skip low-value stories; daily token budget | Control AI cost | M | Re-running does not re-bill |
| 3.9 | 🤝 | Integration test: fixtures → full pipeline → DB assertions | Catch contract mismatches | M | Test green in CI |

### Phase 4: REST API (about 1 week)

**Goal:** Everything the future frontend needs is available and documented. **This is the Backend MVP.**

| # | Owner | Task | Motive | Effort | Done when |
|---|---|---|---|---|---|
| 4.1 | 🅱️ | `GET /stories` with filters (market, direction, minConfidence, from/to) + pagination | Main feed | M | Filters work together |
| 4.2 | 🅱️ | `GET /stories/:id` (articles, analysis, scenarios, consistency) | Detail view | M | One call returns the full picture |
| 4.3 | 🅱️ | `settings` module: `GET/PUT /settings` | Configurable thresholds | S | Changes persist |
| 4.4 | 🅱️ | `POST /analysis/:storyId/rerun` | Re-test prompts on demand | S | Creates a new analysis version |
| 4.5 | 🅰️ | Pagination, sorting and query-validation helpers shared by all list endpoints | Consistency, less duplicate code | S | All lists behave the same |
| 4.6 | 🅰️ | Register `@fastify/swagger` (OpenAPI docs) | The frontend dev (us, later) gets a live API reference | M | `/docs` lists every endpoint |
| 4.7 | 🤝 | Integration tests for every endpoint with `app.inject()` | Safe refactoring | M | CI green |

### Phase 5: Alerts and realtime (about 1 week)

| # | Owner | Task | Motive | Effort | Done when |
|---|---|---|---|---|---|
| 5.1 | 🅱️ | `alerts.rules.ts` + unit tests | Alert quality is the product | S | Table-driven tests pass |
| 5.2 | 🅱️ | `plugins/sse.ts` + `GET /alerts/stream` | Live updates with no polling | M | `curl -N` shows events |
| 5.3 | 🅰️ | `alerts.service.ts` (persist, de-duplicate within N hours) | Avoid spam | M | Same story alerts once |
| 5.4 | 🅰️ | One external channel (Telegram **or** email) behind `notifier.ts` | Real notification on a phone | M | Message arrives |
| 5.5 | 🤝 | Wire alerts into `analyze.job` | Close the loop | S | High-impact story → alert end to end |

### Phase 6: Backtesting and calibration (about 1-2 weeks)

| # | Owner | Task | Motive | Effort | Done when |
|---|---|---|---|---|---|
| 6.1 | 🅰️ | `market-data.client.ts` + store prices for tracked instruments | We need ground truth | M | Price data in the DB |
| 6.2 | 🅰️ | `outcome.service.ts` + `outcome.job.ts` (+1h / +4h / +1d) | Measure real accuracy | L | `Outcome` rows created automatically |
| 6.3 | 🅱️ | `backtest.stats.ts` + `GET /backtest/summary` | See where we are right or wrong | M | Hit-rate by market and confidence bucket |
| 6.4 | 🅱️ | Calibration: compare stated confidence with real hit-rate and adjust scoring | Make "70% confidence" mean 70% | L | Written calibration report |

### Phase 7: Hardening and deployment (about 1 week)

| # | Owner | Task | Motive | Effort |
|---|---|---|---|---|
| 7.1 | 🅰️ | `plugins/security.ts` (CORS, helmet, rate limit) | Basic protection | S |
| 7.2 | 🅰️ | Authentication (API key or JWT) if multiple users | Protect the data | M |
| 7.3 | 🅰️ | Dockerfile + docker-compose (API + Postgres), deploy | Reproducible runs | M |
| 7.4 | 🅱️ | Graceful shutdown, health/readiness checks, structured logs, error tracking | Operability | S |
| 7.5 | 🅱️ | Failure drills: Gemini down, feed down, DB slow | Prove resilience | M |
| 7.6 | 🤝 | Final docs: setup, architecture, runbook | Future us says thanks | S |

### Milestones

| Milestone | After | You can say |
|---|---|---|
| **M1: Alive** | Phase 1 | "Server runs, DB is migrated, structure is in place" |
| **M2: Data flows** | Phase 2 | "News is ingested automatically and AI analyses a story" |
| **M3: Smart pipeline** | Phase 3 | "Duplicate news is merged and analysed with scenarios" |
| **M4: Backend MVP** | Phase 4 | "A client can read analysed stories through a documented API" |
| **M5: Proactive** | Phase 5 | "High-impact news reaches me on my phone" |
| **M6: Trustworthy** | Phase 6 | "We can show how accurate we are" |

---

## 7. How we avoid blocking each other

1. **Contract first (task 0.8).** Schema and the two key types are agreed before any feature code.
2. **Fixtures instead of waiting.** B works from `tests/fixtures/` while A builds ingestion. A uses a stub `analyzeStory()` that returns a fixed result until B's real one lands.
3. **Folder ownership.**
   - 🅰️ owns `prisma/`, `modules/{sources,articles,stories,backtest-data}`, `jobs/ingest.job.ts`, `lib/`.
   - 🅱️ owns `modules/{analysis,alerts,settings}`, `jobs/analyze.job.ts`, `plugins/{error-handler,sse}.ts`.
   - Shared files (`schema.prisma`, `app.ts`, `package.json`): small PRs, reviewed by the other person the same day.
4. **Schema changes are announced.** Any `schema.prisma` change goes in its own PR with its migration, merged quickly, and the other person runs `prisma migrate dev` right after pulling.
5. **Daily 10-minute sync:** done yesterday, doing today, blocked by.

---

## 8. Testing each phase by hand

```bash
# Phase 0
curl http://localhost:3000/health

# Phase 2
curl "http://localhost:3000/sources"
curl "http://localhost:3000/articles?page=1&limit=10"
npm run analyze:fixture

# Phase 4
curl "http://localhost:3000/stories?minConfidence=60&direction=bullish"
curl "http://localhost:3000/stories/<id>"

# Phase 5
curl -N http://localhost:3000/alerts/stream

# Phase 6
curl http://localhost:3000/backtest/summary
```

Use Prisma Studio (`npx prisma studio`) to look at the tables after each job runs. Seeing the rows appear is the fastest way to confirm a phase really works.

---

## 9. Definition of done and Git rules

A task is done when:

- [ ] It compiles in strict mode with no unexplained `any`
- [ ] Lint, typecheck and tests pass
- [ ] External data (HTTP bodies, AI output, env) is validated with zod
- [ ] Errors use `AppError` and are logged, never swallowed
- [ ] The other person reviewed and approved the PR
- [ ] README / this roadmap is updated if structure or setup changed

Git workflow:

- Branches: `feat/<module>-<short-name>` (e.g. `feat/sources-rss-adapter`)
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- No direct pushes to `main`; squash-merge PRs
- Rebase on `main` daily; keep PRs under ~300 changed lines where possible

---

## Appendix: the one-sentence summary of every folder

| Folder / file | One sentence |
|---|---|
| `main.ts` | Starts the server and the scheduler |
| `app.ts` | Builds the Fastify app so tests can use it without a port |
| `config/env.ts` | Validates and types all environment variables |
| `plugins/` | Adds shared capabilities (DB, errors, security, SSE) to Fastify |
| `types/` | Tells TypeScript about things added at runtime |
| `lib/` | Small helpers with no framework or feature dependency |
| `prisma/` | Database schema, migrations and seed data |
| `modules/sources` | Hides each news provider behind one interface |
| `modules/articles` | Stores raw news without duplicates |
| `modules/stories` | Merges articles into events and checks source agreement |
| `modules/analysis` | Talks to Gemini and returns validated, versioned analyses |
| `modules/alerts` | Decides when to notify and delivers the notification |
| `modules/backtest` | Compares predictions with reality to measure accuracy |
| `modules/settings` | Runtime-configurable thresholds and watchlists |
| `jobs/` | Runs the pipeline on a timer by calling services |
| `tests/` | Proves each layer works, using stable fixtures |