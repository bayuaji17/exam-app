"use client"

import {
  confirmMediaUploadAction,
  presignMediaUploadAction,
} from "@/lib/question-banks/media-actions"
import { MAX_UPLOAD_BYTES, type UploadableExt } from "@/lib/storage/keys"

/**
 * The client half of the upload flow (Q6): validate type and size locally,
 * presign, PUT straight to object storage, then confirm so the server
 * converts to WebP and returns the permanent media key.
 */
export async function uploadMediaFile(
  file: File
): Promise<{ objectKey: string }> {
  const ext = extensionOf(file.name)

  if (!ext || !["png", "jpeg", "webp"].includes(ext)) {
    throw new Error("Format gambar harus png, jpeg, atau webp.")
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File melebihi batas 5 MB.")
  }

  const presign = await presignMediaUploadAction(ext as UploadableExt)

  if (!presign.ok) {
    throw new Error(presign.message)
  }

  const upload = await fetch(presign.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  })

  if (!upload.ok) {
    throw new Error("Upload gagal. Coba lagi.")
  }

  const confirm = await confirmMediaUploadAction(presign.stagingKey)

  if (!confirm.ok) {
    throw new Error(confirm.message)
  }

  return { objectKey: confirm.objectKey }
}

function extensionOf(fileName: string): string | null {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)

  return match?.[1] ?? null
}
