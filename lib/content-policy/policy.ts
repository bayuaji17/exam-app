

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
  "math",
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
 * Attribute rules per node. Any attribute not listed here is rejected, and a
 * listed rule that fails rejects the node.
 */
export const NODE_ATTR_RULES: Record<string, (attrs: Record<string, unknown>) => string | null> = {
  /** The media key shape from the storage spec (Q1): `staging/<uuid>.<ext>` or `media/<uuid>.webp`. */
  image: (attrs) => {
    if (typeof attrs.src !== "string" || !MEDIA_KEY_PATTERN.test(attrs.src)) {
      return "image.src must be a valid media key"
    }

    if (typeof attrs.alt !== "string") {
      return "image.alt must be a string"
    }

    return null
  },
  /** Validated by its LaTeX value, not merely by node name (Q10). */
  math: (attrs) => {
    if (typeof attrs.tex !== "string" || attrs.tex.length === 0) {
      return "math.tex must be a non-empty string"
    }

    return null
  },
  link: (attrs) => {
    if (typeof attrs.href !== "string" || attrs.href.length === 0) {
      return "link.href must be a non-empty string"
    }

    return null
  },
  heading: (attrs) => {
    const level = attrs.level

    if (level !== 1 && level !== 2 && level !== 3 && level !== 4 && level !== 5 && level !== 6) {
      return "heading.level must be 1-6"
    }

    return null
  },
  codeBlock: () => null,
  tableRow: () => null,
  tableHeaderCell: () => null,
  tableCell: () => null,
}

const MEDIA_KEY_PATTERN = /^(staging\/[0-9a-f-]{36}\.(png|jpeg|webp)|media\/[0-9a-f-]{36}\.webp)$/

export type ContentPolicy = {
  name: "prompt" | "answer"
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

export function isPolicyNode(policy: ContentPolicy, type: string): boolean {
  return policy.nodes.includes(type)
}

export function isPolicyMark(policy: ContentPolicy, type: string): boolean {
  return policy.marks.includes(type)
}

export function isKnownNodeType(type: string): boolean {
  return PROMPT_NODES.includes(type)
}
