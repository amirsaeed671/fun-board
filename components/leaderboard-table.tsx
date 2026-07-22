"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { PlayerAvatar } from "@/components/player-avatar"
import { EloTierBadge } from "@/components/elo-tier-badge"
import { getEloTier } from "@/lib/elo"
import { cn } from "@/lib/utils"
import { Crown, Flame } from "lucide-react"
import type { Player } from "@/lib/queries"

type View = "points" | "elo"

interface Props {
  players: Player[]
  /** Player ids in points-table order (points → GD → GF → head-to-head). */
  pointsOrder: string[]
  playerBasePath?: string // "" for admin, "/l/[slug]" for public
  /** When provided, the view is controlled by the parent (shared toggle). */
  view?: View
  /** Hide the built-in toggle (e.g. when a parent renders a shared one). */
  showToggle?: boolean
}

export function LeaderboardTable({
  players,
  pointsOrder,
  playerBasePath = "",
  view: controlledView,
  showToggle = true,
}: Props) {
  const [internalView, setInternalView] = useState<View>("points")
  const view = controlledView ?? internalView

  const byId = new Map(players.map((p) => [p.id, p]))
  const ordered =
    view === "elo"
      ? [...players].sort((a, b) => b.elo - a.elo)
      : pointsOrder.map((id) => byId.get(id)).filter(Boolean as unknown as (p: Player | undefined) => p is Player)

  return (
    <div className="space-y-4">
      {/* Toggle (hidden when a parent renders a shared one) */}
      {showToggle && (
        <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-1">
          {(["points", "elo"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setInternalView(v)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium font-display transition-colors capitalize",
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v === "points" ? "Points" : "Elo"}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-border bg-secondary/50 text-xs text-muted-foreground font-medium">
          <span>#</span>
          <span>Player</span>
          <span className="text-right w-20">W/D/L</span>
          <span className="text-right w-10">GD</span>
          <span className="text-right w-14">{view === "points" ? "Pts" : "Elo"}</span>
        </div>

        {ordered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No players yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {ordered.map((player, i) => {
              const { color } = getEloTier(player.elo)
              const gd = player.goals_for - player.goals_against
              const streak = player.current_streak
              const onFire = streak?.type === "W" && streak.count >= 3
              const metric = view === "points" ? player.total_points ?? player.points : player.elo

              return (
                <motion.div
                  key={player.id}
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                >
                  <Link
                    href={`${playerBasePath}/players/${player.id}`}
                    className={cn(
                      "grid grid-cols-[2rem_1fr_auto_auto_auto] gap-3 px-4 py-3 items-center hover:bg-secondary/50 transition-colors",
                      i === 0 && "bg-accent/5"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-bold font-display text-center",
                        i === 0 ? "text-accent" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-600" : "text-muted-foreground"
                      )}
                    >
                      {i + 1}
                    </span>

                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <PlayerAvatar seed={player.avatar_seed} name={player.name} size="sm" style={player.avatar_style} />
                        {i === 0 && (
                          <Crown className="absolute -top-2 -right-1 w-4 h-4 text-accent fill-accent/30 rotate-12" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-1.5">
                          {player.name}
                          {onFire && (
                            <span className="inline-flex items-center gap-0.5 text-orange-400 text-xs font-bold">
                              <Flame className="w-3 h-3 fill-orange-400/40" />
                              {streak!.count}
                            </span>
                          )}
                        </p>
                        <EloTierBadge elo={player.elo} showElo={false} />
                      </div>
                    </div>

                    <span className="text-sm tabular-nums text-muted-foreground text-right w-20">
                      {player.wins}/{player.draws}/{player.losses}
                    </span>

                    <span
                      className={cn(
                        "text-sm font-medium tabular-nums text-right w-10",
                        gd > 0 ? "text-primary" : gd < 0 ? "text-destructive" : "text-muted-foreground"
                      )}
                    >
                      {gd > 0 ? `+${gd}` : gd}
                    </span>

                    <span
                      className={cn(
                        "text-sm font-bold font-display tabular-nums text-right w-14",
                        view === "points" ? "text-primary" : color
                      )}
                    >
                      {metric}
                    </span>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
