# AI News Analyzer: Backend Roadmap (v2)

**Checklist edition · Prisma 8 · no repository files · beginner friendly**

This file is our working plan for the **backend only** (frontend comes later). It has three jobs:

1. **A checklist** you can tick as you finish each step, so we always know where we are.
2. **A plain-language explanation** of every folder and file: what it is, why it exists, a small example.
3. **A how-to guide for every task**, so nobody gets stuck on "okay, but how do I actually build this?"

> Stack: Node.js + TypeScript (strict) + Fastify + PostgreSQL + **Prisma ORM 8 (release candidate)** + Docker + Gemini + zod, in a monorepo.

---

## How to use this file

- **Tick a box** by editing the file: change `- [ ]` to `- [x]`, then commit (`docs: tick 3.4`). GitHub shows the boxes but you can only click them inside issues and PRs, not in a file view.
- Task numbers look like `3.4`: phase 3, task 4. The checklist of each phase is at the top of the phase. The guide for each task is right below it, with the same number.
- **Owners:** decide today who is A and who is B and write it here.
  - 🅰️ **Person A = Data and Pipeline** (sources, articles, stories, scheduler, backtest data). Name: `__________`
  - 🅱️ **Person B = AI and API** (Gemini analysis, REST endpoints, alerts, settings). Name: `__________`
  - 🤝 = do it together (pair on it, or one does it and the other reviews).
- **Effort:** S = half a day or less, M = 1-2 days, L = 3 days or more.
- **Import style:** code snippets write imports without file endings (`from '../../prisma/db'`). If your code uses `.js` endings (`from './app.js'`), keep that style. Just stay consistent.

---

## Progress tracker

- [ ] **Phase 0:** Verify the setup we already did (Prisma 8, Docker, monorepo)
- [ ] **Phase 1:** App skeleton (folders, config, errors, health route)
- [ ] **Phase 2:** Database (models, migrations, seed data)
- [ ] **Phase 3:** News ingestion (A) and AI analysis v1 (B), in parallel
- [ ] **Phase 4:** Stories and the full automatic pipeline
- [ ] **Phase 5:** REST API → **Backend MVP** 🎉
- [ ] **Phase 6:** Alerts and live updates
- [ ] **Phase 7:** Backtesting and calibration
- [ ] **Phase 8:** Hardening and deployment

---

## 1. Plan review: what changed from v1, and why

We re-checked the whole plan against how **Prisma ORM 8** really works today (it is a rewrite, not a small upgrade) and against what you asked. Here is what changed.

| # | Topic | v1 plan | v2 plan | Why |
|---|---|---|---|---|
| 1 | Database client | `PrismaClient` + a Fastify plugin that adds `app.prisma` | Import one ready-made `db` from `src/prisma/db.ts` | Prisma 8 has **no** `PrismaClient` and no `@prisma/client` package |
| 2 | Repository files | `<feature>.repository.ts` in every module | **Removed.** Services call `db.orm.public.<Model>` directly | You asked to skip them for now. Prisma 8 queries are already short and readable. Add a repository later only if the same query appears in 3+ places |
| 3 | Database commands | `migrate dev`, `db seed`, `studio` | `contract emit` → `migration plan` → `db migrate`. Seed with our own script. View data with `psql` or a GUI | In the versions we checked, the Prisma 8 CLI has no `migrate dev`, `db seed`, `studio` or `migrate reset` (run `npx prisma --help` to see if yours added them) |
| 4 | Skip duplicate articles | Custom "skip if exists" code | `createAll(rows, { onConflict: 'skip', conflictOn: ['urlHash'] })` | It skips duplicates **and returns only the rows really inserted**. That is exactly the "new articles" list the pipeline needs |
| 5 | Save analysis + scenarios | Manual transaction | Nested `create` (and `db.transaction` where two tables change) | Atomic: never a half-saved analysis |
| 6 | Duplicate-key errors | Check Prisma code `P2002` | Check `error.sqlState === '23505'` | Prisma 8 has no `P2002` |
| 7 | Scheduler | `node-cron` | Plain `setInterval` + "already running" flag | One less package to learn. Easy to swap later |
| 8 | Story list filters | Join across Story, Analysis, Scenario | Copy a few result fields (direction, scores) **onto `Story`** | Filters and sorting become simple one-table queries |
| 9 | Models | All tables in one big migration | Add tables **when the feature needs them** (Setting in Phase 5, Alert in 6, Price/Outcome in 7) | You practise the migration loop and have no unused tables |
| 10 | API docs | Swagger | A hand-written `docs/api.md` for now | Fewer moving parts for beginners. Swagger can come later |
| 11 | Phase 0 | "Create the setup" | "**Verify** the setup" (Prisma 8, Docker, monorepo already done) | Don't redo what exists. Prove it works on both machines |
| 12 | Versions | Not mentioned | Pin exact Prisma versions | Prisma 8 is still a release candidate, and details may still change |
| 13 | Progress | Plain tables | Checkboxes | You asked for tick-boxes |

**What we re-verified and kept:** the layers `route → controller → service`; one folder per feature; `app.ts` separate from `main.ts` (so we can test without opening a port); zod validation on everything that comes from outside (HTTP, env, **Gemini**); fixtures first so two people never wait for each other; "contract first" teamwork.

> **Heads-up about Prisma 8:** at the time of writing (late November 2026) Prisma's own docs still call Prisma 8 a **release candidate**, with the final release "expected October 2026" (so it can land any day). Small API edits may be needed later. That is why we **pin versions** (task 0.2).

---

## 2. The beginner's map

### 2.1 The restaurant analogy

Think of the backend as a restaurant. Every folder name will make sense afterwards.

| In the restaurant | In our backend | What it does |
|---|---|---|
| The **menu** | **Route** (`*.routes.ts`) | Lists what you can order: `GET /stories`, `GET /health` |
| The **waiter** | **Controller** (`*.controller.ts`) | Takes the order, checks it is valid, brings the food back as JSON |
| The **chef** | **Service** (`*.service.ts`) | Does the real cooking: the business logic |
| The **pantry** | **Database** (`db` from Prisma) | Where all the ingredients (data) are stored |
| **Prep work on a timer** | **Job** (`jobs/`) | Fetch news every 5 minutes, analyse stories: no customer needed |
| **Kitchen equipment** | **Plugin** (`plugins/`) | Installed once, used everywhere (error handling, CORS...) |
| **Quality inspector at the door** | **zod schema** (`*.schema.ts`) | Rejects bad input before it enters the kitchen (bad requests, bad AI answers) |
| **Suppliers** | **Source adapter** (`sources/`) | Each news provider delivers in a different box, the adapter unpacks it |

Golden rule: **the chef (service) never talks to the customer, and the waiter (controller) never cooks.** Jobs call the chef directly. That is why logic lives in services and not in controllers.

### 2.2 One news item, from start to finish

```
Reuters   : "RBI holds repo rate steady"             ┐
Eco Times : "RBI keeps repo rate unchanged"          ├─ 3 ARTICLES (rows in Article)
Moneyctrl : "Repo rate: RBI pauses, as expected"     ┘
        │  clustering (similar titles, same day)
        ▼
ONE STORY: "RBI holds repo rate steady"  (sourceCount = 3, consistency = confirmed)
        │  Gemini reads the 3 articles
        ▼
ONE ANALYSIS:
   xFactor          : "Pause was signalled earlier than markets priced in"
   primaryInstrument: "NIFTY BANK"        primaryDirection: bullish
   impactScore 72   confidenceScore 64
   scenarios        : bullish 0.62 / neutral 0.25 / bearish 0.13
        │  impact ≥ 70 and confidence ≥ 60?
        ▼
ALERT sent to Telegram + live stream; later the BACKTEST checks if the price really moved up.
```

### 2.3 Words you will meet

| Word | Meaning in one line |
|---|---|
| **Article** | One piece of news from one provider |
| **Story** | One real-world event, made of 1 or more articles |
| **Analysis** | What the AI concluded about a story (X-factor, direction, scores) |
| **Scenario** | One possible market outcome with a probability (e.g. gold bullish 62%) |
| **Contract** | Prisma 8's name for the file that describes our tables (`contract.prisma`, it replaced `schema.prisma`) |
| **Migration** | A saved, reviewable change to the database structure |
| **Adapter** | A small file that turns one provider's format into our standard `RawArticle` |
| **Fixture** | A saved sample (an article, an AI answer) used for testing without the internet |
| **Plugin** | A Fastify add-on that registers something once for the whole app |
| **SSE** | Server-Sent Events: the server keeps a connection open and pushes live messages |
| **Backtest** | Checking old predictions against what the market actually did |

---

## 3. Prisma 8 cheat sheet (read this before Phase 2)

### 3.1 The files Prisma 8 gives us

