"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import type { Editor } from "@tiptap/react"

import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import type { TipTapDoc } from "@/lib/content-policy"
import { uploadMediaFile } from "@/lib/storage/client-upload"

import {
  EDITOR_CONFIGS,
  TOOLBAR_ACTIONS,
  type EditorConfigName,
} from "./editor-config"

/**
 * The shared rich-text editor. Client-only and dynamically imported by the
 * question form (no SSR; KaTeX and the editor never touch the initial
 * dashboard bundle). Prompt vs answer differences are configuration only.
 */
export interface RichTextEditorProps {
  policy: EditorConfigName
  initialContent?: TipTapDoc | null
  onChange?: (doc: TipTapDoc | null) => void
  placeholder?: string
}

function isActive(editor: Editor, name: string, attrs?: Record<string, unknown>): boolean {
  return editor.isActive(name, attrs ?? {})
}

/**
 * Upload a picked image through the presign -> upload -> confirm flow and
 * insert the returned media key into the document (the stored content keeps
 * the key, never a URL — ADR-0002).
 */
function useImageInsertion(editor: Editor | null) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file || !editor) {
      return
    }

    setUploading(true)
    setError(null)

    try {
      const { objectKey } = await uploadMediaFile(file)

      editor.chain().focus().setImage({ src: objectKey, alt: file.name }).run()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload gagal.")
    } finally {
      setUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  const trigger = (
    <input
      accept="image/png,image/jpeg,image/webp"
      aria-label="Pilih gambar untuk diunggah"
      className="sr-only"
      onChange={(event) => handleFile(event.target.files?.[0])}
      ref={inputRef}
      type="file"
    />
  )

  const button = (
    <Button
      aria-label="Sisipkan gambar"
      disabled={uploading}
      size="sm"
      type="button"
      variant="ghost"
      onClick={() => inputRef.current?.click()}
    >
      {uploading ? "Mengunggah…" : "Gambar"}
    </Button>
  )

  return { button, error, trigger }
}

