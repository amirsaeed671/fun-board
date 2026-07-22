import { db } from "./db"

export interface Player {
  id: string
  user_id: string | null
  name: string
  avatar_seed: string
  avatar_style: string
  elo: number
  points: number
  wins: number
  losses: number
  draws: number
  goals_for: number
  goals_against: number
  is_active: number
  created_at: string
  // Enriched by queries / server pages, not stored:
  total_points?: number
  current_streak?: { type: "W" | "D" | "L"; count: number } | null
}

export interface Match {
  id: string
  home_player_id: string
  away_player_id: string
  home_score: number
  away_score: number
  home_team: string | null
  away_team: string | null
  stage: string | null
  shootout_winner_id: string | null
  home_elo_before: number
  away_elo_before: number
  home_elo_after: number
  away_elo_after: number
  tournament_id: string | null
  tournament_round: number | null
  recorded_by: string
  played_at: string
  notes: string | null
  home_player_name?: string
  home_avatar_seed?: string
  home_avatar_style?: string
  away_player_name?: string
  away_avatar_seed?: string
  away_avatar_style?: string
  recorder_name?: string
  tournament_name?: string
}

export interface Tournament {
  id: string
  name: string
  format: string
  status: string
  winner_player_id: string | null
  runner_up_player_id: string | null
  created_by: string
  created_at: string
  started_at: string | null
  ended_at: string | null
  participant_count?: number
  winner_name?: string
  winner_avatar_seed?: string
}

export interface TournamentParticipant {
  id: string
  tournament_id: string
  player_id: string
  seed: number | null
  group_name: string | null
  wins: number
  losses: number
  draws: number
  points: number
  goals_for: number
  goals_against: number
  eliminated: number
  player_name?: string
  avatar_seed?: string
  avatar_style?: string
  elo?: number
}

export interface TournamentMatch {
  id: string
  tournament_id: string
  match_id: string | null
  round: number
  position: number
  home_participant_id: string | null
  away_participant_id: string | null
  winner_participant_id: string | null
  status: string
  home_player_name?: string
  home_avatar_seed?: string
  home_score?: number
  away_player_name?: string
  away_avatar_seed?: string
  away_score?: number
}

// ── Players ────────────────────────────────────────────────────────────────
export async function getAllPlayers(userId: string): Promise<Player[]> {
  const result = await db.execute({
    sql: "SELECT * FROM players WHERE user_id = ? AND is_active = 1 ORDER BY elo DESC",
    args: [userId],
  })
  return result.rows as unknown as Player[]
}

export async function getPlayerById(
  userId: string,
  id: string
): Promise<Player | null> {
  const result = await db.execute({
    sql: "SELECT * FROM players WHERE id = ? AND user_id = ?",
    args: [id, userId],
  })
  return (result.rows[0] as unknown as Player) ?? null
}

export async function getLeaderboard(userId: string): Promise<Player[]> {
  const result = await db.execute({
    sql: `
      SELECT p.*, (p.points + COALESCE(adj.total, 0)) AS total_points
      FROM players p
      LEFT JOIN (
        SELECT player_id, SUM(points) AS total
        FROM point_adjustments WHERE user_id = ? GROUP BY player_id
      ) adj ON adj.player_id = p.id
      WHERE p.user_id = ? AND p.is_active = 1
      ORDER BY p.elo DESC
    `,
    args: [userId, userId],
  })
  return result.rows as unknown as Player[]
}

// ── Matches ──────────────────────────────────────────────────────────────
const MATCH_SELECT = `
  SELECT m.*,
    hp.name as home_player_name, hp.avatar_seed as home_avatar_seed, hp.avatar_style as home_avatar_style,
    ap.name as away_player_name, ap.avatar_seed as away_avatar_seed, ap.avatar_style as away_avatar_style,
    t.name as tournament_name
  FROM matches m
  JOIN players hp ON m.home_player_id = hp.id
  JOIN players ap ON m.away_player_id = ap.id
  LEFT JOIN tournaments t ON m.tournament_id = t.id
`

export async function getRecentMatches(
  userId: string,
  limit = 10
): Promise<Match[]> {
  const result = await db.execute({
    sql: `${MATCH_SELECT} WHERE m.recorded_by = ? ORDER BY m.played_at DESC LIMIT ?`,
    args: [userId, limit],
  })
  return result.rows as unknown as Match[]
}

export async function getAllMatches(userId: string): Promise<Match[]> {
  const result = await db.execute({
    sql: `${MATCH_SELECT} WHERE m.recorded_by = ? ORDER BY m.played_at DESC`,
    args: [userId],
  })
  return result.rows as unknown as Match[]
}

export async function getPlayerMatchHistory(
  userId: string,
  playerId: string,
  limit?: number
): Promise<Match[]> {
  const limitClause = limit ? "LIMIT ?" : ""
  const args: (string | number)[] = [userId, playerId, playerId]
  if (limit) args.push(limit)
  const result = await db.execute({
    sql: `${MATCH_SELECT}
      WHERE m.recorded_by = ? AND (m.home_player_id = ? OR m.away_player_id = ?)
      ORDER BY m.played_at DESC ${limitClause}`,
    args,
  })
  return result.rows as unknown as Match[]
}

