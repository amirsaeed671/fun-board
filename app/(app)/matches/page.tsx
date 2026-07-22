import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { getAllMatches, getAllPlayers, getAllTournaments, getTeamNames } from "@/lib/queries"
import { MatchHistory } from "@/components/match-history"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function MatchesPage() {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  let matches: Awaited<ReturnType<typeof getAllMatches>> = []
  let players: Awaited<ReturnType<typeof getAllPlayers>> = []
  let tournaments: Awaited<ReturnType<typeof getAllTournaments>> = []
  let teamNames: string[] = []
  try {
    ;[matches, players, tournaments, teamNames] = await Promise.all([
      getAllMatches(userId),
      getAllPlayers(userId),
      getAllTournaments(userId),
      getTeamNames(userId),
    ])
  } catch {
    // DB not initialised
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl text-balance">Matches</h1>
          <p className="text-muted-foreground text-sm mt-1">Full match history</p>
        </div>
        <Link href="/matches/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Record Match
          </Button>
        </Link>
      </div>

      <MatchHistory
        matches={matches}
        players={players}
        tournaments={tournaments}
        teamNames={teamNames}
      />
    </div>
  )
}
