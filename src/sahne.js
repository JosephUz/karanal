// Üç boyutlu görünüm: Kara Nal mağarası (pist zemini, çitler, kaya duvarlar, kontrol kapıları, tribün, köprü,
// şelale, maden tüneli, fenerler), biniciler ve efektler. Kalıcı süslerin hepsi birkaç birleşik ağda toplanır.
import * as T from 'three';
import { P, L, pistNoktasi, noktalar, sinir, dunya, ENGELLER, KUTU_YERLERI } from './pist.js';
import { MAC, SAVUNMA } from './ayar.js';
import { biniciModeli } from './karakter.js';
import { t } from './dil.js';

/** Basit karma: aynı girdiye hep aynı 0…1. */
const karma = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

/** Kutu yığını: dönük (yaw) kutuları tek geometride toplar; yüzler yöne göre gölgelenir. */
class Yigin {
  constructor() { this.p = []; this.n = []; this.c = []; this.i = []; }
  kutu(cx, cy, cz, sx, sy, sz, renk, yaw = 0, ton = 1) {
    const col = new T.Color(renk).multiplyScalar(ton), co = Math.cos(yaw), si = Math.sin(yaw);
    const don = (x, z) => [cx + x * co + z * si, cz - x * si + z * co];
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const YUZ = [[[1, 0, 0], 0.86], [[-1, 0, 0], 0.8], [[0, 1, 0], 1.0], [[0, -1, 0], 0.55], [[0, 0, 1], 0.92], [[0, 0, -1], 0.84]];
    for (const [[nx, ny, nz], g] of YUZ) {
      const v = nx ? [[nx * hx, -hy, -hz], [nx * hx, hy, -hz], [nx * hx, hy, hz], [nx * hx, -hy, hz]]
        : ny ? [[-hx, ny * hy, -hz], [hx, ny * hy, -hz], [hx, ny * hy, hz], [-hx, ny * hy, hz]]
          : [[-hx, -hy, nz * hz], [hx, -hy, nz * hz], [hx, hy, nz * hz], [-hx, hy, nz * hz]];
      const b = this.p.length / 3, [nwx, nwz] = [nx * co + nz * si, -nx * si + nz * co];
      for (const [x, y, z] of v) { const [wx, wz] = don(x, z); this.p.push(wx, cy + y, wz); this.n.push(nwx, ny, nwz); this.c.push(col.r * g, col.g * g, col.b * g); }
      const e1 = v[1].map((t, k) => t - v[0][k]), e2 = v[2].map((t, k) => t - v[0][k]);
      const cxp = e1[1] * e2[2] - e1[2] * e2[1], cyp = e1[2] * e2[0] - e1[0] * e2[2], czp = e1[0] * e2[1] - e1[1] * e2[0];
      if (cxp * nx + cyp * ny + czp * nz > 0) this.i.push(b, b + 1, b + 2, b, b + 2, b + 3); else this.i.push(b, b + 2, b + 1, b, b + 3, b + 2);
    }
  }
  /** Yatay dörtgen (zemin): dört köşe [x, y, z], saat yönünün tersi yukarı bakar. */
  dortgen(a, b, c, d, renk) {
    const col = new T.Color(renk), k = this.p.length / 3;
    for (const q of [a, b, c, d]) { this.p.push(...q); this.n.push(0, 1, 0); this.c.push(col.r, col.g, col.b); }
    this.i.push(k, k + 1, k + 2, k, k + 2, k + 3, k, k + 2, k + 1, k, k + 3, k + 2); // iki yüzlü
  }
  ag(malzeme) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3)); g.setIndex(this.i);
    return new T.Mesh(g, malzeme);
  }
}

/** Tuvalden yazı dokusu (tabelalar). */
function yaziDokusu(cizer, w = 512, h = 256) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; cizer(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}
function tahta(ctx, w, h) {
  ctx.fillStyle = '#5b3d22'; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += h / 4) { ctx.fillStyle = y / (h / 4) % 2 ? '#654428' : '#553820'; ctx.fillRect(0, y, w, h / 4 - 3); }
  ctx.strokeStyle = '#2a1a0e'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, w - 10, h - 10);
}
function nal(ctx, x, y, r) { ctx.strokeStyle = '#2a1a0e'; ctx.lineWidth = r * 0.32; ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.8, Math.PI * 2.2); ctx.stroke(); }

