# Test Scenario

Terakhir diperbarui: 2026-05-18 01:31:21 +07:00

Dokumen ini berisi skenario test untuk halaman login di `app/login/page.tsx`. Test dibagi menjadi unit/component test dengan Vitest dan end-to-end flow dengan Playwright.

## Target Fitur Login

| Area | Detail |
|---|---|
| Route | `/login` |
| Component | `app/login/page.tsx` |
| Form library | `react-hook-form` |
| Validation | `zod` |
| Auth client | `authClient.signIn.email` |
| Success redirect | `/dashboard` |
| Field utama | Email, password, remember me |
| UI tambahan | Password visibility toggle dan teks bantuan administrator |

## Test Data

| Data | Kegunaan | Catatan |
|---|---|---|
| Valid email | Login success case | Gunakan akun seed/test, jangan pakai credential pribadi. |
| Valid password | Login success case | Simpan di env lokal khusus test jika dibutuhkan. |
| Invalid email format | Validasi email | Contoh: `not-an-email`. |
| Wrong credential | Auth failure | Contoh email valid format dengan password salah. |
| Empty values | Required validation | Email dan password kosong. |

## Unit Test - Component

Unit/component test menggunakan Vitest dan React Testing Library. Mock dependency eksternal seperti `authClient.signIn.email` dan `next/navigation`.

### Positive Case

| ID | Skenario | Langkah | Expected Result | Prioritas |
|---|---|---|---|---|
| LGN-UT-P01 | Render halaman login | Render `LoginPage`. | Heading `Sign in to Exam App`, deskripsi, field email, field password, checkbox remember me, tombol submit, dan teks bantuan tampil. | High |
| LGN-UT-P02 | Input email dan password valid | Isi email valid dan password, lalu submit. | `authClient.signIn.email` dipanggil dengan `email`, `password`, dan `rememberMe: false`. | High |
| LGN-UT-P03 | Remember me aktif | Centang `Remember me`, isi form valid, lalu submit. | `authClient.signIn.email` dipanggil dengan `rememberMe: true`. | Medium |
| LGN-UT-P04 | Login berhasil redirect ke dashboard | Mock `authClient.signIn.email` mengembalikan `{ error: null }`, lalu submit form valid. | `router.push("/dashboard")` dan `router.refresh()` dipanggil. | High |
| LGN-UT-P05 | Toggle show password | Klik tombol `Show password`. | Input password berubah dari `type="password"` menjadi `type="text"` dan aria-label berubah menjadi `Hide password`. | Medium |
| LGN-UT-P06 | Toggle hide password | Klik tombol show password dua kali. | Input password kembali menjadi `type="password"` dan aria-label kembali menjadi `Show password`. | Medium |
| LGN-UT-P07 | Loading state saat submit | Submit form valid saat promise auth belum selesai. | Button submit disabled dan teks berubah menjadi `Signing in...`. | Medium |

### Negative Case

| ID | Skenario | Langkah | Expected Result | Prioritas |
|---|---|---|---|---|
| LGN-UT-N01 | Submit dengan email kosong | Kosongkan email, isi password, lalu submit. | Error `Email is required.` atau validasi email tampil dan `authClient.signIn.email` tidak dipanggil. | High |
| LGN-UT-N02 | Submit dengan format email invalid | Isi email `not-an-email`, isi password, lalu submit. | Error `Enter a valid email address.` tampil dan `authClient.signIn.email` tidak dipanggil. | High |
| LGN-UT-N03 | Submit dengan password kosong | Isi email valid, kosongkan password, lalu submit. | Error `Password is required.` tampil dan `authClient.signIn.email` tidak dipanggil. | High |
| LGN-UT-N04 | Login gagal dari server | Mock `authClient.signIn.email` mengembalikan error dengan message. | Error dari server tampil di form dan tidak redirect ke `/dashboard`. | High |
| LGN-UT-N05 | Login gagal tanpa message dari server | Mock `authClient.signIn.email` mengembalikan error tanpa message. | Fallback error `Unable to sign in.` tampil. | Medium |
| LGN-UT-N06 | Field disabled saat submitting | Submit form valid dan tahan promise auth. | Email, password, checkbox, password toggle, dan submit button disabled selama submit. | Medium |

## End-to-End Flow

E2E test menggunakan Playwright. Untuk skenario yang membutuhkan login sukses, database test harus memiliki akun valid terlebih dahulu karena sign up manual dinonaktifkan.

### Positive Case

| ID | Skenario | Langkah | Expected Result | Prioritas |
|---|---|---|---|---|
| LGN-E2E-P01 | Membuka halaman login | Buka `/login`. | Halaman login tampil dengan heading, email, password, remember me, tombol sign in, dan teks bantuan. | High |
| LGN-E2E-P02 | User dapat mengisi form | Buka `/login`, isi email dan password. | Nilai email dan password terisi sesuai input user. | High |
| LGN-E2E-P03 | Remember me dapat dicentang | Buka `/login`, klik checkbox `Remember me`. | Checkbox berubah menjadi checked. | Medium |
| LGN-E2E-P04 | Password bisa ditampilkan dan disembunyikan | Isi password, klik tombol show/hide password. | Password input berubah ke text, lalu kembali ke password. | Medium |
| LGN-E2E-P05 | Login sukses menuju dashboard | Gunakan akun test valid, isi form, lalu klik `Sign in`. | User diarahkan ke `/dashboard`. | High |
| LGN-E2E-P06 | Login sukses dengan remember me | Gunakan akun test valid, centang `Remember me`, lalu login. | User diarahkan ke `/dashboard` dan session tetap valid sesuai konfigurasi Better Auth. | Medium |

### Negative Case

| ID | Skenario | Langkah | Expected Result | Prioritas |
|---|---|---|---|---|
| LGN-E2E-N01 | Submit form kosong | Buka `/login`, klik `Sign in` tanpa mengisi field. | Validasi form tampil dan tetap berada di `/login`. | High |
| LGN-E2E-N02 | Submit email invalid | Isi email `not-an-email`, isi password, lalu submit. | Validasi email tampil dan tetap berada di `/login`. | High |
| LGN-E2E-N03 | Submit password kosong | Isi email valid, kosongkan password, lalu submit. | Validasi password tampil dan tetap berada di `/login`. | High |
| LGN-E2E-N04 | Credential salah | Isi email format valid dengan password salah, lalu submit. | Error login tampil dan user tidak diarahkan ke `/dashboard`. | High |
| LGN-E2E-N05 | Double submit dicegah | Isi form valid, klik `Sign in` berulang saat loading. | Hanya satu request login efektif dan tombol disabled saat submit berjalan. | Medium |
| LGN-E2E-N06 | Refresh setelah login gagal | Setelah login gagal, refresh halaman. | User tetap berada di `/login` dan tidak memiliki session dashboard. | Medium |

## Catatan Implementasi Test

| Area | Catatan |
|---|---|
| Unit/component | Mock `authClient.signIn.email`, `router.push`, dan `router.refresh` agar test tidak bergantung ke server. |
| E2E success login | Siapkan database test dan akun test sebelum menjalankan Playwright. |
| E2E negative login | Bisa menggunakan credential salah tanpa membuat data baru. |
| Secret test | Jangan commit email/password real. Gunakan env lokal seperti `E2E_TEST_EMAIL` dan `E2E_TEST_PASSWORD` jika test login sukses dibuat. |
| Stabilitas selector | Prioritaskan selector berbasis role dan label, misalnya `getByRole`, `getByLabel`, dan `getByText`. |
