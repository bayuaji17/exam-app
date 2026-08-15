"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

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

export function ExamPackageForm({
  pkg,
}: {
  pkg?: {
    id: string
    name: string
    description: string | null
    durationMinutes: number | null
    shuffle: boolean
    passScore: string | null
    wrongPenalty: string | null
  }
}) {
  const router = useRouter()
  const isEdit = Boolean(pkg)

  const form = useForm<ExamPackageFormValues>({
    resolver: zodResolver(examPackageSchema),
    defaultValues: {
      name: pkg?.name ?? "",
      description: pkg?.description ?? "",
      durationMinutes: pkg?.durationMinutes ?? undefined,
      shuffle: pkg?.shuffle ?? false,
      passScore: pkg?.passScore != null ? Number(pkg.passScore) : undefined,
      wrongPenalty: pkg?.wrongPenalty != null ? Number(pkg.wrongPenalty) : undefined,
    },
  })

  async function onSubmit(values: ExamPackageFormValues) {
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
            placeholder="cth. Ujian Tengah Semester Matematika"
          />
          {form.formState.errors.name?.message ? (
            <FieldError errors={[form.formState.errors.name]} />
          ) : null}
        </Field>

        <Field
          data-invalid={form.formState.errors.description?.message !== undefined}
        >
          <FieldLabel htmlFor="description">Deskripsi</FieldLabel>
          <Textarea
            aria-invalid={form.formState.errors.description?.message !== undefined}
            disabled={form.formState.isSubmitting}
            {...form.register("description")}
            id="description"
            placeholder="Opsional"
            rows={3}
          />
          {form.formState.errors.description?.message ? (
            <FieldError errors={[form.formState.errors.description]} />
          ) : null}
        </Field>

        <Field
          data-invalid={form.formState.errors.durationMinutes?.message !== undefined}
        >
          <FieldLabel htmlFor="durationMinutes">Durasi (menit)</FieldLabel>
          <Input
            aria-invalid={form.formState.errors.durationMinutes?.message !== undefined}
            disabled={form.formState.isSubmitting}
            id="durationMinutes"
            inputMode="numeric"
            placeholder="Opsional"
            type="number"
            {...form.register("durationMinutes", { valueAsNumber: true })}
          />
          {form.formState.errors.durationMinutes?.message ? (
            <FieldError errors={[form.formState.errors.durationMinutes]} />
          ) : null}
        </Field>

        <Field>
          <label className="flex w-fit items-center gap-2 text-sm" htmlFor="shuffle">
            <Checkbox
              checked={form.watch("shuffle")}
              disabled={form.formState.isSubmitting}
              id="shuffle"
              onCheckedChange={(checked) => form.setValue("shuffle", checked === true)}
            />
            Acak urutan soal
          </label>
          <FieldDescription>
            Urutan soal akan diacak saat ujian berjalan.
          </FieldDescription>
        </Field>

        <Field data-invalid={form.formState.errors.wrongPenalty?.message !== undefined}>
          <FieldLabel htmlFor="wrongPenalty">Penalti Jawaban Salah</FieldLabel>
          <Input
            aria-invalid={form.formState.errors.wrongPenalty?.message !== undefined}
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

        <Field data-invalid={form.formState.errors.passScore?.message !== undefined}>
          <FieldLabel htmlFor="passScore">Nilai Lulus</FieldLabel>
          <Input
            aria-invalid={form.formState.errors.passScore?.message !== undefined}
            disabled={form.formState.isSubmitting}
            id="passScore"
            inputMode="decimal"
            placeholder="Opsional"
            step="0.01"
            type="number"
            {...form.register("passScore", { valueAsNumber: true })}
          />
          {form.formState.errors.passScore?.message ? (
            <FieldError errors={[form.formState.errors.passScore]} />
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
