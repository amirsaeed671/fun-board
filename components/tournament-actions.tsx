"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trophy, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
  tournamentId: string
  format: string
  status: string
  allFixturesPlayed: boolean
}

export function TournamentActions({ tournamentId, format, status, allFixturesPlayed }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const canCompleteLeague = format === "round-robin" && status === "active"

  async function complete() {
    if (!allFixturesPlayed && !confirm("Not all fixtures are played. Complete anyway using current standings?")) {
      return
    }
    setLoading(true)
    const res = await fetch(`/api/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    })
    setLoading(false)
    if (res.ok) {
      toast.success("Tournament completed! 🏆")
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error ?? "Could not complete")
    }
  }

  async function remove() {
    if (!confirm("Delete this tournament? Bonus points are removed; match results stay in your history.")) return
    setLoading(true)
    const res = await fetch(`/api/tournaments/${tournamentId}`, { method: "DELETE" })
    setLoading(false)
    if (res.ok) {
      toast.success("Tournament deleted")
      router.push("/tournaments")
      router.refresh()
    } else {
      toast.error("Delete failed")
    }
  }

  return (
    <div className="flex items-center gap-2">
      {canCompleteLeague && (
        <Button onClick={complete} disabled={loading} size="sm" className="gap-2">
          <Trophy className="w-4 h-4" />
          Complete
        </Button>
      )}
      <Button onClick={remove} disabled={loading} variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-destructive">
        <Trash2 className="w-4 h-4" />
        Delete
      </Button>
    </div>
  )
}
