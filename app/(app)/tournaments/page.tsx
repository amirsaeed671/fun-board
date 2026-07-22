import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getAllTournaments, getAllPlayers } from "@/lib/queries"
import { Swords, Trophy, Users } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Tournament, Player } from "@/lib/queries"
import CreateTournamentDialog from "@/components/create-tournament-dialog"

function statusColor(status: string) {
  if (status === "active") return "bg-primary/20 text-primary border-primary/30"
  if (status === "completed") return "bg-muted text-muted-foreground border-border"
  return "bg-accent/20 text-accent border-accent/30"
}

function formatBadge(format: string) {
  if (format === "round-robin") return "Round Robin"
  return "Knockout"
}

export const dynamic = "force-dynamic"

export default async function TournamentsPage() {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  let tournaments: Tournament[] = []
  let players: Player[] = []
  try {
    ;[tournaments, players] = await Promise.all([
      getAllTournaments(userId),
      getAllPlayers(userId),
    ])
  } catch {
    // DB not yet initialised
  }

  const active = tournaments.filter((t) => t.status === "active")
  const past = tournaments.filter((t) => t.status === "completed")
  const pending = tournaments.filter((t) => t.status === "pending")

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl text-foreground text-balance">
            Tournaments
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Knockout and round-robin competitions
          </p>
        </div>
        <CreateTournamentDialog players={players} />
      </div>

      {tournaments.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
              <Swords className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-display font-semibold text-lg">No tournaments yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Create your first tournament to get started.
              </p>
            </div>
            <CreateTournamentDialog players={players} />
          </CardContent>
        </Card>
      )}

      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Active
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {active.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Pending
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {pending.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Completed
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {past.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function TournamentCard({ tournament: t }: { tournament: Tournament }) {
  return (
    <Link href={`/tournaments/${t.id}`}>
      <Card className="bg-card border-border hover:border-primary/40 transition-all hover:glow-primary group cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="font-display text-base leading-tight group-hover:text-primary transition-colors">
              {t.name}
            </CardTitle>
            <Badge
              variant="outline"
              className={`shrink-0 text-xs capitalize ${statusColor(t.status)}`}
            >
              {t.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Trophy className="w-3.5 h-3.5" />
            <span>{formatBadge(t.format)}</span>
          </div>
          {t.participant_count !== undefined && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>{t.participant_count} players</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
