# Daftar Fitur Menu Dashboard & Status Pengembangan

Dokumen ini menyajikan inventaris lengkap seluruh fitur pada menu navigasi Dashboard, pemetaan hak akses (*Role-Based Access Control* / RBAC), cakupan teknis (routes, komponen, server actions, skema basis data), dan status pengembangannya saat ini.

Terakhir diperbarui: 2026-09-05

---

## 1. Ringkasan Status Pengembangan

| Status | Definisi | Jumlah Menu |
|---|---|:---:|
| 🟢 **Implemented** | Fitur telah selesai diimplementasikan secara menyeluruh (Halaman UI, Server Actions, Schema Database, Validasi, dan Pengujian Unit/E2E). | **16** |
| 🟡 **Integrated / Embedded** | Fitur aktif dan terintegrasi di dalam modul lain yang berhubungan (belum dipisah ke halaman mandiri). | **3** |
| ⚪ **Planned / Roadmap** | Fitur telah terdaftar dalam menu, skema data, dan katalog perizinan, namun halaman antarmuka visual khusus masih dalam roadmap rilis. | **4** |

---

## 2. Rincian Fitur Berdasarkan Menu Navigasi Dashboard

### 2.1. Overview

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Dashboard**<br>`/dashboard` | *Autentikasi Akun* | 🟢 **Implemented** | `app/(dashboard)/dashboard/page.tsx`<br>`lib/dashboard/stats.ts` | • Menampilkan 6 metrik kartu ringkasan: Bank Soal, Soal, Paket Ujian, Jadwal Ujian, Pengerjaan, dan Peserta.<br>• Tabel Jadwal Ujian Mendatang (*Upcoming Schedules*).<br>• Tampilan dinamis berbasis role: Admin melihat ringkasan statistik platform, sedangkan Peserta diarahkan ke daftar ujian aktif. |

---

### 2.2. Manajemen Pengguna

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Data Administrator**<br>`/dashboard/admins` | `admins:read`<br>`admins:create`<br>`admins:update`<br>`admins:delete`<br>(Super Admin) | 🟢 **Implemented** | `app/(dashboard)/dashboard/admins/page.tsx`<br>`lib/user/actions.ts` | • Menampilkan daftar akun pengelola/administrator.<br>• Form pembuatan admin baru, pembaruan data, dan penghapusan akun admin.<br>• Proteksi route khusus role Super Admin. |
| **Data Peserta**<br>`/dashboard/users` | `users:read`<br>`users:create`<br>`users:update`<br>`users:delete` | 🟢 **Implemented** | `app/(dashboard)/dashboard/users/page.tsx`<br>`app/(dashboard)/dashboard/users/new/page.tsx`<br>`app/(dashboard)/dashboard/users/[id]/edit/page.tsx`<br>`app/(dashboard)/dashboard/users/import/page.tsx`<br>`components/participant-import-form.tsx` | • Roster peserta ujian dengan nomor identitas (NISN, NIS, NIP).<br>• Pencarian, filter status ban, dan pagination.<br>• Form registrasi manual peserta & edit data/ganti role/ban-unban.<br>• Impor peserta massal via berkas Excel (.xlsx). |
| **Grup Peserta**<br>`/dashboard/user-groups` | `user_groups:read`<br>`user_groups:create`<br>`user_groups:update`<br>`user_groups:delete` | 🟢 **Implemented** | `app/(dashboard)/dashboard/user-groups/page.tsx`<br>`app/(dashboard)/dashboard/user-groups/[slug]/page.tsx`<br>`lib/user-group/actions.ts` | • Pengelompokan peserta ujian (kelas, rombel, angkatan).<br>• Manajemen anggota grup peserta.<br>• Dipakai sebagai target *eligibility* pengerjaan ujian pada jadwal tertentu. |
| **Role & Permission**<br>`/dashboard/roles` | `roles:read`<br>`roles:create`<br>`roles:update`<br>`roles:delete` | 🟢 **Implemented** | `app/(dashboard)/dashboard/roles/page.tsx`<br>`app/(dashboard)/dashboard/roles/new/page.tsx`<br>`app/(dashboard)/dashboard/roles/[id]/edit/page.tsx`<br>`lib/roles/actions.ts` | • Role-Based Access Control (RBAC) dinamis.<br>• Matriks konfigurasi perizinan per modul.<br>• Penugasan role kustom ke pengguna dengan proteksi role sistem bawaan. |

