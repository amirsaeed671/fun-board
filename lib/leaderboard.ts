import { getLeaderboard, getAllMatches, type Player } from "./queries"
import { toPlayerRows, currentStreak, buildH2HWins, sortPointsTable } from "./stats"

/**
 * Leaderboard players enriched with total_points (already from the query),
 * a current streak, and the points-table ordering (points → GD → GF → H2H).
 */
export async function getEnrichedLeaderboard(
  userId: string
): Promise<{ players: Player[]; pointsOrder: string[] }> {
  const [players, matches] = await Promise.all([
    getLeaderboard(userId),
    getAllMatches(userId),
  ])
  for (const p of players) {
    p.current_streak = currentStreak(toPlayerRows(matches, p.id))
  }
  const h2h = buildH2HWins(matches)
  const pointsOrder = sortPointsTable(players, h2h).map((p) => p.id)
  return { players, pointsOrder }
}
