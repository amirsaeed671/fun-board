import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayerAvatar } from "@/components/player-avatar"
import { TeamBadge } from "@/components/team-badge"
import { MatchCard } from "@/components/match-card"
import EloChart from "@/components/elo-chart"
import { getEloTier } from "@/lib/elo"
import { cn } from "@/lib/utils"
import { TrendingUp, Swords, Skull, Crosshair, Trophy, Shield } from "lucide-react"
import type { Player, Match } from "@/lib/queries"
import {
  toPlayerRows,
  playerRecord,
  headToHead,
  nemesis,
  favouriteVictim,
  teamsUsed,
  bestTeam,
  unluckyTeam,
  mostPickedTeam,
  mostWinsTeam,
  biggestWin,
  worstDefeat,
  longestWinStreak,
  currentStreak,
  recentForm,
} from "@/lib/stats"

interface Props {
  player: Player
  matches: Match[] // all of this player's matches, most-recent first
  eloHistory: { elo: number; recorded_at: string }[]
  playerBasePath?: string
}

function FormPill({ r }: { r: "W" | "D" | "L" }) {
  const map = {
    W: "bg-primary/20 text-primary",
    D: "bg-muted text-muted-foreground",
    L: "bg-destructive/20 text-destructive",
  }
  return (
    <span className={cn("w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold font-display", map[r])}>
      {r}
    </span>
  )
}