---

### 2.3. Manajemen Ujian

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Bank Soal**<br>`/dashboard/question-banks` | `questions:read`<br>`questions:create`<br>`questions:update`<br>`questions:delete` | 🟢 **Implemented** | `app/(dashboard)/dashboard/question-banks/page.tsx`<br>`app/(dashboard)/dashboard/question-banks/[slug]/page.tsx`<br>`components/question-banks/` | • Bank soal berbasis kategori.<br>• Editor butir soal lengkap dengan varian tipe (Pilihan Ganda, Pilihan Ganda Kompleks, Benar/Salah, Menjodohkan, Esai/Uraian).<br>• Media upload audio, gambar, dan video. |
| **Paket Ujian**<br>`/dashboard/exams` | `exams:read`<br>`exams:create`<br>`exams:update`<br>`exams:delete` | 🟢 **Implemented** | `app/(dashboard)/dashboard/exams/page.tsx`<br>`app/(dashboard)/dashboard/exams/[slug]/edit/page.tsx`<br>`lib/exam-package/actions.ts` | • Bundling kumpulan soal dari berbagai bank soal.<br>• Pengaturan KKM (*Passing Score*), durasi pengerjaan menit, dan total poin akumulasi.<br>• Fitur acak soal (*shuffle questions*) dan acak opsi jawaban. |
| **Jadwal Ujian**<br>`/dashboard/exam-schedules` | `schedules:read`<br>`schedules:create`<br>`schedules:update`<br>`schedules:delete` | 🟢 **Implemented** | `app/(dashboard)/dashboard/exam-schedules/page.tsx`<br>`app/(dashboard)/dashboard/exam-schedules/new/page.tsx`<br>`app/(dashboard)/dashboard/exam-schedules/[slug]/edit/page.tsx`<br>`lib/exam-schedule/actions.ts` | • Penjadwalan tanggal mulai dan berakhirnya sesi ujian.<br>• Integrasi token akses dinamis (otomatis / manual).<br>• Batasan kuota peserta, durasi pengerjaan, dan *target eligibility* (berdasarkan grup/kelas peserta). |

---

### 2.4. Pelaksanaan & Pengawasan Ujian

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Aturan Akses Ujian**<br>`/dashboard/exam-access-rules` | `schedules:update` | 🟢 **Implemented** | `app/(dashboard)/dashboard/exam-access-rules/page.tsx`<br>`lib/exam-access/` | • Konfigurasi restriksi browser (Safe Exam Browser / Lockdown Mode).<br>• Pembatasan rentang IP jaringan / subnet lab komputer.<br>• Kebijakan proteksi copy-paste, watermark layar peserta, dan deteksi perpindahan tab (*tab switch violation*). |
| **Introduksi Ujian**<br>`/dashboard/exam-introductions` | `schedules:update` | 🟢 **Implemented** | `app/(dashboard)/dashboard/exam-introductions/page.tsx`<br>`lib/exam-introduction/` | • Pengaturan teks petunjuk umum pengerjaan ujian.<br>• Kebijakan persetujuan pakta integritas kejujuran pengerjaan sebelum token dimasukkan. |
| **Ruang Tunggu & Token**<br>`/exam/[slug]/waiting-room` | *Peserta Terdaftar* | 🟢 **Implemented** | `app/(student)/exam/[slug]/waiting-room/page.tsx`<br>`lib/exam-schedule/token-actions.ts` | • Ruang tunggu pengerjaan sebelum waktu mulai tercapai.<br>• Input verifikasi token akses jadwal ujian.<br>• Timer hitung mundur (*countdown*) otomatis menuju waktu mulai ujian. |
| **Monitoring Pelaksanaan**<br>`/dashboard/exam-monitoring` | `proctoring:read` | 🟡 **Integrated** | `app/(dashboard)/dashboard/exam-schedules/[slug]/proctoring/page.tsx` | • Terintegrasi langsung di dalam menu **Jadwal Ujian** $\rightarrow$ *Aksi Pengawasan (Proctoring)*.<br>• Pantauan langsung status peserta (belum mulai, sedang mengerjakan, telah selesai, terindikasi pelanggaran).<br>• Aksi proctor: Reset sesi login peserta, beri tambahan waktu, dan hentikan paksa pengerjaan. |

