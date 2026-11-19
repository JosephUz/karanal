// Maç benzetimi: biniciler, botlar, atış ve hasar, düşme ve kapıda doğuş, kutular, ganimet, tuzaklar (mayın, çivi,
// duman), dinamit, puan ve aranan. Tarayıcıda (botlu koşu) ve sunucuda (çevrim içi oda) aynı kod çalışır.
// İnsan oyuncunun atını kendi istemcisi yürütür ve konumunu yollar; ateşi burada, istemcinin gördüğü ana geri sarılarak
// hesaplanır. Atı etkileyen şeyler (çivi, kement, mahmuz) istemciye 'etki' mesajıyla gider.
import { AT, MAC, PUAN, SALDIRI, SAVUNMA, ZORLUK, AT_RENK } from './ayar.js';
import { atDurumu, atAdim, atYerlestir, itis } from './at.js';
import { noktalar, L, pistNoktasi, yansit, dunya, sFark, KUTU_YERLERI } from './pist.js';
import { biniciyeIsin, engeleIsin, zemineIsin, kuredenGecer, tohumlu, saptir } from './fizik.js';
import { MODELLER } from './avatar-veri.js';
import { Bot } from './bot.js';

const BOT_ADLARI = ['Çiftçi Rıza', 'Madenci Kâzım', 'Balıkçı Nuri', 'Tüccar Saadet', 'Muhafız Cevdet', 'Gezgin Leyla', 'Demirci Halil', 'Kuyumcu Nesrin', 'Değirmenci Sabri', 'Çoban Zeynep', 'Fırıncı Hamdi', 'Bostancı Gülsüm', 'Kervancı Rüstem', 'Arıcı Hatice'];
const BOT_MODEL = ['ciftci', 'madenci', 'balikci', 'tuccar', 'muhafiz', 'gezgin', 'madenci', 'tuccar', 'ciftci', 'gezgin', 'balikci', 'ciftci', 'muhafiz', 'gezgin'];
const GECMIS_SURE = 0.4, GOZ = 2.25;
const y2 = v => Math.round(v * 100) / 100;
const S_ = id => SALDIRI.find(s => s.id === id), V_ = id => SAVUNMA.find(s => s.id === id);
const bos = () => ({ sal: SALDIRI.map(() => 0), sav: SAVUNMA.map(() => 0) });

/** Ağırlıklı rastgele seçim (kutu içeriği). */
function sec(liste, r) { const t = liste.reduce((a, s) => a + s.agirlik, 0); let k = r() * t; for (let i = 0; i < liste.length; i++) { k -= liste[i].agirlik; if (k <= 0) return i; } return liste.length - 1; }

export class Mac {
  /** tekKosu: koşu bitince yenisi kendiliğinden başlamaz (çevrim içi oda bekleme odasına döner). */
  constructor({ kisi = MAC.kisi, rastgele = Math.random, sure = MAC.sure, zorluk = 'orta', tekKosu = false } = {}) {
    this.kisi = kisi; this.r = rastgele; this.sure = sure; this.zorluk = ZORLUK[zorluk] ? zorluk : 'orta'; this.tekKosu = tekKosu;
    this.z = 0; this.oyuncular = new Map(); this.sira = 1; this.no = 1;
    this.olaylar = []; // { kime: id | null (herkes) | -id (o hariç herkes), m }
    this.noktalar = noktalar(MAC.noktaSayisi); this.aralik = L / MAC.noktaSayisi;
    this.kutular = KUTU_YERLERI.map((k, i) => { const d = dunya(k.s, k.yanal); return { id: i, ...k, x: d.x, y: d.y, z: d.z, hazirZ: 0 }; });
    this.ganimetler = []; this.mayinlar = []; this.civiler = []; this.dumanlar = []; this.dinamitler = []; this.gecmis = [];
    this.durum = 'oyun'; this.bitisZ = sure; this.sonZ = 0; this.macNo = 1; this.izgara = 0; this.aranan = null;
  }
  olay(kime, m) { this.olaylar.push({ kime, m }); }

