import { notFound } from "next/navigation"
import { getBoardBySlug } from "@/lib/board"
import { getEnrichedLeaderboard } from "@/lib/leaderboard"
import { LeaderboardView } from "@/components/leaderboard-view"

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

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-balance">Leaderboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Points &amp; Elo rankings</p>
      </div>

      <LeaderboardView players={players} pointsOrder={pointsOrder} playerBasePath={base} />
    </div>
  )
}