export function PlayerStats({ player: p, matches, eloHistory, playerBasePath = "" }: Props) {
  const rows = toPlayerRows(matches, p.id)
  const record = playerRecord(rows)
  const h2h = headToHead(rows)
  const nem = nemesis(rows)
  const fav = favouriteVictim(rows)
  const teams = teamsUsed(rows)
  const best = bestTeam(rows)
  const unlucky = unluckyTeam(rows)
  const favTeam = mostPickedTeam(rows)
  const winsTeam = mostWinsTeam(rows)
  const biggest = biggestWin(rows)
  const worst = worstDefeat(rows)
  const longest = longestWinStreak(rows)
  const streak = currentStreak(rows)
  const form = recentForm(rows, 5)
  const { tier, color } = getEloTier(p.elo)
  const totalPoints = p.total_points ?? p.points

  const chartData = [
    { match: 0, elo: 1000, label: "Start" },
    ...eloHistory.map((h, i) => ({ match: i + 1, elo: h.elo, label: `Match ${i + 1}` })),
  ]

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-5 flex-wrap">
            <PlayerAvatar seed={p.avatar_seed} name={p.name} style={p.avatar_style} size="xl" className="ring-2 ring-primary/30" />
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-2xl text-balance">{p.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={cn("text-sm font-bold font-display", color)}>{tier}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-sm font-bold font-display text-primary">{p.elo} Elo</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-sm font-bold font-display text-accent">{totalPoints} pts</span>
              </div>
              <div className="flex gap-4 mt-3">
                <Stat label="Wins" value={record.w} className="text-primary" />
                <Stat label="Draws" value={record.d} className="text-muted-foreground" />
                <Stat label="Losses" value={record.l} className="text-destructive" />
              </div>
            </div>
            {form.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Recent form</span>
                <div className="flex gap-1">
                  {form.map((r, i) => (
                    <FormPill key={i} r={r} />
                  ))}
                </div>
                {streak && streak.count >= 2 && (
                  <span className="text-xs text-muted-foreground">
                    {streak.type === "W" ? "On a" : streak.type === "L" ? "Losing" : "Drawing"} streak: {streak.count}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Win rate" value={`${record.winRate}%`} className="text-primary" />
        <StatCard label="Goals for" value={record.gf} className="text-accent" />
        <StatCard label="Goals against" value={record.ga} className="text-destructive" />
        <StatCard
          label="Goal diff"
          value={record.gd > 0 ? `+${record.gd}` : `${record.gd}`}
          className={record.gd > 0 ? "text-primary" : record.gd < 0 ? "text-destructive" : "text-muted-foreground"}
        />
        <StatCard label="Longest W streak" value={longest} className="text-orange-400" />
      </div>

      {/* Nemesis + favourite victim */}
      {(nem || fav) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {nem && (
            <RivalCard
              icon={<Skull className="w-4 h-4 text-destructive" />}
              title="Nemesis"
              subtitle={`${nem.w}-${nem.d}-${nem.l} record`}
              opponent={nem}
              basePath={playerBasePath}
            />
          )}
          {fav && (
            <RivalCard
              icon={<Crosshair className="w-4 h-4 text-primary" />}
              title="Favourite victim"
              subtitle={`${fav.w}-${fav.d}-${fav.l} record`}
              opponent={fav}
              basePath={playerBasePath}
            />
          )}
        </div>
      )}

      {/* Biggest win / worst defeat */}
      {(biggest || worst) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {biggest && (
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <Trophy className="w-4 h-4 text-accent shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Biggest win</p>
                  <p className="text-sm font-medium">
                    {biggest.gf}–{biggest.ga} vs {biggest.opponentName}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {worst && (
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <Shield className="w-4 h-4 text-destructive shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Worst defeat</p>
                  <p className="text-sm font-medium">
                    {worst.gf}–{worst.ga} vs {worst.opponentName}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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

      {/* Head-to-head */}
      {h2h.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Swords className="w-4 h-4 text-muted-foreground" />
              Head-to-head
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left font-medium pb-2">Opponent</th>
                  <th className="text-center font-medium pb-2 w-10">P</th>
                  <th className="text-center font-medium pb-2 w-10">W</th>
                  <th className="text-center font-medium pb-2 w-10">D</th>
                  <th className="text-center font-medium pb-2 w-10">L</th>
                  <th className="text-center font-medium pb-2 w-16">Goals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {h2h.map((h) => (
                  <tr key={h.opponentId}>
                    <td className="py-2">
                      <Link
                        href={`${playerBasePath}/players/${h.opponentId}`}
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                      >
                        <PlayerAvatar seed={h.opponentSeed || h.opponentId} name={h.opponentName} size="sm" />
                        <span className="font-medium">{h.opponentName}</span>
                      </Link>
                    </td>
                    <td className="text-center text-muted-foreground">{h.played}</td>
                    <td className="text-center text-primary">{h.w}</td>
                    <td className="text-center text-muted-foreground">{h.d}</td>
                    <td className="text-center text-destructive">{h.l}</td>
                    <td className="text-center text-muted-foreground text-xs">{h.gf}:{h.ga}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Favourite team + most wins */}
      {(favTeam || winsTeam) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {favTeam && (
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <TeamBadge name={favTeam.team} size="md" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Favourite team</p>
                  <p className="text-sm font-medium truncate">{favTeam.team}</p>
                  <p className="text-xs text-muted-foreground">
                    picked {favTeam.played} {favTeam.played === 1 ? "time" : "times"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {winsTeam && (
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <TeamBadge name={winsTeam.team} size="md" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Most wins with</p>
                  <p className="text-sm font-medium truncate">{winsTeam.team}</p>
                  <p className="text-xs text-primary">
                    {winsTeam.w} {winsTeam.w === 1 ? "win" : "wins"} · {winsTeam.winRate}% win rate
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Teams used */}
      {teams.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Teams used</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left font-medium pb-2">Team</th>
                  <th className="text-center font-medium pb-2 w-10">P</th>
                  <th className="text-center font-medium pb-2 w-10">W</th>
                  <th className="text-center font-medium pb-2 w-10">D</th>
                  <th className="text-center font-medium pb-2 w-10">L</th>
                  <th className="text-center font-medium pb-2 w-14">Win%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teams.map((t) => (
                  <tr key={t.team}>
                    <td className="py-2 font-medium flex items-center gap-2">
                      {t.team}
                      {best && t.team === best.team && best.played > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">best</span>
                      )}
                      {unlucky && t.team === unlucky.team && unlucky.team !== best?.team && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">unlucky</span>
                      )}
                    </td>
                    <td className="text-center text-muted-foreground">{t.played}</td>
                    <td className="text-center text-primary">{t.w}</td>
                    <td className="text-center text-muted-foreground">{t.d}</td>
                    <td className="text-center text-destructive">{t.l}</td>
                    <td className="text-center font-medium">{t.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Recent matches */}
      <div>
        <h2 className="font-display font-semibold text-base mb-3">Recent Matches</h2>
        {matches.length === 0 ? (
          <p className="text-muted-foreground text-sm">No matches yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {matches.slice(0, 15).map((match) => (
              <MatchCard key={match.id} match={match} highlightPlayerId={p.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="text-center">
      <p className={cn("text-lg font-bold font-display leading-none", className)}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

function StatCard({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 text-center">
        <p className={cn("text-2xl font-bold font-display", className)}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  )
}

function RivalCard({
  icon,
  title,
  subtitle,
  opponent,
  basePath,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  opponent: { opponentId: string; opponentName: string; opponentSeed: string }
  basePath: string
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 flex items-center gap-3">
        {icon}
        <Link href={`${basePath}/players/${opponent.opponentId}`} className="flex items-center gap-3 min-w-0 hover:text-primary transition-colors">
          <PlayerAvatar seed={opponent.opponentSeed || opponent.opponentId} name={opponent.opponentName} size="md" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-sm font-medium truncate">{opponent.opponentName}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </Link>
      </CardContent>
    </Card>
  )
}
