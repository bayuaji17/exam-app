"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

const LOGIN_IDENTIFIER_ERROR = "Enter a valid email address or username."
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/
const emailSchema = z.email()

function isEmailIdentifier(identifier: string) {
  return identifier.includes("@")
}

function isValidUsername(identifier: string) {
  return (
    identifier.length >= 3 &&
    identifier.length <= 30 &&
    USERNAME_PATTERN.test(identifier)
  )
}

function isValidLoginIdentifier(identifier: string) {
  if (isEmailIdentifier(identifier)) {
    return emailSchema.safeParse(identifier).success
  }

  return isValidUsername(identifier)
}

const signInSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, LOGIN_IDENTIFIER_ERROR)
    .refine(isValidLoginIdentifier, LOGIN_IDENTIFIER_ERROR),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean(),
})

type SignInFormValues = z.infer<typeof signInSchema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      identifier: "",
      password: "",
      rememberMe: false,
    },
  })

  async function onSubmit(values: SignInFormValues) {
    const identifier = values.identifier.trim().toLowerCase()
    const { error } = isEmailIdentifier(identifier)
      ? await authClient.signIn.email({
          email: identifier,
          password: values.password,
          rememberMe: values.rememberMe,
        })
      : await authClient.signIn.username({
          username: identifier,
          password: values.password,
          rememberMe: values.rememberMe,
        })

    if (error) {
      const errorMessage = error.message || "Unable to sign in."
      form.setError("root", {
        message: errorMessage,
      })
      toast.error(errorMessage)

      return
    }

    toast.success("Signed in successfully.")
    router.push("/dashboard")
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-6 py-12 text-foreground">
      <section className="flex w-full max-w-md flex-col gap-8 rounded-lg border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl leading-tight font-semibold">
            Sign in to Exam App
          </h1>
          <p className="mt-4">Enter your account credentials to continue.</p>
        </header>

        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup>
            <Controller
              control={form.control}
              name="identifier"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Email or username
                  </FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    autoCapitalize="none"
                    autoComplete="username"
                    disabled={form.formState.isSubmitting}
                    id={field.name}
                    placeholder="name@example.com or username"
                    spellCheck={false}
                    type="text"
                    className="py-5 pl-6"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                  <div className="relative">
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      autoComplete="current-password"
                      className="py-5 pr-11 pl-6"
                      disabled={form.formState.isSubmitting}
                      placeholder="********"
                      id={field.name}
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Checkbox
                    aria-label="Remember me"
                    checked={field.value}
                    disabled={form.formState.isSubmitting}
                    id={field.name}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                  <FieldContent>
                    <FieldLabel htmlFor={field.name}>Remember me</FieldLabel>
                    <FieldDescription>
                      Keep this session active after closing the browser.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              )}
            />
          </FieldGroup>

          <Button
            disabled={form.formState.isSubmitting}
            type="submit"
            className="py-5"
          >
            {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <FieldDescription className="text-center">
          Need help signing in? Contact your administrator.
        </FieldDescription>
      </section>
    </main>
  )
}
