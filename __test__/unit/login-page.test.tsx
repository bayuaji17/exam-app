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

import LoginPage from "@/app/login/page"

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}))

const signInMock = vi.hoisted(() => ({
  email: vi.fn(),
  username: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}))

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: signInMock,
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

function renderLoginPage() {
  render(<LoginPage />)
}

function fillPassword(password = "password123") {
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  })
}

function fillIdentifier(identifier: string) {
  fireEvent.change(screen.getByLabelText("Email or username"), {
    target: { value: identifier },
  })
}

function submitForm() {
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }))
}

describe("login page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signInMock.email.mockResolvedValue({ error: null })
    signInMock.username.mockResolvedValue({ error: null })
  })

  it("renders the email or username login form", () => {
    renderLoginPage()

    expect(
      screen.getByRole("heading", { name: "Sign in to Exam App" })
    ).toBeTruthy()
    expect(screen.getByLabelText("Email or username")).toBeTruthy()
    expect(screen.getByLabelText("Password")).toBeTruthy()
    expect(screen.getByRole("checkbox", { name: "Remember me" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy()
    expect(
      screen.getByText("Need help signing in? Contact your administrator.")
    ).toBeTruthy()
  })

  it("signs in with email when the identifier is an email address", async () => {
    renderLoginPage()

    fillIdentifier("Admin@Example.COM")
    fillPassword()
    submitForm()

    await waitFor(() => {
      expect(signInMock.email).toHaveBeenCalledWith({
        email: "admin@example.com",
        password: "password123",
        rememberMe: false,
      })
    })
    expect(signInMock.username).not.toHaveBeenCalled()
    expect(routerMock.push).toHaveBeenCalledWith("/dashboard")
    expect(routerMock.refresh).toHaveBeenCalled()
  })

  it("signs in with username when the identifier is not an email address", async () => {
    renderLoginPage()

    fillIdentifier("Admin_User")
    fillPassword()
    fireEvent.click(screen.getByRole("checkbox", { name: "Remember me" }))
    submitForm()

    await waitFor(() => {
      expect(signInMock.username).toHaveBeenCalledWith({
        username: "admin_user",
        password: "password123",
        rememberMe: true,
      })
    })
    expect(signInMock.email).not.toHaveBeenCalled()
  })

  it("rejects invalid email identifiers", async () => {
    renderLoginPage()

    fillIdentifier("admin@")
    fillPassword()
    submitForm()

    expect(
      await screen.findByText("Enter a valid email address or username.")
    ).toBeTruthy()
    expect(signInMock.email).not.toHaveBeenCalled()
    expect(signInMock.username).not.toHaveBeenCalled()
  })

  it("rejects invalid username identifiers", async () => {
    renderLoginPage()

    fillIdentifier("ab")
    fillPassword()
    submitForm()

    expect(
      await screen.findByText("Enter a valid email address or username.")
    ).toBeTruthy()
    expect(signInMock.email).not.toHaveBeenCalled()
    expect(signInMock.username).not.toHaveBeenCalled()
  })

  it("shows auth errors without redirecting", async () => {
    signInMock.username.mockResolvedValue({
      error: { message: "Invalid username or password" },
    })
    renderLoginPage()

    fillIdentifier("admin_user")
    fillPassword("wrong-password")
    submitForm()

    expect(await screen.findByText("Invalid username or password")).toBeTruthy()
    expect(routerMock.push).not.toHaveBeenCalled()
    expect(routerMock.refresh).not.toHaveBeenCalled()
  })
})
