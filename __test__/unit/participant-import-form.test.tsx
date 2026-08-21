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

import { ParticipantImportForm } from "@/components/participant-import-form"

const parseMock = vi.hoisted(() => vi.fn())
const applyMock = vi.hoisted(() => vi.fn())

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: toastMock,
}))

vi.mock("@/lib/participants/import-actions", () => ({
  parseParticipantImportAction: parseMock,
  applyParticipantImportAction: applyMock,
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

describe("ParticipantImportForm", () => {
  it("renders top guidance card, steps, and dropzone area", () => {
    render(<ParticipantImportForm />)

    expect(screen.getByText("Cara import peserta")).toBeTruthy()
    expect(screen.getByText("Unduh template Excel (.xlsx)")).toBeTruthy()
    expect(screen.getByText("Isi data peserta pada file template")).toBeTruthy()
    expect(screen.getByText("Unggah file untuk proses validasi")).toBeTruthy()
    expect(screen.getByText("Informasi penting")).toBeTruthy()
    expect(screen.getByText("Unggah file Excel (.xlsx)")).toBeTruthy()
    expect(screen.getByText("Pilih File Excel")).toBeTruthy()
    expect(screen.getByText("Belum ada file yang dipilih")).toBeTruthy()
    expect(
      screen.getByText(
        /Data peserta Anda aman\. File hanya digunakan untuk proses import/
      )
    ).toBeTruthy()
  })

  it("handles parse preview with valid rows", async () => {
    parseMock.mockResolvedValue({
      ok: true,
      plan: {
        rows: [
          {
            rowNumber: 2,
            name: "Budi",
            email: "budi@example.com",
            username: null,
            password: null,
            groupNames: [],
          },
        ],
        errors: [],
        valid: true,
      },
    })

    render(<ParticipantImportForm />)

    const file = new File(["dummy content"], "peserta.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const input = screen.getByLabelText("File peserta")

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(parseMock).toHaveBeenCalledWith(file)
      expect(screen.getByText("peserta.xlsx")).toBeTruthy()
      expect(screen.getByText(/Semua Valid/)).toBeTruthy()
      expect(
        screen.getByRole("button", { name: "Import 1 Peserta" })
      ).toBeTruthy()
    })
  })

  it("applies import and displays generated passwords", async () => {
    parseMock.mockResolvedValue({
      ok: true,
      plan: {
        rows: [
          {
            rowNumber: 2,
            name: "Budi",
            email: "budi@example.com",
            username: null,
            password: null,
            groupNames: [],
          },
        ],
        errors: [],
        valid: true,
      },
    })

    applyMock.mockResolvedValue({
      ok: true,
      created: 1,
      generatedPasswords: {
        "budi@example.com": "SecretPass123!",
      },
    })

    render(<ParticipantImportForm />)

    const file = new File(["dummy content"], "peserta.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const input = screen.getByLabelText("File peserta")

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Import 1 Peserta" })
      ).toBeTruthy()
    })

    fireEvent.click(screen.getByRole("button", { name: "Import 1 Peserta" }))

    await waitFor(() => {
      expect(applyMock).toHaveBeenCalled()
      expect(screen.getByText("Import Selesai")).toBeTruthy()
      expect(
        screen.getByText(/Sebanyak 1 peserta berhasil ditambahkan/)
      ).toBeTruthy()
      expect(screen.getByText("budi@example.com")).toBeTruthy()
      expect(screen.getByText("SecretPass123!")).toBeTruthy()
      expect(toastMock.success).toHaveBeenCalledWith(
        "1 peserta berhasil diimpor!"
      )
    })
  })

  it("removes selected file when clicking X button", async () => {
    parseMock.mockResolvedValue({
      ok: true,
      plan: {
        rows: [
          {
            rowNumber: 2,
            name: "Budi",
            email: "budi@example.com",
            username: null,
            password: null,
            groupNames: [],
          },
        ],
        errors: [],
        valid: true,
      },
    })

    render(<ParticipantImportForm />)

    const file = new File(["dummy content"], "peserta.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const input = screen.getByLabelText("File peserta")

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByLabelText("Hapus file")).toBeTruthy()
    })

    fireEvent.click(screen.getByLabelText("Hapus file"))

    await waitFor(() => {
      expect(screen.getByText("Belum ada file yang dipilih")).toBeTruthy()
      expect(screen.getByText("Unggah file Excel (.xlsx)")).toBeTruthy()
    })
  })
})
