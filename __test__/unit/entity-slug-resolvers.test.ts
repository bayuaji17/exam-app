import { describe, expect, it } from "vitest"

import {
  getExamPackageBySlug,
  getExamScheduleBySlug,
  getParticipantGroupBySlug,
  getQuestionBankBySlug,
} from "@/lib/entity-slugs/resolvers"

describe("entity-slug resolvers (mock mode)", () => {
  it("resolves mock question bank with slug", async () => {
    process.env.NEXT_PUBLIC_USE_MOCK = "true"
    const bank = await getQuestionBankBySlug("matematika-dasar")
    expect(bank).not.toBeNull()
    expect(bank?.slug).toBe("matematika-dasar")
    expect(bank?.name).toBe("Matematika Dasar")
  })

  it("resolves mock participant group with slug", async () => {
    process.env.NEXT_PUBLIC_USE_MOCK = "true"
    const group = await getParticipantGroupBySlug("kelas-12-ipa")
    expect(group).not.toBeNull()
    expect(group?.slug).toBe("kelas-12-ipa")
    expect(group?.name).toBe("Kelas 12 Ipa")
  })

  it("resolves mock exam package with slug", async () => {
    process.env.NEXT_PUBLIC_USE_MOCK = "true"
    const pkg = await getExamPackageBySlug("ujian-akhir-semester")
    expect(pkg).not.toBeNull()
    expect(pkg?.slug).toBe("ujian-akhir-semester")
    expect(pkg?.name).toBe("Ujian Akhir Semester")
  })

  it("resolves mock exam schedule with slug", async () => {
    process.env.NEXT_PUBLIC_USE_MOCK = "true"
    const schedule = await getExamScheduleBySlug("sesi-pagi-matematika")
    expect(schedule).not.toBeNull()
    expect(schedule?.slug).toBe("sesi-pagi-matematika")
    expect(schedule?.name).toBe("Sesi Pagi Matematika")
    delete process.env.NEXT_PUBLIC_USE_MOCK
  })
})
