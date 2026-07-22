import { db } from "./db"

export interface BoardMeta {
  userId: string
  leaderboardName: string
  shareSlug: string
  username: string
}

function rowToBoard(row: Record<string, unknown> | undefined): BoardMeta | null {
  if (!row) return null
  return {
    userId: row.id as string,
    leaderboardName:
      (row.leaderboard_name as string | null) ??
      `${(row.display_name as string | null) ?? (row.username as string)}'s League`,
    shareSlug: (row.share_slug as string | null) ?? "",
    username: row.username as string,
  }
}

export async function getBoardBySlug(slug: string): Promise<BoardMeta | null> {
  const res = await db.execute({
    sql: "SELECT id, username, display_name, leaderboard_name, share_slug FROM users WHERE share_slug = ?",
    args: [slug],
  })
  return rowToBoard(res.rows[0] as Record<string, unknown> | undefined)
}

export async function getBoardMeta(userId: string): Promise<BoardMeta | null> {
  const res = await db.execute({
    sql: "SELECT id, username, display_name, leaderboard_name, share_slug FROM users WHERE id = ?",
    args: [userId],
  })
  return rowToBoard(res.rows[0] as Record<string, unknown> | undefined)
}