export async function getTeamNames(userId: string): Promise<string[]> {
  const result = await db.execute({
    sql: `SELECT DISTINCT team FROM (
            SELECT home_team as team FROM matches WHERE recorded_by = ? AND home_team IS NOT NULL AND home_team != ''
            UNION
            SELECT away_team as team FROM matches WHERE recorded_by = ? AND away_team IS NOT NULL AND away_team != ''
          ) ORDER BY team ASC`,
    args: [userId, userId],
  })
  return result.rows.map((r) => (r as Record<string, unknown>).team as string)
}

export async function getPlayerEloHistory(
  userId: string,
  playerId: string
): Promise<{ elo: number; recorded_at: string; match_id: string }[]> {
  const result = await db.execute({
    sql: `
      SELECT eh.elo, eh.recorded_at, eh.match_id FROM elo_history eh
      JOIN players p ON eh.player_id = p.id
      WHERE eh.player_id = ? AND p.user_id = ?
      ORDER BY eh.recorded_at ASC
    `,
    args: [playerId, userId],
  })
  return result.rows as unknown as {
    elo: number
    recorded_at: string
    match_id: string
  }[]
}

// ── Tournaments ────────────────────────────────────────────────────────────
export async function getAllTournaments(userId: string): Promise<Tournament[]> {
  const result = await db.execute({
    sql: `
      SELECT t.*, COUNT(tp.id) as participant_count,
        wp.name as winner_name, wp.avatar_seed as winner_avatar_seed
      FROM tournaments t
      LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
      LEFT JOIN players wp ON t.winner_player_id = wp.id
      WHERE t.created_by = ?
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `,
    args: [userId],
  })
  return result.rows as unknown as Tournament[]
}

export async function getTournamentById(
  userId: string,
  id: string
): Promise<Tournament | null> {
  const result = await db.execute({
    sql: "SELECT * FROM tournaments WHERE id = ? AND created_by = ?",
    args: [id, userId],
  })
  return (result.rows[0] as unknown as Tournament) ?? null
}

export async function getTournamentParticipants(
  userId: string,
  tournamentId: string
): Promise<TournamentParticipant[]> {
  const result = await db.execute({
    sql: `
      SELECT tp.*, p.name as player_name, p.avatar_seed, p.avatar_style, p.elo
      FROM tournament_participants tp
      JOIN players p ON tp.player_id = p.id
      JOIN tournaments t ON tp.tournament_id = t.id
      WHERE tp.tournament_id = ? AND t.created_by = ?
      ORDER BY tp.points DESC, (tp.goals_for - tp.goals_against) DESC
    `,
    args: [tournamentId, userId],
  })
  return result.rows as unknown as TournamentParticipant[]
}

export async function getTournamentMatches(
  userId: string,
  tournamentId: string
): Promise<TournamentMatch[]> {
  const result = await db.execute({
    sql: `
      SELECT
        tm.*,
        hp.name as home_player_name, hp.avatar_seed as home_avatar_seed,
        ap.name as away_player_name, ap.avatar_seed as away_avatar_seed,
        m.home_score, m.away_score
      FROM tournament_matches tm
      JOIN tournaments t ON tm.tournament_id = t.id
      LEFT JOIN tournament_participants htp ON tm.home_participant_id = htp.id
      LEFT JOIN players hp ON htp.player_id = hp.id
      LEFT JOIN tournament_participants atp ON tm.away_participant_id = atp.id
      LEFT JOIN players ap ON atp.player_id = ap.id
      LEFT JOIN matches m ON tm.match_id = m.id
      WHERE tm.tournament_id = ? AND t.created_by = ?
      ORDER BY tm.round ASC, tm.position ASC
    `,
    args: [tournamentId, userId],
  })
  return result.rows as unknown as TournamentMatch[]
}

export async function getFixtureContext(
  userId: string,
  tournamentMatchId: string
): Promise<{ tournamentId: string; isKnockout: boolean } | null> {
  const res = await db.execute({
    sql: `SELECT tm.tournament_id, t.format FROM tournament_matches tm
          JOIN tournaments t ON tm.tournament_id = t.id
          WHERE tm.id = ? AND t.created_by = ?`,
    args: [tournamentMatchId, userId],
  })
  const row = res.rows[0] as Record<string, unknown> | undefined
  if (!row) return null
  return {
    tournamentId: row.tournament_id as string,
    isKnockout: (row.format as string) === "knockout",
  }
}

// ── Stats ────────────────────────────────────────────────────────────────
export async function getGlobalStats(userId: string) {
  const [matchCount, playerCount, topScorer] = await Promise.all([
    db.execute({
      sql: "SELECT COUNT(*) as count FROM matches WHERE recorded_by = ?",
      args: [userId],
    }),
    db.execute({
      sql: "SELECT COUNT(*) as count FROM players WHERE user_id = ? AND is_active = 1",
      args: [userId],
    }),
    db.execute({
      sql: `SELECT name, goals_for, avatar_seed FROM players
            WHERE user_id = ? AND is_active = 1 ORDER BY goals_for DESC LIMIT 1`,
      args: [userId],
    }),
  ])
  return {
    totalMatches: (matchCount.rows[0] as Record<string, unknown>).count as number,
    totalPlayers: (playerCount.rows[0] as Record<string, unknown>).count as number,
    topScorer: topScorer.rows[0] as unknown as
      | { name: string; goals_for: number; avatar_seed: string }
      | undefined,
  }
}
