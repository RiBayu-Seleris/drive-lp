/** Chapters explain the product; they are not a guaranteed claim outcome. */
export const stages = [
  {
    id: 'incident', short: 'Insiden', code: '01 / SAAT YANG TAK TERDUGA TERJADI',
    headline: ['Perjalanan terhenti.', 'Langkah Anda berlanjut.'], accent: 1,
    description: 'Dari insiden hingga kembali ke jalan. DRIVE membantu Anda melalui setiap langkahnya.',
    detail: '', color: '#ffad91',
  },
  {
    id: 'coverage', short: 'Plat & asuransi', code: '02 / IDENTITAS & PERLINDUNGAN',
    headline: ['Kenali kendaraannya.', 'Cek perlindungannya.'], accent: 1,
    description: 'Lengkapi data kendaraan dan foto plat nomor. DRIVE membaca plat, lalu menggunakan datanya untuk mengecek perlindungan asuransi.',
    detail: '', color: '#a1deff',
  },
  {
    id: 'scan', short: 'Foto kerusakan', code: '03 / POTRET BAGIAN YANG RUSAK',
    headline: ['Tunjukkan kerusakan.', 'Mulai penilaian.'], accent: 1,
    description: 'Foto sisi atau bagian kendaraan yang rusak mengikuti panduan DRIVE. Setiap foto dikirim untuk dianalisis oleh AI.',
    detail: '', color: '#a1deff',
  },
  {
    id: 'assessment', short: 'Hasil umum', code: '04 / PENILAIAN KERUSAKAN OLEH AI',
    headline: ['Kerusakan terbaca.', 'Detail masih terkunci.'], accent: 1,
    description: 'AI menilai kerusakan dari foto. Anda melihat hasil umum terlebih dahulu; rincian komponen, rekomendasi, dan estimasi biaya masih terkunci.',
    detail: 'ANGKA PADA ILUSTRASI ADALAH SIMULASI.', color: '#a9c6ff',
  },
  {
    id: 'unlock', short: 'Buka hasil lengkap', code: '05 / BAYAR UNTUK MEMBUKA DETAIL',
    headline: ['Buka hasil lengkap.', 'Tentukan langkahnya.'], accent: 1,
    description: 'Bayar untuk membuka hasil lengkap. Wajib bagi semua pengguna, termasuk yang berasuransi. Lanjutkan ke klaim atau perbaikan dengan biaya sendiri.',
    detail: 'PERSENTASE · KOMPONEN · PERBAIKI/GANTI · ESTIMASI.', color: '#a1deff',
  },
  {
    id: 'claim', short: 'Klaim & keputusan', code: '06 / PENGAJUAN KE ASURANSI',
    headline: ['Kirim pengajuan.', 'Ikuti keputusannya.'], accent: 1,
    description: 'Pilih polis, isi kronologi, dan unggah dokumen. Auto approval memerlukan pengaturan produk oleh asuransi serta klaim yang memenuhi aturan; lainnya ditinjau manual.',
    detail: 'PERSETUJUAN MENGIKUTI ATURAN PRODUK ASURANSI.', color: '#a0f1dc',
  },
  {
    id: 'services', short: 'Bengkel & towing', code: '07 / MENUJU BENGKEL MITRA',
    headline: ['Pilih bengkelnya.', 'Tentukan antarannya.'], accent: 1,
    description: 'Pilih bengkel mitra DRIVE setelah klaim disetujui. Antar sendiri atau pesan towing; pencarian dimulai dari yang terdekat dan diperluas bila perlu.',
    detail: 'KETERSEDIAAN DAN PERTANGGUNGAN MENGIKUTI LAYANAN.', color: '#a0f1dc',
  },
  {
    id: 'resolution', short: 'Kembali ke jalan', code: '08 / SATU TIKET, LAYANAN TERHUBUNG',
    headline: ['Kembali ke jalan.', 'Lanjutkan perjalanan.'], accent: 1,
    description: 'Gunakan tiket yang sama di towing dan bengkel: pindai QR/barcode atau masukkan kode manual. Setelah diperbaiki, kendaraan kembali ke jalan.',
    detail: 'TIKET LAYANAN TERBIT SETELAH KLAIM DISETUJUI.', color: '#a0f1dc',
  },
] as const;
