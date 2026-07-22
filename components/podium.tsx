"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { PlayerAvatar } from "@/components/player-avatar"
import { EloTierBadge } from "@/components/elo-tier-badge"
import { Crown } from "lucide-react"
import type { Player } from "@/lib/queries"

interface Props {
  players: Player[] // already ranked, best first
  playerBasePath?: string
}

const HEIGHTS: Record<number, string> = { 1: "h-28", 2: "h-20", 3: "h-16" }
const RANK_COLOR: Record<number, string> = {
  1: "text-accent",
  2: "text-muted-foreground",
  3: "text-orange-600",
}

export function Podium({ players, playerBasePath = "" }: Props) {
  const top3 = players.slice(0, 3)
  if (top3.length === 0) return null

  // Visual order: 2nd, 1st, 3rd.
  const visual = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3

  return (
    <div className="flex items-end justify-center gap-4 pt-4">
      {visual.map((player, idx) => {
        if (!player) return null
        const rank = top3.indexOf(player) + 1
        return (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.12, type: "spring", stiffness: 300, damping: 24 }}
          >
            <Link
              href={`${playerBasePath}/players/${player.id}`}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="relative">
                {rank === 1 && (
                  <Crown className="absolute -top-5 left-1/2 -translate-x-1/2 w-6 h-6 text-accent fill-accent/30" />
                )}
                <PlayerAvatar
                  seed={player.avatar_seed}
                  name={player.name}
                  style={player.avatar_style}
                  size={rank === 1 ? "xl" : "lg"}
                  className="ring-2 ring-border group-hover:ring-primary transition-all"
                />
                <span
                  className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-display bg-card border border-border ${RANK_COLOR[rank]}`}
                >
                  {rank}
                </span>
              </div>
              <p className="text-sm font-medium text-center max-w-[90px] truncate">{player.name}</p>
              <EloTierBadge elo={player.elo} />
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                transition={{ delay: idx * 0.12 + 0.1 }}
                className={`w-16 rounded-t-md bg-primary/20 border-t-2 border-primary/40 ${HEIGHTS[rank]}`}
              />
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
