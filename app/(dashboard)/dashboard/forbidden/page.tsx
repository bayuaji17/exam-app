import Link from "next/link"
import { ShieldXIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <ShieldXIcon className="size-16 text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">Access denied</h1>
        <p className="max-w-md text-muted-foreground">
          You do not have permission to view this page. If you believe this is
          an error, contact your administrator.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  )
}
