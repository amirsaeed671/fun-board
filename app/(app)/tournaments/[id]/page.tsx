import { notFound, redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { getTournamentById, getTournamentParticipants, getTournamentMatches } from "@/lib/queries"
import { TournamentDetail } from "@/components/tournament-detail"

export const dynamic = "force-dynamic"

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  const tournament = await getTournamentById(userId, id).catch(() => null)
  if (!tournament) notFound()

  const [participants, matches] = await Promise.all([
    getTournamentParticipants(userId, id),
    getTournamentMatches(userId, id),
  ])

  return <TournamentDetail tournament={tournament} participants={participants} matches={matches} />
}
