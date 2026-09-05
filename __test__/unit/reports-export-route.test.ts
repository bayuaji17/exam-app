import { describe, expect, it, vi } from "vitest"

import { GET } from "@/app/api/reports/exam-results/[scheduleId]/route"
import { auth } from "@/lib/auth"
import { userHasPermission } from "@/lib/auth/permissions"
import { getUserEffectivePermissions } from "@/lib/auth/rbac-queries"
import { exportReportBuffer } from "@/lib/reports/export"
import { getScheduleReportData } from "@/lib/reports/queries"
import type { ScheduleReportSummary } from "@/lib/reports/types"

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

vi.mock("@/lib/auth/permissions", () => ({
  userHasPermission: vi.fn(),
}))

vi.mock("@/lib/auth/rbac-queries", () => ({
  getUserEffectivePermissions: vi.fn(),
}))

vi.mock("@/lib/reports/queries", () => ({
  getScheduleReportData: vi.fn(),
}))

vi.mock("@/lib/reports/export", () => ({
  exportReportBuffer: vi.fn(),
}))

function createMockSession(role: string, id: string = "u-1") {
  return {
    user: {
      id,
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      role,
    },
    session: {
      id: "sess-1",
      userId: id,
      token: "tok",
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>
}

const mockScheduleSummary: ScheduleReportSummary = {
  scheduleId: "s-1",
  scheduleTitle: "Ujian MTK",
  scheduleSlug: "ujian-mtk",
  packageTitle: "Paket MTK",
  passScore: 75,
  totalPoints: 100,
  stats: {
    totalParticipantsEligible: 10,
    totalAttemptsStarted: 8,
    totalAttemptsSubmitted: 8,
    totalFullyGraded: 8,
    passingCount: 6,
    failingCount: 2,
    passingRate: 75,
    averageScore: 80,
    medianScore: 80,
    highestScore: 95,
    lowestScore: 60,
    standardDeviation: 10,
    distribution: [],
  },
  participants: [],
}

describe("GET /api/reports/exam-results/[scheduleId]", () => {
  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null)

    const request = new Request("http://localhost/api/reports/exam-results/s-1")
    const response = await GET(request, {
      params: Promise.resolve({ scheduleId: "s-1" }),
    })

    expect(response.status).toBe(401)
  })

  it("returns 403 when user does not have reports:export permission", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(createMockSession("user", "u-1"))
    vi.mocked(getUserEffectivePermissions).mockResolvedValueOnce([])
    vi.mocked(userHasPermission).mockReturnValue(false)

    const request = new Request("http://localhost/api/reports/exam-results/s-1")
    const response = await GET(request, {
      params: Promise.resolve({ scheduleId: "s-1" }),
    })

    expect(response.status).toBe(403)
  })

  it("returns 404 when schedule report data is not found", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(createMockSession("admin", "u-admin"))
    vi.mocked(getUserEffectivePermissions).mockResolvedValueOnce(["reports:export"])
    vi.mocked(userHasPermission).mockReturnValue(true)
    vi.mocked(getScheduleReportData).mockResolvedValueOnce(null)

    const request = new Request("http://localhost/api/reports/exam-results/s-not-found")
    const response = await GET(request, {
      params: Promise.resolve({ scheduleId: "s-not-found" }),
    })

    expect(response.status).toBe(404)
  })

  it("returns 200 with attachment stream when authorized and schedule exists", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(createMockSession("admin", "u-admin"))
    vi.mocked(getUserEffectivePermissions).mockResolvedValueOnce(["reports:export"])
    vi.mocked(userHasPermission).mockReturnValue(true)
    vi.mocked(getScheduleReportData).mockResolvedValueOnce(mockScheduleSummary)
    vi.mocked(exportReportBuffer).mockResolvedValueOnce({
      buffer: Buffer.from("dummy-xlsx-content"),
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: "laporan-hasil-ujian-mtk-123.xlsx",
    })

    const request = new Request(
      "http://localhost/api/reports/exam-results/s-1?format=xlsx"
    )
    const response = await GET(request, {
      params: Promise.resolve({ scheduleId: "s-1" }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    expect(response.headers.get("Content-Disposition")).toContain(
      'attachment; filename="laporan-hasil-ujian-mtk-123.xlsx"'
    )
  })
})
