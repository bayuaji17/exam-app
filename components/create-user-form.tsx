"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"

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
import { authClient } from "@/lib/auth-client"
import {
  type CreatableRole,
  type CreateUserFormValues,
  createUserSchema,
} from "@/lib/users/create"
import { formatRoleLabel } from "@/lib/users/format"

export function CreateUserForm({
  assignableRoles,
}: {
  assignableRoles: CreatableRole[]
}) {
  const router = useRouter()
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: assignableRoles[0],
    },
  })

  async function onSubmit(values: CreateUserFormValues) {
    const { error } = await authClient.admin.createUser({
      name: values.name,
      email: values.email,
      password: values.password,
      role: values.role,
    })

    if (error) {
      form.setError("root", {
        message: error.message || "Unable to create this user.",
      })

      return
    }

    router.push("/dashboard/users")
    router.refresh()
  }

  return (
    <form
      className="flex max-w-lg flex-col gap-6"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <FieldGroup>
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Nama</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="name"
                disabled={form.formState.isSubmitting}
                id={field.name}
                placeholder="Budi Santoso"
                type="text"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                autoCapitalize="none"
                autoComplete="email"
                disabled={form.formState.isSubmitting}
                id={field.name}
                placeholder="nama@example.com"
                spellCheck={false}
                type="text"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Kata Sandi</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="new-password"
                disabled={form.formState.isSubmitting}
                id={field.name}
                placeholder="Minimal 8 karakter"
                type="password"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="role"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Role</FieldLabel>
              <Select
                disabled={form.formState.isSubmitting}
                onValueChange={field.onChange}
                value={field.value}
              >
                <SelectTrigger id={field.name} aria-label="Role">
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {formatRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      {form.formState.errors.root?.message && (
        <FieldError>{form.formState.errors.root.message}</FieldError>
      )}

      <Button
        className="self-start"
        disabled={form.formState.isSubmitting}
        type="submit"
      >
        {form.formState.isSubmitting ? "Menyimpan..." : "Simpan Pengguna"}
      </Button>
    </form>
  )
}