  yeniOyuncu(ad, avatar, bot) {
    const id = this.sira++;
    const o = { id, ad, avatar, bot, ...atDurumu(), bakis: 0, pitch: 0, nokta: 0, atRenk: AT_RENK[(id - 1) % AT_RENK.length], bit: 0,
      canli: true, can: MAC.can, zirh: 0, olumZ: -99, korumaZ: 0, ...bos(), salSec: -1, savSec: -1, sonAtis: SALDIRI.map(() => -99), sonSavun: -99,
      les: 0, olum: 0, puan: 0, seri: 0, sonSaldiran: null, sonSaldiranZ: -99, bagId: null };
    this.oyuncular.set(id, o);
    if (bot) o.beyin = new Bot(o, this, this.r);
    this.baslangicaKoy(o);
    this.listeYolla();
    return o;
  }
  insanEkle(ad, avatar) { const o = this.yeniOyuncu(ad, avatar, false); this.botlariDuzenle(); return o; }
  botEkle() {
    const kullanilan = new Set([...this.oyuncular.values()].map(o => o.ad));
    const i = BOT_ADLARI.findIndex(a => !kullanilan.has(a)), k = i < 0 ? Math.floor(this.r() * BOT_ADLARI.length) : i;
    const m = MODELLER.find(m => m.id === BOT_MODEL[k]) ?? MODELLER[0];
    return this.yeniOyuncu(i < 0 ? BOT_ADLARI[k] + ' ' + this.sira : BOT_ADLARI[k], { model: m.id, ...m.avatar }, true);
  }
  cikar(id) { if (!this.oyuncular.delete(id)) return; this.listeYolla(); this.botlariDuzenle(); }
  /** Koltuk sayısı sabit: insan gelince bir bot çıkar, insan gidince bot gelir. */
  botlariDuzenle() {
    const l = [...this.oyuncular.values()], botlar = l.filter(o => o.bot);
    while (l.length > this.kisi && botlar.length) { const b = botlar.pop(); l.splice(l.indexOf(b), 1); this.oyuncular.delete(b.id); }
    while (l.length < this.kisi) l.push(this.botEkle());
    this.listeYolla();
  }
  listeYolla() { this.olay(null, { t: 'liste', o: [...this.oyuncular.values()].map(o => [o.id, o.ad, o.avatar, o.bot ? 1 : 0, o.atRenk]) }); }

  /** Başlangıç ızgarası: 0. kapının önünde 5'li sıralar. */
  baslangicaKoy(o) {
    const k = this.izgara++ % this.kisi, sira = Math.floor(k / 5), sutun = k % 5, w = pistNoktasi(4).w - 2 * AT.kenarPay - 1;
    atYerlestir(o, 4 + sira * 5, (sutun - 2) / 4 * w);
    Object.assign(o, { nokta: 0, canli: true, can: MAC.can, zirh: 0, korumaZ: this.z + MAC.dogusKoruma, ...bos(), salSec: -1, savSec: -1, bagId: null });
    this.dogusYolla(o);
  }
  /** Başlangıç dizilişini verilen sıraya göre kurar (çevrim içi odada koltuk sırası = çıkış sırası). */
  diz(sira) { this.izgara = 0; for (const id of sira) { const o = this.oyuncular.get(id); if (o) this.baslangicaKoy(o); } }
  /** Son geçilen kapıda yeniden doğuş: önde mi arkada mı olduğunu bilemezsin. */
  noktadaDogur(o) {
    const u = o.nokta * this.aralik, w = pistNoktasi(u).w / 2 - AT.kenarPay - 0.5;
    atYerlestir(o, u + 1.5, (this.r() * 2 - 1) * w);
    Object.assign(o, { canli: true, can: MAC.can, zirh: 0, korumaZ: this.z + MAC.dogusKoruma, bagId: null });
    this.dogusYolla(o);
  }
  dogusYolla(o) { if (!o.bot) this.olay(o.id, { t: 'dogus', x: o.x, y: o.y, z: o.z, yaw: o.yaw, u: o.u, s: o.s, nokta: o.nokta }); }

