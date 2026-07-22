"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PlayerAvatar } from "@/components/player-avatar"
import { TeamCombobox } from "@/components/team-combobox"
import { calculateEloChanges, getEloTier } from "@/lib/elo"
import { cn } from "@/lib/utils"
import { Minus, Plus, ChevronRight, ArrowLeftRight } from "lucide-react"
import type { Player } from "@/lib/queries"

interface Props {
  players: Player[]
  teamNames?: string[]
  tournamentMatchId?: string
  tournamentId?: string
  isKnockout?: boolean
  defaultHomeId?: string
  defaultAwayId?: string
  onSuccess?: () => void
}

export default function MatchRecorderForm({
  players,
  teamNames = [],
  tournamentMatchId,
  tournamentId,
  isKnockout = false,
  defaultHomeId,
  defaultAwayId,
  onSuccess,
}: Props) {
  const router = useRouter()
  const { data: session } = useSession()

  const [homeId, setHomeId] = useState(defaultHomeId ?? "")
  const [awayId, setAwayId] = useState(defaultAwayId ?? "")
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [homeTeam, setHomeTeam] = useState("")
  const [awayTeam, setAwayTeam] = useState("")
  const [playedAt, setPlayedAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [shootoutWinnerId, setShootoutWinnerId] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const homePl = players.find((p) => p.id === homeId)
  const awayPl = players.find((p) => p.id === awayId)
  const isDraw = homeScore === awayScore
  const needsShootout = isKnockout && isDraw && !!homeId && !!awayId

  // Elo preview
  const eloPreview =
    homePl && awayPl
      ? calculateEloChanges(
          homePl.elo,
          awayPl.elo,
          homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw"
        )
      : null

  function swapPlayers() {
    setHomeId(awayId)
    setAwayId(homeId)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user?.id) {
      setError("You must be signed in to record a match")
      return
    }
    if (!homeId || !awayId) {
      setError("Select both players")
      return
    }
    if (homeId === awayId) {
      setError("Players must be different")
      return
    }
    if (needsShootout && !shootoutWinnerId) {
      setError("A knockout match can't be a draw — pick a shootout winner.")
      return
    }

    setLoading(true)
    setError("")

    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homePlayerId: homeId,
        awayPlayerId: awayId,
        homeScore,
        awayScore,
        homeTeam: homeTeam.trim() || undefined,
        awayTeam: awayTeam.trim() || undefined,
        playedAt: playedAt ? new Date(playedAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
        tournamentMatchId: tournamentMatchId ?? undefined,
        shootoutWinnerId: needsShootout ? shootoutWinnerId : undefined,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? "Failed to record match")
    } else {
      setSuccess(true)
      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/")
        router.refresh()
      }
    }
  }

  if (success) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center flex flex-col gap-4 items-center">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
            <ChevronRight className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="font-display font-semibold text-lg">Match recorded!</p>
            <p className="text-muted-foreground text-sm mt-1">Elo ratings updated.</p>
          </div>
          <Button onClick={() => router.push("/")} variant="outline">
            Back to dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Player selector */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            {/* Home */}
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Home</Label>
              <select
                value={homeId}
                onChange={(e) => setHomeId(e.target.value)}
                className="w-full rounded-lg border border-border bg-input text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
                required
              >
                <option value="">Select player…</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === awayId}>
                    {p.name} ({p.elo})
                  </option>
                ))}
              </select>
              {homePl && (
                <div className="flex items-center gap-2 mt-2">
                  <PlayerAvatar seed={homePl.avatar_seed} name={homePl.name} size="sm" />
                  <span className="text-xs text-muted-foreground">{homePl.elo} Elo</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 pt-4">
              <span className="text-muted-foreground font-bold font-display text-sm">VS</span>
              <button
                type="button"
                onClick={swapPlayers}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Swap players"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </div>

            {/* Away */}
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Away</Label>
              <select
                value={awayId}
                onChange={(e) => setAwayId(e.target.value)}
                className="w-full rounded-lg border border-border bg-input text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
                required
              >
                <option value="">Select player…</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === homeId}>
                    {p.name} ({p.elo})
                  </option>
                ))}
              </select>
              {awayPl && (
                <div className="flex items-center gap-2 mt-2 justify-end">
                  <span className="text-xs text-muted-foreground">{awayPl.elo} Elo</span>
                  <PlayerAvatar seed={awayPl.avatar_seed} name={awayPl.name} size="sm" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score input */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground text-center mb-4">Score</p>
          <div className="flex items-center justify-center gap-6">
            {/* Home score */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">{homePl?.name ?? "Home"}</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setHomeScore(Math.max(0, homeScore - 1))}
                  className="w-8 h-8 rounded-full bg-secondary hover:bg-border flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className={cn(
                  "text-4xl font-bold font-display w-12 text-center tabular-nums",
                  homeScore > awayScore ? "text-primary" : "text-foreground"
                )}>
                  {homeScore}
                </span>
                <button
                  type="button"
                  onClick={() => setHomeScore(homeScore + 1)}
                  className="w-8 h-8 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <span className="text-2xl text-muted-foreground font-bold">:</span>

            {/* Away score */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">{awayPl?.name ?? "Away"}</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAwayScore(Math.max(0, awayScore - 1))}
                  className="w-8 h-8 rounded-full bg-secondary hover:bg-border flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className={cn(
                  "text-4xl font-bold font-display w-12 text-center tabular-nums",
                  awayScore > homeScore ? "text-primary" : "text-foreground"
                )}>
                  {awayScore}
                </span>
                <button
                  type="button"
                  onClick={() => setAwayScore(awayScore + 1)}
                  className="w-8 h-8 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Elo preview */}
          {eloPreview && homePl && awayPl && (
            <div className="mt-5 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center mb-3">Elo changes preview</p>
              <div className="flex justify-around">
                <EloPreview
                  name={homePl.name}
                  before={homePl.elo}
                  after={eloPreview.homeAfter}
                />
                <EloPreview
                  name={awayPl.name}
                  before={awayPl.elo}
                  after={eloPreview.awayAfter}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shootout winner (knockout draws) */}
      {needsShootout && (
        <Card className="bg-accent/10 border-accent/40">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">
              Level on the night — who won the penalty shootout?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[homePl, awayPl].map((pl) =>
                pl ? (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => setShootoutWinnerId(pl.id)}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-left",
                      shootoutWinnerId === pl.id
                        ? "border-accent bg-accent/10"
                        : "border-border bg-card hover:border-border/80"
                    )}
                  >
                    <PlayerAvatar seed={pl.avatar_seed} name={pl.name} size="sm" />
                    <span className="text-sm font-medium truncate">{pl.name}</span>
                  </button>
                ) : null
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teams & date */}
      <Card className="bg-card border-border">
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{homePl?.name ?? "Home"} team</Label>
              <TeamCombobox
                id="home-team"
                value={homeTeam}
                onChange={setHomeTeam}
                suggestions={teamNames}
                className="bg-input"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{awayPl?.name ?? "Away"} team</Label>
              <TeamCombobox
                id="away-team"
                value={awayTeam}
                onChange={setAwayTeam}
                suggestions={teamNames}
                className="bg-input"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="played-at" className="text-xs text-muted-foreground">Date</Label>
            <Input
              id="played-at"
              type="date"
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
              className="bg-input w-fit"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes" className="text-sm">Notes <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any match notes…"
          className="bg-input resize-none"
          rows={2}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!session?.user && (
        <p className="text-sm text-muted-foreground text-center">
          You must be{" "}
          <a href="/login" className="text-primary hover:underline">
            signed in
          </a>{" "}
          to record matches.
        </p>
      )}

      <Button type="submit" disabled={loading || !session?.user} size="lg" className="w-full">
        {loading ? "Recording…" : "Record Match"}
      </Button>
    </form>
  )
}

function EloPreview({
  name,
  before,
  after,
}: {
  name: string
  before: number
  after: number
}) {
  const diff = after - before
  const { color } = getEloTier(after)
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground truncate max-w-[80px]">{name}</p>
      <p className={cn("text-base font-bold font-display", color)}>{after}</p>
      <p className={cn("text-xs font-medium", diff >= 0 ? "text-primary" : "text-destructive")}>
        {diff >= 0 ? `+${diff}` : diff}
      </p>
    </div>
  )
}
