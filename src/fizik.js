// Atış geometrisi: ışın–küre, ışın–dönük kutu, binici ve at vuruş kutuları, engellerin atış kesen kutuları,
// tohumlu saçılma (çifte saçmaları istemcide ve odada aynı çıksın).
import { ENGELLER, dunya, pistNoktasi } from './pist.js';

export function bakis(yaw, pitch) { const c = Math.cos(pitch); return [-Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c]; }

/** Tohumlu rastgele. */
export function tohumlu(t) { return () => { t |= 0; t = t + 0x6D2B79F5 | 0; let r = Math.imul(t ^ t >>> 15, 1 | t); r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r; return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
/** Yönü koni içinde saptır (sacilma radyan). */
export function saptir(d, sacilma, r) {
  if (!sacilma) return d;
  const [dx, dy, dz] = d, ux = Math.abs(dy) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let px = dy * ux[2] - dz * ux[1], py = dz * ux[0] - dx * ux[2], pz = dx * ux[1] - dy * ux[0]; const pl = Math.hypot(px, py, pz); px /= pl; py /= pl; pz /= pl;
  const qx = dy * pz - dz * py, qy = dz * px - dx * pz, qz = dx * py - dy * px;
  const a = r() * Math.PI * 2, m = Math.sqrt(r()) * sacilma, ca = Math.cos(a) * m, sa = Math.sin(a) * m;
  const x = dx + px * ca + qx * sa, y = dy + py * ca + qy * sa, z = dz + pz * ca + qz * sa, l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

/** Işın (o, d birim) ile y ekseninde yaw kadar dönük kutu (merkez c, yarı boyutlar h). İlk çarpma t ya da Infinity. */
export function isinKutu(o, d, c, yaw, h, enCok = Infinity) {
  const co = Math.cos(yaw), si = Math.sin(yaw);
  // Kutunun yerel eksenleri: x' = (co, 0, -si), z' = (si, 0, co) — Three.js y dönüşüyle aynı
  const rx = o[0] - c[0], ry = o[1] - c[1], rz = o[2] - c[2];
  const lo = [rx * co - rz * si, ry, rx * si + rz * co], ld = [d[0] * co - d[2] * si, d[1], d[0] * si + d[2] * co];
  let t0 = 0, t1 = enCok;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(ld[i]) < 1e-9) { if (Math.abs(lo[i]) > h[i]) return Infinity; continue; }
    let ta = (-h[i] - lo[i]) / ld[i], tb = (h[i] - lo[i]) / ld[i]; if (ta > tb) [ta, tb] = [tb, ta];
    if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) return Infinity;
  }
  return t0;
}

/**
 * Binicinin vuruş kutuları (konum x, y, z; atın yönü yaw): kafa, gövde (binici), at gövdesi.
 * Döner: { t, bolge: 'kafa' | 'govde' | 'at' } ya da null.
 */
export function biniciyeIsin(o, d, x, y, z, yaw, enCok = Infinity) {
  let en = enCok, bolge = null;
  const dene = (t, b) => { if (t < en) { en = t; bolge = b; } };
  dene(isinKutu(o, d, [x, y + 2.36, z], yaw, [0.28, 0.27, 0.28], en), 'kafa');
  dene(isinKutu(o, d, [x, y + 1.78, z], yaw, [0.36, 0.36, 0.26], en), 'govde');
  dene(isinKutu(o, d, [x, y + 1.06, z], yaw, [0.36, 0.34, 0.86], en), 'at');
  dene(isinKutu(o, d, [x - Math.sin(yaw) * 1.05, y + 1.75, z - Math.cos(yaw) * 1.05], yaw, [0.17, 0.4, 0.3], en), 'at'); // boyun + baş
  return bolge ? { t: en, bolge } : null;
}

/** Engellerin atış kesen kutuları (2 blokluk dilimler; alçak çitler de keser, çit boyunca). */
const ENGEL_KUTU = ENGELLER.flatMap(e => {
  const l = [], n = Math.max(1, Math.ceil(e.boy / 2));
  for (let k = 0; k < n; k++) {
    const s = e.s0 + (k + 0.5) * e.boy / n, d = dunya(s, (e.a0 + e.a1) / 2);
    l.push({ c: [d.x, d.y + e.h / 2, d.z], yaw: d.yaw, h: [(e.a1 - e.a0) / 2, e.h / 2, e.boy / n / 2 + 0.05] });
  }
  return l;
});
export function engeleIsin(o, d, enCok = Infinity) {
  let en = enCok;
  for (const k of ENGEL_KUTU) en = Math.min(en, isinKutu(o, d, k.c, k.yaw, k.h, en));
  return en;
}
/** Işın pist zeminine (yaklaşık: başlangıç noktasının pist yüksekliği) ne zaman iner. */
export function zemineIsin(o, d, s, enCok = Infinity) {
  if (d[1] >= -1e-4) return enCok;
  const y = pistNoktasi(s).y; return Math.min(enCok, Math.max(0, (o[1] - y) / -d[1]));
}
/** Işın parçası (0…t) bir kürenin (merkez c, yarıçap r) içinden geçiyor mu? */
export function kuredenGecer(o, d, t, c, r) {
  const rx = c[0] - o[0], ry = c[1] - o[1], rz = c[2] - o[2], k = Math.max(0, Math.min(t, rx * d[0] + ry * d[1] + rz * d[2]));
  return (rx - d[0] * k) ** 2 + (ry - d[1] * k) ** 2 + (rz - d[2] * k) ** 2 < r * r;
}
