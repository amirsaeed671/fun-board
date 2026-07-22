import type { Match } from "./queries"

export type Result = "W" | "D" | "L"

export interface PlayerRow {
  matchId: string
  opponentId: string
  opponentName: string
  opponentSeed: string
  gf: number
  ga: number
  team: string | null
  playedAt: string
  result: Result
}

/** Normalize raw matches into rows from one player's point of view. */
export function toPlayerRows(matches: Match[], playerId: string): PlayerRow[] {
  return matches.map((m) => {
    const isHome = m.home_player_id === playerId
    const gf = isHome ? m.home_score : m.away_score
    const ga = isHome ? m.away_score : m.home_score
    const result: Result = gf > ga ? "W" : gf < ga ? "L" : "D"
    return {
      matchId: m.id,
      opponentId: isHome ? m.away_player_id : m.home_player_id,
      opponentName: (isHome ? m.away_player_name : m.home_player_name) ?? "?",
      opponentSeed: (isHome ? m.away_avatar_seed : m.home_avatar_seed) ?? "",
      gf,
      ga,
      team: isHome ? m.home_team : m.away_team,
      playedAt: m.played_at,
      result,
    }
  })
}

function chrono(rows: PlayerRow[]): PlayerRow[] {
  return [...rows].sort((a, b) => (a.playedAt < b.playedAt ? -1 : a.playedAt > b.playedAt ? 1 : 0))
}

export interface RecordSummary {
  played: number
  w: number
  d: number
  l: number
  gf: number
  ga: number
  gd: number
  winRate: number
}

export function playerRecord(rows: PlayerRow[]): RecordSummary {
  const r: RecordSummary = { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, winRate: 0 }
  for (const row of rows) {
    r.played++
    r.gf += row.gf
    r.ga += row.ga
    if (row.result === "W") r.w++
    else if (row.result === "D") r.d++
    else r.l++
  }
  r.gd = r.gf - r.ga
  r.winRate = r.played > 0 ? Math.round((r.w / r.played) * 100) : 0
  return r
}

export interface H2H {
  opponentId: string
  opponentName: string
  opponentSeed: string
  played: number
  w: number
  d: number
  l: number
  gf: number
  ga: number
}

export function headToHead(rows: PlayerRow[]): H2H[] {
  const map = new Map<string, H2H>()
  for (const row of rows) {
    let h = map.get(row.opponentId)
    if (!h) {
      h = {
        opponentId: row.opponentId,
        opponentName: row.opponentName,
        opponentSeed: row.opponentSeed,
        played: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
      }
      map.set(row.opponentId, h)
    }
    h.played++
    h.gf += row.gf
    h.ga += row.ga
    if (row.result === "W") h.w++
    else if (row.result === "D") h.d++
    else h.l++
  }
  return [...map.values()].sort((a, b) => b.played - a.played)
}

/** Opponent this player has lost to the most (ties broken by games played). */
export function nemesis(rows: PlayerRow[]): H2H | null {
  const h2h = headToHead(rows).filter((h) => h.l > 0)
  if (h2h.length === 0) return null
  return h2h.sort((a, b) => b.l - a.l || b.played - a.played)[0]
}

/** Opponent this player has beaten the most. */
export function favouriteVictim(rows: PlayerRow[]): H2H | null {
  const h2h = headToHead(rows).filter((h) => h.w > 0)
  if (h2h.length === 0) return null
  return h2h.sort((a, b) => b.w - a.w || b.played - a.played)[0]
}

export interface TeamRecord {
  team: string
  played: number
  w: number
  d: number
  l: number
  gf: number
  ga: number
  winRate: number
}

export function teamsUsed(rows: PlayerRow[]): TeamRecord[] {
  const map = new Map<string, TeamRecord>()
  for (const row of rows) {
    if (!row.team) continue
    let t = map.get(row.team)
    if (!t) {
      t = { team: row.team, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, winRate: 0 }
      map.set(row.team, t)
    }
    t.played++
    t.gf += row.gf
    t.ga += row.ga
    if (row.result === "W") t.w++
    else if (row.result === "D") t.d++
    else t.l++
  }
  const teams = [...map.values()]
  for (const t of teams) t.winRate = t.played > 0 ? Math.round((t.w / t.played) * 100) : 0
  return teams.sort((a, b) => b.winRate - a.winRate || b.played - a.played)
}

/** Team with the best win rate (min 1 game). */
export function bestTeam(rows: PlayerRow[]): TeamRecord | null {
  const teams = teamsUsed(rows)
  return teams.length ? teams[0] : null
}

/** Team with the worst win rate (min 1 game). */
export function unluckyTeam(rows: PlayerRow[]): TeamRecord | null {
  const teams = teamsUsed(rows)
  if (!teams.length) return null
  return [...teams].sort((a, b) => a.winRate - b.winRate || b.played - a.played)[0]
}

/** Team this player picks most often (ties broken by wins). */
export function mostPickedTeam(rows: PlayerRow[]): TeamRecord | null {
  const teams = teamsUsed(rows)
  if (!teams.length) return null
  return [...teams].sort((a, b) => b.played - a.played || b.w - a.w)[0]
}

/** Team that has won this player the most games (ties broken by win rate). */
export function mostWinsTeam(rows: PlayerRow[]): TeamRecord | null {
  const withWins = teamsUsed(rows).filter((t) => t.w > 0)
  if (!withWins.length) return null
  return withWins.sort((a, b) => b.w - a.w || b.winRate - a.winRate)[0]
}

export function biggestWin(rows: PlayerRow[]): PlayerRow | null {
  const wins = rows.filter((r) => r.result === "W")
  if (!wins.length) return null
  return wins.sort((a, b) => b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf)[0]
}

