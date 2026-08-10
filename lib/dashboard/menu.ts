import type { SystemRole } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"

export interface DashboardMenuItem {
  title: string
  url: string
}

export interface DashboardMenuGroup {
  title: string
  items: DashboardMenuItem[]
}

/**
 * Every dashboard destination, grouped as the sidebar presents them.
 *
 * Icons live with the component that renders them, so this module stays free
 * of React concerns and can be unit tested on its own.
 */
export const DASHBOARD_MENU: DashboardMenuGroup[] = [
  {
    title: "Overview",
    items: [{ title: "Dashboard", url: "/dashboard" }],
  },
  {
    title: "Manajemen Pengguna",
    items: [
      { title: "Peserta", url: "/dashboard/users" },
      { title: "Grup Peserta", url: "/dashboard/user-groups" },
      { title: "Admin", url: "/dashboard/admins" },
      { title: "Role & Hak Akses", url: "/dashboard/roles" },
    ],
  },
  {
    title: "Manajemen Ujian",
    items: [
      { title: "Bank Soal", url: "/dashboard/question-banks" },
      { title: "Paket Ujian", url: "/dashboard/exams" },
      { title: "Jadwal Ujian", url: "/dashboard/exam-schedules" },
      { title: "Sesi Ujian", url: "/dashboard/exam-sessions" },
      { title: "Aturan Akses", url: "/dashboard/exam-access-rules" },
      { title: "Introduction Ujian", url: "/dashboard/exam-introductions" },
    ],
  },
  {
    title: "Penilaian",
    items: [
      { title: "Penilaian Manual", url: "/dashboard/manual-grading" },
      { title: "Aturan Penilaian", url: "/dashboard/scoring-rules" },
      { title: "Hasil Ujian", url: "/dashboard/exam-results" },
    ],
  },
  {
    title: "Monitoring",
    items: [
      { title: "Activity Tracking", url: "/dashboard/activity-tracking" },
      { title: "Anti-cheat", url: "/dashboard/anti-cheat" },
      { title: "Riwayat Pengerjaan", url: "/dashboard/attempt-history" },
    ],
  },
  {
    title: "Laporan",
    items: [
      { title: "Laporan Hasil Ujian", url: "/dashboard/reports/exam-results" },
      { title: "Laporan Individu", url: "/dashboard/reports/individual" },
      { title: "Laporan Per Sesi", url: "/dashboard/reports/sessions" },
    ],
  },
  {
    title: "Pengaturan",
    items: [
      { title: "Profile", url: "/dashboard/settings/profile" },
      { title: "Security", url: "/dashboard/settings/security" },
      { title: "Konfigurasi Global", url: "/dashboard/settings/system" },
    ],
  },
]

/**
 * The menu as a given role should see it: links they cannot open are removed,
 * and a group left with no links is dropped rather than rendered as a bare
 * heading.
 *
 * Returns fresh objects so callers cannot mutate the source menu.
 */
export function getVisibleMenu(role: SystemRole): DashboardMenuGroup[] {
  return DASHBOARD_MENU.map((group) => ({
    title: group.title,
    items: group.items.filter((item) => userHasPermission(role, item.url)),
  })).filter((group) => group.items.length > 0)
}
