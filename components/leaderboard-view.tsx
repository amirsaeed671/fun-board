"use client"

import { useState } from "react"
import { Podium } from "@/components/podium"
import { LeaderboardTable } from "@/components/leaderboard-table"
import { cn } from "@/lib/utils"
import type { Player } from "@/lib/queries"

type View = "points" | "elo"

interface Props {
  players: Player[]
  /** Player ids in points-table order (points → GD → GF → head-to-head). */
  pointsOrder: string[]
  playerBasePath?: string
  showTable?: boolean
  showPodium?: boolean
}

/**
 * Owns the Points/Elo toggle and keeps the podium + table in sync: switching
 * to Elo re-ranks the podium (and its reveal animation) to the Elo top-3.
 */
export function LeaderboardView({
  players,
  pointsOrder,
  playerBasePath = "",
  showTable = true,
  showPodium = true,
}: Props) {
  const [view, setView] = useState<View>("points")

  const byId = new Map(players.map((p) => [p.id, p]))
  const ordered =
    view === "elo"
      ? [...players].sort((a, b) => b.elo - a.elo)
      : (pointsOrder.map((id) => byId.get(id)).filter(Boolean) as Player[])

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-1">
        {(["points", "elo"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium font-display transition-colors",
              view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {v === "points" ? "Points" : "Elo"}
          </button>
        ))}
      </div>

      {showPodium && ordered.length > 0 && (
        <Podium players={ordered} playerBasePath={playerBasePath} />
      )}

      {showTable && (
        <LeaderboardTable
          players={players}
          pointsOrder={pointsOrder}
          playerBasePath={playerBasePath}
          view={view}
          showToggle={false}
        />
      )}
    </div>
  )
}
