"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

/**
 * Sign out from the participant shell: end the session and return to the
 * login page. Explicit logout is blocked while an active attempt is in progress.
 */
export function ExamSignOutButton({
  hasActiveAttempt = false,
}: {
  hasActiveAttempt?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleSignOut() {
    if (hasActiveAttempt) {
      return
    }

    await authClient.signOut()

    startTransition(() => {
      router.push("/login")
      router.refresh()
    })
  }

  return (
    <Button
      disabled={isPending || hasActiveAttempt}
      size="sm"
      type="button"
      variant="outline"
      title={
        hasActiveAttempt
          ? "Tidak dapat keluar akun saat sedang mengerjakan ujian."
          : "Keluar Akun"
      }
      onClick={handleSignOut}
    >
      Keluar
    </Button>
  )
}
