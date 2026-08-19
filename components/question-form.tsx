"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  Award,
  CheckCircle2,
  FileText,
  HelpCircle,
  Layers,
  Loader2Icon,
  Plus,
  SaveIcon,
  Tag,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { QuestionCategoryCombobox } from "@/components/question-category-combobox"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"

const RichTextEditor = dynamic(
  () =>
    import("@/components/rich-text-editor/rich-text-editor").then(
      (module) => module.RichTextEditor
    ),
  { ssr: false }
)

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]

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

const TYPE_DESCRIPTIONS: Record<
  QuestionType,
  { desc: string; icon: typeof CheckCircle2 }
> = {
  single: {
    desc: "Satu jawaban benar dengan penilaian otomatis.",
    icon: CheckCircle2,
  },
  scored: {
    desc: "Setiap opsi memiliki bobot poin/nilai tersendiri.",
    icon: Award,
  },
  manual: {
    desc: "Jawaban esai bebas yang dinilai manual oleh penguji.",
    icon: FileText,
  },
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
  const [prompt, setPrompt] = useState<TipTapDoc | null>(
    initial?.content ?? null
  )
  const [categoryId, setCategoryId] = useState<string | null>(
    initial?.categoryId ?? null
  )
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

  function handleBack() {
    const fallbackUrl = `/dashboard/question-banks/${bankId}`

    if (typeof window !== "undefined" && window.history.length > 1) {
      const isSameOrigin =
        document.referrer &&
        new URL(document.referrer, window.location.origin).origin ===
          window.location.origin

      if (isSameOrigin) {
        router.back()
        return
      }
    }

    router.push(fallbackUrl)
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
      current.map((option) => {
        if (option.key === key) {
          return { ...option, ...patch }
        }
        if (type === "single" && patch.isCorrect === true) {
          return { ...option, isCorrect: false }
        }
        return option
      })
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
    const content: TipTapDoc = JSON.parse(
      JSON.stringify(prompt ?? EMPTY_PARAGRAPH)
    )

    const promptIssues = validateContent(PROMPT_POLICY, content).issues

    if (promptIssues.length > 0) {
      const msg = promptIssues[0]?.message ?? "Konten soal tidak valid."
      setError(msg)
      toast.error(msg)
      return
    }

    for (let index = 0; index < optionInputs.length; index += 1) {
      const optionIssues = validateContent(
        ANSWER_POLICY,
        optionInputs[index]!.content
      ).issues

      if (optionIssues.length > 0) {
        const msg = `Opsi ${index + 1}: ${optionIssues[0]?.message ?? "konten tidak valid."}`
        setError(msg)
        toast.error(msg)
        return
      }
    }

    const invariantIssues = validateQuestionInvariants(type, optionInputs)

    if (invariantIssues.length > 0) {
      const msg = invariantIssues[0]?.message ?? "Opsi jawaban tidak valid."
      setError(msg)
      toast.error(msg)
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
      const msg = result.message ?? "Gagal menyimpan soal."
      setError(msg)
      toast.error(msg)
      return
    }

    toast.success(
      isEdit ? "Soal berhasil diperbarui." : "Soal berhasil ditambahkan."
    )
    router.push(`/dashboard/question-banks/${bankId}`)
  }

  return (
    <div className="flex flex-col gap-8">
      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      {/* 1. Question Type Selection */}
      {!isEdit ? (
        <FieldGroup className="space-y-3">
          <div className="space-y-1">
            <FieldLabel
              htmlFor="question-type"
              className="text-base font-semibold"
            >
              Tipe Soal
            </FieldLabel>
            <FieldDescription>
              Tentukan format pertanyaan. Tipe soal terkunci permanen setelah
              soal dibuat.
            </FieldDescription>
          </div>

          <RadioGroup
            aria-label="Tipe soal"
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            id="question-type"
            onValueChange={(value) => handleTypeChange(value as QuestionType)}
            value={type}
          >
            {QUESTION_TYPES.map((option) => {
              const info = TYPE_DESCRIPTIONS[option]
              const Icon = info.icon
              const isSelected = type === option

              return (
                <Label
                  key={option}
                  htmlFor={`type-${option}`}
                  className={cn(
                    "flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all hover:bg-muted/40",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                      : "border-border bg-card"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {QUESTION_TYPE_LABELS[option]}
                      </span>
                    </div>

                    <RadioGroupItem
                      id={`type-${option}`}
                      value={option}
                      className="mt-1"
                    />
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {info.desc}
                  </p>
                </Label>
              )
            })}
          </RadioGroup>
        </FieldGroup>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3 text-sm">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {type === "single" ? (
              <CheckCircle2 className="size-4" />
            ) : type === "scored" ? (
              <Award className="size-4" />
            ) : (
              <FileText className="size-4" />
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Tipe Soal: </span>
            <strong className="text-foreground">
              {QUESTION_TYPE_LABELS[type]}
            </strong>
            <span className="block text-xs text-muted-foreground">
              (Tipe soal tidak dapat diubah setelah dibuat demi menjaga
              integritas data ujian)
            </span>
          </div>
        </div>
      )}

      {/* 2. Question Prompt Area with Tiptap Editor & Tabs Preview */}
      <FieldGroup className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="size-4 text-primary" />
            <FieldLabel
              htmlFor="question-prompt"
              className="text-base font-semibold"
            >
              Isi Pertanyaan Soal
            </FieldLabel>
          </div>
          <span className="text-xs text-muted-foreground">
            Mendukung teks kaya, rumus matematika (KaTeX), gambar, dan tabel
          </span>
        </div>

        <Field>
          <RichTextEditor
            initialContent={prompt}
            onChange={setPrompt}
            policy="prompt"
          />
        </Field>
      </FieldGroup>

      {/* 3. Category Selector */}
      <FieldGroup className="space-y-2">
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-primary" />
          <FieldLabel
            htmlFor="question-category"
            className="text-base font-semibold"
          >
            Kategori Soal
          </FieldLabel>
        </div>
        <Field>
          <QuestionCategoryCombobox
            categories={categories}
            onChange={setCategoryId}
            value={categoryId}
          />
          <FieldDescription>
            Pilih kategori untuk mempermudah filter dan pencarian butir soal.
          </FieldDescription>
        </Field>
      </FieldGroup>

      {/* 4. Answer Options (Single & Scored choices) */}
      {type !== "manual" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Opsi Pilihan Jawaban
                </h2>
                <p className="text-xs text-muted-foreground">
                  {type === "single"
                    ? "Tentukan minimal 2 opsi dan pilih 1 sebagai kunci jawaban yang benar."
                    : "Tentukan opsi dan atur bobot skor pada masing-masing pilihan jawaban."}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={addOption}
              className="gap-1.5"
            >
              <Plus aria-hidden="true" className="size-4" />
              <span>Tambah Opsi</span>
            </Button>
          </div>

          <div className="space-y-4">
            {options.map((option, index) => {
              const letter = OPTION_LETTERS[index] || `Opsi ${index + 1}`

              return (
                <div
                  className="space-y-3 rounded-2xl border bg-card p-4 shadow-2xs transition-all hover:border-border/80"
                  key={option.key}
                >
                  {/* Option Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className="px-2.5 py-0.5 text-xs font-bold tracking-wide"
                      >
                        Pilihan {letter}
                      </Badge>

                      {type === "single" ? (
                        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
                          <input
                            aria-label={`Opsi ${index + 1} adalah jawaban benar`}
                            checked={option.isCorrect}
                            className="size-4 accent-primary"
                            name="correct-option"
                            onChange={(event) =>
                              updateOption(option.key, {
                                isCorrect: event.target.checked,
                              })
                            }
                            type="radio"
                          />
                          <span
                            className={cn(
                              option.isCorrect && "font-semibold text-primary"
                            )}
                          >
                            {option.isCorrect
                              ? "✓ Kunci Jawaban Benar"
                              : "Tandai Sebagai Jawaban Benar"}
                          </span>
                        </label>
                      ) : null}

                      {type === "scored" ? (
                        <div className="flex items-center gap-2">
                          <Label
                            className="text-xs font-medium text-muted-foreground"
                            htmlFor={`score-${option.key}`}
                          >
                            Bobot Skor:
                          </Label>
                          <Input
                            aria-label={`Skor opsi ${index + 1}`}
                            className="h-7 w-20 text-xs tabular-nums"
                            id={`score-${option.key}`}
                            inputMode="decimal"
                            onChange={(event) =>
                              updateOption(option.key, {
                                score: event.target.value,
                              })
                            }
                            placeholder="0"
                            type="number"
                            value={option.score}
                          />
                        </div>
                      ) : null}
                    </div>

                    <Button
                      aria-label={`Hapus opsi ${index + 1}`}
                      className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={() => removeOption(option.key)}
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </div>

                  {/* Option TipTap Editor with Tabs */}
                  <RichTextEditor
                    initialContent={option.content}
                    onChange={(content) =>
                      updateOption(option.key, { content })
                    }
                    policy="answer"
                  />
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-2 size-8 text-muted-foreground/60" />
          <p className="font-medium text-foreground">
            Soal manual tidak memiliki opsi jawaban.
          </p>
          <p className="mt-1 text-xs">
            Peserta menjawab dengan teks bebas dan dinilai oleh admin.
          </p>
        </div>
      )}

      {/* 5. Footer Actions Bar */}
      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          className="gap-2"
        >
          <ArrowLeftIcon className="size-4" />
          <span>Kembali</span>
        </Button>

        <Button
          disabled={submitting}
          type="button"
          onClick={handleSubmit}
          className="gap-2"
        >
          {submitting ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              <span>Menyimpan Soal…</span>
            </>
          ) : (
            <>
              <SaveIcon className="size-4" />
              <span>{isEdit ? "Simpan Perubahan" : "Buat Soal"}</span>
            </>
          )}
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
