// At sürüşü: istemci (kendi atı) ve maç (botlar) aynı işlevi kullanır.
// Giriş: gitmek istenen dünya yönü (yx, yz; boyu 0 ya da 1), dörtnala, zıpla. At o yöne dönerek koşar;
// binicinin bakışı (nişan) bundan bağımsızdır. Pistin çitleri yanal konumu sınırlar, engeller (ada, çit, vagon) yolu keser.
// Geri gidilemez: u (sarılmamış ilerleme) en ileri noktanın GERI.pay gerisine düşerse at şaha kalkar, geri itilir.
// Etkiler: topalT (çivi, yavaş), mahmuzT (çok hızlı, kement tutmaz), bagT (kementle bağlı: yavaş, cekX/cekZ'ye çekilir).
import { AT, GERI, SALDIRI } from './ayar.js';
import { pistNoktasi, yansit, sFark, dunya, engelde } from './pist.js';

const aci = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const KEMENT = SALDIRI.find(s => s.id === 'kement');

export function atDurumu() {
  return { x: 0, y: 0, z: 0, vy: 0, yaw: 0, hiz: 0, dayanim: AT.dayanim, yorgun: false, dortnala: false, yerde: true, s: 0, u: 0, enIleri: 0, yanal: 0, sahlanT: 0, topalT: 0, mahmuzT: 0, bagT: 0, cekX: 0, cekZ: 0 };
}

/** Atı pistte (s, yanal) noktasına koy; ilerleme sayaçlarını u'ya göre başlat. */
export function atYerlestir(o, u, yanal) {
  const d = dunya(u, yanal);
  Object.assign(o, { x: d.x, y: d.y, z: d.z, yaw: d.yaw, vy: 0, hiz: 0, yerde: true, s: yansit(d.x, d.z, u).s, u, enIleri: u, yanal, sahlanT: 0, dayanim: AT.dayanim, yorgun: false, topalT: 0, mahmuzT: 0, bagT: 0 });
  return o;
}

/**
 * Bir adım. g: { yx, yz, dortnala, zipla }. Döner: olay listesi ('geri' şaha kalktı, 'zipla', 'kon', 'kenar', 'carp').
 */
