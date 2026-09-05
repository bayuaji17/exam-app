# Inventaris Fitur & Status Implementasi Dashboard

Dokumen ini menyajikan pemetaan komprehensif seluruh menu navigasi dashboard, status implementasi, permission guard yang mengontrol akses, serta lokasi file rute dan komponen utamanya.

---

## 1. Ringkasan Eksekutif

| Status | Deskripsi | Jumlah Fitur |
|---|---|:---:|
| 🟢 **Implemented** | Fitur telah memiliki antarmuka pengguna fungsional, terhubung ke database, memiliki query teroptimasi, dan terlindungi otentikasi & RBAC. | **18** |
| 🟡 **Integrated / Embedded** | Fungsionalitas telah diimplementasikan penuh sebagai tab/sub-view di dalam fitur induknya, namun belum memiliki halaman rute mandiri di sidebar. | **3** |
| ⚪ **Planned / Roadmap** | Fitur telah terdaftar dalam menu, skema data, dan katalog perizinan, namun halaman antarmuka visual khusus masih dalam roadmap rilis. | **2** |

---

## 2. Rincian Fitur Berdasarkan Menu Navigasi Dashboard

### 2.1. Overview

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |\n|---|---|:---:|---|---|
| **Dashboard**<br>`/dashboard` | *Autentikasi Akun* | 🟢 **Implemented** | `app/(dashboard)/dashboard/page.tsx`<br>`lib/dashboard/stats.ts` | • Menampilkan 6 metrik kartu ringkasan: Bank Soal, Soal, Paket Ujian, Jadwal Ujian, Pengerjaan, dan Peserta.<br>• Tabel Jadwal Ujian Mendatang (*Upcoming Schedules*).<br>• Tampilan dinamis berbasis role: Admin melihat ringkasan statistik platform, sedangkan Peserta diarahkan ke daftar ujian aktif. |

---

### 2.2. Manajemen Pengguna

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Daftar Pengguna**<br>`/dashboard/users` | `users:read` | 🟢 **Implemented** | `app/(dashboard)/dashboard/users/page.tsx`<br>`components/users/` | • Pencarian & filter akun pengguna berdasarkan nama/email/role.<br>• Pembuatan akun baru (Single User Creation) dan penetapan role.<br>• Edit metadata akun pengguna.<br>• Aksi reset kata sandi dan blokir/nonaktifkan akun (*Ban/Unban*). |
| **Grup Peserta**<br>`/dashboard/users/groups` | `users:read` | 🟢 **Implemented** | `app/(dashboard)/dashboard/users/groups/page.tsx`<br>`app/(dashboard)/dashboard/users/groups/[groupId]/page.tsx` | • Manajemen rombel/kelas (nama grup, slug, deskripsi).<br>• Penetapan anggota grup peserta.<br>• Filter peserta berdasarkan keanggotaan grup untuk penetapan eligibilitas jadwal ujian. |
| **Impor Peserta**<br>`/dashboard/users/import` | `users:import` | 🟢 **Implemented** | `app/(dashboard)/dashboard/users/import/page.tsx`<br>`lib/users/import.ts` | • Unggah berkas Excel (.xlsx) atau CSV untuk pembuatan akun peserta secara massal.<br>• Validasi baris data (format email, duplikasi username/NISN).<br>• Riwayat log impor peserta (*audit trail*). |
| **Role & Perizinan**<br>`/dashboard/settings/roles` | `roles:read` | 🟢 **Implemented** | `app/(dashboard)/dashboard/settings/roles/page.tsx`<br>`components/roles/`<br>`lib/auth/rbac-actions.ts` | • Matriks perizinan dinamis (*Role-Permission Matrix*).<br>• Pembuatan & pengelolaan peran kustom (*Custom Roles*).<br>• Penetapan granularitas izin akses per menu dan aksi sistem. |

---

