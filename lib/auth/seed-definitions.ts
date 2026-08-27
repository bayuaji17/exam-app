import { type AppPermission, PERMISSIONS } from "@/lib/auth/permissions-catalog"

export const SYSTEM_ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  USER: "user",
} as const

export type SystemRoleSlug = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES]

export interface DefaultRoleDefinition {
  name: string
  slug: SystemRoleSlug
  description: string
  isSystem: boolean
  isDefault: boolean
}

export const DEFAULT_ROLE_DEFINITIONS: readonly DefaultRoleDefinition[] = [
  {
    name: "Super Administrator",
    slug: SYSTEM_ROLES.SUPER_ADMIN,
    description:
      "Akses penuh tanpa batas ke seluruh modul, konfigurasi sistem, dan manajemen role.",
    isSystem: true,
    isDefault: false,
  },
  {
    name: "Administrator",
    slug: SYSTEM_ROLES.ADMIN,
    description:
      "Mengelola bank soal, paket ujian, jadwal, peserta, penilaian, dan laporan.",
    isSystem: false,
    isDefault: false,
  },
  {
    name: "Peserta Ujian",
    slug: SYSTEM_ROLES.USER,
    description:
      "Akun standar peserta ujian untuk mengerjakan ujian yang ditugaskan.",
    isSystem: true,
    isDefault: true,
  },
]

/**
 * Baseline initial permissions for default roles upon database seed.
 * Super Admin bypasses all checks via wildcard, but initial seeds define custom admin capabilities.
 */
export const INITIAL_ADMIN_PERMISSIONS: readonly AppPermission[] = [
  // Users & Groups
  PERMISSIONS.USERS_CREATE,
  PERMISSIONS.USERS_READ,
  PERMISSIONS.USERS_UPDATE,
  PERMISSIONS.USERS_DELETE,
  PERMISSIONS.USERS_BAN,
  PERMISSIONS.USERS_IMPORT,
  PERMISSIONS.USER_GROUPS_CREATE,
  PERMISSIONS.USER_GROUPS_READ,
  PERMISSIONS.USER_GROUPS_UPDATE,
  PERMISSIONS.USER_GROUPS_DELETE,

  // Roles (Admin can view and assign, but cannot create/update/delete system roles)
  PERMISSIONS.ROLES_READ,
  PERMISSIONS.ROLES_ASSIGN,

  // Question Banks & Categories
  PERMISSIONS.QUESTION_BANKS_CREATE,
  PERMISSIONS.QUESTION_BANKS_READ,
  PERMISSIONS.QUESTION_BANKS_UPDATE,
  PERMISSIONS.QUESTION_BANKS_DELETE,
  PERMISSIONS.QUESTION_CATEGORIES_CREATE,
  PERMISSIONS.QUESTION_CATEGORIES_READ,
  PERMISSIONS.QUESTION_CATEGORIES_UPDATE,
  PERMISSIONS.QUESTION_CATEGORIES_DELETE,

  // Exams & Schedules
  PERMISSIONS.EXAMS_CREATE,
  PERMISSIONS.EXAMS_READ,
  PERMISSIONS.EXAMS_UPDATE,
  PERMISSIONS.EXAMS_DELETE,
  PERMISSIONS.EXAMS_QUESTIONS_MANAGE,
  PERMISSIONS.EXAM_SCHEDULES_CREATE,
  PERMISSIONS.EXAM_SCHEDULES_READ,
  PERMISSIONS.EXAM_SCHEDULES_UPDATE,
  PERMISSIONS.EXAM_SCHEDULES_DELETE,
  PERMISSIONS.ELIGIBILITY_MANAGE,

  // Grading, Results & Reports
  PERMISSIONS.GRADING_READ,
  PERMISSIONS.GRADING_EVALUATE,
  PERMISSIONS.RESULTS_READ,
  PERMISSIONS.REPORTS_EXPORT,

  // System (Read-only for logs & settings)
  PERMISSIONS.SYSTEM_SETTINGS_READ,
  PERMISSIONS.ACTIVITY_LOGS_READ,
]

export function getInitialPermissionsForRole(
  roleSlug: string
): readonly AppPermission[] {
  switch (roleSlug) {
    case SYSTEM_ROLES.SUPER_ADMIN:
      // Super admin has wildcard access, does not require explicit permission rows
      return []
    case SYSTEM_ROLES.ADMIN:
      return INITIAL_ADMIN_PERMISSIONS
    case SYSTEM_ROLES.USER:
      return []
    default:
      return []
  }
}
