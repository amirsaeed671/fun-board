import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getSessionUserId } from "@/lib/session"
import { getPlayerById, getPlayerMatchHistory, getPlayerEloHistory } from "@/lib/queries"
import { PlayerStats } from "@/components/player-stats"
import { PlayerManage } from "@/components/player-manage"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  const player = await getPlayerById(userId, id).catch(() => null)
  if (!player) notFound()

  const [matches, eloHistory] = await Promise.all([
    getPlayerMatchHistory(userId, id),
    getPlayerEloHistory(userId, id),
  ])

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/players" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm w-fit">
          <ArrowLeft className="w-4 h-4" />
          All players
        </Link>
        <PlayerManage player={player} />
      </div>

      <PlayerStats player={player} matches={matches} eloHistory={eloHistory} />
    </div>
  )
}
