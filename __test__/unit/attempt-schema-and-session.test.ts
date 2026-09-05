import { describe, expect, it } from "vitest"
import { attempt, attemptSessionTransfer, examSchedule } from "@/lib/db/schema"

describe("Schema Definitions for Session Pinning & Tokens", () => {
  it("defines token column on exam_schedule", () => {
    expect(examSchedule.token).toBeDefined()
    expect(examSchedule.token.dataType).toBe("string")
  })

  it("defines startedSessionId and submissionType on attempt", () => {
    expect(attempt.startedSessionId).toBeDefined()
    expect(attempt.startedSessionId.dataType).toBe("string")

    expect(attempt.submissionType).toBeDefined()
    expect(attempt.submissionType.dataType).toBe("string")
  })

  it("defines attemptSessionTransfer table with foreign keys and audit fields", () => {
    expect(attemptSessionTransfer).toBeDefined()
    expect(attemptSessionTransfer.id).toBeDefined()
    expect(attemptSessionTransfer.attemptId).toBeDefined()
    expect(attemptSessionTransfer.participantId).toBeDefined()
    expect(attemptSessionTransfer.previousSessionId).toBeDefined()
    expect(attemptSessionTransfer.newSessionId).toBeDefined()
    expect(attemptSessionTransfer.ipAddress).toBeDefined()
    expect(attemptSessionTransfer.userAgent).toBeDefined()
    expect(attemptSessionTransfer.reason).toBeDefined()
    expect(attemptSessionTransfer.transferredAt).toBeDefined()
  })
})
