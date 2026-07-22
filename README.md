# ⚽ fun-board — FIFA Weekend Leaderboard

A playful, multi-tenant leaderboard for tracking FIFA matches with your mates. Every registered user gets **their own board** — players, matches, tournaments, Elo ratings and rich stats — with a **public, read-only share link** anyone can open. Only the logged-in owner can edit.

- 🏆 **Points table** (Win 3 / Draw 1 / Loss 0) **and Elo ratings**, side by side with an animated toggle
- 📈 Per-player profiles: form, streaks, nemesis & favourite victim, head-to-head, best/unlucky teams, Elo history chart
- 🎮 Casual matches **and** tournaments (knockout brackets with auto-advancement + penalty shootouts, or round-robin leagues)
- 🎉 Tournament completion fires confetti, crowns a champion, and awards bonus points (+5 champion, +2 runner-up)
- 🔗 Public board at `/l/<slug>` with Open Graph previews — great for sharing in the group chat
- ✨ Cute DiceBear avatars (cycle styles), podium reveal, crowns, streak flames, dark UI

---

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn-style components (Base UI) |
| Database | Turso / libSQL via `@libsql/client` (raw SQL) |
| Auth | Auth.js (NextAuth v5) — Credentials + JWT sessions, bcrypt |
| Validation | Zod (all mutations) |
| Animation | Framer Motion + `canvas-confetti` |
| Charts | Recharts |
| Avatars | DiceBear HTTP API (SVG) |
| Tests | Vitest (pure ranking/stat logic) |

---

## Getting started

### 1. Prerequisites
- Node 20+ and **pnpm**
- A **Turso** database ([turso.tech](https://turso.tech)) — free tier is plenty

### 2. Install
```bash
pnpm install
```

### 3. Configure environment
Copy the example and fill it in:
```bash
cp .env.example .env.local
```
```dotenv
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
NEXTAUTH_SECRET=          # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

### 4. Run
```bash
pnpm dev
```
Open http://localhost:3000. The database schema is **created and migrated automatically** on first use (registration / API call) — no manual migration step.

### 5. Load the demo (optional)
On the login page, click **“Try the demo board”** (or `POST /api/seed`). It creates:
- a user **`demo` / `demo1234`** with the *Demo Weekend League*
- 4 players, ~16 casual matches, and one completed knockout tournament
- a public board at **`/l/demo`**

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm test` | Run the Vitest unit suite |
| `pnpm typecheck` | `tsc --noEmit` |

---

## How it works

### Multi-tenancy & public access
Every row is owned by a `user_id` (`players.user_id`, `matches.recorded_by`, `tournaments.created_by`). All read queries are scoped by that id. Boards are **always public** and read-only via an unguessable `share_slug`; there is no private toggle. Every mutation endpoint verifies the session and that the caller owns the affected rows — read-only is enforced **server-side**, not just by hiding buttons.

- Admin (logged in): `/`, `/leaderboard`, `/players`, `/matches`, `/tournaments`, `/settings`
- Public (no login): `/l/<slug>`, `/l/<slug>/players/<id>`, `/l/<slug>/matches`, `/l/<slug>/tournaments`

### Ranking
- **Points** — Win 3, Draw 1, Loss 0, plus tournament bonuses (champion +5, runner-up +2). Sorted by points → goal difference → goals for → head-to-head.
- **Elo** — everyone starts at 1000, K = 32, standard expected-score formula. Before/after snapshots are stored per match to chart a player's history.
- Editing or deleting a match triggers a **full chronological recompute** of that user's Elo, points, aggregates and tournament standings — so numbers are always consistent (`lib/recompute.ts`).

### Tournaments
- **Knockout** — auto-generated bracket (byes for non-power-of-2), winners advance automatically, level knockout ties require a penalty-shootout winner. Completing the final crowns the champion and applies bonuses.
- **Round-robin** — round-robin fixtures + a live mini-table; complete it to lock in champion/runner-up.

---

## Project structure

```
app/
  (app)/            Admin (auth-guarded) pages
  l/[slug]/         Public read-only board
  api/              Route handlers (register, players, matches, tournaments, settings, seed)
components/         UI + feature components (leaderboard, podium, player-stats, tournament-detail, …)
lib/
  schema.ts         SQL schema + column migrations
  migrate.ts        Idempotent migrate + backfill
  db.ts             Lazy libSQL client
  queries.ts        User-scoped read queries
  recompute.ts      Chronological Elo/points/standings rebuild (+ tests)
  stats.ts          Pure derived stats: h2h, nemesis, teams, streaks, points sort (+ tests)
  tournament.ts     Bracket generation, advancement, completion (+ tests)
  validation.ts     Zod schemas
  elo.ts            Elo maths
docs/superpowers/plans/   Implementation plan
```

---

## Testing
Pure ranking and tournament logic is unit-tested with Vitest:
```bash
pnpm test
```
Covers Elo replay (zero-sum, chaining, draws), points-table ordering with head-to-head tiebreaks, streaks/form, head-to-head/nemesis/teams aggregation, slug generation, and knockout bracket pairing.

---

## Notes & scope
- Uses raw SQL (not an ORM) and the DiceBear HTTP API by design.
- Leaderboard rank **movement arrows** (▲▼ vs last match day) are not tracked in v0.
- v1 ideas: player logins, multi-admin boards, deeper match stats, real-time sync.
