/**
 * One-off setup: create the S3 bucket (if missing) and attach the public
 * read policy for `media/*` (never `staging/*`). Run after starting MinIO:
 *
 *   pnpm exec tsx scripts/setup-bucket.ts
 */
import { CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand } from "@aws-sdk/client-s3"
import nextEnv from "@next/env"

import { createStorageClient, storageConfig } from "../lib/storage/client"

const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

const { bucket } = storageConfig()
const client = createStorageClient()

async function bucketExists(): Promise<boolean> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))

    return true
  } catch {
    return false
  }
}

async function main() {
  if (!(await bucketExists())) {
    await client.send(new CreateBucketCommand({ Bucket: bucket }))
    console.log(`bucket "${bucket}" created`)
  } else {
    console.log(`bucket "${bucket}" already exists`)
  }

  await client.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucket}/media/*`],
          },
        ],
      }),
    })
  )
  console.log(`public-read policy applied to ${bucket}/media/*`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
