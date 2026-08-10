import Link from "next/link"

import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { DataTableSortHeader } from "@/components/data-table/data-table-sort-header"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatJoinedAt, formatRoleLabel, ROLE_OPTIONS } from "@/lib/users/format"
import { listUsersPage } from "@/lib/users/queries"
import { parseTableParams, type TableParams } from "@/lib/users/table-params"

const BASE_PATH = "/dashboard/users"

const USERS_ROLE_OPTIONS = ROLE_OPTIONS

function UsersTable({
  result,
  params,
}: {
  result: Awaited<ReturnType<typeof listUsersPage>>
  params: TableParams
}) {
  const noMatches = result.total === 0 && Boolean(params.q || params.role || params.status)

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <DataTableSortHeader basePath={BASE_PATH} column="name" params={params}>
                Nama
              </DataTableSortHeader>
              <DataTableSortHeader basePath={BASE_PATH} column="email" params={params}>
                Email
              </DataTableSortHeader>
              <TableHead>Role</TableHead>
              <DataTableSortHeader
                basePath={BASE_PATH}
                column="createdAt"
                params={params}
              >
                Bergabung
              </DataTableSortHeader>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {noMatches
                    ? "Tidak ada hasil untuk filter ini."
                    : "Belum ada pengguna terdaftar."}
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((account) => (
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

      <DataTablePagination
        basePath={BASE_PATH}
        page={result.page}
        pageSize={result.pageSize}
        params={params}
        total={result.total}
        totalPages={result.totalPages}
      />
    </>
  )
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = parseTableParams(await searchParams)
  const result = await listUsersPage(params)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Manajemen Peserta</h1>
          <p className="text-sm text-muted-foreground">
            {result.total} akun terdaftar.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/users/create">Tambah Pengguna</Link>
        </Button>
      </div>

      <DataTableToolbar
        basePath={BASE_PATH}
        params={params}
        roleOptions={USERS_ROLE_OPTIONS}
      >
        <UsersTable params={params} result={result} />
      </DataTableToolbar>
    </div>
  )
}