| File | Who edits it | What it is |
|---|---|---|
| `src/prisma/contract.prisma` | **We do** | Our models (tables). Must start with the line `// use prisma-8`. *(Yours may still be called `schema.prisma`. The name doesn't matter, what matters is that `prisma.config.ts` points to it and it starts with that line.)* |
| `src/prisma/contract.json` + `contract.d.ts` | Generated by `contract emit` | The compiled contract. **Commit them**, `db.ts` imports them |
| `src/prisma/db.ts` | Written by Prisma, don't change | Exports `db`, the one object we use for every query |
| `prisma.config.ts` | Rarely | Tells the `prisma` commands where the contract is and which database to use |
| `migrations/` | Generated by `migration plan` | Saved database changes. **Commit them** |

### 3.2 The 4-command loop to change the database

Every time we add or change a table:

```bash
# 1. edit src/prisma/contract.prisma
npx prisma contract emit                         # 2. regenerate contract.json + contract.d.ts
npx prisma migration plan --name add_alerts      # 3. write the migration (READ the SQL preview!)
npx prisma db migrate --advance-ref db           # 4. apply it to your local database
```

Other commands you will use:

| Command | Use |
|---|---|
| `npx prisma db init` | First time only: create the tables in an **empty** database |
| `npx prisma db verify` | Check that the database matches the contract |
| `npx prisma --help` | See everything your installed version can do |

### 3.3 Reading and writing data (this replaces "repositories" for now)

Every query starts with `db.orm.public.<ModelName>`. (`public` is the PostgreSQL schema name, always write it.)

```ts
import { db } from '../../prisma/db';

// READ
const all     = await db.orm.public.Source.all();                               // every row
const active  = await db.orm.public.Source.where({ isActive: true }).all();     // filter
const one     = await db.orm.public.Source.first({ id: 3 });                    // one row or null
const must    = await db.orm.public.Source.firstOrThrow({ id: 3 });             // throws if missing
const page    = await db.orm.public.Article
  .orderBy((a) => a.publishedAt.desc())
  .limit(20).offset(40)
  .all();
const recent  = await db.orm.public.Story.where((s) => s.lastSeenAt.gte(since)).all();  // operators: eq neq lt lte gt gte like ilike in notIn isNull isNotNull
const { total } = await db.orm.public.Article.aggregate((a) => ({ total: a.count() }));

// WRITE
const created = await db.orm.public.Source.create({ name: 'X', type: 'rss', url: 'https://...' });
const updated = await db.orm.public.Source.where({ id: 3 }).update({ isActive: false }); // changes ONE row, returns it (or null)
const many    = await db.orm.public.Article.createAll(rows, { onConflict: 'skip', conflictOn: ['urlHash'] });
await db.orm.public.Source.upsert({ create: {...}, update: {...}, conflictOn: { name: 'X' } });

// SEVERAL WRITES THAT MUST SUCCEED TOGETHER
await db.transaction(async (tx) => {
  await tx.orm.public.Analysis.create({ /* ... */ });
  await tx.orm.public.Story.where({ id }).update({ /* ... */ });
});
```

Differences from Prisma 7 that will trip you up:

| If you remember... | In Prisma 8 it is... |
|---|---|
| `prisma.user.findMany()` | `db.orm.public.User.all()` |
| `create({ data: { ... } })` | `create({ ... })`, **no `data:` wrapper** |
| `findFirst` / `findUnique` | `.first(...)` (returns `null` if none) |
| `take` / `skip` | `.limit()` / `.offset()` |
| `$disconnect()` | `db.close()` |
| `@updatedAt` | `temporal.UpdatedAt` field type |
| Error code `P2002` (duplicate) | `error.sqlState === '23505'` |
| `increment: 1` | not available (use raw SQL) |
| `update` with many matches | `.update()` changes **one** row. Use `.updateAll()` / `.updateAndCount()` for all matches |

### 3.4 Viewing your data (there is no Prisma Studio)

Use `psql` or any PostgreSQL GUI. **Important:** Prisma 8 creates tables with the model's exact name (capital letter), so you must use quotes:

```sql
SELECT * FROM "Article" LIMIT 5;     -- works
SELECT * FROM Article;               -- ERROR: Postgres lowercases it to "article"
```

```text
\conninfo        -- which database am I connected to?
\dt              -- list tables
\d "Article"     -- describe one table (quotes needed!)
```

If `\dt` says *"Did not find any relations"*: either you are connected to a different database (`\conninfo`), or the tables were never created (run `npx prisma db init` or `npx prisma db migrate --advance-ref db`).

### 3.5 Rules for working on the contract as a team of two

1. **One person changes the contract at a time.** Say it in chat first: "I'm adding Alert".
2. Pull latest `main` → run the 4-command loop → commit `contract.prisma`, `contract.json`, `contract.d.ts` and `migrations/` **together** in one small PR → merge quickly.
3. The other person pulls, then runs `npx prisma db migrate --advance-ref db` and `npx prisma db verify`.
4. Conflict inside `migrations/`? **Stop and talk.** Don't hand-edit hashes. The usual fix: the second person deletes their own new migration folder, pulls, and plans again.
5. Both of you must run the **same Prisma version** (task 0.2).

---

## 4. Final folder structure

Monorepo root has `backend/` (and `frontend/` later). Inside `backend/`:

```
backend/
├── prisma.config.ts                 # (Prisma) where the contract + database are
├── migrations/                      # (Prisma) saved database changes, committed
├── Dockerfile
├── .env  /  .env.example
├── package.json   tsconfig.json
├── src/
│   ├── main.ts                      # starts the server and the timers
│   ├── app.ts                       # builds the Fastify app (no port yet)
│   ├── config/
│   │   └── env.ts                   # validated environment variables
│   ├── prisma/                      # (Prisma) contract.prisma, contract.json, contract.d.ts, db.ts
│   ├── plugins/
│   │   ├── database.ts              # closes the DB connection when the server stops
│   │   ├── error-handler.ts         # one JSON shape for every error
│   │   ├── security.ts              # CORS, helmet, rate limit (Phase 5/8)
│   │   └── sse.ts                   # live alert connections (Phase 6)
│   ├── lib/
│   │   ├── errors.ts                # AppError, NotFoundError...
│   │   ├── hash.ts                  # normalizeUrl + sha256
│   │   ├── text.ts                  # cleanText, tokens, jaccard
│   │   └── http.ts                  # pagination helper (Phase 5)
│   ├── modules/                     # ONE FOLDER PER FEATURE
│   │   ├── health/                  # health.routes.ts, health.controller.ts
│   │   ├── sources/                 # source.adapter.ts, rss.adapter.ts, sources.registry.ts, + routes/controller/service
│   │   ├── articles/                # routes, controller, service, schema
│   │   ├── stories/                 # routes, controller, service, schema, clustering.ts, consistency.ts
│   │   ├── analysis/                # gemini.client.ts, prompts/, analysis.schema.ts, analysis.service.ts, routes, controller
│   │   ├── alerts/                  # alerts.rules.ts, alerts.service.ts, notifier.ts, channels/telegram.ts, routes, controller
│   │   ├── backtest/                # market-data.client.ts, outcome.service.ts, stats.service.ts, routes, controller
│   │   └── settings/                # routes, controller, service, schema
│   ├── jobs/
│   │   ├── scheduler.ts             # what runs and how often
│   │   ├── ingest.job.ts
│   │   ├── analyze.job.ts
│   │   └── outcome.job.ts
│   └── scripts/                     # run by hand: seed.ts, db-smoke.ts, analyze-fixture.ts
└── tests/
    ├── unit/   integration/
    └── fixtures/                    # saved sample articles + sample AI answers
```

Notice: **no `*.repository.ts`**. Services use `db` directly.

---

## Phase 0: Verify the setup we already did (about 1 day)

**In plain words:** Prisma 8, Docker and the monorepo already exist. Before building on top, prove they work **on both laptops**. Ten minutes of checking now saves hours of "it works on my machine" later.

- [ ] 0.1 🤝 Both of us can run the project from a fresh clone
- [ ] 0.2 🅰️ Prisma versions pinned and identical on both machines
- [ ] 0.3 🅱️ Contract file, `db.ts` and the tables are correct
- [ ] 0.4 🅰️ Leftovers from Prisma 7 removed
- [ ] 0.5 🅱️ Docker image builds and runs
- [ ] 0.6 🤝 Quality tools: lint, typecheck, tests, CI

### 0.1 · 🤝 · Run the project from a fresh clone

**Why:** If only one laptop can run it, you don't have a team project yet.
**How:** The person who did *not* set things up does this:
1. Clone the repo, run `npm install` from the **monorepo root**.
2. Copy `backend/.env.example` to `backend/.env`, fill `DATABASE_URL` and `GEMINI_API_KEY`.
3. Create an empty local database (e.g. `CREATE DATABASE ai_news_analyser;` in `psql`).
4. From `backend/`: `npm run dev`.
5. Open `http://localhost:3000/` or your existing test route in the browser.

**Done when:** both people see the server start and the test route answer. Write down every step that was missing in the README, that is your setup guide.

### 0.2 · 🅰️ · Pin Prisma versions

**Why:** Prisma 8 is a release candidate and each new candidate can change things. Also, `npm install prisma` with no version installs whatever is newest, so two laptops can end up on different versions.
**How:**
```bash
npm ls prisma @prisma/orm-postgres      # see what you have
```
In `backend/package.json` remove the `^` in front of **`prisma`** and **`@prisma/orm-postgres`** so they look like `"8.0.0-rc.NN"` (exact). Commit `package-lock.json`. Never write `npx prisma@latest` again after setup, plain `npx prisma ...` uses the pinned version. Upgrade the two packages **together**, on purpose, when Prisma publishes a release you want.
**Done when:** `npm ls prisma @prisma/orm-postgres` prints the same versions on both laptops.

### 0.3 · 🅱️ · Check the contract, `db.ts` and the tables

**Why:** Everything in Phases 2 to 8 depends on these files.
**How:**
1. Open `prisma.config.ts`. Find the `contract:` path. Open that file. First non-blank line must be `// use prisma-8`.
2. Run `npx prisma contract emit`. It should print "Emitted contract.json and contract.d.ts".
3. Open `src/prisma/db.ts`. It should export `db`. Don't change it.
4. Tables exist? In `psql`: `\conninfo` then `\dt`. If the database is empty, run `npx prisma db init`.
5. If you have old experiment tables you don't care about: drop the whole database and recreate it (there is no `migrate reset` command in Prisma 8):
```sql
DROP DATABASE ai_news_analyser;
CREATE DATABASE ai_news_analyser;
```
then `npx prisma db init` again.

**Done when:** `\dt` lists your tables and `npx prisma db verify` says the database matches the contract.

### 0.4 · 🅰️ · Remove Prisma 7 leftovers

**Why:** Old Prisma 7 code and packages cause confusing errors ("PrismaClient is not exported...").
**How:**
1. Search the backend for `@prisma/client`, `PrismaClient`, `PrismaPg`, `adapter-pg`.
2. Delete any old Prisma plugin or client file that matches.
3. When nothing imports them: `npm uninstall @prisma/client @prisma/adapter-pg` (only the ones that are listed).
4. Run `npm run typecheck` (or `npx tsc --noEmit`) and fix what breaks.

**Done when:** the search finds nothing and typecheck passes.

### 0.5 · 🅱️ · Docker image builds and runs

**Why:** "Works with `npm run dev`" and "works in Docker" are two different things. Find problems now.
**How:**
1. Make sure `npm run build` creates **`dist/main.js`**. If it isn't there, look inside `dist/`: a very common cause is that the compiler copied the `src/` folder too, so the file is at `dist/src/main.js`. Fix in `tsconfig.json`: `"rootDir": "./src"`, `"outDir": "./dist"`, `"include": ["src"]`.
2. `npm start` should be `node dist/main.js`. Test it locally before Docker.
3. Everything the server needs at runtime (`fastify`, `zod`, `dotenv`, `@prisma/orm-postgres`, `@google/genai`...) must be in `dependencies`, not `devDependencies`. The `prisma` CLI and `tsx`, `typescript` can stay in dev.
4. A simple Dockerfile to compare with yours (adjust paths if your monorepo layout is different):
```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
CMD ["node", "dist/main.js"]
```
5. Run it: `docker build -t news-backend .` then `docker run --rm --env-file .env -p 3000:3000 news-backend`.
6. If PostgreSQL runs **on your own machine** (not in Docker), the container can't reach it with `localhost` (inside the container, localhost is the container itself). For the container use `host.docker.internal` in `DATABASE_URL`, for example `postgresql://user:pass@host.docker.internal:5432/ai_news_analyser`.
7. Prisma 8 needs Node 22.18 or newer, so use the `node:22-alpine` tag (latest 22.x) and not an old pinned 22.x.

**Done when:** `http://localhost:3000/health` (or your test route) answers from the container.

### 0.6 · 🤝 · Quality tools

**Why:** Same rules for both of us, enforced by the computer instead of by arguing.
**How:**
1. `package.json` scripts: `dev`, `build`, `start`, `typecheck` (`tsc --noEmit`), `lint`, `test`, `contract:emit`, `db:plan`, `db:migrate` (`prisma db migrate --advance-ref db`), `db:seed`.
2. ESLint + Prettier with TypeScript rules. Install **Vitest** for tests.
3. `tsconfig.json`: `"strict": true`.
4. GitHub Actions workflow that runs `npm ci`, `lint`, `typecheck`, `test` on every pull request.
5. Branch protection on `main`: PR required, 1 approval, CI must pass.

**Done when:** a PR with a deliberate lint error is blocked by CI.

---

## Phase 1: App skeleton (about 1-2 days)

**In plain words:** build the empty restaurant: kitchen layout, safety rules, an "open" sign. No recipes yet.

- [ ] 1.1 🤝 Create the folder skeleton and move existing code into it
- [ ] 1.2 🅰️ `config/env.ts`: validated environment variables
- [ ] 1.3 🅱️ `app.ts` + `main.ts` + `plugins/database.ts`
- [ ] 1.4 🅱️ `lib/errors.ts` + `plugins/error-handler.ts`
- [ ] 1.5 🅰️ `modules/health`: the `GET /health` route
- [ ] 1.6 🅱️ First automated test with `app.inject`

### 1.1 · 🤝 · Folder skeleton

**Why:** Putting files in the right place on day 1 is much cheaper than moving 40 files on day 20.
**How:** Create the empty folders from section 4 (`config`, `plugins`, `lib`, `modules/*`, `jobs`, `scripts`, `tests`). Move the route/controller you already have into `modules/health/` (or the module that matches). If `main.ts` is in the backend root, move it to `src/main.ts` and change the dev script to `tsx watch src/main.ts`.
**Tip:** Git doesn't save empty folders. Put a file called `.gitkeep` in each empty one.
**Done when:** `npm run dev` still works after the move.

### 1.2 · 🅰️ · `src/config/env.ts`

**In simple words:** the one place that reads `.env`. If something is missing or wrong, the server **refuses to start** and tells you what.
**Why not just `process.env.X`?** It is always `string | undefined`. A typo gives `undefined` silently, and you find out at 2 AM.
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
  ANALYZE_INTERVAL_MINUTES: z.coerce.number().default(2),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export const env = schema.parse(process.env);
```
**TypeScript note:** `z.coerce.number()` is needed because environment values are always text. `schema.parse` checks at **runtime**; TypeScript types alone are erased when the program runs, so they can't protect you from a bad `.env`.
**Also do:** copy every variable name (no secrets) into `.env.example`.
**Test it:** delete `GEMINI_API_KEY` from `.env`, start the server: you should see a clear zod error. Put it back.

### 1.3 · 🅱️ · `app.ts`, `main.ts`, `plugins/database.ts`

**In simple words:** `app.ts` *builds* the restaurant. `main.ts` *opens the door*. Tests use `app.ts` without opening a real door (port).
```ts
// src/app.ts
import Fastify from 'fastify';
import databasePlugin from './plugins/database';
import errorHandler from './plugins/error-handler';
import healthRoutes from './modules/health/health.routes';

export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(errorHandler);
  await app.register(databasePlugin);
  await app.register(healthRoutes, { prefix: '/health' });
  // later: sources, articles, stories, ...
  return app;
}
```
```ts
// src/main.ts
import { buildApp } from './app';
import { env } from './config/env';

