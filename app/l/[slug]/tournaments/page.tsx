import Link from "next/link"
import { notFound } from "next/navigation"
import { getBoardBySlug } from "@/lib/board"
import { getAllTournaments } from "@/lib/queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlayerAvatar } from "@/components/player-avatar"
import { Trophy, Users } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export const dynamic = "force-dynamic"

function statusColor(status: string) {
  if (status === "active") return "bg-primary/20 text-primary border-primary/30"
  if (status === "completed") return "bg-muted text-muted-foreground border-border"
  return "bg-accent/20 text-accent border-accent/30"
}

export default async function PublicTournamentsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const board = await getBoardBySlug(slug).catch(() => null)
  if (!board) notFound()

  const base = `/l/${slug}`
  let tournaments: Awaited<ReturnType<typeof getAllTournaments>> = []
  try {
    tournaments = await getAllTournaments(board.userId)
  } catch {
    // empty
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-balance">Tournaments</h1>
        <p className="text-muted-foreground text-sm mt-1">Knockout and round-robin competitions</p>
      </div>

      {tournaments.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            No tournaments yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {tournaments.map((t) => (
            <Link key={t.id} href={`${base}/tournaments/${t.id}`}>
              <Card className="bg-card border-border hover:border-primary/40 transition-all group cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="font-display text-base leading-tight group-hover:text-primary transition-colors">
                      {t.name}
                    </CardTitle>
                    <Badge variant="outline" className={`shrink-0 text-xs capitalize ${statusColor(t.status)}`}>
                      {t.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Trophy className="w-3.5 h-3.5" />
                    {t.format === "round-robin" ? "Round Robin" : "Knockout"}
                  </span>
                  {t.participant_count !== undefined && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      {t.participant_count} players
                    </span>
                  )}
                  {t.winner_name && (
                    <span className="flex items-center gap-1.5 text-sm text-accent ml-auto">
                      <PlayerAvatar seed={t.winner_avatar_seed ?? "w"} name={t.winner_name} size="sm" />
                      {t.winner_name}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
