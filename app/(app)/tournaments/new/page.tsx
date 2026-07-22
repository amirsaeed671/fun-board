import { getAllPlayers } from "@/lib/queries"
import NewTournamentForm from "@/components/new-tournament-form"

export default async function NewTournamentPage() {
  let players: Awaited<ReturnType<typeof getAllPlayers>> = []
  try {
    players = await getAllPlayers()
  } catch {
    // DB not yet initialised
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-3xl text-foreground">New Tournament</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Set up a knockout or round-robin competition
        </p>
      </div>
      <NewTournamentForm players={players} />
    </div>
  )
}
