"use client"

import { useEffect } from "react"
import confetti from "canvas-confetti"

/** Fires a short celebratory confetti burst once on mount. */
export function Confetti() {
  useEffect(() => {
    const end = Date.now() + 900
    const colors = ["#22c55e", "#eab308", "#f97316", "#ffffff"]
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0 }, colors })
      confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [])
  return null
}
