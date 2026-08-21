"use client"

import { useMemo, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { TableDescriptionTooltip } from "@/components/table-description-tooltip"
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
          rows={3}
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
      const msg = result.message ?? "Aksi gagal."
      setRootError(msg)
      toast.error(msg)
      return
    }

    if (mode === "create") {
      toast.success("Kategori berhasil ditambahkan.")
      form.reset({ name: "", description: "" })
    } else {
      toast.success("Kategori berhasil diperbarui.")
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

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {mode === "create" ? (
              <>
                <Plus className="size-4" />
                Tambah Kategori
              </>
            ) : (
              "Simpan Perubahan"
            )}
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
    setError(null)
    const result = await deleteQuestionCategoryAction(category.id)

    if (!result.ok) {
      const msg = result.message ?? "Aksi gagal."
      setError(msg)
      toast.error(msg)
      return
    }

    toast.success(`Kategori "${category.name}" berhasil dihapus.`)
    setConfirmingDelete(false)
    startTransition(() => {
      router.refresh()
    })
    onDeleted()
  }

  return (
    <TableRow>
      <TableCell className="font-medium text-foreground">
        {category.name}
      </TableCell>
      <TableCell className="max-w-xs truncate md:max-w-md">
        <TableDescriptionTooltip description={category.description} />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Button size="sm" type="button" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
            Ubah
          </Button>
          <Button
            size="sm"
            type="button"
            variant="destructive"
            onClick={() => {
              setError(null)
              setConfirmingDelete(true)
            }}
          >
            <Trash2 className="size-3.5" />
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
                <Trash2 className="size-3.5" />
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
              <DialogDescription>
                Sesuaikan informasi nama dan deskripsi kategori soal.
              </DialogDescription>
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
  const [searchQuery, setSearchQuery] = useState("")

  const trimmedQuery = searchQuery.trim().toLowerCase()

  const filteredCategories = useMemo(() => {
    if (!trimmedQuery) {
      return categories
    }

    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(trimmedQuery) ||
        (cat.description &&
          cat.description.toLowerCase().includes(trimmedQuery))
    )
  }, [categories, trimmedQuery])

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
      {/* 1. Left Column: Create Category Card */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs lg:col-span-5">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
            <Tag className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Tambah Kategori Baru
            </h2>
            <p className="text-xs text-muted-foreground">
              Buat kategori untuk mengelompokkan soal.
            </p>
          </div>
        </div>

        <CategoryForm mode="create" onDone={() => router.refresh()} />
      </div>

      {/* 2. Right Column: Categories List Table Card */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs lg:col-span-7">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Daftar Kategori
            </h2>
            <p className="text-xs text-muted-foreground">
              Kelola kategori soal yang telah didaftarkan.
            </p>
          </div>
          <Badge variant="secondary" className="font-normal">
            {categories.length} Kategori
          </Badge>
        </div>

        {/* Client-side Search Input */}
        <div className="relative mb-4">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Cari kategori"
            className="pl-9"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau deskripsi kategori..."
            value={searchQuery}
          />
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="w-[140px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {searchQuery
                      ? "Tidak ada kategori yang cocok dengan pencarian."
                      : "Belum ada kategori. Buat kategori pertama pada formulir di sebelah kiri."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
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

        {/* Disabled Pagination Control Placeholder */}
        <div className="mt-4 flex flex-col gap-3 pt-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            Menampilkan {filteredCategories.length} dari {categories.length}{" "}
            kategori
          </div>
          <div className="flex items-center gap-1.5 opacity-60">
            <Button
              aria-label="Halaman sebelumnya"
              disabled
              size="sm"
              variant="outline"
              className="size-8 p-0"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              aria-label="Halaman 1"
              disabled
              size="sm"
              variant="outline"
              className="size-8 p-0 font-medium"
            >
              1
            </Button>
            <Button
              aria-label="Halaman berikutnya"
              disabled
              size="sm"
              variant="outline"
              className="size-8 p-0"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
