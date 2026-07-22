"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { DatabaseZap } from "lucide-react"

export function SeedButton() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleSeed() {
    setLoading(true)
    const res = await fetch("/api/seed", { method: "POST" })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      setDone(true)
      router.refresh()
    }
  }

  if (done) return <p className="text-sm text-primary font-medium">Seeded! Refresh to see data.</p>

  return (
    <Button onClick={handleSeed} disabled={loading} variant="outline" className="gap-2 shrink-0 border-primary/40 text-primary hover:bg-primary/10">
      <DatabaseZap className="w-4 h-4" />
      {loading ? "Seeding..." : "Seed Sample Data"}
    </Button>
  )
}
