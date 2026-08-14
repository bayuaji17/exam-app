import { describe, expect, it } from "vitest"
import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { question, questionBank } from "@/lib/db/schema"
import { eligibleQuestionConditions } from "@/lib/question-banks/question-queries"
import { isConsequenceArchive } from "@/lib/question-banks/restore-rule"

describe("eligibleQuestionConditions", () => {
  it("enforces both the question and its bank to be non-archived", () => {
    const query = db
      .select()
      .from(question)
      .innerJoin(questionBank, eq(question.bankId, questionBank.id))
      .where(and(eq(question.bankId, "b1"), ...eligibleQuestionConditions()))
      .toSQL()

    expect(query.sql).toContain('"question"."archivedAt" is null')
    expect(query.sql).toContain('"question_bank"."archivedAt" is null')
    expect(query.sql).toMatch(/where \(.*and.*\)/)
  })
})

describe("restore selection rule", () => {
  it("restores questions archived with the bank, leaves independent archives", () => {
    const bankArchivedAt = new Date("2026-08-01T00:00:00Z")

    expect(isConsequenceArchive({ id: "q1", archivedWithBankAt: bankArchivedAt }, bankArchivedAt)).toBe(true)
    expect(isConsequenceArchive({ id: "q2", archivedWithBankAt: null }, bankArchivedAt)).toBe(false)
    expect(
      isConsequenceArchive({ id: "q3", archivedWithBankAt: new Date("2026-07-01T00:00:00Z") }, bankArchivedAt)
    ).toBe(false)
  })

  it("is timestamp-exact: a different archive moment does not match", () => {
    const bankArchivedAt = new Date("2026-08-01T00:00:00Z")
    const later = new Date(bankArchivedAt.getTime() + 1000)

    expect(isConsequenceArchive({ id: "q", archivedWithBankAt: later }, bankArchivedAt)).toBe(false)
  })
})
