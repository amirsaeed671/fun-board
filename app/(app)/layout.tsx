import { redirect } from "next/navigation"
import AppShell from "@/components/app-shell"
import { getSessionUserId } from "@/lib/session"
import { getBoardMeta } from "@/lib/board"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  let boardName = "My League"
  let slug = ""
  try {
    const meta = await getBoardMeta(userId)
    if (meta) {
      boardName = meta.leaderboardName
      slug = meta.shareSlug
    }
  } catch {
    // DB not reachable yet — render with defaults.
  }

  return (
    <AppShell boardName={boardName} slug={slug}>
      {children}
    </AppShell>
  )
}