  /** İnsan oyuncunun konumu (kendi istemcisi yürütür). İlerleme burada da izlenir: kapılar ve tuzaklar. */
  konum(o, m) {
    if (this.durum !== 'oyun' || !o.canli) return;
    const sayi = v => typeof v === 'number' && Number.isFinite(v);
    if (![m.x, m.y, m.z, m.yaw, m.bakis, m.pitch].every(sayi)) return;
    const y = yansit(m.x, m.z, o.s);
    const du = sFark(o.s, y.s);
    if (Math.abs(du) > 40 || Math.abs(m.y - pistNoktasi(y.s).y) > 6) { this.olay(o.id, { t: 'duzelt', x: o.x, y: o.y, z: o.z }); return; }
    Object.assign(o, { x: m.x, y: m.y, z: m.z, yaw: m.yaw, bakis: m.bakis, pitch: Math.max(-1.5, Math.min(1.5, m.pitch)), hiz: sayi(m.hiz) ? Math.min(m.hiz, AT.mahmuz + 1) : 0, s: y.s, yanal: y.yanal });
    o.u += du; o.enIleri = Math.max(o.enIleri, o.u); o.bit = (m.b | 0) & 14;
  }
  /** Saldırı silahı seçimi (tekerlek). */
  silahSec(o, i) { if (SALDIRI[i] && o.sal[i] > 0) o.salSec = i; }
  savunmaSec(o, i) { if (SAVUNMA[i] && o.sav[i] > 0) o.savSec = i; }

  // ——— Atış ———
  /** m: { s: silah no, b: göz [x,y,z], d: yön, r: tohum, zt: istemcinin gördüğü an }. */
  ates(o, m) {
    if (this.durum !== 'oyun' || !o.canli) return;
    const i = m.s | 0, S = SALDIRI[i]; if (!S || o.sal[i] <= 0) return;
    if (this.z - o.sonAtis[i] < S.aralik * 0.85) return;
    const b = Array.isArray(m.b) && m.b.length === 3 && m.b.every(Number.isFinite) ? m.b : [o.x, o.y + GOZ, o.z];
    if (Math.hypot(b[0] - o.x, b[2] - o.z) > 3 || Math.abs(b[1] - o.y - GOZ) > 2) return;
    const dl = Array.isArray(m.d) && m.d.length === 3 && m.d.every(Number.isFinite) ? Math.hypot(...m.d) : 0; if (dl < 0.5) return;
    const d = m.d.map(v => v / dl);
    o.sonAtis[i] = this.z; o.sal[i]--; o.korumaZ = Math.min(o.korumaZ, this.z);
    if (o.sal[i] <= 0) { const sonraki = o.sal.findIndex(c => c > 0); o.salSec = sonraki; }
    if (S.id === 'dinamit') {
      const v = [d[0] * S.firlat + Math.sin(-o.yaw) * o.hiz * 0.5, d[1] * S.firlat + 4, d[2] * S.firlat - Math.cos(o.yaw) * o.hiz * 0.5];
      this.dinamitler.push({ id: this.no++, sahip: o.id, x: b[0], y: b[1], z: b[2], vx: v[0], vy: v[1], vz: v[2], patlaZ: this.z + S.fitil, s: o.s });
      this.olay(null, { t: 'ates', id: o.id, s: i }); return;
    }
    // Hedefler: atanın gördüğü ana geri sarılmış konumlar
    const an = o.bot ? null : this.anaDon(m.zt), r = tohumlu(m.r | 0), uclar = [];
    const dumanda = this.dumanlar.some(c => Math.hypot(c.x - b[0], c.y - b[1], c.z - b[2]) < c.r);
    for (let k = 0; k < (S.sacma || 1); k++) {
      const y = saptir(d, S.sacilma + (dumanda ? V_('duman').sapma : 0), r);
      let en = Math.min(engeleIsin(b, y, S.menzil), zemineIsin(b, y, o.s, S.menzil)), vur = null;
      for (const h of this.oyuncular.values()) {
        if (h === o || !h.canli) continue;
        const p = an?.get(h.id) ?? [h.x, h.y, h.z, h.yaw], v = biniciyeIsin(b, y, p[0], p[1], p[2], p[3], en);
        if (v) { en = v.t; vur = { h, bolge: v.bolge }; }
      }
      // Duman ışını keser: bulutun içinden geçen mermi kaybolur
      for (const c of this.dumanlar) if (kuredenGecer(b, y, en, [c.x, c.y, c.z], c.r * 0.85) && Math.hypot(c.x - b[0], c.y - b[1], c.z - b[2]) > c.r) { en = Math.min(en, Math.max(0, (c.x - b[0]) * y[0] + (c.y - b[1]) * y[1] + (c.z - b[2]) * y[2])); vur = null; }
      uclar.push([y2(b[0] + y[0] * en), y2(b[1] + y[1] * en), y2(b[2] + y[2] * en)]);
      if (!vur) continue;
      if (S.id === 'kement') { this.kementle(o, vur.h); continue; }
      let hasar = S.hasar * (vur.bolge === 'kafa' ? S.kafa : vur.bolge === 'at' ? 0.75 : 1);
      if (S.dusus) { const [a, c, enAz] = S.dusus; hasar *= en <= a ? 1 : en >= c ? enAz : 1 - (1 - enAz) * (en - a) / (c - a); }
      this.hasarVer(vur.h, hasar, o, S.id, vur.bolge === 'kafa');
    }
    this.olay(o.bot ? null : -o.id, { t: 'ates', id: o.id, s: i, u: uclar });
  }
  kementle(o, h) {
    if (h.mahmuzT > 0 || h.korumaZ > this.z) return;
    const K = S_('kement'); h.bagT = K.bagSure; h.bagId = o.id; h.cekX = o.x; h.cekZ = o.z;
    this.hasarVer(h, K.hasar, o, 'kement', false);
    if (!h.bot) this.olay(h.id, { t: 'etki', tur: 'bag', sure: K.bagSure, cek: o.id });
    this.olay(null, { t: 'kement', a: o.id, h: h.id, sure: K.bagSure });
  }
  /** Geri sarma: zt anındaki konumlar (en çok GECMIS_SURE geriye). */
  anaDon(zt) {
    if (!Number.isFinite(zt) || !this.gecmis.length) return null;
    const hedef = Math.max(this.z - GECMIS_SURE, Math.min(this.z, zt));
    let en = null; for (const g of this.gecmis) if (g.z <= hedef + 1e-6) en = g;
    return (en ?? this.gecmis[0]).p;
  }

