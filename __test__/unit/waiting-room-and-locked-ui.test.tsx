import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ScheduleTokenCell } from "@/components/schedule-token-cell"

vi.mock("@/lib/exam-schedules/actions", () => ({
  regenerateScheduleTokenAction: vi
    .fn()
    .mockResolvedValue({ ok: true, token: "NEW123" }),
  verifyExamScheduleTokenAction: vi
    .fn()
    .mockResolvedValue({ ok: true, scheduleId: "sched-1" }),
}))

describe("ScheduleTokenCell Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the token correctly", () => {
    render(
      <ScheduleTokenCell scheduleId="sched-1" initialToken="ABCDEF" />
    )
    expect(screen.getByText("ABCDEF")).toBeDefined()
  })

  it("renders dash when token is null", () => {
    render(
      <ScheduleTokenCell scheduleId="sched-1" initialToken={null} />
    )
    expect(screen.getByText("—")).toBeDefined()
  })
})