### 2.3. Manajemen Bank Soal

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Bank Soal**<br>`/dashboard/question-banks` | `question_banks:read` | 🟢 **Implemented** | `app/(dashboard)/dashboard/question-banks/page.tsx`<br>`app/(dashboard)/dashboard/question-banks/[id]/page.tsx` | • Katalog bank soal berdasarkan mata pelajaran / bidang keahlian.<br>• Manajemen hierarki kategori materi di dalam bank soal.<br>• Metadata bank soal (nama, deskripsi, status aktif). |
| **Daftar Soal**<br>`/dashboard/questions` | `questions:read` | 🟢 **Implemented** | `app/(dashboard)/dashboard/questions/page.tsx`<br>`app/(dashboard)/dashboard/questions/new/page.tsx`<br>`app/(dashboard)/dashboard/questions/[id]/edit/page.tsx` | • Editor butir soal kaya format (TipTap WYSIWYG) mendukung teks berformat dan rumus.<br>• Multi-tipe soal: Pilihan Ganda (bobot opsi tunggal/jamak) dan Esai.<br>• Pratinjau soal (*Question Preview Modal*).<br>• Dukungan manajemen gambar dan berkas media soal. |

---

### 2.4. Manajemen Paket Ujian

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Paket Ujian**<br>`/dashboard/exam-packages` | `exam_packages:read` | 🟢 **Implemented** | `app/(dashboard)/dashboard/exam-packages/page.tsx`<br>`app/(dashboard)/dashboard/exam-packages/[id]/page.tsx`<br>`app/(dashboard)/dashboard/exam-packages/[id]/edit/page.tsx` | • Pembuatan paket soal dengan passing score (KKM) dan penalti jawaban salah (*penalty score*).<br>• Seleksi dan pemasangan butir soal dari bank soal.<br>• Konfigurasi pengacakan urutan soal dan opsi jawaban per peserta. |

---

### 2.5. Pelaksanaan & Jadwal Ujian

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Jadwal Ujian**<br>`/dashboard/schedules` | `exam_schedules:read` | 🟢 **Implemented** | `app/(dashboard)/dashboard/schedules/page.tsx`<br>`app/(dashboard)/dashboard/schedules/new/page.tsx`<br>`app/(dashboard)/dashboard/schedules/[id]/page.tsx` | • Penjadwalan sesi ujian (waktu mulai, batas akhir pengerjaan, durasi menit).<br>• Konfigurasi kuota pengerjaan (*attempt limit*) dan token akses ujian.<br>• Pengaturan dokumen tata tertib ujian sebelum pengerjaan dimulai.<br>• Penetapan peserta berhak (*eligibility*) berbasis pengguna langsung atau grup rombel. |
| **Monitoring Pelaksanaan**<br>`/dashboard/exam-monitoring` | `exam_monitoring:read` | 🟡 **Integrated**<br>*(Embedded)* | `app/(dashboard)/dashboard/schedules/[id]/monitoring/`<br>`components/monitoring/` | • Fungsionalitas monitoring proctoring aktif diimplementasikan secara penuh di tab monitoring jadwal: daftar pengerjaan aktif, durasi tersisa, deteksi pelanggaran fokus, dan terminasi paksa.<br>• Menu di sidebar saat ini bertindak sebagai penunjuk ke pemantauan per jadwal aktif. |
| **Riwayat Pengerjaan**<br>`/dashboard/attempt-history` | `attempts:read` | 🟡 **Integrated**<br>*(Embedded)* | `app/(dashboard)/dashboard/schedules/[id]/page.tsx`<br>`lib/attempts/queries.ts` | • Riwayat seluruh sesi pengerjaan ujian telah dapat diakses di tab pengerjaan masing-masing jadwal ujian, memuat skor, waktu mulai, dan status submisi. |

---

