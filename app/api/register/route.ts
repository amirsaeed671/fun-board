import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/lib/db"
import { migrate } from "@/lib/migrate"
import { makeSlug, slugifyUsername } from "@/lib/slug"
import { parseOrThrow, registerSchema, ValidationError } from "@/lib/validation"

async function uniqueSlug(base: string): Promise<string> {
  let slug = base
  for (let i = 0; i < 8; i++) {
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE share_slug = ?",
      args: [slug],
    })
    if (existing.rows.length === 0) return slug
    slug = makeSlug()
  }
  return makeSlug(14)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password, displayName } = parseOrThrow(registerSchema, body)

    await migrate()

    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE username = ?",
      args: [username],
    })
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 })
    }

    const hash = await bcrypt.hash(password, 12)
    const id = uuidv4()
    const name = displayName?.trim() || username
    const slug = await uniqueSlug(slugifyUsername(username))

    await db.execute({
      sql: `INSERT INTO users (id, username, password_hash, display_name, leaderboard_name, share_slug)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, username, hash, name, `${name}'s League`, slug],
    })

    return NextResponse.json({ ok: true, id, slug })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[fun-board] Register error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
