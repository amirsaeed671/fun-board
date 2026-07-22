import { NextResponse } from "next/server"
import { migrate } from "@/lib/migrate"

export async function POST() {
  try {
    await migrate()
    return NextResponse.json({ ok: true, message: "Database initialized" })
  } catch (error) {
    console.error("[v0] DB init error:", error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
