import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3"
import sharp from "sharp"

import { storageClient, storageConfig } from "./client"
import { isStagingKey, MAX_UPLOAD_BYTES, permanentKeyFor } from "./keys"

/**
 * Server-side size enforcement for the original upload (Q6): reject an
 * object over the limit before anything is converted or stored.
 */
export async function assertOriginalWithinLimit(
  stagingKey: string
): Promise<void> {
  const { bucket } = storageConfig()
  const head = await storageClient().send(
    new HeadObjectCommand({ Bucket: bucket, Key: stagingKey })
  )

  if ((head.ContentLength ?? 0) > MAX_UPLOAD_BYTES) {
    await storageClient().send(
      new DeleteObjectCommand({ Bucket: bucket, Key: stagingKey })
    )

    throw new UploadTooLargeError()
  }
}

export class UploadTooLargeError extends Error {
  constructor() {
    super("File melebihi batas 5 MB.")
    this.name = "UploadTooLargeError"
  }
}

/**
 * Confirm an upload: fetch the original, enforce the size limit, convert to
 * WebP, store the permanent object, and remove the staging object. Returns
 * the permanent media key the editor embeds (Q6).
 */
export async function confirmMediaUpload(
  stagingKey: string
): Promise<{ objectKey: string }> {
  if (!isStagingKey(stagingKey)) {
    throw new Error("Invalid staging key.")
  }

  await assertOriginalWithinLimit(stagingKey)

  const { bucket } = storageConfig()
  const original = await storageClient().send(
    new GetObjectCommand({ Bucket: bucket, Key: stagingKey })
  )

  const buffer = await original.Body?.transformToByteArray()

  if (!buffer) {
    throw new Error("Upload is empty.")
  }

  const webp = await sharp(Buffer.from(buffer)).webp({ quality: 80 }).toBuffer()

  const objectKey = permanentKeyFor()

  await storageClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: webp,
      ContentType: "image/webp",
    })
  )

  await storageClient().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: stagingKey })
  )

  return { objectKey }
}

export async function deleteMediaObject(objectKey: string): Promise<void> {
  const { bucket } = storageConfig()

  await storageClient().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: objectKey })
  )
}

export async function mediaObjectExists(objectKey: string): Promise<boolean> {
  const { bucket } = storageConfig()

  try {
    await storageClient().send(
      new HeadObjectCommand({ Bucket: bucket, Key: objectKey })
    )

    return true
  } catch {
    return false
  }
}
