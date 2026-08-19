"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import type { Editor } from "@tiptap/react"

import { Eye, PenLine, Table as TableIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toggle } from "@/components/ui/toggle"
import {
  OptionRenderer,
  QuestionRenderer,
} from "@/components/exam-components/question-renderer"
import { cn } from "@/lib/utils"
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
  minHeight?: string
  resizable?: boolean
  className?: string
}

function isActive(
  editor: Editor,
  name: string,
  attrs?: Record<string, unknown>
): boolean {
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
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload gagal."
      )
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
          variant={
            isActive(editor, "heading", { level }) ? "secondary" : "ghost"
          }
          onClick={() =>
            run((value) =>
              value
                .chain()
                .setHeading({ level: level as 1 | 2 | 3 })
                .run()
            )
          }
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
              value
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href })
                .run()
            }
          })
        }
      >
        Link
      </Button>

      <TableDropdown editor={editor} run={run} />

      <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />

      {image.button}
      {image.trigger}
      {image.error ? (
        <span className="text-xs text-destructive">{image.error}</span>
      ) : null}

      {isActive(editor, "table") ? (
        <div className="flex w-full flex-wrap items-center gap-1.5 border-t bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
          <span className="text-[11px] font-semibold text-foreground">
            Tabel Aktif:
          </span>
          <Button
            size="xs"
            type="button"
            variant="outline"
            className="h-6 px-2 text-[11px]"
            onClick={() => run((v) => v.chain().addRowAfter().run())}
          >
            + Baris
          </Button>
          <Button
            size="xs"
            type="button"
            variant="outline"
            className="h-6 px-2 text-[11px]"
            onClick={() => run((v) => v.chain().addColumnAfter().run())}
          >
            + Kolom
          </Button>
          <Button
            size="xs"
            type="button"
            variant="outline"
            className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => run((v) => v.chain().deleteRow().run())}
          >
            - Baris
          </Button>
          <Button
            size="xs"
            type="button"
            variant="outline"
            className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => run((v) => v.chain().deleteColumn().run())}
          >
            - Kolom
          </Button>
          <Button
            size="xs"
            type="button"
            variant="outline"
            className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => run((v) => v.chain().deleteTable().run())}
          >
            Hapus Tabel
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function TableDropdown({
  editor,
  run,
}: {
  editor: Editor
  run: (action: (value: Editor) => void) => void
}) {
  const inTable = isActive(editor, "table")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Sisipkan tabel"
          size="sm"
          type="button"
          variant={inTable ? "secondary" : "ghost"}
          className="gap-1"
        >
          <TableIcon className="size-3.5" />
          <span>Tabel</span>
          <span className="text-[10px] opacity-60">▾</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem
          onClick={() =>
            run((value) =>
              value
                .chain()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            )
          }
        >
          Sisipkan Tabel Baru (3×3)
        </DropdownMenuItem>

        {inTable ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
              Kelola Baris
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => run((value) => value.chain().addRowBefore().run())}
            >
              + Tambah Baris di Atas
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => run((value) => value.chain().addRowAfter().run())}
            >
              + Tambah Baris di Bawah
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => run((value) => value.chain().deleteRow().run())}
            >
              Hapus Baris Ini
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
              Kelola Kolom
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                run((value) => value.chain().addColumnBefore().run())
              }
            >
              + Tambah Kolom di Kiri
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                run((value) => value.chain().addColumnAfter().run())
              }
            >
              + Tambah Kolom di Kanan
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => run((value) => value.chain().deleteColumn().run())}
            >
              Hapus Kolom Ini
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
              Pengaturan Tabel
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                run((value) => value.chain().toggleHeaderRow().run())
              }
            >
              Toggle Baris Header
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                run((value) => value.chain().toggleHeaderColumn().run())
              }
            >
              Toggle Kolom Header
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="font-medium text-destructive focus:text-destructive"
              onClick={() => run((value) => value.chain().deleteTable().run())}
            >
              Hapus Seluruh Tabel
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
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
      {image.error ? (
        <span className="text-xs text-destructive">{image.error}</span>
      ) : null}
    </div>
  )
}

