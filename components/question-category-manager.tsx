"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createQuestionCategoryAction,
  deleteQuestionCategoryAction,
  updateQuestionCategoryAction,
} from "@/lib/question-banks/category-actions"
import {
  type QuestionCategoryFormValues,
  questionCategorySchema,
} from "@/lib/question-banks/category-validation"
import type { QuestionCategoryListItem } from "@/lib/question-banks/category-queries"
import { cn } from "@/lib/utils"

function CategoryFormFields({
  form,
  idPrefix,
}: {
  form: ReturnType<typeof useForm<QuestionCategoryFormValues>>
  idPrefix: string
}) {
  const descriptionValue =
    useWatch({ control: form.control, name: "description" }) ?? ""

  return (
    <>
      <Field data-invalid={form.formState.errors.name?.message !== undefined}>
        <FieldLabel htmlFor={`${idPrefix}-name`}>Nama Kategori</FieldLabel>
        <Input
          aria-invalid={form.formState.errors.name?.message !== undefined}
          disabled={form.formState.isSubmitting}
          {...form.register("name")}
          id={`${idPrefix}-name`}
          placeholder="cth. Aljabar"
        />
        {form.formState.errors.name?.message ? (
          <FieldError errors={[form.formState.errors.name]} />
        ) : null}
      </Field>

      <Field
        data-invalid={form.formState.errors.description?.message !== undefined}
      >
        <div className="flex items-center justify-between">
          <FieldLabel htmlFor={`${idPrefix}-description`}>Deskripsi</FieldLabel>
          <span
            className={cn(
              "text-xs text-muted-foreground tabular-nums",
              descriptionValue.length > 500 && "font-medium text-destructive"
            )}
          >
            {descriptionValue.length}/500
          </span>
        </div>
        <Textarea
          aria-invalid={
            form.formState.errors.description?.message !== undefined
          }
          disabled={form.formState.isSubmitting}
          {...form.register("description")}
          id={`${idPrefix}-description`}
          placeholder="Opsional — keterangan kategori"
          rows={2}
        />
        {form.formState.errors.description?.message ? (
          <FieldError errors={[form.formState.errors.description]} />
        ) : null}
      </Field>
    </>
  )
}

function CategoryForm({
  mode,
  initial,
  onDone,
  idPrefix = "category-name",
}: {
  mode: "create" | "edit"
  initial?: { id: string; name: string; description: string | null }
  onDone: () => void
  idPrefix?: string
}) {
  const [rootError, setRootError] = useState<string | null>(null)
  const form = useForm<QuestionCategoryFormValues>({
    resolver: zodResolver(questionCategorySchema),
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
    },
  })

  async function onSubmit(values: QuestionCategoryFormValues) {
    setRootError(null)

    const result =
      mode === "create"
        ? await createQuestionCategoryAction(values)
        : await updateQuestionCategoryAction(initial!.id, values)

    if (!result.ok) {
      setRootError(result.message)
      return
    }

    onDone()
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-4">
        <CategoryFormFields form={form} idPrefix={idPrefix} />

        {rootError ? (
          <p className="text-sm text-destructive">{rootError}</p>
        ) : null}

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {mode === "create" ? "Tambah Kategori" : "Simpan Perubahan"}
          </Button>
          {mode === "edit" ? (
            <Button type="button" variant="outline" onClick={onDone}>
              Batal
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  )
}

function CategoryRow({
  category,
  onDeleted,
}: {
  category: QuestionCategoryListItem
  onDeleted: () => void
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    const result = await deleteQuestionCategoryAction(category.id)

    if (!result.ok) {
      setError(result.message)
      return
    }

    setConfirmingDelete(false)
    startTransition(() => {
      router.refresh()
    })
    onDeleted()
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{category.name}</TableCell>
      <TableCell className="max-w-md truncate">
        {category.description ?? "—"}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => setEditing(true)}
          >
            Ubah
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            className="text-destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            Hapus
          </Button>
        </div>
      </TableCell>

      {confirmingDelete ? (
        <Dialog open onOpenChange={(open) => setConfirmingDelete(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus kategori?</DialogTitle>
              <DialogDescription>
                Kategori &ldquo;{category.name}&rdquo; akan dihapus permanen.
                Kategori yang masih dipakai soal tidak dapat dihapus.
              </DialogDescription>
            </DialogHeader>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmingDelete(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {editing ? (
        <Dialog open onOpenChange={(open) => setEditing(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ubah Kategori</DialogTitle>
            </DialogHeader>

            <CategoryForm
              idPrefix="edit-category-name"
              mode="edit"
              initial={category}
              onDone={() => {
                setEditing(false)
                router.refresh()
              }}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </TableRow>
  )
}

export function QuestionCategoryManager({
  categories,
}: {
  categories: QuestionCategoryListItem[]
}) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-lg">
        <CategoryForm mode="create" onDone={() => router.refresh()} />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-24 text-center text-muted-foreground"
                >
                  Belum ada kategori. Buat kategori pertama di atas.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <CategoryRow
                  category={category}
                  key={category.id}
                  onDeleted={() => router.refresh()}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
