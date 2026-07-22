import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserId } from "@/lib/session"
import { parseOrThrow, playerUpdateSchema, ValidationError } from "@/lib/validation"

async function ownsPlayer(userId: string, id: string): Promise<boolean> {
  const res = await db.execute({
    sql: "SELECT id FROM players WHERE id = ? AND user_id = ?",
    args: [id, userId],
  })
  return res.rows.length > 0
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    if (!(await ownsPlayer(userId, id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const body = await req.json()
    const { name, avatarSeed, avatarStyle } = parseOrThrow(playerUpdateSchema, body)

    await db.execute({
      sql: `UPDATE players SET
              name = COALESCE(?, name),
              avatar_seed = COALESCE(?, avatar_seed),
              avatar_style = COALESCE(?, avatar_style)
            WHERE id = ? AND user_id = ?`,
      args: [name ?? null, avatarSeed ?? null, avatarStyle ?? null, id, userId],
    })

    const result = await db.execute({
      sql: "SELECT * FROM players WHERE id = ?",
      args: [id],
    })
    return NextResponse.json(result.rows[0])
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
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
    if (!(await ownsPlayer(userId, id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const matchCount = await db.execute({
      sql: "SELECT COUNT(*) as count FROM matches WHERE recorded_by = ? AND (home_player_id = ? OR away_player_id = ?)",
      args: [userId, id, id],
    })
    const count = (matchCount.rows[0] as Record<string, unknown>).count as number

    if (count > 0) {
      // Archive rather than delete so match history stays intact.
      await db.execute({
        sql: "UPDATE players SET is_active = 0 WHERE id = ? AND user_id = ?",
        args: [id, userId],
      })
      return NextResponse.json({ ok: true, archived: true })
    }

    await db.execute({
      sql: "DELETE FROM players WHERE id = ? AND user_id = ?",
      args: [id, userId],
    })
    return NextResponse.json({ ok: true, archived: false })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
