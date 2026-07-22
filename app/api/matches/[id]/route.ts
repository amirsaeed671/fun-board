import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserId } from "@/lib/session"
import { recomputeUser } from "@/lib/recompute"
import { advanceKnockout, undoTournamentResult } from "@/lib/tournament"
import { parseOrThrow, matchUpdateSchema, ValidationError } from "@/lib/validation"

async function loadOwnedMatch(userId: string, id: string) {
  const res = await db.execute({
    sql: "SELECT * FROM matches WHERE id = ? AND recorded_by = ?",
    args: [id, userId],
  })
  return res.rows[0] as Record<string, unknown> | undefined
}

async function findTournamentMatch(matchId: string) {
  const res = await db.execute({
    sql: `SELECT tm.*, t.format FROM tournament_matches tm
          JOIN tournaments t ON tm.tournament_id = t.id
          WHERE tm.match_id = ?`,
    args: [matchId],
  })
  return res.rows[0] as Record<string, unknown> | undefined
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const match = await loadOwnedMatch(userId, id)
    if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const body = await req.json()
    const upd = parseOrThrow(matchUpdateSchema, body)

    const homeScore = upd.homeScore ?? (match.home_score as number)
    const awayScore = upd.awayScore ?? (match.away_score as number)
    const isDraw = homeScore === awayScore

    // Determine tournament linkage.
    const tm = await findTournamentMatch(id)
    const isKnockout = tm && (tm.format as string) === "knockout"

    let shootout = upd.shootoutWinnerId ?? (match.shootout_winner_id as string | null)
    if (isKnockout && isDraw) {
      if (shootout !== match.home_player_id && shootout !== match.away_player_id) {
        return NextResponse.json(
          { error: "A knockout match can't be a draw — pick a shootout winner." },
          { status: 400 }
        )
      }
    }
    if (!isDraw) shootout = null

    await db.execute({
      sql: `UPDATE matches SET
              home_score = ?, away_score = ?,
              home_team = COALESCE(?, home_team),
              away_team = COALESCE(?, away_team),
              shootout_winner_id = ?,
              notes = COALESCE(?, notes),
              played_at = COALESCE(?, played_at)
            WHERE id = ? AND recorded_by = ?`,
      args: [
        homeScore,
        awayScore,
        upd.homeTeam ?? null,
        upd.awayTeam ?? null,
        shootout,
        upd.notes ?? null,
        upd.playedAt ?? null,
        id,
        userId,
      ],
    })

    // Re-resolve the tournament fixture winner if this match is linked.
    if (tm) {
      const result = homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw"
      let winner: string | null = null
      if (result === "home") winner = tm.home_participant_id as string | null
      else if (result === "away") winner = tm.away_participant_id as string | null
      else if (shootout === match.home_player_id) winner = tm.home_participant_id as string | null
      else if (shootout === match.away_player_id) winner = tm.away_participant_id as string | null

      if (isKnockout) {
        // Downstream rounds may now be invalid — drop and rebuild them.
        await db.execute({
          sql: "DELETE FROM tournament_matches WHERE tournament_id = ? AND round > ?",
          args: [tm.tournament_id as string, tm.round as number],
        })
        await db.execute({
          sql: "UPDATE tournaments SET status='active', ended_at=NULL, winner_player_id=NULL, runner_up_player_id=NULL WHERE id = ? AND created_by = ?",
          args: [tm.tournament_id as string, userId],
        })
        await db.execute({
          sql: "DELETE FROM point_adjustments WHERE tournament_id = ? AND user_id = ?",
          args: [tm.tournament_id as string, userId],
        })
      }
      await db.execute({
        sql: "UPDATE tournament_matches SET winner_participant_id = ?, status = 'completed' WHERE id = ?",
        args: [winner, tm.id as string],
      })
    }

    await recomputeUser(userId)
    if (tm && isKnockout) {
      await advanceKnockout(userId, tm.tournament_id as string)
    }

    const updated = await db.execute({ sql: "SELECT * FROM matches WHERE id = ?", args: [id] })
    return NextResponse.json(updated.rows[0])
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[fun-board] Match PATCH error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const match = await loadOwnedMatch(userId, id)
    if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const tm = await findTournamentMatch(id)
    if (tm) {
      await undoTournamentResult(userId, tm.id as string)
    }

    await db.batch(
      [
        { sql: "DELETE FROM elo_history WHERE match_id = ?", args: [id] },
        { sql: "DELETE FROM matches WHERE id = ? AND recorded_by = ?", args: [id, userId] },
      ],
      "write"
    )

    await recomputeUser(userId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[fun-board] Match DELETE error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
