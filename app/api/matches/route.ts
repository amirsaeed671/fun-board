import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { calculateEloChanges } from "@/lib/elo"
import { migrate } from "@/lib/migrate"

export async function GET() {
  try {
    await migrate()
    const result = await db.execute(`
      SELECT m.*,
        hp.name as home_player_name, hp.avatar_seed as home_avatar_seed,
        ap.name as away_player_name, ap.avatar_seed as away_avatar_seed,
        u.username as recorder_name
      FROM matches m
      JOIN players hp ON m.home_player_id = hp.id
      JOIN players ap ON m.away_player_id = ap.id
      JOIN users u ON m.recorded_by = u.id
      ORDER BY m.played_at DESC
      LIMIT 50
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("[v0] Matches GET error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { homePlayerId, awayPlayerId, homeScore, awayScore, notes, tournamentId, tournamentMatchId } =
      await req.json()

    if (homePlayerId === awayPlayerId) {
      return NextResponse.json(
        { error: "Players must be different" },
        { status: 400 }
      )
    }

    await migrate()

    // Get current Elo ratings
    const [homeResult, awayResult] = await Promise.all([
      db.execute({ sql: "SELECT * FROM players WHERE id = ?", args: [homePlayerId] }),
      db.execute({ sql: "SELECT * FROM players WHERE id = ?", args: [awayPlayerId] }),
    ])

    const home = homeResult.rows[0] as Record<string, unknown>
    const away = awayResult.rows[0] as Record<string, unknown>

    if (!home || !away) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    const homeEloBefore = home.elo as number
    const awayEloBefore = away.elo as number

    const result =
      homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw"
    const { homeAfter, awayAfter } = calculateEloChanges(
      homeEloBefore,
      awayEloBefore,
      result
    )

    const matchId = uuidv4()
    const historyHomeId = uuidv4()
    const historyAwayId = uuidv4()

    // Update in a transaction-like sequence
    await db.execute({
      sql: `INSERT INTO matches 
        (id, home_player_id, away_player_id, home_score, away_score,
         home_elo_before, away_elo_before, home_elo_after, away_elo_after,
         tournament_id, recorded_by, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        matchId, homePlayerId, awayPlayerId, homeScore, awayScore,
        homeEloBefore, awayEloBefore, homeAfter, awayAfter,
        tournamentId ?? null, session.user.id, notes ?? null,
      ],
    })

    // Update player stats
    const homeWins = homeScore > awayScore ? 1 : 0
    const homeLosses = homeScore < awayScore ? 1 : 0
    const homeDraws = homeScore === awayScore ? 1 : 0
    const awayWins = awayScore > homeScore ? 1 : 0
    const awayLosses = awayScore < homeScore ? 1 : 0
    const awayDraws = homeScore === awayScore ? 1 : 0

    await Promise.all([
      db.execute({
        sql: `UPDATE players SET 
          elo = ?, wins = wins + ?, losses = losses + ?, draws = draws + ?,
          goals_for = goals_for + ?, goals_against = goals_against + ?
          WHERE id = ?`,
        args: [homeAfter, homeWins, homeLosses, homeDraws, homeScore, awayScore, homePlayerId],
      }),
      db.execute({
        sql: `UPDATE players SET 
          elo = ?, wins = wins + ?, losses = losses + ?, draws = draws + ?,
          goals_for = goals_for + ?, goals_against = goals_against + ?
          WHERE id = ?`,
        args: [awayAfter, awayWins, awayLosses, awayDraws, awayScore, homeScore, awayPlayerId],
      }),
      db.execute({
        sql: "INSERT INTO elo_history (id, player_id, elo, match_id) VALUES (?, ?, ?, ?)",
        args: [historyHomeId, homePlayerId, homeAfter, matchId],
      }),
      db.execute({
        sql: "INSERT INTO elo_history (id, player_id, elo, match_id) VALUES (?, ?, ?, ?)",
        args: [historyAwayId, awayPlayerId, awayAfter, matchId],
      }),
    ])

    // Update tournament match if applicable
    if (tournamentMatchId) {
      const winnerResult = 
        homeScore > awayScore ? homePlayerId : 
        awayScore > homeScore ? awayPlayerId : null

      // Get participant IDs
      const tmResult = await db.execute({
        sql: "SELECT * FROM tournament_matches WHERE id = ?",
        args: [tournamentMatchId],
      })
      const tm = tmResult.rows[0] as Record<string, unknown>

      if (tm) {
        const winnerParticipantId = winnerResult === homePlayerId 
          ? tm.home_participant_id 
          : tm.away_participant_id

        await db.execute({
          sql: "UPDATE tournament_matches SET match_id = ?, winner_participant_id = ?, status = 'completed' WHERE id = ?",
          args: [matchId, winnerParticipantId ?? null, tournamentMatchId],
        })

        // Update tournament participant stats
        if (tm.home_participant_id) {
          await db.execute({
            sql: `UPDATE tournament_participants SET 
              wins = wins + ?, losses = losses + ?, draws = draws + ?,
              points = points + ?, goals_for = goals_for + ?, goals_against = goals_against + ?
              WHERE id = ?`,
            args: [
              homeWins, homeLosses, homeDraws,
              homeWins * 3 + homeDraws,
              homeScore, awayScore,
              tm.home_participant_id,
            ],
          })
        }
        if (tm.away_participant_id) {
          await db.execute({
            sql: `UPDATE tournament_participants SET 
              wins = wins + ?, losses = losses + ?, draws = draws + ?,
              points = points + ?, goals_for = goals_for + ?, goals_against = goals_against + ?
              WHERE id = ?`,
            args: [
              awayWins, awayLosses, awayDraws,
              awayWins * 3 + awayDraws,
              awayScore, homeScore,
              tm.away_participant_id,
            ],
          })
        }
      }
    }

    const matchResult = await db.execute({
      sql: "SELECT * FROM matches WHERE id = ?",
      args: [matchId],
    })
    return NextResponse.json(matchResult.rows[0], { status: 201 })
  } catch (error) {
    console.error("[v0] Match POST error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
