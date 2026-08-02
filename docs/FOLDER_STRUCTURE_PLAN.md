# Folder Structure Plan

Terakhir diperbarui: 2026-08-02

> **Status: rencana, belum selesai diterapkan.** Dokumen ini adalah target struktur, bukan
> deskripsi kondisi sekarang. Lihat tabel Status Penerapan di bawah sebelum memakai dokumen
> ini sebagai acuan struktur yang berlaku.

Dokumen ini berisi rencana struktur folder untuk pengembangan berikutnya. Prinsip utamanya: folder `app/` fokus untuk routing, sedangkan komponen dan logic/helper tetap berada di root `components/` dan `lib/`.

## Status Penerapan

| Bagian | Status | Kondisi sekarang |
|---|---|---|
| Route group `(dashboard)` | Sudah | `app/(dashboard)/layout.tsx` + `dashboard/page.tsx` |
| `components/dashboard-components/` | Sudah | sidebar dan profile menu |
| `components/ui/` primitives | Sudah | shadcn/ui |
| `lib/db/`, `lib/fonts/`, `lib/types/` | Sudah | sesuai rencana |
| Route group `(public)` | Belum | `app/page.tsx` dan `app/login/page.tsx` masih di root `app/` |
| Route group `(exam)` | Belum | belum ada route exam sama sekali |
| Sub-group `(super-admin)` / `(admin)` | Belum | belum ada |
| `components/exam-components/` | Belum | belum ada |
| `components/auth-components/` | Belum | komponen auth belum dikelompokkan |
| `components/appearance-components/` | Belum | `appearance-dropdown.tsx`, `theme-provider.tsx`, `font-provider.tsx` masih di root `components/` |
| `lib/auth/` | Belum | masih flat: `lib/auth.ts`, `lib/auth-client.ts`, `lib/auth-roles.ts` |
| `lib/exam/`, `lib/dashboard/`, `lib/users/` | Belum | belum ada |

## Prinsip

| Prinsip | Keterangan |
|---|---|
| `app/` hanya untuk route | Simpan page, layout, loading, error, dan route handler di `app/`. Hindari menaruh komponen/helper app-specific di dalam route folder. |
| Komponen tetap di `components/` | Komponen domain dikelompokkan berdasarkan parent folder seperti `exam-components/` dan `dashboard-components/`. |
| Logic tetap di `lib/` | Helper, query, service, validation, constant, dan non-React code dikelompokkan berdasarkan domain. |
| `components/ui/` tetap primitive | Folder ini hanya untuk shadcn/ui primitives. Jangan taruh business logic di sini. |
| Route group untuk layout berbeda | Gunakan route group seperti `(dashboard)` dan `(exam)` agar URL tetap bersih, tetapi layout dan guard bisa dipisah. |
| Provider exam dibuat scoped | Theme/font provider untuk peserta ujian sebaiknya dipakai hanya di route group `(exam)`, bukan global. |

## Rekomendasi Struktur Route

```txt
app/
  layout.tsx
  globals.css

  (public)/
    page.tsx
    login/
      page.tsx

  (dashboard)/
    dashboard/
      layout.tsx
      page.tsx

      (super-admin)/
        layout.tsx
        admins/
          page.tsx
        system-settings/
          page.tsx

      (admin)/
        layout.tsx
        users/
          page.tsx
        question-banks/
          page.tsx
        exams/
          page.tsx
          [exam-id]/
            page.tsx
        exam-sessions/
          page.tsx
        reports/
          page.tsx

  (exam)/
    layout.tsx
    exam/
      page.tsx
      [exam-id]/
        intro/
          page.tsx
        attempt/
          [attempt-id]/
            page.tsx
        result/
          page.tsx

  api/
    auth/
      [...all]/
        route.ts
```

## Rekomendasi Struktur Components

```txt
components/
  ui/
  auth-components/
  dashboard-components/
  exam-components/
  appearance-components/
```

| Folder | Kegunaan |
|---|---|
| `components/ui/` | shadcn/ui primitives only. |
| `components/auth-components/` | Komponen auth/login yang app-specific. |
| `components/dashboard-components/` | Dashboard shell, sidebar, nav, role-aware menus, cards, table composition, dan widget admin. |
| `components/exam-components/` | Exam intro, question renderer, answer controls, timer, progress, navigation soal, dan result view. |
| `components/appearance-components/` | Theme/font dropdown, provider wrapper, dan kontrol appearance. |

## Rekomendasi Struktur Lib

```txt
lib/
  auth/
  dashboard/
  db/
  exam/
  fonts/
  types/
  users/
  utils.ts
```

| Folder | Kegunaan |
|---|---|
| `lib/auth/` | Helper auth, guard role, session helper, dan permission checker. |
| `lib/dashboard/` | Query/helper khusus dashboard. |
| `lib/db/` | Drizzle client, schema, dan database-related setup. |
| `lib/exam/` | Query/helper exam, scoring, attempt state, answer validation, dan exam access rules. |
| `lib/fonts/` | Local font files. |
| `lib/types/` | Shared global TypeScript types/interfaces. |
| `lib/users/` | Query/helper user management dan role assignment. |
| `lib/utils.ts` | Utility global kecil seperti `cn()`. |

## RBAC Dashboard

| Area | Route Group | Role Yang Boleh Akses | Catatan |
|---|---|---|---|
| Dashboard base | `(dashboard)/dashboard` | `super-admin`, `admin` | Guard umum di dashboard layout. |
| Super admin area | `(dashboard)/dashboard/(super-admin)` | `super-admin` | Untuk fitur manajemen admin dan konfigurasi global. |
| Admin area | `(dashboard)/dashboard/(admin)` | `super-admin`, `admin` | Untuk user, bank soal, paket ujian, sesi, dan laporan. |

RBAC harus dicek server-side di layout/page/action. Route group hanya membantu organisasi dan layout; route group bukan security boundary.

## Exam Route Scope

| Route | Kegunaan |
|---|---|
| `/exam` | Daftar ujian yang tersedia untuk peserta. |
| `/exam/[exam-id]/intro` | Instruksi, aturan, durasi, dan tombol mulai ujian. |
| `/exam/[exam-id]/attempt/[attempt-id]` | Halaman pengerjaan ujian. |
| `/exam/[exam-id]/result` | Hasil ujian jika konfigurasi mengizinkan peserta melihat hasil. |

Theme provider dan font provider untuk custom appearance peserta sebaiknya dipakai di `app/(exam)/layout.tsx`, sehingga efeknya hanya berlaku untuk halaman ujian.

## Catatan Migrasi

1. Pindahkan route public saat ini ke `(public)` jika ingin layout public dipisah dari dashboard dan exam.
2. Pindahkan dashboard page saat ini ke struktur final `(dashboard)/dashboard`.
3. Kurangi logic di `app/`; pindahkan komposisi UI ke `components/*-components/` dan helper ke `lib/<domain>/`.
4. Jika `ThemeProvider` dan `FontProvider` hanya untuk halaman ujian, jangan letakkan provider tersebut di root `app/layout.tsx`.
5. Jika masih perlu font variables dari `next/font`, root layout tetap boleh mendaftarkan CSS variable font, tetapi provider pemilihan font sebaiknya scoped di `(exam)`.
