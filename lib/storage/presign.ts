import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { PutObjectCommand } from "@aws-sdk/client-s3"

import { storageClient, storageConfig } from "./client"

/**
 * A presigned PUT for a staging key. The client uploads straight to object
 * storage; the server never round-trips the original bytes (Q1).
 */
export async function createPresignedPut(stagingKey: string): Promise<string> {
  const { bucket } = storageConfig()

  return getSignedUrl(
    storageClient(),
    new PutObjectCommand({ Bucket: bucket, Key: stagingKey }),
    { expiresIn: 300 }
  )
}
