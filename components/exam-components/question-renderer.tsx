import {
  renderContentHtml,
  sanitizePromptHtml,
  sanitizeAnswerHtml,
  type TipTapDoc,
} from "@/lib/content-policy"
import { resolveMediaKey } from "@/lib/storage/urls"
import { MathRenderer } from "./math-renderer"

/**
 * The read-only renderer for question prompts: server-rendered HTML from the
 * canonical TipTap document, sanitized (prompt policy), with media keys
 * resolved to public URLs, and math typeset client-side.
 */
export function QuestionRenderer({
  content,
  className,
}: {
  content: Record<string, unknown>
  className?: string
}) {
  const html = renderContentHtml(content as unknown as TipTapDoc, {
    resolveImageSrc: (key) => resolveMediaKey(key),
  })

  return (
    <div className={className}>
      <MathRenderer html={sanitizePromptHtml(html)} />
    </div>
  )
}

/**
 * The read-only renderer for answer options: same pipeline, answer policy
 * (inline content and images only).
 */
export function OptionRenderer({
  content,
  className,
}: {
  content: Record<string, unknown>
  className?: string
}) {
  const html = renderContentHtml(content as unknown as TipTapDoc, {
    resolveImageSrc: (key) => resolveMediaKey(key),
  })

  return (
    <div className={className}>
      <MathRenderer html={sanitizeAnswerHtml(html)} />
    </div>
  )
}
