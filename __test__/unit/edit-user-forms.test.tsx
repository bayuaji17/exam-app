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
import { EditUserIdentifiersForm } from "@/components/edit-user-identifiers-form"
import { EditUserRoleForm } from "@/components/edit-user-role-form"
import { APP_ROLES } from "@/lib/auth-roles"

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}))

const setRoleMock = vi.hoisted(() => vi.fn())
const banUserMock = vi.hoisted(() => vi.fn())
const unbanUserMock = vi.hoisted(() => vi.fn())
const updateIdentifiersMock = vi.hoisted(() => vi.fn())
const checkIdentifierMock = vi.hoisted(() => vi.fn())

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

vi.mock("@/lib/users/identifier-actions", () => ({
  updateUserIdentifiersAction: updateIdentifiersMock,
  checkUserIdentifierAction: checkIdentifierMock,
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

describe("EditUserIdentifiersForm", () => {
  it("renders NISN and NIS fields for participant", () => {
    render(
      <EditUserIdentifiersForm
        initialNis="2026-001"
        initialNisn={1234567890}
        role={APP_ROLES.USER}
        userId="user-123"
      />
    )

    expect(screen.getByText("Nomor Identitas")).toBeTruthy()
    expect(screen.getByLabelText(/NISN/)).toBeTruthy()
    expect(screen.getByLabelText(/NIS \(Nomor Induk Siswa\)/)).toBeTruthy()
    expect(screen.queryByLabelText(/NIP/)).toBeNull()
  })

  it("renders NIP field for admin", () => {
    render(
      <EditUserIdentifiersForm
        initialNip="198501012010011001"
        role={APP_ROLES.ADMIN}
        userId="admin-123"
      />
    )

    expect(screen.getByLabelText(/NIP/)).toBeTruthy()
    expect(screen.queryByLabelText(/NISN/)).toBeNull()
  })

  it("submits updated participant identifiers and redirects", async () => {
    updateIdentifiersMock.mockResolvedValue({ ok: true })

    render(
      <EditUserIdentifiersForm
        initialNis="2026-001"
        initialNisn={1234567890}
        role={APP_ROLES.USER}
        userId="user-123"
      />
    )

    fireEvent.change(screen.getByLabelText(/NIS \(Nomor Induk Siswa\)/), {
      target: { value: "2026-002" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Simpan Identitas" }))

    await waitFor(() => {
      expect(updateIdentifiersMock).toHaveBeenCalledWith("user-123", {
        nisn: 1234567890,
        nis: "2026-002",
      })
      expect(toastMock.success).toHaveBeenCalledWith(
        "Nomor identitas berhasil diperbarui."
      )
      expect(routerMock.push).toHaveBeenCalledWith("/dashboard/users")
    })
  })
})
