import { describe, expect, it } from "vitest"

import {
  buildTableUrl,
  parseTableParams,
} from "@/lib/exam-schedules/table-params"
import {
  examScheduleSchema,
  validateScheduleWindow,
} from "@/lib/exam-schedules/validation"
import { scheduleStatus } from "@/lib/exam-schedules/queries"

describe("examScheduleSchema", () => {
  it("accepts a minimal valid schedule", () => {
    const result = examScheduleSchema.safeParse({
      name: "UTS Matematika",
      packageId: "pkg-1",
      startsAt: "2026-09-01T08:00",
      endsAt: "2026-09-01T10:00",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.durationMinutes).toBeUndefined()
    }
  })

  it("accepts an optional duration override", () => {
    const result = examScheduleSchema.safeParse({
      name: "UAS",
      packageId: "pkg-1",
      startsAt: "2026-09-01T08:00",
      endsAt: "2026-09-01T10:00",
      durationMinutes: 90,
    })

    expect(result.success).toBe(true)
  })

  it("rejects a missing name and package", () => {
    expect(
      examScheduleSchema.safeParse({
        packageId: "p",
        startsAt: "2026-01-01T08:00",
        endsAt: "2026-01-01T09:00",
      }).success
    ).toBe(false)
    expect(
      examScheduleSchema.safeParse({
        name: "x",
        startsAt: "2026-01-01T08:00",
        endsAt: "2026-01-01T09:00",
      }).success
    ).toBe(false)
  })

  it("rejects invalid datetimes", () => {
    expect(
      examScheduleSchema.safeParse({
        name: "x",
        packageId: "p",
        startsAt: "bukan-waktu",
        endsAt: "2026-01-01T09:00",
      }).success
    ).toBe(false)
  })

  it("rejects a non-positive duration", () => {
    expect(
      examScheduleSchema.safeParse({
        name: "x",
        packageId: "p",
        startsAt: "2026-01-01T08:00",
        endsAt: "2026-01-01T09:00",
        durationMinutes: 0,
      }).success
    ).toBe(false)
  })

  it("treats NaN duration as absent", () => {
    const result = examScheduleSchema.safeParse({
      name: "x",
      packageId: "p",
      startsAt: "2026-01-01T08:00",
      endsAt: "2026-01-01T09:00",
      durationMinutes: Number.NaN,
    })

    expect(result.success).toBe(true)
  })
})

describe("validateScheduleWindow", () => {
  it("accepts a start before end", () => {
    expect(
      validateScheduleWindow("2026-01-01T08:00", "2026-01-01T09:00")
    ).toBeNull()
  })

  it("rejects an end at or before the start", () => {
    expect(
      validateScheduleWindow("2026-01-01T09:00", "2026-01-01T09:00")
    ).toContain("setelah")
    expect(
      validateScheduleWindow("2026-01-01T10:00", "2026-01-01T09:00")
    ).toContain("setelah")
  })
})

describe("scheduleStatus", () => {
  const startsAt = new Date("2026-09-01T08:00:00Z")
  const endsAt = new Date("2026-09-01T10:00:00Z")

  it("derives upcoming before the window", () => {
    expect(
      scheduleStatus(startsAt, endsAt, new Date("2026-08-31T00:00:00Z"))
    ).toBe("upcoming")
  })

  it("derives ongoing inside the window", () => {
    expect(
      scheduleStatus(startsAt, endsAt, new Date("2026-09-01T09:00:00Z"))
    ).toBe("ongoing")
  })

  it("derives ended after the window", () => {
    expect(
      scheduleStatus(startsAt, endsAt, new Date("2026-09-01T11:00:00Z"))
    ).toBe("ended")
  })
})

describe("parseTableParams", () => {
  it("defaults to upcoming-first ordering", () => {
    expect(parseTableParams(new URLSearchParams())).toEqual({
      q: "",
      sort: "startsAt",
      order: "asc",
      page: 1,
      size: 10,
      status: undefined,
    })
  })

  it("parses the status filter and validates it", () => {
    expect(parseTableParams(new URLSearchParams("status=ongoing")).status).toBe(
      "ongoing"
    )
    expect(
      parseTableParams(new URLSearchParams("status=deleted")).status
    ).toBeUndefined()
  })

  it("parses search, sort, and pagination", () => {
    const params = parseTableParams(
      new URLSearchParams("q=uts&sort=name&order=desc&page=2&size=25")
    )

    expect(params).toEqual({
      q: "uts",
      sort: "name",
      order: "desc",
      page: 2,
      size: 25,
      status: undefined,
    })
  })
})

describe("buildTableUrl", () => {
  it("returns the bare path for defaults", () => {
    expect(
      buildTableUrl("/dashboard/exam-schedules", {
        q: "",
        sort: "startsAt",
        order: "asc",
        page: 1,
        size: 10,
        status: undefined,
      })
    ).toBe("/dashboard/exam-schedules")
  })

  it("serializes non-defaults including the status filter", () => {
    const url = buildTableUrl("/dashboard/exam-schedules", {
      q: "uts",
      sort: "name",
      order: "desc",
      page: 2,
      size: 25,
      status: "upcoming",
    })

    expect(url).toBe(
      "/dashboard/exam-schedules?q=uts&status=upcoming&sort=name&order=desc&page=2&size=25"
    )
  })
})
