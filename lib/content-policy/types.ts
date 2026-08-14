/**
 * The TipTap JSON shapes the content policy validates.
 *
 * Kept intentionally loose: the validator's job is to reject documents that
 * do not match the shape, so the input type must not narrow it.
 */
export interface TipTapMark {
  type: string
  attrs?: Record<string, unknown>
}

export interface TipTapNode {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: TipTapMark[]
  content?: TipTapNode[]
}

export interface TipTapDoc {
  type: "doc"
  content?: TipTapNode[]
}
