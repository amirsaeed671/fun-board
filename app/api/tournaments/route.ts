import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { migrate } from "@/lib/migrate"

export async function GET() {
  try {
    await migrate()
    const result = await db.execute(`
      SELECT t.*, COUNT(tp.id) as participant_count
      FROM tournaments t
      LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, format, playerIds } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 })
    }

    await migrate()

    const tournamentId = uuidv4()

    await db.execute({
      sql: "INSERT INTO tournaments (id, name, format, created_by) VALUES (?, ?, ?, ?)",
      args: [tournamentId, name.trim(), format ?? "knockout", session.user.id],
    })

    // Add participants
    if (playerIds?.length > 0) {
      for (let i = 0; i < playerIds.length; i++) {
        const participantId = uuidv4()
        await db.execute({
          sql: "INSERT INTO tournament_participants (id, tournament_id, player_id, seed) VALUES (?, ?, ?, ?)",
          args: [participantId, tournamentId, playerIds[i], i + 1],
        })
      }
    }

    // Generate bracket for knockout
    if (format === "knockout" && playerIds?.length >= 2) {
      await generateKnockoutBracket(tournamentId, playerIds)
      await db.execute({
        sql: "UPDATE tournaments SET status = 'active', started_at = datetime('now') WHERE id = ?",
        args: [tournamentId],
      })
    }

    // Generate round-robin matches
    if (format === "round-robin" && playerIds?.length >= 2) {
      await generateRoundRobin(tournamentId, playerIds)
      await db.execute({
        sql: "UPDATE tournaments SET status = 'active', started_at = datetime('now') WHERE id = ?",
        args: [tournamentId],
      })
    }

    const result = await db.execute({
      sql: "SELECT * FROM tournaments WHERE id = ?",
      args: [tournamentId],
    })
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error("[v0] Tournament POST error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

async function getParticipantId(tournamentId: string, playerId: string): Promise<string | null> {
  const result = await db.execute({
    sql: "SELECT id FROM tournament_participants WHERE tournament_id = ? AND player_id = ?",
    args: [tournamentId, playerId],
  })
  return (result.rows[0] as Record<string, unknown>)?.id as string ?? null
}

async function generateKnockoutBracket(tournamentId: string, playerIds: string[]) {
  // Pair up players in round 1
  const pairs = Math.floor(playerIds.length / 2)
  for (let i = 0; i < pairs; i++) {
    const tmId = uuidv4()
    const homeParticipantId = await getParticipantId(tournamentId, playerIds[i * 2])
    const awayParticipantId = await getParticipantId(tournamentId, playerIds[i * 2 + 1])
    await db.execute({
      sql: `INSERT INTO tournament_matches (id, tournament_id, round, position, home_participant_id, away_participant_id)
            VALUES (?, ?, 1, ?, ?, ?)`,
      args: [tmId, tournamentId, i + 1, homeParticipantId, awayParticipantId],
    })
  }
  // If odd number, give bye to last player
  if (playerIds.length % 2 !== 0) {
    const tmId = uuidv4()
    const byeParticipantId = await getParticipantId(tournamentId, playerIds[playerIds.length - 1])
    await db.execute({
      sql: `INSERT INTO tournament_matches (id, tournament_id, round, position, home_participant_id, away_participant_id, winner_participant_id, status)
            VALUES (?, ?, 1, ?, ?, NULL, ?, 'completed')`,
      args: [tmId, tournamentId, pairs + 1, byeParticipantId, byeParticipantId],
    })
  }
}

async function generateRoundRobin(tournamentId: string, playerIds: string[]) {
  let matchPos = 1
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      const tmId = uuidv4()
      const homeParticipantId = await getParticipantId(tournamentId, playerIds[i])
      const awayParticipantId = await getParticipantId(tournamentId, playerIds[j])
      await db.execute({
        sql: `INSERT INTO tournament_matches (id, tournament_id, round, position, home_participant_id, away_participant_id)
              VALUES (?, ?, 1, ?, ?, ?)`,
        args: [tmId, tournamentId, matchPos, homeParticipantId, awayParticipantId],
      })
      matchPos++
    }
  }
}
