# FIFA Weekend Leaderboard — Completion Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Execute phase-by-phase; verify at each phase gate.

**Goal:** Bring the existing v0-generated single-board app up to the spec: multi-tenant (one board per user), every board publicly viewable read-only, only the owner can edit, plus all missing features (points ranking, rich stats, match history + edit, tournament completion + bonuses, settings, animations).

**Architecture:** Next.js 16 App Router. Turso/libSQL via raw SQL (`@libsql/client`). Auth.js Credentials + JWT. Every DB row is owned by a `user_id`; admin reads/writes are scoped to `session.user.id`, public reads are scoped to the owner resolved from a `share_slug`. Derived stats are computed from matches (never trusted as canonical); after any match/tournament mutation we **fully recompute** that user's Elo + aggregates chronologically. All boards are always public (no privacy toggle) — write endpoints enforce ownership server-side.

**Tech Stack:** Next.js 16, TypeScript, Tailwind v4, `@libsql/client`, Auth.js (next-auth beta), bcryptjs, **Zod** (new), **canvas-confetti** (new), Framer Motion (already installed, currently unused), Recharts, DiceBear HTTP API, **Vitest** (new, for pure-logic unit tests).

## Global Constraints

- Keep raw SQL (no Drizzle). Keep DiceBear HTTP API (no `@dicebear/core`). Add Zod for mutation validation only.
- Every board is public; there is **no** `isPublic` flag. Never add private/public toggling.
- All write endpoints MUST verify `session.user.id` and scope mutations to rows owned by that user.
- All read queries in `lib/queries.ts` MUST take an explicit `userId` and filter by it.
- Elo: start 1000, K=32, `E = 1/(1+10^((opp-elo)/400))`, S = 1/0.5/0. Recompute chronologically on edit/delete.
- Points: Win=3, Draw=1, Loss=0. Tournament bonus: champion +5, runner-up +2 (via `point_adjustments`).
- Preserve the existing visual design system (colors, fonts, shadcn components). Mobile-first.
- Verification reality: no runtime DB until user supplies Turso creds. Gate each phase on `pnpm exec tsc --noEmit` + `pnpm vitest run` (pure logic). Full `next build` + manual runtime checks happen once creds land.

---

## File Structure

**New library modules**
- `lib/slug.ts` — share-slug generator.
- `lib/session.ts` — `requireUserId()`, `getSessionUserId()` server helpers.
- `lib/recompute.ts` — `recomputeUser(userId)`: rebuild Elo, elo_history, player + tournament-participant aggregates from matches.
- `lib/stats.ts` — pure derived-stat functions (head-to-head, nemesis, teams, streaks, points table sort). Unit-tested.
- `lib/validation.ts` — Zod schemas for all mutations.
- `lib/board.ts` — board-meta helpers (`getBoardBySlug`, `getBoardMeta`).

**Schema/migration** — `lib/schema.ts` (extend), `lib/migrate.ts` (add idempotent column adds + backfill).

**API** — rewrite `app/api/{players,matches,tournaments}/**` for scoping/Zod/recompute; add `app/api/matches/[id]/route.ts`, `app/api/tournaments/[id]/route.ts` (PATCH complete / DELETE), `app/api/tournaments/[id]/advance` handled inside match POST, `app/api/settings/route.ts`, `app/api/settings/password/route.ts`.

**Admin pages** — scope `app/(app)/**` to the session user; new `app/(app)/matches/page.tsx`, `app/(app)/settings/page.tsx`; make `app/(app)/layout.tsx` a server component that redirects unauthenticated users.

**Public pages** — `app/l/[slug]/{page,layout}.tsx`, `app/l/[slug]/players/[playerId]/page.tsx`, `app/l/[slug]/matches/page.tsx`, `app/l/[slug]/tournaments/{page,[id]/page}.tsx`.

**Components** — new `components/leaderboard-table.tsx` (client, Points/Elo toggle + Framer Motion), `components/podium.tsx`, `components/create-tournament-dialog.tsx` (fixes broken import), `components/player-stats.tsx`, `components/share-button.tsx`, `components/confetti.tsx`, `components/complete-tournament-button.tsx`, `components/match-history.tsx`, `components/team-combobox.tsx`, `components/settings-form.tsx`. Add `readOnly` prop threading to reused components.

