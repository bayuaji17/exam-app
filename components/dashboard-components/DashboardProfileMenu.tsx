"use client"

import Link from "next/link"
import { SettingsIcon, UserIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { authClient } from "@/lib/auth-client"
import { SignOutButton } from "../shared-component/sign-out-button"

type SessionData = NonNullable<ReturnType<typeof authClient.useSession>["data"]>
type SessionUser = SessionData["user"]

function getStringField(source: Record<string, unknown>, key: string) {
  const value = source[key]

  if (typeof value !== "string") {
    return null
  }

  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : null
}

function getDisplayName(user: SessionUser) {
  const userRecord = user as Record<string, unknown>

  return (
    getStringField(userRecord, "name") ??
    getStringField(userRecord, "displayUsername") ??
    getStringField(userRecord, "username") ??
    getStringField(userRecord, "email") ??
    "User"
  )
}

function getContactLabel(user: SessionUser) {
  const userRecord = user as Record<string, unknown>

  return (
    getStringField(userRecord, "email") ??
    getStringField(userRecord, "displayUsername") ??
    getStringField(userRecord, "username") ??
    "Signed in"
  )
}

function getRoleLabel(user: SessionUser) {
  const userRecord = user as Record<string, unknown>
  const role = getStringField(userRecord, "role") ?? "user"

  return role
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

function ProfileAvatar({ user }: { user: SessionUser }) {
  const displayName = getDisplayName(user)

  return (
    <Avatar>
      <AvatarImage src={user.image ?? undefined} alt={displayName} />
      <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
    </Avatar>
  )
}

function DashboardProfileMenu() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="size-8 rounded-full" />
        <div className="hidden flex-col gap-1 md:flex">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">
          <UserIcon data-icon="inline-start" />
          Login
        </Link>
      </Button>
    )
  }

  const displayName = getDisplayName(session.user)
  const contactLabel = getContactLabel(session.user)
  const roleLabel = getRoleLabel(session.user)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="size-10 gap-2 rounded-full p-5.5 hover:bg-accent/70 hover:text-white aria-expanded:bg-accent aria-expanded:text-white md:w-auto md:px-2!"
        >
          <ProfileAvatar user={session.user} />
          <span className="hidden max-w-32 truncate md:inline">
            {displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="p-2 font-normal">
          <div className="flex min-w-0 items-center gap-2">
            <ProfileAvatar user={session.user} />
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
