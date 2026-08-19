import type { TipTapDoc, TipTapNode } from "./types"
/**
 * Render a validated TipTap document to an HTML string, server-side.
 *
 * Only called after `validateContent` has passed, so this renderer trusts the
 * node/mark set. The output must still go through the render-time sanitizer
 * (defense in depth, Q7) before `dangerouslySetInnerHTML`.
 *
 * Image srcs are media keys; the caller resolves them to public URLs with a
 * resolver function, keeping the stored document environment-portable.
 * Math nodes render as a placeholder span carrying the LaTeX; KaTeX
 * typesetting runs client-side.
 */
export interface RenderOptions {
  resolveImageSrc?: (key: string) => string
}

const VOID_NODES = new Set(["image"])

const BLOCK_TAGS: Record<string, string> = {
  paragraph: "p",
  heading: "h{level}",
  bulletList: "ul",
  orderedList: "ol",
  listItem: "li",
  blockquote: "blockquote",
  codeBlock: "pre",
  table: "table",
  tableRow: "tr",
  tableHeader: "th",
  tableHeaderCell: "th",
  tableCell: "td",
}

const MARK_TAGS: Record<string, string> = {
  bold: "strong",
  italic: "em",
  underline: "u",
  strike: "s",
  code: "code",
}

export function renderContentHtml(
  doc: TipTapDoc,
  options: RenderOptions = {}
): string {
  const parts: string[] = []

  for (const node of doc.content ?? []) {
    renderNode(node, parts, options)
  }

  return parts.join("")
}

function renderNode(
  node: TipTapNode,
  parts: string[],
  options: RenderOptions
): void {
  if (node.type === "text") {
    const text = escapeHtml(node.text ?? "")
    const wrapped = applyMarks(text, node.marks ?? [])
    parts.push(wrapped)
    return
  }

  if (node.type === "image") {
    const src =
      options.resolveImageSrc?.(String(node.attrs?.src)) ??
      String(node.attrs?.src)
    const alt = escapeHtml(String(node.attrs?.alt ?? ""))
    const width = node.attrs?.width ? String(node.attrs.width) : ""
    const alignment = node.attrs?.alignment ? String(node.attrs.alignment) : ""

    let style = ""
    if (width) {
      style += `width:${width};`
    }
    if (alignment === "center") {
      style += "margin-left:auto;margin-right:auto;display:block;"
    } else if (alignment === "right") {
      style += "margin-left:auto;margin-right:0;display:block;"
    } else if (alignment === "left") {
      style += "margin-right:auto;margin-left:0;display:block;"
    }

    const styleAttr = style ? ` style="${escapeHtml(style)}"` : ""
    const alignAttr = alignment ? ` data-align="${escapeHtml(alignment)}"` : ""
    parts.push(
      `<img src="${escapeHtml(src)}" alt="${alt}"${styleAttr}${alignAttr}>`
    )
    return
  }

  if (node.type === "inlineMath" || node.type === "blockMath") {
    const latex = escapeHtml(String(node.attrs?.latex ?? ""))
    const block = node.type === "blockMath" ? " math-block" : ""
    parts.push(`<span class="math-tex${block}" data-latex="${latex}"></span>`)
    return
  }

  if (node.type === "codeBlock") {
    const inner: string[] = []

    for (const child of node.content ?? []) {
      renderNode(child, inner, options)
    }

    parts.push(`<pre><code>${inner.join("")}</code></pre>`)
    return
  }

  const tag = BLOCK_TAGS[node.type]

  if (!tag) {
    return
  }

  const tagName = tag === "h{level}" ? `h${node.attrs?.level ?? 1}` : tag
  let extraAttrs = ""

  if (
    node.type === "tableCell" ||
    node.type === "tableHeader" ||
    node.type === "tableHeaderCell"
  ) {
    if (node.attrs?.colspan && Number(node.attrs.colspan) > 1) {
      extraAttrs += ` colspan="${node.attrs.colspan}"`
    }
    if (node.attrs?.rowspan && Number(node.attrs.rowspan) > 1) {
      extraAttrs += ` rowspan="${node.attrs.rowspan}"`
    }
    if (Array.isArray(node.attrs?.colwidth) && node.attrs.colwidth.length > 0) {
      const w = node.attrs.colwidth[0]
      if (typeof w === "number" && w > 0) {
        extraAttrs += ` style="width:${w}px;"`
      }
    }
  }

  const inner: string[] = []

  for (const child of node.content ?? []) {
    renderNode(child, inner, options)
  }

  const content = inner.join("")
  parts.push(
    VOID_NODES.has(node.type)
      ? `<${tagName}${extraAttrs}>`
      : `<${tagName}${extraAttrs}>${content}</${tagName}>`
  )
}

function applyMarks(text: string, marks: TipTapMark[]): string {
  let wrapped = text

  for (const mark of marks) {
    const tag = MARK_TAGS[mark.type]

    if (!tag) {
      continue
    }

    if (mark.type === "link") {
      const href = escapeHtml(String(mark.attrs?.href ?? "#"))
      wrapped = `<a href="${href}">${wrapped}</a>`
    } else {
      wrapped = `<${tag}>${wrapped}</${tag}>`
    }
  }

  return wrapped
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

interface TipTapMark {
  type: string
  attrs?: Record<string, unknown>
}
