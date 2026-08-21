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

import { CreateUserForm } from "@/components/create-user-form"
import { APP_ROLES } from "@/lib/auth-roles"

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}))

const createUserMock = vi.hoisted(() => vi.fn())

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
      createUser: createUserMock,
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

describe("CreateUserForm", () => {
  it("renders all form fields and info cards", () => {
    render(
      <CreateUserForm assignableRoles={[APP_ROLES.USER, APP_ROLES.ADMIN]} />
    )

    expect(screen.getByLabelText("Nama Lengkap")).toBeTruthy()
    expect(screen.getByLabelText("Email")).toBeTruthy()
    expect(screen.getByLabelText("Kata Sandi")).toBeTruthy()
    expect(screen.getByLabelText("Role")).toBeTruthy()
    expect(screen.getByText("Informasi")).toBeTruthy()
    expect(screen.getByText("Akses Pengguna")).toBeTruthy()
    expect(screen.getByText("Keamanan Akun")).toBeTruthy()
    expect(screen.getByText("Import Banyak Peserta")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Simpan Pengguna" })).toBeTruthy()
  })

  it("toggles password visibility with eye button", () => {
    render(<CreateUserForm assignableRoles={[APP_ROLES.USER]} />)

    const passwordInput = screen.getByLabelText("Kata Sandi")
    const toggleButton = screen.getByRole("button", { name: "Show password" })

    expect(passwordInput.getAttribute("type")).toBe("password")

    fireEvent.click(toggleButton)
    expect(passwordInput.getAttribute("type")).toBe("text")

    fireEvent.click(toggleButton)
    expect(passwordInput.getAttribute("type")).toBe("password")
  })

  it("submits valid user and triggers success toast", async () => {
    createUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } })
    render(<CreateUserForm assignableRoles={[APP_ROLES.USER]} />)

    fireEvent.change(screen.getByLabelText("Nama Lengkap"), {
      target: { value: "Ahmad Dahlan" },
    })
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ahmad@sekolah.sch.id" },
    })
    fireEvent.change(screen.getByLabelText("Kata Sandi"), {
      target: { value: "secret12345" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Simpan Pengguna" }))

    await waitFor(() => {
      expect(createUserMock).toHaveBeenCalledWith({
        name: "Ahmad Dahlan",
        email: "ahmad@sekolah.sch.id",
        password: "secret12345",
        role: APP_ROLES.USER,
      })
      expect(toastMock.success).toHaveBeenCalledWith(
        "Pengguna berhasil dibuat."
      )
      expect(routerMock.push).toHaveBeenCalledWith("/dashboard/users")
    })
  })

  it("displays error toast on submission error", async () => {
    createUserMock.mockResolvedValue({
      error: { message: "Email already in use." },
    })
    render(<CreateUserForm assignableRoles={[APP_ROLES.USER]} />)

    fireEvent.change(screen.getByLabelText("Nama Lengkap"), {
      target: { value: "Ahmad Dahlan" },
    })
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ahmad@sekolah.sch.id" },
    })
    fireEvent.change(screen.getByLabelText("Kata Sandi"), {
      target: { value: "secret12345" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Simpan Pengguna" }))

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Email already in use.")
      expect(routerMock.push).not.toHaveBeenCalled()
    })
  })
})
