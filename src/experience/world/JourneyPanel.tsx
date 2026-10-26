import { useEffect, useMemo } from 'react';
import { useLoader, type ThreeElements } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, SRGBColorSpace, TextureLoader } from 'three';

export type JourneyPanelKind = 'coverage' | 'capture' | 'assessment' | 'locked' | 'claim' | 'approval' | 'workshop' | 'dispatch' | 'ticket' | 'authorized';
export type JourneyPanelProps = ThreeElements['group'] & { kind: JourneyPanelKind; width?: number; mobile?: boolean };

type Context = CanvasRenderingContext2D;
type VehicleView = 'preview' | 'front' | 'rear' | 'right' | 'left';
const VIEW_ROWS: Record<VehicleView, number> = { preview: 0, front: 1, rear: 2, right: 3, left: 4 };
const C = { white: '#edf8fc', muted: '#9eb8c9', cyan: '#91dce9', line: '#315267', dark: '#0a1b2c', surface: '#102638', teal: '#a2e7d3', amber: '#efbe99' };
const TICKET_CODE = 'DRV-82X19A';
const TITLES: Record<JourneyPanelKind, string> = {
  coverage: 'Plat & cek asuransi', capture: 'Foto bagian yang rusak', assessment: 'Hasil lengkap terbuka',
  locked: 'Hasil umum tersedia', claim: 'Pengajuan klaim Anda', approval: 'Dua jalur keputusan',
  workshop: 'Pilih bengkel mitra', dispatch: 'Mencari towing terdekat', ticket: 'Satu tiket layanan DRIVE', authorized: 'Satu tiket, dua layanan.',
};

function text(ctx: Context, value: string, x: number, y: number, size = 24, color = C.white, weight = 500, align: CanvasTextAlign = 'left') {
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
  ctx.textAlign = 'left';
}

function paragraph(ctx: Context, value: string, x: number, y: number, width: number, size = 21, color = C.muted, lineHeight = 30) {
  ctx.font = `400 ${size}px sans-serif`;
  let current = '';
  let baseline = y;
  value.split(' ').forEach(word => {
    const next = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(next).width > width) {
      text(ctx, current, x, baseline, size, color, 400);
      baseline += lineHeight;
      current = word;
    } else current = next;
  });
  if (current) text(ctx, current, x, baseline, size, color, 400);
  return baseline;
}

function line(ctx: Context, points: readonly (readonly [number, number])[], color = C.line, width = 2) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function box(ctx: Context, x: number, y: number, width: number, height: number, fill = C.surface, stroke = C.line, radius = 12) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

function circle(ctx: Context, x: number, y: number, radius: number, color = C.cyan, width = 2) {
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}

function check(ctx: Context, x: number, y: number, size = 22, color = C.teal) {
  line(ctx, [[x - size * .55, y], [x - size * .12, y + size * .4], [x + size * .64, y - size * .45]], color, 4);
}

function arrow(ctx: Context, x: number, y: number, length = 55, color = C.cyan) {
  line(ctx, [[x, y], [x + length, y], [x + length - 10, y - 8]], color, 2);
  line(ctx, [[x + length, y], [x + length - 10, y + 8]], color, 2);
}

function lock(ctx: Context, x: number, y: number, size = 38) {
  ctx.beginPath(); ctx.arc(x, y - size * .2, size * .28, Math.PI, 0); ctx.strokeStyle = C.muted; ctx.lineWidth = 3; ctx.stroke();
  box(ctx, x - size * .42, y - size * .2, size * .84, size * .68, C.dark, C.muted, 6);
  circle(ctx, x, y + size * .09, 3, C.muted, 2);
}

function vehicle(ctx: Context, atlas: CanvasImageSource, view: VehicleView, x: number, y: number, width: number, height = width / 2) {
  ctx.drawImage(atlas, 0, VIEW_ROWS[view] * 600, 1200, 600, x, y, width, height);
}

function plate(ctx: Context, x: number, y: number, width = 332, height = 102) {
  box(ctx, x, y, width, height, '#e5edf0', '#f6fcff', 9);
  ctx.strokeStyle = '#284554'; ctx.lineWidth = 2; ctx.strokeRect(x + 8, y + 8, width - 16, height - 16);
  text(ctx, 'B 1234 ABC', x + width / 2, y + height * .59, width * .111, '#101f28', 700, 'center');
  text(ctx, 'CONTOH PLAT', x + width / 2, y + height * .83, 14, '#435a64', 500, 'center');
}

