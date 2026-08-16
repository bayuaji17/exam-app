import {
  renderContentHtml,
  sanitizeIntroductionHtml,
  type TipTapDoc,
} from "@/lib/content-policy"
import { MathRenderer } from "./math-renderer"

/**
 * The read-only renderer for exam introductions: server-rendered HTML from
 * the canonical TipTap document, sanitized with the introduction policy.
 * Math never appears (the policy forbids it), but the shared math-aware
 * renderer keeps the pipeline uniform.
 */
export function IntroductionRenderer({
  content,
  className,
}: {
  content: Record<string, unknown>
  className?: string
}) {
  const html = renderContentHtml(content as unknown as TipTapDoc)

  return (
    <div className={className}>
      <MathRenderer html={sanitizeIntroductionHtml(html)} />
    </div>
  )
}
