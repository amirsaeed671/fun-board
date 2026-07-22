import { getAllPlayers } from "@/lib/queries"
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
  const sp = await searchParams
  let players: Awaited<ReturnType<typeof getAllPlayers>> = []
  try {
    players = await getAllPlayers()
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
        tournamentMatchId={sp.tournamentMatchId}
        defaultHomeId={sp.homeId}
        defaultAwayId={sp.awayId}
      />
    </div>
  )
}