function chip(ctx: Context, value: string, x: number, y: number, width: number, color = C.teal) {
  box(ctx, x, y, width, 38, '#112d32', '#365950', 7);
  text(ctx, value, x + width / 2, y + 26, 18, color, 600, 'center');
}

function drawCoverage(ctx: Context, atlas: CanvasImageSource) {
  vehicle(ctx, atlas, 'front', 570, 132, 384, 192);
  text(ctx, '01 / FOTO PLAT', 48, 154, 20, C.muted);
  plate(ctx, 48, 175, 360, 118);
  text(ctx, 'Polis dicari lewat data plat.', 48, 329, 22, C.muted);
  const x = [48, 364, 680];
  ['PLAT TERBACA', 'CEK DATA POLIS', 'PERLINDUNGAN ADA'].forEach((label, index) => {
    box(ctx, x[index], 380, 280, 105, C.dark, index === 2 ? '#4c877d' : C.line);
    text(ctx, `0${index + 1}`, x[index] + 20, 413, 20, C.muted);
    text(ctx, label, x[index] + 20, 451, index === 2 ? 20 : 22, index === 2 ? C.teal : C.white, 600);
    if (index < 2) arrow(ctx, x[index] + 288, 432, 20);
  });
  check(ctx, 63, 540, 18);
  text(ctx, 'Polis ditemukan dari data plat.', 95, 548, 24, C.teal);
}

function drawCapture(ctx: Context, atlas: CanvasImageSource) {
  const shots: { view: VehicleView; label: string; part: string }[] = [
    { view: 'front', label: '01 / DEPAN', part: 'BUMPER & LAMPU' },
    { view: 'rear', label: '02 / BELAKANG', part: 'BUMPER BELAKANG' },
    { view: 'right', label: '03 / KANAN', part: 'PINTU KANAN' },
    { view: 'left', label: '04 / KIRI', part: 'PINTU & SPION KIRI' },
  ];
  shots.forEach((shot, index) => {
    const x = 42 + (index % 2) * 476;
    const y = 137 + Math.floor(index / 2) * 222;
    box(ctx, x, y, 464, 202, C.dark);
    text(ctx, shot.label, x + 18, y + 30, 20, C.white, 600);
    vehicle(ctx, atlas, shot.view, x + 98, y + 38, 268, 134);
    line(ctx, [[x + 78, y + 70], [x + 78, y + 49], [x + 100, y + 49]], C.cyan, 3);
    line(ctx, [[x + 386, y + 131], [x + 386, y + 153], [x + 364, y + 153]], C.cyan, 3);
    circle(ctx, x + (index > 1 ? 238 : 196), y + 126, 17, C.amber, 3);
    text(ctx, shot.part, x + 18, y + 185, 18, C.amber, 500);
    check(ctx, x + 428, y + 26, 14);
  });
}

function drawAssessment(ctx: Context) {
  circle(ctx, 162, 241, 88, '#294c60', 10);
  ctx.beginPath(); ctx.arc(162, 241, 88, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * .31); ctx.strokeStyle = C.cyan; ctx.lineWidth = 10; ctx.stroke();
  text(ctx, '31%', 162, 255, 67, C.white, 600, 'center');
  text(ctx, 'KERUSAKAN TOTAL', 162, 293, 16, C.muted, 500, 'center');
  [28, 42, 18, 35].forEach((value, index) => {
    const y = 163 + index * 46;
    text(ctx, `Foto 0${index + 1}`, 310, y + 11, 22);
    box(ctx, 442, y - 6, 414, 14, '#193447', '', 5);
    box(ctx, 442, y - 6, 414 * value / 100, 14, C.cyan, '', 5);
    text(ctx, `${value}%`, 925, y + 11, 24, C.cyan, 600, 'right');
  });
  line(ctx, [[46, 359], [978, 359]]);
  const parts = [ ['Bumper depan', 'PERBAIKI'], ['Panel pintu kiri', 'PERBAIKI'], ['Spion kiri', 'GANTI'] ];
  text(ctx, 'KOMPONEN YANG RUSAK', 48, 398, 18, C.muted);
  parts.forEach(([name, action], index) => {
    const y = 434 + index * 49;
    text(ctx, name, 48, y + 8, 23);
    chip(ctx, action, 430, y - 18, 146, action === 'GANTI' ? C.amber : C.teal);
  });
  box(ctx, 623, 384, 355, 180, '#102c35', '#3c6a70');
  text(ctx, 'ESTIMASI BIAYA', 647, 425, 20, C.muted);
  text(ctx, 'Rp 8.450.000', 647, 480, 39, C.white, 600);
  paragraph(ctx, 'Bisa berubah setelah dicek bengkel.', 647, 518, 305, 20, C.muted, 26);
}

