# Agent Context

Terakhir diperbarui: 2026-05-18 02:07:05 +07:00

## Ringkasan Proyek

Proyek ini adalah aplikasi website ujian online general berbasis Next.js App Router. Aplikasi ditujukan untuk membuat, mengelola, menjadwalkan, dan menjalankan ujian online dengan dukungan beberapa model penilaian:

1. Soal benar/salah atau pilihan dengan jawaban pasti.
2. Soal berbasis skor per jawaban untuk asesmen, psikotes, survei, atau evaluasi tanpa jawaban benar/salah mutlak.
3. Soal yang membutuhkan penilaian manual.

Role utama aplikasi adalah `super-admin`, `admin`, dan `user`. Dalam konteks produk, `user` adalah peserta ujian. User tidak boleh melakukan sign up manual.

Glosarium istilah domain resmi ada di `CONTEXT.md` (root repo); keputusan arsitektur tercatat di `docs/adr/`. Saat ada istilah domain baru, perbarui glosarium dan catat keputusan yang sulit dibalik di ADR.

## Keputusan Teknis

- Package manager wajib `pnpm`.
- Framework utama adalah Next.js App Router dengan React dan TypeScript.
- Prefer React Server Components. Gunakan `"use client"` hanya untuk state, effect, event handler, browser API, atau library client-only.
- UI menggunakan shadcn/ui primitives dari `components/ui`.
- Komposisi UI app-specific diletakkan di `components/`, bukan di `components/ui`.
- Conditional class menggunakan `cn()` dari `@/lib/utils`.
- Token warna, font, radius, dan nilai desain bersama berasal dari `app/globals.css`.
- Jangan menambah UI library, icon library, styling system, atau state manager baru tanpa persetujuan eksplisit.

## Font

Font yang dipakai dan disiapkan:

- `Open Sans` dari Google Font sebagai default sans app-wide.
- `Lexend` dari Google Font sebagai font heading atau opsi custom font.
- `OpenDyslexic` dari local font di `lib/fonts/` sebagai opsi custom font.

Font `Geist` dan `Geist Mono` sudah dihapus dari setup. Tidak ada konfigurasi monospace pengganti.

Implementasi font saat ini:

- `app/layout.tsx` mendaftarkan `Open_Sans`, `Lexend`, dan `localFont` OpenDyslexic.
- `app/globals.css` mengekspos token `--font-sans`, `--font-heading`, dan `--font-dyslexic`.
- `components/font-provider.tsx` menyediakan pilihan font `open-sans`, `lexend`, dan `open-dyslexic`.
- Pilihan font disimpan di `localStorage` dengan key `exam-app-font`.

## Theme dan Appearance

Theme yang disiapkan:

- `current`: theme light dari token `:root`.
- `dark`: theme dark dari class `.dark`.
- `warm`: hanya mengubah warna background menjadi warna hangat melalui class `.warm`.

Kontrol theme dan font dibuat melalui `components/appearance-dropdown.tsx` menggunakan shadcn Dropdown Menu. Shortcut keyboard global untuk toggle theme dengan tombol `d` sudah dihapus. Perubahan theme harus melalui UI eksplisit.

## Auth dan Role

Auth menggunakan Better Auth dengan Drizzle PostgreSQL.

Setup utama:

- `lib/auth.ts` membuat konfigurasi Better Auth.
- `lib/auth-client.ts` membuat Better Auth client untuk React.
- `app/api/auth/[...all]/route.ts` mengekspos handler Better Auth `GET` dan `POST`.
- `lib/db/index.ts` menggunakan `drizzle-orm/node-postgres`.
- `lib/db/schema.ts` berisi schema auth saat ini.
- `drizzle.config.ts` membaca env menggunakan `@next/env`.

Mode auth saat ini:

- Email/password aktif.
- Username plugin aktif untuk login/update user berbasis username.
- Sign up manual dinonaktifkan.
- User dibuat melalui admin flow.

Aturan role:

- `super-admin` dapat membuat `admin` dan `user`.
- `admin` hanya dapat membuat `user`.
- `user` tidak dapat membuat user lain.
- `super-admin` tidak dapat dibuat dari aplikasi normal. Seed awal dilakukan lewat script.

Script seed super admin:

- `pnpm run auth:seed-super-admin`
- Membutuhkan env `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, dan `SUPER_ADMIN_NAME`.

## Database

Database menggunakan PostgreSQL.

Pilihan environment:

- Local development dapat menggunakan PostgreSQL lokal dengan driver `pg`.
- Production dapat memakai Neon PostgreSQL selama tetap menggunakan connection string PostgreSQL yang kompatibel.

Env penting:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- `SUPER_ADMIN_NAME`
- `SUPER_ADMIN_USERNAME`
- `SUPER_ADMIN_DISPLAY_USERNAME`

Perintah database:

- `pnpm run auth:generate`
- `pnpm run db:generate`
- `pnpm run db:migrate`

## Login Page

Halaman login berada di `app/login/page.tsx`.

Implementasi saat ini:

- Client component karena memakai state, router, dan form handler.
- Menggunakan `react-hook-form` dan `zod`.
- Menggunakan shadcn `Field`, `Input`, `Checkbox`, dan `Button`.
- Submit menggunakan `authClient.signIn.email`.
- Setelah login berhasil redirect ke `/dashboard`.
- Ada checkbox `Remember me`.
- Password input memiliki tombol eye toggle untuk show/hide password.
- Ada teks bantuan: `Need help signing in? Contact your administrator.`

Dashboard dipindahkan ke `/dashboard`.

## Testing

Testing sudah disiapkan dengan dua layer:

- Unit test menggunakan Vitest.
- E2E test menggunakan Playwright.

Struktur test:

- `__test__/unit/`: test unit dan report Vitest.
- `__test__/e2e/`: test E2E, Playwright report, dan test result.

Script test:

- `pnpm run test`
- `pnpm run test:unit`
- `pnpm run test:e2e`
- `pnpm run test:all`

Report:

- Vitest JUnit XML berada di `__test__/unit/reports/junit.xml`.
- Playwright HTML report berada di `__test__/e2e/playwright-report/`.

## Dokumentasi dan Aturan Proyek

`AGENTS.md` sudah menjadi sumber aturan kerja agent untuk proyek ini.

Aturan penting:

- Gunakan `pnpm`.
- Ikuti konvensi naming yang sudah ditulis di `AGENTS.md`.
- Ikuti folder structure yang sudah ditulis di `AGENTS.md`.
- Commit message harus mengikuti Conventional Commits.
- Jangan commit secret atau credential.
- Jangan menjalankan destructive git command kecuali diminta eksplisit.

## Catatan Untuk Pengembangan Berikutnya

- Schema database sudah mencakup auth, bank soal, paket ujian, jadwal ujian, grup peserta, dan eligibility (ADR-0009).
- Domain ujian yang belum dibangun: attempt/pengerjaan peserta, sesi ujian, penilaian manual, hasil/laporan, media peserta (ADR-0007), anti-cheat, activity tracking, import Excel, dan introduction ujian.
- Eligibility per jadwal sudah siap dikonsumsi oleh slice attempt: `isUserEligibleForSchedule(userId, scheduleId)` di `lib/eligibility/queries.ts`.
- Ketika menambah schema domain ujian, pisahkan jelas antara auth schema dan exam domain schema.
- Pertahankan rule role creation: user tidak sign up manual, user dibuat oleh admin/super-admin.
