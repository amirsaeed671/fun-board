import { notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlayerAvatar } from "@/components/player-avatar"
import { EloTierBadge } from "@/components/elo-tier-badge"
import { MatchCard } from "@/components/match-card"
import EloChart from "@/components/elo-chart"
import { db } from "@/lib/db"
import { getEloTier } from "@/lib/elo"
import { ArrowLeft, Target, Shield, TrendingUp, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

async function getPlayerData(id: string) {
  const [playerResult, matchesResult, eloHistoryResult] = await Promise.all([
    db.execute({ sql: "SELECT * FROM players WHERE id = ?", args: [id] }),
    db.execute({
      sql: `SELECT m.*,
              hp.name as home_player_name, hp.avatar_seed as home_avatar_seed,
              ap.name as away_player_name, ap.avatar_seed as away_avatar_seed
            FROM matches m
            JOIN players hp ON m.home_player_id = hp.id
            JOIN players ap ON m.away_player_id = ap.id
            WHERE m.home_player_id = ? OR m.away_player_id = ?
            ORDER BY m.played_at DESC LIMIT 20`,
      args: [id, id],
    }),
    db.execute({
      sql: "SELECT elo, recorded_at FROM elo_history WHERE player_id = ? ORDER BY recorded_at ASC LIMIT 30",
      args: [id],
    }),
  ])

  return {
    player: playerResult.rows[0] as Record<string, unknown> | undefined,
    matches: matchesResult.rows as Record<string, unknown>[],
    eloHistory: eloHistoryResult.rows as unknown as { elo: number; recorded_at: string }[],
  }
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let data: Awaited<ReturnType<typeof getPlayerData>>
  try {
    data = await getPlayerData(id)
  } catch {
    notFound()
  }

  const { player, matches, eloHistory } = data!
  if (!player) notFound()

  const p = player as {
    id: string
    name: string
    avatar_seed: string
    elo: number
    wins: number
    losses: number
    draws: number
    goals_for: number
    goals_against: number
    created_at: string
  }

  const totalMatches = p.wins + p.losses + p.draws
  const winRate = totalMatches > 0 ? Math.round((p.wins / totalMatches) * 100) : 0
  const gd = p.goals_for - p.goals_against
  const { tier, color } = getEloTier(p.elo)

  // Build Elo chart data including starting Elo
  const chartData = [
    { match: 0, elo: 1000, label: "Start" },
    ...eloHistory.map((h, i) => ({ match: i + 1, elo: h.elo, label: `Match ${i + 1}` })),
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/players" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm w-fit">
        <ArrowLeft className="w-4 h-4" />
        All players
      </Link>

      {/* Hero card */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <PlayerAvatar seed={p.avatar_seed} name={p.name} size="xl" className="ring-2 ring-primary/30" />
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-2xl text-balance">{p.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-sm font-bold font-display", color)}>{tier}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-sm font-bold font-display text-primary">{p.elo} Elo</span>
              </div>
              <div className="flex gap-4 mt-3">
                <div className="text-center">
                  <p className="text-lg font-bold font-display text-primary leading-none">{p.wins}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Wins</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold font-display text-muted-foreground leading-none">{p.draws}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Draws</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold font-display text-destructive leading-none">{p.losses}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Losses</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-display text-primary">{winRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Win rate</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className={cn("text-2xl font-bold font-display", gd > 0 ? "text-primary" : gd < 0 ? "text-destructive" : "text-muted-foreground")}>
              {gd > 0 ? `+${gd}` : gd}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Goal diff</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-display text-accent">{p.goals_for}</p>
            <p className="text-xs text-muted-foreground mt-1">Goals scored</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold font-display text-muted-foreground">{totalMatches}</p>
            <p className="text-xs text-muted-foreground mt-1">Matches</p>
          </CardContent>
        </Card>
      </div>

      {/* Elo chart */}
      {chartData.length > 1 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Elo History
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <EloChart data={chartData} />
          </CardContent>
        </Card>
      )}

      {/* Match history */}
      <div>
        <h2 className="font-display font-semibold text-base mb-3">Recent Matches</h2>
        {matches.length === 0 ? (
          <p className="text-muted-foreground text-sm">No matches yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {matches.map((match) => (
              <MatchCard
                key={match.id as string}
                match={match as unknown as Parameters<typeof MatchCard>[0]["match"]}
                highlightPlayerId={id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
