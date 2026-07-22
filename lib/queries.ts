import { db } from "./db"

export interface Player {
  id: string
  user_id: string | null
  name: string
  avatar_seed: string
  elo: number
  wins: number
  losses: number
  draws: number
  goals_for: number
  goals_against: number
  is_active: number
  created_at: string
}

export interface Match {
  id: string
  home_player_id: string
  away_player_id: string
  home_score: number
  away_score: number
  home_elo_before: number
  away_elo_before: number
  home_elo_after: number
  away_elo_after: number
  tournament_id: string | null
  recorded_by: string
  played_at: string
  notes: string | null
  home_player_name?: string
  home_avatar_seed?: string
  away_player_name?: string
  away_avatar_seed?: string
  recorder_name?: string
}

export interface Tournament {
  id: string
  name: string
  format: string
  status: string
  created_by: string
  created_at: string
  started_at: string | null
  ended_at: string | null
  participant_count?: number
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

// Players
export async function getAllPlayers(): Promise<Player[]> {
  const result = await db.execute(
    "SELECT * FROM players WHERE is_active = 1 ORDER BY elo DESC"
  )
  return result.rows as unknown as Player[]
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const result = await db.execute({
    sql: "SELECT * FROM players WHERE id = ?",
    args: [id],
  })
  return (result.rows[0] as unknown as Player) ?? null
}

export async function getLeaderboard(): Promise<Player[]> {
  const result = await db.execute(`
    SELECT *, 
      (wins + losses + draws) as total_matches,
      CASE WHEN (wins + losses + draws) > 0 
        THEN ROUND(wins * 100.0 / (wins + losses + draws), 1) 
        ELSE 0 END as win_rate
    FROM players 
    WHERE is_active = 1 
    ORDER BY elo DESC
  `)
  return result.rows as unknown as Player[]
}

export async function getPlayerMatchHistory(playerId: string, limit = 20): Promise<Match[]> {
  const result = await db.execute({
    sql: `
      SELECT m.*,
        hp.name as home_player_name, hp.avatar_seed as home_avatar_seed,
        ap.name as away_player_name, ap.avatar_seed as away_avatar_seed
      FROM matches m
      JOIN players hp ON m.home_player_id = hp.id
      JOIN players ap ON m.away_player_id = ap.id
      WHERE m.home_player_id = ? OR m.away_player_id = ?
      ORDER BY m.played_at DESC
      LIMIT ?
    `,
    args: [playerId, playerId, limit],
  })
  return result.rows as unknown as Match[]
}

export async function getPlayerEloHistory(playerId: string): Promise<{ elo: number; recorded_at: string; match_id: string }[]> {
  const result = await db.execute({
    sql: `
      SELECT elo, recorded_at, match_id FROM elo_history
      WHERE player_id = ?
      ORDER BY recorded_at ASC
      LIMIT 30
    `,
    args: [playerId],
  })
  return result.rows as unknown as { elo: number; recorded_at: string; match_id: string }[]
}

// Matches
export async function getRecentMatches(limit = 10): Promise<Match[]> {
  const result = await db.execute({
    sql: `
      SELECT m.*,
        hp.name as home_player_name, hp.avatar_seed as home_avatar_seed,
        ap.name as away_player_name, ap.avatar_seed as away_avatar_seed,
        u.username as recorder_name
      FROM matches m
      JOIN players hp ON m.home_player_id = hp.id
      JOIN players ap ON m.away_player_id = ap.id
      JOIN users u ON m.recorded_by = u.id
      ORDER BY m.played_at DESC
      LIMIT ?
    `,
    args: [limit],
  })
  return result.rows as unknown as Match[]
}

// Tournaments
export async function getAllTournaments(): Promise<Tournament[]> {
  const result = await db.execute(`
    SELECT t.*, COUNT(tp.id) as participant_count
    FROM tournaments t
    LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `)
  return result.rows as unknown as Tournament[]
}

export async function getTournamentById(id: string): Promise<Tournament | null> {
  const result = await db.execute({
    sql: "SELECT * FROM tournaments WHERE id = ?",
    args: [id],
  })
  return (result.rows[0] as unknown as Tournament) ?? null
}

export async function getTournamentParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
  const result = await db.execute({
    sql: `
      SELECT tp.*, p.name as player_name, p.avatar_seed, p.elo
      FROM tournament_participants tp
      JOIN players p ON tp.player_id = p.id
      WHERE tp.tournament_id = ?
      ORDER BY tp.points DESC, (tp.goals_for - tp.goals_against) DESC
    `,
    args: [tournamentId],
  })
  return result.rows as unknown as TournamentParticipant[]
}

export async function getTournamentMatches(tournamentId: string): Promise<TournamentMatch[]> {
  const result = await db.execute({
    sql: `
      SELECT 
        tm.*,
        hp.name as home_player_name, hp.avatar_seed as home_avatar_seed,
        ap.name as away_player_name, ap.avatar_seed as away_avatar_seed,
        m.home_score, m.away_score
      FROM tournament_matches tm
      LEFT JOIN tournament_participants htp ON tm.home_participant_id = htp.id
      LEFT JOIN players hp ON htp.player_id = hp.id
      LEFT JOIN tournament_participants atp ON tm.away_participant_id = atp.id
      LEFT JOIN players ap ON atp.player_id = ap.id
      LEFT JOIN matches m ON tm.match_id = m.id
      WHERE tm.tournament_id = ?
      ORDER BY tm.round ASC, tm.position ASC
    `,
    args: [tournamentId],
  })
  return result.rows as unknown as TournamentMatch[]
}

// Stats
export async function getGlobalStats() {
  const [matchCount, playerCount, topScorer] = await Promise.all([
    db.execute("SELECT COUNT(*) as count FROM matches"),
    db.execute("SELECT COUNT(*) as count FROM players WHERE is_active = 1"),
    db.execute(`
      SELECT name, goals_for, avatar_seed FROM players 
      WHERE is_active = 1 ORDER BY goals_for DESC LIMIT 1
    `),
  ])
  return {
    totalMatches: (matchCount.rows[0] as Record<string, unknown>).count as number,
    totalPlayers: (playerCount.rows[0] as Record<string, unknown>).count as number,
    topScorer: topScorer.rows[0] as unknown as { name: string; goals_for: number; avatar_seed: string } | undefined,
  }
}
