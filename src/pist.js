// Pist: kapalı bir döngü. Denetim noktalarından Catmull-Rom eğrisi çıkar, 1 blokta bir örneklenir.
// Her örnekte orta çizgi (x, z), yükseklik (y), yön (tx, tz), en (w) ve bölüm adı tutulur.
// Konumlar pistte iki sayıyla anlatılır: s (başlangıçtan uzaklık, 0…L) ve yanal (sağa +, sola −).
// Akış yönü örnek sırasıdır; "ileri" s'nin arttığı yön.

/** [x, z, en, y, bölüm] — akış sırasıyla. Bölümler görünümü ve süsleri seçer. */
const NOKTALAR = [
  [-70, 85, 22, 0, 'tribun'], [0, 88, 22, 0, 'tribun'], [70, 85, 21, 0, 'tribun'],
  [118, 62, 18, 1, 'magara'], [140, 14, 17, 3, 'magara'],
  [128, -38, 15, 4, 'kopru'], [96, -70, 10, 5, 'kopru'], [54, -84, 10, 5, 'kopru'],
  [10, -78, 18, 3, 'selale'], [-36, -94, 19, 2, 'selale'],
  [-86, -80, 15, 1, 'tunel'], [-124, -46, 13, 0, 'tunel'], [-136, 4, 13, 0, 'tunel'],
  [-118, 52, 18, 0, 'magara'],
];

export const BOLUM_AD = { tribun: 'Tribün Düzlüğü', magara: 'Mağara Yolu', kopru: 'Maden Köprüsü', selale: 'Şelale Geçidi', tunel: 'Fener Tüneli' };

function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function kur() {
  const n = NOKTALAR.length, ince = [];
  // 1) Eğriyi sık örnekle (uzunluk ölçmek için)
  for (let i = 0; i < n; i++) {
    const P = k => NOKTALAR[(i + k + n) % n];
    for (let j = 0; j < 60; j++) {
      const t = j / 60, q = [0, 1, 2, 3].map(a => P(a - 1));
      ince.push({ x: cr(q[0][0], q[1][0], q[2][0], q[3][0], t), z: cr(q[0][1], q[1][1], q[2][1], q[3][1], t), w: cr(q[0][2], q[1][2], q[2][2], q[3][2], t), y: cr(q[0][3], q[1][3], q[2][3], q[3][3], t), b: t < 0.5 ? q[1][4] : q[2][4] });
    }
  }
  const uz = [0];
  for (let i = 1; i <= ince.length; i++) { const a = ince[i - 1], b = ince[i % ince.length]; uz.push(uz[i - 1] + Math.hypot(b.x - a.x, b.z - a.z)); }
  const L = uz[ince.length], N = Math.round(L);
  // 2) Eşit aralıklı (L/N ≈ 1 blok) örnekler
  const x = new Float64Array(N), z = new Float64Array(N), y = new Float64Array(N), w = new Float64Array(N), b = new Array(N);
  let k = 0;
  for (let i = 0; i < N; i++) {
    const s = i * L / N;
    while (uz[k + 1] < s) k++;
    const a = ince[k], c = ince[(k + 1) % ince.length], t = (s - uz[k]) / (uz[k + 1] - uz[k]);
    x[i] = a.x + (c.x - a.x) * t; z[i] = a.z + (c.z - a.z) * t; y[i] = a.y + (c.y - a.y) * t; w[i] = a.w + (c.w - a.w) * t; b[i] = a.b;
  }
  const tx = new Float64Array(N), tz = new Float64Array(N);
  for (let i = 0; i < N; i++) { const p = (i - 1 + N) % N, q = (i + 1) % N, dx = x[q] - x[p], dz = z[q] - z[p], d = Math.hypot(dx, dz); tx[i] = dx / d; tz[i] = dz / d; }
  return { L, N, ad: L / N, x, z, y, w, b, tx, tz };
}

export const P = kur();
export const L = P.L;

const sar = s => ((s % L) + L) % L;
/** İki s arasındaki en kısa ileri fark (−L/2 … L/2). */
export const sFark = (a, b) => { let d = sar(b - a); if (d > L / 2) d -= L; return d; };

/** s'deki pist bilgisi (ara değerli): orta çizgi, yön, sağ, en, yükseklik, bölüm. */
export function pistNoktasi(s) {
  s = sar(s);
  const f = s / P.ad, i = Math.floor(f) % P.N, j = (i + 1) % P.N, t = f - Math.floor(f);
  const lerp = (A) => A[i] + (A[j] - A[i]) * t;
  let tx = lerp(P.tx), tz = lerp(P.tz); const d = Math.hypot(tx, tz); tx /= d; tz /= d;
  return { x: lerp(P.x), z: lerp(P.z), y: lerp(P.y), w: lerp(P.w), tx, tz, sx: -tz, sz: tx, bolum: P.b[i] };
}
/** Pist koordinatından dünya konumu. */
export function dunya(s, yanal) { const p = pistNoktasi(s); return { x: p.x + p.sx * yanal, y: p.y, z: p.z + p.sz * yanal, yaw: Math.atan2(-p.tx, -p.tz) }; }

/**
 * Dünya konumunu piste yansıt: en yakın orta çizgi noktası. ipucu (önceki s) verilirse yalnız çevresine bakılır
 * (hızlı ve döngünün öbür kolundaki yakın noktaya atlamaz). Döner: { s, yanal }.
 */