function drawLocked(ctx: Context) {
  box(ctx, 45, 145, 300, 280, C.dark);
  text(ctx, 'HASIL UMUM', 195, 185, 20, C.muted, 500, 'center');
  text(ctx, 'ADA KERUSAKAN', 195, 270, 35, C.white, 600, 'center');
  text(ctx, 'Terlihat dari foto Anda', 195, 314, 22, C.muted, 400, 'center');
  chip(ctx, 'DETAIL TERKUNCI', 85, 355, 220, C.amber);
  ['Persentase per foto', 'Komponen & rekomendasi', 'Estimasi biaya perbaikan'].forEach((label, index) => {
    const y = 146 + index * 95;
    box(ctx, 373, y, 606, 79, '#102435');
    text(ctx, label, 395, y + 31, 21, C.muted);
    [132, 84, 65].forEach((width, bar) => box(ctx, 395 + bar * 150, y + 45, width, 12, '#2b4253', '', 5));
    lock(ctx, 937, y + 42, 33);
  });
  box(ctx, 45, 453, 934, 109, '#11303b', '#477986');
  lock(ctx, 84, 498, 40);
  text(ctx, 'Bayar untuk membuka hasil lengkap', 124, 493, 30, C.white, 600);
  text(ctx, 'WAJIB UNTUK SEMUA PENGGUNA, TERMASUK YANG BERASURANSI', 124, 534, 19, C.cyan, 500);
}

function drawClaim(ctx: Context) {
  const steps = [ ['Pilih polis', 'Polis yang melindungi kendaraan.'], ['Tulis kronologi', 'Ceritakan apa yang terjadi.'], ['Unggah dokumen', 'Lengkapi berkas yang diminta.'], ['Kirim pengajuan', 'Pengajuan diteruskan ke asuransi.'] ];
  line(ctx, [[90, 181], [90, 497]], '#467c89', 3);
  steps.forEach(([title, detail], index) => {
    const y = 176 + index * 104;
    box(ctx, 66, y - 22, 48, 48, C.dark, C.cyan, 24);
    text(ctx, String(index + 1), 90, y + 10, 25, C.cyan, 600, 'center');
    text(ctx, title, 137, y, 29, C.white, 600);
    text(ctx, detail, 137, y + 34, 21, C.muted);
  });
  box(ctx, 659, 146, 319, 390, '#102332');
  text(ctx, 'BERKAS KLAIM', 686, 190, 21, C.cyan);
  plate(ctx, 687, 213, 263, 78);
  ['POLIS TERPILIH', 'KRONOLOGI TERISI', 'DOKUMEN TERLAMPIR'].forEach((label, index) => {
    check(ctx, 702, 336 + index * 55, 15);
    text(ctx, label, 732, 343 + index * 55, 16, C.white, 500);
  });
  text(ctx, 'DRIVE', 687, 505, 22, C.cyan, 600);
  arrow(ctx, 770, 496, 37);
  text(ctx, 'ASURANSI', 829, 504, 19, C.white, 600);
}

