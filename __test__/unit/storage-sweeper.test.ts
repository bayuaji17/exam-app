import { describe, expect, it, vi } from "vitest"

import {
  isPermanentMediaKey,
  isStagingKey,
  isUploadableExt,
  MAX_UPLOAD_BYTES,
  permanentKeyFor,
  stagingKeyFor,
} from "@/lib/storage/keys"
import {
  ORPHAN_GRACE_PERIOD_MS,
  reconcileOrphans,
  sweepTombstonedRows,
} from "@/lib/storage/sweeper"

describe("keys", () => {
  it("builds staging keys with the allowed extensions only", () => {
    expect(stagingKeyFor("png")).toMatch(/^staging\/[0-9a-f-]{36}\.png$/)
    expect(stagingKeyFor("jpeg")).toMatch(/\.jpeg$/)
    expect(stagingKeyFor("webp")).toMatch(/\.webp$/)
  })

  it("builds permanent keys as media/<uuid>.webp", () => {
    expect(permanentKeyFor()).toMatch(/^media\/[0-9a-f-]{36}\.webp$/)
  })

  it("recognizes only the allowed upload extensions", () => {
    expect(isUploadableExt("png")).toBe(true)
    expect(isUploadableExt("jpeg")).toBe(true)
    expect(isUploadableExt("webp")).toBe(true)
    expect(isUploadableExt("gif")).toBe(false)
    expect(isUploadableExt("mp4")).toBe(false)
  })

  it("matches the content-policy media key shape", () => {
    expect(
      isPermanentMediaKey("media/123e4567-e89b-12d3-a456-426614174000.webp")
    ).toBe(true)
    expect(isPermanentMediaKey("media/123e4567.webp")).toBe(false)
    expect(isPermanentMediaKey("https://x/media/1.webp")).toBe(false)
    expect(
      isStagingKey("staging/123e4567-e89b-12d3-a456-426614174000.png")
    ).toBe(true)
    expect(
      isStagingKey("staging/123e4567-e89b-12d3-a456-426614174000.gif")
    ).toBe(false)
  })

  it("caps uploads at 5 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024)
  })
})

describe("sweepTombstonedRows", () => {
  it("deletes objects and reports ids in order", async () => {
    const deleteObject = vi.fn().mockResolvedValue(undefined)
    const rows = [
      { id: "a", objectKey: "media/1.webp" },
      { id: "b", objectKey: "media/2.webp" },
    ]

    const result = await sweepTombstonedRows(rows, deleteObject)

    expect(result.deleted).toEqual(["a", "b"])
    expect(result.failed).toEqual([])
    expect(deleteObject).toHaveBeenNthCalledWith(1, "media/1.webp")
    expect(deleteObject).toHaveBeenNthCalledWith(2, "media/2.webp")
  })

  it("keeps failed rows out of deleted so the caller retries them", async () => {
    const deleteObject = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(undefined)

    const result = await sweepTombstonedRows(
      [
        { id: "a", objectKey: "media/1.webp" },
        { id: "b", objectKey: "media/2.webp" },
      ],
      deleteObject
    )

    expect(result.deleted).toEqual(["b"])
    expect(result.failed).toEqual(["a"])
  })

  it("does not let one failure block the rest of the batch", async () => {
    const deleteObject = vi.fn().mockRejectedValue(new Error("boom"))

    const result = await sweepTombstonedRows(
      [
        { id: "a", objectKey: "media/1.webp" },
        { id: "b", objectKey: "media/2.webp" },
        { id: "c", objectKey: "media/3.webp" },
      ],
      deleteObject
    )

    expect(deleteObject).toHaveBeenCalledTimes(3)
    expect(result.failed).toEqual(["a", "b", "c"])
  })

  it("is a no-op for an empty batch", async () => {
    const deleteObject = vi.fn()

    const result = await sweepTombstonedRows([], deleteObject)

    expect(result.deleted).toEqual([])
    expect(deleteObject).not.toHaveBeenCalled()
  })
})

describe("reconcileOrphans", () => {
  const future = new Date(Date.now() - ORPHAN_GRACE_PERIOD_MS - 1000)

  it("deletes unowned objects past the grace period", async () => {
    const deleteObject = vi.fn().mockResolvedValue(undefined)

    const deleted = await reconcileOrphans(
      [
        { key: "media/1.webp", lastModified: future },
        { key: "media/2.webp", lastModified: future },
      ],
      new Set(["media/1.webp"]),
      ORPHAN_GRACE_PERIOD_MS,
      deleteObject
    )

    expect(deleted).toEqual(["media/2.webp"])
    expect(deleteObject).toHaveBeenCalledTimes(1)
  })

  it("spares young unowned objects (grace period)", async () => {
    const deleteObject = vi.fn()

    const deleted = await reconcileOrphans(
      [{ key: "media/1.webp", lastModified: new Date() }],
      new Set(),
      ORPHAN_GRACE_PERIOD_MS,
      deleteObject
    )

    expect(deleted).toEqual([])
    expect(deleteObject).not.toHaveBeenCalled()
  })

  it("keeps sweeping past failing deletions", async () => {
    const deleteObject = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined)

    const deleted = await reconcileOrphans(
      [
        { key: "media/1.webp", lastModified: future },
        { key: "media/2.webp", lastModified: future },
      ],
      new Set(),
      ORPHAN_GRACE_PERIOD_MS,
      deleteObject
    )

    expect(deleted).toEqual(["media/2.webp"])
  })
})
