import { BlockMath, InlineMath } from "@tiptap/extension-mathematics"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table"
import { Underline } from "@tiptap/extension-underline"
import { StarterKit } from "@tiptap/starter-kit"
import type { UseEditorOptions } from "@tiptap/react"

import {
  ANSWER_POLICY,
  INTRODUCTION_POLICY,
  PROMPT_POLICY,
} from "@/lib/content-policy"
import { resolveMediaKeyForClient } from "@/lib/storage/urls"

/**
 * Editor extension sets derived from the content policy (ADR-0004): the
 * editor cannot produce a node or mark the policy forbids.
 *
 * StarterKit v3 registers nodes outside the curated prompt schema
 * (`hardBreak`, `horizontalRule`), so it is narrowed with `configure`. The
 * answer schema has no block nodes at all beyond the paragraph, so it uses
 * an explicit extension list instead of StarterKit.
 */

const NARROWED_STARTER_KIT = StarterKit.configure({
  hardBreak: false,
  horizontalRule: false,
  // v3 StarterKit already registers link and underline; the explicit
  // extensions below would duplicate them.
  link: false,
  underline: false,
})

const BASE_MARKS = [
  StarterKit.configure({
    bold: {},
    italic: {},
    strike: {},
    code: {},
    heading: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    blockquote: false,
    codeBlock: false,
    hardBreak: false,
    horizontalRule: false,
    link: false,
    underline: false,
  }),
]

/**
 * Image is registered so the schema accepts the node; the upload control is
 * in the toolbar. The stored document carries the media KEY (ADR-0002); the
 * editor resolves keys to public URLs for display only.
 */
const IMAGE = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: (element) =>
          element.style.width || element.getAttribute("width") || "100%",
        renderHTML: (attributes) => {
          if (!attributes.width) {
            return {}
          }
          return {
            width: attributes.width,
          }
        },
      },
      alignment: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") || "center",
        renderHTML: (attributes) => {
          if (!attributes.alignment) {
            return {}
          }
          return {
            "data-align": attributes.alignment,
          }
        },
      },
    }
  },
  renderHTML({ node }) {
    const width = node.attrs.width || "100%"
    const align = node.attrs.alignment || "center"
    let style = `width: ${width};`
    if (align === "center") {
      style += " display: block; margin-left: auto; margin-right: auto;"
    } else if (align === "right") {
      style += " display: block; margin-left: auto; margin-right: 0;"
    } else if (align === "left") {
      style += " display: block; margin-right: auto; margin-left: 0;"
    }

    return [
      "img",
      {
        src: resolveMediaKeyForClient(String(node.attrs.src)),
        alt: String(node.attrs.alt ?? ""),
        "data-align": align,
        style,
        class: `rich-text-image align-${align}`,
      },
    ]
  },
}).configure({ inline: false, allowBase64: false })

export type EditorConfigName = "prompt" | "answer" | "introduction"

export interface EditorConfig {
  name: EditorConfigName
  extensions: UseEditorOptions["extensions"]
}

export const EDITOR_CONFIGS: Record<EditorConfigName, EditorConfig> = {
  prompt: {
    name: "prompt",
    extensions: [
      NARROWED_STARTER_KIT,
      Underline,
      Link.configure({ openOnClick: false }),
      IMAGE,
      Table.configure({
        resizable: true,
        handleWidth: 8,
        cellMinWidth: 30,
        lastColumnResizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      InlineMath,
      BlockMath,
    ],
  },
  answer: {
    name: "answer",
    extensions: [...BASE_MARKS, Underline, IMAGE],
  },
  introduction: {
    name: "introduction",
    extensions: [
      NARROWED_STARTER_KIT,
      Underline,
      Link.configure({ openOnClick: false }),
    ],
  },
}

export function policyFor(name: EditorConfigName) {
  if (name === "prompt") {
    return PROMPT_POLICY
  }

  if (name === "answer") {
    return ANSWER_POLICY
  }

  return INTRODUCTION_POLICY
}

export const TOOLBAR_ACTIONS = {
  paragraph: (editor: import("@tiptap/react").Editor) =>
    editor.chain().focus().setParagraph().run(),
  bold: (editor: import("@tiptap/react").Editor) =>
    editor.chain().focus().toggleBold().run(),
  italic: (editor: import("@tiptap/react").Editor) =>
    editor.chain().focus().toggleItalic().run(),
  underline: (editor: import("@tiptap/react").Editor) =>
    editor.chain().focus().toggleUnderline().run(),
  strike: (editor: import("@tiptap/react").Editor) =>
    editor.chain().focus().toggleStrike().run(),
  code: (editor: import("@tiptap/react").Editor) =>
    editor.chain().focus().toggleCode().run(),
  bulletList: (editor: import("@tiptap/react").Editor) =>
    editor.chain().focus().toggleBulletList().run(),
  orderedList: (editor: import("@tiptap/react").Editor) =>
    editor.chain().focus().toggleOrderedList().run(),
  blockquote: (editor: import("@tiptap/react").Editor) =>
    editor.chain().focus().toggleBlockquote().run(),
  codeBlock: (editor: import("@tiptap/react").Editor) =>
    editor.chain().focus().toggleCodeBlock().run(),
  blockMath: (editor: import("@tiptap/react").Editor) =>
    editor.chain().focus().insertBlockMath({ latex: "" }).run(),
} as const
