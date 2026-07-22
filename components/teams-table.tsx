"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { TeamBadge } from "@/components/team-badge"
import { cn } from "@/lib/utils"
import { Shield } from "lucide-react"
import type { TeamGlobal } from "@/lib/stats"

type Sort = "picks" | "winRate" | "wins"

const TABS: { key: Sort; label: string }[] = [
  { key: "picks", label: "Most picked" },
  { key: "winRate", label: "Win rate" },
  { key: "wins", label: "Wins" },
]

export function TeamsTable({ teams }: { teams: TeamGlobal[] }) {
  const [sort, setSort] = useState<Sort>("picks")

  const ordered = [...teams].sort((a, b) => {
    if (sort === "winRate") return b.winRate - a.winRate || b.picks - a.picks
    if (sort === "wins") return b.w - a.w || b.picks - a.picks
    return b.picks - a.picks || b.winRate - a.winRate
  })

  const metric = (t: TeamGlobal) =>
    sort === "winRate" ? `${t.winRate}%` : sort === "wins" ? t.w : t.picks
  const metricLabel = sort === "winRate" ? "Win%" : sort === "wins" ? "Wins" : "Picks"

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSort(t.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium font-display transition-colors",
              sort === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-border bg-secondary/50 text-xs text-muted-foreground font-medium">
          <span>#</span>
          <span>Team</span>
          <span className="text-right w-20">W/D/L</span>
          <span className="text-right w-10">GD</span>
          <span className="text-right w-14">{metricLabel}</span>
        </div>

        {ordered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
            <Shield className="w-6 h-6 opacity-40" />
            No teams recorded yet — add team names when recording matches.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {ordered.map((t, i) => {
              const gd = t.gd
              return (
                <motion.div
                  key={t.team}
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  className={cn(
                    "grid grid-cols-[2rem_1fr_auto_auto_auto] gap-3 px-4 py-3 items-center",
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
                    <TeamBadge name={t.team} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.team}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.picks} {t.picks === 1 ? "pick" : "picks"}
                        {t.topUser ? ` · most by ${t.topUser.name}` : ""}
                      </p>
                    </div>
                  </div>

                  <span className="text-sm tabular-nums text-muted-foreground text-right w-20">
                    {t.w}/{t.d}/{t.l}
                  </span>

                  <span
                    className={cn(
                      "text-sm font-medium tabular-nums text-right w-10",
                      gd > 0 ? "text-primary" : gd < 0 ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {gd > 0 ? `+${gd}` : gd}
                  </span>

                  <span className="text-sm font-bold font-display tabular-nums text-right w-14 text-primary">
                    {metric(t)}
                  </span>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
