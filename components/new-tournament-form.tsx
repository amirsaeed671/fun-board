"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlayerAvatar } from "@/components/player-avatar"
import { cn } from "@/lib/utils"
import { Trophy, Users, Check } from "lucide-react"
import type { Player } from "@/lib/queries"

interface Props {
  players: Player[]
  onCreated?: () => void
}

export default function NewTournamentForm({ players, onCreated }: Props) {
  const router = useRouter()
  const { data: session } = useSession()

  const [name, setName] = useState("")
  const [format, setFormat] = useState<"knockout" | "round-robin">("knockout")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function togglePlayer(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user?.id) {
      setError("You must be signed in")
      return
    }
    if (selectedIds.length < 2) {
      setError("Select at least 2 players")
      return
    }
    if (!name.trim()) {
      setError("Give the tournament a name")
      return
    }

    setLoading(true)
    setError("")

    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), format, playerIds: selectedIds }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? "Failed to create tournament")
    } else {
      onCreated?.()
      router.push(`/tournaments/${data.id}`)
      router.refresh()
    }
  }

  const matchCount =
    format === "round-robin"
      ? (selectedIds.length * (selectedIds.length - 1)) / 2
      : selectedIds.length >= 2
      ? Math.floor(selectedIds.length / 2)
      : 0

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Tournament name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Friday Night Cup"
          className="bg-input"
          required
        />
      </div>

      {/* Format */}
      <div className="flex flex-col gap-1.5">
        <Label>Format</Label>
        <div className="grid grid-cols-2 gap-3">
          {(["knockout", "round-robin"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={cn(
                "flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 transition-all text-left",
                format === f
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
              )}
            >
              <Trophy className="w-4 h-4" />
              <span className="font-display font-semibold text-sm capitalize">
                {f === "knockout" ? "Knockout" : "Round Robin"}
              </span>
              <span className="text-xs leading-relaxed">
                {f === "knockout"
                  ? "Single elimination bracket. Winner advances each round."
                  : "Everyone plays everyone. Points decide the winner."}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Players */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label>Select players</Label>
          <span className="text-xs text-muted-foreground">
            {selectedIds.length} selected
          </span>
        </div>

        {players.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No players found. Create some players first.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {players.map((p) => {
              const selected = selectedIds.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlayer(p.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-border/80"
                  )}
                >
                  <PlayerAvatar seed={p.avatar_seed} name={p.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.elo} Elo</p>
                  </div>
                  {selected && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedIds.length >= 2 && (
        <Card className="bg-secondary border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{selectedIds.length} players</span>
              {" · "}
              <span className="text-foreground font-medium">{matchCount} matches</span>
              {format === "round-robin" ? " in round robin" : " in round 1"}
            </p>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!session?.user && (
        <p className="text-sm text-muted-foreground">
          You must be{" "}
          <a href="/login" className="text-primary hover:underline">
            signed in
          </a>{" "}
          to create a tournament.
        </p>
      )}

      <Button type="submit" disabled={loading || !session?.user || selectedIds.length < 2} size="lg">
        {loading ? "Creating…" : "Create Tournament"}
      </Button>
    </form>
  )
}
