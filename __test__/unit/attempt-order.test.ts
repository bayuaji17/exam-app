import { describe, expect, it } from "vitest"

import { buildQuestionOrder, seededShuffle } from "@/lib/attempts/order"

describe("seededShuffle", () => {
  it("keeps every item exactly once", () => {
    const items = ["a", "b", "c", "d", "e"]
    const shuffled = seededShuffle(items, "attempt-1")

    expect(shuffled.sort()).toEqual(items.sort())
  })

  it("is deterministic for the same seed", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g", "h"]

    expect(seededShuffle(items, "seed-x")).toEqual(seededShuffle(items, "seed-x"))
  })

  it("differs across seeds", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g", "h"]

    expect(seededShuffle(items, "seed-x")).not.toEqual(seededShuffle(items, "seed-y"))
  })

  it("does not mutate the input", () => {
    const items = ["a", "b", "c"]

    seededShuffle(items, "seed")

    expect(items).toEqual(["a", "b", "c"])
  })

  it("handles a single item and an empty list", () => {
    expect(seededShuffle(["only"], "seed")).toEqual(["only"])
    expect(seededShuffle([], "seed")).toEqual([])
  })
})

describe("buildQuestionOrder", () => {
  it("returns the package order when shuffling is off", () => {
    const ids = ["q1", "q2", "q3"]

    expect(buildQuestionOrder(ids, false, "attempt-1")).toEqual(ids)
  })

  it("returns a fresh array, never the input", () => {
    const ids = ["q1", "q2", "q3"]
    const order = buildQuestionOrder(ids, false, "attempt-1")

    expect(order).not.toBe(ids)
  })

  it("shuffles deterministically when shuffling is on", () => {
    const ids = ["q1", "q2", "q3", "q4", "q5", "q6"]

    expect(buildQuestionOrder(ids, true, "attempt-1")).toEqual(
      buildQuestionOrder(ids, true, "attempt-1")
    )
  })
})
