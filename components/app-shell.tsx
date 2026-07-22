"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Trophy,
  Users,
  Plus,
  LogOut,
  LogIn,
  Menu,
  X,
  Swords,
  ListOrdered,
  Settings,
  Shield,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { getAvatarUrl } from "@/lib/avatar"
import { ShareButton } from "@/components/share-button"

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/players", label: "Players", icon: Users },
  { href: "/teams", label: "Teams", icon: Shield },
  { href: "/matches", label: "Matches", icon: ListOrdered },
  { href: "/matches/new", label: "Record Match", icon: Plus },
  { href: "/tournaments", label: "Tournaments", icon: Swords },
  { href: "/settings", label: "Settings", icon: Settings },
]

export default function AppShell({
  children,
  boardName = "Weekend League",
  slug = "",
}: {
  children: React.ReactNode
  boardName?: string
  slug?: string
}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    // Exact match for /matches so /matches/new doesn't also light it up.
    if (href === "/matches") return pathname === "/matches"
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-sidebar sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-border">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-xs font-bold font-display">FC</span>
            </div>
            <span className="font-display font-bold text-foreground tracking-tight truncate">
              {boardName}
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {slug && (
          <div className="px-3 pb-2">
            <ShareButton slug={slug} variant="outline" size="sm" className="w-full justify-center gap-2" />
          </div>
        )}

        <div className="px-3 py-4 border-t border-border">
          {session?.user ? (
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={getAvatarUrl(session.user.name ?? "user")} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {(session.user.name ?? "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session.user.name}</p>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <LogIn className="w-4 h-4" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-sidebar border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">FC</span>
          </div>
          <span className="font-display font-bold text-sm truncate max-w-[180px]">
            {boardName}
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-muted-foreground hover:text-foreground"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 pt-14">
          <nav className="flex flex-col gap-1 p-4">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
            <div className="mt-4 pt-4 border-t border-border">
              {session?.user ? (
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-destructive w-full"
                >
                  <LogOut className="w-5 h-5" />
                  Sign out
                </button>
              ) : (
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 md:pt-0 pt-14">
        {children}
      </main>
    </div>
  )
}
