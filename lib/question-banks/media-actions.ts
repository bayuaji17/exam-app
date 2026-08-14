"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { confirmMediaUpload, UploadTooLargeError } from "@/lib/storage/confirm"
import {
  isUploadableExt,
  stagingKeyFor,
  type UploadableExt,
} from "@/lib/storage/keys"
import { createPresignedPut } from "@/lib/storage/presign"

const QUESTION_BANKS_PATH = "/dashboard/question-banks"

/**
 * A server action is an untrusted entry point: authenticate the caller and
 * authorize the route before touching storage.
 */
async function requireMediaManager() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, QUESTION_BANKS_PATH)) {
    redirect("/dashboard/forbidden")
  }
}

export interface PresignMediaResult {
  ok: true
  uploadUrl: string
  stagingKey: string
}

export interface MediaError {
  ok: false
  message: string
}

/**
 * Step 1 of the upload flow: hand the client a presigned PUT for a staging
 * key (png/jpeg/webp only — Q6).
 */
export async function presignMediaUploadAction(
  ext: string
): Promise<PresignMediaResult | MediaError> {
  await requireMediaManager()

  if (!isUploadableExt(ext)) {
    return { ok: false, message: "Format gambar harus png, jpeg, atau webp." }
  }

  const uploadExt: UploadableExt = ext
  const stagingKey = stagingKeyFor(uploadExt)

  const uploadUrl = await createPresignedPut(stagingKey)

  return { ok: true, uploadUrl, stagingKey }
}

export interface ConfirmMediaResult {
  ok: true
  objectKey: string
}

/**
 * Step 2: the client uploaded the original; the server enforces the 5 MB
 * limit (Q6), converts to WebP, stores the permanent object, and drops the
 * staging object. Returns the media key the editor embeds.
 */
export async function confirmMediaUploadAction(
  stagingKey: string
): Promise<ConfirmMediaResult | MediaError> {
  await requireMediaManager()

  try {
    const { objectKey } = await confirmMediaUpload(stagingKey)

    return { ok: true, objectKey }
  } catch (error) {
    if (error instanceof UploadTooLargeError) {
      return { ok: false, message: error.message }
    }

    throw error
  }
}