const app = await buildApp();
await app.listen({ port: env.PORT, host: '0.0.0.0' });
```
```ts
// src/plugins/database.ts: close the connection politely when the server stops
import fp from 'fastify-plugin';
import { db } from '../prisma/db';

export default fp(async (app) => {
  app.addHook('onClose', async () => {
    await db.close();
  });
});
```
**Why `host: '0.0.0.0'`?** Inside Docker, `localhost` only accepts connections from inside the container. `0.0.0.0` accepts from outside.
**Why `fp` (fastify-plugin)?** Fastify keeps each plugin in its own bubble. `fp` removes the bubble so hooks and decorators work for the whole app.
**Done when:** the server starts, and stopping it with Ctrl+C exits cleanly.

### 1.4 · 🅱️ · Errors and the error handler

**In simple words:** whatever goes wrong, the client always gets the **same JSON shape** `{ "error": { "code", "message" } }`, and never a stack trace.
```ts
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export class NotFoundError extends AppError {
  constructor(what = 'Resource') { super(404, 'NOT_FOUND', `${what} not found`); }
}
export class ExternalServiceError extends AppError {
  constructor(message: string) { super(502, 'EXTERNAL_SERVICE_ERROR', message); }
}
export function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { sqlState?: string }).sqlState === '23505';
}
```
```ts
// src/plugins/error-handler.ts
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

export default fp(async (app) => {
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.issues } });
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: { code: error.code, message: error.message } });
    }
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    if (status < 500) {
      return reply.status(status).send({ error: { code: 'BAD_REQUEST', message: (error as Error).message } });
    }
    req.log.error(error);
    return reply.status(500).send({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
  });
});
```
**Use it like this anywhere:** `throw new NotFoundError('Story')` → the client gets `404` + the standard JSON.
**Done when:** a temporary route that throws `NotFoundError` returns `404` with that JSON.

### 1.5 · 🅰️ · `modules/health`

**In simple words:** a tiny "are you alive?" page. Hosting platforms and Docker health checks call it.
```ts
// modules/health/health.routes.ts
import type { FastifyInstance } from 'fastify';
import { getHealth } from './health.controller';

export default async function healthRoutes(app: FastifyInstance) {
  app.get('/', getHealth);
}
```
```ts
// modules/health/health.controller.ts
import type { FastifyReply, FastifyRequest } from 'fastify';

export async function getHealth(_req: FastifyRequest, reply: FastifyReply) {
  return reply.send({ status: 'ok', time: new Date().toISOString() });
}
```
**Why two files for something this tiny?** Practice. Every future module uses the same shape.
**Done when:** `curl http://localhost:3000/health` prints `{"status":"ok",...}`. (Task 2.6 adds a database check.)

### 1.6 · 🅱️ · First test

```ts
// tests/integration/health.test.ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../../src/app';

describe('GET /health', () => {
  it('answers ok', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
    await app.close();
  });
});
```
**Why `app.inject`?** It sends a fake request straight into the app, no real network, so tests are fast.
**Done when:** `npm test` is green, and CI runs it.

---

## Phase 2: Database (about 2 days)

**In plain words:** decide what we store, write it down in the contract, create the real tables, and put starter data in.

- [ ] 2.1 🤝 Plan the first models on paper and agree
- [ ] 2.2 🅰️ Write the contract (Source, Article, Story, Analysis, Scenario)
- [ ] 2.3 🅰️ Run the migration loop and commit
- [ ] 2.4 🅱️ Pull, apply the migration, verify
- [ ] 2.5 🅱️ Seed script: `src/scripts/seed.ts`
- [ ] 2.6 🅰️ DB smoke script + database check in `/health`
- [ ] 2.7 🅱️ Fixtures: 10 saved sample articles

### 2.1 · 🤝 · Plan the models

**Why:** Changing a table later is possible but costs time. 20 minutes of agreeing now is cheap.

| Model | What it stores | Key fields |
|---|---|---|
| `Source` | A news provider | name, type (`rss`), url, isActive, lastFetchedAt |
| `Article` | One news item | sourceId, storyId (empty at first), title, url, **urlHash (unique)**, content, publishedAt |
| `Story` | One real event | headline, firstSeenAt, lastSeenAt, sourceCount, consistency, analysisStatus, + copy of the latest result (direction, scores, instrument) |
| `Analysis` | One AI result for a story | xFactor, primaryDirection, primaryInstrument, impactScore, confidenceScore, reasoning, edgeCases, aiModel, promptVersion |
| `Scenario` | One possible outcome | instrument, direction, probability, reasoning |

Three decisions to understand:
- **`urlHash` is unique.** The database itself blocks duplicate articles, even if our code has a bug.
- **`Article.storyId` can be empty.** We save articles first, group them into stories afterwards. Two separate steps that don't depend on each other.
- **Latest result copied onto `Story`.** The feed needs "show stories with confidence ≥ 60, newest first". If those numbers live only in `Analysis`, we'd need joins. Copying them onto `Story` keeps list queries to one table. We update both in one transaction (task 3.10).

**Done when:** both people agree and the table above is pasted into the PR description.

### 2.2 · 🅰️ · Write the contract

Replace/extend `src/prisma/contract.prisma` (keep the first line!):

```prisma
// use prisma-8

model Source {
  id            Int       @id @default(autoincrement())
  name          String    @unique
  type          String                       // "rss" for now
  url           String
  isActive      Boolean   @default(true)
  lastFetchedAt DateTime?
  createdAt     DateTime  @default(now())
  articles      Article[]
}

model Story {
  id               Int        @id @default(autoincrement())
  headline         String
  firstSeenAt      DateTime   @default(now())
  lastSeenAt       DateTime   @default(now())
  sourceCount      Int        @default(1)
  consistency      String     @default("single_source")  // confirmed | single_source | conflicting
  analysisStatus   String     @default("pending")        // pending | done | failed
  // copy of the latest analysis (so lists are simple one-table queries)
  direction        String?                                // bullish | bearish | neutral
  impactScore      Int?
  confidenceScore  Int?
  primaryInstrument String?
  analyzedAt       DateTime?
  articles         Article[]
  analyses         Analysis[]

  @@index([lastSeenAt])
  @@index([analysisStatus])
}

model Article {
  id          Int      @id @default(autoincrement())
  sourceId    Int
  source      Source   @relation(fields: [sourceId], references: [id])
  storyId     Int?
  story       Story?   @relation(fields: [storyId], references: [id])
  title       String
  url         String
  urlHash     String   @unique
  content     String
  publishedAt DateTime
  fetchedAt   DateTime @default(now())

  @@index([publishedAt])
}

model Analysis {
  id                Int        @id @default(autoincrement())
  storyId           Int
  story             Story      @relation(fields: [storyId], references: [id])
  xFactor           String
  primaryDirection  String
  primaryInstrument String
  impactScore       Int
  confidenceScore   Int
  reasoning         String
  edgeCases         String[]
  aiModel           String
  promptVersion     String
  createdAt         DateTime   @default(now())
  scenarios         Scenario[]

  @@index([storyId])
}

model Scenario {
  id          Int      @id @default(autoincrement())
  analysisId  Int
  analysis    Analysis @relation(fields: [analysisId], references: [id])
  instrument  String
  direction   String
  probability Float
  reasoning   String
}
```

