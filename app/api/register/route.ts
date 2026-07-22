import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/lib/db"
import { migrate } from "@/lib/migrate"

export async function POST(req: NextRequest) {
  try {
    const { username, password, displayName } = await req.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      )
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Ensure tables exist
    await migrate()

    // Check existing
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE username = ?",
      args: [username],
    })

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      )
    }

    const hash = await bcrypt.hash(password, 12)
    const id = uuidv4()

    await db.execute({
      sql: "INSERT INTO users (id, username, password_hash, display_name) VALUES (?, ?, ?, ?)",
      args: [id, username, hash, displayName ?? username],
    })

    return NextResponse.json({ ok: true, id })
  } catch (error) {
    console.error("[v0] Register error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
