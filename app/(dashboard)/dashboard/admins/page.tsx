import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { DataTableSortHeader } from "@/components/data-table/data-table-sort-header"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import {
  DemoteAdminButton,
  PromoteAdminDialog,
} from "@/components/admin-roster"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { APP_ROLES } from "@/lib/auth-roles"
import { formatJoinedAt, formatRoleLabel, ROLE_OPTIONS } from "@/lib/users/format"
import { listAdminRosterPage, listPromotableUsers } from "@/lib/users/queries"
import { parseTableParams, type TableParams } from "@/lib/users/table-params"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const BASE_PATH = "/dashboard/admins"

const ROSTER_ROLE_OPTIONS = ROLE_OPTIONS.filter(
  (option) => option.value !== APP_ROLES.USER
)

function AdminRosterTable({
  params,
  result,
}: {
  params: TableParams
  result: Awaited<ReturnType<typeof listAdminRosterPage>>
}) {
  const noMatches = result.total === 0 && Boolean(params.q || params.role)

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
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {noMatches ? "Tidak ada hasil untuk filter ini." : "Belum ada admin."}
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
                    {account.role === APP_ROLES.SUPER_ADMIN ? (
                      <span className="text-sm text-muted-foreground">
                        Tidak dapat diturunkan
                      </span>
                    ) : (
                      <DemoteAdminButton account={account} />
                    )}
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

export default async function AdminsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = parseTableParams(await searchParams)
  const [result, promotable] = await Promise.all([
    listAdminRosterPage(params),
    listPromotableUsers(),
  ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Manajemen Admin</h1>
          <p className="text-sm text-muted-foreground">
            {result.total} akun dengan hak admin.
          </p>
        </div>
        <PromoteAdminDialog candidates={promotable} />
      </div>

      <DataTableToolbar
        basePath={BASE_PATH}
        params={params}
        roleOptions={ROSTER_ROLE_OPTIONS}
        showStatus={false}
      >
        <AdminRosterTable params={params} result={result} />
      </DataTableToolbar>
    </div>
  )
}