function PromptToolbar({ editor }: { editor: Editor }) {
  const run = useCallback(
    (action: (value: Editor) => void) => {
      action(editor)
      editor.view.focus()
    },
    [editor]
  )
  const image = useImageInsertion(editor)

  return (
    <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
      <Button
        aria-label="Paragraf"
        size="sm"
        type="button"
        variant={isActive(editor, "paragraph") ? "secondary" : "ghost"}
        onClick={() => run(TOOLBAR_ACTIONS.paragraph)}
      >
        P
      </Button>
      {[1, 2, 3].map((level) => (
        <Button
          aria-label={`Heading ${level}`}
          key={level}
          size="sm"
          type="button"
          variant={isActive(editor, "heading", { level }) ? "secondary" : "ghost"}
          onClick={() => run((value) => value.chain().setHeading({ level: level as 1 | 2 | 3 }).run())}
        >
          H{level}
        </Button>
      ))}

      <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />

      <ToolbarToggle
        ariaLabel="Tebal"
        label="B"
        active={isActive(editor, "bold")}
        onClick={() => run(TOOLBAR_ACTIONS.bold)}
      />
      <ToolbarToggle
        ariaLabel="Miring"
        label="I"
        active={isActive(editor, "italic")}
        onClick={() => run(TOOLBAR_ACTIONS.italic)}
      />
      <ToolbarToggle
        ariaLabel="Garis bawah"
        label="U"
        active={isActive(editor, "underline")}
        onClick={() => run(TOOLBAR_ACTIONS.underline)}
      />
      <ToolbarToggle
        ariaLabel="Coret"
        label="S"
        active={isActive(editor, "strike")}
        onClick={() => run(TOOLBAR_ACTIONS.strike)}
      />
      <ToolbarToggle
        ariaLabel="Kode inline"
        label="<>"
        active={isActive(editor, "code")}
        onClick={() => run(TOOLBAR_ACTIONS.code)}
      />

      <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />

      <ToolbarToggle
        ariaLabel="Daftar berpoin"
        label="•"
        active={isActive(editor, "bulletList")}
        onClick={() => run(TOOLBAR_ACTIONS.bulletList)}
      />
      <ToolbarToggle
        ariaLabel="Daftar bernomor"
        label="1."
        active={isActive(editor, "orderedList")}
        onClick={() => run(TOOLBAR_ACTIONS.orderedList)}
      />
      <ToolbarToggle
        ariaLabel="Kutipan"
        label='"'
        active={isActive(editor, "blockquote")}
        onClick={() => run(TOOLBAR_ACTIONS.blockquote)}
      />
      <ToolbarToggle
        ariaLabel="Blok kode"
        label="</>"
        active={isActive(editor, "codeBlock")}
        onClick={() => run(TOOLBAR_ACTIONS.codeBlock)}
      />

      <Button
        aria-label="Sisipkan rumus matematika"
        size="sm"
        type="button"
        variant="ghost"
        onClick={() => run(TOOLBAR_ACTIONS.blockMath)}
      >
        Σ
      </Button>

      <Button
        aria-label="Sisipkan tautan"
        size="sm"
        type="button"
        variant="ghost"
        onClick={() =>
          run((value) => {
            const href = window.prompt("Alamat tautan (https://…)")

            if (href) {
              value.chain().focus().extendMarkRange("link").setLink({ href }).run()
            }
          })
        }
      >
        Link
      </Button>

      <Button
        aria-label="Sisipkan tabel"
        size="sm"
        type="button"
        variant="ghost"
        onClick={() => run((value) => value.chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
      >
        Tabel
      </Button>

      <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />

      {image.button}
      {image.trigger}
      {image.error ? <span className="text-xs text-destructive">{image.error}</span> : null}
    </div>
  )
}

function AnswerToolbar({ editor }: { editor: Editor }) {
  const run = useCallback(
    (action: (value: Editor) => void) => {
      action(editor)
      editor.view.focus()
    },
    [editor]
  )
  const image = useImageInsertion(editor)

  return (
    <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
      <ToolbarToggle
        ariaLabel="Tebal"
        label="B"
        active={isActive(editor, "bold")}
        onClick={() => run(TOOLBAR_ACTIONS.bold)}
      />
      <ToolbarToggle
        ariaLabel="Miring"
        label="I"
        active={isActive(editor, "italic")}
        onClick={() => run(TOOLBAR_ACTIONS.italic)}
      />
      <ToolbarToggle
        ariaLabel="Garis bawah"
        label="U"
        active={isActive(editor, "underline")}
        onClick={() => run(TOOLBAR_ACTIONS.underline)}
      />
      <ToolbarToggle
        ariaLabel="Coret"
        label="S"
        active={isActive(editor, "strike")}
        onClick={() => run(TOOLBAR_ACTIONS.strike)}
      />
      <ToolbarToggle
        ariaLabel="Kode inline"
        label="<>"
        active={isActive(editor, "code")}
        onClick={() => run(TOOLBAR_ACTIONS.code)}
      />

      <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />

      {image.button}
      {image.trigger}
      {image.error ? <span className="text-xs text-destructive">{image.error}</span> : null}
    </div>
  )
}

function ToolbarToggle({
  ariaLabel,
  label,
  active,
  onClick,
}: {
  ariaLabel: string
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <Toggle aria-label={ariaLabel} pressed={active} size="sm" type="button" onClick={onClick}>
      {label}
    </Toggle>
  )
}

export function RichTextEditor({
  policy,
  initialContent,
  onChange,
}: RichTextEditorProps) {
  const config = EDITOR_CONFIGS[policy]

  const editor = useEditor({
    extensions: config.extensions,
    content: initialContent ?? "<p></p>",
    editorProps: {
      attributes: {
        class: "rich-text-content",
      },
    },
    onUpdate: ({ editor: value }) => {
      onChange?.(value.getJSON() as TipTapDoc)
    },
  })

  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  if (!editor) {
    return (
      <div className="min-h-24 rounded-lg border bg-input/30" aria-busy="true" />
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      {policy === "prompt" ? (
        <PromptToolbar editor={editor} />
      ) : (
        <AnswerToolbar editor={editor} />
      )}
      <div className="px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