---

### 2.5. Penilaian & Evaluasi

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Hasil Ujian**<br>`/dashboard/exam-results` | `results:read`<br>`results:manage` | 🟢 **Implemented** | `app/(dashboard)/dashboard/exam-results/page.tsx`<br>`app/(dashboard)/dashboard/exam-results/[slug]/page.tsx` | • Daftar hasil ujian per jadwal pelaksanaan.<br>• Rincian skor peserta, waktu pengerjaan, status submit (manual vs otomatis/deadline), dan status kelulusan. |
| **Penilaian Manual**<br>`/dashboard/manual-grading` | `grading:read`<br>`grading:grade` | 🟢 **Implemented** | `app/(dashboard)/dashboard/manual-grading/page.tsx`<br>`app/(dashboard)/dashboard/manual-grading/[attemptId]/page.tsx`<br>`lib/grading/actions.ts` | • Antarmuka koreksi jawaban uraian/esai bagi penguji.<br>• Rubrik penilaian dan input skor per nomor butir esai.<br>• Rekalkulasi otomatis total skor akhir dan sinkronisasi status evaluasi selesai. |
| **Riwayat Pengerjaan**<br>`/dashboard/attempt-history` | `results:read` | 🟡 **Integrated** | `app/(dashboard)/dashboard/exam-results/[slug]/page.tsx` | • Riwayat pengerjaan saat ini dapat diakses secara detail melalui halaman **Hasil Ujian** dan **Penilaian Manual**. Halaman penelusuran riwayat global terpadu masih direncanakan. |

---

### 2.6. Laporan

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Laporan Hasil Ujian**<br>`/dashboard/reports/exam-results` | `reports:export` | 🟢 **Implemented** | `app/(dashboard)/dashboard/reports/exam-results/page.tsx`<br>`app/(dashboard)/dashboard/reports/exam-results/[slug]/page.tsx`<br>`components/reports/`<br>`lib/reports/export.ts`<br>`app/api/reports/exam-results/[scheduleId]/route.ts` | • Dashboard overview seluruh jadwal ujian dengan tingkat kelulusan dan rata-rata nilai.<br>• Halaman analitik detail jadwal dengan 4 kartu metrik KPI (Tingkat Kelulusan, Rata-rata Skor, Partisipasi, Rentang Nilai).<br>• Visualisasi grafik distribusi 5 rentang nilai (0-20 s/d 81-100).<br>• Roster nilai peserta lengkap dengan NISN, NIS, NIP, status koreksi manual, dan status kelulusan.<br>• Ekspor instan ke format Excel multi-sheet (.xlsx) dan RFC 4180 CSV (.csv). |
| **Laporan Individu**<br>`/dashboard/reports/individual` | `reports:export` | ⚪ **Planned** | Schema & Database Data Siap | • Direncanakan untuk pencetakan rapor/sertifikat hasil asesmen per peserta format cetak / PDF. |
| **Laporan Per Sesi**<br>`/dashboard/reports/sessions` | `reports:export` | ⚪ **Planned** | Schema & Database Data Siap | • Direncanakan untuk rekapitulasi kehadiran, persentase penyelesaian, dan statistik pengerjaan per sesi/ruangan. |

---

### 2.7. Pengaturan

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Profile**<br>`/dashboard/settings/profile` | *Autentikasi Akun* | 🟢 **Implemented** | `app/(dashboard)/dashboard/settings/profile/page.tsx`<br>`app/(dashboard)/dashboard/profile/page.tsx` | • Tinjau informasi profil akun, nama tampilan, email, dan nomor identitas (NISN, NIS, NIP). |
| **Security**<br>`/dashboard/settings/security` | *Autentikasi Akun* | 🟢 **Implemented** | `app/(dashboard)/dashboard/settings/security/page.tsx`<br>`app/(dashboard)/dashboard/settings/security/sessions/page.tsx` | • Penggantian kata sandi akun.<br>• Manajemen daftar sesi aktif pengguna (melihat alamat IP, browser/User-Agent, waktu login, dan aksi mencabut sesi/logout paksa). |
| **Konfigurasi Global**<br>`/dashboard/settings/system` | `system_settings:read`<br>(Super Admin) | 🟢 **Implemented** | `app/(dashboard)/dashboard/settings/system/page.tsx` | • Pengaturan global aplikasi dan parameter konfigurasi sistem (khusus Super Admin). |

