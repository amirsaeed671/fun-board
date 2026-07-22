import { notFound } from "next/navigation"
import { getBoardBySlug } from "@/lib/board"
import { getTournamentById, getTournamentParticipants, getTournamentMatches } from "@/lib/queries"
import { TournamentDetail } from "@/components/tournament-detail"

export const dynamic = "force-dynamic"

export default async function PublicTournamentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const board = await getBoardBySlug(slug).catch(() => null)
  if (!board) notFound()

  const tournament = await getTournamentById(board.userId, id).catch(() => null)
  if (!tournament) notFound()

  const [participants, matches] = await Promise.all([
    getTournamentParticipants(board.userId, id),
    getTournamentMatches(board.userId, id),
  ])

  return (
    <TournamentDetail
      tournament={tournament}
      participants={participants}
      matches={matches}
      readOnly
    />
  )
}
