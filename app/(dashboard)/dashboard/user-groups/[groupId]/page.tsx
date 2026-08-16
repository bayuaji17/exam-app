import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { ParticipantGroupMemberAdd } from "@/components/participant-group-member-add"
import { ParticipantGroupMemberRemove } from "@/components/participant-group-member-remove"
import { ParticipantGroupRowActions } from "@/components/participant-group-row-actions"
import { ParticipantGroupSearch } from "@/components/participant-group-search"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { DataTableSortHeader } from "@/components/data-table/data-table-sort-header"
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
import {
  getParticipantGroupById,
  listGroupCandidates,
  listGroupMembersPage,
} from "@/lib/participants/queries"
import {
  parseTableParams,
  type TableParams,
} from "@/lib/participants/table-params"

const BASE_PATH = "/dashboard/user-groups"

function MembersTable({
  result,
  params,
  groupId,
}: {
  result: Awaited<ReturnType<typeof listGroupMembersPage>>
  params: TableParams
  groupId: string
}) {
  const noMatches = result.total === 0 && Boolean(params.q)

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <DataTableSortHeader
                basePath={`${BASE_PATH}/${groupId}`}
                column="name"
                params={params}
              >
                Nama
              </DataTableSortHeader>
              <TableHead>Email</TableHead>
              <DataTableSortHeader
                basePath={`${BASE_PATH}/${groupId}`}
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
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {noMatches
                    ? "Tidak ada anggota yang cocok."
                    : "Belum ada anggota di grup ini."}
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {member.createdAt.toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <ParticipantGroupMemberRemove
                      groupId={groupId}
                      name={member.name}
                      userId={member.userId}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        basePath={`${BASE_PATH}/${groupId}`}
        page={result.page}
        pageSize={result.pageSize}
        params={params}
        total={result.total}
        totalPages={result.totalPages}
      />
    </>
  )
}

export default async function ParticipantGroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { groupId } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const [group, candidates, pageParams] = await Promise.all([
    getParticipantGroupById(groupId),
    listGroupCandidates(groupId),
    parseTableParams(await searchParams),
  ])

  if (!group) {
    notFound()
  }

  const members = await listGroupMembersPage(groupId, pageParams)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            href={BASE_PATH}
          >
            ← Kembali ke Grup Peserta
          </Link>
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <p className="text-sm text-muted-foreground">
            {group.description || "Tanpa deskripsi"} · {members.total} anggota
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            className="underline underline-offset-4 hover:no-underline"
            href={`${BASE_PATH}/${groupId}/edit`}
          >
            Edit
          </Link>
          <ParticipantGroupRowActions groupId={groupId} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <ParticipantGroupMemberAdd candidates={candidates} groupId={groupId} />
        <ParticipantGroupSearch basePath={`${BASE_PATH}/${groupId}`} params={pageParams} />
        <MembersTable groupId={groupId} params={pageParams} result={members} />
      </div>
    </div>
  )
}
