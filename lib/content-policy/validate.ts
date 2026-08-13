import {
  type ContentPolicy,
  isPolicyMark,
  isPolicyNode,
  NODE_ATTR_RULES,
} from "./policy"
import type { TipTapDoc, TipTapNode } from "./types"

export interface ContentIssue {
  /** A JSON-pointer-like path, e.g. `content[1].content[0].marks[0]`. */
  path: string
  message: string
}

export interface ContentValidationResult {
  ok: boolean
  issues: ContentIssue[]
}

/**
 * Validate a TipTap document against a content policy.
 *
 * Reject-not-strip (Q7): a document with any disallowed node, mark, or
 * attribute is rejected as a whole, never silently altered. The editor
 * schema, this validator, and the render-time sanitizer all derive from the
 * same policy definitions, so what the editor offers and what the server
 * accepts cannot drift.
 */
export function validateContent(
  policy: ContentPolicy,
  doc: TipTapDoc
): ContentValidationResult {
  const issues: ContentIssue[] = []

  if (doc.type !== "doc") {
    return { ok: false, issues: [{ path: "", message: "root must be a doc node" }] }
  }

  const content = doc.content ?? []

  if (content.length === 0) {
    return { ok: false, issues: [{ path: "content", message: "content must not be empty" }] }
  }

  for (let index = 0; index < content.length; index += 1) {
    validateNode(policy, content[index], `content[${index}]`, issues)
  }

  return { ok: issues.length === 0, issues }
}

function validateNode(
  policy: ContentPolicy,
  node: TipTapNode,
  path: string,
  issues: ContentIssue[]
): void {
  if (!isPolicyNode(policy, node.type)) {
    issues.push({ path, message: `node "${node.type}" is not allowed` })
    return
  }

  if (node.marks) {
    for (let index = 0; index < node.marks.length; index += 1) {
      const mark = node.marks[index]

      if (!isPolicyMark(policy, mark.type)) {
        issues.push({ path: `${path}.marks[${index}]`, message: `mark "${mark.type}" is not allowed` })
      }
    }
  }

  const attrRule = NODE_ATTR_RULES[node.type]

  if (attrRule) {
    const attrError = attrRule(node.attrs ?? {})

    if (attrError) {
      issues.push({ path: `${path}.attrs`, message: attrError })
    }
  } else if (node.attrs) {
    // Nodes without rules must not carry attributes: reject them, so a
    // future attribute cannot slip in silently.
    const unexpected = Object.keys(node.attrs)

    if (unexpected.length > 0) {
      issues.push({
        path: `${path}.attrs`,
        message: `attributes [${unexpected.join(", ")}] are not allowed on node "${node.type}"`,
      })
    }
  }

  if (node.content) {
    for (let index = 0; index < node.content.length; index += 1) {
      validateNode(policy, node.content[index], `${path}.content[${index}]`, issues)
    }
  }
}