---

## Phase 0 — Foundations, deps & build unblock

### Task 0.1: Install new dependencies

- [ ] Add deps and dev-deps:

```bash
pnpm add zod canvas-confetti
pnpm add -D @types/canvas-confetti vitest
```

- [ ] Add test + typecheck scripts to `package.json`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```

### Task 0.2: Vitest config

- [ ] Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: { environment: "node", include: ["lib/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
})
```

### Task 0.3: Env template

- [ ] Create `.env.example`:

```
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

- [ ] Verify: `pnpm exec tsc --noEmit` runs (may still error until Phase 1 types exist — that's fine; the goal is the toolchain resolves).

---

## Phase 1 — Data model & migrations

### Task 1.1: Extend `lib/schema.ts`

- [ ] Add new columns/tables to `SCHEMA_SQL` (fresh-DB path). New `users` columns: `leaderboard_name TEXT`, `share_slug TEXT UNIQUE`. New `players` columns: `avatar_style TEXT NOT NULL DEFAULT 'pixel-art'`, `points INTEGER NOT NULL DEFAULT 0`. New `matches` columns: `home_team TEXT`, `away_team TEXT`, `stage TEXT`, `shootout_winner_id TEXT`. New `tournaments` columns: `winner_player_id TEXT`, `runner_up_player_id TEXT`. New table:

```sql
CREATE TABLE IF NOT EXISTS point_adjustments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  tournament_id TEXT REFERENCES tournaments(id),
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pa_user ON point_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_players_user ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_recorder ON matches(recorded_by);
```

### Task 1.2: Idempotent migration for existing DBs

- [ ] In `lib/migrate.ts`, after creating tables, add missing columns idempotently via `PRAGMA table_info`. Helper:

```ts
async function ensureColumn(table: string, col: string, ddl: string) {
  const info = await db.execute(`PRAGMA table_info(${table})`)
  const has = info.rows.some((r) => (r as Record<string, unknown>).name === col)
  if (!has) await db.execute(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
}
```

Call for each new column (e.g. `ensureColumn("users","share_slug","share_slug TEXT")`, etc.; note SQLite can't add `UNIQUE`/`NOT NULL DEFAULT` via ALTER for some cases — add plain columns and enforce uniqueness in app code + a unique index `CREATE UNIQUE INDEX IF NOT EXISTS ux_users_slug ON users(share_slug)`).
- [ ] Backfill: for any user with null `share_slug`, generate one; null `leaderboard_name` → `"<display_name>'s League"`.

### Task 1.3: `lib/slug.ts`

- [ ] Create with a unit-testable generator (no `Math.random` reliance in tests — accept an optional rng):

```ts
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789"
export function makeSlug(len = 10, rng: () => number = Math.random): string {
  let s = ""
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(rng() * ALPHABET.length)]
  return s
}
```

- [ ] Test `lib/slug.test.ts`: deterministic rng → fixed output; length correct; only alphabet chars.
- [ ] Verify: `pnpm vitest run lib/slug.test.ts` PASS.

---

## Phase 2 — Multi-tenant core libraries

### Task 2.1: `lib/session.ts`

```ts
import { auth } from "@/auth"
export async function getSessionUserId(): Promise<string | null> {
  const s = await auth(); return s?.user?.id ?? null
}
export async function requireUserId(): Promise<string> {
  const id = await getSessionUserId()
  if (!id) throw new Error("UNAUTHORIZED")
  return id
}
```

### Task 2.2: `lib/board.ts`

- [ ] `getBoardBySlug(slug)` → `{ userId, leaderboardName, shareSlug } | null`. `getBoardMeta(userId)` → same by id. Used by public pages + layout + settings.

### Task 2.3: Refactor `lib/queries.ts` to be user-scoped

- [ ] Every function gains a `userId: string` first param and adds `WHERE ... user_id = ?` / `recorded_by = ?` scoping. Specifically:
  - `getAllPlayers(userId)`, `getPlayerById(userId, id)` (scoped), `getLeaderboard(userId)`.
  - `getLeaderboard` returns players plus `total_points = points + COALESCE(adjustments,0)` via `LEFT JOIN (SELECT player_id, SUM(points) adj FROM point_adjustments WHERE user_id=? GROUP BY player_id)`.
  - `getPlayerMatchHistory(userId, playerId, limit)`, `getRecentMatches(userId, limit)`, `getGlobalStats(userId)` — scope by `recorded_by = userId` (matches) / `user_id = userId` (players).
  - `getAllTournaments(userId)`, `getTournamentById(userId, id)`, `getTournamentParticipants(userId, id)`, `getTournamentMatches(userId, id)` — scope by `created_by = userId`.
- [ ] Extend `Player` interface with `avatar_style`, `points`, and optional `total_points`, `current_streak`. Extend `Match` with `home_team`, `away_team`, `stage`, `shootout_winner_id`. Extend `Tournament` with `winner_player_id`, `runner_up_player_id`.

### Task 2.4: `lib/stats.ts` (pure, unit-tested) — highest-value tests

- [ ] Implement pure functions operating on a normalized match shape `{ playerId, opponentId, gf, ga, team, playedAt, result: "W"|"D"|"L" }[]`:
  - `perPlayerResults(matches, playerId)` → normalized rows for a player.
  - `headToHead(rows)` → `Map<opponentId,{w,d,l,gf,ga}>`.
  - `nemesis(rows)` → opponent with most losses; `favouriteVictim(rows)` → most wins.
  - `teamsUsed(rows)` → per-team `{played,w,d,l,gf,ga,winRate}`; `bestTeam`, `unluckyTeam`.
  - `longestWinStreak(rowsChrono)`, `currentStreak(rowsChrono)` → e.g. `{type:"W",count:3}`.
  - `biggestWin(rows)`, `worstDefeat(rows)`.
  - `recentForm(rowsChrono, n=5)` → `("W"|"D"|"L")[]`.
  - `sortPointsTable(players, h2hResolver)` → sort by total_points → GD → GF → head-to-head.
- [ ] Test `lib/stats.test.ts` covering: streak edge cases (empty, all wins, alternating), nemesis/favourite ties, teams aggregation, points tiebreak including head-to-head.
- [ ] Verify: `pnpm vitest run lib/stats.test.ts` PASS.

### Task 2.5: `lib/recompute.ts` (pure core + DB wrapper)

- [ ] Pure function `replayElo(matchesChrono)` → returns per-match `{homeBefore,homeAfter,awayBefore,awayAfter}` and final `{playerId: {elo,w,d,l,gf,ga,points}}`. Start Elo 1000; K=32; points W3/D1.
- [ ] `recomputeUser(userId)` (DB): load all of the user's matches ordered by `played_at, rowid`; reset players to base; delete elo_history for user's players; replay; UPDATE each match's elo snapshots; re-INSERT elo_history; UPDATE player aggregates (elo,w,d,l,gf,ga,points). Then recompute `tournament_participants` aggregates from their linked matches. Run inside `db.batch(...)` where possible.
- [ ] Test `lib/recompute.test.ts` for `replayElo`: two players, known sequence → assert exact Elo numbers and W/D/L/points.
- [ ] Verify: `pnpm vitest run lib/recompute.test.ts` PASS.

### Task 2.6: `lib/validation.ts` (Zod)

- [ ] Schemas: `registerSchema`, `playerCreateSchema`, `playerUpdateSchema`, `matchCreateSchema` (with optional `homeTeam`,`awayTeam`,`stage`,`tournamentMatchId`,`shootoutWinnerId`), `matchUpdateSchema`, `tournamentCreateSchema` (`name`, `format ∈ {knockout,round-robin}`, `playerIds: string[].min(2)`), `settingsSchema` (`leaderboardName`), `passwordChangeSchema`. Export a `parse<T>(schema, data)` helper returning `{data}` or throwing a 400-carrying error.
- [ ] Verify: `pnpm exec tsc --noEmit`.

---

## Phase 3 — Auth, registration & layout scoping

### Task 3.1: Registration creates board identity

- [ ] `app/api/register/route.ts`: validate with `registerSchema`; on insert also set `leaderboard_name = "<displayName>'s League"` and a unique `share_slug = makeSlug()` (retry on collision). Return `{ ok, id, slug }`.

### Task 3.2: Protect the admin area

- [ ] Convert `app/(app)/layout.tsx` to a server component: `const userId = await getSessionUserId(); if (!userId) redirect("/login")`. Fetch board meta; render `<AppShell boardName slug>{children}</AppShell>`.
- [ ] `components/app-shell.tsx`: accept `boardName`, `slug` props; add nav items **Matches** (`/matches`) and **Settings** (`/settings`); add a `ShareButton` (copies `${origin}/l/${slug}`). Show board name in the sidebar header.

### Task 3.3: Scope all admin pages to the session user

- [ ] In each `app/(app)/**/page.tsx` server component, get `userId` via `getSessionUserId()` (layout already guarantees non-null but re-fetch for the queries) and pass to the now-scoped query functions. Files: `page.tsx` (dashboard), `leaderboard/page.tsx`, `players/page.tsx`, `players/[id]/page.tsx`, `matches/new/page.tsx`, `tournaments/page.tsx`, `tournaments/[id]/page.tsx`, `tournaments/new/page.tsx`.
- [ ] Verify: `pnpm exec tsc --noEmit`.

---

## Phase 4 — Mutations (scoping + Zod + recompute)

### Task 4.1: Players API

- [ ] `POST /api/players`: Zod; insert with `user_id = session`, `avatar_seed`, `avatar_style`.
- [ ] `PATCH /api/players/[id]`: verify the player's `user_id === session`; update `name`,`avatar_seed`,`avatar_style`.
- [ ] `DELETE /api/players/[id]`: verify ownership; if the player has matches → set `is_active = 0` (archive) and return `{archived:true}`; else hard-delete.
- [ ] `GET /api/players/[id]`: scope to owner (used by public via slug variant too — public reads go through pages, not this route).

### Task 4.2: Matches API — create with teams/stage/shootout

- [ ] `POST /api/matches`: Zod (`matchCreateSchema`); verify both players belong to session user; enforce: if `tournamentMatchId` belongs to a **knockout** tournament and scores are equal → require `shootoutWinnerId ∈ {home,away}`. Insert match with `home_team`,`away_team`,`stage`,`shootout_winner_id`. Then update the tournament match (winner = higher score, or shootout winner on draw), advance bracket (Task 8), then `recomputeUser(session)` to refresh Elo/points snapshots and aggregates. Return created match.
- [ ] `PATCH /api/matches/[id]`: verify ownership; update scores/teams/notes; `recomputeUser`.
- [ ] `DELETE /api/matches/[id]`: verify ownership; if linked to a tournament match, reset that fixture to pending & undo advancement (Task 8 helper); delete elo_history for the match; delete match; `recomputeUser`.

### Task 4.3: Tournaments API — scoping

- [ ] `POST /api/tournaments`: Zod; `created_by = session`; participants scoped to the user's players; generate bracket/round-robin as today.
- [ ] Move bracket helpers to `lib/tournament.ts` (pure where possible) so advancement logic (Task 8) is shared + testable.
- [ ] Verify: `pnpm exec tsc --noEmit`.

---

## Phase 5 — Ranking UI: Points ↔ Elo toggle + animations

### Task 5.1: `components/leaderboard-table.tsx` (client)

- [ ] Props: `players` (with `total_points`, `current_streak`), `readOnly`. Tabs "Points" / "Elo" (shadcn `Tabs`). Sort client-side per tab (points table uses precomputed `total_points`, GD, GF; Elo by `elo`). Wrap rows in Framer Motion `motion.div` with `layout` so reordering animates. Crown icon on rank 1; flame + count for `current_streak.type==="W" && count>=3`; movement arrow if `movement` present (optional; may be null in v0).
- [ ] `components/podium.tsx`: top-3 with Framer Motion staggered reveal (translateY + fade).

### Task 5.2: Wire into dashboard + leaderboard page

- [ ] Replace the static tables in `app/(app)/page.tsx` and `app/(app)/leaderboard/page.tsx` with `<LeaderboardTable>` / `<Podium>`. Pass `readOnly={false}`.
- [ ] Verify: `pnpm exec tsc --noEmit`.

---

## Phase 6 — Player profile rich stats

### Task 6.1: `components/player-stats.tsx`

- [ ] Server-computes via `lib/stats.ts` from the player's full match list. Renders: record (P/W/D/L, win%, GF/GA/GD), biggest win, worst defeat, longest win streak, recent form pills (last 5), **nemesis** + **favourite victim** cards, **head-to-head** table vs every opponent, **teams used** table (best team / unlucky team highlighted), plus existing Elo chart.
- [ ] Update `app/(app)/players/[id]/page.tsx` to fetch the full (scoped) match list and render `<PlayerStats>`; keep `readOnly` prop for reuse by public route.
- [ ] Verify: `pnpm exec tsc --noEmit`.

---

## Phase 7 — Match history page + edit/delete

### Task 7.1: `components/match-history.tsx` (client)

- [ ] Filters: by player (select), by tournament (select), by date range. Renders `MatchCard`s. When `!readOnly`, each row has Edit (opens dialog reusing score/team inputs → `PATCH /api/matches/[id]`) and Delete (`DELETE`, confirm) → `router.refresh()`.

### Task 7.2: `app/(app)/matches/page.tsx`

- [ ] Server page: fetch scoped matches + players + tournaments; render `<MatchHistory readOnly={false}>`.
- [ ] Verify: `pnpm exec tsc --noEmit`.

---

## Phase 8 — Tournament completion, advancement, bonuses, confetti

### Task 8.1: `lib/tournament.ts` bracket advancement (pure + DB)

- [ ] Pure `nextRoundPairings(completedRoundMatches)` → list of `{position, homeParticipantId, awayParticipantId}` pairing winners in order (handle byes already-completed). Unit-test it.
- [ ] DB `advanceKnockout(tournamentId)`: if all matches in the current max round are completed and >1 winner, insert next-round `tournament_matches` from `nextRoundPairings`. If exactly 1 winner remains (final done) → call `completeTournament`.
- [ ] `undoAdvancement(tournamentMatchId)`: on match delete, delete any later-round fixtures that depended on it and reset.
- [ ] Test `lib/tournament.test.ts`: 4-player and 3-player (bye) brackets pair correctly.

### Task 8.2: `completeTournament(userId, tournamentId, winnerId, runnerUpId)` (DB)

- [ ] Set `status='completed'`, `ended_at`, `winner_player_id`, `runner_up_player_id`. Insert `point_adjustments`: champion +5, runner-up +2 (scoped to user). Then `recomputeUser` (so total_points reflect bonuses via the leaderboard join — note adjustments are summed in the query, so recompute is only needed to be safe/consistent).
- [ ] For **round-robin**: `POST /api/tournaments/[id]` with `{action:"complete"}` → winner = standings[0], runner-up = standings[1]. For **knockout**: auto-complete when final recorded (Task 8.1).

### Task 8.3: Tournament API PATCH/DELETE

- [ ] `PATCH /api/tournaments/[id]` `{action:"complete"}`: verify ownership; league only; compute standings; `completeTournament`.
- [ ] `DELETE /api/tournaments/[id]`: verify ownership; delete `point_adjustments` for tournament; unlink matches (`tournament_id=NULL`, keep global stats) OR delete per spec — **unlink** to preserve history; delete `tournament_matches`, `tournament_participants`, tournament; `recomputeUser`.

### Task 8.4: Confetti + completion UI

- [ ] `components/confetti.tsx`: client, fires `canvas-confetti` once on mount (used when a tournament is completed / champion card shown).
- [ ] `components/complete-tournament-button.tsx`: for active league tournaments (owner only) → calls PATCH complete.
- [ ] Tournament detail page: when `status==='completed'`, render champion card (winner avatar + trophy) + `<Confetti/>`; show runner-up. Add team-name inputs to the in-bracket/round-robin recording flow (reuse `team-combobox`). Fix knockout labels using round depth.
- [ ] `components/team-combobox.tsx`: text input + datalist of previously-used team names (fetched from the user's matches) + a static popular-clubs seed list.
- [ ] Verify: `pnpm exec tsc --noEmit` + `pnpm vitest run`.

---

## Phase 9 — Settings page

### Task 9.1: Settings API

- [ ] `PATCH /api/settings`: Zod `settingsSchema`; update `leaderboard_name`; `{action:"regenerate-slug"}` → new unique `share_slug`.
- [ ] `POST /api/settings/password`: verify current password (bcrypt.compare), set new hash.

### Task 9.2: `app/(app)/settings/page.tsx` + `components/settings-form.tsx`

- [ ] Rename leaderboard; show + copy public link (`/l/[slug]`); regenerate slug (warns old link breaks); change password. No public/private toggle.
- [ ] Verify: `pnpm exec tsc --noEmit`.

---

## Phase 10 — Public read-only board

### Task 10.1: Public layout + leaderboard

- [ ] `app/l/[slug]/layout.tsx`: resolve board by slug via `getBoardBySlug`; `notFound()` if missing. Render a lightweight public header (board name + "View-only" badge, links to Players/Matches/Tournaments under `/l/[slug]`). No auth, no edit UI.
- [ ] `app/l/[slug]/page.tsx`: fetch owner's leaderboard; render `<Podium>` + `<LeaderboardTable readOnly>`.
- [ ] Add Open Graph metadata (`generateMetadata`) on `/l/[slug]` (title = board name).

### Task 10.2: Public sub-pages

- [ ] `app/l/[slug]/players/[playerId]/page.tsx` → `<PlayerStats readOnly>`.
- [ ] `app/l/[slug]/matches/page.tsx` → `<MatchHistory readOnly>` (filters work, no edit/delete).
- [ ] `app/l/[slug]/tournaments/page.tsx` + `[id]/page.tsx` → read-only tournament list, bracket, standings, champion card.
- [ ] Ensure reused components hide all mutation affordances when `readOnly`.
- [ ] Verify: `pnpm exec tsc --noEmit`.

---

## Phase 11 — Seed rewrite (demo board)

### Task 11.1: `app/api/seed/route.ts`

- [ ] Create demo user `demo` / `demo1234`, `leaderboard_name = "Demo Weekend League"`, fixed `share_slug = "demo"` (if free). 4 players (varied avatar styles/seeds). ~20 casual matches with team names spread over past dates (deterministic sequence — no reliance on true randomness for reproducibility). One **completed knockout** tournament (4 players → semis + final) with results, champion + runner-up bonuses applied. Call `recomputeUser(demoUserId)` at the end. Return `{ ok, message, shareUrl: "/l/demo" }` and log the public link.
- [ ] Verify: `pnpm exec tsc --noEmit`.

---

## Phase 12 — Final verification

- [ ] `pnpm vitest run` — all pure-logic tests PASS.
- [ ] `pnpm exec tsc --noEmit` — no type errors.
- [ ] `pnpm build` — Next build succeeds (pages are `force-dynamic` + try/catch, so build should not require a live DB).
- [ ] Once user provides Turso creds in `.env.local`: `pnpm dev`, hit `/api/seed`, then manually verify: register → own board; public `/l/[slug]` read-only; record/edit/delete match recomputes Elo; points vs elo toggle; tournament complete → confetti + bonuses; settings rename/regenerate slug; another user's board is isolated.

## Self-Review notes
- Spec coverage: multi-tenancy (Ph2–3), public read-only (Ph10), points + bonuses (Ph2,5,8), Elo recompute on edit/delete (Ph2,4), teams + best-team stats (Ph1,6,8), rich player stats (Ph6), match history + edit (Ph7), tournament completion + confetti + advancement (Ph8), settings (Ph9), animations (Ph5,8), Zod (Ph2), seed demo (Ph11). Divergences accepted by user: raw SQL (not Drizzle), HTTP DiceBear (not client SDK), every board always public (no isPublic toggle).
- Type consistency: query functions all take `userId` first; `Player.total_points` / `current_streak` added in Ph2 and consumed in Ph5; `recomputeUser` used by Ph4/8/11.
</content>
