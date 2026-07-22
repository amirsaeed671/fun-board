import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/lib/db"
import { getSessionUserId } from "@/lib/session"
import { getRandomSeed } from "@/lib/avatar"
import { migrate } from "@/lib/migrate"
import { parseOrThrow, playerCreateSchema, ValidationError } from "@/lib/validation"

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    await migrate()
    const result = await db.execute({
      sql: "SELECT * FROM players WHERE user_id = ? AND is_active = 1 ORDER BY elo DESC",
      args: [userId],
    })
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("[fun-board] Players GET error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { name, avatarSeed, avatarStyle } = parseOrThrow(playerCreateSchema, body)

    await migrate()

    const id = uuidv4()
    const seed = avatarSeed ?? getRandomSeed()
    const style = avatarStyle ?? "pixel-art"

    await db.execute({
      sql: "INSERT INTO players (id, user_id, name, avatar_seed, avatar_style) VALUES (?, ?, ?, ?, ?)",
      args: [id, userId, name, seed, style],
    })

    const result = await db.execute({
      sql: "SELECT * FROM players WHERE id = ?",
      args: [id],
    })
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[fun-board] Player POST error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
