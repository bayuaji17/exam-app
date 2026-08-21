"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  createExamPackageAction,
  updateExamPackageAction,
} from "@/lib/exam-packages/actions"
import {
  type ExamPackageFormValues,
  examPackageSchema,
} from "@/lib/exam-packages/validation"
import { checkUserIdentifierAction } from "@/lib/users/identifier-actions"
import { cn } from "@/lib/utils"

export function ExamPackageForm({
  pkg,
}: {
  pkg?: {
    id: string
    name: string
    kodePaket?: string
    slug?: string
    description: string | null
    durationMinutes: number | null
    shuffle: boolean
    passScore: string | null
    wrongPenalty: string | null
  }
}) {
  const router = useRouter()
  const isEdit = Boolean(pkg)
  const [kodePaketError, setKodePaketError] = useState<string | null>(null)

  const form = useForm<ExamPackageFormValues>({
    resolver: zodResolver(examPackageSchema),
    defaultValues: {
      name: pkg?.name ?? "",
      kodePaket: pkg?.kodePaket ?? "",
      description: pkg?.description ?? "",
      durationMinutes: pkg?.durationMinutes ?? undefined,
      shuffle: pkg?.shuffle ?? false,
      passScore: pkg?.passScore != null ? Number(pkg.passScore) : undefined,
      wrongPenalty:
        pkg?.wrongPenalty != null ? Number(pkg.wrongPenalty) : undefined,
    },
  })

  const descriptionValue =
    useWatch({ control: form.control, name: "description" }) ?? ""
  const shuffleValue =
    useWatch({ control: form.control, name: "shuffle" }) ?? false
  const kodePaketValue =
    useWatch({ control: form.control, name: "kodePaket" }) ?? ""

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!kodePaketValue || kodePaketValue.trim().length < 3) {
        setKodePaketError(null)
        return
      }

      try {
        const res = await checkUserIdentifierAction(
          "kodePaket",
          kodePaketValue.trim(),
          pkg?.id
        )
        if (res.ok && res.taken) {
          setKodePaketError("Kode paket sudah digunakan.")
        } else {
          setKodePaketError(null)
        }
      } catch {
        // Silent catch
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [kodePaketValue, pkg?.id])

  async function onSubmit(values: ExamPackageFormValues) {
    if (kodePaketError) {
      return
    }

    const result = isEdit
      ? await updateExamPackageAction(pkg!.id, values)
      : await createExamPackageAction(values)

    if (!result.ok) {
      form.setError("root", { message: result.message })

      return
    }

    router.push("/dashboard/exams")
  }

  return (
    <form
      className="flex max-w-lg flex-col gap-6"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <FieldGroup>
        <Field data-invalid={form.formState.errors.name?.message !== undefined}>
          <FieldLabel htmlFor="name">Nama Paket</FieldLabel>
          <Input
            aria-invalid={form.formState.errors.name?.message !== undefined}
            disabled={form.formState.isSubmitting}
            {...form.register("name")}
            id="name"
            placeholder="cth. Paket Ujian Semester Genap"
          />
          {form.formState.errors.name?.message ? (
            <FieldError errors={[form.formState.errors.name]} />
          ) : null}
        </Field>

        <Field
          data-invalid={
            form.formState.errors.kodePaket?.message !== undefined ||
            Boolean(kodePaketError)
          }
        >
          <FieldLabel htmlFor="kodePaket">Kode Paket</FieldLabel>
          <Input
            aria-invalid={
              form.formState.errors.kodePaket?.message !== undefined ||
              Boolean(kodePaketError)
            }
            disabled={form.formState.isSubmitting}
            {...form.register("kodePaket")}
            id="kodePaket"
            placeholder="cth. PKG-001 (3–20 karakter)"
          />
          <FieldDescription className="text-xs">
            Kode unik paket ujian untuk identifikasi dan nomor peserta (3–20 karakter).
          </FieldDescription>
          {kodePaketError ? (
            <p className="text-xs font-medium text-destructive">
              {kodePaketError}
            </p>
          ) : form.formState.errors.kodePaket?.message ? (
            <FieldError errors={[form.formState.errors.kodePaket]} />
          ) : null}
        </Field>

        <Field
          data-invalid={
            form.formState.errors.description?.message !== undefined
          }
        >
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="description">Deskripsi</FieldLabel>
            <span
              className={cn(
                "text-xs",
                descriptionValue.length > 500
                  ? "font-medium text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {descriptionValue.length}/500
            </span>
          </div>
          <Textarea
            aria-invalid={
              form.formState.errors.description?.message !== undefined
            }
            disabled={form.formState.isSubmitting}
            {...form.register("description")}
            id="description"
            placeholder="Deskripsi singkat paket ujian (opsional)"
            rows={3}
          />
          {form.formState.errors.description?.message ? (
            <FieldError errors={[form.formState.errors.description]} />
          ) : null}
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            data-invalid={
              form.formState.errors.passScore?.message !== undefined
            }
          >
            <FieldLabel htmlFor="passScore">Nilai Kelulusan</FieldLabel>
            <Input
              aria-invalid={
                form.formState.errors.passScore?.message !== undefined
              }
              disabled={form.formState.isSubmitting}
              id="passScore"
              inputMode="decimal"
              placeholder="cth. 75"
              step="0.01"
              type="number"
              {...form.register("passScore", { valueAsNumber: true })}
            />
            {form.formState.errors.passScore?.message ? (
              <FieldError errors={[form.formState.errors.passScore]} />
            ) : null}
          </Field>

          <Field
            data-invalid={
              form.formState.errors.durationMinutes?.message !== undefined
            }
          >
            <FieldLabel htmlFor="durationMinutes">
              Durasi Ujian (Menit)
            </FieldLabel>
            <Input
              aria-invalid={
                form.formState.errors.durationMinutes?.message !== undefined
              }
              disabled={form.formState.isSubmitting}
              id="durationMinutes"
              placeholder="Opsional"
              type="number"
              {...form.register("durationMinutes", { valueAsNumber: true })}
            />
            {form.formState.errors.durationMinutes?.message ? (
              <FieldError errors={[form.formState.errors.durationMinutes]} />
            ) : null}
          </Field>
        </div>

        <Field>
          <label
            className="flex w-fit items-center gap-2 text-sm"
            htmlFor="shuffle"
          >
            <Checkbox
              checked={shuffleValue}
              disabled={form.formState.isSubmitting}
              id="shuffle"
              onCheckedChange={(checked) =>
                form.setValue("shuffle", checked === true)
              }
            />
            Acak urutan soal
          </label>
          <FieldDescription>
            Urutan soal akan diacak saat ujian berjalan.
          </FieldDescription>
        </Field>

        <Field
          data-invalid={
            form.formState.errors.wrongPenalty?.message !== undefined
          }
        >
          <FieldLabel htmlFor="wrongPenalty">Penalti Jawaban Salah</FieldLabel>
          <Input
            aria-invalid={
              form.formState.errors.wrongPenalty?.message !== undefined
            }
            disabled={form.formState.isSubmitting}
            id="wrongPenalty"
            inputMode="decimal"
            placeholder="0 — tanpa penalti"
            step="0.01"
            type="number"
            {...form.register("wrongPenalty", { valueAsNumber: true })}
          />
          {form.formState.errors.wrongPenalty?.message ? (
            <FieldError errors={[form.formState.errors.wrongPenalty]} />
          ) : null}
        </Field>
      </FieldGroup>

      {form.formState.errors.root?.message ? (
        <p className="text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {isEdit ? "Simpan Perubahan" : "Buat Paket Ujian"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/exams")}
        >
          Batal
        </Button>
      </div>
    </form>
  )
}