export function worstDefeat(rows: PlayerRow[]): PlayerRow | null {
  const losses = rows.filter((r) => r.result === "L")
  if (!losses.length) return null
  return losses.sort((a, b) => b.ga - b.gf - (a.ga - a.gf) || b.ga - a.ga)[0]
}

export function longestWinStreak(rows: PlayerRow[]): number {
  let best = 0
  let cur = 0
  for (const row of chrono(rows)) {
    if (row.result === "W") {
      cur++
      if (cur > best) best = cur
    } else {
      cur = 0
    }
  }
  return best
}

/** Current run of identical results ending at the most recent match. */
export function currentStreak(rows: PlayerRow[]): { type: Result; count: number } | null {
  const c = chrono(rows)
  if (!c.length) return null
  const type = c[c.length - 1].result
  let count = 0
  for (let i = c.length - 1; i >= 0; i--) {
    if (c[i].result === type) count++
    else break
  }
  return { type, count }
}

/** Last n results, most recent first. */
export function recentForm(rows: PlayerRow[], n = 5): Result[] {
  const c = chrono(rows)
  return c.slice(-n).reverse().map((r) => r.result)
}

// ── Points table ordering (total_points → GD → GF → head-to-head) ───────────
export interface RankablePlayer {
  id: string
  total_points?: number
  points: number
  goals_for: number
  goals_against: number
}

/** Build a resolver: (a,b) => (a's wins vs b) - (b's wins vs a). */
export function buildH2HWins(matches: Match[]): (a: string, b: string) => number {
  const wins = new Map<string, number>() // key `${winner}:${loser}`
  for (const m of matches) {
    if (m.home_score === m.away_score) continue
    const winner = m.home_score > m.away_score ? m.home_player_id : m.away_player_id
    const loser = m.home_score > m.away_score ? m.away_player_id : m.home_player_id
    const key = `${winner}:${loser}`
    wins.set(key, (wins.get(key) ?? 0) + 1)
  }
  return (a, b) => (wins.get(`${a}:${b}`) ?? 0) - (wins.get(`${b}:${a}`) ?? 0)
}

export function sortPointsTable<T extends RankablePlayer>(
  players: T[],
  h2hWins: (a: string, b: string) => number = () => 0
): T[] {
  const pts = (p: T) => p.total_points ?? p.points
  return [...players].sort((a, b) => {
    if (pts(b) !== pts(a)) return pts(b) - pts(a)
    const gdA = a.goals_for - a.goals_against
    const gdB = b.goals_for - b.goals_against
    if (gdB !== gdA) return gdB - gdA
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for
    return h2hWins(b.id, a.id) // more head-to-head wins ranks higher
  })
}

// ── Board-wide team/club stats ──────────────────────────────────────────────
export interface TeamSide {
  team: string
  playerId: string
  playerName: string
  gf: number
  ga: number
  result: Result
}

/** One row per team actually used in a match (a "pick"), from that side's view. */
export function matchSides(matches: Match[]): TeamSide[] {
  const sides: TeamSide[] = []
  for (const m of matches) {
    const homeRes: Result = m.home_score > m.away_score ? "W" : m.home_score < m.away_score ? "L" : "D"
    const awayRes: Result = m.away_score > m.home_score ? "W" : m.away_score < m.home_score ? "L" : "D"
    if (m.home_team) {
      sides.push({
        team: m.home_team,
        playerId: m.home_player_id,
        playerName: m.home_player_name ?? "?",
        gf: m.home_score,
        ga: m.away_score,
        result: homeRes,
      })
    }
    if (m.away_team) {
      sides.push({
        team: m.away_team,
        playerId: m.away_player_id,
        playerName: m.away_player_name ?? "?",
        gf: m.away_score,
        ga: m.home_score,
        result: awayRes,
      })
    }
  }
  return sides
}

export interface TeamGlobal {
  team: string
  picks: number
  w: number
  d: number
  l: number
  gf: number
  ga: number
  gd: number
  winRate: number
  users: number
  topUser: { name: string; count: number } | null
}

/** Aggregate every team used across the whole board. Sorted by picks. */
export function teamGlobalStats(matches: Match[]): TeamGlobal[] {
  const map = new Map<
    string,
    {
      team: string
      picks: number
      w: number
      d: number
      l: number
      gf: number
      ga: number
      byUser: Map<string, { name: string; count: number }>
    }
  >()
  for (const s of matchSides(matches)) {
    let t = map.get(s.team)
    if (!t) {
      t = { team: s.team, picks: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, byUser: new Map() }
      map.set(s.team, t)
    }
    t.picks++
    t.gf += s.gf
    t.ga += s.ga
    if (s.result === "W") t.w++
    else if (s.result === "D") t.d++
    else t.l++
    const u = t.byUser.get(s.playerId) ?? { name: s.playerName, count: 0 }
    u.count++
    u.name = s.playerName
    t.byUser.set(s.playerId, u)
  }
  const out: TeamGlobal[] = [...map.values()].map((t) => {
    let topUser: { name: string; count: number } | null = null
    for (const u of t.byUser.values()) {
      if (!topUser || u.count > topUser.count) topUser = { name: u.name, count: u.count }
    }
    return {
      team: t.team,
      picks: t.picks,
      w: t.w,
      d: t.d,
      l: t.l,
      gf: t.gf,
      ga: t.ga,
      gd: t.gf - t.ga,
      winRate: t.picks > 0 ? Math.round((t.w * 100) / t.picks) : 0,
      users: t.byUser.size,
      topUser,
    }
  })
  return out.sort((a, b) => b.picks - a.picks || b.winRate - a.winRate)
}