function drawApproval(ctx: Context) {
  text(ctx, 'Aturannya ditentukan asuransi', 512, 162, 24, C.muted, 500, 'center');
  line(ctx, [[512, 184], [512, 208], [264, 208], [264, 233]], C.line, 3);
  line(ctx, [[512, 208], [756, 208], [756, 233]], C.line, 3);
  box(ctx, 44, 235, 451, 291, '#102e30', '#477c6f');
  box(ctx, 529, 235, 451, 291, '#192735', '#59616b');
  chip(ctx, 'PERSETUJUAN OTOMATIS', 70, 258, 397, C.teal);
  text(ctx, 'Klaim memenuhi syarat', 70, 341, 29, C.white, 600);
  paragraph(ctx, 'Produknya diaktifkan dan klaim sesuai aturan.', 70, 382, 382, 22);
  check(ctx, 92, 473, 22);
  text(ctx, 'KLAIM DISETUJUI', 129, 482, 28, C.teal, 600);
  text(ctx, 'JALUR PENINJAUAN', 555, 286, 23, C.amber, 600);
  text(ctx, 'Produk atau klaim lain', 555, 341, 29, C.white, 600);
  paragraph(ctx, 'Petugas asuransi memeriksa pengajuannya.', 555, 382, 382, 22);
  circle(ctx, 576, 472, 18, C.amber, 2);
  line(ctx, [[576, 460], [576, 472], [586, 478]], C.amber, 2);
  text(ctx, 'DITINJAU MANUAL', 610, 482, 28, C.amber, 600);
  text(ctx, 'Persetujuan otomatis tidak berlaku untuk semua klaim.', 512, 566, 23, C.muted, 400, 'center');
}

function workshopIcon(ctx: Context, x: number, y: number, size = 42) {
  line(ctx, [[x - size, y], [x - size, y - size], [x, y - size * 1.65], [x + size, y - size], [x + size, y], [x - size, y]], C.cyan, 3);
  line(ctx, [[x - size * .52, y], [x - size * .52, y - size * .8], [x + size * .52, y - size * .8], [x + size * .52, y]], C.cyan, 2);
}

function drawWorkshop(ctx: Context) {
  for (let i = 0; i < 6; i++) line(ctx, [[45, 170 + i * 58], [475, 147 + i * 63]], '#213e51', 2);
  for (let i = 0; i < 6; i++) line(ctx, [[70 + i * 77, 138], [48 + i * 85, 505]], '#213e51', 2);
  line(ctx, [[102, 466], [169, 407], [237, 409], [318, 310], [402, 279]], C.cyan, 6);
  circle(ctx, 102, 466, 15, C.white, 4);
  workshopIcon(ctx, 403, 280, 31);
  workshopIcon(ctx, 156, 255, 24);
  text(ctx, 'LOKASI ANDA', 48, 539, 20, C.muted);
  ['Bengkel mitra 01', 'Bengkel mitra 02'].forEach((name, index) => {
    const y = 142 + index * 148;
    box(ctx, 524, y, 454, 126, index ? C.dark : '#112c34', index ? C.line : '#56858a');
    text(ctx, name, 548, y + 40, 28, C.white, 600);
    text(ctx, 'MITRA TERDAFTAR', 548, y + 75, 18, C.teal);
    text(ctx, index ? '4,6 km · slot berikutnya' : '2,1 km · tersedia', 548, y + 107, 22, C.muted);
  });
  text(ctx, 'CARA KE BENGKEL', 524, 460, 19, C.muted);
  box(ctx, 524, 480, 215, 70, C.dark, C.line);
  box(ctx, 755, 480, 223, 70, '#143340', '#59818e');
  text(ctx, 'Antar sendiri', 632, 523, 24, C.white, 500, 'center');
  text(ctx, 'Pesan towing', 867, 523, 24, C.cyan, 600, 'center');
}

function drawDispatch(ctx: Context) {
  const cx = 258, cy = 351;
  [67, 124, 184].forEach((radius, index) => {
    circle(ctx, cx, cy, radius, index === 2 ? C.cyan : '#3d657c', index === 2 ? 3 : 2);
    text(ctx, `${(index + 1) * 2} km`, cx + radius - 40, cy - 17, 19, C.muted);
  });
  line(ctx, [[65, cy], [451, cy]], '#29495c', 1);
  line(ctx, [[cx, 156], [cx, 546]], '#29495c', 1);
  circle(ctx, cx, cy, 11, C.white, 5);
  line(ctx, [[cx, cy], [310, 329], [353, 264], [401, 253]], C.teal, 4);
  box(ctx, 384, 232, 43, 34, '#174536', C.teal, 6);
  circle(ctx, 394, 269, 5, C.teal, 3); circle(ctx, 418, 269, 5, C.teal, 3);
  text(ctx, 'AREA PENCARIAN DIPERLUAS', 62, 558, 21, C.cyan);
  text(ctx, '2 km → 4 km → 6 km', 533, 176, 33, C.white, 600);
  paragraph(ctx, 'Belum ada yang tersedia? Area pencarian diperluas.', 533, 222, 431, 23);
  box(ctx, 529, 292, 449, 202, '#112d33', '#4f807a');
  text(ctx, 'TOWING TERDEKAT DITEMUKAN', 554, 328, 20, C.teal, 600);
  text(ctx, 'Mitra towing 01', 554, 378, 34, C.white, 600);
  text(ctx, '5,2 km', 554, 437, 35, C.cyan, 600);
  text(ctx, '± 12 menit', 760, 437, 30, C.white, 500);
  text(ctx, 'JARAK (CONTOH)', 554, 471, 17, C.muted);
  text(ctx, 'TIBA (CONTOH)', 760, 471, 17, C.muted);
  paragraph(ctx, 'Kami tugaskan mitra terdekat yang siap berangkat.', 533, 533, 431, 21);
}

