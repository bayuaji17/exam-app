"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi.")
    .max(100, "Nama maksimal 100 karakter."),
  username: z
    .string()
    .trim()
    .max(30, "Username maksimal 30 karakter.")
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine(
      (value) =>
        value === undefined ||
        (value.length >= 3 && /^[a-zA-Z0-9_.]+$/.test(value)),
      "Username harus 3–30 karakter (huruf, angka, garis bawah, titik)."
    ),
})

type ProfileFormValues = z.input<typeof profileSchema>

/**
 * Edit display name and username. Saving uses the auth client's updateUser
 * endpoint; validation mirrors the app's account rules.
 */
export function ProfileForm({
  name,
  username,
}: {
  name: string
  username: string | null
}) {
  const router = useRouter()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name,
      username: username ?? "",
    },
  })

  async function onSubmit(values: ProfileFormValues) {
    const result = await authClient.updateUser({
      name: values.name,
      username: values.username,
    })

    if (result.error) {
      form.setError("root", {
        message: result.error.message ?? "Gagal menyimpan profil.",
      })
      return
    }

    router.refresh()
  }

  return (
    <form
      className="flex max-w-lg flex-col gap-6"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <FieldGroup>
        <Field data-invalid={form.formState.errors.name?.message !== undefined}>
          <FieldLabel htmlFor="name">Nama</FieldLabel>
          <Input
            aria-invalid={form.formState.errors.name?.message !== undefined}
            disabled={form.formState.isSubmitting}
            {...form.register("name")}
            id="name"
          />
          {form.formState.errors.name?.message ? (
            <FieldError errors={[form.formState.errors.name]} />
          ) : null}
        </Field>

        <Field
          data-invalid={form.formState.errors.username?.message !== undefined}
        >
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            aria-invalid={form.formState.errors.username?.message !== undefined}
            disabled={form.formState.isSubmitting}
            {...form.register("username")}
            id="username"
            placeholder="Opsional — 3–30 karakter"
          />
          {form.formState.errors.username?.message ? (
            <FieldError errors={[form.formState.errors.username]} />
          ) : null}
        </Field>
      </FieldGroup>

      {form.formState.errors.root?.message ? (
        <p className="text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      ) : null}

      <div>
        <Button disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? "Menyimpan…" : "Simpan Profil"}
        </Button>
      </div>
    </form>
  )
}
