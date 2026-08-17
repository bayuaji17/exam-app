"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Field,
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
  bank?: { id: string; name: string; description: string | null }
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

  async function onSubmit(values: QuestionBankFormValues) {
    const result = isEdit
      ? await updateQuestionBankAction(bank!.id, values)
      : await createQuestionBankAction(values)

    if (!result.ok) {
      form.setError("root", { message: result.message })

      return
    }

    // No router.refresh() after push(): refresh refetches the *current* page
    // and races the navigation, which can cancel it. A push already fetches a
    // fresh server payload for the destination, so it is all that is needed.
    router.push("/dashboard/question-banks")
  }

  return (
    <form
      className="flex max-w-lg flex-col gap-6"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <FieldGroup>
        <Field data-invalid={form.formState.errors.name?.message !== undefined}>
          <FieldLabel htmlFor="name">Nama Bank Soal</FieldLabel>
          <Input
            aria-invalid={form.formState.errors.name?.message !== undefined}
            disabled={form.formState.isSubmitting}
            {...form.register("name")}
            id="name"
            placeholder="cth. Bank Soal Matematika Wajib"
          />
          {form.formState.errors.name?.message ? (
            <FieldError errors={[form.formState.errors.name]} />
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
                "text-xs text-muted-foreground tabular-nums",
                descriptionValue.length > 2000 && "font-medium text-destructive"
              )}
            >
              {descriptionValue.length}/2000
            </span>
          </div>
          <Textarea
            aria-invalid={
              form.formState.errors.description?.message !== undefined
            }
            disabled={form.formState.isSubmitting}
            {...form.register("description")}
            id="description"
            placeholder="Opsional — gambaran singkat isi bank soal"
            rows={4}
          />
          {form.formState.errors.description?.message ? (
            <FieldError errors={[form.formState.errors.description]} />
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
          {isEdit ? "Simpan Perubahan" : "Buat Bank Soal"}
        </Button>
        <Button
          type="button"
          onClick={() => router.push("/dashboard/question-banks")}
          variant="outline"
        >
          Batal
        </Button>
      </div>
    </form>
  )
}
