/**
 * Canonical static permission catalog for the Dynamic RBAC subsystem.
 * Permissions follow the strict resource:action naming pattern.
 */

export const PERMISSION_MODULES = [
  "users",
  "user_groups",
  "roles",
  "question_banks",
  "question_categories",
  "exams",
  "exam_schedules",
  "grading",
  "results",
  "reports",
  "system",
] as const

export type PermissionModule = (typeof PERMISSION_MODULES)[number]

export const PERMISSIONS = {
  // Users
  USERS_CREATE: "users:create",
  USERS_READ: "users:read",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  USERS_BAN: "users:ban",
  USERS_IMPORT: "users:import",

  // User Groups
  USER_GROUPS_CREATE: "user_groups:create",
  USER_GROUPS_READ: "user_groups:read",
  USER_GROUPS_UPDATE: "user_groups:update",
  USER_GROUPS_DELETE: "user_groups:delete",

  // Roles
  ROLES_CREATE: "roles:create",
  ROLES_READ: "roles:read",
  ROLES_UPDATE: "roles:update",
  ROLES_DELETE: "roles:delete",
  ROLES_ASSIGN: "roles:assign",

  // Question Banks
  QUESTION_BANKS_CREATE: "question_banks:create",
  QUESTION_BANKS_READ: "question_banks:read",
  QUESTION_BANKS_UPDATE: "question_banks:update",
  QUESTION_BANKS_DELETE: "question_banks:delete",

  // Question Categories
  QUESTION_CATEGORIES_CREATE: "question_categories:create",
  QUESTION_CATEGORIES_READ: "question_categories:read",
  QUESTION_CATEGORIES_UPDATE: "question_categories:update",
  QUESTION_CATEGORIES_DELETE: "question_categories:delete",

  // Exams
  EXAMS_CREATE: "exams:create",
  EXAMS_READ: "exams:read",
  EXAMS_UPDATE: "exams:update",
  EXAMS_DELETE: "exams:delete",
  EXAMS_QUESTIONS_MANAGE: "exams:questions_manage",

  // Exam Schedules
  EXAM_SCHEDULES_CREATE: "exam_schedules:create",
  EXAM_SCHEDULES_READ: "exam_schedules:read",
  EXAM_SCHEDULES_UPDATE: "exam_schedules:update",
  EXAM_SCHEDULES_DELETE: "exam_schedules:delete",
  ELIGIBILITY_MANAGE: "eligibility:manage",

  // Grading
  GRADING_READ: "grading:read",
  GRADING_EVALUATE: "grading:evaluate",

  // Results
  RESULTS_READ: "results:read",

  // Reports
  REPORTS_EXPORT: "reports:export",

  // System
  SYSTEM_SETTINGS_READ: "system_settings:read",
  SYSTEM_SETTINGS_UPDATE: "system_settings:update",
  ACTIVITY_LOGS_READ: "activity_logs:read",
} as const

export type AppPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ALL_PERMISSIONS: readonly AppPermission[] = Object.values(
  PERMISSIONS
) as readonly AppPermission[]

export interface PermissionDefinition {
  name: AppPermission
  resource: string
  action: string
  module: PermissionModule
  label: string
  description: string
}

