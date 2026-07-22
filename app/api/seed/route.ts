import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { migrate } from "@/lib/migrate"
import { calculateEloChanges } from "@/lib/elo"

const PLAYERS = [
  { name: "Messi", seed: "messi" },
  { name: "Ronaldo", seed: "ronaldo" },
  { name: "Neymar", seed: "neymar" },
  { name: "Mbappe", seed: "mbappe" },
  { name: "Haaland", seed: "haaland" },
  { name: "Salah", seed: "salah" },
  { name: "De Bruyne", seed: "debruyne" },
  { name: "Lewandowski", seed: "lewandowski" },
]

export async function POST() {
  try {
    await migrate()

    // Check if already seeded
    const existing = await db.execute("SELECT COUNT(*) as count FROM players")
    const count = (existing.rows[0] as Record<string, unknown>).count as number
    if (count > 0) {
      return NextResponse.json({ ok: true, message: "Already seeded" })
    }

    // Create admin user
    const adminId = uuidv4()
    const hash = await bcrypt.hash("admin123", 12)
    await db.execute({
      sql: "INSERT INTO users (id, username, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)",
      args: [adminId, "admin", hash, "Admin", "admin"],
    })

    // Create players
    const playerIds: string[] = []
    for (const p of PLAYERS) {
      const id = uuidv4()
      playerIds.push(id)
      await db.execute({
        sql: "INSERT INTO players (id, name, avatar_seed) VALUES (?, ?, ?)",
        args: [id, p.name, p.seed],
      })
    }

    // Simulate 30 random matches
    for (let i = 0; i < 30; i++) {
      const homeIdx = Math.floor(Math.random() * playerIds.length)
      let awayIdx = Math.floor(Math.random() * playerIds.length)
      while (awayIdx === homeIdx) {
        awayIdx = Math.floor(Math.random() * playerIds.length)
      }

      const homeId = playerIds[homeIdx]
      const awayId = playerIds[awayIdx]

      const homeResult = await db.execute({
        sql: "SELECT elo FROM players WHERE id = ?",
        args: [homeId],
      })
      const awayResult = await db.execute({
        sql: "SELECT elo FROM players WHERE id = ?",
        args: [awayId],
      })

      const homeElo = (homeResult.rows[0] as Record<string, unknown>).elo as number
      const awayElo = (awayResult.rows[0] as Record<string, unknown>).elo as number

      const homeScore = Math.floor(Math.random() * 5)
      const awayScore = Math.floor(Math.random() * 5)
      const result = homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw"
      const { homeAfter, awayAfter } = calculateEloChanges(homeElo, awayElo, result)

      const matchId = uuidv4()
      await db.execute({
        sql: `INSERT INTO matches 
          (id, home_player_id, away_player_id, home_score, away_score,
           home_elo_before, away_elo_before, home_elo_after, away_elo_after,
           recorded_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [matchId, homeId, awayId, homeScore, awayScore, homeElo, awayElo, homeAfter, awayAfter, adminId],
      })

      const homeWins = homeScore > awayScore ? 1 : 0
      const homeLosses = homeScore < awayScore ? 1 : 0
      const homeDraws = homeScore === awayScore ? 1 : 0

      await Promise.all([
        db.execute({
          sql: `UPDATE players SET elo=?, wins=wins+?, losses=losses+?, draws=draws+?, goals_for=goals_for+?, goals_against=goals_against+? WHERE id=?`,
          args: [homeAfter, homeWins, homeLosses, homeDraws, homeScore, awayScore, homeId],
        }),
        db.execute({
          sql: `UPDATE players SET elo=?, wins=wins+?, losses=losses+?, draws=draws+?, goals_for=goals_for+?, goals_against=goals_against+? WHERE id=?`,
          args: [awayAfter, 1 - homeWins - homeDraws, 1 - homeLosses - homeDraws, homeDraws, awayScore, homeScore, awayId],
        }),
        db.execute({
          sql: "INSERT INTO elo_history (id, player_id, elo, match_id) VALUES (?, ?, ?, ?)",
          args: [uuidv4(), homeId, homeAfter, matchId],
        }),
        db.execute({
          sql: "INSERT INTO elo_history (id, player_id, elo, match_id) VALUES (?, ?, ?, ?)",
          args: [uuidv4(), awayId, awayAfter, matchId],
        }),
      ])
    }

    return NextResponse.json({
      ok: true,
      message: "Seeded successfully. Admin login: admin / admin123",
    })
  } catch (error) {
    console.error("[v0] Seed error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
