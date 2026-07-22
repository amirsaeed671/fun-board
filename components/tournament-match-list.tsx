import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlayerAvatar } from "@/components/player-avatar"
import { cn } from "@/lib/utils"
import { Swords } from "lucide-react"
import type { TournamentMatch } from "@/lib/queries"

interface Props {
  matches: TournamentMatch[]
  tournamentId: string
  tournamentStatus: string
}

export function TournamentMatchList({ matches }: Props) {
  const completed = matches.filter((m) => m.status === "completed")

  if (completed.length === 0) return null

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Swords className="w-4 h-4 text-muted-foreground" />
          Results
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col divide-y divide-border">
        {completed.map((match) => {
          const homeWon =
            match.home_score !== undefined &&
            match.away_score !== undefined &&
            match.home_score > match.away_score
          const awayWon =
            match.home_score !== undefined &&
            match.away_score !== undefined &&
            match.away_score > match.home_score

          return (
            <div key={match.id} className="py-3 flex items-center gap-3">
              <Badge variant="outline" className="text-xs text-muted-foreground shrink-0 w-14 justify-center">
                Rd {match.round}
              </Badge>

              {/* Home */}
              <div
                className={cn(
                  "flex items-center gap-2 flex-1 min-w-0",
                  !homeWon && "opacity-50"
                )}
              >
                <PlayerAvatar
                  seed={match.home_avatar_seed ?? "home"}
                  name={match.home_player_name ?? "?"}
                  size="sm"
                />
                <span className="text-sm font-medium truncate">{match.home_player_name}</span>
              </div>

              {/* Score */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={cn(
                    "text-lg font-bold font-display w-6 text-right",
                    homeWon ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {match.home_score ?? "–"}
                </span>
                <span className="text-muted-foreground text-xs">:</span>
                <span
                  className={cn(
                    "text-lg font-bold font-display w-6 text-left",
                    awayWon ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {match.away_score ?? "–"}
                </span>
              </div>

              {/* Away */}
              <div
                className={cn(
                  "flex items-center gap-2 flex-1 min-w-0 justify-end",
                  !awayWon && "opacity-50"
                )}
              >
                <span className="text-sm font-medium truncate text-right">{match.away_player_name}</span>
                <PlayerAvatar
                  seed={match.away_avatar_seed ?? "away"}
                  name={match.away_player_name ?? "?"}
                  size="sm"
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
