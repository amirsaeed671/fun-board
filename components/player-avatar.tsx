import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { getAvatarUrl } from "@/lib/avatar"
import { cn } from "@/lib/utils"

interface PlayerAvatarProps {
  seed: string
  name: string
  style?: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeMap = {
  sm: { avatar: "w-8 h-8", px: 32, fallback: "text-xs" },
  md: { avatar: "w-10 h-10", px: 40, fallback: "text-sm" },
  lg: { avatar: "w-14 h-14", px: 56, fallback: "text-base" },
  xl: { avatar: "w-20 h-20", px: 80, fallback: "text-xl" },
}

export function PlayerAvatar({ seed, name, style = "pixel-art", size = "md", className }: PlayerAvatarProps) {
  const s = sizeMap[size]
  return (
    <Avatar className={cn(s.avatar, "ring-1 ring-border bg-muted", className)}>
      <AvatarImage src={getAvatarUrl(seed, style, s.px)} alt={name} />
      <AvatarFallback className={cn("bg-primary/20 text-primary font-bold", s.fallback)}>
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}
