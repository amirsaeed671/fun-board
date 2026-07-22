import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { migrate } from "@/lib/migrate"
import { recomputeUser } from "@/lib/recompute"
import { generateKnockout, advanceKnockout } from "@/lib/tournament"

const DEMO_SLUG = "demo"

const PLAYERS = [
  { name: "Alex", seed: "alex", style: "adventurer" },
  { name: "Sam", seed: "sam", style: "fun-emoji" },
  { name: "Jordan", seed: "jordan", style: "big-smile" },
  { name: "Casey", seed: "casey", style: "bottts" },
]

// Deterministic casual results: [homeIdx, awayIdx, homeScore, awayScore, homeTeam, awayTeam]
const CASUAL: [number, number, number, number, string, string][] = [
  [0, 1, 3, 1, "Real Madrid", "Arsenal"],
  [2, 3, 2, 2, "Barcelona", "Liverpool"],
  [0, 2, 1, 0, "Real Madrid", "Barcelona"],
  [1, 3, 4, 2, "Man City", "Liverpool"],
  [3, 0, 0, 2, "Liverpool", "PSG"],
  [1, 2, 2, 3, "Man City", "Barcelona"],
  [0, 3, 5, 1, "Real Madrid", "Chelsea"],
  [2, 1, 1, 1, "Barcelona", "Arsenal"],
  [3, 2, 3, 0, "Bayern Munich", "Barcelona"],
  [0, 1, 2, 2, "PSG", "Man City"],
  [1, 0, 0, 1, "Arsenal", "Real Madrid"],
  [2, 3, 4, 1, "Barcelona", "Chelsea"],
  [3, 1, 2, 0, "Bayern Munich", "Man City"],
  [0, 2, 3, 3, "Real Madrid", "Juventus"],
  [1, 3, 1, 2, "Arsenal", "Bayern Munich"],
  [2, 0, 0, 4, "Juventus", "Real Madrid"],
]

// Knockout semifinal + final scores (deterministic). Semis pair [0v1] and [2v3].
const SEMI_SCORES: [number, number][] = [
  [2, 1], // seed0 beats seed1
  [1, 3], // seed3 beats seed2
]
const FINAL_SCORE: [number, number] = [2, 0] // higher seed of the two winners wins

