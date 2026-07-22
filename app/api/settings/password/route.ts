import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { getSessionUserId } from "@/lib/session"
import { parseOrThrow, passwordChangeSchema, ValidationError } from "@/lib/validation"

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { currentPassword, newPassword } = parseOrThrow(passwordChangeSchema, body)

    const res = await db.execute({
      sql: "SELECT password_hash FROM users WHERE id = ?",
      args: [userId],
    })
    const row = res.rows[0] as Record<string, unknown> | undefined
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const valid = await bcrypt.compare(currentPassword, row.password_hash as string)
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    const hash = await bcrypt.hash(newPassword, 12)
    await db.execute({
      sql: "UPDATE users SET password_hash = ? WHERE id = ?",
      args: [hash, userId],
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
