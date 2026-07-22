"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayerAvatar } from "@/components/player-avatar"
import { cn } from "@/lib/utils"
import { Trophy } from "lucide-react"
import type { TournamentMatch, TournamentParticipant } from "@/lib/queries"

interface Props {
  matches: TournamentMatch[]
  participants: TournamentParticipant[]
  tournamentId: string
  tournamentStatus: string
  readOnly?: boolean
}

export function KnockoutBracket({ matches, participants, tournamentId, tournamentStatus, readOnly = false }: Props) {
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b)

  function getParticipant(id: string | null) {
    if (!id) return null
    return participants.find((p) => p.id === id) ?? null
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" />
          Bracket
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 overflow-x-auto">
        <div className="flex gap-8 min-w-max pb-2">
          {rounds.map((round) => {
            const roundMatches = matches.filter((m) => m.round === round)
            const roundLabel =
              round === Math.max(...rounds)
                ? rounds.length > 1 && round === Math.max(...rounds)
                  ? "Final"
                  : "Round 1"
                : round === Math.max(...rounds) - 1 && rounds.length > 2
                ? "Semi-Final"
                : `Round ${round}`

            return (
              <div key={round} className="flex flex-col gap-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                  {roundLabel}
                </p>
                <div className="flex flex-col gap-4">
                  {roundMatches.map((match) => {
                    const home = getParticipant(match.home_participant_id)
                    const away = getParticipant(match.away_participant_id)
                    const winner = getParticipant(match.winner_participant_id)
                    const isCompleted = match.status === "completed"
                    const canRecord =
                      !readOnly &&
                      tournamentStatus === "active" &&
                      match.status === "pending" &&
                      home &&
                      away

                    return (
                      <div key={match.id} className="w-56">
                        <div className="rounded-xl border border-border bg-secondary overflow-hidden">
                          {/* Home */}
                          <BracketSlot
                            participant={home}
                            score={match.home_score}
                            isWinner={!!winner && winner.id === match.home_participant_id}
                            isCompleted={isCompleted}
                          />
                          <div className="h-px bg-border" />
                          {/* Away */}
                          <BracketSlot
                            participant={away}
                            score={match.away_score}
                            isWinner={!!winner && winner.id === match.away_participant_id}
                            isCompleted={isCompleted}
                          />
                        </div>
                        {canRecord && (
                          <Link
                            href={`/matches/new?tournamentMatchId=${match.id}&homeId=${home?.player_id}&awayId=${away?.player_id}&tournamentId=${tournamentId}`}
                            className="block mt-1.5 text-center text-xs text-primary hover:underline"
                          >
                            Record result
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function BracketSlot({
  participant,
  score,
  isWinner,
  isCompleted,
}: {
  participant: TournamentParticipant | null
  score?: number | null
  isWinner: boolean
  isCompleted: boolean
}) {
  if (!participant) {
    return (
      <div className="px-3 py-2.5 flex items-center gap-2 h-11">
        <div className="w-6 h-6 rounded-full bg-border" />
        <span className="text-xs text-muted-foreground italic">TBD</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "px-3 py-2.5 flex items-center gap-2 h-11 transition-colors",
        isWinner && "bg-primary/10",
        !isWinner && isCompleted && "opacity-50"
      )}
    >
      <PlayerAvatar
        seed={participant.avatar_seed ?? participant.id}
        name={participant.player_name ?? "?"}
        size="sm"
      />
      <span
        className={cn(
          "text-sm font-medium flex-1 truncate",
          isWinner && "text-primary font-semibold"
        )}
      >
        {participant.player_name}
      </span>
      {score !== undefined && score !== null && (
        <span
          className={cn(
            "text-sm font-bold font-display w-5 text-right",
            isWinner ? "text-primary" : "text-muted-foreground"
          )}
        >
          {score}
        </span>
      )}
    </div>
  )
}
