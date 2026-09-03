# Daftar Fitur Menu Dashboard & Status Pengembangan

Dokumen ini menyajikan inventaris lengkap seluruh fitur pada menu navigasi Dashboard, pemetaan hak akses (*Role-Based Access Control* / RBAC), cakupan teknis (routes, komponen, server actions, skema basis data), dan status pengembangannya saat ini.

Terakhir diperbarui: 2026-08-29

---

## 1. Ringkasan Status Pengembangan

| Status | Definisi | Jumlah Menu |
|---|---|:---:|
| 🟢 **Implemented** | Fitur telah selesai diimplementasikan secara menyeluruh (Halaman UI, Server Actions, Schema Database, Validasi, dan Pengujian Unit/E2E). | **15** |
| 🟡 **Integrated / Embedded** | Fitur aktif dan terintegrasi di dalam modul lain yang berhubungan (belum dipisah ke halaman mandiri). | **3** |
| ⚪ **Planned / Roadmap** | Fitur telah terdaftar dalam menu, skema data, dan katalog perizinan, namun halaman antarmuka visual khusus masih dalam roadmap rilis. | **5** |

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
| **Peserta**<br>`/dashboard/users` | `users:read`<br>`users:manage` | 🟢 **Implemented** | `app/(dashboard)/dashboard/users/page.tsx`<br>`app/(dashboard)/dashboard/users/create/page.tsx`<br>`app/(dashboard)/dashboard/users/[userId]/page.tsx`<br>`app/(dashboard)/dashboard/users/import/page.tsx`<br>`components/users/users-table.tsx` | • Roster data peserta dengan pencarian, filter role/status, sortable column, dan paginasi.<br>• Pembuatan akun pengguna baru dengan dukungan identifier khusus (NISN, NIS, NIP).<br>• Halaman detail dan edit profil/kredensial pengguna.<br>• Fitur impor massal peserta via file Excel/CSV dengan validasi duplikasi, parsing batch, dan laporan error baris per baris. |
| **Grup Peserta**<br>`/dashboard/user-groups` | `user_groups:read`<br>`user_groups:manage` | 🟢 **Implemented** | `app/(dashboard)/dashboard/user-groups/page.tsx`<br>`app/(dashboard)/dashboard/user-groups/new/page.tsx`<br>`app/(dashboard)/dashboard/user-groups/[slug]/page.tsx` | • Daftar grup peserta berbasis URL slug.<br>• Pembuatan grup baru untuk pengelompokan kelas/divisi/rombongan belajar.<br>• Manajemen anggota grup (tambah dan hapus peserta dalam grup secara dinamis). |
| **Admin**<br>`/dashboard/admins` | `system_settings:read`<br>(Super Admin) | 🟢 **Implemented** | `app/(dashboard)/dashboard/admins/page.tsx`<br>`components/admins/admins-table.tsx` | • Roster khusus staf administrator dan super administrator.<br>• Fitur penugasan role admin (*promote*) atau pencabutan hak admin (*demote*). |
| **Role & Hak Akses**<br>`/dashboard/roles` | `roles:read`<br>`roles:manage` | 🟢 **Implemented** | `app/(dashboard)/dashboard/roles/page.tsx`<br>`app/(dashboard)/dashboard/roles/new/page.tsx`<br>`app/(dashboard)/dashboard/roles/[id]/page.tsx`<br>`components/roles/permission-matrix.tsx` | • Sistem Dynamic RBAC.<br>• Pembuatan peran kustom (*custom roles*).<br>• Matriks hak akses perizinan modular (*Granular Permission Matrix*) untuk mengatur izin baca, buat, ubah, dan hapus per modul aplikasi.<br>• Proteksi bawaan untuk system role (`super-admin`, `admin`, `user`). |

---