export class Gorunum {
  constructor(tuval) {
    this.r = new T.WebGLRenderer({ canvas: tuval, antialias: true, powerPreference: 'high-performance' });
    this.r.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.r.shadowMap.enabled = true; this.r.shadowMap.type = T.PCFSoftShadowMap;
    this.r.outputColorSpace = T.SRGBColorSpace; this.r.toneMapping = T.ACESFilmicToneMapping; this.r.toneMappingExposure = 1.5;
    this.sahne = new T.Scene();
    this.sahne.background = new T.Color('#1c120b'); this.sahne.fog = new T.Fog('#1f140c', 40, 170);
    this.kamera = new T.PerspectiveCamera(70, 1, 0.1, 400); this.fov = 70;
    this.sahne.add(new T.HemisphereLight('#e0bb8e', '#4a3220', 2.3));
    // Gölge veren tek ışık: yukarıdan, oyuncuyu izler (gölge alanı küçük kalsın)
    const g = new T.DirectionalLight('#ffd7a0', 1.6); g.castShadow = true; g.shadow.mapSize.set(2048, 2048);
    Object.assign(g.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 120 }); g.shadow.bias = -0.0006; g.shadow.normalBias = 0.04;
    this.sahne.add(g, g.target); this.isik = g;
    this.oyuncular = new Map(); this.efektler = []; this.titrek = [];
    // Işık sayısı hiç değişmez: değişirse bütün malzemeler yeniden derlenir ve oyun takılır. Patlamalar bu havuzdan ışık alır.
    this.patlamaIsik = [0, 1, 2].map(() => { const l = new T.PointLight('#ffb060', 0, 22); this.sahne.add(l); return { l, t: 1 }; }); this.patlamaNo = 0;
    this.toprak = new Parcalar(this.sahne, 700, new T.MeshLambertMaterial()); this.kivilcimlar = new Parcalar(this.sahne, 400, new T.MeshBasicMaterial());
    this.dunyaKur();
    this.isit();
  }

  /**
   * Isınma: oyunda sonradan çıkan her şeyin (ganimet, mayın, çivi, duman, dinamit, patlama, mermi, binici) gölgelendiricisi
   * açılışta derlenir; yoksa ilk görüldüğü karede oyun takılır.
   */
  isit() {
    const uzak = -500, v = new T.Vector3(0, uzak, 0);
    this.dunyaGuncelle({ k: [], g: [[1, 0, uzak, 0]], m: [[1, 0, uzak, 0, 1]], c: [[1, 0, 0]], d: [[1, 0, uzak, 0, 5]], n: [[1, 0, uzak, 0]] }, 0);
    this.patlama(v, 3); this.mermiUcur(v, new T.Vector3(1, uzak, 0)); this.kivilcim(v); this.toz(0, uzak, 0, 0, 10);
    const b = biniciModeli({ model: 'gezgin' }, ['#8a5a32', '#3a2618']); b.silah(0); b.grup.position.y = uzak; this.sahne.add(b.grup); b.vuruldu();
    try { this.r.compile(this.sahne, this.kamera); } catch { /* derleme sonra yapılır */ }
    this.sahne.remove(b.grup);
    this.dunyaGuncelle({ k: [], g: [], m: [], c: [], d: [], n: [] }, 0);
  }

  dunyaKur() {
    const zem = new Yigin(), tas = new Yigin(), ahsap = new Yigin(), parlak = new Yigin();
    const [x0, z0, x1, z1] = sinir(), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    const disSag = new Int8Array(P.N); // pistin sağı döngünün dışı mı (tribün o yana kurulur)
    for (let i = 0; i < P.N; i++) disSag[i] = (P.x[i] - mx) * -P.tz[i] + (P.z[i] - mz) * P.tx[i] > 0 ? 1 : -1;
    const nokta = (i, yanal, dy = 0) => { i = ((i % P.N) + P.N) % P.N; return [P.x[i] - P.tz[i] * yanal, P.y[i] + dy, P.z[i] + P.tx[i] * yanal]; };
    const yawAt = i => Math.atan2(-P.tx[i], -P.tz[i]);
    const kopru = i => P.b[((i % P.N) + P.N) % P.N] === 'kopru';
    for (let i = 0; i < P.N; i++) {
      const j = (i + 1) % P.N, w0 = P.w[i] / 2, w1 = P.w[j] / 2, yaw = yawAt(i), br = P.b[i];
      // Zemin: enine 1,5 blokluk hücreler; köprüde enine tahta
      const n = Math.ceil(P.w[i] / 1.5);
      for (let k = 0; k < n; k++) {
        const a0 = -w0 + 2 * w0 * k / n, a1 = -w0 + 2 * w0 * (k + 1) / n, b0 = -w1 + 2 * w1 * k / n, b1 = -w1 + 2 * w1 * (k + 1) / n;
        const h = karma(i, k), orta = Math.abs((k + 0.5) / n - 0.5);
        const renk = br === 'kopru' ? (i % 2 ? '#6e4c2c' : '#5f4026') : new T.Color(orta < 0.3 ? '#7d5a38' : '#6f4f31').multiplyScalar(0.86 + h * 0.22).getStyle();
        zem.dortgen(nokta(i, a0), nokta(j, b0), nokta(j, b1), nokta(i, a1), renk);
      }
      // Çitin dışı: kaya kenar (köprüde yok, uçurum)
      if (br !== 'kopru') for (const s of [-1, 1]) {
        zem.dortgen(nokta(i, s * w0, -0.02), nokta(j, s * w1, -0.02), nokta(j, s * (w1 + 14), -0.4), nokta(i, s * (w0 + 14), -0.4), new T.Color('#3a312a').multiplyScalar(0.8 + karma(i, s) * 0.3).getStyle());
      } else for (const s of [-1, 1]) { // köprü kenar kirişi
        const [x, y, z] = nokta(i, s * (w0 + 0.1), -0.35); ahsap.kutu(x, y, z, 0.3, 0.6, 1.05, '#4a3020', yaw);
      }
      // Çit: 3 blokta bir direk, aralarına iki kat parmaklık
      if (i % 3 === 0) for (const s of [-1, 1]) {
        const k2 = (i + 3) % P.N, [x, y, z] = nokta(i, s * (w0 + 0.15), 0.7), [xb, , zb] = nokta(k2, s * (P.w[k2] / 2 + 0.15));
        ahsap.kutu(x, y, z, 0.24, 1.4, 0.24, '#5e3f24', yaw, 0.9 + karma(i, s) * 0.2);
        const mxr = (x + xb) / 2, mzr = (z + zb) / 2, uz = Math.hypot(xb - x, zb - z), ry = Math.atan2(-(xb - x), -(zb - z));
        for (const yy of [0.55, 1.15]) ahsap.kutu(mxr, P.y[i] + yy, mzr, 0.1, 0.14, uz + 0.1, '#7a5232', ry);
        if (kopru(i)) { const [ax, ay, az] = nokta(i, s * (w0 + 0.15), -12); ahsap.kutu(ax, ay, az, 0.5, 24, 0.5, '#3b2818', yaw); } // köprü ayağı
      }
      // Fener: 15 blokta bir, sırayla iki yanda; direğin tepesinde parlak kutu
      if (i % 15 === 0) {
        const s = (i / 15) % 2 ? 1 : -1, [x, y, z] = nokta(i, s * (w0 + 0.15), 1.62);
        ahsap.kutu(x, y - 0.12, z, 0.3, 0.06, 0.3, '#2a1d12', yaw); parlak.kutu(x, y + 0.08, z, 0.22, 0.3, 0.22, '#ffb24a', yaw); ahsap.kutu(x, y + 0.27, z, 0.3, 0.06, 0.3, '#2a1d12', yaw);
      }
      // Kaya duvarlar: köprüde uzakta, başka yerde çitin 5–10 blok dışında; dikilmiş kutu sütunlar
      if (i % 3 === 0) for (const s of [-1, 1]) {
        const uzak = kopru(i) ? 34 + karma(i, s + 4) * 10 : 6 + karma(i, s + 2) * 5, H = 9 + karma(i, s + 7) * 18;
        const [x, , z] = nokta(i, s * (w0 + uzak + 2)), y = P.y[i] + (kopru(i) ? -20 : 0);
        tas.kutu(x, y + H / 2, z, 4.2 + karma(i, 9) * 2, H + (kopru(i) ? 30 : 0), 4.2 + karma(i, 8) * 2, '#3a3029', yaw + karma(i, s) * 0.3, 0.7 + karma(i, s + 1) * 0.45);
        if (karma(i, s + 11) < 0.35 && !kopru(i)) { const [bx, , bz] = nokta(i, s * (w0 + 2.5 + karma(i, 3) * 2)); tas.kutu(bx, P.y[i] + 0.5, bz, 1.4, 1 + karma(i, 4), 1.3, '#4a3f36', karma(i, 5) * 3, 0.85); }
      }
      // Tünel: 8 blokta bir maden desteği (iki direk + kiriş + asılı fener), üstünde alçak tavan
      if (br === 'tunel' && i % 8 === 0) {
        for (const s of [-1, 1]) { const [x, y, z] = nokta(i, s * (w0 + 0.7), 3.6); ahsap.kutu(x, y, z, 0.45, 7.2, 0.45, '#5a3c22', yaw); }
        const [x, y, z] = nokta(i, 0, 7.2); ahsap.kutu(x, y, z, P.w[i] + 2.4, 0.5, 0.5, '#5a3c22', yaw);
        tas.kutu(x, y + 2.5, z, P.w[i] + 9, 4.5, 8.4, '#2f2722', yaw, 0.8 + karma(i, 1) * 0.2);
        if (i % 16 === 0) { ahsap.kutu(x, y - 0.6, z, 0.04, 0.7, 0.04, '#222', yaw); parlak.kutu(x, y - 1.05, z, 0.26, 0.32, 0.26, '#ffb24a', yaw); }
      }
      // Sarkıtlar: tavandan inen kaya kutuları
      if (i % 7 === 0 && br !== 'tunel') { const yan = (karma(i, 21) - 0.5) * (P.w[i] + 30), [x, , z] = nokta(i, yan), H = 3 + karma(i, 22) * 8; tas.kutu(x, P.y[i] + 26 - H / 2, z, 1.6, H, 1.6, '#2c241f', karma(i, 23) * 3, 0.9); }
    }
    // Tavan: koyu kaya
    tas.kutu(mx, 27, mz, x1 - x0 + 120, 2, z1 - z0 + 120, '#1d1612');
    // Köprünün altı: uçurum dibi
    tas.kutu(mx, -42, mz, x1 - x0 + 120, 2, z1 - z0 + 120, '#0f0b08');

    // Tribün: Tribün Düzlüğü'nde dış yanda 5 basamak, üstlerinde seyirci
    const seyirci = new Yigin(), RENK = ['#2f3b4c', '#7a2a1c', '#3f6a45', '#5a4a7a', '#8a6a3a', '#3a3330', '#6a3a2a', '#2a4a5a'], TEN = ['#f3d0ad', '#e2b083', '#c98f5f', '#9c6641'];
    for (let i = 0; i < P.N; i++) {
      if (P.b[i] !== 'tribun' || P.b[(i + 4) % P.N] !== 'tribun' || P.b[(i - 4 + P.N) % P.N] !== 'tribun') continue;
      const s = disSag[i], w0 = P.w[i] / 2, yaw = yawAt(i);
      for (let k = 0; k < 6; k++) {
        const [x, y, z] = nokta(i, s * (w0 + 2.2 + k * 1.7), k * 1.1 / 2);
        tas.kutu(x, y, z, 1.9, k * 1.1 + 0.4, 1.12, '#4a3a2c', yaw, 0.85 + (k % 2) * 0.1);
        if (k > 0 && karma(i, k) < 0.78) {
          const h = karma(i, k + 30), bx = x, by = P.y[i] + k * 1.1 + 0.2, kiyafet = RENK[Math.floor(h * RENK.length)], ten = TEN[Math.floor(karma(i, k + 40) * TEN.length)];
          seyirci.kutu(bx, by + 0.45, z, 0.5, 0.7, 0.32, kiyafet, yaw + s * Math.PI / 2);
          seyirci.kutu(bx, by + 1.0, z, 0.36, 0.36, 0.36, ten, yaw);
          if (karma(i, k + 50) < 0.6) { seyirci.kutu(bx, by + 1.22, z, 0.56, 0.04, 0.56, '#2a1d12', yaw); seyirci.kutu(bx, by + 1.32, z, 0.34, 0.18, 0.34, '#2a1d12', yaw); }
          if (karma(i, k + 60) < 0.3) seyirci.kutu(bx, by + 1.0, z, 0.12, 0.2, 0.7, '#ede4cf', yaw + s * 0.3); // bahis kâğıdı sallar
        }
      }
      if (i % 4 === 0) { const [x, y, z] = nokta(i, s * (w0 + 2.2 + 6 * 1.7), 7.4); ahsap.kutu(x, y, z, 0.3, 0.3, 4, '#5a3c22', yaw); for (const o of [-1, 1]) { const [px, py, pz] = nokta(i + o * 2, s * (w0 + 2.2 + 6 * 1.7), 4.3); ahsap.kutu(px, py, pz, 0.35, 8.6, 0.35, '#4a3020', yaw); } }
    }

    const vc = new T.MeshLambertMaterial({ vertexColors: true });
    for (const [y, golge] of [[zem, false], [tas, true], [ahsap, true], [seyirci, true]]) { const m = y.ag(vc); m.receiveShadow = true; m.castShadow = golge; this.sahne.add(m); }
    this.sahne.add(parlak.ag(new T.MeshBasicMaterial({ vertexColors: true })));
    this.kapilarKur(disSag, nokta, yawAt);
    this.engellerKur(); this.kutularKur();
    this.selaleKur(disSag, nokta);
  }

  /** Kontrol kapıları: taş sütunlar, kiriş, numaralı tabela, bayraklar, fener ışığı. 0. kapı KARA NAL tabelası. */
  kapilarKur(disSag, nokta, yawAt) {
    const tas = new Yigin(), kumas = new Yigin();
    noktalar(MAC.noktaSayisi).forEach((s, no) => {
      const i = Math.round(s / P.ad) % P.N, w0 = P.w[i] / 2, yaw = yawAt(i), H = no === 0 ? 10 : 8;
      for (const k of [-1, 1]) {
        const [x, y, z] = nokta(i, k * (w0 + 1.3), H / 2); tas.kutu(x, y, z, 1.3, H, 1.3, '#5a4c40', yaw);
        const [bx, by, bz] = nokta(i, k * (w0 + 1.3), H - 3.2); kumas.kutu(bx, by, bz, 0.9, 3.2, 1.4, '#8a2418', yaw);
      }
      { const isik = new T.PointLight('#ffae55', 42, 40, 1.5), [lx, ly, lz] = nokta(i, 0, H - 1.6); isik.position.set(lx, ly, lz); this.sahne.add(isik); this.titrek.push({ isik, t: no * 1.7, g: 42 }); }
      const [x, y, z] = nokta(i, 0, H + 0.2); tas.kutu(x, y, z, P.w[i] + 4.2, 0.9, 1.1, '#4e4136', yaw);
      const tabelaW = no === 0 ? 13 : 3.2, tabelaH = no === 0 ? 2.6 : 2.2;
      const doku = no === 0
        ? yaziDokusu((c, w, h) => { tahta(c, w, h); c.fillStyle = '#1d140c'; c.font = 'bold 150px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('KARA NAL', w / 2, h / 2 + 8); nal(c, 70, h / 2 - 6, 34); nal(c, w - 70, h / 2 - 6, 34); }, 1280, 256)
        : yaziDokusu((c, w, h) => { tahta(c, w, h); c.fillStyle = '#1d140c'; c.font = 'bold 170px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(no), w / 2, h / 2 + 10); }, 256, 256);
      const tabela = new T.Mesh(new T.BoxGeometry(tabelaW, tabelaH, 0.25), [0, 1, 2, 3].map(() => new T.MeshLambertMaterial({ color: '#4a3020' })).concat([new T.MeshLambertMaterial({ map: doku }), new T.MeshLambertMaterial({ map: doku })]));
      tabela.position.set(x, y - 0.3 - tabelaH / 2, z); tabela.rotation.y = yaw + Math.PI; tabela.castShadow = true; this.sahne.add(tabela);
      if (no === 0) this.bahisKur(i, disSag[i], nokta, yaw);
    });
    const vc = new T.MeshLambertMaterial({ vertexColors: true });
    for (const y of [tas, kumas]) { const m = y.ag(vc); m.castShadow = true; m.receiveShadow = true; this.sahne.add(m); }
  }

  /** BAHİS tahtası: başlangıç kapısının yanında, tribünün önünde (süs; bahis Juland'a girerken gelecek). */
  bahisKur(i, s, nokta, yaw) {
    const k = (i + 14) % P.N, [x, y, z] = nokta(k, s * (P.w[k] / 2 + 1.1), 3.2);
    const doku = yaziDokusu((c, w, h) => {
      tahta(c, w, h); c.fillStyle = '#efe2c2'; c.font = 'bold 74px Georgia, serif'; c.textAlign = 'center'; c.fillText(t('sahne.bahis'), w / 2, 92);
      const ORAN = ['2.1', '3.4', '4.0', '5.6', '8.3'], RENK = ['#c7442f', '#3d6fd6', '#e8c547', '#3f9a55', '#ece6d6'];
      ORAN.forEach((o, n) => { const yy = 140 + n * 66; c.fillStyle = '#161210'; c.fillRect(60, yy, w - 120, 54); c.fillStyle = RENK[n]; c.fillRect(70, yy + 6, 44, 42); c.fillStyle = '#111'; c.font = 'bold 34px system-ui'; c.fillText(String(n + 1), 92, yy + 40); c.fillStyle = '#efe2c2'; c.textAlign = 'right'; c.fillText(o, w - 80, yy + 40); c.textAlign = 'center'; });
    }, 512, 512);
    const m = new T.Mesh(new T.BoxGeometry(3.4, 3.4, 0.2), [0, 1, 2, 3].map(() => new T.MeshLambertMaterial({ color: '#4a3020' })).concat([new T.MeshLambertMaterial({ map: doku }), new T.MeshLambertMaterial({ map: doku })]));
    m.position.set(x, y + 0.6, z); m.rotation.y = yaw + s * Math.PI / 2 + Math.PI; this.sahne.add(m);
    const isik = new T.PointLight('#ffb060', 14, 14, 1.6); isik.position.set(x, y + 3, z); this.sahne.add(isik);
  }

  /** Şelale: Şelale Geçidi'nin dış yanında kayadan dökülen su (kayan doku) ve gölet. */
  selaleKur(disSag, nokta) {
    const orta = [...P.b.keys()].filter(i => P.b[i] === 'selale'); if (!orta.length) return;
    const i = orta[Math.floor(orta.length / 2)], s = disSag[i], yaw = Math.atan2(-P.tx[i], -P.tz[i]);
    const doku = yaziDokusu((c, w, h) => { c.fillStyle = '#5d8fb0'; c.fillRect(0, 0, w, h); for (let k = 0; k < 140; k++) { c.fillStyle = `rgba(230,245,255,${0.2 + Math.random() * 0.5})`; c.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 6, 20 + Math.random() * 60); } }, 128, 256);
    doku.wrapS = doku.wrapT = T.RepeatWrapping; doku.repeat.set(3, 2); this.suDoku = doku;
    const [x, y, z] = nokta(i, s * (P.w[i] / 2 + 9), 11);
    const su = new T.Mesh(new T.BoxGeometry(14, 24, 1.2), new T.MeshBasicMaterial({ map: doku, transparent: true, opacity: 0.85 }));
    su.position.set(x, y, z); su.rotation.y = yaw; this.sahne.add(su);
    const [gx, gy, gz] = nokta(i, s * (P.w[i] / 2 + 5), -0.25);
    const golet = new T.Mesh(new T.BoxGeometry(16, 0.3, 8), new T.MeshLambertMaterial({ color: '#3f7090', transparent: true, opacity: 0.85 }));
    golet.position.set(gx, gy, gz); golet.rotation.y = yaw; this.sahne.add(golet);
    const isik = new T.PointLight('#7fc4ff', 18, 30, 1.5); isik.position.set(gx, gy + 4, gz); this.sahne.add(isik);
  }

  /** Engeller: kaya ada, ahşap barikat, devrik maden vagonu. */
  engellerKur() {
    const y = new Yigin();
    for (const e of ENGELLER) {
      const n = Math.max(1, Math.ceil(e.boy / 1.2));
      if (e.tur === 'ada') for (let k = 0; k < n; k++) {
        const s = e.s0 + (k + 0.5) * e.boy / n, d = dunya(s, (e.a0 + e.a1) / 2), en = e.a1 - e.a0;
        const h = e.h * (0.8 + karma(k, 3) * 0.5), ust = k === 0 || k === n - 1 ? 0.6 : 1;
        y.kutu(d.x, d.y + h * ust / 2, d.z, en * (0.85 + karma(k, 1) * 0.3), h * ust, e.boy / n + 0.3, '#4d4138', d.yaw + karma(k, 2) * 0.2, 0.75 + karma(k, 5) * 0.35);
        if (k % 3 === 1) y.kutu(d.x, d.y + h * ust + 0.4, d.z, en * 0.5, 0.8, 1.2, '#3e5a34', d.yaw, 0.9); // yosun
      }
      const orta = dunya(e.s0 + e.boy / 2, (e.a0 + e.a1) / 2), en = e.a1 - e.a0, co = Math.cos(orta.yaw), si = Math.sin(orta.yaw);
      const yan = a => [orta.x + co * a, orta.z - si * a];
      if (e.tur === 'cit') {
        const adim = en / Math.max(1, Math.round(en / 1.6));
        for (let a = -en / 2; a <= en / 2 + 0.01; a += adim) { const [x, z] = yan(a); y.kutu(x, orta.y + e.h / 2, z, 0.22, e.h + 0.15, 0.22, '#4a3020', orta.yaw); }
        for (const h of [0.35, 0.75]) y.kutu(orta.x, orta.y + h * e.h, orta.z, en, 0.18, 0.12, '#7a5232', orta.yaw, 0.9 + h * 0.1);
        for (let a = -en / 2 + 0.8; a < en / 2; a += 1.6) { const [x, z] = yan(a); y.kutu(x, orta.y + e.h * 0.55, z, 0.12, 0.12, 0.14, '#c7442f', orta.yaw); }
      } else if (e.tur === 'vagon') {
        // Devrik maden vagonu: yan yatmış kasa, tekerlekler yana bakar, döküntü kömür
        y.kutu(orta.x, orta.y + e.h / 2, orta.z, en, e.h, e.boy, '#5b5550', orta.yaw, 0.95);
        y.kutu(orta.x, orta.y + e.h / 2, orta.z, en + 0.06, e.h * 0.2, e.boy + 0.06, '#3b3632', orta.yaw);
        for (const [a, b] of [[-0.6, -0.8], [-0.6, 0.8], [0.6, -0.8], [0.6, 0.8]]) {
          const w = e.boy / 2 * b, ax = orta.x + co * (en / 2 + 0.1) + si * w, az = orta.z - si * (en / 2 + 0.1) + co * w;
          y.kutu(ax, orta.y + e.h / 2 + a * 0.5, az, 0.16, 0.5, 0.5, '#24211f', orta.yaw);
        }
        for (let k = 0; k < 5; k++) { const [x, z] = yan(-(en / 2 + 0.6 + karma(k, 7))); y.kutu(x + si * (karma(k, 8) - 0.5) * 2, orta.y + 0.15, z + co * (karma(k, 8) - 0.5) * 2, 0.4, 0.3, 0.4, '#1d1a18', karma(k, 9) * 3); }
      }
    }
    const m = y.ag(new T.MeshLambertMaterial({ vertexColors: true })); m.castShadow = m.receiveShadow = true; this.sahne.add(m);
  }

  /** Silah kutuları: kırmızı (saldırı) ve mavi (savunma) sandık, üstünde süzülen işaret. */
  kutularKur() {
    const sandik = (renk, serit) => {
      const g = new T.Group(), y = new Yigin();
      y.kutu(0, 0.45, 0, 0.9, 0.9, 0.9, '#6b4a2b'); for (const a of [-0.3, 0.3]) y.kutu(a, 0.45, 0, 0.14, 0.92, 0.92, serit); y.kutu(0, 0.45, 0, 0.92, 0.2, 0.92, renk);
      g.add(y.ag(new T.MeshLambertMaterial({ vertexColors: true })));
      const isaret = new T.Mesh(new T.OctahedronGeometry(0.22, 0), new T.MeshBasicMaterial({ color: renk })); isaret.position.y = 1.5; g.add(isaret); g.userData.isaret = isaret;
      return g;
    };
    this.kutular = KUTU_YERLERI.map(k => {
      const d = dunya(k.s, k.yanal), g = sandik(k.tur === 'kirmizi' ? '#d4402a' : '#3a7fd6', k.tur === 'kirmizi' ? '#8a2418' : '#1f4a86');
      g.position.set(d.x, d.y, d.z); g.rotation.y = d.yaw; g.traverse(m => { m.castShadow = true; }); this.sahne.add(g); return g;
    });
    this.dinamik = new Map(); // ganimet, mayın, çivi, duman, dinamit: tür+id → nesne
  }
  /** Anlık görüntüdeki dünyayı göster: kapalı kutular, ganimet, mayın, çivi, duman, dinamit. */
  dunyaGuncelle(sn, zaman) {
    const kapali = new Set(sn.k);
    this.kutular.forEach((g, i) => { g.visible = !kapali.has(i); const k = g.userData.isaret; k.rotation.y = zaman * 2 + i; k.position.y = 1.5 + Math.sin(zaman * 2.5 + i) * 0.12; });
    const var_ = new Set();
    const tut = (anahtar, kur, guncelle) => { var_.add(anahtar); let n = this.dinamik.get(anahtar); if (!n) { n = kur(); this.sahne.add(n); this.dinamik.set(anahtar, n); } guncelle?.(n); };
    for (const [id, x, y, z] of sn.g) tut('g' + id, () => {
      const g = new T.Group(), yy = new Yigin(); yy.kutu(0, 0.3, 0, 0.6, 0.55, 0.45, '#7a5230'); yy.kutu(0, 0.62, 0, 0.3, 0.12, 0.25, '#4a3020'); yy.kutu(0, 0.3, 0, 0.62, 0.08, 0.47, '#e0a54a');
      g.add(yy.ag(new T.MeshLambertMaterial({ vertexColors: true })));
      const p = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 0.04, 16), new T.MeshBasicMaterial({ color: '#ffcf5a', transparent: true, opacity: 0.35 })); p.position.y = 0.03; g.add(p);
      g.position.set(x, y, z); return g;
    }, n => { n.rotation.y = zaman * 1.5; });
    for (const [id, x, y, z, hazir] of sn.m) tut('m' + id, () => {
      const g = new T.Group(), d = new T.Mesh(new T.CylinderGeometry(0.42, 0.48, 0.16, 10), new T.MeshLambertMaterial({ color: '#2b2622' })); d.position.y = 0.08; g.add(d);
      const l = new T.Mesh(new T.BoxGeometry(0.12, 0.08, 0.12), new T.MeshBasicMaterial({ color: '#ff3b20' })); l.position.y = 0.2; g.add(l); g.userData.l = l;
      g.position.set(x, y, z); return g;
    }, n => { n.userData.l.visible = !!hazir && Math.floor(zaman * 3) % 2 === 0; });
    for (const [id, s, yanal] of sn.c) tut('c' + id, () => {
      const V = SAVUNMA.find(v => v.id === 'civi'), d = dunya(s, yanal), y = new Yigin();
      for (let i = 0; i < 46; i++) y.kutu((karma(id, i) - 0.5) * V.en, 0.08, (karma(i, id + 3) - 0.5) * V.boy, 0.07, 0.16, 0.07, i % 3 ? '#9aa0a6' : '#6b7076', karma(i, 1) * 3);
      const m = y.ag(new T.MeshLambertMaterial({ vertexColors: true })); m.position.set(d.x, d.y, d.z); m.rotation.y = d.yaw; return m;
    });
    for (const [id, x, y, z, kalan] of sn.d) tut('d' + id, () => {
      const g = new T.Group(), V = SAVUNMA.find(v => v.id === 'duman');
      for (let i = 0; i < 26; i++) {
        const b = new T.Mesh(pufGeo, new T.MeshLambertMaterial({ color: i % 3 ? '#8a847b' : '#a59f95', transparent: true, opacity: 0.5, depthWrite: false }));
        const a = i / 26 * Math.PI * 2 * 3, r = Math.sqrt(karma(id, i)) * V.alan * 0.85; b.position.set(Math.cos(a) * r, (karma(i, id) - 0.35) * 3.2, Math.sin(a) * r); b.userData.r = 1.3 + karma(i, 2) * 1.4; g.add(b);
      }
      g.position.set(x, y, z); g.userData.bas = zaman; return g;
    }, n => { const yas = zaman - n.userData.bas; for (const b of n.children) { b.scale.setScalar(b.userData.r * Math.min(1, 0.3 + yas * 1.5)); b.material.opacity = Math.min(0.5, kalan * 0.25); b.position.y += 0.15 * (1 / 60); } });
    for (const [id, x, y, z] of sn.n) tut('n' + id, () => {
      const g = new T.Group(), c = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.45, 8), new T.MeshLambertMaterial({ color: '#b8322a' })); c.rotation.z = Math.PI / 2; g.add(c);
      const k = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 0.1), new T.MeshBasicMaterial({ color: '#ffd76a' })); k.position.x = 0.27; g.add(k); g.userData.k = k; return g;
    }, n => { n.position.set(x, y, z); n.rotation.y = zaman * 9; n.userData.k.scale.setScalar(0.6 + Math.random() * 0.9); });
    for (const [k, n] of this.dinamik) if (!var_.has(k)) { this.sahne.remove(n); this.dinamik.delete(k); }
  }

  boyut(w, h) { this.r.setSize(w, h, false); this.kamera.aspect = w / h; this.kamera.updateProjectionMatrix(); }

  // ——— Biniciler ———
  oyuncuKur(id, avatar, atRenk) {
    this.oyuncuSil(id);
    const k = biniciModeli(avatar, atRenk); this.sahne.add(k.grup);
    const v = { k, x: 0, y: 0, z: 0, yaw: 0, hiz: 0, canli: true, tozT: 0, bit: 0 };
    this.oyuncular.set(id, v); return v;
  }
  oyuncuSil(id) { const v = this.oyuncular.get(id); if (v) { this.sahne.remove(v.k.grup); this.oyuncular.delete(id); } }
  /** p: [x, y, z, yaw, bakis, pitch, bit, hiz, silah]. */
  oyuncuGuncelle(id, p, dt) {
    const v = this.oyuncular.get(id); if (!v) return;
    const [x, y, z, yaw, bakis, pitch, bit, hiz, silah = -1] = p;
    v.x = x; v.y = y; v.z = z; v.yaw = yaw; v.bit = bit; v.canli = !!(bit & 1); v.hiz += (hiz - v.hiz) * Math.min(1, dt * 10);
    v.k.grup.position.set(x, y, z); v.k.grup.rotation.y = yaw;
    v.k.silah(silah); v.k.ekler(bit);
    // Doğuş koruması: yanıp söner
    v.k.grup.visible = !(bit & 16) || Math.floor(performance.now() / 110) % 2 === 0;
    v.k.guncelle(dt, v.hiz, bakis - yaw, pitch, bit);
    // Toynak tozu: hızlı koşarken arkada toprak kırıntıları (mahmuzda bol)
    if ((bit & 1) && (bit & 2) && v.hiz > 6 && (v.tozT -= dt) <= 0) { v.tozT = (bit & 128) ? 0.025 : 0.05 + (15 - Math.min(15, v.hiz)) * 0.012; this.toz(x + Math.sin(yaw) * 0.8, y + 0.1, z + Math.cos(yaw) * 0.8, yaw, v.hiz); }
  }

  // ——— Efektler ———
  efekt(nesne, sure, adim) { this.sahne.add(nesne); this.efektler.push({ nesne, t: 0, sure, adim }); }
  toz(x, y, z, yaw, hiz) {
    for (let k = 0; k < 2; k++) this.toprak.at(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6, Math.sin(yaw) * hiz * 0.15 + (Math.random() - 0.5) * 2, 1.5 + Math.random() * 2.5, Math.cos(yaw) * hiz * 0.15 + (Math.random() - 0.5) * 2, 0.08 + Math.random() * 0.12, Math.random() < 0.5 ? TOZ1 : TOZ2, 0.7, 14, y);
  }
  iz(a, b, renk = '#ffe9a8', kalin = 0.025) {
    const u = a.distanceTo(b); if (u < 0.1) return;
    const m = new T.Mesh(kucukKup, malzeme(renk, 0.55, false));
    m.position.copy(a).lerp(b, 0.5); m.scale.set(kalin, kalin, u); m.lookAt(b);
    this.efekt(m, 0.16, (o, t) => { o.scale.x = o.scale.y = kalin * (1 - t); });
  }
  /** Uçan mermi (görsel): namludan hedefe hiz blok/sn; vardığında vardi(). Hasar zaten anında hesaplanır. */
  mermiUcur(a, b, { renk = '#ffd27a', hiz = 170, kalin = 0.05, uzun = 1.1, iz = 0.22, vardi } = {}) {
    const u = a.distanceTo(b); if (u < 0.2) { vardi?.(); return; }
    const yon = b.clone().sub(a).normalize(), sure = u / hiz, L0 = Math.min(uzun, u);
    const m = new T.Mesh(kucukKup, malzeme(renk, 1, true));
    m.scale.set(kalin, kalin, L0); m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), yon);
    const bas = new T.Vector3(), uc = new T.Vector3(); let vardiMi = false;
    this.efekt(m, sure + 0.03, (o, t) => {
      const d = Math.min(u, (t * (sure + 0.03)) * hiz);
      uc.copy(a).addScaledVector(yon, d); bas.copy(a).addScaledVector(yon, Math.max(0, d - L0));
      o.position.copy(bas).lerp(uc, 0.5); o.scale.z = Math.max(0.05, uc.distanceTo(bas));
      if (d >= u && !vardiMi) { vardiMi = true; o.visible = false; vardi?.(); }
    });
    if (iz) this.iz(a, b, renk, kalin * iz);
  }
  kivilcim(p, renk = '#e8dcc0', sayi = 5) {
    const c = renkBul(renk);
    for (let i = 0; i < sayi; i++) this.kivilcimlar.at(p.x, p.y, p.z, (Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4, 0.06 + Math.random() * 0.06, c, 0.35, 12, -1e9);
  }
  kan(p) { this.kivilcim(p, '#b8322a', 6); }
  patlama(p, alan = 4) {
    const top = new T.Mesh(new T.IcosahedronGeometry(1, 1), new T.MeshBasicMaterial({ color: '#ffb347', transparent: true, depthWrite: false }));
    top.position.copy(p); this.efekt(top, 0.5, (o, t) => { o.scale.setScalar(0.5 + t * alan); o.material.opacity = 0.9 * (1 - t); o.material.color.setRGB(1, 0.7 - t * 0.4, 0.3 - t * 0.25); });
    const pi = this.patlamaIsik[this.patlamaNo++ % this.patlamaIsik.length]; pi.l.position.copy(p); pi.l.distance = alan * 4; pi.t = 0;
    this.kivilcim(p, '#3a3530', 12); this.kivilcim(p, '#ffcf6a', 10); this.kivilcim(p, '#6b4a2c', 10);
  }
  /** Kement ipi: atan ile bağlanan arasında sure boyunca gerili ip. ucA/ucB konum yazar (yoksa false). */
  ip(ucA, ucB, sure) {
    const m = new T.Mesh(kucukKup, new T.MeshLambertMaterial({ color: '#c9a66b' })), a = new T.Vector3(), b = new T.Vector3();
    this.efekt(m, sure, () => { if (!ucA(a) || !ucB(b)) { m.visible = false; return; } m.visible = true; m.position.copy(a).lerp(b, 0.5); m.scale.set(0.05, 0.05, a.distanceTo(b)); m.lookAt(b); });
  }

  cizim(dt, zaman, odak) {
    for (let i = this.efektler.length - 1; i >= 0; i--) {
      const e = this.efektler[i]; e.t += dt; const t = Math.min(1, e.t / e.sure); e.adim?.(e.nesne, t, dt);
      if (e.t >= e.sure) { this.sahne.remove(e.nesne); if (!e.nesne.material?.userData?.ortak) e.nesne.material?.dispose?.(); this.efektler.splice(i, 1); }
    }
    for (const f of this.titrek) f.isik.intensity = f.g * (0.85 + Math.sin(zaman * 9 + f.t) * 0.06 + Math.sin(zaman * 23 + f.t * 3) * 0.05);
    if (this.suDoku) this.suDoku.offset.y = (zaman * 1.6) % 1;
    this.toprak.adim(dt); this.kivilcimlar.adim(dt);
    for (const p of this.patlamaIsik) { p.t = Math.min(1, p.t + dt / 0.35); p.l.intensity = 60 * (1 - p.t); }
    if (odak) {
      // Işık uzayında gölge dokusunun adımına yuvarla: oyuncu hareket ederken gölge kenarları titremez
      const adim = 90 / 2048, sag = GOLGE_SAG, yuk = GOLGE_YUK, x = odak.x, y = odak.y, z = odak.z;
      const a = Math.round((x * sag.x + y * sag.y + z * sag.z) / adim) * adim, b = Math.round((x * yuk.x + y * yuk.y + z * yuk.z) / adim) * adim, c = x * GOLGE_YON.x + y * GOLGE_YON.y + z * GOLGE_YON.z;
      const mx = sag.x * a + yuk.x * b + GOLGE_YON.x * c, my = sag.y * a + yuk.y * b + GOLGE_YON.y * c, mz = sag.z * a + yuk.z * b + GOLGE_YON.z * c;
      this.isik.position.set(mx + 12, my + 50, mz + 8); this.isik.target.position.set(mx, my, mz); this.isik.target.updateMatrixWorld();
    }
    this.kamera.fov += (this.fov - this.kamera.fov) * Math.min(1, dt * 8); this.kamera.updateProjectionMatrix();
    this.r.render(this.sahne, this.kamera);
  }
}

