import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserId } from "@/lib/session"
import { completeTournament, deleteTournament } from "@/lib/tournament"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await params
    const [tournament, participants, matches] = await Promise.all([
      db.execute({ sql: "SELECT * FROM tournaments WHERE id = ? AND created_by = ?", args: [id, userId] }),
      db.execute({
        sql: `SELECT tp.*, p.name as player_name, p.avatar_seed, p.elo
              FROM tournament_participants tp
              JOIN players p ON tp.player_id = p.id
              JOIN tournaments t ON tp.tournament_id = t.id
              WHERE tp.tournament_id = ? AND t.created_by = ?
              ORDER BY tp.points DESC, (tp.goals_for - tp.goals_against) DESC`,
        args: [id, userId],
      }),
      db.execute({
        sql: `SELECT tm.*, m.home_score, m.away_score
              FROM tournament_matches tm
              JOIN tournaments t ON tm.tournament_id = t.id
              LEFT JOIN matches m ON tm.match_id = m.id
              WHERE tm.tournament_id = ? AND t.created_by = ?
              ORDER BY tm.round ASC, tm.position ASC`,
        args: [id, userId],
      }),
    ])

    if (!tournament.rows[0]) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
    }
    return NextResponse.json({
      tournament: tournament.rows[0],
      participants: participants.rows,
      matches: matches.rows,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    if (body.action !== "complete") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    const tRes = await db.execute({
      sql: "SELECT * FROM tournaments WHERE id = ? AND created_by = ?",
      args: [id, userId],
    })
    const tournament = tRes.rows[0] as Record<string, unknown> | undefined
    if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // League completion: winner/runner-up are the top of the standings.
    const standings = await db.execute({
      sql: `SELECT player_id FROM tournament_participants
            WHERE tournament_id = ?
            ORDER BY points DESC, (goals_for - goals_against) DESC, goals_for DESC`,
      args: [id],
    })
    if (standings.rows.length < 1) {
      return NextResponse.json({ error: "No participants" }, { status: 400 })
    }
    const winner = (standings.rows[0] as Record<string, unknown>).player_id as string
    const runnerUp =
      (standings.rows[1] as Record<string, unknown> | undefined)?.player_id as string | undefined

    await completeTournament(userId, id, winner, runnerUp ?? null)

    const updated = await db.execute({ sql: "SELECT * FROM tournaments WHERE id = ?", args: [id] })
    return NextResponse.json(updated.rows[0])
  } catch (error) {
    console.error("[fun-board] Tournament PATCH error:", error)
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
    await deleteTournament(userId, id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
