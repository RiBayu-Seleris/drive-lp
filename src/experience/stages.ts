/** Chapters explain the product; they are not a guaranteed claim outcome. */
export const stages = [
  {
    id: 'incident', short: 'Insiden',
    headline: ['Perjalanan terhenti.', 'Langkah berikutnya jelas.'], accent: 1,
    description: 'Dari foto pertama sampai mobil keluar dari bengkel, DRIVE menunjukkan apa yang perlu Anda lakukan di setiap tahap.',
    detail: '', color: '#ff5a47',
  },
  {
    id: 'coverage', short: 'Plat & asuransi',
    headline: ['Foto plat nomornya.', 'Kami cek asuransinya.'], accent: 1,
    description: 'Isi data kendaraan, lalu foto plat nomornya. DRIVE membaca plat itu dan memakai datanya untuk mengecek apakah kendaraan Anda punya perlindungan asuransi.',
    detail: '', color: '#a1deff',
  },
  {
    id: 'scan', short: 'Foto kerusakan',
    headline: ['Foto bagian yang rusak.', 'AI mulai menilai.'], accent: 1,
    description: 'Ikuti panduan di aplikasi untuk memotret tiap sisi atau bagian yang rusak. AI DRIVE menilai setiap foto yang Anda kirim.',
    detail: '', color: '#a1deff',
  },
  {
    id: 'assessment', short: 'Hasil umum',
    headline: ['Kerusakan terbaca.', 'Detail masih terkunci.'], accent: 1,
    description: 'Anda melihat hasil umumnya lebih dulu. Rincian komponen, saran perbaikan, dan estimasi biaya baru bisa dilihat setelah Anda membuka hasil lengkap.',
    detail: 'ANGKA DI ILUSTRASI INI HANYA CONTOH.', color: '#a9c6ff',
  },
  {
    id: 'unlock', short: 'Buka hasil lengkap',
    headline: ['Buka hasil lengkap.', 'Lalu tentukan langkahnya.'], accent: 1,
    description: 'Hasil lengkap terbuka setelah Anda membayar. Semua pengguna membayar, termasuk yang punya asuransi. Setelah itu, ajukan klaim atau perbaiki dengan biaya sendiri.',
    detail: 'PERSENTASE · KOMPONEN · PERBAIKI ATAU GANTI · ESTIMASI BIAYA', color: '#a1deff',
  },
  {
    id: 'claim', short: 'Klaim & keputusan',
    headline: ['Ajukan klaim.', 'Pantau keputusannya.'], accent: 1,
    description: 'Pilih polis, ceritakan kronologinya, dan unggah dokumen. Persetujuan otomatis hanya berlaku jika asuransi mengaktifkannya dan klaim Anda memenuhi aturan. Selebihnya ditinjau manual.',
    detail: 'KEPUTUSAN KLAIM TETAP DARI ASURANSI.', color: '#a0f1dc',
  },
  {
    id: 'services', short: 'Bengkel & towing',
    headline: ['Pilih bengkel.', 'Antar sendiri atau pakai towing.'], accent: 1,
    description: 'Setelah klaim disetujui, pilih bengkel mitra DRIVE. Bawa kendaraan sendiri atau pesan towing. Untuk towing, kami mencari dari yang terdekat, lalu memperluas area bila belum ada yang tersedia.',
    detail: 'KETERSEDIAAN TERGANTUNG LOKASI; TANGGUNGAN MENGIKUTI POLIS.', color: '#a0f1dc',
  },
  {
    id: 'resolution', short: 'Kembali ke jalan',
    headline: ['Satu tiket, dua layanan.', 'Lalu kembali ke jalan.'], accent: 1,
    description: 'Tunjukkan tiket yang sama ke sopir towing dan ke bengkel. Mereka memindai QR/barcode-nya, atau mengetik kodenya bila pemindaian gagal. Selesai diperbaiki, kendaraan siap jalan lagi.',
    detail: 'TIKET LAYANAN TERBIT SETELAH KLAIM DISETUJUI.', color: '#a0f1dc',
  },
] as const;
