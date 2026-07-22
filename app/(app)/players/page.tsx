import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { getAllPlayers } from "@/lib/queries"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlayerAvatar } from "@/components/player-avatar"
import { EloTierBadge } from "@/components/elo-tier-badge"
import { getEloTier } from "@/lib/elo"
import { Plus } from "lucide-react"
import NewPlayerDialog from "@/components/new-player-dialog"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function PlayersPage() {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  let players: Awaited<ReturnType<typeof getAllPlayers>> = []
  try {
    players = await getAllPlayers(userId)
  } catch {
    // empty
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl text-balance">Players</h1>
          <p className="text-muted-foreground text-sm mt-1">{players.length} active players</p>
        </div>
        <NewPlayerDialog />
      </div>

      {players.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-display font-semibold">No players yet</p>
            <p className="text-muted-foreground text-sm mt-1">Add your first player to get started</p>
          </div>
          <NewPlayerDialog />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {players.map((player, i) => {
            const { color } = getEloTier(player.elo)
            const totalMatches = player.wins + player.losses + player.draws
            const wr = totalMatches > 0 ? Math.round((player.wins / totalMatches) * 100) : 0

            return (
              <Link key={player.id} href={`/players/${player.id}`}>
                <Card className="bg-card border-border hover:border-primary/40 hover:-translate-y-0.5 transition-all cursor-pointer group h-full">
                  <CardContent className="p-5 flex flex-col items-center gap-3 text-center">
                    <div className="relative">
                      <PlayerAvatar
                        seed={player.avatar_seed}
                        name={player.name}
                        size="lg"
                        className="ring-2 ring-border group-hover:ring-primary transition-all"
                      />
                      {i < 3 && (
                        <span className={cn(
                          "absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold font-display flex items-center justify-center bg-card border border-border",
                          i === 0 ? "text-accent" : i === 1 ? "text-slate-400" : "text-orange-600"
                        )}>
                          {i + 1}
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-sm leading-tight truncate max-w-full">{player.name}</p>
                      <EloTierBadge elo={player.elo} />
                    </div>

                    <div className="w-full grid grid-cols-3 gap-1 text-center mt-1">
                      <div>
                        <p className="text-xs font-bold text-primary">{player.wins}</p>
                        <p className="text-[10px] text-muted-foreground">W</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-muted-foreground">{player.draws}</p>
                        <p className="text-[10px] text-muted-foreground">D</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-destructive">{player.losses}</p>
                        <p className="text-[10px] text-muted-foreground">L</p>
                      </div>
                    </div>

                    <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${wr}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground -mt-2">{wr}% win rate</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
