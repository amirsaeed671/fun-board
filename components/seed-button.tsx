"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { DatabaseZap } from "lucide-react"
import { toast } from "sonner"

/** Creates the demo board (demo / demo1234) and opens its public page. */
export function SeedButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSeed() {
    setLoading(true)
    try {
      const res = await fetch("/api/seed", { method: "POST" })
      const data = await res.json()
      if (data.ok) {
        toast.success("Demo board ready — login: demo / demo1234")
        router.push(data.shareUrl ?? "/l/demo")
      } else {
        toast.error(data.error ?? "Could not load demo")
      }
    } catch {
      toast.error("Could not load demo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleSeed}
      disabled={loading}
      variant="outline"
      className="gap-2 w-full border-primary/40 text-primary hover:bg-primary/10"
    >
      <DatabaseZap className="w-4 h-4" />
      {loading ? "Loading demo…" : "Try the demo board"}
    </Button>
  )
}
