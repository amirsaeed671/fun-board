import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserId } from "@/lib/session"
import { makeSlug } from "@/lib/slug"
import { parseOrThrow, settingsSchema, ValidationError } from "@/lib/validation"

async function uniqueSlug(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const slug = makeSlug()
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE share_slug = ?",
      args: [slug],
    })
    if (existing.rows.length === 0) return slug
  }
  return makeSlug(14)
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { leaderboardName, action } = parseOrThrow(settingsSchema, body)

    if (action === "regenerate-slug") {
      const slug = await uniqueSlug()
      await db.execute({
        sql: "UPDATE users SET share_slug = ? WHERE id = ?",
        args: [slug, userId],
      })
      return NextResponse.json({ ok: true, slug })
    }

    if (leaderboardName) {
      await db.execute({
        sql: "UPDATE users SET leaderboard_name = ? WHERE id = ?",
        args: [leaderboardName, userId],
      })
    }
    return NextResponse.json({ ok: true, leaderboardName })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[fun-board] Settings PATCH error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
