import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SidebarProvider } from "@/components/ui/sidebar"
import {
  SidebarSkeleton,
  ProfileMenuSkeleton,
  StatsCardsSkeleton,
  TableSkeleton,
  UpcomingSchedulesSkeleton,
  BankDetailSkeleton,
} from "@/components/dashboard-components/skeletons"

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(() => {
  cleanup()
})

describe("Dashboard Skeleton Components", () => {
  describe("SidebarSkeleton", () => {
    it("renders sidebar skeleton with accessible aria label", () => {
      render(
        <SidebarProvider>
          <SidebarSkeleton />
        </SidebarProvider>
      )

      const sidebar = screen.getByLabelText("Loading sidebar navigation")
      expect(sidebar).toBeTruthy()
      expect(sidebar.getAttribute("aria-busy")).toBe("true")
    })
  })

  describe("ProfileMenuSkeleton", () => {
    it("renders profile menu skeleton with accessible aria label", () => {
      render(<ProfileMenuSkeleton />)

      const profile = screen.getByLabelText("Loading user profile")
      expect(profile).toBeTruthy()
      expect(profile.getAttribute("aria-busy")).toBe("true")
    })
  })

  describe("StatsCardsSkeleton", () => {
    it("renders 6 stat cards with accessible aria label", () => {
      const { container } = render(<StatsCardsSkeleton />)

      const cards = screen.getByLabelText("Loading dashboard statistics")
      expect(cards).toBeTruthy()
      expect(cards.getAttribute("aria-busy")).toBe("true")

      const skeletons = container.querySelectorAll("[data-slot='skeleton']")
      expect(skeletons.length).toBe(12) // 6 cards * 2 skeletons (number & label)
    })
  })

  describe("TableSkeleton", () => {
    it("renders default 5 rows and 4 columns", () => {
      const { container } = render(<TableSkeleton />)

      const table = screen.getByLabelText("Loading table data")
      expect(table).toBeTruthy()
      expect(table.getAttribute("aria-busy")).toBe("true")

      const skeletons = container.querySelectorAll("[data-slot='skeleton']")
      expect(skeletons.length).toBeGreaterThan(10)
    })

    it("renders custom rows and columns", () => {
      const { container } = render(<TableSkeleton rows={3} columns={2} />)

      const skeletons = container.querySelectorAll("[data-slot='skeleton']")
      // 2 (title & button) + 2 (header cols) + 3 * 2 (row cols) = 10
      expect(skeletons.length).toBe(10)
    })
  })

  describe("UpcomingSchedulesSkeleton", () => {
    it("renders upcoming schedules skeleton structure", () => {
      render(<UpcomingSchedulesSkeleton />)

      const container = screen.getByLabelText("Loading upcoming schedules")
      expect(container).toBeTruthy()
      expect(container.getAttribute("aria-busy")).toBe("true")
    })
  })

  describe("BankDetailSkeleton", () => {
    it("renders bank detail skeleton with 3 metric cards", () => {
      const { container } = render(<BankDetailSkeleton />)

      const bankDetail = screen.getByLabelText("Loading question bank details")
      expect(bankDetail).toBeTruthy()
      expect(bankDetail.getAttribute("aria-busy")).toBe("true")

      const skeletons = container.querySelectorAll("[data-slot='skeleton']")
      // title, subtitle + 3 metric cards = 5
      expect(skeletons.length).toBe(5)
    })
  })
})
