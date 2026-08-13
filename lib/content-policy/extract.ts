import type { TipTapDoc, TipTapNode } from "./types"

/**
 * Derive searchable plain text from a TipTap document.
 *
 * Covers prompt and answers (Q9): text nodes joined with spaces. Math content
 * is excluded (LaTeX is not searchable); link text is included because the
 * link's child text is a normal text node.
 */
export function extractPlainText(doc: TipTapDoc): string {
  const parts: string[] = []

  for (const node of doc.content ?? []) {
    collectText(node, parts)
  }

  return parts.join(" ").replace(/\s+/g, " ").trim()
}

function collectText(node: TipTapNode, parts: string[]): void {
  if (node.type === "math") {
    return
  }

  if (node.type === "text" && node.text) {
    parts.push(node.text)
    return
  }

  for (const child of node.content ?? []) {
    collectText(child, parts)
  }
}
