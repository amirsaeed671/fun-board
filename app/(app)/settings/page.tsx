import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/session"
import { getBoardMeta } from "@/lib/board"
import { SettingsForm } from "@/components/settings-form"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  const meta = await getBoardMeta(userId).catch(() => null)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-balance">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your leaderboard and account</p>
      </div>

      <SettingsForm
        initialName={meta?.leaderboardName ?? "My League"}
        initialSlug={meta?.shareSlug ?? ""}
      />
    </div>
  )
}
