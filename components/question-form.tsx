"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"

import { QuestionCategoryCombobox } from "@/components/question-category-combobox"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  ANSWER_POLICY,
  PROMPT_POLICY,
  validateContent,
  type TipTapDoc,
} from "@/lib/content-policy"
import type { QuestionCategoryListItem } from "@/lib/question-banks/category-queries"
import {
  createQuestionAction,
  updateQuestionAction,
} from "@/lib/question-banks/question-actions"
import { QUESTION_TYPE_LABELS } from "@/lib/question-banks/format"
import {
  type QuestionType,
  QUESTION_TYPES,
  validateQuestionInvariants,
} from "@/lib/question-banks/question-validation"

const RichTextEditor = dynamic(
  () =>
    import("@/components/rich-text-editor/rich-text-editor").then(
      (module) => module.RichTextEditor
    ),
  { ssr: false }
)

interface OptionDraft {
  key: string
  content: TipTapDoc | null
  isCorrect: boolean
  score: string
}

export interface QuestionFormInitial {
  id: string
  type: QuestionType
  content: TipTapDoc
  categoryId: string | null
  options: Array<{
    content: TipTapDoc
    isCorrect: boolean | null
    score: string | null
  }>
}

const EMPTY_PARAGRAPH: TipTapDoc = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }],
}

function nextKey(): string {
  return Math.random().toString(36).slice(2)
}

