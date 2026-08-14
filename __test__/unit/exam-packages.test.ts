import { describe, expect, it } from "vitest"

import {
  buildTableUrl,
  parseTableParams,
} from "@/lib/exam-packages/table-params"
import { examPackageSchema } from "@/lib/exam-packages/validation"
import { swapPositions } from "@/lib/exam-packages/order"

describe("examPackageSchema", () => {
  it("accepts a minimal valid package", () => {
    const result = examPackageSchema.safeParse({ name: "UTS Matematika" })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.shuffle).toBe(false)
      expect(result.data.durationMinutes).toBeUndefined()
      expect(result.data.passScore).toBeUndefined()
    }
  })

  it("accepts the full configuration", () => {
    const result = examPackageSchema.safeParse({
      name: "UAS",
      description: "Semester ganjil",
      durationMinutes: 90,
      shuffle: true,
      passScore: 60,
    })

    expect(result.success).toBe(true)
  })

  it("rejects a missing or blank name", () => {
    expect(examPackageSchema.safeParse({}).success).toBe(false)
    expect(examPackageSchema.safeParse({ name: "  " }).success).toBe(false)
  })

  it("rejects a non-positive duration", () => {
    expect(
      examPackageSchema.safeParse({ name: "P", durationMinutes: 0 }).success
    ).toBe(false)
    expect(
      examPackageSchema.safeParse({ name: "P", durationMinutes: -5 }).success
    ).toBe(false)
    expect(
      examPackageSchema.safeParse({ name: "P", durationMinutes: 1.5 }).success
    ).toBe(false)
  })

  it("treats NaN number inputs (empty form fields) as absent", () => {
    const result = examPackageSchema.safeParse({
      name: "P",
      durationMinutes: Number.NaN,
      passScore: Number.NaN,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.durationMinutes).toBeUndefined()
      expect(result.data.passScore).toBeUndefined()
    }
  })

  it("rejects a negative pass score and out-of-range values", () => {
    expect(examPackageSchema.safeParse({ name: "P", passScore: -1 }).success).toBe(false)
    expect(examPackageSchema.safeParse({ name: "P", passScore: 1001 }).success).toBe(false)
    expect(examPackageSchema.safeParse({ name: "P", passScore: 0 }).success).toBe(true)
  })

  it("trims the name", () => {
    const result = examPackageSchema.safeParse({ name: "  UAS  " })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("UAS")
    }
  })
})

describe("parseTableParams", () => {
  it("returns defaults for an empty search", () => {
    expect(parseTableParams(new URLSearchParams())).toEqual({
      q: "",
      sort: "createdAt",
      order: "desc",
      page: 1,
      size: 10,
    })
  })

  it("parses search, sort, and pagination", () => {
    const params = parseTableParams(
      new URLSearchParams("q=uas&sort=name&order=asc&page=2&size=50")
    )

    expect(params).toEqual({
      q: "uas",
      sort: "name",
      order: "asc",
      page: 2,
      size: 50,
    })
  })

  it("falls back for unknown sort columns and sizes", () => {
    expect(parseTableParams(new URLSearchParams("sort=passScore")).sort).toBe("createdAt")
    expect(parseTableParams(new URLSearchParams("size=999")).size).toBe(10)
  })
})

describe("buildTableUrl", () => {
  it("returns the bare path for defaults", () => {
    expect(
      buildTableUrl("/dashboard/exams", {
        q: "",
        sort: "createdAt",
        order: "desc",
        page: 1,
        size: 10,
      })
    ).toBe("/dashboard/exams")
  })

  it("serializes non-defaults", () => {
    const url = buildTableUrl("/dashboard/exams", {
      q: "uas",
      sort: "name",
      order: "asc",
      page: 2,
      size: 25,
    })

    expect(url).toBe("/dashboard/exams?q=uas&sort=name&order=asc&page=2&size=25")
  })
})

describe("swapPositions", () => {
  it("exchanges the two positions", () => {
    const swap = swapPositions(
      { id: "a", position: 2 },
      { id: "b", position: 3 }
    )

    expect(swap).toEqual({
      first: { id: "a", position: 3 },
      second: { id: "b", position: 2 },
    })
  })
})