const kucukKup = new T.BoxGeometry(1, 1, 1), pufGeo = new T.IcosahedronGeometry(1, 2);
// Gölge ışığının sabit yönü ve ışık uzayı eksenleri (ızgaraya oturtma için)
const GOLGE_YON = new T.Vector3(-12, -50, -8).normalize(), GOLGE_SAG = new T.Vector3().crossVectors(GOLGE_YON, new T.Vector3(0, 1, 0)).normalize(), GOLGE_YUK = new T.Vector3().crossVectors(GOLGE_SAG, GOLGE_YON).normalize();
const TOZ1 = new T.Color('#6b4a2c'), TOZ2 = new T.Color('#8a6440'), renkler = new Map(), malzemeler = new Map();
const renkBul = r => { if (!renkler.has(r)) renkler.set(r, new T.Color(r)); return renkler.get(r); };
/** Renk başına paylaşılan efekt malzemesi (her mermide yeni malzeme yaratılmaz). */
function malzeme(renk, opak, parlak) {
  const k = renk + opak + parlak;
  if (!malzemeler.has(k)) { const m = new T.MeshBasicMaterial({ color: renk, transparent: true, opacity: opak, depthWrite: false, blending: parlak ? T.AdditiveBlending : T.NormalBlending }); m.userData.ortak = true; malzemeler.set(k, m); }
  return malzemeler.get(k);
}
/** Parçacık havuzu: tek InstancedMesh; her parçacık hız, yerçekimi, ömür ve taban yüksekliğiyle uçar, sönerken küçülür. */
class Parcalar {
  constructor(sahne, n, mat) {
    this.n = n; this.m = new T.InstancedMesh(kucukKup, mat, n); this.m.frustumCulled = false;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.boy = new Float32Array(n); this.omur = new Float32Array(n).fill(1); this.yas = new Float32Array(n).fill(1); this.g = new Float32Array(n); this.taban = new Float32Array(n);
    this.sira = 0; this.d = new T.Object3D(); this.sifir = new T.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < n; i++) { this.m.setMatrixAt(i, this.sifir); this.m.setColorAt(i, TOZ1); }
    sahne.add(this.m);
  }
  at(x, y, z, vx, vy, vz, boy, renk, omur, g, taban) {
    const i = this.sira++ % this.n, k = i * 3;
    this.p[k] = x; this.p[k + 1] = y; this.p[k + 2] = z; this.v[k] = vx; this.v[k + 1] = vy; this.v[k + 2] = vz;
    this.boy[i] = boy; this.omur[i] = omur; this.yas[i] = 0; this.g[i] = g; this.taban[i] = taban;
    this.m.setColorAt(i, renk); this.m.instanceColor.needsUpdate = true;
  }
  adim(dt) {
    let degisti = false;
    for (let i = 0; i < this.n; i++) {
      if (this.yas[i] >= 1) continue;
      degisti = true; const k = i * 3;
      this.yas[i] += dt / this.omur[i];
      if (this.yas[i] >= 1) { this.m.setMatrixAt(i, this.sifir); continue; }
      this.v[k + 1] -= this.g[i] * dt; this.p[k] += this.v[k] * dt; this.p[k + 1] += this.v[k + 1] * dt; this.p[k + 2] += this.v[k + 2] * dt;
      if (this.p[k + 1] < this.taban[i]) { this.p[k + 1] = this.taban[i]; this.v[k] = this.v[k + 1] = this.v[k + 2] = 0; }
      this.d.position.set(this.p[k], this.p[k + 1], this.p[k + 2]); this.d.scale.setScalar(this.boy[i] * (1 - this.yas[i] * this.yas[i])); this.d.updateMatrix();
      this.m.setMatrixAt(i, this.d.matrix);
    }
    if (degisti) this.m.instanceMatrix.needsUpdate = true;
  }
}
export { L };
