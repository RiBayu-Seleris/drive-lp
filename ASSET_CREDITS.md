# Asset Credits & Licensing Notes

Dokumen ini mencatat asal aset visual, font, dan catatan lisensi runtime yang digunakan oleh DRIVE Landing Page. Dokumen ini bukan pengganti teks lisensi resmi masing-masing proyek.

## Identitas DRIVE

| Aset | Sumber | Status penggunaan |
| --- | --- | --- |
| `public/assets/brand/drive-logo.svg` | Salinan identik dari `../LOGO/Drive-Horizontal-white.svg` | Logo resmi DRIVE yang disediakan oleh pemilik proyek. Tidak dirilis ulang sebagai aset open-source. |
| `public/assets/brand/drive-mark.svg` | Salinan identik dari `../LOGO/Drive-Tab-Logo-white.svg` | Mark resmi DRIVE yang disediakan oleh pemilik proyek. Tidak dirilis ulang sebagai aset open-source. |

Hak penggunaan merek dan logo mengikuti kebijakan pemilik DRIVE/AutoClaim. Jangan memakai, memodifikasi, atau mendistribusikan aset tersebut di luar konteks proyek tanpa izin yang sesuai.

## Visual 3D dan media

Kendaraan, lingkungan, jalan, cahaya, scanner, partikel, dan elemen data pada perjalanan 3D dibangun secara prosedural di source proyek menggunakan Three.js/React Three Fiber. Implementasi ini tidak memuat model kendaraan bermerek, file GLB/GLTF pihak ketiga, stock photography, stock footage, atau badge produsen kendaraan. Tekstur aspal, normal map batu, dan HDRI refleksi memakai aset CC0 Poly Haven; rincian sumber, pembuat, dan berkas ada di [public/assets/ATTRIBUTIONS.md](public/assets/ATTRIBUTIONS.md).

Geometri prosedural tersebut adalah karya internal proyek. Jika model, foto, video, HDRI, tekstur, audio, atau aset unduhan ditambahkan kemudian, catat pembuat, URL sumber, lisensi, perubahan yang dilakukan, dan tanggal pengambilan sebelum aset digabungkan.

## Font

Font berikut diunduh dari repositori resmi Google Fonts, disimpan bersama notice OFL di `public/assets/fonts/`, dan dimuat secara lokal dan tersedia di bawah SIL Open Font License 1.1 (OFL):

- **Manrope** — display dan heading; [notice OFL upstream](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt).
- **Poppins** — body copy dan antarmuka.
- **JetBrains Mono** — label data dan teks monospaced.

OFL mengizinkan penggunaan dan distribusi font dengan syarat lisensinya. Bila kebutuhan privasi atau performa mengharuskan self-hosting, simpan notice OFL bersama file font dan jangan mengubah reserved font name secara tidak sah.

## Ikon dan library visual

| Paket | Lisensi upstream | Catatan |
| --- | --- | --- |
| Lucide / `lucide-react` | ISC | Ikon antarmuka; lihat notice pada paket upstream. |
| Three.js | MIT | Renderer dan primitive 3D. |
| React Three Fiber / drei / postprocessing | MIT | Integrasi scene, helper, dan efek 3D. |
| Lenis | MIT | Smooth-scroll runtime. |
| AOS | MIT | Reveal animation untuk konten non-scrub. |
| Framer Motion | MIT | Transisi dan micro-interaction UI. |
| GSAP / ScrollTrigger | **GreenSock Standard License** | Bukan MIT. Tinjau [GSAP Standard License](https://gsap.com/standard-license/) untuk batas penggunaan dan distribusi. |

Lisensi tiap dependency tetap dimiliki dan diatur oleh proyek upstream. `package-lock.json` adalah rujukan versi dependency yang benar-benar terpasang; periksa ulang notice upstream saat melakukan upgrade.

## Konten dan klaim

Copy naratif, status pemrosesan, visual verifikasi, dan adegan persetujuan dibuat untuk demonstrasi pengalaman landing page. Mereka bukan data operasional, hasil backend, testimoni pelanggan, statistik performa, atau jaminan persetujuan klaim.

Proyek ini tidak menyertakan lisensi umum untuk seluruh source code. Lisensi dependency dan font di atas tidak otomatis melisensikan ulang kode aplikasi atau merek DRIVE.
