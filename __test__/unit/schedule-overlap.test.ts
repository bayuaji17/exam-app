import { describe, expect, it } from "vitest"

import { windowsOverlap } from "@/lib/exam-schedules/overlap"

const at = (day: number, hour = 8, minute = 0) =>
  new Date(Date.UTC(2026, 7, day, hour, minute, 0))

describe("windowsOverlap", () => {
  it("detects overlapping windows", () => {
    expect(windowsOverlap(at(1), at(1, 10), at(1, 9), at(1, 11))).toBe(true)
    expect(windowsOverlap(at(1), at(1, 10), at(1, 8), at(1, 9, 30))).toBe(true)
  })

  it("treats windows as half-open: end equals start does not overlap", () => {
    expect(windowsOverlap(at(1), at(1, 10), at(1, 10), at(1, 12))).toBe(false)
    expect(windowsOverlap(at(1, 10), at(1, 12), at(1), at(1, 10))).toBe(false)
  })

  it("does not overlap fully separated windows", () => {
    expect(windowsOverlap(at(1), at(1, 10), at(2), at(2, 10))).toBe(false)
  })

  it("handles containment and identical windows", () => {
    expect(windowsOverlap(at(1), at(2), at(1, 6), at(1, 12))).toBe(true)
    expect(windowsOverlap(at(1), at(1, 10), at(1), at(1, 10))).toBe(true)
  })
})
