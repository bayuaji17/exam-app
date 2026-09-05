import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  recoverAttemptSessionAction,
  saveAnswerAction,
  startAttemptAction,
} from "@/lib/attempts/actions"
import { resetTokenRateLimit } from "@/lib/exam-schedules/token-rate-limiter"

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}))

const {
  mockSession,
  isEligibleMock,
  selectMock,
  insertMock,
  updateMock,
  deleteMock,
} = vi.hoisted(() => ({
  mockSession: {
    user: { id: "user-123", role: "user" },
    session: { id: "session-device-A" },
  },
  isEligibleMock: vi.fn().mockResolvedValue(true),
  selectMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockImplementation(() => Promise.resolve(mockSession)),
    },
  },
}))

vi.mock("@/lib/eligibility/queries", () => ({
  isUserEligibleForSchedule: (...args: unknown[]) => isEligibleMock(...args),
}))

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
    insert: (...args: unknown[]) => insertMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
    transaction: vi.fn().mockImplementation(async (callback) => {
      return callback({
        select: (...args: unknown[]) => selectMock(...args),
        insert: (...args: unknown[]) => insertMock(...args),
        update: (...args: unknown[]) => updateMock(...args),
        delete: (...args: unknown[]) => deleteMock(...args),
      })
    }),
  },
}))

describe("Session-Pinned Attempt Security", () => {
  const scheduleId = "sched-1"

  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.session.id = "session-device-A"
    resetTokenRateLimit("user-123", scheduleId)
  })

  it("blocks resume from a different active session (foreign device)", async () => {
    mockSession.session.id = "session-device-B"

    selectMock
      // assertWindowOpen
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  startsAt: new Date(Date.now() - 10000),
                  endsAt: new Date(Date.now() + 60000),
                },
              ]),
          }),
        }),
      })
      // loadScheduleConfig (innerJoin)
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    packageId: "pkg-1",
                    kodePaket: "PK1",
                    durationMinutes: 60,
                    attemptLimit: null,
                    shuffle: false,
                    wrongPenalty: null,
                  },
                ]),
            }),
          }),
        }),
      })
      // global active attempt check
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    id: "attempt-1",
                    scheduleId: "sched-1",
                    startedSessionId: "session-device-A",
                    deadlineAt: new Date(Date.now() + 60000),
                  },
                ]),
            }),
          }),
        }),
      })

    const result = await startAttemptAction(scheduleId)
    expect(result.ok).toBe(false)
    expect((result as { message: string }).message).toContain("perangkat lain")
    expect((result as { locked?: boolean }).locked).toBe(true)
  })

  it("resumes seamlessly on the same session (same device reload)", async () => {
    mockSession.session.id = "session-device-A"

    selectMock
      // assertWindowOpen
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  startsAt: new Date(Date.now() - 10000),
                  endsAt: new Date(Date.now() + 60000),
                },
              ]),
          }),
        }),
      })
      // loadScheduleConfig (innerJoin)
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    packageId: "pkg-1",
                    kodePaket: "PK1",
                    durationMinutes: 60,
                    attemptLimit: null,
                    shuffle: false,
                    wrongPenalty: null,
                  },
                ]),
            }),
          }),
        }),
      })
      // global active attempt check -> matches schedule and session
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    id: "attempt-1",
                    scheduleId: "sched-1",
                    startedSessionId: "session-device-A",
                    deadlineAt: new Date(Date.now() + 60000),
                  },
                ]),
            }),
          }),
        }),
      })

    const result = await startAttemptAction(scheduleId)
    expect(result.ok).toBe(true)
    expect((result as { attemptId: string }).attemptId).toBe("attempt-1")
  })

  it("blocks starting when another open attempt exists on a different schedule", async () => {
    selectMock
      // assertWindowOpen
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  startsAt: new Date(Date.now() - 10000),
                  endsAt: new Date(Date.now() + 60000),
                },
              ]),
          }),
        }),
      })
      // loadScheduleConfig (innerJoin)
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    packageId: "pkg-1",
                    kodePaket: "PK1",
                    durationMinutes: 60,
                    attemptLimit: null,
                    shuffle: false,
                    wrongPenalty: null,
                  },
                ]),
            }),
          }),
        }),
      })
      // global active attempt check (on different schedule sched-2)
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    id: "attempt-2",
                    scheduleId: "sched-2",
                    startedSessionId: "session-device-A",
                    deadlineAt: new Date(Date.now() + 60000),
                  },
                ]),
            }),
          }),
        }),
      })

    const result = await startAttemptAction(scheduleId)
    expect(result.ok).toBe(false)
    expect((result as { message: string }).message).toContain("jadwal lain")
  })

  it("rejects answer saves from a mismatched session", async () => {
    mockSession.session.id = "session-device-B"

    selectMock.mockReturnValueOnce({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: "attempt-1",
                  scheduleId: "sched-1",
                  startedSessionId: "session-device-A",
                  deadlineAt: new Date(Date.now() + 60000),
                  endsAt: new Date(Date.now() + 120000),
                  questionOrder: ["q1"],
                },
              ]),
          }),
        }),
      }),
    })

    const result = await saveAnswerAction("attempt-1", "q1", {
      chosenOptionId: "opt-1",
    })

    expect(result.ok).toBe(false)
    expect((result as { message: string }).message).toContain("perangkat lain")
  })

  it("allows audited recovery takeover when current schedule token is verified", async () => {
    mockSession.session.id = "session-device-B"

    // Mock token verification -> load schedule token
    selectMock
      // schedule lookup for token check
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: scheduleId,
                  token: "ABC123",
                  startsAt: new Date(Date.now() - 10000),
                  endsAt: new Date(Date.now() + 60000),
                },
              ]),
          }),
        }),
      })
      // attempt lookup in transaction FOR UPDATE
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: "attempt-1",
                  scheduleId: scheduleId,
                  participantId: "user-123",
                  startedSessionId: "session-device-A",
                  submittedAt: null,
                },
              ]),
          }),
        }),
      })

    const updateSetMock = vi.fn().mockReturnValue({
      where: () => Promise.resolve(),
    })
    updateMock.mockReturnValue({ set: updateSetMock })

    const insertValuesMock = vi.fn().mockReturnValue(Promise.resolve())
    insertMock.mockReturnValue({ values: insertValuesMock })

    const deleteWhereMock = vi.fn().mockReturnValue(Promise.resolve())
    deleteMock.mockReturnValue({ where: deleteWhereMock })

    const result = await recoverAttemptSessionAction({
      attemptId: "attempt-1",
      scheduleId,
      token: "ABC123",
    })

    expect(result.ok).toBe(true)
    expect((result as { attemptId: string }).attemptId).toBe("attempt-1")
    expect(deleteWhereMock).toHaveBeenCalled() // Old session force-revoked
    expect(insertValuesMock).toHaveBeenCalled() // Session transfer audit logged
  })
})
