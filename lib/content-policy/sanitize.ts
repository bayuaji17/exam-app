import createDOMPurify from "isomorphic-dompurify"

import {
  ANSWER_POLICY,
  INTRODUCTION_POLICY,
  PROMPT_POLICY,
  type ContentPolicy,
} from "./policy"

/**
 * Render-time sanitizer (defense in depth — Q7).
 *
 * The save-time validator already guarantees stored content matches the
 * policy, but sanitization runs again before any HTML reaches
 * `dangerouslySetInnerHTML`, with an allowlist derived from the same policy
 * definitions so the layers cannot drift.
 */

const BASE_ALLOWED = [
  "p",
  "br",
  "img",
  "span",
  "strong",
  "em",
  "u",
  "s",
  "code",
]

const PROMPT_HTML_TAGS = [
  ...BASE_ALLOWED,
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "a",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]

const ANSWER_HTML_TAGS = [...BASE_ALLOWED]

/** The introduction render output: blocks and links, no images. */
const INTRODUCTION_HTML_TAGS = [
  "p",
  "br",
  "span",
  "strong",
  "em",
  "u",
  "s",
  "code",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "a",
]

const ALLOWED_ATTRS = [
  "href",
  "src",
  "alt",
  "class",
  "data-latex",
  "style",
  "colspan",
  "rowspan",
  "data-align",
  "width",
]

function sanitizeWith(policy: ContentPolicy, html: string): string {
  const tags =
    policy.name === "prompt"
      ? PROMPT_HTML_TAGS
      : policy.name === "answer"
        ? ANSWER_HTML_TAGS
        : INTRODUCTION_HTML_TAGS

  return createDOMPurify.sanitize(html, {
    ALLOWED_TAGS: tags,
    ALLOWED_ATTR: ALLOWED_ATTRS,
    ALLOW_DATA_ATTR: false,
  })
}

export function sanitizePromptHtml(html: string): string {
  return sanitizeWith(PROMPT_POLICY, html)
}

export function sanitizeAnswerHtml(html: string): string {
  return sanitizeWith(ANSWER_POLICY, html)
}

export function sanitizeIntroductionHtml(html: string): string {
  return sanitizeWith(INTRODUCTION_POLICY, html)
}
