import { DRIVE_LINKS } from '../lib/links';

export const servicePaths = [
  {
    id: 'assessment', number: '01', title: 'Pahami kerusakannya', label: 'DARI FOTO KE HASIL LENGKAP',
    description: 'Lengkapi data kendaraan dan foto plat untuk pengecekan asuransi. Foto bagian yang rusak, lalu lihat gambaran awal hasil AI.',
    steps: ['Baca hasil umum terlebih dahulu', 'Bayar untuk membuka penilaian lengkap', 'Lihat komponen, rekomendasi, dan estimasi biaya'],
    note: 'Pembayaran hasil lengkap berlaku bagi semua pengguna, termasuk yang memiliki asuransi.',
    action: 'Mulai pemeriksaan', href: DRIVE_LINKS.scan,
  },
  {
    id: 'claim', number: '02', title: 'Lanjutkan ke klaim', label: 'JIKA KENDARAAN TERLINDUNGI',
    description: 'Setelah hasil lengkap terbuka, pilih polis yang tersedia, ceritakan kronologi, dan unggah dokumen pengajuan.',
    steps: ['Pilih polis dan lengkapi kronologi', 'Kirim dokumen ke perusahaan asuransi', 'Pantau keputusan klaim'],
    note: 'Persetujuan otomatis hanya untuk produk yang diaktifkan asuransi dan klaim yang memenuhi aturan; lainnya ditinjau manual.',
    action: 'Buka klaim saya', href: DRIVE_LINKS.claims,
  },
  {
    id: 'repair', number: '03', title: 'Menuju bengkel, kembali ke jalan', label: 'SETELAH KLAIM DISETUJUI',
    description: 'Pilih bengkel mitra DRIVE yang terdaftar. Antar kendaraan sendiri atau pesan towing sesuai kebutuhan.',
    steps: ['Pilih bengkel berdasarkan lokasi dan ketersediaan', 'Cari towing dari yang terdekat bila diperlukan', 'Gunakan tiket yang sama untuk towing dan bengkel'],
    note: 'Tanpa perlindungan asuransi, perbaikan dibayar sendiri. Biaya akhir mengikuti pemeriksaan bengkel.',
    action: 'Cari bengkel mitra', href: DRIVE_LINKS.workshops,
  },
] as const;

export const productRoles = [
  { title: 'Anda, pemilik kendaraan', detail: 'Memotret kerusakan, membuka hasil lengkap, mengajukan klaim, lalu memilih bengkel dan cara kendaraan diantar.' },
  { title: 'Perusahaan asuransi', detail: 'Menentukan aturan produk, meninjau pengajuan, dan memberi keputusan klaim sesuai pertanggungan.' },
  { title: 'Bengkel mitra DRIVE', detail: 'Memeriksa tiket layanan yang sama melalui QR/barcode atau kode manual, menerima kendaraan, lalu menangani perbaikan.' },
  { title: 'Mitra towing & sopir', detail: 'Menjemput dan mengantar kendaraan ke bengkel pilihan. Tiket layanan dipindai atau dimasukkan manual untuk otorisasi.' },
] as const;

export const faqItems = [
  { question: 'Apa langkah pertama setelah insiden?', answer: 'Lengkapi data kendaraan dan foto plat nomor. DRIVE membaca data plat, lalu menggunakannya untuk mengecek perlindungan asuransi. Setelah itu, foto sisi atau bagian yang rusak mengikuti panduan aplikasi.' },
  { question: 'Saya punya asuransi. Tetap harus membayar hasil lengkap?', answer: 'Ya. Semua pengguna wajib membayar untuk membuka hasil AI lengkap, termasuk pemilik kendaraan berasuransi. Sebelum pembayaran, yang terlihat hanya hasil umum. Harga ditampilkan di aplikasi sebelum Anda membayar.' },
  { question: 'Apa saja yang terbuka setelah pembayaran?', answer: 'Persentase kerusakan keseluruhan dan per foto, komponen terdampak, rekomendasi perbaikan atau penggantian, serta estimasi biaya. Estimasi dapat berubah setelah pemeriksaan langsung di bengkel.' },
  { question: 'Apakah semua klaim disetujui otomatis?', answer: 'Tidak. Perusahaan asuransi harus mengaktifkan persetujuan otomatis pada produk yang dipilih, dan klaim tetap harus memenuhi aturan produk tersebut. Produk atau pengajuan lainnya melalui peninjauan manual oleh asuransi.' },
  { question: 'Bagaimana jika kendaraan tidak punya asuransi?', answer: 'Anda tetap dapat membuka hasil lengkap melalui pembayaran, lalu merencanakan perbaikan dengan biaya sendiri. Jalur berasuransi dalam ilustrasi ini adalah contoh perjalanan pengguna yang memiliki pertanggungan.' },
  { question: 'Bagaimana bengkel dan towing dipilih?', answer: 'Setelah klaim disetujui, pilih bengkel mitra DRIVE yang terdaftar berdasarkan lokasi dan ketersediaan. Anda dapat mengantar sendiri atau meminta towing. Pencarian towing dimulai dari yang terdekat, lalu diperluas bertahap bila belum ada penyedia yang tersedia.' },
  { question: 'Apakah tiket towing dan bengkel berbeda?', answer: 'Setelah klaim disetujui, DRIVE menerbitkan satu tiket layanan untuk towing dan bengkel. Mitra memindai QR/barcode yang sama atau memasukkan kode manual bila pemindaian gagal. Otorisasi dan biaya yang ditanggung tetap mengikuti persetujuan serta manfaat polis.' },
  { question: 'Apakah angka dalam ilustrasi ini merupakan penawaran?', answer: 'Tidak. Persentase kerusakan, biaya, jarak, waktu kedatangan, dan kode tiket dalam adegan adalah simulasi. Hasil pemeriksaan, harga, serta ketersediaan layanan sebenarnya ditampilkan di aplikasi.' },
] as const;
