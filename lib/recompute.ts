import { v4 as uuidv4 } from "uuid"
import { db } from "./db"
import { calculateEloChanges } from "./elo"

export interface ReplayMatch {
  id: string
  home_player_id: string
  away_player_id: string
  home_score: number
  away_score: number
}

export interface ReplaySnapshot {
  matchId: string
  homeBefore: number
  homeAfter: number
  awayBefore: number
  awayAfter: number
}

export interface PlayerAgg {
  elo: number
  wins: number
  losses: number
  draws: number
  goals_for: number
  goals_against: number
  points: number
}

function baseAgg(): PlayerAgg {
  return { elo: 1000, wins: 0, losses: 0, draws: 0, goals_for: 0, goals_against: 0, points: 0 }
}

/**
 * Pure Elo + aggregate replay. Matches MUST be in chronological order.
 * Points: win=3, draw=1, loss=0 (match points only; bonuses live in
 * point_adjustments and are summed separately in the leaderboard query).
 */
export function replayElo(matches: ReplayMatch[]): {
  snapshots: ReplaySnapshot[]
  players: Map<string, PlayerAgg>
} {
  const players = new Map<string, PlayerAgg>()
  const get = (id: string): PlayerAgg => {
    let p = players.get(id)
    if (!p) {
      p = baseAgg()
      players.set(id, p)
    }
    return p
  }

  const snapshots: ReplaySnapshot[] = []
  for (const m of matches) {
    const home = get(m.home_player_id)
    const away = get(m.away_player_id)
    const homeBefore = home.elo
    const awayBefore = away.elo
    const result =
      m.home_score > m.away_score ? "home" : m.away_score > m.home_score ? "away" : "draw"
    const { homeAfter, awayAfter } = calculateEloChanges(homeBefore, awayBefore, result)

    home.elo = homeAfter
    away.elo = awayAfter
    home.goals_for += m.home_score
    home.goals_against += m.away_score
    away.goals_for += m.away_score
    away.goals_against += m.home_score

    if (result === "home") {
      home.wins++
      away.losses++
      home.points += 3
    } else if (result === "away") {
      away.wins++
      home.losses++
      away.points += 3
    } else {
      home.draws++
      away.draws++
      home.points += 1
      away.points += 1
    }

    snapshots.push({ matchId: m.id, homeBefore, homeAfter, awayBefore, awayAfter })
  }
  return { snapshots, players }
}

type Stmt = { sql: string; args: (string | number | null)[] }

/**
 * Rebuild all derived data for a user from their matches: Elo snapshots on
 * match rows, elo_history, player aggregates, and tournament-participant
 * standings. Safe to call after any match/tournament mutation.
 */
export async function recomputeUser(userId: string): Promise<void> {
  // 1) Load the user's matches in chronological order.
  const matchesRes = await db.execute({
    sql: `SELECT id, home_player_id, away_player_id, home_score, away_score,
                 tournament_id, played_at
          FROM matches WHERE recorded_by = ?
          ORDER BY played_at ASC, rowid ASC`,
    args: [userId],
  })
  const matches = matchesRes.rows as unknown as (ReplayMatch & {
    tournament_id: string | null
    played_at: string
  })[]

  const { snapshots, players } = replayElo(matches)
  const snapByMatch = new Map(snapshots.map((s) => [s.matchId, s]))

  const stmts: Stmt[] = []

  // 2) Reset the user's players, then write final aggregates.
  stmts.push({
    sql: `UPDATE players SET elo=1000, points=0, wins=0, losses=0, draws=0,
            goals_for=0, goals_against=0 WHERE user_id = ?`,
    args: [userId],
  })
  for (const [playerId, a] of players) {
    stmts.push({
      sql: `UPDATE players SET elo=?, points=?, wins=?, losses=?, draws=?,
              goals_for=?, goals_against=? WHERE id = ? AND user_id = ?`,
      args: [a.elo, a.points, a.wins, a.losses, a.draws, a.goals_for, a.goals_against, playerId, userId],
    })
  }

  // 3) Update Elo snapshots on match rows.
  for (const m of matches) {
    const s = snapByMatch.get(m.id)!
    stmts.push({
      sql: `UPDATE matches SET home_elo_before=?, home_elo_after=?,
              away_elo_before=?, away_elo_after=? WHERE id = ?`,
      args: [s.homeBefore, s.homeAfter, s.awayBefore, s.awayAfter, m.id],
    })
  }

  // 4) Rebuild elo_history from scratch (chronological).
  stmts.push({
    sql: `DELETE FROM elo_history WHERE player_id IN (SELECT id FROM players WHERE user_id = ?)`,
    args: [userId],
  })
  for (const m of matches) {
    const s = snapByMatch.get(m.id)!
    stmts.push({
      sql: `INSERT INTO elo_history (id, player_id, elo, match_id, recorded_at) VALUES (?, ?, ?, ?, ?)`,
      args: [uuidv4(), m.home_player_id, s.homeAfter, m.id, m.played_at],
    })
    stmts.push({
      sql: `INSERT INTO elo_history (id, player_id, elo, match_id, recorded_at) VALUES (?, ?, ?, ?, ?)`,
      args: [uuidv4(), m.away_player_id, s.awayAfter, m.id, m.played_at],
    })
  }

  // 5) Recompute tournament-participant standings from the user's tournament matches.
  const partsRes = await db.execute({
    sql: `SELECT tp.id, tp.tournament_id, tp.player_id
          FROM tournament_participants tp
          JOIN tournaments t ON tp.tournament_id = t.id
          WHERE t.created_by = ?`,
    args: [userId],
  })
  const partId = new Map<string, string>() // `${tournamentId}:${playerId}` -> participantId
  const partAgg = new Map<string, PlayerAgg>() // participantId -> agg
  for (const row of partsRes.rows) {
    const r = row as Record<string, unknown>
    partId.set(`${r.tournament_id}:${r.player_id}`, r.id as string)
    partAgg.set(r.id as string, baseAgg())
  }
  for (const m of matches) {
    if (!m.tournament_id) continue
    const hId = partId.get(`${m.tournament_id}:${m.home_player_id}`)
    const aId = partId.get(`${m.tournament_id}:${m.away_player_id}`)
    const result =
      m.home_score > m.away_score ? "home" : m.away_score > m.home_score ? "away" : "draw"
    if (hId) {
      const h = partAgg.get(hId)!
      h.goals_for += m.home_score
      h.goals_against += m.away_score
      if (result === "home") { h.wins++; h.points += 3 }
      else if (result === "away") h.losses++
      else { h.draws++; h.points += 1 }
    }
    if (aId) {
      const a = partAgg.get(aId)!
      a.goals_for += m.away_score
      a.goals_against += m.home_score
      if (result === "away") { a.wins++; a.points += 3 }
      else if (result === "home") a.losses++
      else { a.draws++; a.points += 1 }
    }
  }
  stmts.push({
    sql: `UPDATE tournament_participants SET wins=0, losses=0, draws=0, points=0,
            goals_for=0, goals_against=0
          WHERE tournament_id IN (SELECT id FROM tournaments WHERE created_by = ?)`,
    args: [userId],
  })
  for (const [pid, a] of partAgg) {
    stmts.push({
      sql: `UPDATE tournament_participants SET wins=?, losses=?, draws=?, points=?,
              goals_for=?, goals_against=? WHERE id = ?`,
      args: [a.wins, a.losses, a.draws, a.points, a.goals_for, a.goals_against, pid],
    })
  }

  await db.batch(stmts, "write")
}