### 2.6. Laporan

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Laporan Hasil Ujian**<br>`/dashboard/reports/exam-results` | `reports:export` | 🟢 **Implemented** | `app/(dashboard)/dashboard/reports/exam-results/page.tsx`<br>`app/(dashboard)/dashboard/reports/exam-results/[slug]/page.tsx`<br>`components/reports/`<br>`lib/reports/export.ts`<br>`app/api/reports/exam-results/[scheduleId]/route.ts` | • Dashboard overview seluruh jadwal ujian dengan tingkat kelulusan dan rata-rata nilai.<br>• Halaman analitik detail jadwal dengan 4 kartu metrik KPI (Tingkat Kelulusan, Rata-rata Skor, Partisipasi, Rentang Nilai).<br>• Visualisasi grafik distribusi 5 rentang nilai (0-20 s/d 81-100).<br>• Roster nilai peserta lengkap dengan NISN, NIS, NIP, status koreksi manual, dan status kelulusan.<br>• Ekspor instan ke format Excel multi-sheet (.xlsx) dan RFC 4180 CSV (.csv). |
| **Laporan Individu**<br>`/dashboard/reports/individual` | `reports:export` | 🟢 **Implemented** | `app/(dashboard)/dashboard/reports/individual/page.tsx`<br>`app/(dashboard)/dashboard/reports/individual/[attemptId]/page.tsx`<br>`components/reports/individual/`<br>`lib/reports/individual-queries.ts` | • Hub pemilih peserta berdasarkan filter jadwal dan pencarian identitas (NISN, NIS, NIP).<br>• Transkrip komprehensif nilai akhir, durasi, KKM, dan status kelulusan.<br>• Analisis capaian kompetensi per kategori materi dengan persentase penguasaan.<br>• Rincian butir soal, jawaban siswa, dan perolehan skor.<br>• Layout siap cetak (*Print/Save as PDF*) standar dokumen akademik. |
| **Laporan Per Sesi**<br>`/dashboard/reports/sessions` | `reports:export` | 🟢 **Implemented** | `app/(dashboard)/dashboard/reports/sessions/page.tsx`<br>`app/(dashboard)/dashboard/reports/sessions/[slug]/page.tsx`<br>`components/reports/sessions/`<br>`lib/reports/session-queries.ts` | • Hub ringkasan sesi ujian dengan filter pencarian dan metrik cepat rasio kehadiran.<br>• Detail analitik sesi dengan 4 kartu KPI (Kehadiran %, Penyelesaian %, Absen, Audit Submit Mandiri vs Sistem).<br>• Tabel komparasi performa kehadiran dan rata-rata nilai per rombel/grup peserta.<br>• Roster daftar hadir seluruh peserta (Selesai, Sedang Mengerjakan, Belum Hadir) dengan filter status instan.<br>• Format cetak resmi Berita Acara Pelaksanaan & Presensi Ujian (@media print) dilengkapi blok tanda tangan pengawas. |

---

### 2.7. Pengaturan

| Menu & URL | Permission Guard | Status | File Rute / Komponen Utama | Rincian Fungsionalitas & Cakupan |
|---|---|:---:|---|---|
| **Profile**<br>`/dashboard/settings/profile` | *Autentikasi Akun* | 🟢 **Implemented** | `app/(dashboard)/dashboard/settings/profile/page.tsx`<br>`app/(dashboard)/dashboard/profile/page.tsx` | • Tinjau informasi profil akun, nama tampilan, email, dan nomor identitas (NISN, NIS, NIP). |
| **Security**<br>`/dashboard/settings/security` | *Autentikasi Akun* | 🟢 **Implemented** | `app/(dashboard)/dashboard/settings/security/page.tsx`<br>`app/(dashboard)/dashboard/settings/security/sessions/page.tsx` | • Penggantian kata sandi akun.<br>• Manajemen daftar sesi aktif pengguna (melihat alamat IP, browser/User-Agent, waktu login, dan aksi mencabut sesi/logout paksa). |
| **Konfigurasi Global**<br>`/dashboard/settings/system` | `system_settings:read`<br>(Super Admin) | 🟢 **Implemented** | `app/(dashboard)/dashboard/settings/system/page.tsx` | • Pengaturan global aplikasi dan parameter konfigurasi sistem (khusus Super Admin). |