export async function POST() {
  try {
    await migrate()

    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE username = 'demo'",
      args: [],
    })
    if (existing.rows.length > 0) {
      return NextResponse.json({
        ok: true,
        message: "Already seeded. Login: demo / demo1234",
        shareUrl: `/l/${DEMO_SLUG}`,
      })
    }

    // Demo user.
    const userId = uuidv4()
    const hash = await bcrypt.hash("demo1234", 12)
    await db.execute({
      sql: `INSERT INTO users (id, username, password_hash, display_name, leaderboard_name, share_slug)
            VALUES (?, 'demo', ?, 'Demo', 'Demo Weekend League', ?)`,
      args: [userId, hash, DEMO_SLUG],
    })

    // Players.
    const playerIds: string[] = []
    for (const p of PLAYERS) {
      const id = uuidv4()
      playerIds.push(id)
      await db.execute({
        sql: "INSERT INTO players (id, user_id, name, avatar_seed, avatar_style) VALUES (?, ?, ?, ?, ?)",
        args: [id, userId, p.name, p.seed, p.style],
      })
    }

    const base = Date.now()
    const day = 86400000
    let matchNo = 0
    const insertMatch = async (
      homeId: string,
      awayId: string,
      hs: number,
      as: number,
      ht: string | null,
      at: string | null,
      daysAgo: number,
      tournamentId: string | null,
      round: number | null,
      stage: string | null
    ): Promise<string> => {
      const id = uuidv4()
      const playedAt = new Date(base - daysAgo * day).toISOString()
      await db.execute({
        sql: `INSERT INTO matches
                (id, home_player_id, away_player_id, home_score, away_score,
                 home_team, away_team, stage,
                 home_elo_before, away_elo_before, home_elo_after, away_elo_after,
                 tournament_id, tournament_round, recorded_by, played_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1000, 1000, 1000, 1000, ?, ?, ?, ?)`,
        args: [id, homeId, awayId, hs, as, ht, at, stage, tournamentId, round, userId, playedAt],
      })
      matchNo++
      return id
    }

    // Casual matches (older → newer), spread over ~30 days.
    for (let i = 0; i < CASUAL.length; i++) {
      const [h, a, hs, as, ht, at] = CASUAL[i]
      await insertMatch(playerIds[h], playerIds[a], hs, as, ht, at, 30 - i, null, null, null)
    }

    // Completed knockout tournament with all 4 players.
    const tournamentId = uuidv4()
    await db.execute({
      sql: "INSERT INTO tournaments (id, name, format, status, created_by, started_at) VALUES (?, 'Demo Champions Cup', 'knockout', 'active', ?, datetime('now'))",
      args: [tournamentId, userId],
    })
    const participantIds: string[] = []
    const participantPlayer: Record<string, string> = {}
    for (let i = 0; i < playerIds.length; i++) {
      const pid = uuidv4()
      participantIds.push(pid)
      participantPlayer[pid] = playerIds[i]
      await db.execute({
        sql: "INSERT INTO tournament_participants (id, tournament_id, player_id, seed) VALUES (?, ?, ?, ?)",
        args: [pid, tournamentId, playerIds[i], i + 1],
      })
    }
    await generateKnockout(tournamentId, participantIds)

    // Helper to record a tournament fixture result.
    const recordFixture = async (tmId: string, daysAgo: number, stage: string) => {
      const tmRes = await db.execute({
        sql: "SELECT * FROM tournament_matches WHERE id = ?",
        args: [tmId],
      })
      const tm = tmRes.rows[0] as Record<string, unknown>
      const homePart = tm.home_participant_id as string
      const awayPart = tm.away_participant_id as string
      const homePlayer = participantPlayer[homePart]
      const awayPlayer = participantPlayer[awayPart]
      // Choose scores: semis from SEMI_SCORES by position, final fixed.
      const round = tm.round as number
      const pos = tm.position as number
      const [hs, as] = round === 1 ? SEMI_SCORES[pos - 1] ?? [1, 0] : FINAL_SCORE
      const matchId = await insertMatch(homePlayer, awayPlayer, hs, as, null, null, daysAgo, tournamentId, round, stage)
      const winnerPart = hs > as ? homePart : awayPart
      await db.execute({
        sql: "UPDATE tournament_matches SET match_id = ?, winner_participant_id = ?, status = 'completed' WHERE id = ?",
        args: [matchId, winnerPart, tmId],
      })
    }

    // Play both semis, then advance to create the final.
    const semis = await db.execute({
      sql: "SELECT id FROM tournament_matches WHERE tournament_id = ? AND round = 1 ORDER BY position ASC",
      args: [tournamentId],
    })
    let d = 5
    for (const row of semis.rows) {
      await recordFixture((row as Record<string, unknown>).id as string, d, "semi")
      d--
    }
    await advanceKnockout(userId, tournamentId)

    // Play the final, then advance (completes the tournament + bonuses).
    const finalRes = await db.execute({
      sql: "SELECT id FROM tournament_matches WHERE tournament_id = ? AND round = 2 ORDER BY position ASC",
      args: [tournamentId],
    })
    if (finalRes.rows[0]) {
      await recordFixture((finalRes.rows[0] as Record<string, unknown>).id as string, 1, "final")
      await advanceKnockout(userId, tournamentId)
    }

    // Rebuild all derived data (Elo, points, standings) from the seeded matches.
    await recomputeUser(userId)

    return NextResponse.json({
      ok: true,
      message: `Seeded ${matchNo} matches + 1 tournament. Login: demo / demo1234`,
      shareUrl: `/l/${DEMO_SLUG}`,
    })
  } catch (error) {
    console.error("[fun-board] Seed error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