/** Intentionally decorative, not an encoded or redeemable QR credential. */
function simulatedCode(ctx: Context, x: number, y: number, size: number) {
  const cells = 25, cell = size / cells;
  box(ctx, x - 11, y - 11, size + 22, size + 22, '#e9f5f7', '', 8);
  ctx.fillStyle = '#173245';
  for (let row = 0; row < cells; row++) for (let col = 0; col < cells; col++) {
    const finderArea = (col < 8 && row < 8) || (col > 16 && row < 8) || (col < 8 && row > 16);
    if (!finderArea && ((row * 23 + col * 19 + (row ^ col) * 7) % 11 < 5)) ctx.fillRect(x + col * cell, y + row * cell, cell, cell);
  }
  [[0, 0], [18, 0], [0, 18]].forEach(([col, row]) => {
    ctx.fillStyle = '#173245'; ctx.fillRect(x + col * cell, y + row * cell, cell * 7, cell * 7);
    ctx.fillStyle = '#e9f5f7'; ctx.fillRect(x + (col + 1) * cell, y + (row + 1) * cell, cell * 5, cell * 5);
    ctx.fillStyle = '#173245'; ctx.fillRect(x + (col + 2) * cell, y + (row + 2) * cell, cell * 3, cell * 3);
  });
}

function drawTicket(ctx: Context) {
  chip(ctx, 'CONTOH KLAIM DISETUJUI', 48, 144, 389, C.teal);
  text(ctx, 'Tiket Anda', 48, 241, 28, C.muted);
  text(ctx, TICKET_CODE, 48, 303, 60, C.white, 600);
  text(ctx, 'Kode yang sama untuk dua layanan.', 48, 346, 24, C.muted);
  box(ctx, 48, 391, 526, 133, C.dark);
  text(ctx, 'TOWING', 74, 432, 25, C.cyan, 600);
  arrow(ctx, 226, 423, 63);
  text(ctx, 'BENGKEL', 330, 432, 25, C.cyan, 600);
  paragraph(ctx, 'Pindai QR/barcode. Kalau gagal, ketik kode tiketnya.', 74, 473, 467, 22, C.muted, 29);
  simulatedCode(ctx, 664, 171, 259);
  text(ctx, 'CONTOH QR', 794, 477, 23, C.white, 600, 'center');
  text(ctx, 'Tidak bisa dipakai', 794, 512, 19, C.muted, 400, 'center');
  text(ctx, 'Yang ditanggung mengikuti klaim dan polis Anda.', 48, 568, 22, C.muted);
}

function drawAuthorized(ctx: Context) {
  text(ctx, TICKET_CODE, 512, 183, 43, C.white, 600, 'center');
  text(ctx, 'SATU TIKET · QR/BARCODE ATAU KODE MANUAL', 512, 223, 20, C.cyan, 500, 'center');
  [['TOWING', 'Penjemputan disetujui'], ['BENGKEL', 'Perbaikan disetujui']].forEach(([title, subtitle], index) => {
    const x = 48 + index * 488;
    box(ctx, x, 263, 439, 218, '#102e32', '#467b70');
    circle(ctx, x + 61, 323, 31, C.teal, 2);
    check(ctx, x + 61, 323, 24);
    text(ctx, title, x + 114, 333, 34, C.white, 600);
    text(ctx, subtitle, x + 27, 391, 24, C.teal);
    text(ctx, TICKET_CODE, x + 27, 440, 29, C.white, 600);
  });
  text(ctx, 'Selesai diperbaiki, siap jalan lagi.', 512, 552, 31, C.white, 500, 'center');
}