---

## 3. Modul Terkait: Exam Runner Peserta (`/exam`)

Meskipun berada di luar layout admin dashboard, antarmuka eksekusi ujian peserta terintegrasi erat dengan data dari dashboard:

| Rute | Status | Cakupan Fungsionalitas |
|---|:---:|---|
| **Daftar Ujian Saya**<br>`/exam` | 🟢 **Implemented** | Menampilkan kartu ujian yang dijadwalkan dan memenuhi syarat bagi peserta yang sedang login. |
| **Ruang Tunggu & Token**<br>`/exam/[slug]/intro` | 🟢 **Implemented** | Membaca dokumen *Introduction*, melakukan pengecekan jadwal aktif & kuota pengerjaan, dan verifikasi 6-digit access token. |
| **Halaman Pengerjaan Ujian**<br>`/exam/[slug]/attempt/[attemptId]` | 🟢 **Implemented** | Antarmuka pengerjaan ujian interaktif:<br>• Timer countdown waktu sisa dengan sinkronisasi deadline server (*Deadline Clamping*).<br>• Palet navigasi nomor soal (indikator sudah dijawab / belum).<br>• Autosave jawaban instan ke database.<br>• Dukungan input pilihan ganda dan esai.<br>• Mekanisme *Session Pinning* (mengunci pengerjaan pada 1 sesi login aktif; mendeteksi jika dibuka di tab/perangkat lain). |
| **Hasil / Ringkasan Pengerjaan**<br>`/exam/[slug]/attempt/[attemptId]/result` | 🟢 **Implemented** | Tampilan ringkasan pasca submit atau nilai akhir jika dikonfigurasi langsung tampil. |

---

## 4. Tabel Database & Relasi Model (`lib/db/schema.ts`)

| Nama Tabel | Deskripsi & Entitas |
|---|---|
| `user` | Data akun pengguna, role sistem (`super-admin`, `admin`, `user`), serta identifier (NISN, NIS, NIP). |
| `session`, `account`, `verification` | Manajemen sesi login, otentikasi Better Auth, dan token verifikasi. |
| `role`, `permission`, `role_permission`, `user_role` | Tabel RBAC dinamis untuk pengelolaan peran kustom dan hak akses per modul. |
| `participant_group`, `participant_group_member` | Data grup peserta dan relasi anggota grup. |
| `participant_import` | Riwayat dan log audit impor peserta dari file Excel/CSV. |
| `question_bank`, `question_category`, `question`, `question_option`, `question_media` | Struktur bank soal, kategori, konten soal TipTap, opsi jawaban berbobot, dan aset media. |
| `exam_package`, `exam_question` | Paket ujian, konfigurasi passing score, salah penalti, dan relasi soal terpasang. |
| `exam_schedule`, `schedule_user_eligibility`, `schedule_group_eligibility` | Jadwal pelaksanaan ujian, token akses, dokumen tata tertib, serta relasi eligibilitas peserta/grup. |
| `attempt`, `attempt_answer`, `attempt_session_transfer` | Data pengerjaan peserta, snapshot urutan soal teracak, jawaban tersimpan, nilai otomatis/manual, dan jejak audit transfer sesi pengerjaan. |

---

## 5. Rencana Pengembangan Selanjutnya (*Next Milestones*)

1. **Modul Laporan Individu (`/dashboard/reports/individual`)**:
   - Pencetakan rapor / transkrip hasil asesmen per siswa (format print view & download PDF) dengan rincian capaian per kompetensi/kategori soal.
2. **Modul Laporan Per Sesi (`/dashboard/reports/sessions`)**:
   - Rekapitulasi kehadiran, persentase penyelesaian ujian, dan statistik pengerjaan per sesi/ruangan.
3. **Modul Monitoring Mandiri (`/dashboard/exam-monitoring`)**:
   - Memisahkan antarmuka monitoring proctoring aktif ke halaman navigasi mandiri dengan filter jadwal aktif multi-room.
4. **Modul Riwayat Pengerjaan Global (`/dashboard/attempt-history`)**:
   - Penelusuran audit log global untuk semua pengerjaan peserta lintas jadwal.
