import { notFound } from "next/navigation"
import { getBoardBySlug } from "@/lib/board"
import { getAllMatches, getAllPlayers, getAllTournaments } from "@/lib/queries"
import { MatchHistory } from "@/components/match-history"

export const dynamic = "force-dynamic"

export default async function PublicMatchesPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const board = await getBoardBySlug(slug).catch(() => null)
  if (!board) notFound()

  const base = `/l/${slug}`
  let matches: Awaited<ReturnType<typeof getAllMatches>> = []
  let players: Awaited<ReturnType<typeof getAllPlayers>> = []
  let tournaments: Awaited<ReturnType<typeof getAllTournaments>> = []
  try {
    ;[matches, players, tournaments] = await Promise.all([
      getAllMatches(board.userId),
      getAllPlayers(board.userId),
      getAllTournaments(board.userId),
    ])
  } catch {
    // empty
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-balance">Matches</h1>
        <p className="text-muted-foreground text-sm mt-1">Full match history</p>
      </div>
      <MatchHistory
        matches={matches}
        players={players}
        tournaments={tournaments}
        readOnly
        playerBasePath={base}
      />
    </div>
  )
}
