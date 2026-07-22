import { notFound } from "next/navigation"
import { getBoardBySlug } from "@/lib/board"
import { getEnrichedLeaderboard } from "@/lib/leaderboard"
import { Podium } from "@/components/podium"
import { LeaderboardTable } from "@/components/leaderboard-table"

export const dynamic = "force-dynamic"

export default async function PublicLeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const board = await getBoardBySlug(slug).catch(() => null)
  if (!board) notFound()

  const base = `/l/${slug}`
  let players: Awaited<ReturnType<typeof getEnrichedLeaderboard>>["players"] = []
  let pointsOrder: string[] = []
  try {
    ;({ players, pointsOrder } = await getEnrichedLeaderboard(board.userId))
  } catch {
    // empty
  }

  const rankedForPodium = pointsOrder
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean) as typeof players

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-balance">Leaderboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Points &amp; Elo rankings</p>
      </div>

      {rankedForPodium.length >= 1 && <Podium players={rankedForPodium} playerBasePath={base} />}

      <LeaderboardTable players={players} pointsOrder={pointsOrder} playerBasePath={base} />
    </div>
  )
}
