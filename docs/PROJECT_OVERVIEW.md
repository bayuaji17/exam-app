Aplikasi Website Ujian General

Aplikasi ini adalah platform website general untuk membuat, mengelola, menjadwalkan, dan melaksanakan ujian secara online. Sistem harus mendukung tiga tipe utama soal berdasarkan cara penilaian:
### 1. Ringkasan
1. Soal yang memiliki jawaban pasti benar atau salah. Skor hanya dihitung ketika peserta memilih jawaban yang benar.
2. Soal yang tidak memiliki jawaban benar atau salah. Setiap jawaban memiliki skor masing-masing dan hasil dihitung berdasarkan skor dari jawaban yang dipilih peserta.
3. Soal yang membutuhkan penilaian manual. Sistem tidak menghitung nilai secara otomatis untuk tipe soal ini.

Platform ini juga harus dapat mengatur siapa saja yang berhak mengikuti ujian, baik berdasarkan daftar peserta, grup, periode ujian, maupun aturan akses tertentu.

### 2. Tujuan Bisnis

- Menyediakan sistem ujian online yang fleksibel untuk berbagai jenis evaluasi.
- Memudahkan admin dalam membuat soal, jawaban, paket ujian, kategori, dan aturan penilaian.
- Mengontrol akses peserta agar hanya orang yang berhak dapat mengikuti ujian.
- Mendukung soal berbasis skor untuk kebutuhan asesmen, psikotes, survei, atau evaluasi yang tidak memiliki jawaban benar/salah.
- Menghasilkan laporan hasil ujian yang dapat digunakan untuk evaluasi, seleksi, atau analisis.
### 3. Latar Belakang Masalah

Banyak aplikasi ujian hanya fokus pada penilaian benar atau salah. Kebutuhan aplikasi ini lebih luas karena harus mendukung soal yang jawabannya tidak selalu pasti benar atau salah, misalnya psikotes, inventori kepribadian, tes minat, tes sikap kerja, survei, atau asesmen berbasis skala.

Selain itu, sistem perlu memastikan peserta yang mengikuti ujian memang sudah terdaftar dan memiliki hak akses, sehingga hasil ujian dapat dipercaya dan mudah diaudit.

### 4. Ruang Lingkup

- Manajemen pengguna dan role.
- Manajemen peserta ujian.
- Manajemen bank soal.
- Manajemen paket ujian.
- Pengaturan jadwal, durasi, dan akses ujian.
- Pengaturan introduction sebelum ujian dimulai, seperti aturan, cara menjawab, waktu, dan informasi tambahan.
- Pengerjaan ujian oleh peserta.
- Dukungan media pada soal, yaitu gambar, audio, dan video.
- Penilaian otomatis untuk soal dengan jawaban benar/salah.
- Skoring berbasis jawaban untuk soal yang tidak memiliki jawaban benar/salah.
- Penilaian manual untuk soal yang tidak dinilai otomatis.
- Laporan hasil ujian.
- Laporan hasil individu dan laporan per sesi.
- Import peserta dari Excel.
- Fitur anti-cheat dan penyimpanan activity tracking peserta.
- Riwayat pengerjaan dan audit dasar.

### 5. Fitur Yang Membutuhkan CRUD

| Fitur | Kebutuhan CRUD | Catatan |
| --- | --- | --- |
| Pengguna | Create, Read, Update, Delete | Meliputi super admin, admin, dan peserta/user sesuai batasan role. |
| Role dan hak akses | Create, Read, Update, Delete | Digunakan untuk mengatur akses fitur dan aksi di aplikasi. |
| Peserta ujian | Create, Read, Update, Delete | Peserta dapat dibuat manual atau melalui import Excel. |
| Grup peserta | Create, Read, Update, Delete | Digunakan untuk mengelompokkan peserta dan mengatur akses ujian. |
| Bank soal | Create, Read, Update, Delete | Menjadi wadah pengelolaan soal sebelum dipakai pada paket ujian. |
| Soal | Create, Read, Update, Delete | Mendukung tipe benar/salah, berbasis skor, dan penilaian manual. |
| Jawaban atau opsi jawaban | Create, Read, Update, Delete | Termasuk jawaban benar, bobot skor, dan opsi tanpa benar/salah. |
| Media soal | Create, Read, Update, Delete | Meliputi gambar, audio, dan video yang terhubung ke soal. |
| Kategori atau tag soal | Create, Read, Update, Delete | Digunakan untuk klasifikasi dan pencarian soal. |
| Paket ujian | Create, Read, Update, Delete | Berisi kumpulan soal dan konfigurasi ujian. |
| Introduction ujian | Create, Read, Update, Delete | Berisi aturan, instruksi, cara menjawab, dan informasi sebelum ujian dimulai. |
| Aturan penilaian | Create, Read, Update, Delete | Digunakan untuk penilaian otomatis, skoring berbasis jawaban, dan manual grading. |
| Jadwal ujian | Create, Read, Update, Delete | Mengatur periode mulai, selesai, durasi, dan ketersediaan ujian. |
| Aturan akses ujian | Create, Read, Update, Delete | Mengatur peserta/grup mana yang dapat mengikuti ujian. |
| Sesi ujian | Create, Read, Update, Delete | Mengatur pelaksanaan ujian dan status sesi. |
| Attempt atau pengerjaan peserta | Create, Read, Update, Delete | Data pengerjaan peserta, jawaban tersimpan, dan status penyelesaian. |
| Penilaian manual | Create, Read, Update, Delete | Digunakan untuk memberi nilai pada soal yang tidak dinilai otomatis. |
| Laporan hasil ujian | Read, Delete | Data laporan dibaca untuk analisis; delete hanya jika dibutuhkan untuk cleanup/audit policy. |
| Activity tracking dan anti-cheat | Read, Delete | Data aktivitas terutama dibaca untuk audit; delete mengikuti kebijakan retensi data. |
| Konfigurasi global aplikasi | Create, Read, Update, Delete | Hanya untuk super admin. |

### 6. Stakeholder

| Stakeholder | Kepentingan |
| --- | --- |
| Pemilik Sistem | Mendapatkan sistem ujian yang dapat digunakan untuk kebutuhan general seperti seleksi, asesmen, evaluasi, atau pelatihan. |
| Super Admin | Mengatur role, peserta, konfigurasi utama aplikasi, seluruh fitur admin, dan seluruh fitur aplikasi. |
| Admin | Membuat soal, jawaban, paket ujian, aturan penilaian, memilih peserta ujian, dan melihat hasil ujian. |
| Peserta | Mengikuti ujian yang telah diberikan kepadanya. |


### 7. Role Pengguna

#### 7.1 Super Admin

- Mengelola seluruh data sistem.
- Memiliki seluruh hak akses dan fitur yang dimiliki Admin.
- Mengatur role pengguna.
- Mengelola peserta.
- Mengatur konfigurasi global aplikasi.
- Mengatur konfigurasi lain yang dibutuhkan aplikasi.
- Melihat seluruh laporan.

#### 7.2 Admin

- Membuat soal dan jawaban.
- Membuat paket ujian.
- Mengatur aturan penilaian.
- Memilih peserta yang dapat melakukan ujian.
- Mengatur sesi ujian.
- Melihat hasil ujian.

#### 7.3 Peserta

- Login ke aplikasi menggunakan username dan password.
- Melihat daftar ujian yang tersedia.
- Mengikuti ujian sesuai jadwal dan hak akses.
- Melihat hasil jika diizinkan oleh konfigurasi ujian.
