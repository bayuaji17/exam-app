import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { EditUserBanForm } from "@/components/edit-user-ban-form"
import { EditUserIdentifiersForm } from "@/components/edit-user-identifiers-form"
import { EditUserRoleForm } from "@/components/edit-user-role-form"
import { APP_ROLES } from "@/lib/auth-roles"

const pushMock = vi.fn()
const toastMock = {
  success: vi.fn(),
  error: vi.fn(),
}

const banUserMock = vi.fn()
const unbanUserMock = vi.fn()
const setRoleMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: vi.fn(),
  }),
}))

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastMock.success(...args),
    error: (...args: unknown[]) => toastMock.error(...args),
  },
}))

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    admin: {
      banUser: (...args: unknown[]) => banUserMock(...args),
      unbanUser: (...args: unknown[]) => unbanUserMock(...args),
      setRole: (...args: unknown[]) => setRoleMock(...args),
    },
  },
}))

const updateUserIdentifiersActionMock = vi.fn()
const checkUserIdentifierActionMock = vi.fn()

vi.mock("@/lib/users/identifier-actions", () => ({
  updateUserIdentifiersAction: (...args: unknown[]) =>
    updateUserIdentifiersActionMock(...args),
  checkUserIdentifierAction: (...args: unknown[]) =>
    checkUserIdentifierActionMock(...args),
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
  checkUserIdentifierActionMock.mockResolvedValue({ ok: true, taken: false })
})

describe("EditUserRoleForm", () => {
  it("renders role selection and buttons", () => {
    render(<EditUserRoleForm currentRole={APP_ROLES.USER} userId="user-123" />)

    expect(screen.getByText("Pengaturan Peran Pengguna (RBAC)")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Simpan Peran" })).toBeTruthy()
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
    expect(screen.getByLabelText(/Alasan Blokir/)).toBeTruthy()
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
    expect(screen.getByRole("button", { name: "Buka Blokir" }))
      .toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Buka Blokir" }))

    expect(screen.getByText("Konfirmasi Buka Blokir")).toBeTruthy()

    unbanUserMock.mockResolvedValue({ data: {} })
    fireEvent.click(screen.getByRole("button", { name: "Ya, Buka Blokir" }))

    await waitFor(() => {
      expect(unbanUserMock).toHaveBeenCalledWith({ userId: "user-123" })
      expect(toastMock.success).toHaveBeenCalledWith(
        "Blokir pengguna berhasil dibuka."
      )
    })
  })

  it("bans user upon dialog confirmation and triggers success toast", async () => {
    render(
      <EditUserBanForm
        currentBanExpiry={null}
        currentBanReason={null}
        isBanned={false}
        userId="user-123"
      />
    )

    fireEvent.change(screen.getByLabelText(/Alasan Blokir/), {
      target: { value: "Violation of rules" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Blokir Akun" }))

    expect(screen.getByText("Konfirmasi Blokir Akun")).toBeTruthy()

    banUserMock.mockResolvedValue({ data: {} })
    fireEvent.click(screen.getByRole("button", { name: "Ya, Blokir Akun" }))

    await waitFor(() => {
      expect(banUserMock).toHaveBeenCalledWith({
        banExpiresIn: undefined,
        banReason: "Violation of rules",
        userId: "user-123",
      })
      expect(toastMock.success).toHaveBeenCalledWith(
        "Pengguna berhasil diblokir."
      )
    })
  })
})

describe("EditUserIdentifiersForm", () => {
  it("renders NISN and NIS fields for participant", () => {
    render(
      <EditUserIdentifiersForm
        initialNip={null}
        initialNis="12345"
        initialNisn={12345678}
        role={APP_ROLES.USER}
        userId="user-123"
      />
    )

    expect(screen.getByLabelText(/^NISN/)).toBeTruthy()
    expect(screen.getByLabelText(/^NIS \(/)).toBeTruthy()
    expect(screen.queryByLabelText(/^NIP/)).toBeNull()
  })

  it("renders NIP field for admin", () => {
    render(
      <EditUserIdentifiersForm
        initialNip="198001012005011001"
        initialNis={null}
        initialNisn={null}
        role={APP_ROLES.ADMIN}
        userId="user-123"
      />
    )

    expect(screen.getByLabelText(/^NIP/)).toBeTruthy()
    expect(screen.queryByLabelText(/^NISN/)).toBeNull()
    expect(screen.queryByLabelText(/^NIS \(/)).toBeNull()
  })

  it("submits updated participant identifiers and redirects", async () => {
    updateUserIdentifiersActionMock.mockResolvedValue({ ok: true })

    render(
      <EditUserIdentifiersForm
        initialNip={null}
        initialNis="12345"
        initialNisn={1234567890}
        role={APP_ROLES.USER}
        userId="user-123"
      />
    )

    fireEvent.change(screen.getByLabelText(/^NISN/), {
      target: { value: "1234567891" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Simpan Identitas" }))

    await waitFor(() => {
      expect(updateUserIdentifiersActionMock).toHaveBeenCalledWith(
        "user-123",
        {
          nis: "12345",
          nisn: 1234567891,
        }
      )
      expect(toastMock.success).toHaveBeenCalledWith(
        "Nomor identitas berhasil diperbarui."
      )
    })
  })
})
