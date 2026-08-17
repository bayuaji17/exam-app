"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeftIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ImageIcon,
  InfoIcon,
  Loader2Icon,
  SaveIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  createParticipantGroupAction,
  updateParticipantGroupAction,
} from "@/lib/participants/actions"
import {
  type ParticipantGroupFormValues,
  participantGroupSchema,
} from "@/lib/participants/validation"
import { cn } from "@/lib/utils"

export function ParticipantGroupForm({
  group,
}: {
  group?: { id: string; name: string; description: string | null }
}) {
  const router = useRouter()
  const isEdit = Boolean(group)

  const form = useForm<ParticipantGroupFormValues>({
    resolver: zodResolver(participantGroupSchema),
    defaultValues: {
      name: group?.name ?? "",
      description: group?.description ?? "",
    },
  })

  async function onSubmit(values: ParticipantGroupFormValues) {
    const result = isEdit
      ? await updateParticipantGroupAction(group!.id, values)
      : await createParticipantGroupAction(values)

    if (!result.ok) {
      const msg = result.message ?? "Aksi gagal."
      form.setError("root", { message: msg })
      toast.error(msg)
      return
    }

    toast.success(
      isEdit
        ? "Grup peserta berhasil diperbarui."
        : "Grup peserta berhasil dibuat."
    )
    // No router.refresh() after push(): refresh refetches the *current* page
    // and races the navigation, which can cancel it. A push already fetches a
    // fresh server payload for the destination, so it is all that is needed.
    router.push("/dashboard/user-groups")
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Column: Form Fields */}
        <div className="space-y-6 lg:col-span-7">
          <FieldGroup className="gap-6">
            {/* Nama Grup */}
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                    <UsersIcon className="size-4" />
                  </div>
                  <Field className="flex-1" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Nama Grup</FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      disabled={form.formState.isSubmitting}
                      id={field.name}
                      placeholder="cth. 12 IPA 1 / Angkatan 2026"
                      type="text"
                    />
                    <FieldDescription className="text-xs">
                      Masukkan nama grup atau kelas peserta (1–100 karakter).
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                </div>
              )}
            />

            {/* Foto / Banner Grup (Disabled Placeholder) */}
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary opacity-60 dark:bg-primary/20">
                <ImageIcon className="size-4" />
              </div>
              <Field className="flex-1" data-disabled>
                <div className="flex items-center justify-between">
                  <FieldLabel
                    htmlFor="group-image"
                    className="text-muted-foreground"
                  >
                    Foto / Banner Grup
                  </FieldLabel>
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-normal"
                  >
                    Segera Hadir
                  </Badge>
                </div>
                <Input
                  id="group-image"
                  type="file"
                  disabled
                  className="cursor-not-allowed opacity-60"
                  placeholder="Pilih file gambar grup"
                />
                <FieldDescription className="text-xs text-muted-foreground">
                  Fitur upload gambar/icon grup akan segera tersedia pada
                  pembaruan mendatang.
                </FieldDescription>
              </Field>
            </div>

            {/* Deskripsi */}
            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                    <FileTextIcon className="size-4" />
                  </div>
                  <Field className="flex-1" data-invalid={fieldState.invalid}>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor={field.name}>Deskripsi</FieldLabel>
                      <span
                        className={cn(
                          "text-xs text-muted-foreground tabular-nums",
                          (field.value?.length ?? 0) > 500 &&
                            "font-medium text-destructive"
                        )}
                      >
                        {field.value?.length ?? 0}/500
                      </span>
                    </div>
                    <Textarea
                      {...field}
                      aria-invalid={fieldState.invalid}
                      disabled={form.formState.isSubmitting}
                      id={field.name}
                      placeholder="Opsional — gambaran singkat mengenai grup peserta"
                      rows={4}
                    />
                    <FieldDescription className="text-xs">
                      Opsional — ringkasan atau keterangan grup (maksimal 500
                      karakter).
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                </div>
              )}
            />
          </FieldGroup>

          {form.formState.errors.root?.message && (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}
        </div>

        {/* Right Column: Informational Sidebar */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 dark:border-primary/20 dark:bg-primary/10">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
              <InfoIcon className="size-4" />
              <span>Informasi</span>
            </div>
            <div className="space-y-4 text-xs text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UsersIcon className="size-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Pengelompokan Peserta
                  </p>
                  <p className="mt-0.5 leading-relaxed">
                    Grup memudahkan pengaturan peserta ke dalam kelas, jurusan,
                    atau kelompok belajar secara terorganisir.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheckIcon className="size-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Akses Jadwal Ujian
                  </p>
                  <p className="mt-0.5 leading-relaxed">
                    Jadwal ujian dapat langsung ditugaskan ke satu atau beberapa
                    grup peserta sekaligus.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileSpreadsheetIcon className="size-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Integrasi Import Excel
                  </p>
                  <p className="mt-0.5 leading-relaxed">
                    Peserta dapat dimasukkan ke grup secara massal melalui file
                    Excel saat proses import peserta.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer: Action Bar */}
      <div className="mt-8 flex flex-col-reverse gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild type="button" variant="outline">
          <Link href="/dashboard/user-groups" className="gap-2">
            <ArrowLeftIcon className="size-4" />
            <span>Kembali ke Daftar Grup</span>
          </Link>
        </Button>

        <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
          <Button
            className="gap-2"
            disabled={form.formState.isSubmitting}
            type="submit"
          >
            {form.formState.isSubmitting ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SaveIcon className="size-4" />
            )}
            <span>
              {form.formState.isSubmitting
                ? "Menyimpan..."
                : isEdit
                  ? "Simpan Perubahan"
                  : "Buat Grup Peserta"}
            </span>
          </Button>
        </div>
      </div>
    </form>
  )
}