  hasarVer(h, miktar, saldiran, silah, kafa = false) {
    if (!h.canli || h.korumaZ > this.z || miktar <= 0) return;
    let kalan = miktar;
    if (h.zirh > 0) { const emilen = Math.min(h.zirh, kalan * 0.7); h.zirh -= emilen; kalan -= emilen; }
    h.can -= kalan;
    if (saldiran && saldiran !== h) { h.sonSaldiran = saldiran.id; h.sonSaldiranZ = this.z; }
    const olu = h.can <= 0;
    if (saldiran && saldiran !== h && !saldiran.bot) this.olay(saldiran.id, { t: 'isabet', h: h.id, k: kafa ? 1 : 0, o: olu ? 1 : 0 });
    if (!h.bot) this.olay(h.id, { t: 'yara', x: saldiran?.x ?? null, z: saldiran?.z ?? null, can: Math.max(0, Math.round(h.can)) });
    if (olu) this.dusur(h, saldiran, silah, kafa);
  }
  dusur(h, saldiran, silah, kafa) {
    h.canli = false; h.can = 0; h.olumZ = this.z; h.olum++; h.seri = 0; h.bagT = 0; h.topalT = 0; h.mahmuzT = 0; h.hiz = 0;
    // Eşyalar yere düşer: ganimet
    if (h.sal.some(c => c > 0) || h.sav.some(c => c > 0)) this.ganimetler.push({ id: this.no++, x: h.x, y: h.y, z: h.z, s: h.s, sal: h.sal.slice(), sav: h.sav.slice(), bitisZ: this.z + MAC.ganimetSure });
    Object.assign(h, bos(), { salSec: -1, savSec: -1, zirh: 0 });
    const arananDi = this.aranan === h.id;
    let puan = 0, seri = 0;
    if (saldiran && saldiran !== h) {
      saldiran.les++; seri = ++saldiran.seri; puan = PUAN.les + (seri === 3 ? PUAN.seri3 : seri === 5 ? PUAN.seri5 : 0) + (arananDi ? PUAN.aranan : 0);
      saldiran.puan += puan;
    }
    this.olay(null, { t: 'les', o: saldiran && saldiran !== h ? saldiran.id : null, h: h.id, s: silah, k: kafa ? 1 : 0, ar: arananDi ? 1 : 0, seri, puan });
    this.arananBul();
  }
  /** Aranan: tek başına en çok leşi olan (en az PUAN.arananEsik). */
  arananBul() {
    let en = null, enL = PUAN.arananEsik - 1, esit = false;
    for (const o of this.oyuncular.values()) { if (o.les > enL) { en = o; enL = o.les; esit = false; } else if (o.les === enL && en) esit = true; }
    const yeni = en && !esit ? en.id : null;
    if (yeni !== this.aranan) { this.aranan = yeni; if (yeni != null) this.olay(null, { t: 'aranan', id: yeni }); }
  }

