"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayerAvatar } from "@/components/player-avatar"
import { cn } from "@/lib/utils"
import { BarChart3 } from "lucide-react"
import type { TournamentMatch, TournamentParticipant } from "@/lib/queries"

interface Props {
  participants: TournamentParticipant[]
  matches: TournamentMatch[]
  tournamentId: string
  tournamentStatus: string
  readOnly?: boolean
}

export function RoundRobinTable({ participants, matches, tournamentId, tournamentStatus, readOnly = false }: Props) {
  // Sort by points desc then goal difference
  const sorted = [...participants].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const gdA = a.goals_for - a.goals_against
    const gdB = b.goals_for - b.goals_against
    return gdB - gdA
  })

  const pendingMatches = matches.filter((m) => m.status === "pending")

  return (
    <div className="space-y-6">
      {/* Standings */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Standings
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-muted-foreground font-medium pb-2 w-8">#</th>
                <th className="text-left text-xs text-muted-foreground font-medium pb-2">Player</th>
                <th className="text-center text-xs text-muted-foreground font-medium pb-2 w-10">P</th>
                <th className="text-center text-xs text-muted-foreground font-medium pb-2 w-10">W</th>
                <th className="text-center text-xs text-muted-foreground font-medium pb-2 w-10">D</th>
                <th className="text-center text-xs text-muted-foreground font-medium pb-2 w-10">L</th>
                <th className="text-center text-xs text-muted-foreground font-medium pb-2 w-14">GF:GA</th>
                <th className="text-center text-xs text-muted-foreground font-medium pb-2 w-12">GD</th>
                <th className="text-center text-xs text-muted-foreground font-medium pb-2 w-10 text-primary">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((p, i) => {
                const gd = p.goals_for - p.goals_against
                const played = p.wins + p.losses + p.draws
                return (
                  <tr
                    key={p.id}
                    className={cn(
                      "transition-colors",
                      i === 0 && "bg-primary/5"
                    )}
                  >
                    <td className="py-2.5 pr-2">
                      <span
                        className={cn(
                          "text-xs font-bold font-display w-5 h-5 rounded flex items-center justify-center",
                          i === 0
                            ? "bg-accent/20 text-accent"
                            : i === 1
                            ? "bg-muted text-muted-foreground"
                            : i === 2
                            ? "bg-orange-900/30 text-orange-500"
                            : "text-muted-foreground"
                        )}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <PlayerAvatar
                          seed={p.avatar_seed ?? p.id}
                          name={p.player_name ?? "?"}
                          size="sm"
                        />
                        <span className="font-medium">{p.player_name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-center text-muted-foreground">{played}</td>
                    <td className="py-2.5 text-center text-muted-foreground">{p.wins}</td>
                    <td className="py-2.5 text-center text-muted-foreground">{p.draws}</td>
                    <td className="py-2.5 text-center text-muted-foreground">{p.losses}</td>
                    <td className="py-2.5 text-center text-muted-foreground text-xs">
                      {p.goals_for}:{p.goals_against}
                    </td>
                    <td
                      className={cn(
                        "py-2.5 text-center text-xs font-medium",
                        gd > 0 ? "text-primary" : gd < 0 ? "text-destructive" : "text-muted-foreground"
                      )}
                    >
                      {gd > 0 ? `+${gd}` : gd}
                    </td>
                    <td className="py-2.5 text-center font-bold font-display text-primary">
                      {p.points}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pending matches to record */}
      {!readOnly && tournamentStatus === "active" && pendingMatches.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Fixtures to play</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col gap-2">
            {pendingMatches.map((match) => (
              <div
                key={match.id}
                className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <PlayerAvatar
                    seed={match.home_avatar_seed ?? "home"}
                    name={match.home_player_name ?? "?"}
                    size="sm"
                  />
                  <span className="text-sm font-medium truncate">{match.home_player_name}</span>
                </div>
                <span className="text-xs text-muted-foreground font-bold shrink-0">VS</span>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span className="text-sm font-medium truncate text-right">{match.away_player_name}</span>
                  <PlayerAvatar
                    seed={match.away_avatar_seed ?? "away"}
                    name={match.away_player_name ?? "?"}
                    size="sm"
                  />
                </div>
                <Link
                  href={`/matches/new?tournamentMatchId=${match.id}&homeId=${
                    participants.find((p) => p.id === match.home_participant_id)?.player_id ?? ""
                  }&awayId=${
                    participants.find((p) => p.id === match.away_participant_id)?.player_id ?? ""
                  }`}
                  className="text-xs text-primary hover:underline shrink-0"
                >
                  Record
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
