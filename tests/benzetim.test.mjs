import test from 'node:test';
import assert from 'node:assert/strict';
import { P, L, pistNoktasi, yansit, dunya, sFark, ENGELLER, KUTU_YERLERI, engelde } from '../src/pist.js';
import { atDurumu, atAdim, atYerlestir } from '../src/at.js';
import { AT, GERI, MAC, SALDIRI_NO, SAVUNMA_NO, PUAN } from '../src/ayar.js';
import { Mac } from '../src/mac.js';
import { Oda } from '../src/oda.js';

function tohumlu(t = 7) { return () => { t = (t * 1103515245 + 12345) % 2147483648; return t / 2147483648; }; }

test('pist kapalı döngü ve örnekler ~1 blok aralıklı', () => {
  assert.ok(L > 500 && L < 900, 'uzunluk ' + L);
  for (let i = 0; i < P.N; i++) {
    const j = (i + 1) % P.N, d = Math.hypot(P.x[j] - P.x[i], P.z[j] - P.z[i]);
    assert.ok(d > 0.8 && d < 1.2, `örnek ${i} aralığı ${d}`);
    assert.ok(P.w[i] >= 9, 'en ' + P.w[i]);
  }
});

test('pist kendini kesmez: uzak örnekler en az iki en aralıklı', () => {
  for (let i = 0; i < P.N; i += 3) for (let j = 0; j < P.N; j += 3) {
    if (Math.abs(sFark(i * P.ad, j * P.ad)) < 60) continue;
    const d = Math.hypot(P.x[i] - P.x[j], P.z[i] - P.z[j]);
    assert.ok(d > (P.w[i] + P.w[j]) / 2 + 8, `${i}–${j} arası ${d.toFixed(1)}`);
  }
});

test('yansıt dünya konumunu geri verir', () => {
  for (let s = 0; s < L; s += 37) for (const yanal of [-4, 0, 3.5]) {
    const d = dunya(s, yanal), y = yansit(d.x, d.z, s + 5), g = yansit(d.x, d.z);
    assert.ok(Math.abs(sFark(s, y.s)) < 0.05 && Math.abs(y.yanal - yanal) < 0.05, `s=${s} yanal=${yanal} → ${y.s} ${y.yanal}`);
    assert.ok(Math.abs(sFark(s, g.s)) < 0.05);
  }
});

test('at ileri koşar, çitte kalır, dörtnala dayanım harcar', () => {
  const o = atYerlestir(atDurumu(), 10, 0);
  for (let i = 0; i < 60 * 8; i++) { const p = pistNoktasi(o.s); atAdim(o, { yx: p.tx + p.sx * 0.35, yz: p.tz + p.sz * 0.35, dortnala: true }, 1 / 60); assert.ok(Math.abs(o.yanal) <= pistNoktasi(o.s).w / 2 - AT.kenarPay + 0.05, 'çit dışı'); }
  assert.ok(o.u > 70, 'ilerleme ' + o.u);
  assert.ok(o.dayanim < AT.dayanim, 'dayanım harcanmadı');
});

test('geri gidilemez: ters sürünce en ileri noktanın payı kadar gerisinde durur', () => {
  const o = atYerlestir(atDurumu(), 100, 0);
  for (let i = 0; i < 60 * 3; i++) { const p = pistNoktasi(o.s); atAdim(o, { yx: p.tx, yz: p.tz }, 1 / 60); }
  let geri = 0;
  for (let i = 0; i < 60 * 6; i++) { const p = pistNoktasi(o.s); if (atAdim(o, { yx: -p.tx, yz: -p.tz }, 1 / 60).includes('geri')) geri++; }
  assert.ok(o.u >= o.enIleri - GERI.pay - 0.01, `u=${o.u} en=${o.enIleri}`);
  assert.ok(geri >= 1, 'şaha kalkmadı');
});


test('oda: insan katılınca bir bot çıkar, doğuş ve anlık görüntü gelir', () => {
  const oda = new Oda({ rastgele: tohumlu(5) }), gelen = [];
  const id = oda.katil(m => gelen.push(m), 'Yusuf', { model: 'gezgin' });
  assert.equal(oda.mac.oyuncular.size, MAC.kisi);
  assert.ok(gelen.some(m => m.t === 'dogus'));
  oda.adim(1 / MAC.tik);
  const s = gelen.find(m => m.t === 's'); assert.ok(s.o.some(a => a[0] === id));
  const o = oda.mac.oyuncular.get(id), d = dunya(o.u + 3, 1);
  oda.mesaj(id, { t: 'k', x: d.x, y: d.y, z: d.z, yaw: d.yaw, bakis: 0, pitch: 0, hiz: 9 });
  assert.ok(o.enIleri >= o.u && o.u > 6);
});

