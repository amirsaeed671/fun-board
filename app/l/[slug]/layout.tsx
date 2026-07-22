import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getBoardBySlug } from "@/lib/board"
import { PublicNav } from "@/components/public-nav"
import { Eye, Trophy } from "lucide-react"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const board = await getBoardBySlug(slug).catch(() => null)
  if (!board) return { title: "Leaderboard not found" }
  const title = `${board.leaderboardName} — FIFA Leaderboard`
  const description = `Live FIFA standings, Elo ratings, and tournaments for ${board.leaderboardName}.`
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  }
}

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const board = await getBoardBySlug(slug).catch(() => null)
  if (!board) notFound()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-sidebar/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Link href={`/l/${slug}`} className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground tracking-tight truncate">
              {board.leaderboardName}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground border border-border rounded-full px-2 py-0.5 shrink-0">
              <Eye className="w-3 h-3" />
              View-only
            </span>
          </Link>
          <PublicNav slug={slug} />
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
