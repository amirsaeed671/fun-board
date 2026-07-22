import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/lib/db"
import { getSessionUserId } from "@/lib/session"
import { migrate } from "@/lib/migrate"
import { generateKnockout, generateRoundRobin } from "@/lib/tournament"
import { parseOrThrow, tournamentCreateSchema, ValidationError } from "@/lib/validation"

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    await migrate()
    const result = await db.execute({
      sql: `
        SELECT t.*, COUNT(tp.id) as participant_count
        FROM tournaments t
        LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
        WHERE t.created_by = ?
        GROUP BY t.id
        ORDER BY t.created_at DESC`,
      args: [userId],
    })
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { name, format, playerIds } = parseOrThrow(tournamentCreateSchema, body)

    await migrate()

    // Only accept players owned by this user, preserving selection order.
    const owned = await db.execute({
      sql: `SELECT id FROM players WHERE user_id = ? AND is_active = 1`,
      args: [userId],
    })
    const ownedSet = new Set(owned.rows.map((r) => (r as Record<string, unknown>).id as string))
    const players = playerIds.filter((id) => ownedSet.has(id))
    if (players.length < 2) {
      return NextResponse.json({ error: "Select at least 2 of your players" }, { status: 400 })
    }

    const tournamentId = uuidv4()
    await db.execute({
      sql: "INSERT INTO tournaments (id, name, format, status, created_by, started_at) VALUES (?, ?, ?, 'active', ?, datetime('now'))",
      args: [tournamentId, name, format, userId],
    })

    // Create participants (seed = selection order) and remember their ids.
    const participantIds: string[] = []
    const stmts = players.map((playerId, i) => {
      const pid = uuidv4()
      participantIds.push(pid)
      return {
        sql: "INSERT INTO tournament_participants (id, tournament_id, player_id, seed) VALUES (?, ?, ?, ?)",
        args: [pid, tournamentId, playerId, i + 1] as (string | number)[],
      }
    })
    await db.batch(stmts, "write")

    if (format === "knockout") {
      await generateKnockout(tournamentId, participantIds)
    } else {
      await generateRoundRobin(tournamentId, participantIds)
    }

    const result = await db.execute({
      sql: "SELECT * FROM tournaments WHERE id = ?",
      args: [tournamentId],
    })
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[fun-board] Tournament POST error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
