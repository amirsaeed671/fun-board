"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function PublicNav({ slug }: { slug: string }) {
  const pathname = usePathname()
  const base = `/l/${slug}`
  const items = [
    { href: base, label: "Leaderboard" },
    { href: `${base}/matches`, label: "Matches" },
    { href: `${base}/tournaments`, label: "Tournaments" },
  ]
  return (
    <nav className="flex items-center gap-1">
      {items.map((item) => {
        const active =
          item.href === base ? pathname === base : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
