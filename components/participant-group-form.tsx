"use client"

import { zodResolver } from "@hookform/resolvers/zod"
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
import { Textarea } from "@/components/ui/textarea"
import {
  createParticipantGroupAction,
  updateParticipantGroupAction,
} from "@/lib/participants/actions"
import {
  type ParticipantGroupFormValues,
  participantGroupSchema,
} from "@/lib/participants/validation"

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
      form.setError("root", { message: result.message })

      return
    }

    // No router.refresh() after push(): refresh refetches the *current* page
    // and races the navigation, which can cancel it. A push already fetches a
    // fresh server payload for the destination, so it is all that is needed.
    router.push("/dashboard/user-groups")
  }

  return (
    <form
      className="flex max-w-lg flex-col gap-6"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <FieldGroup>
        <Field data-invalid={form.formState.errors.name?.message !== undefined}>
          <FieldLabel htmlFor="name">Nama Grup</FieldLabel>
          <Input
            aria-invalid={form.formState.errors.name?.message !== undefined}
            disabled={form.formState.isSubmitting}
            {...form.register("name")}
            id="name"
            placeholder="cth. Kelas 12 IPA"
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
            placeholder="Opsional — gambaran singkat grup peserta"
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
          {isEdit ? "Simpan Perubahan" : "Buat Grup Peserta"}
        </Button>
        <Button
          type="button"
          onClick={() => router.push("/dashboard/user-groups")}
          variant="outline"
        >
          Batal
        </Button>
      </div>
    </form>
  )
}
