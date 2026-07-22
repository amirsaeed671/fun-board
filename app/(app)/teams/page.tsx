import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { getAllMatches } from "@/lib/queries"
import { teamGlobalStats } from "@/lib/stats"
import { TeamsTable } from "@/components/teams-table"

export const dynamic = "force-dynamic"

export default async function TeamsPage() {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  let teams: ReturnType<typeof teamGlobalStats> = []
  try {
    teams = teamGlobalStats(await getAllMatches(userId))
  } catch {
    // DB not initialised
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-balance">Teams &amp; Clubs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Which clubs get picked — and which ones actually win
        </p>
      </div>
      <TeamsTable teams={teams} />
    </div>
  )
}
