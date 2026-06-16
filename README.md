# 🟣 Lux Cipher — AI Chat Web

A production-ready multi-model AI chat web app with a **Yeumoney** token-gating system. Built with Next.js 14, TypeScript, Prisma, and TailwindCSS. Deploy-ready on Railway.

> **You can run the entire app with three secrets.** Drop your AI API key, your Yeumoney API key, and a JWT secret into `.env`, then `npm install && npm run dev`. No database setup required for local dev (SQLite), no Redis required (in-memory fallback).

---

## ⚡ Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router, Edge middleware) |
| Language | TypeScript (strict) |
| UI | React 18 + TailwindCSS + custom design system |
| DB | Prisma ORM (SQLite default, PostgreSQL optional) |
| Cache / Rate-limit | Redis (optional) or in-memory fallback |
| Auth | JWT (jose) + bcrypt + httpOnly cookies |
| Streaming | Server-Sent Events |
| Validation | Zod on every endpoint |
| AI Providers | OpenAI · Anthropic · Google Gemini · Groq |

---

## 🚀 Quick start (local)

```bash
git clone <your-repo>
cd ai-chat-web
cp .env.example .env
# Edit .env: fill AI_API_KEY, YEUMONEY_API_KEY, YEUMONEY_WEBHOOK_SECRET, JWT_SECRET
npm install
npx prisma db push          # creates prisma/dev.db
npm run dev
# open http://localhost:3000
```

**Minimum env to run:**

```env
JWT_SECRET="any-long-random-string"
OPENAI_API_KEY="sk-..."
YEUMONEY_API_KEY="ym_..."
YEUMONEY_WEBHOOK_SECRET="any-secret-you-choose"
```

That's it. The DB falls back to SQLite at `prisma/dev.db`. Redis falls back to in-memory.

---

## 🌐 Railway deploy

1. Push to GitHub.
2. **New Project → Deploy from GitHub** → select this repo.
3. Railway auto-detects `railway.toml` and `Dockerfile`.
4. **Add a PostgreSQL plugin** in Railway (or set `DATABASE_URL` to a hosted Postgres).
5. **Edit the schema** — change `prisma/schema.prisma` line 6:
   ```prisma
   datasource db {
     provider = "postgresql"   // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
6. **Set env vars** in Railway's Variables tab:
   ```
   DATABASE_URL=<from Postgres plugin>
   JWT_SECRET=<openssl rand -base64 64>
   OPENAI_API_KEY=...
   YEUMONEY_API_KEY=...
   YEUMONEY_WEBHOOK_SECRET=<matches Yeumoney dashboard>
   REDIS_URL=<from Redis plugin, optional>
   ```
7. Deploy. Health check at `/api/health`.

**For SQLite-on-Railway** (cheapest): keep `provider = "sqlite"`, add a persistent Volume mounted at `/data`, set `DATABASE_URL=file:/data/dev.db`. Skip steps 4-5.

---

## 🔐 Yeumoney integration

Flow:
1. User clicks **Start Yeumoney task** in the gate screen.
2. Frontend → `POST /api/yeumoney/create` (rate-limited 1/hour/user).
3. Backend creates a PENDING log and calls Yeumoney to mint a short link.
4. User opens the link, completes the task.
5. Yeumoney sends a signed webhook → `POST /api/yeumoney/webhook`.
6. Backend verifies **HMAC-SHA256** signature, idempotently credits the user.
7. User refreshes / gets notified → chat unlocks.

**Webhook signature**: header `X-Yeumoney-Signature: sha256=<hex>` over the raw request body. Secret = `YEUMONEY_WEBHOOK_SECRET`.

**Idempotency**: each Yeumoney `transaction_id` is `UNIQUE` in `YeumoneyLog`. Replays are no-ops.

**Replays / Re-sends**: re-running the same webhook returns `{ credited: false, reason: "already_completed" }`.

**Cooldown**: 1 task / user / hour, enforced at both API and DB layer.

---

## 🛡️ Security

| Concern | Mitigation |
|---|---|
| Mass-assignment | `z.object(...).strict()` on every endpoint |
| XSS | `rehype-sanitize` on rendered markdown + CSP headers |
| CSRF | SameSite=Strict cookies + JWT in httpOnly cookie |
| SQLi | Prisma ORM (no raw SQL anywhere) |
| Brute-force | Redis/in-memory sliding window on login (5/15min) |
| Token double-spend | `User.updateMany({ where: { credits: { gte: N } } })` atomic debit |
| Webhook spoofing | HMAC-SHA256 verification + constant-time compare |
| Webhook replay | UNIQUE on `yeumoneyTxId`, idempotent application |
| Prompt injection | `sanitizeUserInput()` strips chat-template tokens & instruction-override patterns |
| Bypass-by-IP-switch | Rate-limit key combines `userId + IP` |
| Stale token claims | `getCurrentUser()` re-verifies JWT on every request |
| Reflection headers | `poweredByHeader: false` + `X-Powered-By` removed |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| Open ports | Only `3000` exposed |
| Secrets leak | `.env` git-ignored; no secrets in client bundle |

---

## 🎨 Design system

Implemented 1:1 from `Design.md`:
- **Theme**: dark, deep blacks (`#0A0A0F`, `#111118`), electric purple (`#8B5CF6`) accent
- **Typography**: Inter (UI) + JetBrains Mono (code), full hierarchy
- **Cards / buttons / inputs**: glass-morphism, 12-16px radius, purple-glow shadows
- **Animations**: fade-in, slide-up, typing dots, animated background
- **Responsive**: mobile-first, sidebar collapses to drawer