export function yansit(x, z, ipucu = null) {
  const N = P.N;
  let en = Infinity, ei = 0;
  const bak = i => { i = ((i % N) + N) % N; const dx = x - P.x[i], dz = z - P.z[i], d = dx * dx + dz * dz; if (d < en) { en = d; ei = i; } };
  if (ipucu == null) for (let i = 0; i < N; i++) bak(i);
  else { const h = Math.round(sar(ipucu) / P.ad); for (let k = -40; k <= 40; k++) bak(h + k); }
  // En yakın örneğin iki yanındaki parçalara dik iz düşüm
  let iyi = { s: ei * P.ad, d: Infinity, yanal: 0 };
  for (const [a, b] of [[(ei - 1 + N) % N, ei], [ei, (ei + 1) % N]]) {
    const ax = P.x[a], az = P.z[a], bx = P.x[b] - ax, bz = P.z[b] - az, uu = bx * bx + bz * bz;
    const t = Math.max(0, Math.min(1, ((x - ax) * bx + (z - az) * bz) / uu)), px = ax + bx * t, pz = az + bz * t, d = (x - px) ** 2 + (z - pz) ** 2;
    if (d < iyi.d) { const s = (a + t) * P.ad, p = pistNoktasi(s); iyi = { s: sar(s), d, yanal: (x - p.x) * p.sx + (z - p.z) * p.sz }; }
  }
  return { s: iyi.s, yanal: iyi.yanal };
}

/** Kontrol noktaları: eşit aralıklı; 0. nokta başlangıç kapısı (Tribün Düzlüğü). */
export function noktalar(sayi) { return Array.from({ length: sayi }, (_, i) => i * L / sayi); }
/** Pist sınırları (görünüm ve kamera için): [x0, z0, x1, z1]. */
export function sinir() {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < P.N; i++) { x0 = Math.min(x0, P.x[i]); x1 = Math.max(x1, P.x[i]); z0 = Math.min(z0, P.z[i]); z1 = Math.max(z1, P.z[i]); }
  return [x0, z0, x1, z1];
}

/** Bölümün s aralıkları (ardışık örneklerden): { ad: [[s0, s1], …] } (döngüde bir bölüm iki kez geçebilir). */
export const BOLUMLER = (() => {
  const l = {}; let bas = 0;
  // Bölüm sınırı olmayan bir yerden başla ki aralık ikiye bölünmesin
  let i0 = 0; while (P.b[i0] === P.b[(i0 - 1 + P.N) % P.N] && i0 < P.N) i0++;
  for (let k = 0; k < P.N; k++) {
    const i = (i0 + k) % P.N, j = (i + 1) % P.N;
    if (k === 0) bas = i * P.ad;
    if (P.b[j] !== P.b[i] || k === P.N - 1) { (l[P.b[i]] ??= []).push([bas, bas + sFark(bas, (i + 1) * P.ad)]); bas = j * P.ad; }
  }
  return l;
})();

/**
 * Engeller (pist koordinatında): s0…s1 boyunca, yanal a0…a1 arasında, h yüksekliğinde.
 * ada: uzun kaya ada (yolu ikiye ayırır, atış geçirmez); cit: alçak barikat (zıplanır); vagon: devrik maden vagonu (siper).
 */
export const ENGELLER = (() => {
  const l = [], B = BOLUMLER, ekle = (tur, s0, boy, a0, a1, h) => l.push({ tur, s0: sar(s0), s1: sar(s0 + boy), boy, a0, a1, h });
  const ilk = ad => B[ad]?.[0], ikinci = ad => B[ad]?.[1] ?? B[ad]?.[0];
  if (ilk('selale')) { const [a, b] = ilk('selale'); ekle('ada', (a + b) / 2 - 18, 36, -2.4, 2.4, 4.5); }
  if (ilk('magara')) { const [a] = ilk('magara'), y1 = pistNoktasi(a + 30).w / 2 - 0.05, y2 = pistNoktasi(a + 62).w / 2 - 0.05; ekle('cit', a + 30, 1.2, -y1, -1.2, 0.9); ekle('cit', a + 62, 1.2, 1.2, y2, 0.9); }
  if (ikinci('magara') && ikinci('magara') !== ilk('magara')) { const [a] = ikinci('magara'); ekle('cit', a + 25, 1.2, -3, 3, 0.9); }
  if (ilk('tunel')) { const [a] = ilk('tunel'); ekle('vagon', a + 28, 2.6, 1.6, 3.6, 1.7); ekle('vagon', a + 64, 2.6, -3.6, -1.6, 1.7); ekle('vagon', a + 100, 2.6, 0.2, 2.2, 1.7); }
  return l;
})();
/** (s, yanal) bir engelin içinde mi (pay kadar genişletilmiş)? */
export function engelde(s, yanal, pay = 0) {
  for (const e of ENGELLER) { const d = sFark(e.s0, s); if (d >= -pay && d <= e.boy + pay && yanal >= e.a0 - pay && yanal <= e.a1 + pay) return e; }
  return null;
}

/** Silah kutuları: 22 blokta bir sırayla kırmızı (saldırı) ve mavi (savunma); köprüde sağlam kutular kenarda. */
export const KUTU_YERLERI = (() => {
  const l = [], DESEN = [-0.55, 0.35, 0.75, -0.15, 0.1, -0.8];
  let n = 0;
  for (let s = 26; s < L - 10; s += 22, n++) {
    const p = pistNoktasi(s), yari = p.w / 2 - 1.3;
    let yanal = p.bolum === 'kopru' ? (n % 2 ? 1 : -1) * yari : DESEN[n % DESEN.length] * yari;
    if (engelde(s, yanal, 1.5)) yanal = -yanal; if (engelde(s, yanal, 1.5)) yanal = Math.sign(yanal || 1) * yari;
    l.push({ s, yanal, tur: n % 2 ? 'mavi' : 'kirmizi' });
  }
  return l;
})();
