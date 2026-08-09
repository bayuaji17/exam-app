"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { authClient } from "@/lib/auth-client"
import { describeUserAgent } from "@/lib/users/session-format"
import { formatJoinedAt } from "@/lib/users/format"
import type { ActiveSession } from "@/lib/users/queries"

const COLUMNS = ["Perangkat", "Alamat IP", "Mulai", "Aksi"]

function RevokeButton({ sessionToken }: { sessionToken: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function revoke() {
    setError(null)
    setIsSaving(true)

    const { error: apiError } = await authClient.revokeSession({
      token: sessionToken,
    })

    setIsSaving(false)

    if (apiError) {
      setError(apiError.message || "Unable to end this session.")
      return
    }

    // Same-page refresh after a mutation — the safe pattern, no push() nearby.
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        disabled={isSaving}
        onClick={revoke}
        size="sm"
        type="button"
        variant="outline"
      >
        {isSaving ? "Memproses..." : "Putuskan"}
      </Button>
      {error && <FieldError>{error}</FieldError>}
    </div>
  )
}

export function SessionList({
  sessions,
  currentToken,
  impersonatorEmails,
}: {
  sessions: ActiveSession[]
  currentToken: string | null
  impersonatorEmails: Map<string, string>
}) {
  if (sessions.length === 1) {
    return (
      <p className="text-sm text-muted-foreground">
        Ini satu-satunya sesi aktif Anda.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((activeSession) => {
            const isCurrent = activeSession.token === currentToken
            const device = describeUserAgent(activeSession.userAgent)
            const impersonatorEmail = activeSession.impersonatedBy
              ? impersonatorEmails.get(activeSession.impersonatedBy)
              : undefined

            return (
              <TableRow key={activeSession.id}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">
                      {device ?? "Perangkat tidak dikenal"}
                    </span>
                    {isCurrent && (
                      <span className="text-xs text-muted-foreground">
                        Sesi ini
                      </span>
                    )}
                    {impersonatorEmail && (
                      <span className="text-xs text-muted-foreground">
                        Diimpersonasi oleh {impersonatorEmail}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {activeSession.ipAddress ?? "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatJoinedAt(activeSession.createdAt)}
                </TableCell>
                <TableCell>
                  {isCurrent ? (
                    <span className="text-sm text-muted-foreground">
                      Sesi aktif saat ini
                    </span>
                  ) : (
                    <RevokeButton sessionToken={activeSession.token} />
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
