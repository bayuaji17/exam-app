# Database Structure

Terakhir diperbarui: 2026-05-18 02:07:05 +07:00

Dokumen ini mengikuti schema aktual di `lib/db/schema.ts`. Schema mencakup tabel auth dari Better Auth, role aplikasi, dan domain ujian yang sudah dibangun (bank soal, paket ujian, jadwal, grup peserta, dan eligibility).

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

## Tabel: `participant_group`

Menyimpan grup peserta — kumpulan datar akun role `user` yang dapat diberi akses ke jadwal ujian sekaligus.

| Kolom        | Tipe Drizzle | Tipe PostgreSQL | Constraint / Default      | Kegunaan                              |
| ------------ | ------------ | --------------- | ------------------------- | ------------------------------------- |
| `id`         | `text`       | `text`          | Primary key               | ID unik grup.                         |
| `name`       | `text`       | `text`          | Not null                  | Nama grup (unik case-insensitive).    |
| `description`| `text`       | `text`          | Nullable                  | Deskripsi opsional grup.              |
| `createdAt`  | `timestamp`  | `timestamp`     | Not null, default `now()` | Waktu grup dibuat.                    |
| `updatedAt`  | `timestamp`  | `timestamp`     | Not null, default `now()` | Waktu grup terakhir diperbarui.       |

Index:

| Nama Index                        | Kolom    | Kegunaan                                            |
| --------------------------------- | -------- | --------------------------------------------------- |
| `participant_group_lower_name_idx`| `lower(name)` | Mempercepat pencarian nama grup case-insensitive. |

## Tabel: `participant_group_member`

Keanggotaan peserta dalam grup (many-to-many user ↔ group).

| Kolom        | Tipe Drizzle | Tipe PostgreSQL | Constraint / Default      | Kegunaan                       |
| ------------ | ------------ | --------------- | ------------------------- | ------------------------------ |
| `id`         | `text`       | `text`          | Primary key               | ID unik baris keanggotaan.     |
| `groupId`    | `text`       | `text`          | Not null, FK `participant_group.id` `onDelete: cascade` | Grup yang berisi peserta.      |
| `userId`     | `text`       | `text`          | Not null, FK `user.id` `onDelete: cascade` | Akun peserta anggota grup.     |
| `createdAt`  | `timestamp`  | `timestamp`     | Not null, default `now()` | Waktu peserta bergabung.       |

Index: `participant_group_member_groupId_idx`, `participant_group_member_userId_idx`, dan unique `participant_group_member_groupId_userId_idx` (satu peserta maksimal sekali per grup).

## Tabel: `schedule_user_eligibility`

Pemberian akses langsung seorang peserta ke satu jadwal ujian.

| Kolom        | Tipe Drizzle | Tipe PostgreSQL | Constraint / Default      | Kegunaan                             |
| ------------ | ------------ | --------------- | ------------------------- | ------------------------------------ |
| `id`         | `text`       | `text`          | Primary key               | ID unik grant.                       |
| `scheduleId` | `text`       | `text`          | Not null, FK `exam_schedule.id` `onDelete: cascade` | Jadwal yang diberi akses.            |
| `userId`     | `text`       | `text`          | Not null, FK `user.id` `onDelete: cascade` | Peserta yang diberi akses.           |
| `createdAt`  | `timestamp`  | `timestamp`     | Not null, default `now()` | Waktu grant dibuat.                  |

Index: `schedule_user_eligibility_scheduleId_idx`, `schedule_user_eligibility_userId_idx`, dan unique `schedule_user_eligibility_scheduleId_userId_idx`.

## Tabel: `schedule_group_eligibility`

Pemberian akses satu grup peserta ke satu jadwal ujian — seluruh anggota grup otomatis eligible.

| Kolom        | Tipe Drizzle | Tipe PostgreSQL | Constraint / Default      | Kegunaan                             |
| ------------ | ------------ | --------------- | ------------------------- | ------------------------------------ |
| `id`         | `text`       | `text`          | Primary key               | ID unik grant.                       |
| `scheduleId` | `text`       | `text`          | Not null, FK `exam_schedule.id` `onDelete: cascade` | Jadwal yang diberi akses.            |
| `groupId`    | `text`       | `text`          | Not null, FK `participant_group.id` `onDelete: restrict` | Grup yang diberi akses.              |
| `createdAt`  | `timestamp`  | `timestamp`     | Not null, default `now()` | Waktu grant dibuat.                  |