### 2.3. Manajemen Ujian

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Bank Soal**<br>`/dashboard/question-banks` | `question_banks:read`<br>`question_banks:manage` | 🟢 **Implemented** | `app/(dashboard)/dashboard/question-banks/page.tsx`<br>`app/(dashboard)/dashboard/question-banks/new/page.tsx`<br>`app/(dashboard)/dashboard/question-banks/[slug]/page.tsx`<br>`app/(dashboard)/dashboard/question-banks/categories/page.tsx` | • Pengelolaan bank soal (daftar, buat, ubah, arsip, dan restore).<br>• Kategori soal (*Question Categories*).<br>• Authoring soal dengan TipTap editor yang mendukung formatting teks, gambar, audio, dan video.<br>• Mendukung 3 tipe soal: Pilihan Tunggal (*Single*), Pilihan Berbobot (*Scored*), dan Esai (*Manual*).<br>• Media ledger sweeper otomatis untuk pembersihan aset media yang tidak terpakai. |
| **Paket Ujian**<br>`/dashboard/exams` | `exams:read`<br>`exams:manage` | 🟢 **Implemented** | `app/(dashboard)/dashboard/exams/page.tsx`<br>`app/(dashboard)/dashboard/exams/new/page.tsx`<br>`app/(dashboard)/dashboard/exams/[slug]/page.tsx` | • Pengelolaan paket ujian dengan kode paket unik (`kodePaket`) dan slug.<br>• Pemilihan dan komposisi soal dari satu atau banyak bank soal.<br>• Pengaturan bobot nilai per soal, penalti salah (*wrong penalty*), nilai kelulusan (*passing grade*), dan pengacakan soal (*shuffle*). |
| **Jadwal Ujian**<br>`/dashboard/exam-schedules` | `exam_schedules:read`<br>`exam_schedules:manage` | 🟢 **Implemented** | `app/(dashboard)/dashboard/exam-schedules/page.tsx`<br>`app/(dashboard)/dashboard/exam-schedules/new/page.tsx`<br>`app/(dashboard)/dashboard/exam-schedules/[slug]/page.tsx` | • Pengaturan rentang waktu ujian (waktu mulai, waktu selesai, durasi pengerjaan, dan batas pengerjaan/attempt limit).<br>• Generator 6-karakter token akses sesi pengerjaan.<br>• Validasi otomatis pencegahan jadwal bentrok (*overlap validation*).<br>• Penautan aturan kelayakan peserta dan dokumen tata tertib (*introduction policy*). |
| **Sesi Ujian**<br>`/dashboard/exam-sessions` | `exam_schedules:read` | 🟡 **Integrated** | `lib/db/schema.ts` (`examSchedule`, `session`, `attempt`) | • Sesi pelaksanaan saat ini dikelola dan terikat langsung pada **Jadwal Ujian** dan token akses.<br>• Halaman visual monitoring sesi realtime per ruangan direncanakan pada modul monitoring. |
| **Aturan Akses**<br>`/dashboard/exam-access-rules` | `eligibility:manage` | 🟢 **Implemented** | `app/(dashboard)/dashboard/exam-access-rules/page.tsx`<br>`lib/eligibility/` | • Pengelolaan aturan kelayakan peserta ujian (*participant eligibility*).<br>• Penentuan peserta yang berhak mengikuti jadwal ujian tertentu melalui daftar individu maupun grup peserta. |
| **Introduction Ujian**<br>`/dashboard/exam-introductions` | `exam_schedules:read`<br>`exam_schedules:manage` | 🟢 **Implemented** | `app/(dashboard)/dashboard/exam-introductions/page.tsx`<br>`app/(dashboard)/dashboard/exam-introductions/[slug]/page.tsx` | • Pembuatan dokumen instruksi/tata tertib ujian berbasis TipTap rich-text editor.<br>• Pratinjau instruksi sebelum peserta mulai mengerjakan ujian. |

---

