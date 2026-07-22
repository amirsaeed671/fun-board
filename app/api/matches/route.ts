import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/lib/db"
import { getSessionUserId } from "@/lib/session"
import { calculateEloChanges } from "@/lib/elo"
import { recomputeUser } from "@/lib/recompute"
import { advanceKnockout } from "@/lib/tournament"
import { migrate } from "@/lib/migrate"
import { parseOrThrow, matchCreateSchema, ValidationError } from "@/lib/validation"

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    await migrate()
    const result = await db.execute({
      sql: `
        SELECT m.*,
          hp.name as home_player_name, hp.avatar_seed as home_avatar_seed,
          ap.name as away_player_name, ap.avatar_seed as away_avatar_seed
        FROM matches m
        JOIN players hp ON m.home_player_id = hp.id
        JOIN players ap ON m.away_player_id = ap.id
        WHERE m.recorded_by = ?
        ORDER BY m.played_at DESC LIMIT 100`,
      args: [userId],
    })
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("[fun-board] Matches GET error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const input = parseOrThrow(matchCreateSchema, body)
    const {
      homePlayerId,
      awayPlayerId,
      homeScore,
      awayScore,
      homeTeam,
      awayTeam,
      stage,
      notes,
      playedAt,
      tournamentMatchId,
      shootoutWinnerId,
    } = input

    if (homePlayerId === awayPlayerId) {
      return NextResponse.json({ error: "Players must be different" }, { status: 400 })
    }

    await migrate()

    // Verify both players belong to this user.
    const [homeResult, awayResult] = await Promise.all([
      db.execute({ sql: "SELECT * FROM players WHERE id = ? AND user_id = ?", args: [homePlayerId, userId] }),
      db.execute({ sql: "SELECT * FROM players WHERE id = ? AND user_id = ?", args: [awayPlayerId, userId] }),
    ])
    const home = homeResult.rows[0] as Record<string, unknown> | undefined
    const away = awayResult.rows[0] as Record<string, unknown> | undefined
    if (!home || !away) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    // Resolve the tournament fixture (if any) — trusting the DB, not the client.
    let tournamentId: string | null = null
    let tournamentRound: number | null = null
    let tmHomeParticipant: string | null = null
    let tmAwayParticipant: string | null = null
    let isKnockout = false
    if (tournamentMatchId) {
      const tmRes = await db.execute({
        sql: `SELECT tm.*, t.format, t.created_by FROM tournament_matches tm
              JOIN tournaments t ON tm.tournament_id = t.id
              WHERE tm.id = ? AND t.created_by = ?`,
        args: [tournamentMatchId, userId],
      })
      const tm = tmRes.rows[0] as Record<string, unknown> | undefined
      if (!tm) {
        return NextResponse.json({ error: "Tournament fixture not found" }, { status: 404 })
      }
      tournamentId = tm.tournament_id as string
      tournamentRound = tm.round as number
      tmHomeParticipant = (tm.home_participant_id as string | null) ?? null
      tmAwayParticipant = (tm.away_participant_id as string | null) ?? null
      isKnockout = (tm.format as string) === "knockout"
    }

    const isDraw = homeScore === awayScore

    // Knockout fixtures must have a winner (penalty shootout on a level score).
    if (isKnockout && isDraw) {
      if (shootoutWinnerId !== homePlayerId && shootoutWinnerId !== awayPlayerId) {
        return NextResponse.json(
          { error: "A knockout match can't be a draw — pick a shootout winner." },
          { status: 400 }
        )
      }
    }

    const homeEloBefore = home.elo as number
    const awayEloBefore = away.elo as number
    const result = homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw"
    const { homeAfter, awayAfter } = calculateEloChanges(homeEloBefore, awayEloBefore, result)

    const matchId = uuidv4()
    await db.execute({
      sql: `INSERT INTO matches
        (id, home_player_id, away_player_id, home_score, away_score,
         home_team, away_team, stage, shootout_winner_id,
         home_elo_before, away_elo_before, home_elo_after, away_elo_after,
         tournament_id, tournament_round, recorded_by, played_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        matchId, homePlayerId, awayPlayerId, homeScore, awayScore,
        homeTeam ?? null, awayTeam ?? null, stage ?? null,
        isDraw && shootoutWinnerId ? shootoutWinnerId : null,
        homeEloBefore, awayEloBefore, homeAfter, awayAfter,
        tournamentId, tournamentRound,
        userId, playedAt ?? new Date().toISOString(), notes ?? null,
      ],
    })

    // Link + resolve the tournament fixture.
    if (tournamentMatchId) {
      let winnerParticipant: string | null = null
      if (result === "home") winnerParticipant = tmHomeParticipant
      else if (result === "away") winnerParticipant = tmAwayParticipant
      else if (shootoutWinnerId === homePlayerId) winnerParticipant = tmHomeParticipant
      else if (shootoutWinnerId === awayPlayerId) winnerParticipant = tmAwayParticipant

      await db.execute({
        sql: "UPDATE tournament_matches SET match_id = ?, winner_participant_id = ?, status = 'completed' WHERE id = ?",
        args: [matchId, winnerParticipant, tournamentMatchId],
      })
    }

    // Recompute all derived data, then advance the bracket if applicable.
    await recomputeUser(userId)
    if (tournamentId && isKnockout) {
      await advanceKnockout(userId, tournamentId)
    }

    const matchResult = await db.execute({
      sql: "SELECT * FROM matches WHERE id = ?",
      args: [matchId],
    })
    return NextResponse.json(matchResult.rows[0], { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[fun-board] Match POST error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
