import { z } from "zod"

/**
 * Shared by the client form resolver and the server action's re-validation,
 * so the two cannot drift.
 */
export const questionBankSchema = z.object({
  name: z.string().trim().min(1, "Nama bank wajib diisi.").max(255, "Nama bank maksimal 255 karakter."),
  description: z
    .string()
    .trim()
    .max(2000, "Deskripsi maksimal 2000 karakter.")
    .optional()
    .transform((value) => (value ? value : undefined)),
})

/**
 * The form's value shape — the schema's input, not its output, so the
 * optional description stays optional for react-hook-form.
 */
export type QuestionBankFormValues = z.input<typeof questionBankSchema>
