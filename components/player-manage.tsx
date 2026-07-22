"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlayerAvatar } from "@/components/player-avatar"
import { getRandomSeed, AVATAR_STYLES } from "@/lib/avatar"
import { MoreVertical, Pencil, Trash2, RefreshCw, Shuffle } from "lucide-react"
import { toast } from "sonner"
import type { Player } from "@/lib/queries"

export function PlayerManage({ player }: { player: Player }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState(player.name)
  const [seed, setSeed] = useState(player.avatar_seed)
  const [styleIdx, setStyleIdx] = useState(
    Math.max(0, AVATAR_STYLES.indexOf(player.avatar_style as (typeof AVATAR_STYLES)[number]))
  )
  const [loading, setLoading] = useState(false)
  const style = AVATAR_STYLES[styleIdx]

  async function save() {
    setLoading(true)
    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), avatarSeed: seed, avatarStyle: style }),
    })
    setLoading(false)
    if (res.ok) {
      toast.success("Player updated")
      setEditOpen(false)
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error ?? "Update failed")
    }
  }

  async function remove() {
    if (!confirm(`Remove ${player.name}? If they have matches they'll be archived instead.`)) return
    const res = await fetch(`/api/players/${player.id}`, { method: "DELETE" })
    if (res.ok) {
      const d = await res.json()
      toast.success(d.archived ? "Player archived" : "Player deleted")
      router.push("/players")
      router.refresh()
    } else {
      toast.error("Delete failed")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="shrink-0" />}>
          <MoreVertical className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="w-4 h-4 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={remove} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" /> Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Edit player</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col items-center gap-3">
              <PlayerAvatar seed={seed} name={name || "?"} style={style} size="xl" />
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setSeed(getRandomSeed())} className="gap-2 text-muted-foreground">
                  <RefreshCw className="w-3 h-3" /> Shuffle seed
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setStyleIdx((i) => (i + 1) % AVATAR_STYLES.length)} className="gap-2 text-muted-foreground">
                  <Shuffle className="w-3 h-3" /> {style}
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} className="bg-input" />
            </div>
            <Button onClick={save} disabled={loading || !name.trim()} className="w-full">
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
