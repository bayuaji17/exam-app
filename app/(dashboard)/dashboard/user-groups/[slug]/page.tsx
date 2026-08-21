import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import {
  ArrowLeftIcon,
  CalendarIcon,
  Pencil,
  UserCheckIcon,
  UsersIcon,
} from "lucide-react"

import { ParticipantGroupMemberAdd } from "@/components/participant-group-member-add"
import { ParticipantGroupMemberRemove } from "@/components/participant-group-member-remove"
import { ParticipantGroupRowActions } from "@/components/participant-group-row-actions"
import { ParticipantGroupSearch } from "@/components/participant-group-search"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { DataTableSortHeader } from "@/components/data-table/data-table-sort-header"
import { Badge } from "@/components/ui/badge"
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
import { getParticipantGroupBySlug } from "@/lib/entity-slugs/resolvers"
import {
  listGroupCandidates,
  listGroupMembersPage,
} from "@/lib/participants/queries"
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

function MembersTable({
  result,
  params,
  groupId,
  groupSlug,
}: {
  result: Awaited<ReturnType<typeof listGroupMembersPage>>
  params: TableParams
  groupId: string
  groupSlug: string
}) {
  const noMatches = result.total === 0 && Boolean(params.q)

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <DataTableSortHeader
                basePath={`${BASE_PATH}/${groupSlug}`}
                column="name"
                params={params}
              >
                Nama
              </DataTableSortHeader>
              <TableHead>Email</TableHead>
              <DataTableSortHeader
                basePath={`${BASE_PATH}/${groupSlug}`}
                column="createdAt"
                params={params}
              >
                Bergabung
              </DataTableSortHeader>
              <TableHead className="w-[120px]">Aksi</TableHead>
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
                    ? "Tidak ada anggota yang cocok dengan pencarian."
                    : "Belum ada anggota di grup ini."}
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(member.createdAt)}
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
        basePath={`${BASE_PATH}/${groupSlug}`}
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
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const group = await getParticipantGroupBySlug(slug)

  if (!group) {
    notFound()
  }

  if (slug !== group.slug && slug === group.id) {
    redirect(`${BASE_PATH}/${group.slug}`)
  }

  const groupId = group.id
  const groupSlug = group.slug
  const [candidates, pageParams] = await Promise.all([
    listGroupCandidates(groupId),
    parseTableParams(await searchParams),
  ])

  const members = await listGroupMembersPage(groupId, pageParams)

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Hero Group Overview Card */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
              <UsersIcon className="size-7" />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {group.name}
                </h1>
                <Badge variant="secondary" className="gap-1.5 font-normal">
                  <UserCheckIcon className="size-3.5 text-primary" />
                  <span>{members.total} Anggota</span>
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarIcon className="size-3.5" />
                <span>Dibuat pada {formatDate(group.createdAt)}</span>
              </div>

              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {group.description || "Belum ada deskripsi untuk grup ini."}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <Button asChild variant="outline">
              <Link href={BASE_PATH} className="gap-2">
                <ArrowLeftIcon className="size-4" />
                <span>Kembali</span>
              </Link>
            </Button>
            <Button asChild>
              <Link href={`${BASE_PATH}/${groupSlug}/edit`} className="gap-2">
                <Pencil className="size-4" />
                <span>Edit Grup</span>
              </Link>
            </Button>
            <ParticipantGroupRowActions groupId={groupId} />
          </div>
        </div>
      </div>

      {/* 2. Group Members Management Section */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs">
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">
            Daftar Anggota Grup
          </h2>
          <p className="text-xs text-muted-foreground">
            Kelola peserta yang terdaftar di dalam grup ini.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-[60%]">
              <ParticipantGroupMemberAdd
                candidates={candidates}
                groupId={groupId}
              />
            </div>
            <div className="w-full sm:w-[40%]">
              <ParticipantGroupSearch
                basePath={`${BASE_PATH}/${groupSlug}`}
                params={pageParams}
              />
            </div>
          </div>

          <MembersTable
            groupId={groupId}
            groupSlug={groupSlug}
            params={pageParams}
            result={members}
          />
        </div>
      </div>
    </div>
  )
}