**How to read it (example):** `storyId Int?` + `story Story? @relation(...)` means "an article may belong to one story". On the other side `articles Article[]` means "a story has many articles". `?` = can be empty. `@default(...)` = the database fills it if you don't. `String[]` = a list of texts.
**Why `String` and not enums for direction/consistency?** Simpler to start. We validate the allowed values with **zod** in code. You can switch to enums later.
**Done when:** `npx prisma contract emit` runs without errors.

### 2.3 · 🅰️ · Run the migration loop

```bash
npx prisma contract emit
npx prisma migration plan --name create_core_tables
npx prisma db migrate --advance-ref db
```
Read the SQL preview that `migration plan` prints. You should see `Create table "Source"` and so on. Then check in `psql`: `\dt`.
Commit **everything together**: `contract.prisma`, `contract.json`, `contract.d.ts`, `migrations/`. Open a PR, ask B to review, merge.
**Heads-up:** the first plan writes two folders (a "baseline" and your change). That's normal.
**Done when:** `\dt` lists the 5 tables and the PR is merged.

### 2.4 · 🅱️ · Pull, apply, verify

```bash
git pull
npm install
npx prisma db migrate --advance-ref db     # applies only the migrations your database doesn't have
npx prisma db verify
```
**Done when:** `db verify` is happy and `\dt` shows the same tables as A has.

### 2.5 · 🅱️ · Seed script

**In simple words:** a script that puts starter rows in the database (our news providers), safe to run many times.
There's no `prisma db seed` in Prisma 8, so we write our own and run it with `tsx`.
```ts
// src/scripts/seed.ts
import { db } from '../prisma/db';

const sources = [
  // Replace with real RSS feed URLs you have checked and are allowed to use.
  { name: 'Provider One', type: 'rss', url: 'https://example.com/rss-one.xml' },
  { name: 'Provider Two', type: 'rss', url: 'https://example.com/rss-two.xml' },
  { name: 'Provider Three', type: 'rss', url: 'https://example.com/rss-three.xml' },
];

for (const s of sources) {
  await db.orm.public.Source.upsert({
    create: s,
    update: { url: s.url },
    conflictOn: { name: s.name },
  });
}

console.log(`Seeded ${sources.length} sources`);
await db.close();   // without this the script never exits
```
Add to `package.json`: `"db:seed": "tsx src/scripts/seed.ts"`.
**Why `upsert`?** "Create it, or update it if it already exists": running the script twice won't crash or duplicate.
**Done when:** `npm run db:seed` twice → `SELECT * FROM "Source";` shows 3 rows, not 6.

### 2.6 · 🅰️ · Smoke script + database check in `/health`

**Smoke script** (proves the whole chain *contract → db.ts → database* works):
```ts
// src/scripts/db-smoke.ts
import { db } from '../prisma/db';
const sources = await db.orm.public.Source.all();
console.log(sources);
await db.close();
```
Run: `npx tsx src/scripts/db-smoke.ts` → you should see your seeded sources.

**Health with a database check:** in `health.controller.ts`:
```ts
import { db } from '../../prisma/db';

export async function getHealth(_req: FastifyRequest, reply: FastifyReply) {
  try {
    await db.orm.public.Source.limit(1).all();      // cheap "can we talk to the database?" test
    return reply.send({ status: 'ok', database: 'up' });
  } catch {
    return reply.status(503).send({ status: 'degraded', database: 'down' });
  }
}
```
**Done when:** stop PostgreSQL → `/health` answers `503`; start it → `200`.

### 2.7 · 🅱️ · Fixtures

**In simple words:** real-looking sample data saved as files, so we can build and test **without the internet and without waiting for Person A's ingestion**.
**How:** copy 10 real article titles and bodies (different topics: RBI, crude oil, gold, a big company result, a US Fed decision...) into `tests/fixtures/articles.json`:
```json
[
  { "source": "Provider One", "title": "…", "content": "…", "publishedAt": "2026-11-20T09:30:00Z", "url": "https://…" }
]
```
Include 2-3 articles about the **same** event from different providers (needed later to test clustering).
**Done when:** the file exists and has 10 entries, 2-3 of them about the same event.

---

## Phase 3: Ingestion (A) and AI analysis v1 (B) in parallel (about 1 week)

**In plain words:** A builds the "newspaper delivery" (articles arrive in the database every few minutes). B builds the "analyst" (gives a story to Gemini and gets a safe, validated answer back). They meet in Phase 4.

**Ingestion (A)**
- [ ] 3.1 🅰️ `source.adapter.ts` interface + `sources.registry.ts`
- [ ] 3.2 🅰️ `lib/hash.ts` + `lib/text.ts`
- [ ] 3.3 🅰️ `rss.adapter.ts`
- [ ] 3.4 🅰️ `articles.service.ts`: save only new articles
- [ ] 3.5 🅰️ `ingest.job.ts` + `scheduler.ts`
- [ ] 3.6 🅰️ `GET /sources` and `GET /articles`

**AI analysis (B)**
- [ ] 3.7 🅱️ `analysis.schema.ts` (zod)
- [ ] 3.8 🅱️ `gemini.client.ts`
- [ ] 3.9 🅱️ `prompts/v1.ts`
- [ ] 3.10 🅱️ `analysis.service.ts`: `analyzeStory()` + `saveAnalysis()`
- [ ] 3.11 🅱️ `scripts/analyze-fixture.ts`

### 3.1 · 🅰️ · Adapter interface + registry

**In simple words:** every news provider sends data in its own format. An **adapter** is a small translator. The rest of the app only knows the standard format, so adding provider #5 means adding one file and touching nothing else.
```ts
// modules/sources/source.adapter.ts
export interface RawArticle {
  title: string;
  url: string;
  content: string;
  publishedAt: Date;
}

export interface NewsSourceAdapter {
  readonly sourceId: number;
  fetchLatest(): Promise<RawArticle[]>;
}
```
```ts
// modules/sources/sources.registry.ts
import { db } from '../../prisma/db';
import { createRssAdapter } from './rss.adapter';
import type { NewsSourceAdapter } from './source.adapter';

export async function getActiveAdapters(): Promise<NewsSourceAdapter[]> {
  const sources = await db.orm.public.Source.where({ isActive: true }).all();
  const adapters: NewsSourceAdapter[] = [];
  for (const s of sources) {
    if (s.type === 'rss') adapters.push(createRssAdapter(s.id, s.url));
    // else: unknown type → skip it, don't crash the others
  }
  return adapters;
}
```
**TypeScript note:** an `interface` is a promise about shape. It exists only while compiling and disappears at runtime. That's why it costs nothing.
**Done when:** it compiles and `getActiveAdapters()` returns 3 adapters after seeding.

### 3.2 · 🅰️ · `lib/hash.ts` and `lib/text.ts`

**Why a hash?** The same article can show up as `…/story?utm_source=x` and `…/story/`. We clean the URL and turn it into a short fixed fingerprint. Same fingerprint = same article.
```ts
// lib/hash.ts
import { createHash } from 'node:crypto';

export function normalizeUrl(raw: string): string {
  const u = new URL(raw);
  u.hash = '';
  for (const key of [...u.searchParams.keys()]) {
    if (key.startsWith('utm_')) u.searchParams.delete(key);
  }
  return u.toString().replace(/\/$/, '');
}

export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
```
```ts
// lib/text.ts
export function cleanText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'has', 'have', 'will', 'its', 'after', 'amid', 'says']);

export function tokens(title: string): Set<string> {
  return new Set(
    title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

// 0 = nothing in common, 1 = identical word sets
export function jaccard(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  const union = a.size + b.size - shared;
  return union === 0 ? 0 : shared / union;
}
```
**Unit tests to write now (tests/unit/):**
- `normalizeUrl('https://a.com/x/?utm_source=t#top')` → `'https://a.com/x'`
- `sha256` of the same input twice is equal.
- `jaccard(tokens('RBI holds repo rate steady'), tokens('RBI keeps repo rate unchanged'))` ≈ 0.43 (3 shared words out of 7).

**Done when:** these tests pass.

### 3.3 · 🅰️ · `rss.adapter.ts`

**How:** install `npm i rss-parser`. One reusable adapter works for any RSS feed (you only need the URL).
```ts
import Parser from 'rss-parser';
import { cleanText } from '../../lib/text';
import type { NewsSourceAdapter } from './source.adapter';

const parser = new Parser({ timeout: 10_000 });

export function createRssAdapter(sourceId: number, url: string): NewsSourceAdapter {
  return {
    sourceId,
    async fetchLatest() {
      const feed = await parser.parseURL(url);
      return feed.items
        .filter((item) => item.title && item.link)
        .map((item) => ({
          title: cleanText(item.title!),
          url: item.link!,
          content: cleanText(item.content ?? item.contentSnippet ?? ''),
          publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
        }));
    },
  };
}
```
**Test it first by hand** (no database): a throwaway script that creates the adapter for one real feed URL, calls `fetchLatest()` and prints the first 3 items.
**Common mistake:** some feeds have no `content`, only a short description. That's fine; empty content is allowed (the title still carries the news).
**Done when:** the script prints clean titles and URLs from at least one real feed.

### 3.4 · 🅰️ · `articles.service.ts`: save only new articles

