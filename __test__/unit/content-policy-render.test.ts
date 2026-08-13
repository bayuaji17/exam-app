import { describe, expect, it } from "vitest"

import { extractPlainText, renderContentHtml, type TipTapDoc } from "@/lib/content-policy"
import { sanitizeAnswerHtml, sanitizePromptHtml } from "@/lib/content-policy"

describe("extractPlainText", () => {
  it("joins text across paragraphs with spaces", () => {
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Berapa" }] },
        { type: "paragraph", content: [{ type: "text", text: "hasilnya?" }] },
      ],
    }

    expect(extractPlainText(doc)).toBe("Berapa hasilnya?")
  })

  it("includes list, quote, and link text", () => {
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "alpha" }] }] },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "beta", marks: [{ type: "link", attrs: { href: "#" } }] }],
        },
      ],
    }

    expect(extractPlainText(doc)).toBe("alpha beta")
  })

  it("excludes math content", () => {
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Selesaikan" }] },
        { type: "math", attrs: { tex: "\\int x dx" } },
      ],
    }

    expect(extractPlainText(doc)).toBe("Selesaikan")
  })

  it("collapses whitespace", () => {
    const doc: TipTapDoc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "a   b" }] },
        { type: "paragraph", content: [{ type: "text", text: "c" }] },
      ],
    }

    expect(extractPlainText(doc)).toBe("a b c")
  })
})

describe("renderContentHtml", () => {
  it("renders marks and headings", () => {
    const html = renderContentHtml({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Judul" }] },
        {
          type: "paragraph",
          content: [{ type: "text", text: "teks", marks: [{ type: "bold" }] }],
        },
      ],
    })

    expect(html).toContain("<h2>Judul</h2>")
    expect(html).toContain("<strong>teks</strong>")
  })

  it("escapes text", () => {
    const html = renderContentHtml({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>" }] }],
    })

    expect(html).toContain("&lt;script&gt;")
    expect(html).not.toContain("<script>")
  })

  it("resolves image keys through the resolver", () => {
    const html = renderContentHtml(
      {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "image", attrs: { src: "media/uuid.webp", alt: "x" } }],
          },
        ],
      },
      { resolveImageSrc: (key) => `https://cdn.example/${key}` }
    )

    expect(html).toContain('src="https://cdn.example/media/uuid.webp"')
  })

  it("renders math as a placeholder span with the LaTeX", () => {
    const html = renderContentHtml({
      type: "doc",
      content: [{ type: "math", attrs: { tex: "x^2" } }],
    })

    expect(html).toContain('class="math-tex"')
    expect(html).toContain('data-tex="x^2"')
  })
})

describe("sanitizePromptHtml / sanitizeAnswerHtml", () => {
  it("keeps prompt-allowed tags and strips everything else", () => {
    const html = sanitizePromptHtml(
      '<h2>Judul</h2><p>teks <strong>tebal</strong></p><script>alert(1)</script><video src="x"></video>'
    )

    expect(html).toContain("<h2>Judul</h2>")
    expect(html).toContain("<strong>tebal</strong>")
    expect(html).not.toContain("<script")
    expect(html).not.toContain("<video")
  })

  it("keeps the math placeholder data-tex attribute", () => {
    const html = sanitizePromptHtml('<span class="math-tex" data-tex="x^2"></span>')

    expect(html).toContain("data-tex")
  })

  it("strips answer-forbidden tags from answer HTML", () => {
    const html = sanitizeAnswerHtml(
      '<h2>Judul</h2><ul><li>x</li></ul><a href="https://a.b">link</a><p>teks</p>'
    )

    expect(html).not.toContain("<h2")
    expect(html).not.toContain("<ul")
    expect(html).not.toContain("<a ")
    expect(html).toContain("<p>teks</p>")
  })

  it("keeps answer-allowed tags", () => {
    const html = sanitizeAnswerHtml(
      '<p><strong>a</strong> <em>b</em> <u>c</u> <s>d</s> <code>e</code></p>'
    )

    expect(html).toContain("<strong>a</strong>")
    expect(html).toContain("<em>b</em>")
    expect(html).toContain("<u>c</u>")
    expect(html).toContain("<s>d</s>")
    expect(html).toContain("<code>e</code>")
  })
})