Index: `schedule_group_eligibility_scheduleId_idx`, `schedule_group_eligibility_groupId_idx`, dan unique `schedule_group_eligibility_scheduleId_groupId_idx`.

## Relasi eligibility

| Dari                           | Ke                    | Aturan                     | Kegunaan                                        |
| ------------------------------ | --------------------- | -------------------------- | ----------------------------------------------- |
| `participant_group_member.groupId` | `participant_group.id` | `onDelete: cascade`     | Menghapus grup melepas seluruh anggota.         |
| `participant_group_member.userId`  | `user.id`           | `onDelete: cascade`        | Menghapus user melepas keanggotaan grupnya.     |
| `schedule_user_eligibility.scheduleId` | `exam_schedule.id` | `onDelete: cascade`      | Menghapus jadwal menghapus grant-nya.           |
| `schedule_user_eligibility.userId` | `user.id`          | `onDelete: cascade`        | Menghapus user menghapus grant langsungnya.     |
| `schedule_group_eligibility.scheduleId` | `exam_schedule.id` | `onDelete: cascade`    | Menghapus jadwal menghapus grant grupnya.       |
| `schedule_group_eligibility.groupId` | `participant_group.id` | `onDelete: restrict`  | Grup yang sedang diberi akses tidak bisa dihapus. |

## Catatan

- Nama tabel `user`, `session`, `account`, dan `verification` mengikuti schema Better Auth.
- Kolom `username` dan `displayUsername` berasal dari Better Auth username plugin.
- Beberapa nama kolom menggunakan camelCase seperti `emailVerified`, `createdAt`, dan `userId` karena mengikuti schema yang didefinisikan di Drizzle.
- Domain ujian yang belum ada di schema ini: attempt/pengerjaan, sesi, hasil, laporan, activity tracking, dan anti-cheat (lihat ADR-0007 dan ADR-0009).

## Tabel: `attempt`

Pengerjaan ujian seorang peserta pada satu jadwal. Semua attempt selalu disimpan (riwayat); batas percobaan dihitung dari jumlah baris.

| Kolom            | Tipe Drizzle | Tipe PostgreSQL | Constraint / Default              | Kegunaan                                        |
| ---------------- | ------------ | --------------- | --------------------------------- | ----------------------------------------------- |
| `id`             | `text`       | `text`          | Primary key                       | ID unik attempt.                                |
| `scheduleId`     | `text`       | `text`          | Not null, FK `exam_schedule.id` `onDelete: restrict` | Jadwal yang dikerjakan.             |
| `participantId`  | `text`       | `text`          | Not null, FK `user.id` `onDelete: cascade` | Peserta pemilik attempt.             |
| `startedAt`      | `timestamp`  | `timestamp`     | Not null, default `now()`         | Waktu attempt dimulai.                          |
| `deadlineAt`     | `timestamp`  | `timestamp`     | Nullable                          | Batas waktu server-side (start + durasi); null = tanpa batas. |
| `submittedAt`    | `timestamp`  | `timestamp`     | Nullable                          | Waktu dikumpulkan; null = masih terbuka.        |
| `questionOrder`  | `jsonb`      | `jsonb`         | Not null                          | Snapshot urutan soal (id), di-shuffle saat mulai jika paket memintanya. |
| `score`          | `numeric`    | `numeric(8,2)`  | Nullable                          | Skor total saat dikumpulkan (manual dihitung di slice penilaian). |
| `createdAt`      | `timestamp`  | `timestamp`     | Not null, default `now()`         | Waktu dibuat.                                   |
| `updatedAt`      | `timestamp`  | `timestamp`     | Not null, default `now()`         | Waktu terakhir diperbarui.                      |

Index: `attempt_scheduleId_idx`, `attempt_participantId_idx`, `attempt_scheduleId_participantId_idx`. Tidak ada unique constraint — riwayat attempt terjaga dan batas percobaan dihitung dengan `count`.

## Tabel: `attempt_answer`

