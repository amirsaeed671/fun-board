import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { PlayerAvatar } from "@/components/player-avatar"
import { formatDistanceToNow } from "date-fns"
import type { Match } from "@/lib/queries"
import { cn } from "@/lib/utils"

interface MatchCardProps {
  match: Match
  highlightPlayerId?: string
}

export function MatchCard({ match, highlightPlayerId }: MatchCardProps) {
  const homeWon = match.home_score > match.away_score
  const awayWon = match.away_score > match.home_score
  const isDraw = match.home_score === match.away_score

  const homeHighlight = highlightPlayerId === match.home_player_id
  const awayHighlight = highlightPlayerId === match.away_player_id

  return (
    <Card className="bg-card border-border hover:border-border/80 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Home */}
          <Link
            href={`/players/${match.home_player_id}`}
            className={cn(
              "flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity",
              homeHighlight && "opacity-100",
              !homeHighlight && highlightPlayerId && "opacity-60"
            )}
          >
            <PlayerAvatar seed={match.home_avatar_seed ?? "home"} name={match.home_player_name ?? "?"} size="sm" />
            <span className="text-sm font-medium truncate">{match.home_player_name}</span>
          </Link>

          {/* Score */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "text-xl font-bold font-display w-8 text-right",
                homeWon ? "text-primary" : isDraw ? "text-muted-foreground" : "text-muted-foreground"
              )}
            >
              {match.home_score}
            </span>
            <span className="text-muted-foreground text-sm">:</span>
            <span
              className={cn(
                "text-xl font-bold font-display w-8 text-left",
                awayWon ? "text-primary" : isDraw ? "text-muted-foreground" : "text-muted-foreground"
              )}
            >
              {match.away_score}
            </span>
          </div>

          {/* Away */}
          <Link
            href={`/players/${match.away_player_id}`}
            className={cn(
              "flex items-center gap-2 flex-1 min-w-0 justify-end hover:opacity-80 transition-opacity",
              awayHighlight && "opacity-100",
              !awayHighlight && highlightPlayerId && "opacity-60"
            )}
          >
            <span className="text-sm font-medium truncate text-right">{match.away_player_name}</span>
            <PlayerAvatar seed={match.away_avatar_seed ?? "away"} name={match.away_player_name ?? "?"} size="sm" />
          </Link>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          {formatDistanceToNow(new Date(match.played_at), { addSuffix: true })}
        </p>
      </CardContent>
    </Card>
  )
}
