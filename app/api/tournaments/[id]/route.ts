import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const [tournament, participants, matches] = await Promise.all([
      db.execute({ sql: "SELECT * FROM tournaments WHERE id = ?", args: [id] }),
      db.execute({
        sql: `SELECT tp.*, p.name as player_name, p.avatar_seed, p.elo
              FROM tournament_participants tp
              JOIN players p ON tp.player_id = p.id
              WHERE tp.tournament_id = ?
              ORDER BY tp.points DESC, (tp.goals_for - tp.goals_against) DESC`,
        args: [id],
      }),
      db.execute({
        sql: `SELECT 
                tm.*,
                hp.name as home_player_name, hp.avatar_seed as home_avatar_seed,
                ap.name as away_player_name, ap.avatar_seed as away_avatar_seed,
                m.home_score, m.away_score
              FROM tournament_matches tm
              LEFT JOIN tournament_participants htp ON tm.home_participant_id = htp.id
              LEFT JOIN players hp ON htp.player_id = hp.id
              LEFT JOIN tournament_participants atp ON tm.away_participant_id = atp.id
              LEFT JOIN players ap ON atp.player_id = ap.id
              LEFT JOIN matches m ON tm.match_id = m.id
              WHERE tm.tournament_id = ?
              ORDER BY tm.round ASC, tm.position ASC`,
        args: [id],
      }),
    ])

    if (!tournament.rows[0]) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
    }

    return NextResponse.json({
      tournament: tournament.rows[0],
      participants: participants.rows,
      matches: matches.rows,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