**In simple words:** we fetch the same feed every 5 minutes, so most items are already saved. We try to save everything, and the database quietly skips the ones it has already seen. The call hands back only the genuinely new rows.
```ts
// modules/articles/articles.service.ts
import { db } from '../../prisma/db';
import { normalizeUrl, sha256 } from '../../lib/hash';
import type { RawArticle } from '../sources/source.adapter';

export async function saveNewArticles(sourceId: number, raw: RawArticle[]) {
  if (raw.length === 0) return [];
  const rows = raw.map((a) => ({
    sourceId,
    storyId: null,                       // grouped into a story later (Phase 4)
    title: a.title,
    url: a.url,
    urlHash: sha256(normalizeUrl(a.url)),
    content: a.content,
    publishedAt: a.publishedAt,
  }));
  // Rows that break the unique urlHash are skipped; the result has ONLY the rows really inserted.
  return db.orm.public.Article.createAll(rows, { onConflict: 'skip', conflictOn: ['urlHash'] });
}

// Handy type for other files: "one row of what saveNewArticles returns"
export type SavedArticle = Awaited<ReturnType<typeof saveNewArticles>>[number];
```
**TypeScript note:** `Awaited<ReturnType<typeof f>>` means "whatever `f` gives back, after the promise is finished". We let TypeScript figure out the row type from the contract instead of writing it by hand, so it can never be out of date.
**Test it:** run it twice with the same input: first call returns N rows, second returns `[]`.
**Common mistake:** a feed that contains the same link twice *in one batch*. Handle by de-duplicating `rows` by `urlHash` before saving (use a `Map`).
**Done when:** the "run it twice" test passes.

### 3.5 · 🅰️ · `ingest.job.ts` + `scheduler.ts`

**In simple words:** a **job** is a function that runs by itself on a timer. `ingest.job.ts` = "visit every provider, save what's new". `scheduler.ts` = "run the jobs every N minutes".
```ts
// jobs/ingest.job.ts
import type { FastifyInstance } from 'fastify';
import { db } from '../prisma/db';
import { getActiveAdapters } from '../modules/sources/sources.registry';
import { saveNewArticles } from '../modules/articles/articles.service';

let running = false;     // stops a slow run from overlapping the next one

export async function runIngest(app: FastifyInstance) {
  if (running) return;
  running = true;
  try {
    for (const adapter of await getActiveAdapters()) {
      try {
        const raw = await adapter.fetchLatest();
        const added = await saveNewArticles(adapter.sourceId, raw);
        await db.orm.public.Source.where({ id: adapter.sourceId }).update({ lastFetchedAt: new Date() });
        app.log.info({ source: adapter.sourceId, fetched: raw.length, added: added.length }, 'ingest ok');
      } catch (err) {
        // one broken provider must never stop the others
        app.log.error({ err, source: adapter.sourceId }, 'ingest failed for this source');
      }
    }
  } finally {
    running = false;
  }
}
```
```ts
// jobs/scheduler.ts
import type { FastifyInstance } from 'fastify';
import { env } from '../config/env';
import { runIngest } from './ingest.job';

export function startScheduler(app: FastifyInstance) {
  if (env.NODE_ENV === 'test') return;                       // no timers during tests
  const every = (minutes: number, fn: () => Promise<void>) => setInterval(() => void fn(), minutes * 60_000);

  const timers = [every(env.INGEST_INTERVAL_MINUTES, () => runIngest(app))];
  void runIngest(app);                                        // also run once right now
  app.addHook('onClose', async () => timers.forEach(clearInterval));
}
```
In `main.ts` call `startScheduler(app)` before `app.listen`.
**Why isolate errors per source?** Providers go down. The pipeline must keep working with the others.
**Test it:** start the server, watch the logs: `ingest ok { fetched: 20, added: 20 }`, then 5 minutes later `added: 0` or a small number. Check `SELECT count(*) FROM "Article";`.
**Done when:** articles from at least 2 sources appear, and a deliberately broken URL in one `Source` doesn't stop the others.

### 3.6 · 🅰️ · `GET /sources` and `GET /articles`

**Why:** the first way to *look* at the data without opening `psql`.
```ts
// modules/articles/articles.schema.ts
import { z } from 'zod';
export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```
```ts
// modules/articles/articles.service.ts (add)
export async function listArticles(page: number, limit: number) {
  const items = await db.orm.public.Article
    .orderBy((a) => a.publishedAt.desc())
    .limit(limit)
    .offset((page - 1) * limit)
    .all();
  const { total } = await db.orm.public.Article.aggregate((a) => ({ total: a.count() }));
  return { items, total, page, limit };
}
```
```ts
// modules/articles/articles.controller.ts
export async function list(req: FastifyRequest, reply: FastifyReply) {
  const { page, limit } = listQuery.parse(req.query);   // bad input → zod error → 400 automatically
  return reply.send(await listArticles(page, limit));
}
```
```ts
// modules/articles/articles.routes.ts
export default async function articlesRoutes(app: FastifyInstance) {
  app.get('/', list);
}
```
Register in `app.ts`: `app.register(articlesRoutes, { prefix: '/articles' })`. Do the same for `/sources` (just `Source.all()`).
**Test it:** `curl "http://localhost:3000/articles?page=1&limit=5"` and `curl "http://localhost:3000/articles?limit=999"` (should be a `400`).
**Done when:** both endpoints work and the bad request gives a clean `400`.

### 3.7 · 🅱️ · `analysis.schema.ts`: the quality inspector for AI answers

**In simple words:** an AI model is an unreliable outside system: it can return broken JSON, wrong types, a score of 700. This schema says exactly what a **good** answer looks like, and anything else is rejected before it reaches our database.
```ts
// modules/analysis/analysis.schema.ts
import { z } from 'zod';

export const DirectionSchema = z.enum(['bullish', 'bearish', 'neutral']);

export const AnalysisOutputSchema = z.object({
  xFactor: z.string().min(10),
  primaryInstrument: z.string().min(1),          // e.g. "NIFTY 50", "GOLD", "CRUDE OIL"
  primaryDirection: DirectionSchema,
  impactScore: z.number().int().min(0).max(100),
  confidenceScore: z.number().int().min(0).max(100),
  reasoning: z.string().min(10),
});
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

// What we send TO the AI. Not a database row, so the AI code never depends on the database.
export interface StoryInput {
  headline: string;
  articles: { source: string; title: string; content: string; publishedAt: Date }[];
}
```
**TypeScript note:** `z.infer<typeof AnalysisOutputSchema>` makes the TypeScript type **from** the schema. You write the shape once; you get both runtime checking and compile-time types.
**Test it (unit):** valid object passes; `impactScore: 700` fails; missing `xFactor` fails.
**Done when:** those 3 tests pass.

### 3.8 · 🅱️ · `gemini.client.ts`

**Why a separate file?** It is the **only** file that knows Gemini exists. To switch AI providers later, change only this file.
**How:** `npm i @google/genai`
```ts
// modules/analysis/gemini.client.ts
import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export async function askGeminiJson(system: string, user: string): Promise<unknown> {
  const res = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: user,
    config: { systemInstruction: system, responseMimeType: 'application/json', temperature: 0.2 },
  });
  const text = (res.text ?? '').replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(text);              // returns `unknown` on purpose: we don't trust it yet
}
```
**Why return `unknown`?** TypeScript then forces us to validate it with zod before using it. Using `any` would silently let bad data through.
**Test it:** a throwaway script: `askGeminiJson('Reply as JSON {"ok":true}', 'ping')` prints `{ ok: true }`.
**Done when:** the call works with your real key. (Never commit the key. `.env` stays in `.gitignore`.)

### 3.9 · 🅱️ · `prompts/v1.ts`: versioned prompts

**In simple words:** the prompt is our "recipe". We keep each version in its own file so we can later compare "did v3 predict better than v2?" in the backtest.
```ts
// modules/analysis/prompts/v1.ts
import type { StoryInput } from '../analysis.schema';

export const PROMPT_VERSION = 'v1';

export const SYSTEM = `You are a careful financial news analyst for Indian and global markets.
Read the news about ONE event. Find the X-factor: the single fact that makes this matter NOW,
beyond the headline. Then estimate the most realistic market impact.
Rules:
- Use only facts from the articles. If unsure, lower the confidence.
- confidenceScore is how sure you are (0-100). Do not be overconfident.
- impactScore is how big the market effect could be (0-100).
Reply with ONLY JSON in this exact shape:
{"xFactor": string, "primaryInstrument": string, "primaryDirection": "bullish"|"bearish"|"neutral",
 "impactScore": number, "confidenceScore": number, "reasoning": string}`;

export function buildUserPrompt(story: StoryInput, previousError?: unknown): string {
  const articles = story.articles
    .map((a, i) => `[${i + 1}] ${a.source} (${a.publishedAt.toISOString()})\n${a.title}\n${a.content.slice(0, 1500)}`)
    .join('\n\n');
  const fix = previousError ? `\n\nYour previous answer was invalid: ${String(previousError).slice(0, 300)}. Fix it.` : '';
  return `Event: ${story.headline}\n\n${articles}${fix}`;
}
```
**Tips:** cut each article to ~1500 characters (cheaper, faster). Never put secrets in prompts.
**Done when:** the file compiles and the prompt, printed for one fixture, reads sensibly.

### 3.10 · 🅱️ · `analysis.service.ts`

**In simple words:** two functions. `analyzeStory` = ask the AI and validate (no database). `saveAnalysis` = store the result. Keeping them apart means you can test the AI part with fixtures and no database.
```ts
// modules/analysis/analysis.service.ts
import { db } from '../../prisma/db';
import { ExternalServiceError } from '../../lib/errors';
import { env } from '../../config/env';
import { askGeminiJson } from './gemini.client';
import { AnalysisOutputSchema, type AnalysisOutput, type StoryInput } from './analysis.schema';
import { SYSTEM, buildUserPrompt, PROMPT_VERSION } from './prompts/v1';

export async function analyzeStory(story: StoryInput): Promise<AnalysisOutput> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {          // one retry, telling the AI what was wrong
    try {
      const raw = await askGeminiJson(SYSTEM, buildUserPrompt(story, lastError));
      return AnalysisOutputSchema.parse(raw);               // throws if the shape is wrong
    } catch (err) {
      lastError = err;
    }
  }
  throw new ExternalServiceError(`AI analysis failed: ${String(lastError).slice(0, 200)}`);
}

export async function saveAnalysis(storyId: number, out: AnalysisOutput) {
  return db.transaction(async (tx) => {
    const analysis = await tx.orm.public.Analysis.create({
      storyId,
      xFactor: out.xFactor,
      primaryInstrument: out.primaryInstrument,
      primaryDirection: out.primaryDirection,
      impactScore: out.impactScore,
      confidenceScore: out.confidenceScore,
      reasoning: out.reasoning,
      edgeCases: [],                                        // filled from prompt v2 onwards
      aiModel: env.GEMINI_MODEL,
      promptVersion: PROMPT_VERSION,
    });
    // copy the headline numbers onto the story so list pages stay simple
    await tx.orm.public.Story.where({ id: storyId }).update({
      analysisStatus: 'done',
      direction: out.primaryDirection,
      impactScore: out.impactScore,
      confidenceScore: out.confidenceScore,
      primaryInstrument: out.primaryInstrument,
      analyzedAt: new Date(),
    });
    return analysis;
  });
}
```
**Why a transaction?** Two tables change. Either both change or neither does, so we never get an analysis with a story still saying "pending".
**Why `tx` and not `db` inside?** Inside the transaction, only `tx` is part of it.
**Done when:** a unit test with a *mocked* `askGeminiJson` returning bad JSON first and good JSON second passes (proves the retry), and one returning bad JSON twice throws `ExternalServiceError`.

