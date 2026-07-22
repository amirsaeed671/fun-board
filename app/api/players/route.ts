import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { getRandomSeed } from "@/lib/avatar"
import { migrate } from "@/lib/migrate"

export async function GET() {
  try {
    await migrate()
    const result = await db.execute(
      "SELECT * FROM players WHERE is_active = 1 ORDER BY elo DESC"
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("[v0] Players GET error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, avatarSeed } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    await migrate()

    const id = uuidv4()
    const seed = avatarSeed ?? getRandomSeed()

    await db.execute({
      sql: "INSERT INTO players (id, user_id, name, avatar_seed) VALUES (?, ?, ?, ?)",
      args: [id, session.user.id, name.trim(), seed],
    })

    const result = await db.execute({
      sql: "SELECT * FROM players WHERE id = ?",
      args: [id],
    })

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error("[v0] Player POST error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
