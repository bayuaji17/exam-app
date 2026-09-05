# 02 — Session UI Components & Berita Acara Print Layout

**Status:** todo

**Blocked by:** 01-session-stats-and-queries.md

## What to build

1. `components/reports/sessions/session-kpi-cards.tsx`:
   - 4-5 metric cards:
     - Peserta Terdaftar (Eligible)
     - Peserta Hadir (Present) & Attendance Rate (%)
     - Selesai Mengerjakan (Completed) & Completion Rate (%)
     - Peserta Belum Hadir / Absen (Absent)
     - Metode Pengumpulan: Mandiri vs Sistem

2. `components/reports/sessions/session-group-table.tsx`:
   - Comparison table per participant group/class showing:
     - Group Name
     - Terdaftar vs Hadir (% Kehadiran)
     - Selesai
     - Rata-rata Nilai
     - Tingkat Kelulusan (% Lulus)

3. `components/reports/sessions/session-attendance-table.tsx`:
   - Full student attendance roster:
     - No, Peserta (Name, Email), Identitas (NISN/NIS), Kelas/Grup
     - Status Presensi badge (Hadir & Selesai / Sedang Mengerjakan / Belum Hadir)
     - Waktu Mulai & Waktu Selesai
     - Metode Submit (Mandiri / Otomatis / —)
     - Nilai Akhir & Kelulusan

4. `components/reports/sessions/session-print-button.tsx`:
   - Print trigger with `@media print` layout for official examination minutes (Berita Acara & Daftar Hadir Ujian).

## Verification

- Component unit tests in `__test__/unit/reports-session-ui.test.tsx`.
- Fast Gate: `pnpm typecheck` & `pnpm lint`.
