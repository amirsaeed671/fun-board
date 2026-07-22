"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MatchCard } from "@/components/match-card"
import { TeamCombobox } from "@/components/team-combobox"
import { Minus, Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { Match, Player, Tournament } from "@/lib/queries"

interface Props {
  matches: Match[]
  players: Player[]
  tournaments: Tournament[]
  teamNames?: string[]
  readOnly?: boolean
  playerBasePath?: string
}

export function MatchHistory({
  matches,
  players,
  tournaments,
  teamNames = [],
  readOnly = false,
  playerBasePath = "",
}: Props) {
  const router = useRouter()
  const [playerId, setPlayerId] = useState("all")
  const [tournamentId, setTournamentId] = useState("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [editing, setEditing] = useState<Match | null>(null)

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (playerId !== "all" && m.home_player_id !== playerId && m.away_player_id !== playerId) return false
      if (tournamentId === "casual" && m.tournament_id) return false
      if (tournamentId !== "all" && tournamentId !== "casual" && m.tournament_id !== tournamentId) return false
      const d = m.played_at.slice(0, 10)
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
  }, [matches, playerId, tournamentId, from, to])

  async function del(id: string) {
    if (!confirm("Delete this match? Elo and points will be recalculated.")) return
    const res = await fetch(`/api/matches/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Match deleted")
      router.refresh()
    } else {
      toast.error("Delete failed")
    }
  }

  const selectCls =
    "rounded-lg border border-border bg-input text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Player</Label>
          <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} className={selectCls}>
            <option value="all">All players</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Competition</Label>
          <select value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} className={selectCls}>
            <option value="all">All</option>
            <option value="casual">Casual only</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-input" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-input" />
        </div>
        {(playerId !== "all" || tournamentId !== "all" || from || to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPlayerId("all")
              setTournamentId("all")
              setFrom("")
              setTo("")
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} matches</p>

      {filtered.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No matches match these filters.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((m) => (
            <div key={m.id} className="relative group">
              <MatchCard match={m} playerBasePath={playerBasePath} />
              {!readOnly && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditing(m)}
                    className="p-1.5 rounded-md bg-secondary hover:bg-border text-muted-foreground hover:text-foreground"
                    aria-label="Edit match"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => del(m.id)}
                    className="p-1.5 rounded-md bg-secondary hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                    aria-label="Delete match"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditMatchDialog
          match={editing}
          teamNames={teamNames}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function EditMatchDialog({
  match,
  teamNames,
  onClose,
  onSaved,
}: {
  match: Match
  teamNames: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [homeScore, setHomeScore] = useState(match.home_score)
  const [awayScore, setAwayScore] = useState(match.away_score)
  const [homeTeam, setHomeTeam] = useState(match.home_team ?? "")
  const [awayTeam, setAwayTeam] = useState(match.away_team ?? "")
  const [playedAt, setPlayedAt] = useState(match.played_at.slice(0, 10))
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    const res = await fetch(`/api/matches/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeScore,
        awayScore,
        homeTeam: homeTeam.trim() || null,
        awayTeam: awayTeam.trim() || null,
        playedAt: new Date(playedAt).toISOString(),
      }),
    })
    setLoading(false)
    if (res.ok) {
      toast.success("Match updated")
      onSaved()
    } else {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error ?? "Update failed")
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Edit match</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{match.home_player_name}</p>
              <Stepper value={homeScore} onChange={setHomeScore} />
            </div>
            <span className="text-xl font-bold text-muted-foreground pt-5">:</span>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{match.away_player_name}</p>
              <Stepper value={awayScore} onChange={setAwayScore} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Home team</Label>
              <TeamCombobox id="edit-home-team" value={homeTeam} onChange={setHomeTeam} suggestions={teamNames} className="bg-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Away team</Label>
              <TeamCombobox id="edit-away-team" value={awayTeam} onChange={setAwayTeam} suggestions={teamNames} className="bg-input" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input type="date" value={playedAt} onChange={(e) => setPlayedAt(e.target.value)} className="bg-input w-fit" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button onClick={save} className="flex-1" disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-7 h-7 rounded-md bg-secondary border border-border flex items-center justify-center hover:bg-border"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-8 text-center font-bold font-display text-xl tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-md bg-secondary border border-border flex items-center justify-center hover:bg-primary/10"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  )
}
