import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DashboardBreadcrumb } from "@/components/dashboard-components/dashboard-breadcrumb"
import { getBreadcrumbSegments } from "@/lib/dashboard/breadcrumb"

let currentPathname = "/dashboard"

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}))

afterEach(() => {
  cleanup()
})

describe("getBreadcrumbSegments", () => {
  it("returns single Dashboard item for /dashboard root", () => {
    const segments = getBreadcrumbSegments("/dashboard")
    expect(segments).toEqual([
      { label: "Dashboard", href: "/dashboard", isCurrentPage: true },
    ])
  })

  it("returns section breadcrumb for /dashboard/question-banks", () => {
    const segments = getBreadcrumbSegments("/dashboard/question-banks")
    expect(segments).toEqual([
      { label: "Dashboard", href: "/dashboard", isCurrentPage: false },
      {
        label: "Bank Soal",
        href: "/dashboard/question-banks",
        isCurrentPage: true,
      },
    ])
  })

  it("handles bank creation /dashboard/question-banks/new", () => {
    const segments = getBreadcrumbSegments("/dashboard/question-banks/new")
    expect(segments).toEqual([
      { label: "Dashboard", href: "/dashboard", isCurrentPage: false },
      {
        label: "Bank Soal",
        href: "/dashboard/question-banks",
        isCurrentPage: false,
      },
      {
        label: "Tambah Bank Soal",
        href: "/dashboard/question-banks/new",
        isCurrentPage: true,
      },
    ])
  })

  it("handles question bank detail and new question authoring", () => {
    const segments = getBreadcrumbSegments(
      "/dashboard/question-banks/bank-123/questions/new"
    )
    expect(segments).toEqual([
      { label: "Dashboard", href: "/dashboard", isCurrentPage: false },
      {
        label: "Bank Soal",
        href: "/dashboard/question-banks",
        isCurrentPage: false,
      },
      {
        label: "Detail Bank",
        href: "/dashboard/question-banks/bank-123",
        isCurrentPage: false,
      },
      {
        label: "Tambah Soal",
        href: "/dashboard/question-banks/bank-123/questions/new",
        isCurrentPage: true,
      },
    ])
  })

  it("handles settings sub-sections /dashboard/settings/security/sessions", () => {
    const segments = getBreadcrumbSegments(
      "/dashboard/settings/security/sessions"
    )
    expect(segments).toEqual([
      { label: "Dashboard", href: "/dashboard", isCurrentPage: false },
      {
        label: "Pengaturan",
        href: "/dashboard/settings",
        isCurrentPage: false,
      },
      {
        label: "Security",
        href: "/dashboard/settings/security",
        isCurrentPage: false,
      },
      {
        label: "Sesi Aktif",
        href: "/dashboard/settings/security/sessions",
        isCurrentPage: true,
      },
    ])
  })

  it("handles participant import /dashboard/users/import", () => {
    const segments = getBreadcrumbSegments("/dashboard/users/import")
    expect(segments).toEqual([
      { label: "Dashboard", href: "/dashboard", isCurrentPage: false },
      { label: "Peserta", href: "/dashboard/users", isCurrentPage: false },
      {
        label: "Import Peserta",
        href: "/dashboard/users/import",
        isCurrentPage: true,
      },
    ])
  })
})

describe("DashboardBreadcrumb component", () => {
  it("renders breadcrumb for the current route", () => {
    currentPathname = "/dashboard/question-banks/bank-1/questions/new"
    render(<DashboardBreadcrumb />)

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Bank Soal" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Detail Bank" })).toBeTruthy()
    expect(screen.getByText("Tambah Soal")).toBeTruthy()
  })
})
