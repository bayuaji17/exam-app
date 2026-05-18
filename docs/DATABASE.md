# Database Structure

Terakhir diperbarui: 2026-05-18 02:07:05 +07:00

Dokumen ini mengikuti schema aktual di `lib/db/schema.ts`. Untuk saat ini schema database baru mencakup tabel auth dari Better Auth dan role aplikasi.

## Enum: `app_role`

Enum `app_role` dipakai oleh kolom `user.role`.

| Value         | Kegunaan                                                                              |
| ------------- | ------------------------------------------------------------------------------------- |
| `super-admin` | Role tertinggi. Dapat membuat admin dan user. Tidak dibuat dari flow aplikasi normal. |
| `admin`       | Role pengelola. Dapat membuat user.                                                   |
| `user`        | Role peserta/pengguna biasa. Tidak dapat membuat user lain dan tidak sign up manual.  |

## Tabel: `user`

Menyimpan data user utama untuk autentikasi, profil dasar, role aplikasi, dan status ban.

| Kolom             | Tipe Drizzle | Tipe PostgreSQL | Constraint / Default      | Kegunaan                                                                   |
| ----------------- | ------------ | --------------- | ------------------------- | -------------------------------------------------------------------------- |
| `id`              | `text`       | `text`          | Primary key               | ID unik user.                                                              |
| `name`            | `text`       | `text`          | Not null                  | Nama user yang ditampilkan.                                                |
| `email`           | `text`       | `text`          | Not null, unique          | Email login dan identitas unik user.                                       |
| `emailVerified`   | `boolean`    | `boolean`       | Not null, default `false` | Menandai apakah email user sudah terverifikasi.                            |
| `image`           | `text`       | `text`          | Nullable                  | URL atau path avatar user.                                                 |
| `username`        | `text`       | `text`          | Nullable, unique          | Username login yang sudah dinormalisasi oleh Better Auth.                  |
| `displayUsername` | `text`       | `text`          | Nullable                  | Username display/non-normalized untuk ditampilkan ke user.                 |
| `createdAt`       | `timestamp`  | `timestamp`     | Not null, default `now()` | Waktu data user dibuat.                                                    |
| `updatedAt`       | `timestamp`  | `timestamp`     | Not null, default `now()` | Waktu data user terakhir diperbarui.                                       |
| `role`            | `app_role`   | `app_role`      | Not null, default `user`  | Role aplikasi: `super-admin`, `admin`, atau `user`.                        |
| `banned`          | `boolean`    | `boolean`       | Not null, default `false` | Status apakah user sedang diblokir.                                        |
| `banReason`       | `text`       | `text`          | Nullable                  | Alasan user diblokir.                                                      |
| `banExpires`      | `timestamp`  | `timestamp`     | Nullable                  | Waktu berakhirnya ban. Null berarti tidak ada masa berakhir yang disimpan. |

## Tabel: `session`

Menyimpan sesi login user.

| Kolom            | Tipe Drizzle | Tipe PostgreSQL | Constraint / Default                                  | Kegunaan                                              |
| ---------------- | ------------ | --------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `id`             | `text`       | `text`          | Primary key                                           | ID unik session.                                      |
| `expiresAt`      | `timestamp`  | `timestamp`     | Not null                                              | Waktu session kedaluwarsa.                            |
| `token`          | `text`       | `text`          | Not null, unique                                      | Token session untuk autentikasi request.              |
| `createdAt`      | `timestamp`  | `timestamp`     | Not null, default `now()`                             | Waktu session dibuat.                                 |
| `updatedAt`      | `timestamp`  | `timestamp`     | Not null, default `now()`                             | Waktu session terakhir diperbarui.                    |
| `ipAddress`      | `text`       | `text`          | Nullable                                              | Alamat IP saat session dibuat atau digunakan.         |
| `userAgent`      | `text`       | `text`          | Nullable                                              | User agent browser/client.                            |
| `userId`         | `text`       | `text`          | Not null, foreign key ke `user.id`, on delete cascade | User pemilik session.                                 |
| `impersonatedBy` | `text`       | `text`          | Nullable                                              | ID user/admin yang melakukan impersonation, jika ada. |

Index:

| Nama Index           | Kolom    | Kegunaan                                        |
| -------------------- | -------- | ----------------------------------------------- |
| `session_userId_idx` | `userId` | Mempercepat pencarian session berdasarkan user. |

## Tabel: `account`