  // ——— Savunma eşyaları ———
  savun(o, m) {
    if (this.durum !== 'oyun' || !o.canli) return;
    const i = m.s | 0, V = SAVUNMA[i]; if (!V || o.sav[i] <= 0 || this.z - o.sonSavun < 0.4) return;
    o.sonSavun = this.z; o.sav[i]--;
    if (o.sav[i] <= 0) o.savSec = o.sav.findIndex(c => c > 0);
    const fx = -Math.sin(o.yaw), fz = -Math.cos(o.yaw), zemin = pistNoktasi(o.s).y;
    if (V.id === 'mayin') this.mayinlar.push({ id: this.no++, sahip: o.id, x: o.x - fx * 2, y: zemin, z: o.z - fz * 2, kurZ: this.z + V.kurulma, bitisZ: this.z + V.omur });
    else if (V.id === 'duman') this.dumanlar.push({ id: this.no++, x: o.x - fx * 3, y: zemin + 1.6, z: o.z - fz * 3, r: V.alan, bitisZ: this.z + V.sure });
    else if (V.id === 'civi') { const s = o.s - 3.5, p = pistNoktasi(s); this.civiler.push({ id: this.no++, sahip: o.id, s: ((s % L) + L) % L, yanal: Math.max(-p.w / 2 + V.en / 2, Math.min(p.w / 2 - V.en / 2, o.yanal)), bitisZ: this.z + V.omur, vurulan: new Set() }); }
    else if (V.id === 'yelek') o.zirh = V.zirh;
    else if (V.id === 'mahmuz') { o.mahmuzT = V.sure; o.bagT = 0; o.dayanim = AT.dayanim; if (!o.bot) this.olay(o.id, { t: 'etki', tur: 'mahmuz', sure: V.sure }); }
    this.olay(null, { t: 'savun', id: o.id, s: i });
  }
  patlat(x, y, z, alan, hasar, sahip, silah, kendiKat = 1) {
    this.olay(null, { t: 'patla', x: y2(x), y: y2(y), z: y2(z), a: alan });
    for (const h of this.oyuncular.values()) {
      if (!h.canli) continue;
      const d = Math.hypot(h.x - x, h.y + 1.2 - y, h.z - z); if (d > alan) continue;
      this.hasarVer(h, hasar * (1 - 0.6 * d / alan) * (h === sahip ? kendiKat : 1), sahip, silah, false);
    }
  }

  adim(dt) {
    this.z += dt;
    if (this.durum === 'son') { if (!this.tekKosu && this.z >= this.sonZ) this.yeniMac(); return; }
    const l = [...this.oyuncular.values()];
    // Botlar
    for (const o of l) {
      if (!o.bot) continue;
      if (!o.canli) { if (this.z - o.olumZ >= MAC.dogusBekle) this.noktadaDogur(o); continue; }
      if (o.bagT > 0) { const a = this.oyuncular.get(o.bagId); if (a) { o.cekX = a.x; o.cekZ = a.z; } }
      const g = o.beyin.dusun(dt), ol = atAdim(o, g, dt);
      o.bit = (o.yerde ? 2 : 0) | (o.dortnala ? 4 : 0) | (o.sahlanT > 0 ? 8 : 0);
      if (ol.includes('geri')) this.olay(null, { t: 'sahlan', id: o.id });
      if (ol.includes('carp')) this.hasarVer(o, 6, null, 'carp');
      o.beyin.eylem();
    }
    // İnsanlar: düşüp bekleyen doğar
    for (const o of l) if (!o.bot && !o.canli && this.z - o.olumZ >= MAC.dogusBekle && this.durum === 'oyun') this.noktadaDogur(o);
    // Botlar birbirini ve insanları iter (insanı kendi istemcisi iter)
    for (const a of l) if (a.bot && a.canli) for (const b of l) if (a !== b && b.canli && Math.abs(a.y - b.y) < 1.5) itis(a, b.x, b.z);
    // Kontrol kapıları: en ileri noktaya göre
    for (const o of l) {
      const n = Math.floor(o.enIleri / this.aralik);
      if (n > o.nokta) { o.nokta = n; if (!o.bot) this.olay(o.id, { t: 'nokta', n: n % this.noktalar.length, tur: Math.floor(n / this.noktalar.length) }); }
    }
    this.dunyaAdim(dt, l);
    // Geri sarma geçmişi
    this.gecmis.push({ z: this.z, p: new Map(l.map(o => [o.id, [o.x, o.y, o.z, o.yaw]])) });
    while (this.gecmis.length && this.gecmis[0].z < this.z - GECMIS_SURE - 0.1) this.gecmis.shift();
    if (this.z >= this.bitisZ) this.bitir();
  }

