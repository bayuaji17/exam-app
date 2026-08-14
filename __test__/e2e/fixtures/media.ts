import nextEnv from "@next/env"
import pg from "pg"
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

const { loadEnvConfig } = nextEnv

function env() {
  loadEnvConfig(process.cwd())

  return {
    databaseUrl: process.env.DATABASE_URL!,
    bucket: process.env.S3_BUCKET!,
    endpoint: process.env.S3_ENDPOINT!,
    region: process.env.S3_REGION!,
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  }
}

function storageClient() {
  const config = env()

  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  })
}

/** A tiny valid PNG (1x1, transparent) for upload tests. */
export function testPngBuffer(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  )
}

export async function putObject(key: string, body: Buffer): Promise<void> {
  const config = env()

  await storageClient().send(
    new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: body })
  )
}

export async function objectExists(key: string): Promise<boolean> {
  const config = env()
  const result = await storageClient().send(
    new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: key.split("/").slice(0, 2).join("/"),
    })
  )

  return (result.Contents ?? []).some((object) => object.Key === key)
}

/**
 * Wipe every object in the test bucket. The `exam-app` bucket is dedicated
 * to dev + E2E, so this is safe in teardown; test uploads carry random keys
 * and cannot be matched by prefix.
 */
export async function deleteAllBucketObjects(): Promise<void> {
  const config = env()
  const client = storageClient()
  let continuationToken: string | undefined

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        ContinuationToken: continuationToken,
      })
    )

    for (const object of page.Contents ?? []) {
      if (object.Key) {
        await client.send(
          new DeleteObjectCommand({ Bucket: config.bucket, Key: object.Key })
        )
      }
    }

    continuationToken = page.NextContinuationToken
  } while (continuationToken)
}

export async function deleteAllMediaLedgerRows(): Promise<void> {
  const pool = new pg.Pool({ connectionString: env().databaseUrl })

  try {
    await pool.query('delete from "question_media"')
  } finally {
    await pool.end()
  }
}

export interface MediaLedgerRow {
  id: string
  objectKey: string
  questionId: string | null
  deletedAt: Date | null
}

export async function ledgerRowsForQuestion(
  questionId: string
): Promise<MediaLedgerRow[]> {
  const pool = new pg.Pool({ connectionString: env().databaseUrl })

  try {
    const result = await pool.query<MediaLedgerRow>(
      'select "id", "objectKey", "questionId", "deletedAt" from "question_media" where "questionId" = $1',
      [questionId]
    )

    return result.rows
  } finally {
    await pool.end()
  }
}
