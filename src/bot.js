// Bot binici. Sürüş: pistte biraz ilerideki bir noktaya, kendi şeridine yönelir; kutulara ve ganimete sapar, engelden,
// mayından ve çividen kaçar, çitin üstünden atlar. Savaş: huyuna göre hedef seçer (kendisine saldırana karşılık verir,
// arananı kovalar), mesafeye göre silah seçer, tepki süresinden sonra sapmalı nişanla ateş eder; peşindekine tuzak
// bırakır, can azalınca yelek giyer, kementlenince mahmuzlar.
import { AT, BOT_HUY, SALDIRI, SAVUNMA, SALDIRI_NO, SAVUNMA_NO, ZORLUK } from './ayar.js';
import { dunya, pistNoktasi, sFark, engelde, ENGELLER } from './pist.js';
import { saptir } from './fizik.js';

const aci = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const GOZ = 2.25;

export class Bot {
  constructor(o, mac, r = Math.random) {
    this.o = o; this.mac = mac; this.r = r; this.huy = BOT_HUY[(o.id * 7 + Math.floor(r() * 3)) % BOT_HUY.length];
    this.serit = (r() - 0.5) * 0.8; this.seritT = 0; this.dortT = 0; this.dort = false;
    this.hedef = null; this.kilitZ = 0; this.sonAtesZ = -99; this.tuzakZ = -99; this.bakisHedef = 0; this.zipla = false;
  }
  get Z() { return ZORLUK[this.mac.zorluk] ?? ZORLUK.orta; }

  /** Görülebilen ve vurulabilir rakipler. */
  rakipler() {
    const o = this.o, l = [];
    for (const h of this.mac.oyuncular.values()) {
      if (h === o || !h.canli || h.korumaZ > this.mac.z) continue;
      const d = Math.hypot(h.x - o.x, h.z - o.z); if (d > this.Z.gorus) continue;
      l.push({ h, d, ileri: sFark(o.s, h.s) });
    }
    return l;
  }
  hedefSec() {
    const o = this.o, mac = this.mac, l = this.rakipler(); if (!l.length) return null;
    const silahVar = o.sal.some(c => c > 0);
    let en = null, enP = -Infinity;
    for (const r of l) {
      let p = -r.d;
      if (o.sonSaldiran === r.h.id && mac.z - o.sonSaldiranZ < 8) p += 40; // saldırmadığın biri sana saldırabilir: karşılık
      if (mac.aranan === r.h.id) p += 20 * this.huy.saldir;
      if (r.ileri > 0) p += 12 * this.huy.saldir; // avcı öndekini kovalar
      if (!silahVar) p -= 100;
      if (p > enP) { enP = p; en = r; }
    }
    // Huyu saldırgan değilse ve kimse ona saldırmıyorsa, uzaktakini boş ver
    if (en && this.huy.saldir < 0.5 && o.sonSaldiran !== en.h.id && en.d > 25) return null;
    return en;
  }

