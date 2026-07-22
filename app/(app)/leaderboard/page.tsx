import Link from "next/link"
import { getLeaderboard } from "@/lib/queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlayerAvatar } from "@/components/player-avatar"
import { EloTierBadge } from "@/components/elo-tier-badge"
import { Trophy, TrendingUp, Target, Shield } from "lucide-react"
import { getEloTier } from "@/lib/elo"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function LeaderboardPage() {
  let players: Awaited<ReturnType<typeof getLeaderboard>> = []
  try {
    players = await getLeaderboard()
  } catch {
    // empty
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-balance">Leaderboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Ranked by Elo rating</p>
      </div>

      <Card className="bg-card border-border overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-4 px-4 py-2.5 border-b border-border bg-secondary/50">
          <span className="text-xs text-muted-foreground font-medium">#</span>
          <span className="text-xs text-muted-foreground font-medium">Player</span>
          <span className="text-xs text-muted-foreground font-medium text-right">W / D / L</span>
          <span className="text-xs text-muted-foreground font-medium text-right">GD</span>
          <span className="text-xs text-muted-foreground font-medium text-right">Elo</span>
        </div>

        {players.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            No players yet. Seed sample data from the dashboard.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {players.map((player, i) => {
              const { color } = getEloTier(player.elo)
              const gd = player.goals_for - player.goals_against
              const totalMatches = player.wins + player.losses + player.draws
              const winRate = totalMatches > 0 ? Math.round((player.wins / totalMatches) * 100) : 0

              return (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className={cn(
                    "grid grid-cols-[2rem_1fr_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-secondary/50 transition-colors",
                    i === 0 && "bg-accent/5"
                  )}
                >
                  <span className={cn(
                    "text-sm font-bold font-display text-center",
                    i === 0 ? "text-accent" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-600" : "text-muted-foreground"
                  )}>
                    {i + 1}
                  </span>

                  <div className="flex items-center gap-3 min-w-0">
                    <PlayerAvatar seed={player.avatar_seed} name={player.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{player.name}</p>
                      <EloTierBadge elo={player.elo} showElo={false} />
                    </div>
                  </div>

                  <span className="text-sm tabular-nums text-muted-foreground text-right">
                    {player.wins} / {player.draws} / {player.losses}
                  </span>

                  <span className={cn(
                    "text-sm font-medium tabular-nums text-right",
                    gd > 0 ? "text-primary" : gd < 0 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {gd > 0 ? `+${gd}` : gd}
                  </span>

                  <span className={cn("text-sm font-bold font-display tabular-nums text-right", color)}>
                    {player.elo}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </Card>

      {/* Win rate cards */}
      {players.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {players.slice(0, 3).map((player) => {
            const total = player.wins + player.losses + player.draws
            const wr = total > 0 ? Math.round((player.wins / total) * 100) : 0
            return (
              <Link key={player.id} href={`/players/${player.id}`}>
                <Card className="bg-card border-border hover:border-primary/40 transition-colors p-4">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar seed={player.avatar_seed} name={player.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground truncate">{player.name}</p>
                      <p className="text-base font-bold font-display text-primary">{wr}% WR</p>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