### 3.11 · 🅱️ · `scripts/analyze-fixture.ts`

**In simple words:** a one-command way to try your prompt on the saved sample articles. You will run this 50 times while improving the prompt, so make it fast and database-free.
```ts
// src/scripts/analyze-fixture.ts
import { readFileSync } from 'node:fs';
import { analyzeStory } from '../modules/analysis/analysis.service';

const items = JSON.parse(readFileSync('tests/fixtures/articles.json', 'utf8'));
const pick = items.slice(0, 3);                        // 3 articles about one event
const result = await analyzeStory({
  headline: pick[0].title,
  articles: pick.map((a: any) => ({ source: a.source, title: a.title, content: a.content, publishedAt: new Date(a.publishedAt) })),
});
console.dir(result, { depth: null });
```
`package.json`: `"analyze:fixture": "tsx src/scripts/analyze-fixture.ts"`.
**Done when:** `npm run analyze:fixture` prints a valid analysis for at least 5 different fixtures (change `slice`) with sensible instruments and scores.

---

## Phase 4: Stories and the full automatic pipeline (about 1 week)

**In plain words:** connect the two halves. Articles get grouped into stories, stories get analysed automatically, and prompts get smarter.

- [ ] 4.1 🅰️ `clustering.ts`: decide if two titles are the same event
- [ ] 4.2 🅰️ `stories.service.ts`: assign new articles to stories (+ hook into the ingest job)
- [ ] 4.3 🅰️ Add 2-4 more news sources
- [ ] 4.4 🅰️ `consistency.ts`: confirmed / single source / conflicting
- [ ] 4.5 🅱️ `analyze.job.ts`: analyse pending stories automatically
- [ ] 4.6 🅱️ Prompt v2 (edge cases + conflicts) and v3 (scenarios)
- [ ] 4.7 🅱️ Cost control: wait, skip, budget
- [ ] 4.8 🤝 Pipeline integration test with fixtures

### 4.1 · 🅰️ · `clustering.ts`

**In simple words:** "Are these two headlines about the same event?" We compare their important words. If enough words match, it's the same story.
```ts
// modules/stories/clustering.ts
import { tokens, jaccard } from '../../lib/text';

export const SAME_STORY_THRESHOLD = 0.4;     // tune with your fixtures (try 0.3 to 0.5)

export function bestMatch<T extends { headline: string }>(title: string, stories: T[]) {
  const t = tokens(title);
  let best: T | null = null;
  let bestScore = 0;
  for (const s of stories) {
    const score = jaccard(t, tokens(s.headline));
    if (score > bestScore) { best = s; bestScore = score; }
  }
  return bestScore >= SAME_STORY_THRESHOLD ? best : null;
}
```
**Example:** "RBI holds repo rate steady" vs "RBI keeps repo rate unchanged" → 0.43 ≥ 0.4 → same story. "RBI holds repo rate steady" vs "Gold jumps on weak dollar" → 0 → different.
**Tuning:** too low a threshold glues different events together; too high splits one event into many. Use your fixtures (2-3 same-event articles + several different ones) and write unit tests for **both** sides.
**Be honest about the limits:** this is a simple v1. Later you can upgrade to embeddings.
**Done when:** unit tests: same-event pairs match, different-event pairs don't.

### 4.2 · 🅰️ · `stories.service.ts`: assign new articles to stories

**In simple words:** for each brand-new article, look at stories from the last 24 hours. If one matches, join it. Otherwise start a new story. Then refresh the story's source count.
```ts
// modules/stories/stories.service.ts
import { db } from '../../prisma/db';
import { bestMatch } from './clustering';
import type { SavedArticle } from '../articles/articles.service';

export async function assignToStories(newArticles: SavedArticle[]) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await db.orm.public.Story.where((s) => s.lastSeenAt.gte(since)).all();
  const touched = new Set<number>();

  for (const article of newArticles) {
    const match = bestMatch(article.title, recent);
    let storyId: number;
    if (match) {
      storyId = match.id;
      await db.orm.public.Story.where({ id: storyId }).update({ lastSeenAt: new Date() });
    } else {
      const story = await db.orm.public.Story.create({ headline: article.title });
      // if TypeScript says a nullable field is missing, pass it as null
      recent.push(story);
      storyId = story.id;
    }
    await db.orm.public.Article.where({ id: article.id }).update({ storyId });
    touched.add(storyId);
  }
  for (const id of touched) await refreshSourceCount(id);
}

async function refreshSourceCount(storyId: number) {
  const rows = await db.orm.public.Article.where({ storyId }).select('sourceId').all();
  const sourceCount = new Set(rows.map((r) => r.sourceId)).size;      // distinct providers
  await db.orm.public.Story.where({ id: storyId }).update({
    sourceCount,
    consistency: sourceCount >= 2 ? 'confirmed' : 'single_source',
  });
}
```
**Hook into the ingest job:** in `ingest.job.ts`, after `saveNewArticles`, call `await assignToStories(added)`. Because `added` holds **only new** rows, it's cheap.
**Common mistake:** forgetting `recent.push(story)`. Then two new articles about the same event in one batch create two stories.
**Test it:** run ingest twice. `SELECT id, headline, "sourceCount" FROM "Story" ORDER BY id;` → duplicates of one event should show `sourceCount` ≥ 2.
**Done when:** a story with articles from 2+ providers exists, and re-running doesn't create duplicate stories.

### 4.3 · 🅰️ · More sources

**How:** add 2-4 more RSS rows in `seed.ts` (re-run `npm run db:seed`). Because of the adapter design, **no other code changes**. Choose providers that publish markets/business news; check each one's terms of use before using the feed.
**Done when:** 3-5 active sources, all showing `ingest ok` in the logs.

### 4.4 · 🅰️ · `consistency.ts`

**In simple words:** a safety label on every story: seen by one provider only (`single_source`), confirmed by several (`confirmed`), or providers disagree (`conflicting`).
```ts
// modules/stories/consistency.ts
export type Consistency = 'confirmed' | 'single_source' | 'conflicting';

export function decideConsistency(sourceCount: number, aiSaysConflict: boolean): Consistency {
  if (aiSaysConflict) return 'conflicting';
  return sourceCount >= 2 ? 'confirmed' : 'single_source';
}
```
`refreshSourceCount` (4.2) should call it with `aiSaysConflict = false`. After prompt v2 (4.6), `saveAnalysis` re-evaluates with the AI's `conflictingClaims` flag.
**Done when:** a table-driven unit test covers all 3 outputs.

### 4.5 · 🅱️ · `analyze.job.ts`

**In simple words:** every few minutes, find stories waiting for analysis, analyse them one by one, mark them `done` or `failed`.
```ts
// jobs/analyze.job.ts
import type { FastifyInstance } from 'fastify';
import { db } from '../prisma/db';
import { analyzeStory, saveAnalysis } from '../modules/analysis/analysis.service';

let running = false;

export async function runAnalyze(app: FastifyInstance) {
  if (running) return;
  running = true;
  try {
    const waitUntil = new Date(Date.now() - 10 * 60_000);       // give other providers 10 minutes to report
    const pending = await db.orm.public.Story
      .where({ analysisStatus: 'pending' })
      .where((s) => s.firstSeenAt.lte(waitUntil))
      .orderBy((s) => s.firstSeenAt.asc())
      .limit(5)                                                  // small batches protect the AI budget
      .all();

    for (const story of pending) {
      try {
        const articles = await db.orm.public.Article.where({ storyId: story.id }).all();
        const sources = await db.orm.public.Source.all();
        const nameOf = new Map(sources.map((s) => [s.id, s.name]));
        const out = await analyzeStory({
          headline: story.headline,
          articles: articles.map((a) => ({
            source: nameOf.get(a.sourceId) ?? 'unknown', title: a.title, content: a.content, publishedAt: a.publishedAt,
          })),
        });
        await saveAnalysis(story.id, out);
        app.log.info({ storyId: story.id }, 'analysis saved');
      } catch (err) {
        app.log.error({ err, storyId: story.id }, 'analysis failed');
        await db.orm.public.Story.where({ id: story.id }).update({ analysisStatus: 'failed' });
      }
    }
  } finally {
    running = false;
  }
}
```
Add to `scheduler.ts`: `every(env.ANALYZE_INTERVAL_MINUTES, () => runAnalyze(app))`.
**Check:** if `publishedAt` comes back as a string instead of a `Date` (depends on how the contract was created), wrap it: `new Date(a.publishedAt)`.
**Done when:** a new story turns from `pending` to `done` by itself, with an `Analysis` row.

### 4.6 · 🅱️ · Prompt v2 and v3

**v2: edge cases and conflicts.** Create `prompts/v2.ts` (copy v1, bump `PROMPT_VERSION = 'v2'`). Ask additionally for:
- `edgeCases`: 2-4 short second-order effects (regulatory reaction, competitor reaction, supply-chain ripple).
- `conflictingClaims`: `true` if the articles disagree on key facts.
Add both to the zod schema (`edgeCases: z.array(z.string()).default([])`, `conflictingClaims: z.boolean().default(false)`), save `edgeCases` in `saveAnalysis`, and pass `conflictingClaims` to `decideConsistency`.

**v3: scenarios.** Create `prompts/v3.ts` ('v3'). Ask for `scenarios`: 2-3 entries `{instrument, direction, probability, reasoning}` for the main instrument; probabilities must add up to 1. Enforce with zod:
```ts
const ScenarioSchema = z.object({
  instrument: z.string(), direction: DirectionSchema,
  probability: z.number().min(0).max(1), reasoning: z.string(),
});
// in AnalysisOutputSchema:
scenarios: z.array(ScenarioSchema).min(2).max(4)
  .refine((s) => Math.abs(s.reduce((sum, x) => sum + x.probability, 0) - 1) < 0.05, 'probabilities must add up to 1'),
```
Save scenarios **in the same nested create** as the analysis (this runs as one safe unit):
```ts
const analysis = await tx.orm.public.Analysis.create({
  /* ...same fields... */
  scenarios: (s) => s.create(out.scenarios.map((x) => ({
    instrument: x.instrument, direction: x.direction, probability: x.probability, reasoning: x.reasoning,
  }))),
});
```
**Rule:** never edit an old prompt file, always add a new version. Old analyses keep their `promptVersion`, so Phase 7 can compare versions fairly.
**Done when:** `npm run analyze:fixture` shows edge cases and scenarios whose probabilities add up to 1; bad sums are rejected (unit test).

