"use client"

import { Input } from "@/components/ui/input"

// A handful of popular clubs/nations to prime the autocomplete on empty boards.
export const POPULAR_TEAMS = [
  "Real Madrid", "Barcelona", "Man City", "Man United", "Liverpool", "Arsenal",
  "Chelsea", "Tottenham", "Bayern Munich", "Borussia Dortmund", "PSG", "Juventus",
  "Inter Milan", "AC Milan", "Napoli", "Atlético Madrid", "Brazil", "Argentina",
  "France", "England", "Spain", "Germany", "Portugal", "Netherlands",
]

interface Props {
  id?: string
  value: string
  onChange: (v: string) => void
  suggestions?: string[]
  placeholder?: string
  className?: string
}

export function TeamCombobox({ id, value, onChange, suggestions = [], placeholder, className }: Props) {
  const listId = `${id ?? "team"}-list`
  const options = Array.from(new Set([...suggestions, ...POPULAR_TEAMS]))
  return (
    <>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Team (optional)"}
        className={className}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </>
  )
}
