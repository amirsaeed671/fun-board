import { getEloTier } from "@/lib/elo"
import { cn } from "@/lib/utils"

export function EloTierBadge({ elo, showElo = true }: { elo: number; showElo?: boolean }) {
  const { tier, color } = getEloTier(elo)
  return (
    <span className={cn("text-xs font-semibold font-display", color)}>
      {tier}{showElo ? ` · ${elo}` : ""}
    </span>
  )
}
