import { z } from "zod"

import { isAppPermission } from "@/lib/auth/permissions-catalog"

export const roleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama role minimal 2 karakter.")
    .max(100, "Nama role maksimal 100 karakter."),
  description: z
    .string()
    .trim()
    .max(300, "Deskripsi maksimal 300 karakter.")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  permissions: z
    .array(z.string().refine(isAppPermission, { message: "Izin tidak valid." }))
    .default([]),
})

export type RoleFormValues = z.infer<typeof roleFormSchema>
export type RoleFormInput = z.input<typeof roleFormSchema>
