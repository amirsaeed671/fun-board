"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlayerAvatar } from "@/components/player-avatar"
import { cn } from "@/lib/utils"
import { Minus, Plus, Check, Trophy } from "lucide-react"
import type { TournamentMatch, Player } from "@/lib/queries"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

interface Props {
  match: TournamentMatch
  tournamentId: string
  allPlayers: Player[]
  compact?: boolean
}

export default function TournamentMatchCard({ match, tournamentId, allPlayers, compact = false }: Props) {
  const router = useRouter()
  const { data: session } = useSession()
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)

  const isBye =
    !match.home_participant_id || !match.away_participant_id
  const isPlayed = match.status === "completed" || match.match_id !== null
  const isPending = !isPlayed && !isBye

  const homePlayer = allPlayers.find((p) =>
    match.home_player_name ? p.name === match.home_player_name : false
  )
  const awayPlayer = allPlayers.find((p) =>
    match.away_player_name ? p.name === match.away_player_name : false
  )

  async function handleRecord() {
    if (!session?.user?.id) {
      toast.error("Sign in to record matches")
      return
    }
    if (!homePlayer || !awayPlayer) {
      toast.error("Cannot find players")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homePlayerId: homePlayer.id,
          awayPlayerId: awayPlayer.id,
          homeScore,
          awayScore,
          tournamentMatchId: match.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to record")
      } else {
        toast.success("Match recorded!")
        setRecording(false)
        router.refresh()
      }
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
    }
  }

  // TBD slot (winner advances here but not yet set)
  if (!match.home_player_name && !match.away_player_name) {
    return (
      <Card className="bg-secondary border-border opacity-50">
        <CardContent className={cn("flex items-center justify-center text-muted-foreground text-sm", compact ? "p-3" : "p-4")}>
          TBD
        </CardContent>
      </Card>
    )
  }

  // Bye match
  if (isBye) {
    const name = match.home_player_name ?? match.away_player_name
    const seed = match.home_avatar_seed ?? match.away_avatar_seed ?? "bye"
    return (
      <Card className="bg-secondary border-border">
        <CardContent className={cn("flex items-center gap-3", compact ? "p-3" : "p-4")}>
          <PlayerAvatar seed={seed} name={name ?? "?"} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{name}</p>
          </div>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">BYE</span>
        </CardContent>
      </Card>
    )
  }

  // Played match
  if (isPlayed) {
    const homeWon =
      match.winner_participant_id === match.home_participant_id ||
      (match.home_score !== undefined && match.away_score !== undefined && match.home_score > match.away_score)
    const awayWon =
      match.winner_participant_id === match.away_participant_id ||
      (match.home_score !== undefined && match.away_score !== undefined && match.away_score > match.home_score)

    return (
      <Card className="bg-card border-border">
        <CardContent className={cn("flex items-center gap-3", compact ? "p-3" : "p-4")}>
          {/* Home */}
          <div className={cn("flex items-center gap-2 flex-1 min-w-0", !homeWon && "opacity-50")}>
            <PlayerAvatar
              seed={match.home_avatar_seed ?? "home"}
              name={match.home_player_name ?? "?"}
              size="sm"
            />
            <span className="text-sm font-medium truncate">{match.home_player_name}</span>
            {homeWon && <Trophy className="w-3.5 h-3.5 text-accent shrink-0" />}
          </div>

          {/* Score */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn("text-lg font-bold font-display w-6 text-right tabular-nums", homeWon ? "text-primary" : "text-muted-foreground")}>
              {match.home_score ?? 0}
            </span>
            <span className="text-muted-foreground text-xs">-</span>
            <span className={cn("text-lg font-bold font-display w-6 text-left tabular-nums", awayWon ? "text-primary" : "text-muted-foreground")}>
              {match.away_score ?? 0}
            </span>
          </div>

          {/* Away */}
          <div className={cn("flex items-center gap-2 flex-1 min-w-0 justify-end", !awayWon && "opacity-50")}>
            {awayWon && <Trophy className="w-3.5 h-3.5 text-accent shrink-0" />}
            <span className="text-sm font-medium truncate text-right">{match.away_player_name}</span>
            <PlayerAvatar
              seed={match.away_avatar_seed ?? "away"}
              name={match.away_player_name ?? "?"}
              size="sm"
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Pending match — can record result
  return (
    <Card className={cn("bg-card border-border", recording && "border-primary/40")}>
      <CardContent className={cn("flex flex-col gap-3", compact ? "p-3" : "p-4")}>
        {/* Players row */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <PlayerAvatar
              seed={match.home_avatar_seed ?? "home"}
              name={match.home_player_name ?? "?"}
              size="sm"
            />
            <span className="text-sm font-medium truncate">{match.home_player_name}</span>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">vs</span>
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span className="text-sm font-medium truncate text-right">{match.away_player_name}</span>
            <PlayerAvatar
              seed={match.away_avatar_seed ?? "away"}
              name={match.away_player_name ?? "?"}
              size="sm"
            />
          </div>
        </div>

        {recording ? (
          <div className="flex flex-col gap-3">
            {/* Score inputs */}
            <div className="flex items-center gap-2 justify-center">
              <ScoreInput value={homeScore} onChange={setHomeScore} />
              <span className="text-muted-foreground font-bold px-2">—</span>
              <ScoreInput value={awayScore} onChange={setAwayScore} />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRecording(false)}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRecord}
                className="flex-1 gap-1"
                disabled={loading}
              >
                <Check className="w-3.5 h-3.5" />
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          session?.user?.id && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRecording(true)}
              className="w-full text-xs"
            >
              Record Result
            </Button>
          )
        )}
      </CardContent>
    </Card>
  )
}

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-7 h-7 rounded-md bg-secondary border border-border flex items-center justify-center hover:bg-primary/10 transition-colors"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-8 text-center font-bold font-display text-lg tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-md bg-secondary border border-border flex items-center justify-center hover:bg-primary/10 transition-colors"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  )
}
