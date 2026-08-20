"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
  InfoIcon,
  Loader2Icon,
  LockIcon,
  MailIcon,
  SaveIcon,
  ShieldCheckIcon,
  ShieldIcon,
  UserIcon,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
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
import { cn } from "@/lib/utils"

export function CreateUserForm({
  assignableRoles,
}: {
  assignableRoles: CreatableRole[]
}) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)

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
      const errorMessage = error.message || "Unable to create this user."
      form.setError("root", {
        message: errorMessage,
      })
      toast.error(errorMessage)

      return
    }

    toast.success("Pengguna berhasil dibuat.")
    // No router.refresh() after push(): refresh refetches the *current* page
    // and races the navigation, which can cancel it. A push already fetches a
    // fresh server payload for the destination, so it is all that is needed.
    router.push("/dashboard/users")
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Column: Form Fields */}
        <div className="space-y-6 lg:col-span-7">
          <FieldGroup className="gap-6">
            {/* Nama Lengkap */}
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                    <UserIcon className="size-4" />
                  </div>
                  <Field className="flex-1" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Nama Lengkap</FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      autoComplete="name"
                      disabled={form.formState.isSubmitting}
                      id={field.name}
                      placeholder="Budi Santoso"
                      type="text"
                    />
                    <FieldDescription className="text-xs">
                      Masukkan nama lengkap pengguna.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                </div>
              )}
            />

            {/* Email */}
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                    <MailIcon className="size-4" />
                  </div>
                  <Field className="flex-1" data-invalid={fieldState.invalid}>
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
                    <FieldDescription className="text-xs">
                      Email akan digunakan untuk login.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                </div>
              )}
            />

            {/* Kata Sandi */}
            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                    <LockIcon className="size-4" />
                  </div>
                  <Field className="flex-1" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Kata Sandi</FieldLabel>
                    <div className="relative">
                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        autoComplete="new-password"
                        className="pr-10"
                        disabled={form.formState.isSubmitting}
                        id={field.name}
                        placeholder="Minimal 8 karakter"
                        type={showPassword ? "text" : "password"}
                      />
                      <div className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center">
                        <Button
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          aria-pressed={showPassword}
                          className="text-muted-foreground transition-none hover:bg-transparent hover:text-foreground active:translate-y-0 active:not-aria-[haspopup]:translate-y-0"
                          disabled={form.formState.isSubmitting}
                          onClick={() => setShowPassword((current) => !current)}
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                        >
                          <span className="relative flex size-4 items-center justify-center">
                            <EyeIcon
                              className={cn(
                                "size-4 transition-all duration-200",
                                showPassword
                                  ? "pointer-events-none scale-0 rotate-45 opacity-0"
                                  : "scale-100 rotate-0 opacity-100"
                              )}
                            />
                            <EyeOffIcon
                              className={cn(
                                "absolute size-4 transition-all duration-200",
                                showPassword
                                  ? "scale-100 rotate-0 opacity-100"
                                  : "pointer-events-none scale-0 -rotate-45 opacity-0"
                              )}
                            />
                          </span>
                        </Button>
                      </div>
                    </div>
                    <FieldDescription className="text-xs">
                      Minimal 8 karakter dengan kombinasi huruf dan angka.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                </div>
              )}
            />

            {/* Role */}
            <Controller
              control={form.control}
              name="role"
              render={({ field, fieldState }) => (
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                    <ShieldIcon className="size-4" />
                  </div>
                  <Field className="flex-1" data-invalid={fieldState.invalid}>
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
                    <FieldDescription className="text-xs">
                      Tentukan role sesuai dengan kebutuhan akses pengguna.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                </div>
              )}
            />
          </FieldGroup>
        </div>

        {/* Right Column: Information Card */}
        <div className="self-stretch lg:col-span-5">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 dark:border-primary/20 dark:bg-primary/10">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <InfoIcon className="size-4 text-primary" />
              <span>Informasi</span>
            </div>

            <div className="mt-5 space-y-5">
              {/* Item 1: Akses Pengguna */}
              <div className="flex items-start gap-3.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary dark:bg-primary/30">
                  <UserIcon className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Akses Pengguna
                  </h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Role menentukan data dan fitur apa saja yang dapat diakses
                    oleh pengguna.
                  </p>
                </div>
              </div>

              {/* Item 2: Keamanan Akun */}
              <div className="flex items-start gap-3.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary dark:bg-primary/30">
                  <LockIcon className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Keamanan Akun
                  </h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Pastikan kata sandi kuat untuk menjaga keamanan akun.
                  </p>
                </div>
              </div>

              {/* Item 3: Import Banyak Peserta */}
              <div className="flex items-start gap-3.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary dark:bg-primary/30">
                  <ShieldCheckIcon className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Import Banyak Peserta
                  </h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Gunakan fitur import Excel untuk menambahkan banyak peserta
                    sekaligus dengan cepat.
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
          <Link href="/dashboard/users" className="gap-2">
            <ArrowLeftIcon className="size-4" />
            <span>Kembali ke Daftar Pengguna</span>
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
              {form.formState.isSubmitting ? "Menyimpan..." : "Simpan Pengguna"}
            </span>
          </Button>
        </div>
      </div>
    </form>
  )
}
