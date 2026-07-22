import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { getEnrichedLeaderboard } from "@/lib/leaderboard"
import { Podium } from "@/components/podium"
import { LeaderboardTable } from "@/components/leaderboard-table"

export const dynamic = "force-dynamic"

export default async function LeaderboardPage() {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  let players: Awaited<ReturnType<typeof getEnrichedLeaderboard>>["players"] = []
  let pointsOrder: string[] = []
  try {
    ;({ players, pointsOrder } = await getEnrichedLeaderboard(userId))
  } catch {
    // empty
  }

  // Podium follows the current points ranking.
  const rankedForPodium = pointsOrder
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean) as typeof players

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-balance">Leaderboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Points &amp; Elo rankings</p>
      </div>

      {rankedForPodium.length >= 1 && <Podium players={rankedForPodium} />}

      <LeaderboardTable players={players} pointsOrder={pointsOrder} />
    </div>
  )
}