---

## 3. Matriks Hak Akses & Permission Guard Berdasarkan Rute

| Rute URL | Permission Guard | Default Roles Allowed |
|---|---|---|
| `/dashboard` | *Autentikasi Sesi* | Super Admin, Admin, Pengawas, Guru, Peserta |
| `/dashboard/users` | `users:read` | Super Admin, Admin |
| `/dashboard/users/groups` | `users:read` | Super Admin, Admin |
| `/dashboard/users/import` | `users:import` | Super Admin, Admin |
| `/dashboard/settings/roles` | `roles:read` | Super Admin |
| `/dashboard/question-banks` | `question_banks:read` | Super Admin, Admin, Guru |
| `/dashboard/questions` | `questions:read` | Super Admin, Admin, Guru |
| `/dashboard/exam-packages` | `exam_packages:read` | Super Admin, Admin, Guru |
| `/dashboard/schedules` | `exam_schedules:read` | Super Admin, Admin, Pengawas |
| `/dashboard/exam-monitoring` | `exam_monitoring:read` | Super Admin, Admin, Pengawas |
| `/dashboard/attempt-history` | `attempts:read` | Super Admin, Admin, Pengawas, Guru |
| `/dashboard/reports/exam-results` | `reports:export` | Super Admin, Admin, Guru |
| `/dashboard/reports/individual` | `reports:export` | Super Admin, Admin, Guru |
| `/dashboard/reports/sessions` | `reports:export` | Super Admin, Admin, Pengawas |
| `/dashboard/settings/profile` | *Autentikasi Sesi* | Semua Pengguna |
| `/dashboard/settings/security` | *Autentikasi Sesi* | Semua Pengguna |
| `/dashboard/settings/system` | `system_settings:read` | Super Admin |

---

## 4. Kesiapan Entitas Database (Drizzle Schema)

| Entitas Database | Status Skema & Relasi |
|---|---|
| `user`, `account`, `session`, `verification` | Lengkap, autentikasi Better Auth aktif dengan ekstensi bidang kustom (`role`, `nisn`, `nis`, `nip`). |
| `role`, `permission`, `role_permission`, `user_role` | Tabel RBAC dinamis untuk pengelolaan peran kustom dan hak akses per modul. |
| `participant_group`, `participant_group_member` | Data grup peserta dan relasi anggota grup. |
| `participant_import` | Riwayat dan log audit impor peserta dari file Excel/CSV. |
| `question_bank`, `question_category`, `question`, `question_option`, `question_media` | Struktur bank soal, kategori, konten soal TipTap, opsi jawaban berbobot, dan aset media. |
| `exam_package`, `exam_question` | Paket ujian, konfigurasi passing score, salah penalti, dan relasi soal terpasang. |
| `exam_schedule`, `schedule_user_eligibility`, `schedule_group_eligibility` | Jadwal pelaksanaan ujian, token akses, dokumen tata tertib, serta relasi eligibilitas peserta/grup. |
| `attempt`, `attempt_answer`, `attempt_session_transfer` | Data pengerjaan peserta, snapshot urutan soal teracak, jawaban tersimpan, nilai otomatis/manual, dan jejak audit transfer sesi pengerjaan. |

---

## 5. Rencana Pengembangan Selanjutnya (*Next Milestones*)

1. **Modul Monitoring Mandiri (`/dashboard/exam-monitoring`)**:
   - Memisahkan antarmuka monitoring proctoring aktif ke halaman navigasi mandiri dengan filter jadwal aktif multi-room.
2. **Modul Riwayat Pengerjaan Global (`/dashboard/attempt-history`)**:
   - Penelusuran audit log global untuk semua pengerjaan peserta lintas jadwal.
3. **Optimasi Kinerja (PPR / Cache Components)**:
   - Adopsi penuh *Cache Components* dan *Partial Prerendering* (PPR) pada rute dashboard untuk mencapai navigasi instan (*Instant Shell Navigation*).
