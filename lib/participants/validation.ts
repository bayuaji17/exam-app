import { z } from "zod"

/**
 * Shared by the group forms and the server action's re-validation, so the
 * two cannot drift.
 */
export const participantGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama grup wajib diisi.")
    .max(100, "Nama grup maksimal 100 karakter."),
  description: z
    .string()
    .trim()
    .max(500, "Deskripsi maksimal 500 karakter.")
    .optional()
    .transform((value) => (value ? value : undefined)),
})

export type ParticipantGroupFormValues = z.input<typeof participantGroupSchema>
