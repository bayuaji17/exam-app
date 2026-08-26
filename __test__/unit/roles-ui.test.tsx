import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DeleteRoleDialog } from "@/components/roles/delete-role-dialog"
import { PermissionMatrix } from "@/components/roles/permission-matrix"
import { RoleForm } from "@/components/roles/role-form"
import { RolesTable } from "@/components/roles/roles-table"
import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import type { RoleListItem } from "@/lib/auth/rbac-queries"
import * as roleActions from "@/lib/roles/actions"

// Define ResizeObserver globally at top level
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock next/navigation
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}))

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe("PermissionMatrix Component", () => {
  it("renders all module sections and handles single permission toggle", () => {
    const onChangeMock = vi.fn()
    render(
      <PermissionMatrix
        onChange={onChangeMock}
        selectedPermissions={[PERMISSIONS.USERS_READ]}
      />
    )

    expect(screen.getByText("Manajemen Pengguna")).toBeDefined()
    expect(screen.getByText("Bank Soal")).toBeDefined()
    expect(screen.getByText("Paket Ujian")).toBeDefined()

    // Click another permission
    const createPermission = screen.getByText("Buat Pengguna")
    fireEvent.click(createPermission)

    expect(onChangeMock).toHaveBeenCalledWith([
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_CREATE,
    ])
  })

  it("handles module select all toggle", () => {
    const onChangeMock = vi.fn()
    render(
      <PermissionMatrix
        onChange={onChangeMock}
        selectedPermissions={[]}
      />
    )

    const selectAllModuleButtons = screen.getAllByText("Pilih Semua di Modul Ini")
    expect(selectAllModuleButtons.length).toBeGreaterThan(0)

    fireEvent.click(selectAllModuleButtons[0])
    expect(onChangeMock).toHaveBeenCalled()
  })

  it("handles global select all and clear all", () => {
    const onChangeMock = vi.fn()
    render(
      <PermissionMatrix
        onChange={onChangeMock}
        selectedPermissions={[PERMISSIONS.USERS_READ]}
      />
    )

    const selectAllGlobal = screen.getByText("Pilih Semua Modul")
    fireEvent.click(selectAllGlobal)
    expect(onChangeMock).toHaveBeenCalledWith(
      expect.arrayContaining([PERMISSIONS.USERS_READ, PERMISSIONS.EXAMS_CREATE])
    )

    const clearAllGlobal = screen.getByText("Hapus Pilihan")
    fireEvent.click(clearAllGlobal)
    expect(onChangeMock).toHaveBeenCalledWith([])
  })
})

describe("DeleteRoleDialog Component", () => {
  it("shows warning and disables delete button when role has assigned users", () => {
    const roleInUse: RoleListItem = {
      id: "role-1",
      name: "Guru Penguji",
      slug: "guru-penguji",
      description: "Deskripsi",
      isSystem: false,
      isDefault: false,
      permissionsCount: 5,
      userCount: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    render(
      <DeleteRoleDialog
        onOpenChange={vi.fn()}
        open={true}
        role={roleInUse}
      />
    )

    expect(screen.getByText(/Peran ini sedang digunakan oleh/)).toBeDefined()
    expect(screen.queryByText("Ya, Hapus Peran")).toBeNull()
  })

  it("allows confirmation when role has 0 users and calls deleteRoleAction", async () => {
    const deleteSpy = vi
      .spyOn(roleActions, "deleteRoleAction")
      .mockResolvedValueOnce({ ok: true })

    const unusedRole: RoleListItem = {
      id: "role-2",
      name: "Role Percobaan",
      slug: "role-percobaan",
      description: null,
      isSystem: false,
      isDefault: false,
      permissionsCount: 0,
      userCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    render(
      <DeleteRoleDialog
        onOpenChange={vi.fn()}
        open={true}
        role={unusedRole}
      />
    )

    const deleteButton = screen.getByText("Ya, Hapus Peran")
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith("role-2")
    })
  })
})

describe("RolesTable Component", () => {
  const sampleRoles: RoleListItem[] = [
    {
      id: "role-sa",
      name: "Super Administrator",
      slug: "super-admin",
      description: "Super Admin System",
      isSystem: true,
      isDefault: false,
      permissionsCount: 0,
      userCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "role-custom",
      name: "Guru Bahasa",
      slug: "guru-bahasa",
      description: "Guru Mapel Bahasa",
      isSystem: false,
      isDefault: false,
      permissionsCount: 8,
      userCount: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  it("renders role rows and filters by search query", () => {
    render(<RolesTable roles={sampleRoles} />)

    expect(screen.getByText("Super Administrator")).toBeDefined()
    expect(screen.getByText("Guru Bahasa")).toBeDefined()
    expect(screen.getByText("Sistem")).toBeDefined()
    expect(screen.getByText("Kustom")).toBeDefined()

    const searchInput = screen.getByPlaceholderText("Cari nama peran atau deskripsi...")
    fireEvent.change(searchInput, { target: { value: "Bahasa" } })

    expect(screen.queryByText("Super Administrator")).toBeNull()
    expect(screen.getByText("Guru Bahasa")).toBeDefined()
  })
})

describe("RoleForm Component", () => {
  it("submits new role with form values", async () => {
    const createSpy = vi
      .spyOn(roleActions, "createRoleAction")
      .mockResolvedValueOnce({ ok: true, id: "new-role-id" })

    render(<RoleForm />)

    const nameInput = screen.getByPlaceholderText("Contoh: Guru Mata Pelajaran, Pengawas Ujian")
    fireEvent.change(nameInput, { target: { value: "Koordinator Ujian" } })

    const submitButton = screen.getByText("Simpan Peran")
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Koordinator Ujian",
        })
      )
      expect(mockPush).toHaveBeenCalledWith("/dashboard/roles")
    })
  })

  it("disables editing name and shows protected alert for super-admin system role", () => {
    const superAdminRole = {
      id: "role-sa",
      name: "Super Administrator",
      slug: "super-admin",
      description: "Super Admin",
      isSystem: true,
      isDefault: false,
      permissions: [PERMISSIONS.USERS_READ],
    }

    render(<RoleForm role={superAdminRole} />)

    expect(screen.getByText("Peran Sistem Terproteksi")).toBeDefined()
    const nameInput = screen.getByDisplayValue("Super Administrator")
    expect((nameInput as HTMLInputElement).disabled).toBe(true)
  })
})
