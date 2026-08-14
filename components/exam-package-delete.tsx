"use client"

import { useState, useTransition } from "react"
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
import { deleteExamPackageAction } from "@/lib/exam-packages/actions"

/**
 * Terminal package deletion with confirmation. Compositions cascade; the
 * questions themselves are untouched (FK restrict).
 */
export function ExamPackageDelete({ examId }: { examId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    const result = await deleteExamPackageAction(examId)

    if (!result.ok) {
      setError(result.message)
      return
    }

    startTransition(() => {
      router.push("/dashboard/exams")
    })
  }

  return (
    <>
      <Button
        size="sm"
        type="button"
        variant="outline"
        className="text-destructive"
        onClick={() => setConfirming(true)}
      >
        Hapus Paket
      </Button>

      {confirming ? (
        <Dialog open onOpenChange={(open) => setConfirming(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus paket ujian?</DialogTitle>
              <DialogDescription>
                Susunan soal di dalam paket ini akan ikut terhapus, tetapi
                soal-soalnya sendiri tetap aman di bank soal. Tindakan ini
                tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirming(false)}
              >
                Batal
              </Button>
              <Button
                disabled={isPending}
                type="button"
                variant="destructive"
                onClick={handleDelete}
              >
                Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}