function IntroToolbar({ editor }: { editor: Editor }) {
  const run = useCallback(
    (action: (value: Editor) => void) => {
      action(editor)
      editor.view.focus()
    },
    [editor]
  )

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
          variant={
            isActive(editor, "heading", { level }) ? "secondary" : "ghost"
          }
          onClick={() =>
            run((value) =>
              value
                .chain()
                .setHeading({ level: level as 1 | 2 | 3 })
                .run()
            )
          }
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
        aria-label="Sisipkan tautan"
        size="sm"
        type="button"
        variant="ghost"
        onClick={() =>
          run((value) => {
            const href = window.prompt("Alamat tautan (https://…)")

            if (href) {
              value
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href })
                .run()
            }
          })
        }
      >
        Link
      </Button>
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
    <Toggle
      aria-label={ariaLabel}
      pressed={active}
      size="sm"
      type="button"
      onClick={onClick}
    >
      {label}
    </Toggle>
  )
}

export function RichTextEditor({
  policy,
  initialContent,
  onChange,
  minHeight,
  resizable = true,
  className,
}: RichTextEditorProps) {
  const config = EDITOR_CONFIGS[policy]
  const [currentDoc, setCurrentDoc] = useState<TipTapDoc | null>(
    initialContent ?? null
  )
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")

  const defaultMinHeight =
    minHeight ??
    (policy === "prompt"
      ? "min-h-[140px]"
      : policy === "answer"
        ? "min-h-[72px]"
        : "min-h-[200px]")

  const editor = useEditor({
    extensions: config.extensions,
    content: initialContent ?? "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rich-text-content focus:outline-none min-h-full",
      },
    },
    onUpdate: ({ editor: value }) => {
      const json = value.getJSON() as TipTapDoc
      setCurrentDoc(json)
      onChange?.(json)
    },
  })

  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  if (!editor) {
    return (
      <div
        className="min-h-24 rounded-lg border bg-input/30"
        aria-busy="true"
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-2xs">
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "edit" | "preview")}
        className="w-full gap-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5">
          <span className="text-xs font-semibold text-muted-foreground">
            {policy === "prompt"
              ? "Editor Pertanyaan"
              : policy === "answer"
                ? "Editor Jawaban"
                : "Editor Petunjuk"}
          </span>
          <TabsList className="h-7 bg-muted p-0.5">
            <TabsTrigger value="edit" className="h-6 gap-1 px-2.5 text-xs">
              <PenLine className="size-3" />
              <span>Tulis</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="h-6 gap-1 px-2.5 text-xs">
              <Eye className="size-3" />
              <span>Pratinjau</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="edit" className="m-0 border-0 p-0">
          <div>
            {policy === "prompt" ? (
              <PromptToolbar editor={editor} />
            ) : policy === "answer" ? (
              <AnswerToolbar editor={editor} />
            ) : (
              <IntroToolbar editor={editor} />
            )}
            <div
              className={cn(
                "overflow-auto px-3 py-2",
                resizable && "resize-y",
                defaultMinHeight,
                className
              )}
            >
              <EditorContent editor={editor} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="m-0 border-0 p-0">
          {activeTab === "preview" ? (
            <div
              className={cn(
                "overflow-auto bg-muted/10 p-4",
                resizable && "resize-y",
                defaultMinHeight,
                className
              )}
            >
              {currentDoc &&
              currentDoc.content &&
              currentDoc.content.length > 0 ? (
                policy === "answer" ? (
                  <OptionRenderer
                    content={currentDoc as unknown as Record<string, unknown>}
                  />
                ) : (
                  <QuestionRenderer
                    content={currentDoc as unknown as Record<string, unknown>}
                  />
                )
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Belum ada konten yang ditulis untuk dipratinjau.
                </p>
              )}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