  /** Kutular, ganimet, mayın, çivi, duman, dinamit. */
  dunyaAdim(dt, l) {
    const canlilar = l.filter(o => o.canli);
    for (const k of this.kutular) {
      if (k.hazirZ > this.z) continue;
      const o = canlilar.find(o => Math.hypot(o.x - k.x, o.z - k.z) < MAC.kutuAl && Math.abs(o.y - k.y) < 2.2); if (!o) continue;
      k.hazirZ = this.z + MAC.kutuDogus;
      if (k.tur === 'kirmizi') { const i = sec(SALDIRI, this.r); o.sal[i] = Math.min(SALDIRI[i].cephane * 2, o.sal[i] + SALDIRI[i].cephane); if (o.salSec < 0 || o.bot) o.salSec = o.salSec < 0 ? i : o.salSec; this.olay(o.id, { t: 'al', tur: 'sal', i, c: o.sal[i] }); }
      else { const i = sec(SAVUNMA, this.r); o.sav[i] = Math.min(SAVUNMA[i].adet * 2, o.sav[i] + SAVUNMA[i].adet); if (o.savSec < 0) o.savSec = i; this.olay(o.id, { t: 'al', tur: 'sav', i, c: o.sav[i] }); }
      this.olay(-o.id, { t: 'kutu', id: k.id, x: k.x, y: k.y, z: k.z });
    }
    this.ganimetler = this.ganimetler.filter(g => {
      if (g.bitisZ <= this.z) return false;
      const o = canlilar.find(o => Math.hypot(o.x - g.x, o.z - g.z) < MAC.ganimetAl); if (!o) return true;
      g.sal.forEach((c, i) => { if (c > 0) { o.sal[i] = Math.min(SALDIRI[i].cephane * 2, o.sal[i] + c); if (o.salSec < 0) o.salSec = i; } });
      g.sav.forEach((c, i) => { if (c > 0) { o.sav[i] = Math.min(SAVUNMA[i].adet * 2, o.sav[i] + c); if (o.savSec < 0) o.savSec = i; } });
      this.olay(o.id, { t: 'ganimet', sal: g.sal, sav: g.sav });
      return false;
    });
    const M = V_('mayin');
    this.mayinlar = this.mayinlar.filter(m => {
      if (m.bitisZ <= this.z) return false;
      if (m.kurZ > this.z) return true;
      const o = canlilar.find(o => o.id !== m.sahip && Math.hypot(o.x - m.x, o.z - m.z) < M.tetik && o.y - m.y < 1.2); if (!o) return true;
      this.patlat(m.x, m.y + 0.3, m.z, M.alan, M.hasar, this.oyuncular.get(m.sahip) ?? null, 'mayin', 0.5);
      return false;
    });
    const C = V_('civi');
    this.civiler = this.civiler.filter(c => {
      if (c.bitisZ <= this.z) return false;
      for (const o of canlilar) {
        if (o.id === c.sahip || c.vurulan.has(o.id) || o.y - pistNoktasi(c.s).y > 0.6) continue;
        const ds = sFark(c.s, o.s); if (Math.abs(ds) > C.boy / 2 || Math.abs(o.yanal - c.yanal) > C.en / 2) continue;
        c.vurulan.add(o.id); o.topalT = C.topal;
        if (!o.bot) this.olay(o.id, { t: 'etki', tur: 'topal', sure: C.topal });
        this.hasarVer(o, C.hasar, this.oyuncular.get(c.sahip) ?? null, 'civi');
      }
      return true;
    });
    this.dumanlar = this.dumanlar.filter(c => c.bitisZ > this.z);
    const D = S_('dinamit');
    this.dinamitler = this.dinamitler.filter(n => {
      n.vy -= 18 * dt; n.x += n.vx * dt; n.y += n.vy * dt; n.z += n.vz * dt;
      const y = yansit(n.x, n.z, n.s); n.s = y.s; const p = pistNoktasi(y.s), zem = p.y + 0.15;
      if (n.y < zem) { n.y = zem; n.vy = Math.abs(n.vy) * 0.3; n.vx *= 0.6; n.vz *= 0.6; }
      if (Math.abs(y.yanal) > p.w / 2 + 0.5) { const yeni = Math.sign(y.yanal) * (p.w / 2); n.x += p.sx * (yeni - y.yanal); n.z += p.sz * (yeni - y.yanal); n.vx *= -0.3; n.vz *= -0.3; }
      if (n.patlaZ > this.z) return true;
      this.patlat(n.x, n.y, n.z, D.alan, D.hasar, this.oyuncular.get(n.sahip) ?? null, 'dinamit', D.kendi);
      return false;
    });
    // Kement: bağlayan düşerse çözülür
    for (const o of canlilar) if (o.bagT > 0) { const a = this.oyuncular.get(o.bagId); if (!a?.canli) o.bagT = 0; }
  }

