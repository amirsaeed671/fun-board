import { notFound } from "next/navigation"
import Link from "next/link"
import { getBoardBySlug } from "@/lib/board"
import { getPlayerById, getPlayerMatchHistory, getPlayerEloHistory } from "@/lib/queries"
import { PlayerStats } from "@/components/player-stats"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PublicPlayerPage({
  params,
}: {
  params: Promise<{ slug: string; playerId: string }>
}) {
  const { slug, playerId } = await params
  const board = await getBoardBySlug(slug).catch(() => null)
  if (!board) notFound()

  const base = `/l/${slug}`
  const player = await getPlayerById(board.userId, playerId).catch(() => null)
  if (!player) notFound()

  const [matches, eloHistory] = await Promise.all([
    getPlayerMatchHistory(board.userId, playerId),
    getPlayerEloHistory(board.userId, playerId),
  ])

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link href={base} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm w-fit">
        <ArrowLeft className="w-4 h-4" />
        Leaderboard
      </Link>
      <PlayerStats player={player} matches={matches} eloHistory={eloHistory} playerBasePath={base} />
    </div>
  )
}
