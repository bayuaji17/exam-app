import { describe, expect, it } from "vitest"

import type { TipTapDoc } from "@/lib/content-policy"
import {
  collectMediaKeys,
  computeLedgerChanges,
} from "@/lib/question-banks/media-ledger"

function imageDoc(src: string): TipTapDoc {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "image", attrs: { src, alt: "x" } }],
      },
    ],
  }
}

describe("collectMediaKeys", () => {
  it("collects image srcs from a document", () => {
    const doc = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph",
          content: [
            { type: "image", attrs: { src: "media/a.webp" } },
            { type: "text", text: "teks" },
            { type: "image", attrs: { src: "media/b.webp" } },
          ],
        },
      ],
    }

    expect(collectMediaKeys(doc)).toEqual(["media/a.webp", "media/b.webp"])
  })

  it("returns an empty list for null or text-only documents", () => {
    expect(collectMediaKeys(null)).toEqual([])
    expect(
      collectMediaKeys({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "x" }] },
        ],
      })
    ).toEqual([])
  })
})

describe("computeLedgerChanges", () => {
  const rows = [
    { id: "r1", objectKey: "media/1.webp", deletedAt: null },
    { id: "r2", objectKey: "media/2.webp", deletedAt: null },
    { id: "r3", objectKey: "media/3.webp", deletedAt: new Date() },
  ]

  it("inserts keys not yet owned", () => {
    const changes = computeLedgerChanges(rows, ["media/2.webp", "media/4.webp"])

    expect(changes.insert).toEqual([{ objectKey: "media/4.webp" }])
    expect(changes.tombstone).toEqual(["r1"])
  })

  it("re-registers a tombstoned row by inserting its key again", () => {
    const changes = computeLedgerChanges(rows, ["media/3.webp"])

    expect(changes.insert).toEqual([{ objectKey: "media/3.webp" }])
    expect(changes.tombstone).toEqual(["r1", "r2"])
  })

  it("is a no-op when nothing changed", () => {
    const changes = computeLedgerChanges(rows, ["media/1.webp", "media/2.webp"])

    expect(changes.insert).toEqual([])
    expect(changes.tombstone).toEqual([])
  })

  it("ignores duplicate references", () => {
    const changes = computeLedgerChanges([], ["media/1.webp", "media/1.webp"])

    expect(changes.insert).toEqual([{ objectKey: "media/1.webp" }])
  })
})

describe("collectMediaKeys across prompt and options", () => {
  it("gathers keys from multiple documents", () => {
    const keys = [
      ...collectMediaKeys(imageDoc("media/1.webp")),
      ...collectMediaKeys(imageDoc("media/2.webp")),
      ...collectMediaKeys(null),
    ]

    expect(keys).toEqual(["media/1.webp", "media/2.webp"])
  })
})
