import Link from "next/link"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlayerAvatar } from "@/components/player-avatar"
import { MatchCard } from "@/components/match-card"
import { EloTierBadge } from "@/components/elo-tier-badge"
import { getSessionUserId } from "@/lib/session"
import { getRecentMatches, getGlobalStats } from "@/lib/queries"
import { getEnrichedLeaderboard } from "@/lib/leaderboard"
import { LeaderboardView } from "@/components/leaderboard-view"
import { Trophy, Flame, Target, Plus, ArrowRight, Swords, Users } from "lucide-react"
import type { Player } from "@/lib/queries"

async function DashboardContent() {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  let players: Player[] = []
  let pointsOrder: string[] = []
  let recentMatches: Awaited<ReturnType<typeof getRecentMatches>> = []
  let stats = { totalMatches: 0, totalPlayers: 0, topScorer: undefined as undefined | { name: string; goals_for: number; avatar_seed: string } }

  try {
    const [enriched, recent, s] = await Promise.all([
      getEnrichedLeaderboard(userId),
      getRecentMatches(userId, 6),
      getGlobalStats(userId),
    ])
    players = enriched.players
    pointsOrder = enriched.pointsOrder
    recentMatches = recent
    stats = s
  } catch {
    // DB not yet set up — show empty state
  }

  const hasPlayers = players.length > 0

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl text-foreground text-balance">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your FIFA Weekend League hub
          </p>
        </div>
        <Link href="/matches/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Record Match
          </Button>
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <Swords className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display leading-none">{stats.totalMatches}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Matches played</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display leading-none">{stats.totalPlayers}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Active players</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-destructive/15 flex items-center justify-center">
              <Target className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-bold font-display leading-none truncate">
                {stats.topScorer?.name ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.topScorer ? `${stats.topScorer.goals_for} goals` : "Top scorer"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Podium (toggle re-ranks it: Points ↔ Elo) */}
      {hasPlayers && (
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              Top 3
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <LeaderboardView players={players} pointsOrder={pointsOrder} showTable={false} />
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Full leaderboard preview */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-base">Leaderboard</CardTitle>
              <Link href="/leaderboard" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {players.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No players yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {players.slice(0, 6).map((player, i) => (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors"
                  >
                    <span className="text-xs font-bold font-display text-muted-foreground w-5 text-center">
                      {i + 1}
                    </span>
                    <PlayerAvatar seed={player.avatar_seed} name={player.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{player.name}</p>
                      <EloTierBadge elo={player.elo} />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold font-display text-primary">{player.elo}</p>
                      <p className="text-xs text-muted-foreground">{player.wins}W {player.losses}L</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent matches */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              Recent Matches
            </h2>
          </div>
          {recentMatches.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground text-sm">No matches yet.</p>
                <Link href="/matches/new">
                  <Button size="sm" className="mt-3 gap-2">
                    <Plus className="w-4 h-4" />
                    Record first match
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {recentMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Onboarding when empty */}
      {players.length === 0 && (
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-display font-semibold text-foreground">Welcome! Let&apos;s set up your league</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your friends as players, then record your first match to start the rankings.
              </p>
            </div>
            <Link href="/players">
              <Button className="gap-2">
                <Users className="w-4 h-4" />
                Add players
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return <DashboardContent />
}
