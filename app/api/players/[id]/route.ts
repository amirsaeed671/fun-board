import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/auth"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const [player, matches, eloHistory] = await Promise.all([
      db.execute({ sql: "SELECT * FROM players WHERE id = ?", args: [id] }),
      db.execute({
        sql: `
          SELECT m.*,
            hp.name as home_player_name, hp.avatar_seed as home_avatar_seed,
            ap.name as away_player_name, ap.avatar_seed as away_avatar_seed
          FROM matches m
          JOIN players hp ON m.home_player_id = hp.id
          JOIN players ap ON m.away_player_id = ap.id
          WHERE m.home_player_id = ? OR m.away_player_id = ?
          ORDER BY m.played_at DESC
          LIMIT 20
        `,
        args: [id, id],
      }),
      db.execute({
        sql: "SELECT elo, recorded_at FROM elo_history WHERE player_id = ? ORDER BY recorded_at ASC LIMIT 30",
        args: [id],
      }),
    ])

    if (!player.rows[0]) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    return NextResponse.json({
      player: player.rows[0],
      matches: matches.rows,
      eloHistory: eloHistory.rows,
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
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { name, avatarSeed } = await req.json()

    await db.execute({
      sql: "UPDATE players SET name = COALESCE(?, name), avatar_seed = COALESCE(?, avatar_seed) WHERE id = ?",
      args: [name ?? null, avatarSeed ?? null, id],
    })

    const result = await db.execute({
      sql: "SELECT * FROM players WHERE id = ?",
      args: [id],
    })
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
