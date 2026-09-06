"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { OptionRenderer } from "./question-renderer"
import type {
  AttemptQuestion,
  AttemptQuestionOption,
} from "@/lib/attempts/queries"

export type AnswerValue = { chosenOptionId: string | null } | { text: string }

/**
 * The answer controls for one question, by type:
 * - single / scored: a stacked radio group with Option A, B, C labels matching CBT design
 * - manual: a plain-text textarea
 */
export function AnswerControls({
  question,
  value,
  onChange,
  disabled,
}: {
  question: AttemptQuestion
  value: AnswerValue | null
  onChange: (value: AnswerValue) => void
  disabled: boolean
}) {
  if (question.type === "manual") {
    return (
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase">
          Jawaban Anda
        </label>
        <Textarea
          aria-label="Jawaban esai"
          disabled={disabled}
          onChange={(event) => onChange({ text: event.target.value })}
          placeholder="Tulis jawaban esai Anda secara lengkap di sini…"
          rows={6}
          className="text-base leading-relaxed resize-y"
          value={value != null && "text" in value ? value.text : ""}
        />
      </div>
    )
  }

  const chosen =
    value != null && "chosenOptionId" in value ? value.chosenOptionId : null

  return (
    <RadioGroup
      aria-label="Pilih jawaban"
      disabled={disabled}
      onValueChange={(optionId) => onChange({ chosenOptionId: optionId })}
      value={chosen ?? ""}
      className="flex flex-col gap-3"
    >
      {question.options.map((option, index) => (
        <OptionItem key={option.id} option={option} index={index} />
      ))}
    </RadioGroup>
  )
}

function OptionItem({
  option,
  index,
}: {
  option: AttemptQuestionOption
  index: number
}) {
  const optionLetter = String.fromCharCode(65 + index)

  return (
    <label className="flex items-center gap-3.5 rounded-xl border bg-card p-3.5 sm:p-4 transition-colors cursor-pointer hover:bg-muted/30 has-[[data-state=checked]]:border-blue-600 has-[[data-state=checked]]:bg-blue-50/50 dark:has-[[data-state=checked]]:bg-blue-950/20 shadow-xs">
      <RadioGroupItem
        className="size-4.5 shrink-0 data-[state=checked]:border-blue-600 data-[state=checked]:text-blue-600"
        value={option.id}
      />
      <div className="flex items-baseline gap-2 text-sm text-foreground flex-1">
        <span className="font-semibold text-muted-foreground shrink-0 select-none">
          Option {optionLetter}:
        </span>
        <div className="flex-1">
          <OptionRenderer content={option.content} />
        </div>
      </div>
    </label>
  )
}
