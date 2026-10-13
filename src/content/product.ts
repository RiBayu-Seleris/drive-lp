import { DRIVE_LINKS } from '../lib/links';

export const servicePaths = [
  {
    id: 'assessment', number: '01', title: 'Pahami kerusakannya', label: 'DARI FOTO KE HASIL LENGKAP',
    description: 'Isi data kendaraan dan foto plat untuk cek asuransi. Lalu foto bagian yang rusak dan lihat hasil awal dari AI.',
    steps: ['Lihat hasil umumnya dulu', 'Bayar untuk membuka hasil lengkap', 'Cek komponen yang rusak, saran perbaikan, dan estimasi biaya'],
    note: 'Hasil lengkap berbayar untuk semua pengguna, termasuk yang punya asuransi.',
    action: 'Cek kerusakan', href: DRIVE_LINKS.scan,
  },
  {
    id: 'claim', number: '02', title: 'Lanjutkan ke klaim', label: 'JIKA KENDARAAN BERASURANSI',
    description: 'Setelah hasil lengkap terbuka, pilih polis Anda, ceritakan kronologinya, dan unggah dokumen yang diminta.',
    steps: ['Pilih polis dan tulis kronologinya', 'Kirim dokumennya ke asuransi', 'Pantau status klaim di aplikasi'],
    note: 'Persetujuan otomatis hanya berlaku untuk produk yang diaktifkan asuransi dan klaim yang memenuhi aturannya. Klaim lain ditinjau manual.',
    action: 'Lihat klaim saya', href: DRIVE_LINKS.claims,
  },
  {
    id: 'repair', number: '03', title: 'Perbaiki di bengkel mitra', label: 'SETELAH KLAIM DISETUJUI',
    description: 'Pilih bengkel mitra DRIVE. Bawa kendaraan sendiri, atau pesan towing kalau kendaraan tidak bisa dikendarai.',
    steps: ['Pilih bengkel berdasarkan lokasi dan ketersediaannya', 'Pesan towing bila perlu, mulai dari yang terdekat', 'Tunjukkan tiket yang sama ke towing dan bengkel'],
    note: 'Tanpa asuransi, biaya perbaikan Anda tanggung sendiri. Biaya akhirnya ditentukan setelah bengkel memeriksa kendaraan.',
    action: 'Cari bengkel mitra', href: DRIVE_LINKS.workshops,
  },
] as const;

export const productRoles = [
  { title: 'Anda, pemilik kendaraan', detail: 'Memotret kerusakan, membuka hasil lengkap, mengajukan klaim, lalu memilih bengkel dan cara mengantar kendaraan.' },
  { title: 'Perusahaan asuransi', detail: 'Menentukan aturan produk, meninjau pengajuan, dan memutuskan klaim sesuai pertanggungan.' },
  { title: 'Bengkel mitra DRIVE', detail: 'Memindai tiket layanan (atau mengetik kodenya), menerima kendaraan, lalu memperbaikinya.' },
  { title: 'Mitra towing & sopir', detail: 'Menjemput kendaraan dan mengantarnya ke bengkel pilihan Anda. Saat menjemput, sopir memindai tiket layanan atau mengetik kodenya.' },
] as const;

export const faqItems = [
  { question: 'Setelah insiden, saya mulai dari mana?', answer: 'Isi data kendaraan dan foto plat nomornya. DRIVE membaca plat itu untuk mengecek apakah kendaraan Anda punya perlindungan asuransi. Setelah itu, foto sisi atau bagian yang rusak sesuai panduan di aplikasi.' },
  { question: 'Saya punya asuransi. Tetap harus membayar hasil lengkap?', answer: 'Ya. Semua pengguna wajib membayar untuk membuka hasil lengkap, termasuk yang berasuransi. Sebelum membayar, Anda hanya melihat hasil umumnya. Harganya selalu ditampilkan di aplikasi sebelum Anda membayar.' },
  { question: 'Setelah membayar, apa saja yang terbuka?', answer: 'Persentase kerusakan secara keseluruhan dan per foto, daftar komponen yang rusak, saran untuk diperbaiki atau diganti, dan estimasi biayanya. Estimasi bisa berubah setelah bengkel memeriksa kendaraan secara langsung.' },
  { question: 'Apakah semua klaim disetujui otomatis?', answer: 'Tidak. Asuransi harus mengaktifkan persetujuan otomatis untuk produk yang Anda pilih, dan klaimnya tetap harus memenuhi aturan produk itu. Di luar itu, klaim masuk peninjauan manual oleh asuransi.' },
  { question: 'Kendaraan saya tidak diasuransikan. Tetap bisa pakai DRIVE?', answer: 'Bisa. Anda tetap dapat membuka hasil lengkap, lalu merencanakan perbaikan dengan biaya sendiri. Cerita di halaman ini memakai contoh kendaraan yang berasuransi.' },
  { question: 'Bagaimana bengkel dan towing dipilih?', answer: 'Setelah klaim disetujui, Anda memilih bengkel dari daftar mitra DRIVE yang terdaftar, berdasarkan lokasi dan ketersediaannya. Kendaraan bisa Anda antar sendiri atau dijemput towing. Pencarian towing dimulai dari yang terdekat, lalu diperluas bertahap bila belum ada yang tersedia.' },
  { question: 'Apakah tiket towing dan bengkel berbeda?', answer: 'Tidak. Setelah klaim disetujui, DRIVE menerbitkan satu tiket layanan untuk towing dan bengkel. Keduanya memindai QR/barcode yang sama, atau memasukkan kode manual bila pemindaian gagal. Apa yang ditanggung tetap mengikuti persetujuan klaim dan manfaat polis Anda.' },
  { question: 'Angka di ilustrasi ini harga sungguhan?', answer: 'Bukan. Persentase kerusakan, biaya, jarak, waktu tiba, dan kode tiket di halaman ini hanya contoh. Hasil, harga, dan ketersediaan yang sebenarnya ditampilkan di aplikasi.' },
] as const;
