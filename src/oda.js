// Oda: bir maçı (Mac) istemcilere bağlar. Botlu oyunda tarayıcı kendi içinde bir Oda kurar ve tek istemcisi olur;
// sunucuda her çevrim içi oda bir Oda'dır (aynı mesajlar). İstemci: gonder(mesaj) işlevi.
import { Mac } from './mac.js';
import { avatarDuzelt, adDuzelt } from './avatar-veri.js';

export class Oda {
  constructor({ id = 0, ad = 'Oda', kisi, rastgele, sure, zorluk = 'orta', ozel = false, kod = null } = {}) {
    this.id = id; this.ad = ad; this.ozel = ozel; this.kod = kod;
    this.mac = new Mac({ kisi, rastgele, sure, zorluk });
    this.mac.botlariDuzenle(); this.mac.olaylar.length = 0;
    this.istemciler = new Map(); this.sonEnv = new Map();
  }
  get insanSayisi() { return this.istemciler.size; }
  katil(gonder, ad, avatar) {
    const o = this.mac.insanEkle(adDuzelt(ad) || 'Binici', avatarDuzelt(avatar));
    this.istemciler.set(o.id, gonder);
    gonder({ t: 'hosgeldin', id: o.id, oda: this.ad, kod: this.kod, ozel: this.ozel, z: this.mac.z, kisi: this.mac.kisi, zorluk: this.mac.zorluk });
    this.mac.listeYolla(); this.mac.dogusYolla(o);
    this.dagit();
    return o.id;
  }
  ayril(id) { if (!this.istemciler.delete(id)) return; this.sonEnv.delete(id); this.mac.cikar(id); this.dagit(); }
  mesaj(id, m) {
    const o = this.mac.oyuncular.get(id); if (!o || !m || typeof m !== 'object') return;
    if (m.t === 'k') this.mac.konum(o, m);
    else if (m.t === 'ates') this.mac.ates(o, m);
    else if (m.t === 'savun') this.mac.savun(o, m);
    else if (m.t === 'sec') this.mac.silahSec(o, m.s | 0);
    else if (m.t === 'vsec') this.mac.savunmaSec(o, m.s | 0);
  }
  adim(dt) {
    this.mac.adim(dt);
    this.dagit();
    const s = this.mac.ozet();
    for (const [id, g] of this.istemciler) {
      g(s);
      // Eşya listesi yalnız değişince
      const o = this.mac.oyuncular.get(id); if (!o) continue;
      const e = this.mac.envanter(o), k = JSON.stringify(e);
      if (this.sonEnv.get(id) !== k) { this.sonEnv.set(id, k); g(e); }
    }
  }
  dagit() {
    for (const { kime, m } of this.mac.olaylar) {
      if (kime == null) for (const g of this.istemciler.values()) g(m);
      else if (kime > 0) this.istemciler.get(kime)?.(m);
      else for (const [id, g] of this.istemciler) if (id !== -kime) g(m);
    }
    this.mac.olaylar.length = 0;
  }
}
