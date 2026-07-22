"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, Copy, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface Props {
  initialName: string
  initialSlug: string
}

export function SettingsForm({ initialName, initialSlug }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [slug, setSlug] = useState(initialSlug)
  const [savingName, setSavingName] = useState(false)
  const [copied, setCopied] = useState(false)

  // Password
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [savingPw, setSavingPw] = useState(false)

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/l/${slug}` : `/l/${slug}`

  async function saveName() {
    setSavingName(true)
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rename", leaderboardName: name.trim() }),
    })
    setSavingName(false)
    if (res.ok) {
      toast.success("Leaderboard renamed")
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error ?? "Rename failed")
    }
  }

  async function regenerate() {
    if (!confirm("Regenerate the share link? The current public link will stop working.")) return
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate-slug" }),
    })
    if (res.ok) {
      const d = await res.json()
      setSlug(d.slug)
      toast.success("New share link generated")
      router.refresh()
    } else {
      toast.error("Could not regenerate link")
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    toast.success("Link copied")
    setTimeout(() => setCopied(false), 2000)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setSavingPw(true)
    const res = await fetch("/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    })
    setSavingPw(false)
    if (res.ok) {
      toast.success("Password changed")
      setCurrent("")
      setNext("")
    } else {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error ?? "Could not change password")
    }
  }

  return (
    <div className="space-y-6">
      {/* Leaderboard name */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Leaderboard name</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 flex flex-col gap-1.5">
            <Label htmlFor="lb-name">Display title on your public page</Label>
            <Input id="lb-name" value={name} onChange={(e) => setName(e.target.value)} className="bg-input" maxLength={60} />
          </div>
          <Button onClick={saveName} disabled={savingName || !name.trim() || name === initialName}>
            {savingName ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>

      {/* Public link */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Public share link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Anyone with this link can view your leaderboard (read-only). Only you can edit.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={publicUrl} className="bg-input font-mono text-xs" />
            <Button variant="outline" onClick={copyLink} className="gap-2 shrink-0">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Copy
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={regenerate} className="gap-2 text-muted-foreground hover:text-destructive">
            <RefreshCw className="w-3.5 h-3.5" />
            Regenerate link
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="flex flex-col gap-3 max-w-sm">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cur-pw">Current password</Label>
              <Input id="cur-pw" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="bg-input" autoComplete="current-password" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-pw">New password</Label>
              <Input id="new-pw" type="password" value={next} onChange={(e) => setNext(e.target.value)} className="bg-input" autoComplete="new-password" minLength={6} />
            </div>
            <Button type="submit" disabled={savingPw || !current || next.length < 6} className="w-fit">
              {savingPw ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
