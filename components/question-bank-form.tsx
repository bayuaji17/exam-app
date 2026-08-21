"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeftIcon,
  FileTextIcon,
  HelpCircleIcon,
  ImageIcon,
  InfoIcon,
  LayersIcon,
  Loader2Icon,
  SaveIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
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
  createQuestionBankAction,
  updateQuestionBankAction,
} from "@/lib/question-banks/actions"
import {
  type QuestionBankFormValues,
  questionBankSchema,
} from "@/lib/question-banks/validation"
import { cn } from "@/lib/utils"

export function QuestionBankForm({
  bank,
}: {
  bank?: { id: string; name: string; slug?: string; description: string | null }
}) {
  const router = useRouter()
  const isEdit = Boolean(bank)

  const form = useForm<QuestionBankFormValues>({
    resolver: zodResolver(questionBankSchema),
    defaultValues: {
      name: bank?.name ?? "",
      description: bank?.description ?? "",
    },
  })

  const descriptionValue =
    useWatch({ control: form.control, name: "description" }) ?? ""

  function handleBack() {
    const fallbackUrl =
      isEdit && bank
        ? `/dashboard/question-banks/${bank.slug || bank.id}`
        : "/dashboard/question-banks"

    if (typeof window !== "undefined" && window.history.length > 1) {
      const isSameOrigin =
        document.referrer &&
        new URL(document.referrer, window.location.origin).origin ===
          window.location.origin

      if (isSameOrigin) {
        router.back()
        return
      }
    }

    router.push(fallbackUrl)
  }

  async function onSubmit(values: QuestionBankFormValues) {
    const result = isEdit
      ? await updateQuestionBankAction(bank!.id, values)
      : await createQuestionBankAction(values)

    if (!result.ok) {
      const msg = result.message ?? "Aksi gagal."
      form.setError("root", { message: msg })
      toast.error(msg)
      return
    }

    toast.success(
      isEdit ? "Bank soal berhasil diperbarui." : "Bank soal berhasil dibuat."
    )
    router.push("/dashboard/question-banks")
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Column: Form Fields */}
        <div className="space-y-6 lg:col-span-7">
          <FieldGroup className="gap-6">
            {/* Nama Bank Soal */}
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                    <LayersIcon className="size-4" />
                  </div>
                  <Field className="flex-1" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Nama Bank Soal</FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      disabled={form.formState.isSubmitting}
                      id={field.name}
                      placeholder="cth. Matematika Wajib - Kelas 12"
                    />
                    <FieldDescription>
                      Nama unik untuk mengidentifikasi kumpulan butir soal.
                    </FieldDescription>
                    {fieldState.error ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : null}
                  </Field>
                </div>
              )}
            />

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
                          descriptionValue.length > 2000 &&
                            "font-medium text-destructive"
                        )}
                      >
                        {descriptionValue.length}/2000
                      </span>
                    </div>
                    <Textarea
                      {...field}
                      aria-invalid={fieldState.invalid}
                      disabled={form.formState.isSubmitting}
                      id={field.name}
                      placeholder="Opsional — gambaran materi, kisi-kisi, atau peruntukan bank soal"
                      rows={4}
                      value={field.value ?? ""}
                    />
                    <FieldDescription>
                      Informasi tambahan mengenai materi atau peruntukan bank
                      soal.
                    </FieldDescription>
                    {fieldState.error ? (
                      <FieldError errors={[fieldState.error]} />
                    ) : null}
                  </Field>
                </div>
              )}
            />

            {/* Foto / Cover Bank Soal Placeholder */}
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <ImageIcon className="size-4" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Cover / Banner Bank Soal
                  </span>
                  <Badge variant="secondary" className="text-xs font-normal">
                    Segera Hadir
                  </Badge>
                </div>

                <div className="flex cursor-not-allowed flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/30 p-6 text-center text-muted-foreground opacity-60">
                  <ImageIcon className="size-8 stroke-[1.5]" />
                  <div className="space-y-1 text-xs">
                    <p className="font-medium text-foreground">
                      Kustomisasi Banner Bank Soal
                    </p>
                    <p>
                      Fitur unggah gambar sampul untuk mempercantik katalog bank
                      soal akan tersedia pada pembaruan mendatang.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </FieldGroup>

          {form.formState.errors.root?.message ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          ) : null}
        </div>

        {/* Right Column: Informational Card */}
        <div className="space-y-4 lg:col-span-5">
          <div className="space-y-4 rounded-2xl border bg-muted/40 p-5">
            <div className="flex items-center gap-2.5 text-foreground">
              <InfoIcon className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Panduan Bank Soal</h2>
            </div>

            <ul className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <li className="flex items-start gap-2">
                <HelpCircleIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">
                    Beragam Tipe Soal:
                  </strong>{" "}
                  Bank soal mendukung berbagai format butir pertanyaan mulai
                  dari pilihan ganda, berbasis skor, hingga esai (koreksi
                  manual).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <LayersIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">
                    Pengelompokan Kategori:
                  </strong>{" "}
                  Setiap butir soal dapat dikelompokkan ke dalam kategori untuk
                  mempermudah pencarian dan filter lintas bank.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">
                    Siklus & Keamanan:
                  </strong>{" "}
                  Bank soal yang diarsipkan tetap menyimpan seluruh riwayat
                  pengerjaan ujian peserta secara utuh.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Actions Bar */}
      <div className="mt-8 flex flex-col-reverse gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          className="gap-2"
        >
          <ArrowLeftIcon className="size-4" />
          <span>Kembali</span>
        </Button>

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="gap-2"
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              <span>Menyimpan…</span>
            </>
          ) : (
            <>
              <SaveIcon className="size-4" />
              <span>{isEdit ? "Simpan Perubahan" : "Buat Bank Soal"}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