export function QuestionForm({
  mode,
  bankId,
  categories,
  initial,
}: {
  mode: "create" | "edit"
  bankId: string
  categories: QuestionCategoryListItem[]
  initial?: QuestionFormInitial
}) {
  const router = useRouter()
  const isEdit = mode === "edit"

  const [type, setType] = useState<QuestionType>(initial?.type ?? "single")
  const [prompt, setPrompt] = useState<TipTapDoc | null>(initial?.content ?? null)
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null)
  const [options, setOptions] = useState<OptionDraft[]>(() =>
    initial
      ? initial.options.map((option) => ({
          key: nextKey(),
          content: option.content,
          isCorrect: option.isCorrect === true,
          score: option.score ?? "",
        }))
      : type === "manual"
        ? []
        : [emptyOption(), emptyOption()]
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const optionInputs = useMemo(
    () =>
      options.map((option) => ({
        content: option.content
          ? (JSON.parse(JSON.stringify(option.content)) as TipTapDoc)
          : EMPTY_PARAGRAPH,
        isCorrect: type === "single" ? option.isCorrect : undefined,
        score: type === "scored" ? parseScore(option.score) : undefined,
      })),
    [options, type]
  )

  function emptyOption(): OptionDraft {
    return { key: nextKey(), content: null, isCorrect: false, score: "" }
  }

  /**
   * Switching to manual drops the draft options (manual has none); switching
   * back restores the default two.
   */
  function handleTypeChange(nextType: QuestionType) {
    setType(nextType)
    setError(null)

    setOptions((current) => {
      if (nextType === "manual") {
        return []
      }

      if (current.length === 0) {
        return [emptyOption(), emptyOption()]
      }

      return current
    })
  }

  function updateOption(key: string, patch: Partial<OptionDraft>) {
    setOptions((current) =>
      current.map((option) => (option.key === key ? { ...option, ...patch } : option))
    )
  }

  function addOption() {
    setOptions((current) => [...current, emptyOption()])
  }

  function removeOption(key: string) {
    setOptions((current) => current.filter((option) => option.key !== key))
  }

  async function handleSubmit() {
    setError(null)

    // The editor's JSON is plain-looking but carries exotic prototypes that
    // React's server-action serialization mishandles; send a clean deep
    // clone so the server sees ordinary objects.
    const content: TipTapDoc = JSON.parse(JSON.stringify(prompt ?? EMPTY_PARAGRAPH))

    const promptIssues = validateContent(PROMPT_POLICY, content).issues

    if (promptIssues.length > 0) {
      setError(promptIssues[0]?.message ?? "Konten soal tidak valid.")
      return
    }

    for (let index = 0; index < optionInputs.length; index += 1) {
      const optionIssues = validateContent(ANSWER_POLICY, optionInputs[index]!.content).issues

      if (optionIssues.length > 0) {
        setError(`Opsi ${index + 1}: ${optionIssues[0]?.message ?? "konten tidak valid."}`)
        return
      }
    }

    const invariantIssues = validateQuestionInvariants(type, optionInputs)

    if (invariantIssues.length > 0) {
      setError(invariantIssues[0]?.message ?? "Opsi jawaban tidak valid.")
      return
    }

    setSubmitting(true)

    const result = isEdit
      ? await updateQuestionAction(initial!.id, {
          content,
          categoryId,
          options: optionInputs,
        })
      : await createQuestionAction({
          bankId,
          type,
          content,
          categoryId,
          options: optionInputs,
        })

    setSubmitting(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    router.push(`/dashboard/question-banks/${bankId}`)
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!isEdit ? (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="question-type">Tipe Soal</FieldLabel>
            <RadioGroup
              aria-label="Tipe soal"
              className="flex flex-col gap-2"
              id="question-type"
              onValueChange={(value) => handleTypeChange(value as QuestionType)}
              value={type}
            >
              {QUESTION_TYPES.map((option) => (
                <div className="flex items-center gap-2" key={option}>
                  <RadioGroupItem
                    id={`type-${option}`}
                    value={option}
                  />
                  <Label htmlFor={`type-${option}`}>{QUESTION_TYPE_LABELS[option]}</Label>
                </div>
              ))}
            </RadioGroup>
            <FieldDescription>
              Tipe soal tidak dapat diubah setelah soal dibuat. Untuk mengganti
              tipe, arsipkan soal ini dan buat soal baru.
            </FieldDescription>
          </Field>
        </FieldGroup>
      ) : (
        <p className="text-sm text-muted-foreground">
          Tipe soal: <span className="font-medium text-foreground">{QUESTION_TYPE_LABELS[type]}</span> —
          tipe tidak dapat diubah setelah soal dibuat.
        </p>
      )}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="question-prompt">Pertanyaan</FieldLabel>
          <RichTextEditor
            initialContent={prompt}
            onChange={setPrompt}
            policy="prompt"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="question-category">Kategori</FieldLabel>
          <QuestionCategoryCombobox
            categories={categories}
            onChange={setCategoryId}
            value={categoryId}
          />
        </Field>
      </FieldGroup>

      {type !== "manual" ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Opsi Jawaban</h2>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={addOption}
            >
              <Plus aria-hidden="true" className="size-4" />
              Tambah Opsi
            </Button>
          </div>

          {options.map((option, index) => (
            <div
              className="flex flex-col gap-3 rounded-lg border p-3"
              key={option.key}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Opsi {index + 1}</span>
                <Button
                  aria-label={`Hapus opsi ${index + 1}`}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                  onClick={() => removeOption(option.key)}
                >
                  <Trash2 aria-hidden="true" className="size-4 text-destructive" />
                </Button>
              </div>

              <RichTextEditor
                initialContent={option.content}
                onChange={(content) => updateOption(option.key, { content })}
                policy="answer"
              />

              {type === "single" ? (
                <label className="flex w-fit items-center gap-2 text-sm">
                  <input
                    aria-label={`Opsi ${index + 1} adalah jawaban benar`}
                    checked={option.isCorrect}
                    onChange={(event) =>
                      updateOption(option.key, { isCorrect: event.target.checked })
                    }
                    type="radio"
                    name="correct-option"
                  />
                  Jawaban benar
                </label>
              ) : null}

              {type === "scored" ? (
                <div className="flex w-fit items-center gap-2">
                  <label className="text-sm" htmlFor={`score-${option.key}`}>
                    Skor
                  </label>
                  <Input
                    aria-label={`Skor opsi ${index + 1}`}
                    className="w-24"
                    id={`score-${option.key}`}
                    inputMode="decimal"
                    onChange={(event) => updateOption(option.key, { score: event.target.value })}
                    placeholder="0"
                    type="number"
                    value={option.score}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Soal manual tidak memiliki opsi jawaban. Peserta menjawab dengan teks
          bebas dan dinilai oleh admin.
        </p>
      )}

      <div className="flex gap-3">
        <Button disabled={submitting} type="button" onClick={handleSubmit}>
          {isEdit ? "Simpan Perubahan" : "Buat Soal"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/dashboard/question-banks/${bankId}`)}
        >
          Batal
        </Button>
      </div>
    </div>
  )
}

function parseScore(value: string): number | undefined {
  if (value.trim() === "") {
    return undefined
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : undefined
}

