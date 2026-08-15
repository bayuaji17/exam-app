import { z } from "zod"

/**
 * Empty number inputs resolve to NaN via `valueAsNumber`; treat them as
 * absent instead of failing validation.
 */
const optionalNumber = z.preprocess(
  (value) => (typeof value === "number" && Number.isNaN(value) ? undefined : value),
  z.number().optional()
)

/**
 * Shared by the package forms and the server action's re-validation, so the
 * two cannot drift. Scoring semantics stay aligned with the future scoring
 * domain: non-negative numeric, same precision as question_option.score.
 */
export const examPackageSchema = z.object({
  name: z.string().trim().min(1, "Nama paket wajib diisi.").max(255, "Nama paket maksimal 255 karakter."),
  description: z
    .string()
    .trim()
    .max(2000, "Deskripsi maksimal 2000 karakter.")
    .optional()
    .transform((value) => (value ? value : undefined)),
  durationMinutes: optionalNumber.pipe(
    z
      .number()
      .int()
      .positive("Durasi harus lebih dari 0 menit.")
      .max(600, "Durasi maksimal 600 menit.")
      .optional()
  ),
  shuffle: z.boolean().default(false),
  passScore: optionalNumber.pipe(
    z
      .number()
      .finite()
      .min(0, "Nilai lulus tidak boleh negatif.")
      .max(1000, "Nilai lulus terlalu besar.")
      .optional()
  ),
  wrongPenalty: optionalNumber.pipe(
    z
      .number()
      .finite()
      .min(0, "Penalti tidak boleh negatif.")
      .max(1000, "Penalti terlalu besar.")
      .optional()
  ),
})

export type ExamPackageFormValues = z.input<typeof examPackageSchema>
