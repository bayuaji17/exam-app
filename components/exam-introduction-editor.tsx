"use client"

import dynamic from "next/dynamic"

import type { TipTapDoc } from "@/lib/content-policy"

const RichTextEditor = dynamic(
  () =>
    import("@/components/rich-text-editor/rich-text-editor").then(
      (module) => module.RichTextEditor
    ),
  { ssr: false }
)

/**
 * The introduction editor: the rich-text editor locked to the introduction
 * policy (paragraphs, headings, lists, blockquote, code, inline marks,
 * links — no images or math).
 */
export function ExamIntroductionEditor({
  initialContent,
  onChange,
}: {
  initialContent?: TipTapDoc | null
  onChange?: (doc: TipTapDoc | null) => void
}) {
  return (
    <RichTextEditor
      initialContent={initialContent ?? null}
      onChange={onChange}
      policy="introduction"
    />
  )
}
