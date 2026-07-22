import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { PlayerAvatar } from "@/components/player-avatar"
import { formatDistanceToNow } from "date-fns"
import type { Match } from "@/lib/queries"
import { cn } from "@/lib/utils"

interface MatchCardProps {
  match: Match
  highlightPlayerId?: string
  playerBasePath?: string
}

export function MatchCard({ match, highlightPlayerId, playerBasePath = "" }: MatchCardProps) {
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
            href={`${playerBasePath}/players/${match.home_player_id}`}
            className={cn(
              "flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity",
              homeHighlight && "opacity-100",
              !homeHighlight && highlightPlayerId && "opacity-60"
            )}
          >
            <PlayerAvatar seed={match.home_avatar_seed ?? "home"} name={match.home_player_name ?? "?"} style={match.home_avatar_style} size="sm" />
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
            href={`${playerBasePath}/players/${match.away_player_id}`}
            className={cn(
              "flex items-center gap-2 flex-1 min-w-0 justify-end hover:opacity-80 transition-opacity",
              awayHighlight && "opacity-100",
              !awayHighlight && highlightPlayerId && "opacity-60"
            )}
          >
            <span className="text-sm font-medium truncate text-right">{match.away_player_name}</span>
            <PlayerAvatar seed={match.away_avatar_seed ?? "away"} name={match.away_player_name ?? "?"} style={match.away_avatar_style} size="sm" />
          </Link>
        </div>

        {(match.home_team || match.away_team) && (
          <p className="text-[11px] text-muted-foreground text-center mt-1.5">
            {match.home_team ?? "—"} <span className="opacity-50">vs</span> {match.away_team ?? "—"}
          </p>
        )}
        <p className="text-xs text-muted-foreground text-center mt-1 flex items-center justify-center gap-2">
          {match.tournament_name && (
            <span className="px-1.5 py-0.5 rounded-full bg-secondary text-[10px] font-medium">
              {match.tournament_name}
              {match.stage ? ` · ${match.stage}` : ""}
            </span>
          )}
          {formatDistanceToNow(new Date(match.played_at), { addSuffix: true })}
        </p>
      </CardContent>
    </Card>
  )
}
