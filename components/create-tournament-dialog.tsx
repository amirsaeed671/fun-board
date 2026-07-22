"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import NewTournamentForm from "@/components/new-tournament-form"
import type { Player } from "@/lib/queries"

export default function CreateTournamentDialog({ players }: { players: Player[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="w-4 h-4" />
        New Tournament
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">New Tournament</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <NewTournamentForm players={players} onCreated={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
