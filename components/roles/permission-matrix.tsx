"use client"

import { CheckSquareIcon, SquareIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  type AppPermission,
  PERMISSION_DEFINITIONS,
  PERMISSION_MODULES,
  type PermissionDefinition,
  type PermissionModule,
} from "@/lib/auth/permissions-catalog"

export interface PermissionMatrixProps {
  selectedPermissions: string[]
  onChange: (permissions: string[]) => void
  disabled?: boolean
  readOnly?: boolean
}

const MODULE_LABELS: Record<PermissionModule, { title: string; description: string }> = {
  users: {
    title: "Manajemen Pengguna",
    description: "Pengelolaan akun pengguna, registrasi, impor massal, dan pemblokiran.",
  },
  user_groups: {
    title: "Grup & Rombel Peserta",
    description: "Pengelolaan rombongan belajar dan kelompok peserta ujian.",
  },
  roles: {
    title: "Peran & Hak Akses",
    description: "Pembuatan, konfigurasi izin, dan penugasan peran pengguna.",
  },
  question_banks: {
    title: "Bank Soal",
    description: "Pembuatan, pengelolaan butir soal, arsip, dan siklus hidup bank soal.",
  },
  question_categories: {
    title: "Kategori Soal",
    description: "Pengelompokan taksonomi dan topik materi soal ujian.",
  },
  exams: {
    title: "Paket Ujian",
    description: "Penyusunan paket ujian, pembobotan skor, dan penataan nomor soal.",
  },
  exam_schedules: {
    title: "Jadwal & Akses Ujian",
    description: "Penjadwalan sesi ujian, pembatasan durasi, dan aturan eligibility.",
  },
  grading: {
    title: "Penilaian Manual",
    description: "Pemeriksaan dan penilaian manual soal esai/uraian.",
  },
  results: {
    title: "Hasil & Nilai Ujian",
    description: "Akses rekapitulasi nilai dan lembar jawaban peserta.",
  },
  reports: {
    title: "Laporan & Ekspor",
    description: "Ekspor data nilai, analisis butir soal, dan laporan analitik.",
  },
  system: {
    title: "Sistem & Audit",
    description: "Konfigurasi sistem global dan log aktivitas audit trail.",
  },
}

export function PermissionMatrix({
  selectedPermissions,
  onChange,
  disabled = false,
  readOnly = false,
}: PermissionMatrixProps) {
  const isInteractive = !disabled && !readOnly

  // Group definitions by module
  const groupedDefinitions = PERMISSION_MODULES.reduce<
    Record<PermissionModule, PermissionDefinition[]>
  >((acc, mod) => {
    acc[mod] = PERMISSION_DEFINITIONS.filter((def) => def.module === mod)
    return acc
  }, {} as Record<PermissionModule, PermissionDefinition[]>)

  function handleTogglePermission(permissionName: AppPermission) {
    if (!isInteractive) return

    if (selectedPermissions.includes(permissionName)) {
      onChange(selectedPermissions.filter((p) => p !== permissionName))
    } else {
      onChange([...selectedPermissions, permissionName])
    }
  }

  function handleToggleModuleAll(mod: PermissionModule) {
    if (!isInteractive) return

    const modulePerms = groupedDefinitions[mod].map((d) => d.name)
    const allSelected = modulePerms.every((p) => selectedPermissions.includes(p))

    if (allSelected) {
      // Unselect all in module
      onChange(selectedPermissions.filter((p) => !modulePerms.includes(p as AppPermission)))
    } else {
      // Select all in module
      const combined = new Set([...selectedPermissions, ...modulePerms])
      onChange(Array.from(combined))
    }
  }

  function handleSelectAllGlobal() {
    if (!isInteractive) return
    const allPerms = PERMISSION_DEFINITIONS.map((d) => d.name)
    onChange(allPerms)
  }

  function handleDeselectAllGlobal() {
    if (!isInteractive) return
    onChange([])
  }

  return (
    <div className="space-y-6">
      {/* Global Toolbar */}
      {isInteractive && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 p-3 text-xs">
          <div className="text-muted-foreground">
            Terpilih: <strong className="text-foreground">{selectedPermissions.length}</strong> dari{" "}
            <strong className="text-foreground">{PERMISSION_DEFINITIONS.length}</strong> izin hak akses
          </div>
          <div className="flex items-center gap-2">
            <button
              className="font-medium text-primary hover:underline"
              onClick={handleSelectAllGlobal}
              type="button"
            >
              Pilih Semua Modul
            </button>
            <span className="text-muted-foreground">•</span>
            <button
              className="font-medium text-muted-foreground hover:text-foreground hover:underline"
              onClick={handleDeselectAllGlobal}
              type="button"
            >
              Hapus Pilihan
            </button>
          </div>
        </div>
      )}

      {/* Module Matrix Cards */}
      <div className="space-y-4">
        {PERMISSION_MODULES.map((mod) => {
          const definitions = groupedDefinitions[mod]
          if (definitions.length === 0) return null

          const modulePerms = definitions.map((d) => d.name)
          const selectedCount = modulePerms.filter((p) =>
            selectedPermissions.includes(p)
          ).length
          const isAllSelected = selectedCount === modulePerms.length
          const meta = MODULE_LABELS[mod]

          return (
            <div
              className="overflow-hidden rounded-2xl border bg-card shadow-xs transition-colors"
              key={mod}
            >
              {/* Module Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="font-semibold text-foreground text-sm">
                    {meta.title}
                  </div>
                  <Badge className="text-[11px]" variant="secondary">
                    {selectedCount} / {definitions.length}
                  </Badge>
                </div>

                {isInteractive && (
                  <button
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    onClick={() => handleToggleModuleAll(mod)}
                    type="button"
                  >
                    {isAllSelected ? (
                      <>
                        <SquareIcon className="size-3.5" />
                        <span>Batalkan Pilihan</span>
                      </>
                    ) : (
                      <>
                        <CheckSquareIcon className="size-3.5" />
                        <span>Pilih Semua di Modul Ini</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Module Permissions Grid */}
              <div className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-2">
                {definitions.map((def) => {
                  const isChecked = selectedPermissions.includes(def.name)

                  return (
                    <label
                      className={`flex cursor-pointer items-start gap-3 p-4 transition-colors hover:bg-muted/50 ${
                        isChecked ? "bg-primary/5 dark:bg-primary/10" : ""
                      } ${!isInteractive ? "cursor-not-allowed opacity-75" : ""}`}
                      key={def.name}
                    >
                      <Checkbox
                        checked={isChecked}
                        className="mt-0.5"
                        disabled={!isInteractive}
                        onCheckedChange={() => handleTogglePermission(def.name)}
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {def.label}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {def.action}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {def.description}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
