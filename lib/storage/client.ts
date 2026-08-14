/**
 * The S3-compatible client and its configuration (ADR-0003): works with
 * MinIO (dev/test), R2, or AWS S3.
 *
 * `NEXT_PUBLIC_S3_PUBLIC_BASE_URL` is the same variable on both sides:
 * the server resolves media keys when rendering HTML, the client resolves
 * them inside the editor. The other variables are server-only.
 */
import { S3Client } from "@aws-sdk/client-s3"

function required(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is not set.`)
  }

  return value
}

export function storageConfig() {
  return {
    endpoint: required("S3_ENDPOINT"),
    region: process.env.S3_REGION ?? "us-east-1",
    accessKeyId: required("S3_ACCESS_KEY_ID"),
    secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    bucket: required("S3_BUCKET"),
    publicBaseUrl:
      process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL ??
      required("NEXT_PUBLIC_S3_PUBLIC_BASE_URL"),
  }
}

export function createStorageClient(config = storageConfig()) {
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

let storage: S3Client | null = null

/**
 * The shared client, created lazily: scripts load the env after imports run,
 * and the server has env loaded before any request, so an eager singleton at
 * module scope would read unset variables in script contexts.
 */
export function storageClient(): S3Client {
  if (!storage) {
    storage = createStorageClient()
  }

  return storage
}