### 2.4. Penilaian

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Penilaian Manual**<br>`/dashboard/manual-grading` | `grading:read`<br>`grading:manage` | 🟢 **Implemented** | `app/(dashboard)/dashboard/manual-grading/page.tsx`<br>`app/(dashboard)/dashboard/manual-grading/[attemptId]/page.tsx` | • Antrean koreksi ujian untuk soal esai/manual.<br>• Form koreksi per nomor soal dengan pembatasan skor maksimum sesuai bobot soal.<br>• Rekalkulasi otomatis skor akhir attempt setelah koreksi manual disimpan. |
| **Aturan Penilaian**<br>`/dashboard/scoring-rules` | `exams:read` | 🟡 **Integrated** | Terintegrasi di `app/(dashboard)/dashboard/exams/[slug]/page.tsx` | • Logika penilaian (skor opsi, passing grade, bobot soal, dan penalti salah) terkonfigurasi langsung pada masing-masing **Paket Ujian**. |
| **Hasil Ujian**<br>`/dashboard/exam-results` | `results:read`<br>`results:manage` | 🟢 **Implemented** | `app/(dashboard)/dashboard/exam-results/page.tsx`<br>`app/(dashboard)/dashboard/exam-results/[slug]/page.tsx` | • Daftar hasil ujian per jadwal pelaksanaan.<br>• Rincian skor peserta, waktu pengerjaan, status submit (manual vs otomatis/deadline), dan status kelulusan. |

---

### 2.5. Monitoring

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Activity Tracking**<br>`/dashboard/activity-tracking` | `activity_logs:read` | ⚪ **Planned** | Backend: `lib/db/schema.ts` (`attemptSessionTransfer`), Better Auth Sessions | • Log audit pergantian perangkat/sesi pengerjaan dan pencatatan IP/User-Agent sudah aktif di backend.<br>• Antarmuka visual live feed aktivitas peserta saat ujian sedang berlangsung direncanakan pada fase berikutnya. |
| **Anti-cheat**<br>`/dashboard/anti-cheat` | `activity_logs:read` | ⚪ **Planned** | Backend & Runtime: `lib/exam/session-guard.ts`, `app/(exam)/exam/[slug]/attempt/` | • Engine anti-cheat inti telah aktif di runtime ujian: *Session Pinning* (mencegah pengerjaan paralel di lebih dari satu perangkat), *Waiting Room & Device Lock*, *Deadline Clamping* (finalisasi paksa server saat waktu habis), serta acak opsi dan soal.<br>• Dashboard rekap pelanggaran & peringatan real-time untuk pengawas ujian masuk dalam antrean pengembangan. |
| **Riwayat Pengerjaan**<br>`/dashboard/attempt-history` | `results:read` | 🟡 **Integrated** | `app/(dashboard)/dashboard/exam-results/[slug]/page.tsx` | • Riwayat pengerjaan saat ini dapat diakses secara detail melalui halaman **Hasil Ujian** dan **Penilaian Manual**. Halaman penelusuran riwayat global terpadu masih direncanakan. |

---

### 2.6. Laporan

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Laporan Hasil Ujian**<br>`/dashboard/reports/exam-results` | `reports:export` | ⚪ **Planned** | Schema & Database Data Siap | • Direncanakan untuk visualisasi grafik distribusi nilai, analitik daya pembeda soal, dan ekspor laporan rekapitulasi ke format Excel / PDF. |
| **Laporan Individu**<br>`/dashboard/reports/individual` | `reports:export` | ⚪ **Planned** | Schema & Database Data Siap | • Direncanakan untuk pencetakan rapor/sertifikat hasil asesmen per peserta. |
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

1. **Modul Monitoring Real-Time**:
   - Pembuatan dashboard pengawas ujian untuk memantau status pengerjaan peserta (sedang mengerjakan, idle, terputus, atau selesai).
   - Deteksi dan log visual perpindahan fokus tab / indikasi kecurangan.
2. **Modul Laporan & Ekspor**:
   - Pembuatan antarmuka visual grafik dan analitik perolehan skor ujian.
   - Fitur ekspor rekap nilai per jadwal dan per sesi ke format `.xlsx` (Excel) dan `.pdf`.
3. **Optimasi Kinerja (PPR / Cache Components)**:
   - Adopsi penuh *Cache Components* dan *Partial Prerendering* (PPR) pada rute dashboard untuk mencapai navigasi instan (*Instant Shell Navigation*).