---

## 📁 Project layout

```
src/
  app/
    layout.tsx                # global shell, fonts, toaster
    page.tsx                  # landing
    globals.css               # design tokens
    (auth)/login/page.tsx
    (auth)/register/page.tsx
    chat/page.tsx             # gate or chat interface
    api/
      health/                 # railway healthcheck
      auth/{login,register,logout,me}/
      chat/                   # SSE stream
      chat/history/           # list / get / delete conversations
      yeumoney/{create,webhook,status}/
      user/credits/
  components/
    auth/{LoginForm,RegisterForm}.tsx
    chat/{ChatInterface,MessageList,MessageItem,InputArea,ModelSelector,TokenDisplay}.tsx
    yeumoney/YeumoneyGate.tsx
    layout/Header.tsx
  lib/
    prisma.ts                 # singleton client
    redis.ts                  # store with in-memory fallback
    rate-limit.ts             # sliding window
    auth.ts                   # jose JWT, bcrypt, cookies
    validators.ts             # Zod schemas
    ai-proxy.ts               # OpenAI / Anthropic / Google streaming
    yeumoney.ts               # link create + webhook verify + apply
    utils.ts                  # cn, date, sanitize
  middleware.ts               # edge auth + protected paths
  types/index.ts              # shared DTOs
prisma/
  schema.prisma               # SQLite default
```

---

## 🧪 End-to-end test plan

1. `npm install` → `npx prisma db push` → `npm run dev`.
2. Open `http://localhost:3000` → click **Get started** → register.
3. Land on the **Yeumoney gate** (credits = 0). Click **Start Yeumoney task**.
4. The page opens a new tab to the Yeumoney link. Manually simulate the webhook:
   ```bash
   curl -X POST http://localhost:3000/api/yeumoney/webhook \
     -H "Content-Type: application/json" \
     -H "X-Yeumoney-Signature: sha256=$(printf '%s' '{"transaction_id":"<id>","status":"completed"}' | openssl dgst -sha256 -hmac "$YEUMONEY_WEBHOOK_SECRET" -hex | awk '{print $2}')" \
     -d '{"transaction_id":"<id>","status":"completed"}'
   ```
   Replace `<id>` with the value shown in `YeumoneyLog` (prisma studio: `npm run db:studio`).
5. After 5s, the page shows "+100 credits" and the chat UI loads.
6. Pick a model, send a message, observe streaming.

---

## 🧩 Customization

- **Models** — edit `src/components/chat/ModelSelector.tsx` → `MODELS` array.
- **Reward amount** — `YEUMONEY_REWARD_CREDITS` env.
- **Cost per message** — `CREDITS_PER_MESSAGE` env.
- **Rate limits** — `RATE_LIMIT_*` envs.
- **Theme** — `tailwind.config.ts` & `globals.css`.

---

## 📜 License

MIT.
