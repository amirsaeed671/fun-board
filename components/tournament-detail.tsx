import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayerAvatar } from "@/components/player-avatar"
import { KnockoutBracket } from "@/components/knockout-bracket"
import { RoundRobinTable } from "@/components/round-robin-table"
import { TournamentMatchList } from "@/components/tournament-match-list"
import { TournamentActions } from "@/components/tournament-actions"
import { Confetti } from "@/components/confetti"
import { Trophy, Users, Calendar, Medal } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Tournament, TournamentParticipant, TournamentMatch } from "@/lib/queries"

function statusColor(status: string) {
  if (status === "active") return "bg-primary/20 text-primary border-primary/30"
  if (status === "completed") return "bg-muted text-muted-foreground border-border"
  return "bg-accent/20 text-accent border-accent/30"
}

interface Props {
  tournament: Tournament
  participants: TournamentParticipant[]
  matches: TournamentMatch[]
  readOnly?: boolean
}

export function TournamentDetail({ tournament, participants, matches, readOnly = false }: Props) {
  const isCompleted = tournament.status === "completed"
  const allFixturesPlayed = matches.length > 0 && matches.every((m) => m.status === "completed")

  const byPlayer = new Map(participants.map((p) => [p.player_id, p]))
  const champion = tournament.winner_player_id ? byPlayer.get(tournament.winner_player_id) : undefined
  const runnerUp = tournament.runner_up_player_id ? byPlayer.get(tournament.runner_up_player_id) : undefined

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {isCompleted && champion && <Confetti />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="font-display font-bold text-3xl text-foreground text-balance">
              {tournament.name}
            </h1>
            <Badge variant="outline" className={`capitalize text-xs ${statusColor(tournament.status)}`}>
              {tournament.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
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
        {!readOnly && (
          <TournamentActions
            tournamentId={tournament.id}
            format={tournament.format}
            status={tournament.status}
            allFixturesPlayed={allFixturesPlayed}
          />
        )}
      </div>

      {/* Champion card */}
      {isCompleted && champion && (
        <Card className="bg-accent/10 border-accent/40 glow-accent overflow-hidden">
          <CardContent className="p-6 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <Trophy className="w-7 h-7 text-accent" />
              </div>
              <div className="flex items-center gap-3">
                <PlayerAvatar
                  seed={champion.avatar_seed ?? champion.player_id}
                  name={champion.player_name ?? "Champion"}
                  style={champion.avatar_style}
                  size="lg"
                  className="ring-2 ring-accent/40"
                />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Champion</p>
                  <p className="font-display font-bold text-2xl text-accent">{champion.player_name}</p>
                  <p className="text-xs text-primary">+5 bonus points</p>
                </div>
              </div>
            </div>
            {runnerUp && (
              <div className="flex items-center gap-3 pl-6 border-l border-accent/20">
                <Medal className="w-5 h-5 text-muted-foreground" />
                <PlayerAvatar
                  seed={runnerUp.avatar_seed ?? runnerUp.player_id}
                  name={runnerUp.player_name ?? "Runner-up"}
                  style={runnerUp.avatar_style}
                  size="md"
                />
                <div>
                  <p className="text-xs text-muted-foreground">Runner-up</p>
                  <p className="font-medium">{runnerUp.player_name}</p>
                  <p className="text-xs text-primary">+2 bonus points</p>
                </div>
              </div>
            )}
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
                <PlayerAvatar seed={p.avatar_seed ?? p.id} name={p.player_name ?? "?"} style={p.avatar_style} size="sm" />
                <span className="text-sm font-medium">{p.player_name}</span>
                {p.elo && <span className="text-xs text-muted-foreground">{p.elo}</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bracket or standings */}
      {tournament.format === "knockout" ? (
        <KnockoutBracket
          matches={matches}
          participants={participants}
          tournamentId={tournament.id}
          tournamentStatus={tournament.status}
          readOnly={readOnly}
        />
      ) : (
        <RoundRobinTable
          participants={participants}
          matches={matches}
          tournamentId={tournament.id}
          tournamentStatus={tournament.status}
          readOnly={readOnly}
        />
      )}

      {/* Results */}
      <TournamentMatchList
        matches={matches}
        tournamentId={tournament.id}
        tournamentStatus={tournament.status}
      />
    </div>
  )
}
