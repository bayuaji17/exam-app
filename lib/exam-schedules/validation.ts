import { z } from "zod"

/**
 * Empty number inputs resolve to NaN via `valueAsNumber`; treat them as
 * absent instead of failing validation.
 */
const optionalPositiveInt = z.preprocess(
  (value) => (typeof value === "number" && Number.isNaN(value) ? undefined : value),
  z
    .number()
    .int()
    .positive("Durasi harus lebih dari 0 menit.")
    .max(600, "Durasi maksimal 600 menit.")
    .optional()
)

/**
 * Shared by the schedule forms and the server action's re-validation.
 */
export const examScheduleSchema = z.object({
  name: z.string().trim().min(1, "Nama jadwal wajib diisi.").max(255, "Nama jadwal maksimal 255 karakter."),
  packageId: z.string().min(1, "Pilih paket ujian."),
  startsAt: z
    .string()
    .min(1, "Waktu mulai wajib diisi.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Waktu mulai tidak valid."),
  endsAt: z
    .string()
    .min(1, "Waktu selesai wajib diisi.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Waktu selesai tidak valid."),
  durationMinutes: optionalPositiveInt,
})

/**
 * The window invariant: start before end. Applied on the parsed values.
 */
export function validateScheduleWindow(
  startsAt: string,
  endsAt: string
): string | null {
  if (Date.parse(endsAt) <= Date.parse(startsAt)) {
    return "Waktu selesai harus setelah waktu mulai."
  }

  return null
}

export type ExamScheduleFormValues = z.input<typeof examScheduleSchema>
