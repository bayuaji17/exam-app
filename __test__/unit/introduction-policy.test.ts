import { describe, expect, it } from "vitest"

import {
  INTRODUCTION_POLICY,
  sanitizeIntroductionHtml,
  validateContent,
  type TipTapDoc,
} from "@/lib/content-policy"

const PARA = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
})

describe("INTRODUCTION_POLICY", () => {
  it("accepts paragraphs, headings, lists, blockquote, code, and links", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Aturan" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Baca " },
                    {
                      type: "text",
                      text: "tautan",
                      marks: [
                        {
                          type: "link",
                          attrs: { href: "https://example.com" },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "blockquote",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Kutipan" }] },
          ],
        },
        { type: "codeBlock", content: [{ type: "text", text: "kode" }] },
        { type: "paragraph", content: [{ type: "text", text: "Paragraf" }] },
      ],
    }

    const result = validateContent(INTRODUCTION_POLICY, doc as TipTapDoc)

    expect(result.ok).toBe(true)
  })

  it("rejects images, math, and tables", () => {
    const withImage = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: {
            src: "media/00000000-0000-0000-0000-000000000000.webp",
            alt: "gambar",
          },
        },
      ],
    }
    const withMath = {
      type: "doc",
      content: [{ type: "blockMath", attrs: { latex: "x^2" } }],
    }
    const withTable = {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [{ type: "tableCell", content: [PARA("sel")] }],
            },
          ],
        },
      ],
    }

    expect(
      validateContent(INTRODUCTION_POLICY, withImage as TipTapDoc).ok
    ).toBe(false)
    expect(validateContent(INTRODUCTION_POLICY, withMath as TipTapDoc).ok).toBe(
      false
    )
    expect(
      validateContent(INTRODUCTION_POLICY, withTable as TipTapDoc).ok
    ).toBe(false)
  })

  it("rejects disallowed marks", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "halo", marks: [{ type: "highlight" }] },
          ],
        },
      ],
    }

    expect(validateContent(INTRODUCTION_POLICY, doc as TipTapDoc).ok).toBe(
      false
    )
  })
})

describe("sanitizeIntroductionHtml", () => {
  it("keeps blocks and links but strips images", () => {
    const html =
      '<h2>Aturan</h2><p>Baca <a href="https://example.com">tautan</a></p>' +
      '<img src="media/x.webp" alt="x"><script>alert(1)</script>'

    const sanitized = sanitizeIntroductionHtml(html)

    expect(sanitized).toContain("<h2>Aturan</h2>")
    expect(sanitized).toContain('<a href="https://example.com">tautan</a>')
    expect(sanitized).not.toContain("<img")
    expect(sanitized).not.toContain("<script")
  })
})
