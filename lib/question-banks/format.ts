import type { QuestionType } from "./question-validation"

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: "Pilihan dengan jawaban benar",
  scored: "Berbasis skor",
  manual: "Penilaian manual",
}

export const QUESTION_TYPE_OPTIONS: Array<{
  value: QuestionType
  label: string
}> = [
  { value: "single", label: QUESTION_TYPE_LABELS.single },
  { value: "scored", label: QUESTION_TYPE_LABELS.scored },
  { value: "manual", label: QUESTION_TYPE_LABELS.manual },
]
