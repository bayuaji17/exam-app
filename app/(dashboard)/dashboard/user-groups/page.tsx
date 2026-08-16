import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ParticipantGroupRowActions } from "@/components/participant-group-row-actions"
import { ParticipantGroupSearch } from "@/components/participant-group-search"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { DataTableSortHeader } from "@/components/data-table/data-table-sort-header"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { listParticipantGroupsPage } from "@/lib/participants/queries"
import {
  parseTableParams,
  type TableParams,
} from "@/lib/participants/table-params"

const BASE_PATH = "/dashboard/user-groups"

function formatDate(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function ParticipantGroupsTable({
  result,
  params,
}: {
  result: Awaited<ReturnType<typeof listParticipantGroupsPage>>
  params: TableParams
}) {
  const noMatches = result.total === 0 && Boolean(params.q)

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <DataTableSortHeader basePath={BASE_PATH} column="name" params={params}>
                Nama
              </DataTableSortHeader>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Anggota</TableHead>
              <DataTableSortHeader
                basePath={BASE_PATH}
                column="createdAt"
                params={params}
              >
                Dibuat
              </DataTableSortHeader>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {noMatches
                    ? "Tidak ada hasil untuk filter ini."
                    : "Belum ada grup peserta."}
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Link
                      className="underline underline-offset-4 hover:no-underline"
                      href={`${BASE_PATH}/${item.id}`}
                    >
                      {item.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {item.description || "—"}
                  </TableCell>
                  <TableCell>{item.memberCount}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(item.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Link
                        className="underline underline-offset-4 hover:no-underline"
                        href={`${BASE_PATH}/${item.id}/edit`}
                      >
                        Edit
                      </Link>
                      <ParticipantGroupRowActions groupId={item.id} />
                    </div>
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

export default async function ParticipantGroupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const params = parseTableParams(await searchParams)
  const result = await listParticipantGroupsPage(params)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Grup Peserta</h1>
          <p className="text-sm text-muted-foreground">
            {result.total} grup terdaftar.
          </p>
        </div>
        <Button asChild>
          <Link href={`${BASE_PATH}/new`}>Tambah Grup</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <ParticipantGroupSearch basePath={BASE_PATH} params={params} />
        <ParticipantGroupsTable params={params} result={result} />
      </div>
    </div>
  )
}