/** Botsuz maç: yalnız verilen sayıda insan (testte elle sürülür). */
function bosMac(n = 2) {
  const m = new Mac({ rastgele: tohumlu(11), kisi: n });
  const l = Array.from({ length: n }, (_, i) => m.yeniOyuncu('İnsan' + i, { model: 'gezgin' }, false));
  for (const o of l) o.korumaZ = 0;
  m.olaylar.length = 0; return [m, ...l];
}
const goz = o => [o.x, o.y + 2.25, o.z];
const yon = (a, b) => { const d = [b.x - a.x, b.y + 1.78 - a.y - 2.25, b.z - a.z], l = Math.hypot(...d); return d.map(v => v / l); };

test('engeller pistin içinde, kutular engelde değil', () => {
  assert.ok(ENGELLER.some(e => e.tur === 'ada') && ENGELLER.some(e => e.tur === 'cit') && ENGELLER.some(e => e.tur === 'vagon'));
  for (const e of ENGELLER) { const p = pistNoktasi(e.s0 + e.boy / 2); assert.ok(e.a0 >= -p.w / 2 && e.a1 <= p.w / 2, e.tur); }
  for (const k of KUTU_YERLERI) assert.equal(engelde(k.s, k.yanal, 1), null, 'kutu engelde ' + k.s);
});

test('çite çarpan at durur, zıplayan geçer; adanın yanından geçilir', () => {
  const cit = ENGELLER.find(e => e.tur === 'cit'), orta = (cit.a0 + cit.a1) / 2;
  const surt = (o, sn, zipla) => { for (let i = 0; i < sn * 60; i++) { const p = pistNoktasi(o.s), d = dunya(o.u + 6, orta); const dx = d.x - o.x, dz = d.z - o.z, u = Math.hypot(dx, dz); atAdim(o, { yx: dx / u, yz: dz / u, zipla: zipla && sFark(o.s, cit.s0) < 3.4 && sFark(o.s, cit.s0) > 1.8 }, 1 / 60); } };
  const a = atYerlestir(atDurumu(), cit.s0 - 25, orta); surt(a, 4, false);
  assert.ok(sFark(cit.s0, a.s) < 0.1, 'çitten geçti: ' + sFark(cit.s0, a.s));
  const b = atYerlestir(atDurumu(), cit.s0 - 25, orta); surt(b, 4, true);
  assert.ok(sFark(cit.s0, b.s) > 5, 'zıplayıp geçemedi');
  const ada = ENGELLER.find(e => e.tur === 'ada'), c = atYerlestir(atDurumu(), ada.s0 - 20, 0);
  for (let i = 0; i < 8 * 60; i++) { const p = pistNoktasi(c.s); atAdim(c, { yx: p.tx, yz: p.tz }, 1 / 60); }
  assert.ok(sFark(ada.s0, c.s) > ada.boy, 'ada geçilemedi');
  assert.ok(engelde(c.s, c.yanal) == null);
});

test('tabanca isabet eder, düşen eşyalarını ganimet bırakır ve son kapısında doğar', () => {
  const [m, a, b] = bosMac(2);
  atYerlestir(a, 200, 0); atYerlestir(b, 215, 0); b.nokta = 7; b.sav[SAVUNMA_NO.mayin] = 2;
  a.sal[SALDIRI_NO.tabanca] = 6; a.salSec = SALDIRI_NO.tabanca;
  let atis = 0;
  for (let i = 0; i < 6 && b.canli; i++) { m.z += 0.5; m.ates(a, { s: SALDIRI_NO.tabanca, b: goz(a), d: yon(a, b), r: i }); atis++; }
  assert.ok(!b.canli, 'düşmedi, can ' + b.can);
  assert.equal(a.les, 1); assert.equal(a.puan, PUAN.les);
  assert.equal(m.ganimetler.length, 1); assert.ok(b.sav.every(c => c === 0));
  const les = m.olaylar.find(e => e.m.t === 'les'); assert.equal(les.m.o, a.id);
  for (let i = 0; i < (MAC.dogusBekle + 0.2) * MAC.tik; i++) m.adim(1 / MAC.tik);
  assert.ok(b.canli); assert.ok(Math.abs(b.u - (7 * m.aralik + 1.5)) < 0.01, 'kapıda doğmadı ' + b.u);
  // Ganimet: a üstünden geçince mayınları alır
  const g = m.ganimetler[0]; a.x = g.x; a.z = g.z; a.y = g.y; m.adim(1 / MAC.tik);
  assert.equal(a.sav[SAVUNMA_NO.mayin], 2);
});

