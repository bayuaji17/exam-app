"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { OptionRenderer } from "./question-renderer"
import type { AttemptQuestion, AttemptQuestionOption } from "@/lib/attempts/queries"

export type AnswerValue = { chosenOptionId: string | null } | { text: string }

/**
 * The answer controls for one question, by type:
 * - single / scored: a radio group over the options (correctness is hidden)
 * - manual: a plain-text textarea (rich text and media stay out of scope,
 *   ADR-0007)
 *
 * Uncontrolled-friendly: the parent passes the current value and an
 * onChange; the parent owns the save lifecycle.
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
      <Textarea
        aria-label="Jawaban esai"
        disabled={disabled}
        onChange={(event) => onChange({ text: event.target.value })}
        placeholder="Tulis jawaban Anda di sini…"
        rows={6}
        value={value != null && "text" in value ? value.text : ""}
      />
    )
  }

  const chosen = value != null && "chosenOptionId" in value ? value.chosenOptionId : null

  return (
    <RadioGroup
      aria-label="Pilih jawaban"
      disabled={disabled}
      onValueChange={(optionId) => onChange({ chosenOptionId: optionId })}
      value={chosen ?? ""}
    >
      {question.options.map((option) => (
        <OptionItem key={option.id} option={option} />
      ))}
    </RadioGroup>
  )
}

function OptionItem({ option }: { option: AttemptQuestionOption }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border px-3 py-2.5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
      <RadioGroupItem className="mt-1" value={option.id} />
      <OptionRenderer content={option.content} />
    </label>
  )
}