const MOBILE_TITLES: Record<JourneyPanelKind, string> = {
  coverage: 'Plat & cek asuransi', capture: 'Foto kerusakan', assessment: 'Hasil lengkap', locked: 'Hasil umum',
  claim: 'Pengajuan klaim', approval: 'Keputusan asuransi', workshop: 'Bengkel mitra DRIVE',
  dispatch: 'Mencari towing', ticket: 'Satu tiket layanan', authorized: 'Tiket yang sama',
};

/** Mobile is composed at its own density, rather than shrinking desktop tables. */
function createMobilePanel(kind: JourneyPanelKind, atlas: CanvasImageSource) {
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable for the DRIVE journey panel.');
  ctx.fillStyle = '#0a1c2c'; ctx.fillRect(0, 0, 640, 400);
  ctx.strokeStyle = '#426477'; ctx.lineWidth = 2; ctx.strokeRect(2, 2, 636, 396);
  text(ctx, 'DRIVE / CONTOH TAMPILAN', 24, 27, 20, C.cyan, 600);
  text(ctx, MOBILE_TITLES[kind], 24, 66, 34, C.white, 600);
  line(ctx, [[24, 82], [616, 82]]);

  switch (kind) {
    case 'coverage': {
      plate(ctx, 27, 110, 274, 86);
      vehicle(ctx, atlas, 'front', 328, 91, 281, 141);
      text(ctx, 'Plat → data → cek perlindungan', 24, 236, 25, C.muted);
      ['Data plat', 'Cek polis', 'Ada polis'].forEach((label, index) => {
        const x = 24 + index * 206;
        box(ctx, x, 257, 180, 53, C.dark, index === 2 ? '#598b7d' : C.line);
        text(ctx, label, x + 90, 292, 25, index === 2 ? C.teal : C.white, 600, 'center');
        if (index < 2) arrow(ctx, x + 184, 283, 17);
      });
      text(ctx, 'Asuransi ditemukan', 320, 348, 27, C.teal, 600, 'center');
      break;
    }
    case 'capture': {
      const shots: [VehicleView, string, string][] = [['front', '01 / DEPAN', 'Bumper & lampu'], ['rear', '02 / BELAKANG', 'Area belakang'], ['right', '03 / KANAN', 'Pintu kanan'], ['left', '04 / KIRI', 'Pintu & spion kiri']];
      shots.forEach(([view, label, area], index) => {
        const x = 24 + index % 2 * 308, y = 98 + Math.floor(index / 2) * 129;
        box(ctx, x, y, 284, 118, C.dark);
        text(ctx, label, x + 11, y + 28, 22, C.cyan, 600);
        vehicle(ctx, atlas, view, x + 117, y + 20, 157, 79);
        circle(ctx, x + 188, y + 74, 12, C.amber, 2);
        text(ctx, area, x + 11, y + 105, 22, C.white);
      });
      break;
    }
    case 'assessment': {
      text(ctx, '31%', 24, 164, 71, C.white, 600);
      text(ctx, 'TOTAL', 27, 196, 24, C.muted);
      [28, 42, 18, 35].forEach((value, index) => {
        const y = 118 + index * 33;
        text(ctx, `Foto 0${index + 1}`, 252, y, 23, C.muted);
        box(ctx, 366, y - 14, 131, 10, '#244052', '', 4);
        box(ctx, 366, y - 14, 131 * value / 100, 10, C.cyan, '', 4);
        text(ctx, `${value}%`, 610, y, 24, C.cyan, 600, 'right');
      });
      line(ctx, [[24, 242], [616, 242]]);
      [['Bumper depan', 'Perbaiki'], ['Panel pintu kiri', 'Perbaiki'], ['Spion kiri', 'Ganti']].forEach(([name, action], index) => {
        const y = 272 + index * 29;
        text(ctx, name, 24, y, 23);
        text(ctx, action, 616, y, 23, action === 'Ganti' ? C.amber : C.teal, 600, 'right');
      });
      text(ctx, 'Est. biaya', 24, 362, 23, C.muted);
      text(ctx, 'Rp 8.450.000', 616, 362, 30, C.white, 600, 'right');
      break;
    }
    case 'locked': {
      box(ctx, 24, 103, 592, 75, C.dark);
      lock(ctx, 59, 137, 38);
      text(ctx, 'Ada kerusakan', 99, 149, 32, C.white, 600);
      ['Komponen', 'Perbaiki/ganti', 'Estimasi'].forEach((label, index) => {
        const x = 24 + index * 202;
        text(ctx, label, x, 218, 22, C.muted);
        box(ctx, x, 231, 168, 12, '#304858', '', 5);
      });
      box(ctx, 24, 265, 592, 93, '#12313a', '#4b7780');
      text(ctx, 'Bayar untuk membuka detail', 320, 296, 28, C.white, 600, 'center');
      text(ctx, 'Semua pengguna, termasuk', 320, 326, 25, C.cyan, 500, 'center');
      text(ctx, 'yang berasuransi.', 320, 351, 25, C.cyan, 500, 'center');
      break;
    }
    case 'claim': {
      const steps = [['Pilih polis', 'Polis yang melindungi'], ['Tulis kronologi', 'Apa yang terjadi'], ['Unggah dokumen', 'Berkas yang diminta'], ['Kirim ke asuransi', 'Klaim terkirim']];
      line(ctx, [[49, 126], [49, 324]], '#497680', 3);
      steps.forEach(([title, subtitle], index) => {
        const y = 119 + index * 65;
        box(ctx, 28, y - 14, 43, 43, C.dark, C.cyan, 22);
        text(ctx, String(index + 1), 50, y + 15, 25, C.cyan, 600, 'center');
        text(ctx, title, 93, y + 5, 28, C.white, 600);
        text(ctx, subtitle, 93, y + 33, 22, C.muted);
      });
      break;
    }
    case 'approval': {
      text(ctx, 'Aturannya dari asuransi', 320, 118, 24, C.muted, 500, 'center');
      box(ctx, 24, 138, 284, 212, '#102e30', '#477c6f');
      box(ctx, 332, 138, 284, 212, '#192735', '#59616b');
      text(ctx, 'Otomatis', 44, 177, 30, C.teal, 600);
      paragraph(ctx, 'Diaktifkan asuransi, klaim sesuai aturan.', 44, 216, 238, 23, C.muted, 30);
      check(ctx, 57, 314, 17);
      text(ctx, 'Disetujui', 85, 325, 29, C.teal, 600);
      text(ctx, 'Produk / klaim lain', 352, 177, 24, C.white, 600);
      paragraph(ctx, 'Diperiksa petugas asuransi.', 352, 216, 238, 23, C.muted, 30);
      text(ctx, 'Ditinjau manual', 352, 325, 28, C.amber, 600);
      break;
    }
    case 'workshop': {
      ['Bengkel mitra 01', 'Bengkel mitra 02'].forEach((name, index) => {
        const y = 103 + index * 87;
        box(ctx, 24, y, 592, 76, index ? C.dark : '#123038', index ? C.line : '#5b8983');
        text(ctx, name, 41, y + 31, 27, C.white, 600);
        text(ctx, index ? '4,6 km · slot berikutnya' : '2,1 km · tersedia', 41, y + 62, 23, C.muted);
        text(ctx, 'TERDAFTAR', 599, y + 33, 22, C.teal, 600, 'right');
      });
      text(ctx, 'CARA KE BENGKEL', 24, 298, 23, C.muted);
      box(ctx, 24, 311, 284, 45, C.dark); box(ctx, 332, 311, 284, 45, '#14333f', '#5c8490');
      text(ctx, 'Antar sendiri', 166, 341, 25, C.white, 500, 'center');
      text(ctx, 'Pesan towing', 474, 341, 25, C.cyan, 600, 'center');
      break;
    }
    case 'dispatch': {
      [40, 77, 114].forEach((radius, index) => circle(ctx, 160, 221, radius, index === 2 ? C.cyan : '#3d6278', index === 2 ? 3 : 2));
      circle(ctx, 160, 221, 7, C.white, 4);
      line(ctx, [[160, 221], [203, 192], [239, 153]], C.teal, 4);
      check(ctx, 239, 153, 14);
      text(ctx, '2 → 4 → 6 km', 312, 124, 32, C.white, 600);
      paragraph(ctx, 'Belum ada? Area diperluas.', 312, 165, 298, 25, C.muted, 32);
      box(ctx, 304, 237, 312, 114, '#112e32', '#4d7c72');
      text(ctx, 'Towing ditemukan', 319, 269, 27, C.teal, 600);
      text(ctx, '5,2 km · ± 12 menit', 319, 305, 25, C.white, 500);
      text(ctx, 'Contoh jarak & waktu tiba', 319, 337, 22, C.muted);
      text(ctx, 'TERDEKAT DULU', 160, 355, 23, C.cyan, 500, 'center');
      break;
    }
    case 'ticket': {
      text(ctx, 'Contoh klaim disetujui', 24, 119, 25, C.teal, 600);
      text(ctx, TICKET_CODE, 24, 173, 43, C.white, 600);
      paragraph(ctx, 'Pindai QR/barcode atau ketik kodenya.', 24, 222, 377, 27, C.muted, 35);
      simulatedCode(ctx, 462, 113, 127);
      text(ctx, 'CONTOH QR', 525, 278, 22, C.white, 600, 'center');
      box(ctx, 24, 309, 592, 48, C.dark);
      text(ctx, 'TOWING', 50, 342, 29, C.cyan, 600); arrow(ctx, 227, 332, 82);
      text(ctx, 'BENGKEL', 374, 342, 29, C.cyan, 600);
      break;
    }
    case 'authorized': {
      text(ctx, TICKET_CODE, 320, 135, 45, C.white, 600, 'center');
      ['TOWING', 'BENGKEL'].forEach((label, index) => {
        const x = 24 + index * 308;
        box(ctx, x, 163, 284, 114, '#112e32', '#4b7d70');
        check(ctx, x + 35, 197, 17);
        text(ctx, label, x + 71, 208, 28, C.white, 600);
        text(ctx, 'Disetujui', x + 21, 252, 27, C.teal);
      });
      text(ctx, 'QR/barcode atau kode manual', 320, 317, 26, C.muted, 500, 'center');
      text(ctx, 'Kembali ke jalan.', 320, 354, 29, C.white, 600, 'center');
      break;
    }
  }
  line(ctx, [[24, 372], [616, 372]]);
  text(ctx, 'Contoh tampilan. Bukan data asli.', 24, 395, 21, C.muted, 400);
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}