test('mayın patlar, çivi topallatır, kement bağlar, mahmuz çözer, duman atışı keser', () => {
  const [m, a, b] = bosMac(2);
  atYerlestir(a, 300, 0); atYerlestir(b, 290, 0);
  a.sav[SAVUNMA_NO.mayin] = 1; m.savun(a, { s: SAVUNMA_NO.mayin });
  assert.equal(m.mayinlar.length, 1);
  for (let i = 0; i < MAC.tik; i++) m.adim(1 / MAC.tik);
  const my = m.mayinlar[0]; b.x = my.x; b.z = my.z; m.adim(1 / MAC.tik);
  assert.ok(b.can < MAC.can, 'mayın patlamadı'); assert.equal(m.mayinlar.length, 0);
  // Çivi
  const [m2, c, d] = bosMac(2); atYerlestir(c, 400, 0); atYerlestir(d, 380, 0);
  c.sav[SAVUNMA_NO.civi] = 1; m2.savun(c, { s: SAVUNMA_NO.civi });
  const cv = m2.civiler[0], dd = dunya(cv.s, cv.yanal); d.x = dd.x; d.z = dd.z; d.s = cv.s; d.yanal = cv.yanal; m2.adim(1 / MAC.tik);
  assert.ok(d.topalT > 0, 'topal değil');
  // Kement + mahmuz
  c.sal[SALDIRI_NO.kement] = 1; atYerlestir(d, 410, 0); m2.z += 2;
  m2.ates(c, { s: SALDIRI_NO.kement, b: goz(c), d: yon(c, d), r: 1 });
  assert.ok(d.bagT > 0, 'kement tutmadı');
  d.sav[SAVUNMA_NO.mahmuz] = 1; m2.savun(d, { s: SAVUNMA_NO.mahmuz }); m2.adim(1 / MAC.tik);
  assert.equal(d.bagT, 0); assert.ok(d.mahmuzT > 0);
  // Duman: arada bulut varken tüfek vurmaz
  const [m3, e, f] = bosMac(2); atYerlestir(e, 100, 0); atYerlestir(f, 140, 0);
  m3.dumanlar.push({ id: 99, x: dunya(120, 0).x, y: f.y + 1.6, z: dunya(120, 0).z, r: 6.5, bitisZ: 99 });
  e.sal[SALDIRI_NO.tufek] = 1; m3.ates(e, { s: SALDIRI_NO.tufek, b: goz(e), d: yon(e, f), r: 3 });
  assert.equal(f.can, MAC.can, 'duman kesmedi');
});

test('aranan: tek başına en çok leşi olanı düşüren ek puan alır', () => {
  const [m, a, b, c] = bosMac(3);
  b.les = 3; m.arananBul(); assert.equal(m.aranan, b.id);
  atYerlestir(a, 200, 0); atYerlestir(b, 205, 0); a.sal[SALDIRI_NO.tufek] = 5;
  for (let i = 0; i < 4 && b.canli; i++) { m.z += 2; m.ates(a, { s: SALDIRI_NO.tufek, b: goz(a), d: yon(a, b), r: i }); }
  assert.ok(!b.canli); assert.equal(a.puan, PUAN.les + PUAN.aranan);
});

test('botlu maç: botlar ilerler, kutu toplar, birbirini düşürür; süre bitince puan sıralaması', () => {
  const m = new Mac({ rastgele: tohumlu(3), sure: 150 }); m.botlariDuzenle();
  assert.equal(m.oyuncular.size, MAC.kisi);
  let alinan = 0, les = 0, savunma = 0;
  for (let i = 0; i < 151 * MAC.tik; i++) { m.adim(1 / MAC.tik); for (const e of m.olaylar) { if (e.m.t === 'kutu') alinan++; if (e.m.t === 'les') les++; if (e.m.t === 'savun') savunma++; } if (m.durum === 'oyun') m.olaylar.length = 0; }
  for (const o of m.oyuncular.values()) assert.ok(o.enIleri > 250, `${o.ad} yalnız ${o.enIleri.toFixed(0)} gitti`);
  assert.ok(alinan > 20, 'kutu ' + alinan); assert.ok(les >= 5, 'leş ' + les); assert.ok(savunma >= 3, 'savunma ' + savunma);
  const son = m.olaylar.find(e => e.m.t === 'son'); assert.ok(son, 'maç bitmedi');
  const l = son.m.l; for (let i = 1; i < l.length; i++) assert.ok(l[i - 1][1] >= l[i][1]);
  console.log('  150 sn: kutu', alinan, 'leş', les, 'savunma', savunma, 'puanlar', l.map(r => r[1]).join(' '));
});
