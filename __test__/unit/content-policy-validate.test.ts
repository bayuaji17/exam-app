import { describe, expect, it } from "vitest"

import {
  ANSWER_POLICY,
  PROMPT_POLICY,
  validateContent,
  type TipTapDoc,
} from "@/lib/content-policy"

function paragraph(text: string) {
  return { type: "paragraph", content: [{ type: "text", text }] }
}

const VALID_PROMPT: TipTapDoc = {
  type: "doc" as const,
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Persamaan" }],
    },
    paragraph("Hitung x."),
    {
      type: "blockMath",
      attrs: { latex: "x^2 + 1 = 0" },
    },
  ],
}

describe("validateContent", () => {
  describe("prompt policy", () => {
    it("accepts a valid curated prompt", () => {
      const result = validateContent(PROMPT_POLICY, VALID_PROMPT)

      expect(result.ok).toBe(true)
      expect(result.issues).toEqual([])
    })

    it("accepts lists, blockquote, code block, table, and link", () => {
      const doc = {
        type: "doc" as const,
        content: [
          {
            type: "bulletList",
            content: [{ type: "listItem", content: [paragraph("a")] }],
          },
          { type: "blockquote", content: [paragraph("quote")] },
          {
            type: "codeBlock",
            content: [{ type: "text", text: "const x = 1" }],
          },
          {
            type: "table",
            content: [
              {
                type: "tableRow",
                content: [
                  { type: "tableHeaderCell", content: [paragraph("h")] },
                  { type: "tableCell", content: [paragraph("c")] },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "link",
                marks: [
                  { type: "link", attrs: { href: "https://example.com" } },
                ],
              },
            ],
          },
        ],
      }

      const result = validateContent(PROMPT_POLICY, doc)

      expect(result.ok).toBe(true)
    })

    it("accepts an image node with a valid media key", () => {
      const doc = {
        type: "doc" as const,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "image",
                attrs: {
                  src: "media/123e4567-e89b-12d3-a456-426614174000.webp",
                  alt: "gambar",
                },
              },
            ],
          },
        ],
      }

      expect(validateContent(PROMPT_POLICY, doc).ok).toBe(true)
    })

    it("rejects a disallowed node", () => {
      const doc = {
        type: "doc" as const,
        content: [{ type: "video", content: [paragraph("x")] }],
      }

      const result = validateContent(PROMPT_POLICY, doc)

      expect(result.ok).toBe(false)
      expect(result.issues[0]?.message).toContain('node "video"')
    })

    it("rejects a disallowed mark", () => {
      const doc = {
        type: "doc" as const,
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "x", marks: [{ type: "highlight" }] },
            ],
          },
        ],
      }

      const result = validateContent(PROMPT_POLICY, doc)

      expect(result.ok).toBe(false)
      expect(result.issues[0]?.message).toContain('mark "highlight"')
    })

    it("rejects an image with an invalid media key", () => {
      const doc = {
        type: "doc" as const,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "image",
                attrs: { src: "https://evil.example/x.png", alt: "x" },
              },
            ],
          },
        ],
      }

      expect(validateContent(PROMPT_POLICY, doc).ok).toBe(false)
    })

    it("rejects an image with a gif key", () => {
      const doc = {
        type: "doc" as const,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "image",
                attrs: {
                  src: "staging/123e4567-e89b-12d3-a456-426614174000.gif",
                  alt: "x",
                },
              },
            ],
          },
        ],
      }

      expect(validateContent(PROMPT_POLICY, doc).ok).toBe(false)
    })

    it("rejects math without a LaTeX value", () => {
      const doc = {
        type: "doc" as const,
        content: [{ type: "inlineMath", attrs: { latex: "" } }],
      }

      const result = validateContent(PROMPT_POLICY, doc)

      expect(result.ok).toBe(false)
      expect(result.issues[0]?.message).toContain("latex")
    })

    it("rejects a heading without a valid level", () => {
      const doc = {
        type: "doc" as const,
        content: [{ type: "heading", content: [{ type: "text", text: "x" }] }],
      }

      expect(validateContent(PROMPT_POLICY, doc).ok).toBe(false)
    })

    it("rejects attributes on nodes that carry none", () => {
      const doc = {
        type: "doc" as const,
        content: [
          {
            type: "paragraph",
            attrs: { align: "center" },
            content: [{ type: "text", text: "x" }],
          },
        ],
      }

      const result = validateContent(PROMPT_POLICY, doc)

      expect(result.ok).toBe(false)
      expect(result.issues[0]?.message).toContain("align")
    })

    it("rejects an empty document", () => {
      expect(validateContent(PROMPT_POLICY, { type: "doc" }).ok).toBe(false)
    })

    it("reports the path of the offending node", () => {
      const doc = {
        type: "doc" as const,
        content: [paragraph("ok"), { type: "video" }],
      }

      const result = validateContent(PROMPT_POLICY, doc)

      expect(result.issues[0]?.path).toBe("content[1]")
    })
  })

  describe("answer policy", () => {
    it("accepts a paragraph with inline formatting and image", () => {
      const doc = {
        type: "doc" as const,
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "jawaban", marks: [{ type: "bold" }] },
              {
                type: "image",
                attrs: {
                  src: "media/123e4567-e89b-12d3-a456-426614174000.webp",
                  alt: "x",
                },
              },
            ],
          },
        ],
      }

      expect(validateContent(ANSWER_POLICY, doc).ok).toBe(true)
    })

    it("rejects headings, lists, links, and math in answers", () => {
      const docs = [
        {
          type: "doc" as const,
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: "x" }],
            },
          ],
        },
        {
          type: "doc" as const,
          content: [
            {
              type: "bulletList",
              content: [{ type: "listItem", content: [paragraph("x")] }],
            },
          ],
        },
        {
          type: "doc" as const,
          content: [{ type: "math", attrs: { tex: "x" } }],
        },
        {
          type: "doc" as const,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "x",
                  marks: [{ type: "link", attrs: { href: "https://a.b" } }],
                },
              ],
            },
          ],
        },
      ]

      for (const doc of docs) {
        expect(validateContent(ANSWER_POLICY, doc).ok).toBe(false)
      }
    })
  })
})
