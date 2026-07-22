import { cn } from "@/lib/utils"

const COLORS = [
  "bg-primary/20 text-primary",
  "bg-accent/20 text-accent",
  "bg-orange-500/20 text-orange-400",
  "bg-sky-500/20 text-sky-400",
  "bg-purple-500/20 text-purple-400",
  "bg-pink-500/20 text-pink-400",
  "bg-emerald-500/20 text-emerald-400",
  "bg-red-500/20 text-red-400",
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const raw = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
  return raw.toUpperCase()
}

function colorIndex(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h % COLORS.length
}

const sizeMap = {
  sm: "w-8 h-8 text-[10px]",
  md: "w-10 h-10 text-xs",
  lg: "w-14 h-14 text-sm",
}

export function TeamBadge({
  name,
  size = "md",
  className,
}: {
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-bold font-display ring-1 ring-border shrink-0",
        COLORS[colorIndex(name)],
        sizeMap[size],
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}