  /** Sürüş girişi. */
  dusun(dt) {
    const o = this.o, r = this.r, mac = this.mac;
    if ((this.seritT -= dt) <= 0) { this.seritT = 2 + r() * 5; this.serit = Math.max(-0.85, Math.min(0.85, this.serit + (r() - 0.5) * this.huy.serit * 1.6)); }
    const p = pistNoktasi(o.s), yari = p.w / 2 - AT.kenarPay;
    let yanal = this.serit * yari, istek = null;
    // Kutu ya da ganimet: ilerideki en yakın hazır olana sap
    let enK = 34;
    const mermi = o.sal.reduce((a, c) => a + c, 0), esya = o.sav.reduce((a, c) => a + c, 0);
    for (const k of mac.kutular) {
      if (k.hazirZ > mac.z || (k.tur === 'kirmizi' ? mermi > 14 : esya > 2)) continue;
      const ileri = sFark(o.s, k.s); if (ileri < 3 || ileri > enK) continue;
      enK = ileri; istek = k;
    }
    if (istek) yanal = istek.yanal;
    for (const g of mac.ganimetler) { const d = Math.hypot(g.x - o.x, g.z - o.z), ileri = sFark(o.s, g.s); if (ileri > 2 && d < 30) { yanal = Math.max(-yari, Math.min(yari, (g.x - p.x) * p.sx + (g.z - p.z) * p.sz)); break; } }
    // Avcı: hedefin şeridine yanaş
    if (this.hedef && this.huy.saldir > 0.6 && !istek) { const h = this.hedef.h; if (h.canli && sFark(o.s, h.s) > 4) yanal = h.yanal + (h.yanal > 0 ? -2.5 : 2.5); }
    // Öndeki at: aynı şeritteyse yana açıl
    for (const d of mac.oyuncular.values()) {
      if (d === o || !d.canli) continue;
      const ileri = sFark(o.s, d.s), fark = d.yanal - yanal;
      if (ileri > 1 && ileri < 10 && Math.abs(fark) < 2.2) yanal = d.yanal + (fark >= 0 ? -2.4 : 2.4);
    }
    // Tuzaklar: mayın ve çividen kaç
    for (const m of mac.mayinlar) { if (m.sahip === o.id) continue; const q = pistNoktasi(o.s), ml = (m.x - q.x) * q.sx + (m.z - q.z) * q.sz, ileri = Math.hypot(m.x - o.x, m.z - o.z); if (ileri < 22 && Math.abs(ml - yanal) < 2.6) yanal = ml + (ml > 0 ? -3.2 : 3.2); }
    for (const c of mac.civiler) { if (c.sahip === o.id) continue; const ileri = sFark(o.s, c.s); if (ileri > 0 && ileri < 24 && Math.abs(c.yanal - yanal) < 4.5) yanal = c.yanal + (c.yanal > 0 ? -5 : 5); }
    yanal = Math.max(-yari, Math.min(yari, yanal));
    // Engeller: ilerideki engel şeridi kesiyorsa yanından geç; alçak çite yakınken atla
    this.zipla = false;
    for (const e of ENGELLER) {
      const ileri = sFark(o.s, e.s0); if (ileri < -e.boy - 1 || ileri > 26) continue;
      if (yanal > e.a0 - 1.4 && yanal < e.a1 + 1.4) {
        const pe = pistNoktasi(e.s0), ey = pe.w / 2 - AT.kenarPay - 0.3;
        const sol = e.a0 - 1.6, sag = e.a1 + 1.6, solOlur = sol > -ey, sagOlur = sag < ey;
        if (e.h < 1.2 && ileri > 0.14 * o.hiz + 0.3 && ileri < 0.14 * o.hiz + 1.5 && Math.abs(o.yanal - (e.a0 + e.a1) / 2) < (e.a1 - e.a0) / 2 + 1) this.zipla = true;
        else if (e.h >= 1.2 || r() < 0.98) yanal = solOlur && (!sagOlur || Math.abs(yanal - sol) < Math.abs(yanal - sag)) ? sol : sagOlur ? sag : yanal;
      }
    }
    const bak = 8 + o.hiz * 0.55, h = dunya(o.u + bak, yanal), dx = h.x - o.x, dz = h.z - o.z, u = Math.hypot(dx, dz) || 1;
    // Dörtnala: huya göre; tehdit altındaysa hep
    if ((this.dortT -= dt) <= 0) { this.dortT = 1.5 + r() * 3; this.dort = r() < this.huy.dortnala; }
    const tehdit = o.sonSaldiran != null && mac.z - o.sonSaldiranZ < 4;
    // Pusucu yavaş ilerler (W'yi ara ara bırakır)
    const dur = this.huy.hiz < 1 && !tehdit && this.hedef == null && r() < (1 - this.huy.hiz) * 0.5;
    // Bakış: hedef varsa ona, yoksa yola
    const bakYon = this.hedef ? Math.atan2(-(this.hedef.h.x - o.x), -(this.hedef.h.z - o.z)) : Math.atan2(-dx, -dz) + this.bakisHedef;
    if (!this.hedef && r() < dt * 0.3) this.bakisHedef = (r() - 0.5) * 1.6;
    o.bakis = aci(o.bakis + aci(bakYon - o.bakis) * Math.min(1, dt * 6));
    return { yx: dur ? 0 : dx / u, yz: dur ? 0 : dz / u, dortnala: (this.dort || tehdit) && (o.dayanim > 15 || !o.yorgun), zipla: this.zipla };
  }