Menyimpan account credential/provider yang terhubung dengan user. Untuk email/password, kolom `password` menyimpan password hash yang dikelola Better Auth.

| Kolom                   | Tipe Drizzle | Tipe PostgreSQL | Constraint / Default                                  | Kegunaan                                                       |
| ----------------------- | ------------ | --------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| `id`                    | `text`       | `text`          | Primary key                                           | ID unik account.                                               |
| `accountId`             | `text`       | `text`          | Not null                                              | ID account dari provider auth.                                 |
| `providerId`            | `text`       | `text`          | Not null                                              | ID provider auth, misalnya credential/email-password provider. |
| `userId`                | `text`       | `text`          | Not null, foreign key ke `user.id`, on delete cascade | User pemilik account credential/provider.                      |
| `accessToken`           | `text`       | `text`          | Nullable                                              | Access token dari provider eksternal, jika ada.                |
| `refreshToken`          | `text`       | `text`          | Nullable                                              | Refresh token dari provider eksternal, jika ada.               |
| `idToken`               | `text`       | `text`          | Nullable                                              | ID token dari provider eksternal, jika ada.                    |
| `accessTokenExpiresAt`  | `timestamp`  | `timestamp`     | Nullable                                              | Waktu access token kedaluwarsa.                                |
| `refreshTokenExpiresAt` | `timestamp`  | `timestamp`     | Nullable                                              | Waktu refresh token kedaluwarsa.                               |
| `scope`                 | `text`       | `text`          | Nullable                                              | Scope permission dari provider eksternal.                      |
| `password`              | `text`       | `text`          | Nullable                                              | Password hash untuk email/password auth.                       |
| `createdAt`             | `timestamp`  | `timestamp`     | Not null, default `now()`                             | Waktu account dibuat.                                          |
| `updatedAt`             | `timestamp`  | `timestamp`     | Not null, default `now()`                             | Waktu account terakhir diperbarui.                             |

Index:

| Nama Index           | Kolom    | Kegunaan                                        |
| -------------------- | -------- | ----------------------------------------------- |
| `account_userId_idx` | `userId` | Mempercepat pencarian account berdasarkan user. |

## Tabel: `verification`

Menyimpan data verifikasi sementara dari Better Auth, seperti token verifikasi atau flow auth lain yang membutuhkan identifier dan masa kedaluwarsa.

| Kolom        | Tipe Drizzle | Tipe PostgreSQL | Constraint / Default      | Kegunaan                                                  |
| ------------ | ------------ | --------------- | ------------------------- | --------------------------------------------------------- |
| `id`         | `text`       | `text`          | Primary key               | ID unik data verification.                                |
| `identifier` | `text`       | `text`          | Not null                  | Identifier flow verifikasi, misalnya email atau key lain. |
| `value`      | `text`       | `text`          | Not null                  | Nilai/token verifikasi yang disimpan.                     |
| `expiresAt`  | `timestamp`  | `timestamp`     | Not null                  | Waktu token/data verifikasi kedaluwarsa.                  |
| `createdAt`  | `timestamp`  | `timestamp`     | Not null, default `now()` | Waktu data verification dibuat.                           |
| `updatedAt`  | `timestamp`  | `timestamp`     | Not null, default `now()` | Waktu data verification terakhir diperbarui.              |

Index:

| Nama Index                    | Kolom        | Kegunaan                                                   |
| ----------------------------- | ------------ | ---------------------------------------------------------- |
| `verification_identifier_idx` | `identifier` | Mempercepat pencarian verification berdasarkan identifier. |

## Relasi

| Dari             | Ke        | Aturan              | Kegunaan                                                            |
| ---------------- | --------- | ------------------- | ------------------------------------------------------------------- |
| `session.userId` | `user.id` | `onDelete: cascade` | Session akan ikut terhapus ketika user dihapus.                     |
| `account.userId` | `user.id` | `onDelete: cascade` | Account credential/provider akan ikut terhapus ketika user dihapus. |

## Catatan

- Nama tabel `user`, `session`, `account`, dan `verification` mengikuti schema Better Auth.
- Kolom `username` dan `displayUsername` berasal dari Better Auth username plugin.
- Beberapa nama kolom menggunakan camelCase seperti `emailVerified`, `createdAt`, dan `userId` karena mengikuti schema yang didefinisikan di Drizzle.
- Domain ujian belum ada di schema ini. Tabel seperti exam, question, answer, exam session, participant, scoring, report, media, dan activity tracking perlu ditambahkan pada tahap berikutnya.
