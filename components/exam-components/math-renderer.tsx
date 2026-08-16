"use client"

import { useEffect, useRef } from "react"
import katex from "katex"

import "katex/dist/katex.min.css"

/**
 * Typesets the `.math-tex` spans a server-rendered question produces
 * (`renderContentHtml` emits them carrying the LaTeX in `data-latex`).
 * Runs after mount and whenever the html changes.
 */
export function MathRenderer({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    for (const node of container.querySelectorAll<HTMLElement>(".math-tex")) {
      const latex = node.dataset.latex ?? ""

      if (!latex) {
        continue
      }

      try {
        katex.render(latex, node, {
          displayMode: node.classList.contains("math-block"),
          throwOnError: false,
        })
      } catch {
        node.textContent = latex
      }
    }
  }, [html])

  return (
    <div
      aria-hidden={false}
      className="rich-text-content"
      dangerouslySetInnerHTML={{ __html: html }}
      ref={containerRef}
    />
  )
}
