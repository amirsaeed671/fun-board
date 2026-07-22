import { notFound } from "next/navigation"
import { getTournamentById, getTournamentParticipants, getTournamentMatches } from "@/lib/queries"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayerAvatar } from "@/components/player-avatar"
import { KnockoutBracket } from "@/components/knockout-bracket"
import { RoundRobinTable } from "@/components/round-robin-table"
import { TournamentMatchList } from "@/components/tournament-match-list"
import { Trophy, Users, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

function statusColor(status: string) {
  if (status === "active") return "bg-primary/20 text-primary border-primary/30"
  if (status === "completed") return "bg-muted text-muted-foreground border-border"
  return "bg-accent/20 text-accent border-accent/30"
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let tournament: Awaited<ReturnType<typeof getTournamentById>> = null
  let participants: Awaited<ReturnType<typeof getTournamentParticipants>> = []
  let matches: Awaited<ReturnType<typeof getTournamentMatches>> = []

  try {
    ;[tournament, participants, matches] = await Promise.all([
      getTournamentById(id),
      getTournamentParticipants(id),
      getTournamentMatches(id),
    ])
  } catch {
    // DB not initialised
  }

  if (!tournament) notFound()

  const winner = participants.find(
    (p) =>
      tournament!.status === "completed" &&
      tournament!.format === "knockout" &&
      matches.some((m) => m.winner_participant_id === p.id && m.round === Math.max(...matches.map((x) => x.round)))
  ) ?? (tournament.status === "completed" ? participants[0] : null)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display font-bold text-3xl text-foreground text-balance">
              {tournament.name}
            </h1>
            <Badge
              variant="outline"
              className={`capitalize text-xs ${statusColor(tournament.status)}`}
            >
              {tournament.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              {tournament.format === "round-robin" ? "Round Robin" : "Knockout"}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {participants.length} players
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDistanceToNow(new Date(tournament.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Winner banner */}
      {winner && tournament.status === "completed" && (
        <Card className="bg-accent/10 border-accent/40 glow-accent">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-accent" />
            </div>
            <div className="flex items-center gap-3">
              <PlayerAvatar
                seed={winner.avatar_seed ?? "winner"}
                name={winner.player_name ?? "Winner"}
                size="md"
              />
              <div>
                <p className="text-xs text-muted-foreground">Tournament Winner</p>
                <p className="font-display font-bold text-xl text-accent">
                  {winner.player_name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participants */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Participants</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-3">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                <PlayerAvatar seed={p.avatar_seed ?? p.id} name={p.player_name ?? "?"} size="sm" />
                <span className="text-sm font-medium">{p.player_name}</span>
                {p.elo && (
                  <span className="text-xs text-muted-foreground">{p.elo}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bracket or Standings */}
      {tournament.format === "knockout" ? (
        <KnockoutBracket
          matches={matches}
          participants={participants}
          tournamentId={tournament.id}
          tournamentStatus={tournament.status}
        />
      ) : (
        <RoundRobinTable
          participants={participants}
          matches={matches}
          tournamentId={tournament.id}
          tournamentStatus={tournament.status}
        />
      )}

      {/* All matches */}
      <TournamentMatchList
        matches={matches}
        tournamentId={tournament.id}
        tournamentStatus={tournament.status}
      />
    </div>
  )
}
