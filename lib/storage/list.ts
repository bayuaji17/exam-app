import { ListObjectsV2Command } from "@aws-sdk/client-s3"

import { storageClient, storageConfig } from "./client"

export interface StorageObject {
  key: string
  lastModified: Date | undefined
}

/**
 * List the permanent media objects (`media/*`). Used by the reconciliation
 * pass of the sweeper (Q1/Q2).
 */
export async function listMediaObjects(): Promise<StorageObject[]> {
  const { bucket } = storageConfig()
  const objects: StorageObject[] = []
  let continuationToken: string | undefined

  do {
    const page = await storageClient().send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: "media/",
        ContinuationToken: continuationToken,
      })
    )

    for (const object of page.Contents ?? []) {
      if (object.Key) {
        objects.push({ key: object.Key, lastModified: object.LastModified })
      }
    }

    continuationToken = page.NextContinuationToken
  } while (continuationToken)

  return objects
}