export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = [
  // Users
  {
    name: PERMISSIONS.USERS_CREATE,
    resource: "users",
    action: "create",
    module: "users",
    label: "Buat Pengguna",
    description: "Membuat akun pengguna baru secara manual.",
  },
  {
    name: PERMISSIONS.USERS_READ,
    resource: "users",
    action: "read",
    module: "users",
    label: "Lihat Pengguna",
    description: "Melihat daftar dan detail akun pengguna.",
  },
  {
    name: PERMISSIONS.USERS_UPDATE,
    resource: "users",
    action: "update",
    module: "users",
    label: "Ubah Pengguna",
    description: "Mengubah data profil, identitas, dan password pengguna.",
  },
  {
    name: PERMISSIONS.USERS_DELETE,
    resource: "users",
    action: "delete",
    module: "users",
    label: "Hapus Pengguna",
    description: "Menghapus akun pengguna dari sistem.",
  },
  {
    name: PERMISSIONS.USERS_BAN,
    resource: "users",
    action: "ban",
    module: "users",
    label: "Blokir Pengguna",
    description: "Menangguhkan (ban) atau mencabut blokir akun pengguna.",
  },
  {
    name: PERMISSIONS.USERS_IMPORT,
    resource: "users",
    action: "import",
    module: "users",
    label: "Impor Massal Pengguna",
    description: "Mengimpor akun peserta massal dari file spreadsheet.",
  },

  // User Groups
  {
    name: PERMISSIONS.USER_GROUPS_CREATE,
    resource: "user_groups",
    action: "create",
    module: "user_groups",
    label: "Buat Grup Peserta",
    description: "Membuat rombel atau grup peserta ujian baru.",
  },
  {
    name: PERMISSIONS.USER_GROUPS_READ,
    resource: "user_groups",
    action: "read",
    module: "user_groups",
    label: "Lihat Grup Peserta",
    description: "Melihat daftar dan keanggotaan grup peserta.",
  },
  {
    name: PERMISSIONS.USER_GROUPS_UPDATE,
    resource: "user_groups",
    action: "update",
    module: "user_groups",
    label: "Ubah Grup Peserta",
    description: "Mengubah nama grup dan mengelola anggota grup peserta.",
  },
  {
    name: PERMISSIONS.USER_GROUPS_DELETE,
    resource: "user_groups",
    action: "delete",
    module: "user_groups",
    label: "Hapus Grup Peserta",
    description: "Menghapus grup peserta dari sistem.",
  },

  // Roles
  {
    name: PERMISSIONS.ROLES_CREATE,
    resource: "roles",
    action: "create",
    module: "roles",
    label: "Buat Role",
    description: "Membuat role dinamis baru dan menentukan izinnya.",
  },
  {
    name: PERMISSIONS.ROLES_READ,
    resource: "roles",
    action: "read",
    module: "roles",
    label: "Lihat Role",
    description: "Melihat daftar role dan matriks izin hak akses.",
  },
  {
    name: PERMISSIONS.ROLES_UPDATE,
    resource: "roles",
    action: "update",
    module: "roles",
    label: "Ubah Role",
    description: "Mengubah nama, deskripsi, dan matriks izin role.",
  },
  {
    name: PERMISSIONS.ROLES_DELETE,
    resource: "roles",
    action: "delete",
    module: "roles",
    label: "Hapus Role",
    description: "Menghapus role yang tidak lagi digunakan.",
  },
  {
    name: PERMISSIONS.ROLES_ASSIGN,
    resource: "roles",
    action: "assign",
    module: "roles",
    label: "Tugaskan Role",
    description: "Memberikan atau mencabut role dari akun pengguna.",
  },

  // Question Banks
  {
    name: PERMISSIONS.QUESTION_BANKS_CREATE,
    resource: "question_banks",
    action: "create",
    module: "question_banks",
    label: "Buat Bank Soal",
    description: "Membuat bank soal baru.",
  },
  {
    name: PERMISSIONS.QUESTION_BANKS_READ,
    resource: "question_banks",
    action: "read",
    module: "question_banks",
    label: "Lihat Bank Soal",
    description: "Melihat daftar, detail, dan soal di dalam bank soal.",
  },
  {
    name: PERMISSIONS.QUESTION_BANKS_UPDATE,
    resource: "question_banks",
    action: "update",
    module: "question_banks",
    label: "Ubah Bank Soal",
    description: "Mengubah metadata dan soal di dalam bank soal.",
  },
  {
    name: PERMISSIONS.QUESTION_BANKS_DELETE,
    resource: "question_banks",
    action: "delete",
    module: "question_banks",
    label: "Hapus Bank Soal",
    description: "Mengarsipkan atau menghapus bank soal.",
  },

  // Question Categories
  {
    name: PERMISSIONS.QUESTION_CATEGORIES_CREATE,
    resource: "question_categories",
    action: "create",
    module: "question_categories",
    label: "Buat Kategori Soal",
    description: "Membuat taksonomi kategori soal baru.",
  },
  {
    name: PERMISSIONS.QUESTION_CATEGORIES_READ,
    resource: "question_categories",
    action: "read",
    module: "question_categories",
    label: "Lihat Kategori Soal",
    description: "Melihat daftar kategori soal.",
  },
  {
    name: PERMISSIONS.QUESTION_CATEGORIES_UPDATE,
    resource: "question_categories",
    action: "update",
    module: "question_categories",
    label: "Ubah Kategori Soal",
    description: "Mengubah nama kategori soal.",
  },
  {
    name: PERMISSIONS.QUESTION_CATEGORIES_DELETE,
    resource: "question_categories",
    action: "delete",
    module: "question_categories",
    label: "Hapus Kategori Soal",
    description: "Menghapus kategori soal yang tidak digunakan.",
  },

  // Exams
  {
    name: PERMISSIONS.EXAMS_CREATE,
    resource: "exams",
    action: "create",
    module: "exams",
    label: "Buat Paket Ujian",
    description: "Membuat paket ujian baru.",
  },
  {
    name: PERMISSIONS.EXAMS_READ,
    resource: "exams",
    action: "read",
    module: "exams",
    label: "Lihat Paket Ujian",
    description: "Melihat daftar dan konfigurasi paket ujian.",
  },
  {
    name: PERMISSIONS.EXAMS_UPDATE,
    resource: "exams",
    action: "update",
    module: "exams",
    label: "Ubah Paket Ujian",
    description: "Mengubah metadata dan pengaturan paket ujian.",
  },
  {
    name: PERMISSIONS.EXAMS_DELETE,
    resource: "exams",
    action: "delete",
    module: "exams",
    label: "Hapus Paket Ujian",
    description: "Menghapus atau mengarsipkan paket ujian.",
  },
  {
    name: PERMISSIONS.EXAMS_QUESTIONS_MANAGE,
    resource: "exams",
    action: "questions_manage",
    module: "exams",
    label: "Kelola Komposisi Soal Ujian",
    description: "Menambah, menyusun, dan menghapus komposisi butir soal ujian.",
  },

  // Exam Schedules
  {
    name: PERMISSIONS.EXAM_SCHEDULES_CREATE,
    resource: "exam_schedules",
    action: "create",
    module: "exam_schedules",
    label: "Buat Jadwal Sesi Ujian",
    description: "Membuat jadwal pelaksanaan ujian baru.",
  },
  {
    name: PERMISSIONS.EXAM_SCHEDULES_READ,
    resource: "exam_schedules",
    action: "read",
    module: "exam_schedules",
    label: "Lihat Jadwal Ujian",
    description: "Melihat daftar jadwal dan status sesi ujian.",
  },
  {
    name: PERMISSIONS.EXAM_SCHEDULES_UPDATE,
    resource: "exam_schedules",
    action: "update",
    module: "exam_schedules",
    label: "Ubah Jadwal Ujian",
    description: "Mengubah waktu pelaksanaan dan pengaturan sesi ujian.",
  },
  {
    name: PERMISSIONS.EXAM_SCHEDULES_DELETE,
    resource: "exam_schedules",
    action: "delete",
    module: "exam_schedules",
    label: "Hapus Jadwal Ujian",
    description: "Membatalkan atau menghapus jadwal ujian.",
  },
  {
    name: PERMISSIONS.ELIGIBILITY_MANAGE,
    resource: "exam_schedules",
    action: "eligibility_manage",
    module: "exam_schedules",
    label: "Kelola Kelayakan Peserta",
    description: "Mengatur izin akses peserta atau rombel pada jadwal ujian.",
  },

  // Grading
  {
    name: PERMISSIONS.GRADING_READ,
    resource: "grading",
    action: "read",
    module: "grading",
    label: "Lihat Lembar Penilaian",
    description: "Melihat jawaban peserta untuk kebutuhan penilaian manual.",
  },
  {
    name: PERMISSIONS.GRADING_EVALUATE,
    resource: "grading",
    action: "evaluate",
    module: "grading",
    label: "Beri Nilai Esai",
    description: "Memasukkan dan mengedit nilai soal uraian manual.",
  },

  // Results
  {
    name: PERMISSIONS.RESULTS_READ,
    resource: "results",
    action: "read",
    module: "results",
    label: "Lihat Hasil Ujian",
    description: "Melihat rekap perolehan skor dan nilai peserta.",
  },

  // Reports
  {
    name: PERMISSIONS.REPORTS_EXPORT,
    resource: "reports",
    action: "export",
    module: "reports",
    label: "Ekspor Laporan Ujian",
    description: "Mengunduh file laporan hasil ujian dan analisis butir soal.",
  },

  // System
  {
    name: PERMISSIONS.SYSTEM_SETTINGS_READ,
    resource: "system_settings",
    action: "read",
    module: "system",
    label: "Lihat Konfigurasi Sistem",
    description: "Melihat pengaturan aplikasi dan parameter global.",
  },
  {
    name: PERMISSIONS.SYSTEM_SETTINGS_UPDATE,
    resource: "system_settings",
    action: "update",
    module: "system",
    label: "Ubah Konfigurasi Sistem",
    description: "Mengubah pengaturan sistem tingkat tinggi.",
  },
  {
    name: PERMISSIONS.ACTIVITY_LOGS_READ,
    resource: "activity_logs",
    action: "read",
    module: "system",
    label: "Lihat Log Aktivitas",
    description: "Melihat riwayat audit log aktivitas sistem.",
  },
]

const PERMISSION_SET = new Set<string>(ALL_PERMISSIONS)

export function isAppPermission(value: unknown): value is AppPermission {
  if (typeof value !== "string") {
    return false
  }
  return PERMISSION_SET.has(value)
}