  siralama() { return [...this.oyuncular.values()].sort((a, b) => b.puan - a.puan || b.les - a.les || a.olum - b.olum).map(o => [o.id, o.puan, o.les, o.olum]); }
  bitir() {
    this.durum = 'son'; this.sonZ = this.z + MAC.sonBekle;
    const l = this.siralama();
    this.olay(null, { t: 'son', l, kazanan: l[0]?.[0], bekle: MAC.sonBekle });
  }
  yeniMac() {
    this.durum = 'oyun'; this.bitisZ = this.z + this.sure; this.macNo++; this.izgara = 0; this.aranan = null;
    this.ganimetler = []; this.mayinlar = []; this.civiler = []; this.dumanlar = []; this.dinamitler = [];
    for (const k of this.kutular) k.hazirZ = 0;
    for (const o of this.oyuncular.values()) { Object.assign(o, { les: 0, olum: 0, puan: 0, seri: 0 }); this.baslangicaKoy(o); }
    this.olay(null, { t: 'basla' });
  }
  /** Bir oyuncunun kendi eşyaları (yalnız ona gider). */
  envanter(o) { return { t: 'env', sal: o.sal.slice(), sav: o.sav.slice(), ss: o.salSec, vs: o.savSec, can: Math.max(0, Math.round(o.can)), zirh: Math.round(o.zirh) }; }
  /** Anlık görüntü. o: [id, x, y, z, yaw, bakis, pitch, bit, hiz, can, silah]. */
  ozet() {
    const bit = o => (o.canli ? 1 : 0) | o.bit | (o.korumaZ > this.z ? 16 : 0) | (o.bagT > 0 ? 32 : 0) | (o.topalT > 0 ? 64 : 0) | (o.mahmuzT > 0 ? 128 : 0) | (this.aranan === o.id ? 256 : 0) | (o.zirh > 0 ? 512 : 0);
    return {
      t: 's', z: y2(this.z), kalan: Math.max(0, Math.round(this.bitisZ - this.z)),
      o: [...this.oyuncular.values()].map(o => [o.id, y2(o.x), y2(o.y), y2(o.z), y2(o.yaw), y2(o.bakis), y2(o.pitch), bit(o), y2(o.hiz), Math.max(0, Math.round(o.can)), o.salSec, o.bagT > 0 ? o.bagId : 0]),
      k: this.kutular.filter(k => k.hazirZ > this.z).map(k => k.id),
      g: this.ganimetler.map(g => [g.id, y2(g.x), y2(g.y), y2(g.z)]),
      m: this.mayinlar.map(m => [m.id, y2(m.x), y2(m.y), y2(m.z), m.kurZ <= this.z ? 1 : 0]),
      c: this.civiler.map(c => [c.id, y2(c.s), y2(c.yanal)]),
      d: this.dumanlar.map(c => [c.id, y2(c.x), y2(c.y), y2(c.z), y2(c.bitisZ - this.z)]),
      n: this.dinamitler.map(n => [n.id, y2(n.x), y2(n.y), y2(n.z)]),
      sk: this.siralama(),
    };
  }
}