export function atAdim(o, g, dt) {
  const olay = [];
  for (const k of ['topalT', 'mahmuzT', 'bagT']) if (o[k] > 0) o[k] = Math.max(0, o[k] - dt);
  if (o.mahmuzT > 0) o.bagT = 0;
  // Şaha kalkmışken giriş yok: at pistin akışına döner.
  let yx = g.yx ?? 0, yz = g.yz ?? 0;
  if (o.sahlanT > 0) { o.sahlanT -= dt; const p = pistNoktasi(o.s); yx = p.tx; yz = p.tz; }
  const istek = Math.hypot(yx, yz) > 0.1;
  // Dörtnala: dayanım harcar; tükenince yorgun, eşiğe dek toplanır. Mahmuzluyken dayanım harcanmaz.
  const ister = istek && !!g.dortnala && o.sahlanT <= 0;
  if (o.yorgun && o.dayanim >= AT.yorgunEsik) o.yorgun = false;
  o.dortnala = (ister && !o.yorgun && o.dayanim > 0) || (o.mahmuzT > 0 && istek);
  if (o.dortnala && o.mahmuzT <= 0) { o.dayanim -= AT.harca * dt; if (o.dayanim <= 0) { o.dayanim = 0; o.yorgun = true; o.dortnala = false; } }
  else if (!o.dortnala) o.dayanim = Math.min(AT.dayanim, o.dayanim + AT.toplan * dt);
  // Dönüş: istenen yöne, hız arttıkça daha geniş.
  if (istek) {
    const hedef = Math.atan2(-yx, -yz), oran = Math.min(1, o.hiz / AT.dortnala);
    const donus = (AT.donus + (AT.donusHizli - AT.donus) * oran) * dt, fark = aci(hedef - o.yaw);
    o.yaw = aci(o.yaw + Math.max(-donus, Math.min(donus, fark)));
  }
  let hedefHiz = o.sahlanT > 0 || !istek ? 0 : o.mahmuzT > 0 ? AT.mahmuz : o.dortnala ? AT.dortnala : AT.tiris;
  if (o.topalT > 0) hedefHiz *= AT.topal;
  if (o.bagT > 0) hedefHiz *= KEMENT.bagHiz;
  o.hiz += Math.max(-AT.fren * dt, Math.min(AT.ivme * (o.mahmuzT > 0 ? 2.5 : 1) * dt, hedefHiz - o.hiz));
  // Ters yöne sürüş isteğinde at yavaşlar (yerinde dönmeye çalışır)
  if (istek) { const f = Math.cos(aci(Math.atan2(-yx, -yz) - o.yaw)); if (f < 0) o.hiz = Math.max(0, o.hiz - AT.fren * 0.6 * dt * -f); }
  o.x += -Math.sin(o.yaw) * o.hiz * dt; o.z += -Math.cos(o.yaw) * o.hiz * dt;
  // Kement: atan kişiye doğru çekilir
  if (o.bagT > 0) { const dx = o.cekX - o.x, dz = o.cekZ - o.z, d = Math.hypot(dx, dz); if (d > 3) { o.x += dx / d * KEMENT.cekme * dt; o.z += dz / d * KEMENT.cekme * dt; } }
  // Pist: yansıt, çitlerde tut
  let y = yansit(o.x, o.z, o.s);
  const p = pistNoktasi(y.s), sinir = p.w / 2 - AT.kenarPay;
  if (Math.abs(y.yanal) > sinir) {
    const yeni = Math.sign(y.yanal) * sinir; o.x += p.sx * (yeni - y.yanal); o.z += p.sz * (yeni - y.yanal); y.yanal = yeni;
    // Çite sürtünme: çite doğru hız bileşeni yavaşlar
    const disa = (-Math.sin(o.yaw) * p.sx + -Math.cos(o.yaw) * p.sz) * Math.sign(yeni);
    if (disa > 0.2) { o.hiz *= 1 - Math.min(1, disa * 1.2 * dt); olay.push('kenar'); }
  }
  // Engeller: üstünden atlanmıyorsa dışına itilir. Uzun engelde (ada) yana, kısa engelde (çit, vagon) geriye.
  const zemin0 = pistNoktasi(y.s).y, e = engelde(y.s, y.yanal, AT.kenarPay * 0.8);
  // Kısa engelde boyuna pay az (zıplama penceresi geniş kalsın), yana pay atın yarı eni
  if (e && o.y < zemin0 + e.h - 0.05 && (e.boy > 6 || (sFark(e.s0, y.s) > -0.3 && sFark(e.s0, y.s) < e.boy + 0.3))) {
    const pay = e.boy > 6 ? AT.kenarPay * 0.8 : 0.3;
    if (e.boy > 6) {
      const yeni = y.yanal - e.a0 + pay < e.a1 + pay - y.yanal ? e.a0 - pay : e.a1 + pay, q = pistNoktasi(y.s);
      o.x += q.sx * (yeni - y.yanal); o.z += q.sz * (yeni - y.yanal); y.yanal = yeni;
    } else {
      const once = sFark(e.s0, y.s) < e.boy / 2 ? -pay - 0.02 : e.boy + pay + 0.02, ds = sFark(y.s, e.s0 + once), d = dunya(y.s + ds, y.yanal);
      o.x = d.x; o.z = d.z; y = { s: yansit(d.x, d.z, y.s + ds).s, yanal: y.yanal };
      if (o.hiz > 4) olay.push('carp');
      o.hiz = Math.min(o.hiz, 1.5);
    }
  }
  o.u += sFark(o.s, y.s); o.s = y.s; o.yanal = y.yanal;
  // Geri gidilemez
  if (o.u < o.enIleri - GERI.pay) {
    const d = dunya(o.enIleri - GERI.pay, o.yanal);
    o.x = d.x; o.z = d.z; o.u = o.enIleri - GERI.pay; o.s = yansit(o.x, o.z, o.u).s; o.hiz = Math.min(o.hiz, 2);
    if (o.sahlanT <= 0) olay.push('geri');
    o.sahlanT = GERI.sahlan;
  }
  o.enIleri = Math.max(o.enIleri, o.u);
  // Dikey: zemin pistin yüksekliği
  const zemin = pistNoktasi(o.s).y;
  if (g.zipla && o.yerde && o.sahlanT <= 0) { o.vy = AT.ziplama; o.yerde = false; olay.push('zipla'); }
  o.vy -= AT.yercekimi * dt; o.y += o.vy * dt;
  if (o.y <= zemin) { if (!o.yerde && o.vy < -3) olay.push('kon'); o.y = zemin; o.vy = 0; o.yerde = true; }
  else if (o.yerde && o.y - zemin < 0.4) o.y = zemin; // yokuş aşağı yapış
  else o.yerde = false;
  return olay;
}

/** İki at itişir (yalnız a itilir; ikisi de çağrılırsa karşılıklı). */
export function itis(a, bx, bz) {
  const dx = a.x - bx, dz = a.z - bz, d = Math.hypot(dx, dz), m = AT.yaricap * 2;
  if (d >= m || d < 1e-4) return false;
  const k = (m - d) / 2; a.x += dx / d * k; a.z += dz / d * k; return true;
}
