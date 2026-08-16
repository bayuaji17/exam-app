"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createExamScheduleAction,
  updateExamScheduleAction,
} from "@/lib/exam-schedules/actions"
import {
  type ExamScheduleFormValues,
  examScheduleSchema,
} from "@/lib/exam-schedules/validation"
import type { ExamScheduleDetail } from "@/lib/exam-schedules/queries"

function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0")

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function ExamScheduleForm({
  schedule,
  packages,
}: {
  schedule?: ExamScheduleDetail
  packages: Array<{ id: string; name: string }>
}) {
  const router = useRouter()
  const isEdit = Boolean(schedule)

  const form = useForm<ExamScheduleFormValues>({
    resolver: zodResolver(examScheduleSchema),
    defaultValues: {
      name: schedule?.name ?? "",
      packageId: schedule?.packageId ?? "",
      startsAt: schedule ? toLocalInputValue(schedule.startsAt) : "",
      endsAt: schedule ? toLocalInputValue(schedule.endsAt) : "",
      durationMinutes: schedule?.durationMinutes ?? undefined,
      attemptLimit: schedule?.attemptLimit ?? undefined,
    },
  })

  async function onSubmit(values: ExamScheduleFormValues) {
    const result = isEdit
      ? await updateExamScheduleAction(schedule!.id, values)
      : await createExamScheduleAction(values)

    if (!result.ok) {
      form.setError("root", { message: result.message })

      return
    }

    router.push("/dashboard/exam-schedules")
  }

  return (
    <form
      className="flex max-w-lg flex-col gap-6"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <FieldGroup>
        <Field data-invalid={form.formState.errors.name?.message !== undefined}>
          <FieldLabel htmlFor="name">Nama Jadwal</FieldLabel>
          <Input
            aria-invalid={form.formState.errors.name?.message !== undefined}
            disabled={form.formState.isSubmitting}
            {...form.register("name")}
            id="name"
            placeholder="cth. UTS Matematika — Kelas A"
          />
          {form.formState.errors.name?.message ? (
            <FieldError errors={[form.formState.errors.name]} />
          ) : null}
        </Field>

        <Field
          data-invalid={form.formState.errors.packageId?.message !== undefined}
        >
          <FieldLabel htmlFor="packageId">Paket Ujian</FieldLabel>
          <Select
            onValueChange={(value) => form.setValue("packageId", value)}
            value={form.watch("packageId") || undefined}
          >
            <SelectTrigger
              aria-label="Pilih paket ujian"
              className="w-full"
              id="packageId"
            >
              <SelectValue placeholder="Pilih paket ujian" />
            </SelectTrigger>
            <SelectContent>
              {packages.map((pkg) => (
                <SelectItem key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.packageId?.message ? (
            <FieldError errors={[form.formState.errors.packageId]} />
          ) : null}
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            data-invalid={form.formState.errors.startsAt?.message !== undefined}
          >
            <FieldLabel htmlFor="startsAt">Mulai</FieldLabel>
            <Input
              aria-invalid={form.formState.errors.startsAt?.message !== undefined}
              disabled={form.formState.isSubmitting}
              {...form.register("startsAt")}
              id="startsAt"
              type="datetime-local"
            />
            {form.formState.errors.startsAt?.message ? (
              <FieldError errors={[form.formState.errors.startsAt]} />
            ) : null}
          </Field>

          <Field data-invalid={form.formState.errors.endsAt?.message !== undefined}>
            <FieldLabel htmlFor="endsAt">Selesai</FieldLabel>
            <Input
              aria-invalid={form.formState.errors.endsAt?.message !== undefined}
              disabled={form.formState.isSubmitting}
              {...form.register("endsAt")}
              id="endsAt"
              type="datetime-local"
            />
            {form.formState.errors.endsAt?.message ? (
              <FieldError errors={[form.formState.errors.endsAt]} />
            ) : null}
          </Field>
        </div>

        <Field
          data-invalid={form.formState.errors.durationMinutes?.message !== undefined}
        >
          <FieldLabel htmlFor="durationMinutes">
            Durasi (menit, opsional — mengikuti paket jika kosong)
          </FieldLabel>
          <Input
            aria-invalid={form.formState.errors.durationMinutes?.message !== undefined}
            disabled={form.formState.isSubmitting}
            id="durationMinutes"
            inputMode="numeric"
            type="number"
            {...form.register("durationMinutes", { valueAsNumber: true })}
          />
          {form.formState.errors.durationMinutes?.message ? (
            <FieldError errors={[form.formState.errors.durationMinutes]} />
          ) : null}
        </Field>

        <Field
          data-invalid={form.formState.errors.attemptLimit?.message !== undefined}
        >
          <FieldLabel htmlFor="attemptLimit">
            Batas Percobaan (0 atau kosong = tak terbatas)
          </FieldLabel>
          <Input
            aria-invalid={form.formState.errors.attemptLimit?.message !== undefined}
            disabled={form.formState.isSubmitting}
            id="attemptLimit"
            inputMode="numeric"
            type="number"
            {...form.register("attemptLimit", { valueAsNumber: true })}
          />
          {form.formState.errors.attemptLimit?.message ? (
            <FieldError errors={[form.formState.errors.attemptLimit]} />
          ) : null}
        </Field>

        {isEdit && schedule ? (
          <p className="text-sm text-muted-foreground">
            Introduction:{" "}
            {schedule.introduction ? (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                terisi
              </span>
            ) : (
              "teks default"
            )}{" "}
            —{" "}
            <Link
              className="underline underline-offset-4 hover:no-underline"
              href={`/dashboard/exam-introductions/${schedule.id}`}
            >
              Atur Introduction
            </Link>
          </p>
        ) : null}
      </FieldGroup>

      {form.formState.errors.root?.message ? (
        <p className="text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {isEdit ? "Simpan Perubahan" : "Buat Jadwal"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/exam-schedules")}
        >
          Batal
        </Button>
      </div>
    </form>
  )
}
