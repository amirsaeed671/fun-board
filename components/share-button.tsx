"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Check } from "lucide-react"
import { toast } from "sonner"

interface Props {
  slug: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "icon"
  className?: string
}

export function ShareButton({ slug, variant = "outline", size = "sm", className }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!slug) {
      toast.error("No public link yet")
      return
    }
    const url = `${window.location.origin}/l/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success("Public link copied!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy link")
    }
  }

  return (
    <Button onClick={copy} variant={variant} size={size} className={className}>
      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      {size !== "icon" && <span className="ml-2">Share</span>}
    </Button>
  )
}
