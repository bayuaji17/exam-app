"use client"

import {
  Edit3Icon,
  KeyIcon,
  LockIcon,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { RoleListItem } from "@/lib/auth/rbac-queries"
import { DeleteRoleDialog } from "./delete-role-dialog"

export interface RolesTableProps {
  roles: RoleListItem[]
}

export function RolesTable({ roles }: RolesTableProps) {
  const [search, setSearch] = useState("")
  const [selectedRoleForDelete, setSelectedRoleForDelete] = useState<RoleListItem | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const filteredRoles = roles.filter((role) => {
    const query = search.toLowerCase().trim()
    if (!query) return true
    return (
      role.name.toLowerCase().includes(query) ||
      role.slug.toLowerCase().includes(query) ||
      (role.description && role.description.toLowerCase().includes(query))
    )
  })

  function handleDeleteClick(role: RoleListItem) {
    setSelectedRoleForDelete(role)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama peran atau deskripsi..."
            value={search}
          />
        </div>

        <Button asChild className="gap-2">
          <Link href="/dashboard/roles/new">
            <PlusIcon className="size-4" />
            <span>Tambah Peran Baru</span>
          </Link>
        </Button>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[300px] font-semibold">Nama Peran</TableHead>
              <TableHead className="font-semibold">Tipe</TableHead>
              <TableHead className="font-semibold">Jumlah Hak Akses</TableHead>
              <TableHead className="font-semibold">Pengguna</TableHead>
              <TableHead className="text-right font-semibold">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoles.length === 0 ? (
              <TableRow>
                <TableCell className="h-32 text-center text-muted-foreground" colSpan={5}>
                  Tidak ada peran yang cocok dengan pencarian Anda.
                </TableCell>
              </TableRow>
            ) : (
              filteredRoles.map((role) => {
                const isSuperAdmin = role.slug === "super-admin"

                return (
                  <TableRow key={role.id}>
                    {/* Role Name, Slug, Description */}
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">
                            {role.name}
                          </span>
                          {role.isDefault && (
                            <Badge className="text-[10px]" variant="outline">
                              Default
                            </Badge>
                          )}
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {role.slug}
                        </span>
                        {role.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {role.description}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Type Badge */}
                    <TableCell className="align-top">
                      {role.isSystem ? (
                        <Badge className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400" variant="outline">
                          <LockIcon className="size-3" />
                          <span>Sistem</span>
                        </Badge>
                      ) : (
                        <Badge className="gap-1 bg-primary/10 text-primary dark:bg-primary/20" variant="outline">
                          <ShieldIcon className="size-3" />
                          <span>Kustom</span>
                        </Badge>
                      )}
                    </TableCell>

                    {/* Permissions Count */}
                    <TableCell className="align-top">
                      {isSuperAdmin ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" variant="secondary">
                          Wildcard (*) Semua Akses
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <KeyIcon className="size-3.5" />
                          <span>{role.permissionsCount} izin</span>
                        </div>
                      )}
                    </TableCell>

                    {/* Users Count */}
                    <TableCell className="align-top">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <UsersIcon className="size-3.5" />
                        <span>{role.userCount} pengguna</span>
                      </div>
                    </TableCell>

                    {/* Action Buttons */}
                    <TableCell className="text-right align-top">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/dashboard/roles/${role.id}/edit`}>
                            <Edit3Icon className="size-4" />
                            <span className="sr-only">Ubah {role.name}</span>
                          </Link>
                        </Button>
                        {!role.isSystem && (
                          <Button
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDeleteClick(role)}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2Icon className="size-4" />
                            <span className="sr-only">Hapus {role.name}</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DeleteRoleDialog
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
        role={selectedRoleForDelete}
      />
    </div>
  )
}
