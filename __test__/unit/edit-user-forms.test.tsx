import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { EditUserBanForm } from "@/components/edit-user-ban-form"
import { EditUserRoleForm } from "@/components/edit-user-role-form"
import { APP_ROLES } from "@/lib/auth-roles"

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}))

const setRoleMock = vi.hoisted(() => vi.fn())
const banUserMock = vi.hoisted(() => vi.fn())
const unbanUserMock = vi.hoisted(() => vi.fn())

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}))

vi.mock("sonner", () => ({
  toast: toastMock,
}))

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    admin: {
      setRole: setRoleMock,
      banUser: banUserMock,
      unbanUser: unbanUserMock,
    },
  },
}))

beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe("EditUserRoleForm", () => {
  it("renders role selection and buttons", () => {
    render(<EditUserRoleForm currentRole={APP_ROLES.USER} userId="user-123" />)

    expect(screen.getByText("Ubah Role")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Simpan Role" })).toBeTruthy()
  })
})

describe("EditUserBanForm", () => {
  it("renders ban form when user is not banned", () => {
    render(
      <EditUserBanForm
        currentBanExpiry={null}
        currentBanReason={null}
        isBanned={false}
        userId="user-123"
      />
    )

    expect(screen.getByText("Status Blokir")).toBeTruthy()
    expect(screen.getByLabelText("Alasan Blokir (opsional)")).toBeTruthy()
    expect(screen.getByLabelText("Permanen")).toBeTruthy()
    expect(screen.getByLabelText("Sementara")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Blokir Akun" })).toBeTruthy()
  })

  it("renders unban view and opens confirmation dialog when user is banned", async () => {
    render(
      <EditUserBanForm
        currentBanExpiry="2026-12-31"
        currentBanReason="Cheating in exam"
        isBanned={true}
        userId="user-123"
      />
    )

    expect(
      screen.getByText(/Akun ini sedang diblokir: Cheating in exam/)
    ).toBeTruthy()
    expect(screen.getByRole("button", { name: "Buka Blokir" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Buka Blokir" }))

    expect(screen.getByText("Konfirmasi Buka Blokir")).toBeTruthy()

    unbanUserMock.mockResolvedValue({ data: {} })
    fireEvent.click(screen.getByRole("button", { name: "Ya, Buka Blokir" }))

    await waitFor(() => {
      expect(unbanUserMock).toHaveBeenCalledWith({ userId: "user-123" })
      expect(toastMock.success).toHaveBeenCalledWith(
        "Blokir pengguna berhasil dibuka."
      )
      expect(routerMock.push).toHaveBeenCalledWith("/dashboard/users")
    })
  })

  it("bans user upon dialog confirmation and triggers success toast", async () => {
    banUserMock.mockResolvedValue({ data: {} })

    render(
      <EditUserBanForm
        currentBanExpiry={null}
        currentBanReason={null}
        isBanned={false}
        userId="user-123"
      />
    )

    fireEvent.change(screen.getByLabelText("Alasan Blokir (opsional)"), {
      target: { value: "Pelanggaran tata tertib" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Blokir Akun" }))

    expect(screen.getByText("Konfirmasi Blokir Akun")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Ya, Blokir Akun" }))

    await waitFor(() => {
      expect(banUserMock).toHaveBeenCalledWith({
        userId: "user-123",
        banReason: "Pelanggaran tata tertib",
        banExpiresIn: undefined,
      })
      expect(toastMock.success).toHaveBeenCalledWith(
        "Pengguna berhasil diblokir."
      )
      expect(routerMock.push).toHaveBeenCalledWith("/dashboard/users")
    })
  })
})