function createPanel(kind: JourneyPanelKind, atlas: CanvasImageSource, mobile: boolean) {
  if (mobile) return createMobilePanel(kind, atlas);
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable for the DRIVE journey panel.');
  const gradient = ctx.createLinearGradient(0, 0, 1024, 640);
  gradient.addColorStop(0, '#0a1c2d'); gradient.addColorStop(1, '#081622');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1024, 640);
  ctx.strokeStyle = '#426477'; ctx.lineWidth = 2; ctx.strokeRect(2, 2, 1020, 636);
  ctx.fillStyle = C.cyan; ctx.fillRect(44, 0, 117, 4);
  text(ctx, 'DRIVE / CONTOH TAMPILAN', 44, 36, 17, C.cyan, 600);
  text(ctx, TITLES[kind], 44, 82, kind === 'authorized' ? 35 : 38, C.white, 600);
  line(ctx, [[44, 109], [980, 109]]);
  switch (kind) {
    case 'coverage': drawCoverage(ctx, atlas); break;
    case 'capture': drawCapture(ctx, atlas); break;
    case 'assessment': drawAssessment(ctx); break;
    case 'locked': drawLocked(ctx); break;
    case 'claim': drawClaim(ctx); break;
    case 'approval': drawApproval(ctx); break;
    case 'workshop': drawWorkshop(ctx); break;
    case 'dispatch': drawDispatch(ctx); break;
    case 'ticket': drawTicket(ctx); break;
    case 'authorized': drawAuthorized(ctx); break;
  }
  line(ctx, [[44, 590], [980, 590]]);
  text(ctx, 'Contoh tampilan. Data, biaya, jarak, dan kode tiket bukan data asli.', 44, 620, 18, C.muted, 400);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function JourneyPanel({ kind, width = 8, mobile = false, ...props }: JourneyPanelProps) {
  // Cached atlas is shared with the existing scene; only this panel's canvas is owned here.
  const atlas = useLoader(TextureLoader, '/assets/models/aventador-preview.webp');
  const texture = useMemo(() => createPanel(kind, atlas.image as CanvasImageSource, mobile), [kind, atlas, mobile]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group {...props}>
    <mesh renderOrder={1000}>
      <planeGeometry args={[width, width * .625]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={1}
        depthTest={false}
        depthWrite={false}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  </group>;
}