### 4.7 · 🅱️ · Cost control

**In simple words:** AI calls cost money and have rate limits. Three cheap protections:
1. **Wait** (already in 4.5): analyse a story only 10 minutes after it first appeared, so extra sources can join and we analyse once.
2. **Skip low value:** don't analyse stories whose titles/content have no market relevance. A simple version: a keyword list (rbi, repo, inflation, crude, gold, nifty, sensex, fed, earnings…). If no keyword matches, set `analysisStatus = 'skipped'`. Start simple, improve later.
3. **Daily budget:** count analyses created today (`Analysis.where((a) => a.createdAt.gte(startOfToday)).aggregate(...)`); stop when it reaches `MAX_ANALYSES_PER_DAY` (new env variable).
Also log how long each AI call takes.
**Done when:** with the budget set to 2, the third pending story waits until tomorrow, and the log says why.

### 4.8 · 🤝 · Pipeline integration test

**In simple words:** feed the 10 fixture articles in through the same functions the jobs use, with the AI mocked, and check the database at the end.
**How:** (use a separate test database, set via `DATABASE_URL` for tests)
1. Call `saveNewArticles` with the fixtures, then `assignToStories(added)`.
2. Assert: the 2-3 same-event fixtures became **one** story with `sourceCount ≥ 2`.
3. Mock `askGeminiJson`, run `runAnalyze`, assert the story is `done` and has an analysis.
**Done when:** the test is green in CI.

---

## Phase 5: REST API → Backend MVP (about 1 week)

**In plain words:** everything a future frontend needs is available through clear, tested URLs. When this phase is ticked, **the backend MVP is done.**

- [ ] 5.1 🅰️ `lib/http.ts`: shared pagination helper
- [ ] 5.2 🅱️ `GET /stories`: list with filters
- [ ] 5.3 🅱️ `GET /stories/:id`: full detail
- [ ] 5.4 🅱️ Settings: add `Setting` model, `GET/PUT /settings`
- [ ] 5.5 🅱️ `POST /analysis/:storyId/rerun`
- [ ] 5.6 🅰️ CORS plugin + `docs/api.md`
- [ ] 5.7 🤝 Integration tests for every endpoint

### 5.1 · 🅰️ · `lib/http.ts`

**Why:** every list endpoint needs the same `page`/`limit` handling. Write it once.
```ts
import { z } from 'zod';
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const offsetOf = (page: number, limit: number) => (page - 1) * limit;
```
Update `articles.schema.ts` to reuse it.
**Done when:** `/articles` still works and uses the shared helper.

### 5.2 · 🅱️ · `GET /stories`

**Idea:** because the key numbers live on `Story`, filtering is one table. Use "filters that match everything by default", so the query's shape never changes.
```ts
// modules/stories/stories.schema.ts
export const storiesQuery = paginationQuery.extend({
  direction: DirectionSchema.optional(),
  instrument: z.string().optional(),
  minConfidence: z.coerce.number().int().min(0).max(100).default(0),
  minImpact: z.coerce.number().int().min(0).max(100).default(0),
  from: z.coerce.date().default(new Date(0)),
  to: z.coerce.date().default(() => new Date()),
});
```
```ts
// stories.service.ts
export async function listStories(q: z.infer<typeof storiesQuery>) {
  const directions = q.direction ? [q.direction] : ['bullish', 'bearish', 'neutral'];
  const base = db.orm.public.Story
    .where({ analysisStatus: 'done' })
    .where((s) => s.confidenceScore.gte(q.minConfidence))
    .where((s) => s.impactScore.gte(q.minImpact))
    .where((s) => s.direction.in(directions))
    .where((s) => s.lastSeenAt.gte(q.from))
    .where((s) => s.lastSeenAt.lte(q.to));
  const items = await base.orderBy((s) => s.lastSeenAt.desc()).limit(q.limit).offset(offsetOf(q.page, q.limit)).all();
  const { total } = await base.aggregate((a) => ({ total: a.count() }));
  return { items, total, page: q.page, limit: q.limit };
}
```
Handle `instrument` the same way (case-insensitive match with `s.primaryInstrument.ilike(...)`, default `'%'`). Each `.where(...)` adds an AND.
**Common mistake:** `z.coerce.date()` turns a missing value into "now". That's why `from` and `to` have explicit defaults.
**Test it:** `curl "…/stories?direction=bullish&minConfidence=60&limit=5"`.
**Done when:** filters combine correctly and an invalid `direction=up` gives a `400`.

### 5.3 · 🅱️ · `GET /stories/:id`

**How:** four small, readable queries (no clever joins):
```ts
export async function getStoryDetail(id: number) {
  const story = await db.orm.public.Story.first({ id });
  if (!story) throw new NotFoundError('Story');
  const articles = await db.orm.public.Article.where({ storyId: id }).orderBy((a) => a.publishedAt.desc()).all();
  const analysis = await db.orm.public.Analysis.where({ storyId: id }).orderBy((a) => a.createdAt.desc()).first();
  const scenarios = analysis ? await db.orm.public.Scenario.where({ analysisId: analysis.id }).all() : [];
  return { story, articles, analysis, scenarios };
}
```
Validate the id with zod: `z.coerce.number().int().positive()`.
**Later optimisation:** Prisma 8 has `.include('articles')` for related rows in one query. Not needed yet, so skip it.
**Done when:** a real id returns everything; an unknown id returns the standard `404` JSON.

### 5.4 · 🅱️ · Settings

**Why:** alert thresholds must be changeable without redeploying.
1. Add to the contract and run the 4-command loop (rule 3.5):
```prisma
model Setting {
  id                 Int      @id
  minImpact          Int      @default(70)
  minConfidence      Int      @default(60)
  watchedInstruments String[]
  channels           String[]
}
```
2. Seed row 1 in `seed.ts` (`upsert` with `conflictOn: { id: 1 }`).
3. `GET /settings` → `Setting.first({ id: 1 })`. `PUT /settings` → validate with zod, then `Setting.where({ id: 1 }).update(body)`.
**Done when:** changing `minImpact` through `PUT` is visible in the next `GET`.

### 5.5 · 🅱️ · Re-run an analysis

**Why:** when you improve a prompt you want to re-test one story without waiting.
`POST /analysis/:storyId/rerun` → load story + articles (same as the job) → `analyzeStory` → `saveAnalysis`. A **new** `Analysis` row is added (old ones stay for comparison); the story's copied numbers update.
**Done when:** after a re-run, `GET /stories/:id` shows the newer analysis.

### 5.6 · 🅰️ · CORS and API notes

1. `npm i @fastify/cors` and register it in `plugins/security.ts` with `origin: env.CORS_ORIGIN`. Without CORS, the future React app on another port will be blocked by the browser.
2. Write `docs/api.md`: for each endpoint list URL, query parameters, an example response. Copy-paste real `curl` output. This is the "manual" the frontend will use.
**Done when:** `curl -H "Origin: http://localhost:5173" -i http://localhost:3000/health` shows an `access-control-allow-origin` header.

### 5.7 · 🤝 · Integration tests for every endpoint

For each route: one success test, one bad-input test, one "not found" test, using `app.inject`. Seed what you need inside the test. Run in CI.
**Done when:** CI is green. 🎉 **Backend MVP reached. Tick the Phase 5 box in the tracker.**

---

## Phase 6: Alerts and live updates (about 1 week)

**In plain words:** don't make people refresh. When something big and trustworthy appears, tell them.

- [ ] 6.1 🅱️ `alerts.rules.ts` + unit tests
- [ ] 6.2 🅰️ `Alert` model + `alerts.service.ts` (store + avoid repeats)
- [ ] 6.3 🅱️ `plugins/sse.ts` + `GET /alerts/stream`
- [ ] 6.4 🅰️ One real channel: Telegram bot (`notifier.ts`)
- [ ] 6.5 🤝 Wire alerts into `analyze.job.ts`
- [ ] 6.6 🅰️ `GET /alerts` history

### 6.1 · 🅱️ · `alerts.rules.ts`

**In simple words:** one pure function that answers "is this worth a notification?". Pure = no database, easy to test.
```ts
export function shouldAlert(
  story: { impactScore: number | null; confidenceScore: number | null; consistency: string },
  settings: { minImpact: number; minConfidence: number },
): boolean {
  if (story.impactScore === null || story.confidenceScore === null) return false;
  return (
    story.impactScore >= settings.minImpact &&
    story.confidenceScore >= settings.minConfidence &&
    story.consistency !== 'conflicting'
  );
}
```
**Tests (table-driven):** high+high → true; high impact but low confidence → false; `conflicting` → false; nulls → false.
**Done when:** the tests pass.

### 6.2 · 🅰️ · `Alert` model + `alerts.service.ts`

1. Contract (then the 4-command loop):
```prisma
model Alert {
  id         Int      @id @default(autoincrement())
  storyId    Int
  analysisId Int
  channel    String
  status     String                 // sent | failed
  sentAt     DateTime @default(now())

  @@index([storyId, sentAt])
}
```
2. Service: `maybeAlert(storyId)` → load story + settings → `shouldAlert`? → **recently alerted?** (same `storyId`, `sentAt` within 6 hours, no repeat) → send via notifier → store an `Alert` row.
```ts
const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
const already = await db.orm.public.Alert.where({ storyId }).where((a) => a.sentAt.gte(since)).first();
if (already) return;
```
**Done when:** calling `maybeAlert` twice for one story creates **one** `Alert` row.

### 6.3 · 🅱️ · SSE: live stream

**In simple words:** a normal request ends. An SSE request stays **open**, and the server writes a new line whenever something happens. The browser's `EventSource` listens.
```ts
// plugins/sse.ts
import type { FastifyReply } from 'fastify';
const clients = new Set<FastifyReply>();

export function addClient(reply: FastifyReply) { clients.add(reply); }
export function removeClient(reply: FastifyReply) { clients.delete(reply); }
export function broadcast(event: string, data: unknown) {
  for (const r of clients) r.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
```
```ts
// alerts.routes.ts
app.get('/stream', (req, reply) => {
  reply.hijack();                                        // "I'll write the response myself"
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': env.CORS_ORIGIN,      // hijacked replies skip the CORS plugin
  });
  reply.raw.write(': connected\n\n');
  addClient(reply);
  req.raw.on('close', () => removeClient(reply));
});
```
**Test it:** `curl -N http://localhost:3000/alerts/stream` stays open; call `broadcast('alert', { hello: 1 })` from a test script (or a temporary route) and see the message appear.
**Done when:** a broadcast reaches two open `curl -N` windows at once.

