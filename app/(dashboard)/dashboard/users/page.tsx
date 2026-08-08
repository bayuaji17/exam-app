import Link from "next/link"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatJoinedAt, formatRoleLabel } from "@/lib/users/format"
import { listUsers } from "@/lib/users/queries"

const COLUMNS = ["Nama", "Email", "Role", "Bergabung", "Status", "Aksi"]

export default async function UsersPage() {
  const users = await listUsers()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Manajemen Peserta</h1>
        <p className="text-sm text-muted-foreground">
          {users.length} akun terdaftar.
        </p>
      </div>

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
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMNS.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Belum ada pengguna terdaftar.
                </TableCell>
              </TableRow>
            ) : (
              users.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>{account.email}</TableCell>
                  <TableCell>{formatRoleLabel(account.role)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatJoinedAt(account.createdAt)}
                  </TableCell>
                  <TableCell>
                    {account.banned ? (
                      <span className="text-destructive">
                        Diblokir
                        {account.banReason ? `: ${account.banReason}` : ""}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Aktif</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/users/${account.id}/edit`}
                      className="underline underline-offset-4 hover:no-underline"
                    >
                      Edit
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
