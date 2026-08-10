import Link from "next/link"
import { SettingsIcon, UserIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SignOutButton } from "@/components/shared-component/sign-out-button"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/**
 * The signed-in user the dashboard shell renders in the header.
 *
 * Passed from the server layout, which already fetched the session — the menu
 * never reads the session itself. Rendering the same values on server and
 * client is what keeps hydration consistent (the previous useSession-based
 * version rendered a skeleton on the server and a dropdown on the client).
 */
export interface ProfileUser {
  name: string
  email: string
  image?: string | null
  username?: string | null
  displayUsername?: string | null
  role?: string | null
}

function getDisplayName(user: ProfileUser) {
  return user.name || user.displayUsername || user.username || user.email
}

function getContactLabel(user: ProfileUser) {
  return user.email || user.displayUsername || user.username
}

function getRoleLabel(user: ProfileUser) {
  if (!user.role) {
    return "User"
  }

  return user.role
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getInitials(value: string) {
  const parts = value.split(/[\s._-]+/).filter(Boolean)
  const initials =
    parts.length > 1 ? `${parts[0]?.[0]}${parts[1]?.[0]}` : value.slice(0, 2)

  return initials.toUpperCase()
}

function ProfileAvatar({ user }: { user: ProfileUser }) {
  const displayName = getDisplayName(user)

  return (
    <Avatar>
      <AvatarImage src={user.image ?? undefined} alt={displayName} />
      <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
    </Avatar>
  )
}

function DashboardProfileMenu({ user }: { user: ProfileUser }) {
  const displayName = getDisplayName(user)
  const contactLabel = getContactLabel(user)
  const roleLabel = getRoleLabel(user)

  return (
    <DropdownMenu>
      {/* Native Radix trigger, not an asChild Button: the Slot clone chain on a
          client button rendered inside a server component produced a hydration
          mismatch under load (extra button element on the client). The trigger
          keeps the button styling via buttonVariants instead. */}
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "size-10 gap-2 rounded-full p-5.5 hover:bg-accent/70 hover:text-white aria-expanded:bg-accent aria-expanded:text-white md:w-auto md:px-2!"
        )}
        type="button"
      >
        <ProfileAvatar user={user} />
        <span className="hidden max-w-32 truncate md:inline">
          {displayName}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="p-2 font-normal">
          <div className="flex min-w-0 items-center gap-2">
            <ProfileAvatar user={user} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {contactLabel}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {roleLabel}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/profile">
              <UserIcon />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <SettingsIcon />
              Pengaturan Akun
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <SignOutButton />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { DashboardProfileMenu }