Jawaban per soal dalam sebuah attempt, di-upsert setiap kali peserta menyimpan.

| Kolom        | Tipe Drizzle | Tipe PostgreSQL | Constraint / Default      | Kegunaan                                   |
| ------------ | ------------ | --------------- | ------------------------- | ------------------------------------------ |
| `id`         | `text`       | `text`          | Primary key               | ID unik jawaban.                           |
| `attemptId`  | `text`       | `text`          | Not null, FK `attempt.id` `onDelete: cascade` | Attempt pemilik jawaban.        |
| `questionId` | `text`       | `text`          | Not null, FK `question.id` `onDelete: restrict` | Soal yang dijawab.             |
| `answer`     | `jsonb`      | `jsonb`         | Not null                  | `{ chosenOptionId }` untuk single/scored; `{ text }` untuk manual. |
| `autoScore`  | `numeric`    | `numeric(8,2)`  | Nullable                  | Skor otomatis per soal (dihitung saat submit; manual tetap null). |
| `updatedAt`  | `timestamp`  | `timestamp`     | Not null, default `now()` | Waktu jawaban terakhir disimpan.           |

Index: `attempt_answer_attemptId_idx`, `attempt_answer_questionId_idx`, dan unique `attempt_answer_attemptId_questionId_idx`.

## Catatan

- `exam_schedule.attemptLimit` (integer, nullable): `0`/`NULL` = tak terbatas, positif = maksimum percobaan per peserta per jadwal. Lihat ADR-0010.
- Domain ujian yang belum ada di schema ini: penilaian manual, hasil/laporan, activity tracking, dan anti-cheat (lihat ADR-0007, ADR-0009, ADR-0010).

## Kolom penilaian manual di `attempt_answer`

| Kolom         | Tipe Drizzle | Tipe PostgreSQL | Constraint / Default      | Kegunaan                                       |
| ------------- | ------------ | --------------- | ------------------------- | ---------------------------------------------- |
| `manualScore` | `numeric`    | `numeric(8,2)`  | Nullable                  | Nilai manual untuk soal manual (0..bobot).     |
| `gradedBy`    | `text`       | `text`          | Nullable, FK `user.id`    | Admin yang memberi nilai.                      |
| `gradedAt`    | `timestamp`  | `timestamp`     | Nullable                  | Waktu penilaian.                               |

Total attempt = jumlah seluruh `autoScore` + `manualScore` (lihat ADR-0011); dihitung ulang setiap kali nilai manual disimpan atau dihapus.

## Tabel: `participant_import`

Riwayat import peserta dari Excel (ADR-0012) — setiap batch tercatat untuk audit.

| Kolom       | Tipe Drizzle | Tipe PostgreSQL | Constraint / Default      | Kegunaan                         |
| ----------- | ------------ | --------------- | ------------------------- | -------------------------------- |
| `id`        | `text`       | `text`          | Primary key               | ID unik import.                  |
| `adminId`   | `text`       | `text`          | Not null, FK `user.id` `onDelete: restrict` | Admin yang menjalankan import.   |
| `fileName`  | `text`       | `text`          | Not null                  | Nama file (format `import-<ts>.xlsx`). |
| `total`     | `integer`    | `integer`       | Not null, default 0       | Jumlah baris diimpor.            |
| `created`   | `integer`    | `integer`       | Not null, default 0       | Jumlah akun yang dibuat.         |
| `createdAt` | `timestamp`  | `timestamp`     | Not null, default `now()` | Waktu import.                    |

Index: `participant_import_adminId_idx`, `participant_import_createdAt_idx`.

## Kolom introduction di `exam_schedule`

| Kolom          | Tipe Drizzle | Tipe PostgreSQL | Constraint / Default | Kegunaan                                                          |
| -------------- | ------------ | --------------- | -------------------- | ----------------------------------------------------------------- |
| `introduction` | `jsonb`      | `jsonb`         | Nullable             | Dokumen TipTap pengantar ujian (policy INTRODUCTION, ADR-0013).    |

Null = teks default; terisi = ditampilkan di halaman pengantar peserta. Divalidasi dengan `INTRODUCTION_POLICY` (tanpa gambar, math, atau tabel).
