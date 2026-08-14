import { z } from "zod"

/**
 * Shared by the category forms and the server action's re-validation, so the
 * two cannot drift.
 */
export const questionCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama kategori wajib diisi.")
    .max(100, "Nama kategori maksimal 100 karakter."),
  description: z
    .string()
    .trim()
    .max(500, "Deskripsi maksimal 500 karakter.")
    .optional()
    .transform((value) => (value ? value : undefined)),
})

export type QuestionCategoryFormValues = z.input<typeof questionCategorySchema>
