/**
 * The single source of truth for what question content may contain.
 *
 * The editor schema, the save-time validator, and the render-time sanitizer
 * all derive from these definitions (ADR-0004), so they cannot silently
 * diverge. Prompts are curated-full; answers are restricted to text and
 * images (Q4).
 */

export const BLOCK_NODES = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "table",
  "tableRow",
  "tableHeader",
  "tableHeaderCell",
  "tableCell",
] as const

export const INLINE_MARKS = [
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "link",
] as const

export const PROMPT_NODES: readonly string[] = [
  ...BLOCK_NODES,
  "image",
  "inlineMath",
  "blockMath",
  "text",
]

export const PROMPT_MARKS: readonly string[] = [...INLINE_MARKS]

export const ANSWER_NODES: readonly string[] = ["paragraph", "image", "text"]

export const ANSWER_MARKS: readonly string[] = [
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
]

/**
 * The introduction policy: curated blocks (no tables) and inline marks
 * including links. No images, no math — rules text needs none of the media
 * pipeline.
 */
export const INTRODUCTION_NODES: readonly string[] = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "text",
]

export const INTRODUCTION_MARKS: readonly string[] = [...INLINE_MARKS]

/**
 * Attribute rules per node. Any attribute not listed here is rejected, and a
 * listed rule that fails rejects the node.
 */
export const NODE_ATTR_RULES: Record<
  string,
  (attrs: Record<string, unknown>) => string | null
> = {
  /** The media key shape from the storage spec (Q1): `staging/<uuid>.<ext>` or `media/<uuid>.webp`. */
  image: (attrs) => {
    if (typeof attrs.src !== "string" || !MEDIA_KEY_PATTERN.test(attrs.src)) {
      return "image.src must be a valid media key"
    }

    if (typeof attrs.alt !== "string") {
      return "image.alt must be a string"
    }

    if (
      attrs.width !== undefined &&
      typeof attrs.width !== "string" &&
      typeof attrs.width !== "number"
    ) {
      return "image.width must be a string or number"
    }

    if (
      attrs.alignment !== undefined &&
      attrs.alignment !== "left" &&
      attrs.alignment !== "center" &&
      attrs.alignment !== "right"
    ) {
      return "image.alignment must be left, center, or right"
    }

    return null
  },
  /** Validated by its LaTeX value, not merely by node name (Q10). TipTap v3's Mathematics registers inline and block math nodes, both storing the LaTeX in `attrs.latex`. */
  inlineMath: (attrs) => validateLatex(attrs),
  blockMath: (attrs) => validateLatex(attrs),
  link: (attrs) => {
    if (typeof attrs.href !== "string" || attrs.href.length === 0) {
      return "link.href must be a non-empty string"
    }

    return null
  },
  heading: (attrs) => {
    const level = attrs.level

    if (
      level !== 1 &&
      level !== 2 &&
      level !== 3 &&
      level !== 4 &&
      level !== 5 &&
      level !== 6
    ) {
      return "heading.level must be 1-6"
    }

    return null
  },
  codeBlock: () => null,
  table: () => null,
  tableRow: () => null,
  tableHeader: (attrs) => validateTableCellAttrs(attrs),
  tableHeaderCell: (attrs) => validateTableCellAttrs(attrs),
  tableCell: (attrs) => validateTableCellAttrs(attrs),
}

function validateTableCellAttrs(attrs: Record<string, unknown>): string | null {
  if (attrs.colspan !== undefined && typeof attrs.colspan !== "number") {
    return "table cell colspan must be a number"
  }
  if (attrs.rowspan !== undefined && typeof attrs.rowspan !== "number") {
    return "table cell rowspan must be a number"
  }
  if (
    attrs.colwidth !== undefined &&
    attrs.colwidth !== null &&
    !Array.isArray(attrs.colwidth)
  ) {
    return "table cell colwidth must be an array of numbers or null"
  }
  return null
}

const MEDIA_KEY_PATTERN =
  /^(staging\/[0-9a-f-]{36}\.(png|jpeg|webp)|media\/[0-9a-f-]{36}\.webp)$/

function validateLatex(attrs: Record<string, unknown>): string | null {
  if (typeof attrs.latex !== "string" || attrs.latex.length === 0) {
    return "math node attrs.latex must be a non-empty string"
  }

  return null
}

export type ContentPolicy = {
  name: "prompt" | "answer" | "introduction"
  nodes: readonly string[]
  marks: readonly string[]
}

export const PROMPT_POLICY: ContentPolicy = {
  name: "prompt",
  nodes: PROMPT_NODES,
  marks: PROMPT_MARKS,
}

export const ANSWER_POLICY: ContentPolicy = {
  name: "answer",
  nodes: ANSWER_NODES,
  marks: ANSWER_MARKS,
}

export const INTRODUCTION_POLICY: ContentPolicy = {
  name: "introduction",
  nodes: INTRODUCTION_NODES,
  marks: INTRODUCTION_MARKS,
}

export function isPolicyNode(policy: ContentPolicy, type: string): boolean {
  return policy.nodes.includes(type)
}

export function isPolicyMark(policy: ContentPolicy, type: string): boolean {
  return policy.marks.includes(type)
}

export function isKnownNodeType(type: string): boolean {
  return PROMPT_NODES.includes(type)
}