### 6.4 · 🅰️ · Telegram channel

**In simple words:** a free way to get a real notification on your phone.
1. In Telegram, talk to `@BotFather`, create a bot, copy the **token**. Send your bot a message, then find your **chat id** (the Bot API method `getUpdates` shows it).
2. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to `env.ts` and `.env.example` (make them optional so the app works without them).
```ts
// modules/alerts/channels/telegram.ts
import { env } from '../../../config/env';

export async function sendTelegram(text: string) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }),
  });
  if (!res.ok) throw new Error(`Telegram error ${res.status}`);
}
```
`notifier.ts` has one function `notify(message)` that calls every enabled channel (SSE broadcast + Telegram), so adding email later means one more line.
**Message example:** `📈 BULLISH NIFTY BANK · impact 72 · confidence 64\nRBI holds repo rate steady\nX-factor: ...`
**Never** put the token in code or Git.
**Done when:** a test alert arrives on your phone.

### 6.5 · 🤝 · Wire alerts into the job

In `analyze.job.ts`, right after `saveAnalysis(...)`: `await maybeAlert(story.id)`. Wrap it in its own `try/catch` so a failed notification never marks the **analysis** as failed.
**Done when:** a seeded high-impact story produces a phone message and a live SSE event, once.

### 6.6 · 🅰️ · `GET /alerts`

Paginated history (newest first) using `paginationQuery`. Same pattern as `/articles`.
**Done when:** it lists the alerts created in 6.5.

---

## Phase 7: Backtesting and calibration (about 1-2 weeks)

**In plain words:** "70% confident" is only a number we made up until we check how often we are right. This phase builds that check.

- [ ] 7.1 🅰️ Choose a price source + `Price` model + `market-data.client.ts`
- [ ] 7.2 🅰️ Price job: store prices regularly
- [ ] 7.3 🅰️ `Outcome` model + `outcome.service.ts` + `outcome.job.ts`
- [ ] 7.4 🅱️ `stats.service.ts` + `GET /backtest/summary`
- [ ] 7.5 🅱️ Calibration report

### 7.1 · 🅰️ · Price source

1. **Decide the instruments** you track (e.g. NIFTY 50, NIFTY BANK, GOLD, CRUDE OIL) and make the analysis prompt choose from this list (put the list in the prompt as `primaryInstrument` allowed values).
2. **Pick a market-data provider** that has a free tier and allows your use. Read its limits and terms **before** coding. Put the key in `.env`.
3. Contract (then the 4-command loop):
```prisma
model Price {
  id         Int      @id @default(autoincrement())
  instrument String
  price      Float
  at         DateTime

  @@unique([instrument, at])
  @@index([instrument, at])
}
```
4. `market-data.client.ts` exposes one function: `fetchLatestPrice(instrument): Promise<number>`. Hide the provider's format here, like an adapter.
**Done when:** a script prints today's price for each instrument.

### 7.2 · 🅰️ · Price job

Every N minutes (market hours matter, so start with every 30 minutes) save one `Price` row per instrument. Use `createAll(..., { onConflict: 'skip' })` or `upsert` so re-runs don't duplicate. Add it to `scheduler.ts`.
**Done when:** the `Price` table grows during the day.

### 7.3 · 🅰️ · Outcomes

Contract:
```prisma
model Outcome {
  id               Int      @id @default(autoincrement())
  analysisId       Int
  instrument       String
  horizon          String                 // "1h" | "4h" | "1d"
  priceAtAnalysis  Float
  priceAfter       Float
  actualDirection  String
  wasCorrect       Boolean
  checkedAt        DateTime @default(now())

  @@unique([analysisId, horizon])
}
```
**Logic (`outcome.service.ts`):** for every analysis older than the horizon that has no outcome yet:
1. `priceAtAnalysis` = latest `Price` at or before `analysis.createdAt`; `priceAfter` = latest `Price` at or before `createdAt + horizon`. No price yet? Skip it, try again next run.
2. `changePct = (after - before) / before * 100`.
3. `actualDirection`: `> +0.3` → `bullish`, `< -0.3` → `bearish`, otherwise `neutral` (the 0.3 threshold goes in one named constant).
4. `wasCorrect = actualDirection === analysis.primaryDirection`.
5. `Outcome.createAll([...], { onConflict: 'skip', conflictOn: ['analysisId', 'horizon'] })`.
**Test it:** unit-test the pure part (given two prices + a prediction → outcome) with at least 6 cases, including the edge near ±0.3.
**Done when:** `Outcome` rows appear by themselves for old analyses.

### 7.4 · 🅱️ · Stats

**How:** for the MVP, fetch outcomes and compute in plain TypeScript (simple and clear):
```ts
const outcomes = await db.orm.public.Outcome.all();       // fine until you have many thousands
const rate = (xs: typeof outcomes) => xs.length ? xs.filter((o) => o.wasCorrect).length / xs.length : null;
```
`GET /backtest/summary` returns: overall hit-rate per horizon, hit-rate by instrument, and hit-rate by confidence bucket (0-39, 40-59, 60-79, 80-100). Join `Outcome` → `Analysis` in code for the confidence.
**Done when:** the endpoint returns sensible numbers on test data. Remember: ten outcomes prove nothing. Show the **count** next to every rate.

### 7.5 · 🅱️ · Calibration

**In simple words:** compare "what we *said*" with "what happened". If answers with confidence 80 are right only 50% of the time, our confidence numbers are too optimistic.
**How:** per confidence bucket compute `average stated confidence` vs `actual hit-rate`. Write the findings in `docs/calibration.md`. If we're overconfident, add a correction when saving (for example scale the AI's confidence by the measured factor, and reduce it further for `single_source` stories). Record the rule in the prompt version notes.
**Done when:** a written report exists and any correction is a small, tested function.

---

## Phase 8: Hardening and deployment (about 1 week)

- [ ] 8.1 🅰️ Security: helmet + rate limit
- [ ] 8.2 🅰️ Simple authentication (API key)
- [ ] 8.3 🅱️ Logging, readiness, graceful shutdown
- [ ] 8.4 🅱️ Failure drills
- [ ] 8.5 🅰️ Deploy (Docker) + migration step
- [ ] 8.6 🤝 Final docs and handover

### 8.1 · 🅰️ · helmet + rate limit
`npm i @fastify/helmet @fastify/rate-limit`. Register both in `plugins/security.ts`: helmet adds safe headers; rate-limit stops one client from hammering the API (for example 100 requests a minute).
**Done when:** the 101st request in a minute gets `429`.

### 8.2 · 🅰️ · API key
A Fastify `onRequest` hook that checks the `x-api-key` header against `env.API_KEY` (use `crypto.timingSafeEqual`), skipping `/health`. Wrong or missing key → `401` with the standard error JSON. Remember: the SSE stream also needs a way to authenticate later (the browser's `EventSource` can't set headers; plan a short-lived token or cookie when the frontend arrives).
**Done when:** no key → `401`, right key → `200`.

### 8.3 · 🅱️ · Logging and shutdown
- Fastify already logs with pino. Make sure every `catch` logs the error with context (`storyId`, `sourceId`).
- `/health` (alive) vs a `/ready` check (database up + at least one source fetched in the last hour).
- On `SIGTERM` (Docker stop): `await app.close()`, which fires our `onClose` hooks (stop timers, `db.close()`).
**Done when:** `docker stop` finishes in a second or two with no errors in the logs.

### 8.4 · 🅱️ · Failure drills
Break things **on purpose** and watch what happens: wrong Gemini key; one RSS URL returning 404; stop PostgreSQL for a minute; Gemini returns garbage text. Expected: the server stays up, errors are logged once each, other sources keep working, stories go `failed` instead of looping forever. Write down anything surprising and fix it.
**Done when:** each drill has a one-line result in `docs/failure-drills.md`.

### 8.5 · 🅰️ · Deploy
1. Pick a host that runs Docker containers and PostgreSQL.
2. Production database: apply migrations with the Prisma command that takes a connection string: `npx prisma db migrate --db "$PRODUCTION_DATABASE_URL"` (no `--advance-ref`, that's only for local development databases).
3. Set the environment variables on the host (never bake secrets into the image). Remember `host.docker.internal` is **only** for your own laptop.
**Done when:** the public `/health` answers and one real ingest + analysis cycle completes online.

### 8.6 · 🤝 · Final docs
Update the backend `README.md`: how to run, how to change the database (section 3.2), env variables, how to add a news source (one adapter file), how to add a prompt version. Tick the last box. Celebrate. 🎉

---

## 5. Risks to keep an eye on

| Risk | What to do |
|---|---|
| Prisma 8 is still a release candidate | Pinned versions, upgrade deliberately, read each release's upgrade notes |
| AI makes things up or returns broken JSON | zod validation, one retry, `failed` status, cross-source check, confidence shown to users |
| AI cost and rate limits | wait before analysing, skip irrelevant stories, daily budget, small batches |
| News feeds' terms of use / scraping | prefer official RSS or APIs, read each provider's terms |
| Clustering is simple (word overlap) | test with fixtures, tune the threshold, upgrade to embeddings later |
| Jobs run inside the web server | fine for one instance; if you ever run 2 copies, each runs the jobs, so move jobs to their own process first |
| Market predictions can be wrong | always show confidence + "not financial advice" in the future UI |
| Merge conflicts between us | folder ownership, small PRs, rebase daily, contract rules (3.5) |

## 6. Definition of done (for every task)

- [ ] Code compiles with `strict` TypeScript, no unexplained `any`
- [ ] `lint`, `typecheck` and `test` pass in CI
- [ ] Anything from outside (HTTP input, env, AI output) is validated with zod
- [ ] Errors use `AppError` or are logged with context, never silently swallowed
- [ ] The other person reviewed the PR
- [ ] The box in this file is ticked, and docs are updated if something changed

## 7. Daily rhythm for two people

1. **Morning, 10 minutes:** done yesterday / doing today / blocked by. Say aloud if you plan to change the contract.
2. `git pull`, `npm install`, `npx prisma db migrate --advance-ref db` (if migrations changed).
3. Work in small branches: `feat/<module>-<what>`, Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`).
4. Open a PR early, review the other person's PR **before** starting new work.
5. **End of day:** tick finished boxes, push, and leave a one-line note of what's next.