  /** Atış ve savunma kararları (sürüşten sonra). */
  eylem() {
    const o = this.o, mac = this.mac, r = this.r, Z = this.Z;
    // Hedef: ara ara yeniden seç
    if (!this.hedef || !this.hedef.h.canli || r() < 0.03) {
      const y = this.hedefSec();
      if (y?.h !== this.hedef?.h) this.kilitZ = mac.z + Z.tepki * (0.7 + r() * 0.6);
      this.hedef = y;
    } else this.hedef.d = Math.hypot(this.hedef.h.x - o.x, this.hedef.h.z - o.z);
    // Savunma
    this.savunma();
    const t = this.hedef; if (!t || mac.z < this.kilitZ) return;
    const silah = this.silahSec(t.d, t.ileri ?? sFark(o.s, t.h.s)); if (silah < 0) return;
    const S = SALDIRI[silah];
    if (mac.z - o.sonAtis[silah] < S.aralik * Z.ates || (S.menzil && t.d > S.menzil * 0.95)) return;
    // Nişan: hedefin göğsüne (kısa öngörüyle), zorluğa ve kendi hızına göre sapmalı
    const h = t.h, onc = S.id === 'tufek' ? 0.05 : 0.1, gx = h.x - Math.sin(h.yaw) * h.hiz * onc, gz = h.z - Math.cos(h.yaw) * h.hiz * onc;
    const b = [o.x, o.y + GOZ, o.z];
    let d = [gx - b[0], h.y + 1.7 - b[1], gz - b[2]];
    if (S.id === 'dinamit') { const yatay = Math.hypot(d[0], d[2]); d[1] = yatay * 0.35 - 2; }
    const dl = Math.hypot(...d); d = d.map(v => v / dl);
    d = saptir(d, Z.sapma * (1 + o.hiz / 15) * (0.6 + r() * 0.8), r);
    o.bakis = Math.atan2(-d[0], -d[2]); o.pitch = Math.asin(Math.max(-1, Math.min(1, d[1])));
    if (o.salSec !== silah) o.salSec = silah;
    mac.ates(o, { s: silah, b, d, r: (r() * 2 ** 31) | 0 });
  }
  silahSec(d, ileri) {
    const o = this.o, var_ = id => o.sal[SALDIRI_NO[id]] > 0, r = this.r;
    if (var_('cifte') && d < 15) return SALDIRI_NO.cifte;
    if (var_('kement') && d > 6 && d < 18 && ileri > 0 && this.huy.saldir > 0.6 && r() < 0.05) return SALDIRI_NO.kement;
    if (var_('dinamit') && d > 9 && d < 28 && r() < 0.04) return SALDIRI_NO.dinamit;
    if (var_('tufek') && d > 25) return SALDIRI_NO.tufek;
    if (var_('tabanca') && d < 60) return SALDIRI_NO.tabanca;
    if (var_('tufek')) return SALDIRI_NO.tufek;
    if (var_('cifte') && d < 22) return SALDIRI_NO.cifte;
    return -1;
  }
  savunma() {
    const o = this.o, mac = this.mac, r = this.r, Z = this.Z, var_ = id => o.sav[SAVUNMA_NO[id]] > 0, kullan = id => { o.savSec = SAVUNMA_NO[id]; mac.savun(o, { s: SAVUNMA_NO[id] }); this.tuzakZ = mac.z; };
    if (mac.z - this.tuzakZ < 1.2 || r() > Z.savunma) return;
    if (var_('mahmuz') && (o.bagT > 0 || (o.can < 35 && mac.z - o.sonSaldiranZ < 2))) return kullan('mahmuz');
    if (var_('yelek') && o.zirh <= 0 && (o.can < 75 || mac.z - o.sonSaldiranZ < 3)) return kullan('yelek');
    // Peşimdeki: 4–25 blok gerimde, yaklaşan biri
    let pesimde = null;
    for (const h of mac.oyuncular.values()) { if (h === o || !h.canli) continue; const g = sFark(h.s, o.s); if (g > 4 && g < 25 && Math.abs(h.yanal - o.yanal) < 6) { pesimde = h; break; } }
    if (!pesimde || r() > this.huy.tuzak * 0.04) return;
    const vurdu = o.sonSaldiran === pesimde.id && mac.z - o.sonSaldiranZ < 5;
    if (var_('duman') && vurdu) return kullan('duman');
    if (var_('mayin')) return kullan('mayin');
    if (var_('civi')) return kullan('civi');
    if (var_('duman') && r() < 0.3) return kullan('duman');
  }
}
