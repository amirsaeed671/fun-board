import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { getAllPlayers, getTeamNames, getFixtureContext } from "@/lib/queries"
import MatchRecorderForm from "@/components/match-recorder-form"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    tournamentMatchId?: string
    homeId?: string
    awayId?: string
  }>
}

export default async function NewMatchPage({ searchParams }: PageProps) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  const sp = await searchParams
  let players: Awaited<ReturnType<typeof getAllPlayers>> = []
  let teamNames: string[] = []
  let fixture: Awaited<ReturnType<typeof getFixtureContext>> = null
  try {
    ;[players, teamNames] = await Promise.all([
      getAllPlayers(userId),
      getTeamNames(userId),
    ])
    if (sp.tournamentMatchId) {
      fixture = await getFixtureContext(userId, sp.tournamentMatchId)
    }
  } catch {
    // DB not initialised
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-balance">Record Match</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Log the result and update Elo ratings automatically
        </p>
      </div>
      <MatchRecorderForm
        players={players}
        teamNames={teamNames}
        tournamentMatchId={sp.tournamentMatchId}
        tournamentId={fixture?.tournamentId}
        isKnockout={fixture?.isKnockout ?? false}
        defaultHomeId={sp.homeId}
        defaultAwayId={sp.awayId}
      />
    </div>
  )
}
