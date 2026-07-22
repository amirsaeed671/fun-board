"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlayerAvatar } from "@/components/player-avatar"
import { getRandomSeed } from "@/lib/avatar"
import { Plus, RefreshCw } from "lucide-react"

export default function NewPlayerDialog() {
  const router = useRouter()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [seed, setSeed] = useState(getRandomSeed())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function randomizeSeed() {
    setSeed(getRandomSeed())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user?.id) {
      setError("You must be signed in to add a player")
      return
    }
    setLoading(true)
    setError("")

    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), avatarSeed: seed }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? "Failed to create player")
    } else {
      setOpen(false)
      setName("")
      setSeed(getRandomSeed())
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="w-4 h-4" />
        Add Player
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">New Player</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {/* Avatar preview */}
          <div className="flex flex-col items-center gap-3">
            <PlayerAvatar seed={seed} name={name || "?"} size="xl" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={randomizeSeed}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-3 h-3" />
              Randomize avatar
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="player-name">Player name</Label>
            <Input
              id="player-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ronaldo"
              required
              className="bg-input"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {!session?.user && (
            <p className="text-sm text-muted-foreground text-center">
              Sign in to add players.
            </p>
          )}

          <Button type="submit" disabled={loading || !session?.user} className="w-full">
            {loading ? "Creating..." : "Create Player"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
