// Binici + at: Juland kutu karakteri (avatar-veri.js tarifi) atın sırtında, Juland atModeli oranlarında kutu at.
// Grup kökü yerde, −z yönüne (atın gidişine) bakar. Binicinin gövdesi bakış (nişan) yönüne döner: at sola koşarken
// binici sağa ateş edebilir. Sağ elde tabanca (Faz 1'de eldeki silah).
import * as T from 'three';
import { avatarDuzelt } from './avatar-veri.js';

const kup = new T.BoxGeometry(1, 1, 1), malzemeler = new Map();
const mat = c => { if (!malzemeler.has(c)) malzemeler.set(c, new T.MeshLambertMaterial({ color: c })); return malzemeler.get(c); };
function kutu(g, c, x, y, z, sx, sy, sz, golge = true) { const m = new T.Mesh(kup, mat(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = golge; g.add(m); return m; }
const koyu = (hex, k) => '#' + new T.Color(hex).multiplyScalar(k).getHexString();
const aci = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

/** Kutu at: sırtı ~1,3 yükseklikte. Bacaklar dörtnala döngüsüyle sallanır. */
function atModeli([renk, yele]) {
  const g = new T.Group(), govde = new T.Group(); g.add(govde);
  kutu(govde, renk, 0, 1.08, 0, 0.66, 0.56, 1.6);
  const boyun = new T.Group(); boyun.position.set(0, 1.26, -0.7); boyun.rotation.x = -0.55; govde.add(boyun);
  kutu(boyun, renk, 0, 0.34, -0.05, 0.32, 0.7, 0.36); kutu(boyun, yele, 0, 0.38, 0.15, 0.09, 0.7, 0.1);
  const bas = new T.Group(); bas.position.set(0, 0.7, -0.08); bas.rotation.x = 0.9; boyun.add(bas);
  kutu(bas, renk, 0, 0.05, -0.22, 0.28, 0.28, 0.6); kutu(bas, koyu(renk, 0.75), 0, 0.02, -0.5, 0.26, 0.2, 0.08);
  for (const s of [-1, 1]) { kutu(bas, '#1a1512', s * 0.145, 0.1, -0.2, 0.02, 0.06, 0.06, false); kutu(bas, renk, s * 0.08, 0.26, 0.02, 0.06, 0.15, 0.06); }
  kutu(bas, '#3b2414', 0, 0.05, -0.36, 0.3, 0.05, 0.05, false); // gem kayışı
  const kuyruk = new T.Group(); kuyruk.position.set(0, 1.22, 0.8); govde.add(kuyruk);
  kutu(kuyruk, yele, 0, -0.28, 0.06, 0.12, 0.6, 0.14);
  const bacak = [[-0.21, -0.6], [0.21, -0.6], [-0.21, 0.6], [0.21, 0.6]].map(([x, z]) => {
    const l = new T.Group(); l.position.set(x, 0.86, z); govde.add(l);
    kutu(l, renk, 0, -0.38, 0, 0.17, 0.78, 0.19); kutu(l, '#2a2622', 0, -0.8, 0, 0.19, 0.1, 0.21); return l;
  });
  kutu(govde, '#5a3a24', 0, 1.39, 0.02, 0.68, 0.07, 0.56); kutu(govde, '#7a2a1c', 0, 1.37, 0.02, 0.7, 0.03, 0.6, false); // eyer + örtü
  for (const s of [-1, 1]) kutu(govde, '#5a3a24', s * 0.36, 1.05, 0.02, 0.03, 0.55, 0.06, false); // üzengi kayışı
  return { g, govde, boyun, kuyruk, bacak };
}

/** Eldeki saldırı silahları (namlu −z, kabza başta). Sıra ayar.js SALDIRI ile aynı. uc: namlu ağzı. */
export function silahModeli(i) {
  const g = new T.Group(), demir = '#2e3136', koyuD = '#1d1f23', ahsap = '#6b4a28';
  let uc = -0.4;
  if (i === 0) { // tabanca
    kutu(g, demir, 0, 0.03, -0.12, 0.07, 0.09, 0.28); kutu(g, koyuD, 0, 0.05, -0.32, 0.04, 0.04, 0.16); kutu(g, ahsap, 0, -0.07, 0.0, 0.06, 0.16, 0.08).rotation.x = 0.35; kutu(g, '#8a8f96', 0, 0.03, -0.1, 0.09, 0.08, 0.09);
  } else if (i === 1) { // çifte
    for (const s of [-1, 1]) kutu(g, koyuD, s * 0.025, 0.04, -0.35, 0.045, 0.045, 0.62); kutu(g, ahsap, 0, 0.0, 0.08, 0.08, 0.12, 0.34); kutu(g, ahsap, 0, 0.0, -0.16, 0.09, 0.07, 0.2); uc = -0.66;
  } else if (i === 2) { // tüfek
    kutu(g, koyuD, 0, 0.04, -0.45, 0.04, 0.04, 0.8); kutu(g, ahsap, 0, 0.0, 0.1, 0.07, 0.12, 0.36); kutu(g, ahsap, 0, 0.0, -0.3, 0.06, 0.06, 0.46); kutu(g, '#a88a3a', 0, -0.06, -0.04, 0.05, 0.04, 0.14); uc = -0.85;
  } else if (i === 3) { // kement: halka halka ip
    for (let k = 0; k < 4; k++) kutu(g, '#c9a66b', 0, 0, -0.1 - k * 0.04, 0.42 - k * 0.04, 0.04, 0.42 - k * 0.04).rotation.y = k * 0.3; uc = -0.1;
  } else if (i === 4) { // dinamit demeti
    for (const [x, y] of [[-0.05, 0], [0.05, 0], [0, 0.07]]) kutu(g, '#b8322a', x, y, -0.1, 0.07, 0.07, 0.3); kutu(g, '#e8dcc0', 0, 0.04, -0.27, 0.02, 0.02, 0.06); uc = -0.3;
  }
  g.userData.uc = uc; return g;
}

/** Binici + at. tarif: avatar; atRenk: [gövde, yele]. */
export function biniciModeli(tarif, atRenk) {
  const a = avatarDuzelt(tarif), grup = new T.Group(), at = atModeli(atRenk);
  grup.add(at.g);
  const binici = new T.Group(); binici.position.set(0, 1.42, 0.05); at.govde.add(binici);
  const ten = a.ten, ustR = a.ustRenk, ust = a.ust === 'zirh' ? '#8d939a' : ustR, alt = a.altRenk, ayak = '#2a2622';
  // Bacaklar ata ata biner: kalçadan öne ve yana açık, dizden aşağı
  for (const s of [-1, 1]) {
    const b = new T.Group(); b.position.set(s * 0.15, 0.02, 0); b.rotation.set(0.7, 0, s * 0.5); binici.add(b);
    kutu(b, alt, 0, -0.22, 0, 0.24, 0.46, 0.26);
    const diz = new T.Group(); diz.position.set(0, -0.44, 0); diz.rotation.x = -1.05; b.add(diz);
    kutu(diz, alt, 0, -0.18, 0, 0.23, 0.38, 0.25); kutu(diz, ayak, 0, -0.4, -0.04, 0.25, 0.14, 0.32);
  }
  // Gövde: belden bakış yönüne döner
  const gov = new T.Group(); gov.position.y = 0.05; binici.add(gov);
  kutu(gov, ust, 0, 0.32, 0, 0.52, 0.66, 0.28);
  kutu(gov, koyu(alt, 0.7), 0, 0.02, 0, 0.54, 0.08, 0.3);
  kutu(gov, '#4a3020', 0, 0.06, 0, 0.56, 0.06, 0.32, false); // kemer
  if (a.ust === 'ceket') kutu(gov, koyu(ustR, 0.65), 0, 0.34, -0.142, 0.07, 0.6, 0.01);
  if (a.ust === 'zirh') kutu(gov, ustR, 0, 0.4, -0.145, 0.34, 0.34, 0.02);
  if (a.ust === 'cubbe') kutu(gov, ustR, 0, 0.0, 0.02, 0.56, 0.3, 0.34);
  const kollar = [-1, 1].map(s => {
    const k = new T.Group(); k.position.set(s * 0.36, 0.6, 0); gov.add(k);
    kutu(k, a.ust === 'tisort' ? ten : ust, 0, -0.28, 0, 0.19, 0.56, 0.22);
    if (a.ust === 'tisort') kutu(k, ustR, 0, -0.1, 0, 0.21, 0.22, 0.24);
    kutu(k, ten, 0, -0.6, 0, 0.18, 0.12, 0.2);
    return k;
  });
  let silah = null, silahNo = -2;
  const silahTak = i => {
    if (i === silahNo) return; silahNo = i;
    if (silah) kollar[1].remove(silah);
    silah = i >= 0 ? silahModeli(i) : null;
    if (silah) { silah.position.set(0, -0.62, -0.04); silah.rotation.x = -Math.PI / 2; kollar[1].add(silah); }
  };
  // Çelik yelek (zırh varken) ve aranan işareti (başının üstünde dönen altın yıldız)
  const yelek = new T.Group(); gov.add(yelek); kutu(yelek, '#8d939a', 0, 0.36, -0.15, 0.48, 0.46, 0.03); kutu(yelek, '#8d939a', 0, 0.36, 0.15, 0.48, 0.46, 0.03); kutu(yelek, '#5d6268', 0, 0.36, -0.165, 0.2, 0.2, 0.01, false); yelek.visible = false;
  const aranan = new T.Mesh(new T.OctahedronGeometry(0.22, 0), new T.MeshBasicMaterial({ color: '#ffcf5a' })); aranan.position.set(0, 3.25, 0); aranan.visible = false; grup.add(aranan);
  const bas = new T.Group(); bas.position.set(0, 0.64, 0); gov.add(bas);
  kutu(bas, ten, 0, 0.21, 0, 0.42, 0.42, 0.42);
  for (const s of [-1, 1]) { kutu(bas, '#24211f', s * 0.09, 0.23, -0.212, 0.07, 0.08, 0.01, false); kutu(bas, '#ffffff', s * 0.108, 0.245, -0.214, 0.025, 0.03, 0.005, false); }
  kutu(bas, koyu(ten, 0.78), 0, 0.12, -0.212, 0.1, 0.025, 0.01, false);
  const sac = a.sacRenk;
  if (a.sac !== 'kel') {
    kutu(bas, sac, 0, 0.41, 0, 0.45, 0.08, 0.46); kutu(bas, sac, 0, 0.28, 0.2, 0.44, 0.28, 0.06);
    for (const s of [-1, 1]) kutu(bas, sac, s * 0.215, 0.3, 0.07, 0.03, 0.16, 0.3);
    if (a.sac === 'uzun') { kutu(bas, sac, 0, 0.04, 0.2, 0.44, 0.44, 0.07); for (const s of [-1, 1]) kutu(bas, sac, s * 0.215, 0.1, 0.1, 0.03, 0.36, 0.22); }
    if (a.sac === 'atkuyrugu') { kutu(bas, sac, 0, 0.3, 0.26, 0.12, 0.1, 0.1); kutu(bas, sac, 0, 0.1, 0.3, 0.11, 0.32, 0.1).rotation.x = 0.25; }
  }
  // Kara Nal'da herkes geniş kenarlı şapka takar (kovboy); rengi avatarın şapka rengi, şapkasızlarda koyu kahve.
  const sr = a.sapka === 'yok' ? '#4a3424' : a.sapkaRenk;
  kutu(bas, sr, 0, 0.44, 0, 0.74, 0.04, 0.7); kutu(bas, sr, 0, 0.55, 0, 0.44, 0.2, 0.42); kutu(bas, koyu(sr, 0.55), 0, 0.47, 0, 0.45, 0.05, 0.43);
  for (const s of [-1, 1]) kutu(bas, sr, s * 0.35, 0.48, 0, 0.06, 0.06, 0.68); // kalkık kenar
  if (a.aksesuar === 'atki') { kutu(gov, '#b8432c', 0, 0.63, 0, 0.46, 0.1, 0.34); kutu(gov, '#b8432c', 0.12, 0.46, -0.16, 0.1, 0.28, 0.04); }
  if (a.aksesuar === 'pelerin') { const p = kutu(gov, a.sapkaRenk, 0, 0.2, 0.18, 0.54, 0.86, 0.035); p.rotation.x = 0.2; }

  let faz = 0, tepme = 0, parla = 0, olu = 0, dusYon = 1, sahlan = 0;
  const kirmizilar = new Map();
  return {
    grup, bas,
    /** Namlu ağzının dünya konumu. */
    namlu(v) { if (!silah) return v.set(0, 2.1, -0.4).applyMatrix4(grup.matrixWorld); v.set(0, 0.05, silah.userData.uc).applyMatrix4(silah.matrixWorld); return v; },
    silah: silahTak,
    /** bit: 256 aranan, 512 zırhlı. */
    ekler(bit) { yelek.visible = !!(bit & 512); aranan.visible = !!(bit & 256) && !!(bit & 1); if (aranan.visible) aranan.rotation.y += 0.05; },
    ates() { tepme = 1; },
    vuruldu() {
      if (parla <= 0) grup.traverse(m => { if (m.isMesh && m.material?.color) { if (!kirmizilar.has(m.material)) { const k = m.material.clone(); k.emissive = new T.Color(0.9, 0.1, 0.05); kirmizilar.set(m.material, k); } m.userData.asil = m.material; m.material = kirmizilar.get(m.material); } });
      parla = 0.12;
    },
    /** hiz: blok/sn; bakisFark: bakış − atın yönü (rad); pitch; bit: 1 canlı, 2 yerde, 4 dörtnala, 8 şaha kalkmış. */
    guncelle(dt, hiz, bakisFark, pitch, bit) {
      if (parla > 0 && (parla -= dt) <= 0) grup.traverse(m => { if (m.userData.asil) { m.material = m.userData.asil; delete m.userData.asil; } });
      const canli = !!(bit & 1), havada = !(bit & 2);
      if (!canli) { // Faz 1: binici attan düşer
        if (olu === 0) dusYon = Math.random() < 0.5 ? -1 : 1;
        olu = Math.min(1, olu + dt * 2.6); binici.rotation.z = dusYon * olu * olu * 1.4; binici.position.x = dusYon * olu * 0.8;
        return;
      }
      if (olu) { olu = 0; binici.rotation.set(0, 0, 0); binici.position.x = 0; }
      // Dörtnala döngüsü: ön ve arka bacak çiftleri karşılıklı, hız arttıkça sıklaşır
      const oran = Math.min(1, hiz / 15); faz += dt * (3 + hiz * 0.75);
      const genlik = havada ? 0 : Math.min(1, hiz / 5) * (0.5 + oran * 0.35);
      const [onSol, onSag, arkaSol, arkaSag] = at.bacak;
      onSol.rotation.x = Math.sin(faz) * genlik; onSag.rotation.x = Math.sin(faz + 0.5) * genlik;
      arkaSol.rotation.x = Math.sin(faz + Math.PI) * genlik; arkaSag.rotation.x = Math.sin(faz + Math.PI + 0.5) * genlik;
      if (havada) { onSol.rotation.x = onSag.rotation.x = -0.7; arkaSol.rotation.x = arkaSag.rotation.x = 0.6; }
      // Şaha kalkma: at arka ayakları üstünde dikilir
      sahlan += (((bit & 8) ? 1 : 0) - sahlan) * Math.min(1, dt * 8);
      at.govde.rotation.x = sahlan * 0.75; at.govde.position.set(0, Math.abs(Math.sin(faz)) * 0.09 * genlik + sahlan * 0.55, sahlan * 0.35);
      if (sahlan > 0.05) { onSol.rotation.x = onSag.rotation.x = -1.1 * sahlan + Math.sin(faz * 2) * 0.3; }
      at.boyun.rotation.x = -0.55 + Math.sin(faz) * 0.08 * genlik - sahlan * 0.3;
      at.kuyruk.rotation.x = 0.3 + oran * 0.6 + Math.sin(faz * 2) * 0.08;
      // Binici: gövde bakışa döner (en çok ±125°), baş artanı tamamlar; kollar nişanın eğimine
      const f = aci(bakisFark), donus = Math.max(-2.2, Math.min(2.2, f));
      gov.rotation.y = donus; bas.rotation.y = Math.max(-0.7, Math.min(0.7, f - donus));
      gov.rotation.x = -oran * 0.18; // dörtnalada öne eğilir
      binici.position.y = 1.42 - Math.abs(Math.cos(faz)) * 0.05 * genlik;
      const p = Math.max(-1.2, Math.min(1.2, pitch)) - gov.rotation.x;
      tepme = Math.max(0, tepme - dt * 9);
      if (silah) kollar[1].rotation.set(Math.PI / 2 + p + tepme * 0.35, 0, 0); else kollar[1].rotation.set(0.9 - Math.sin(faz) * 0.1 * genlik, 0, -0.15);
      kollar[0].rotation.set(0.9 + Math.sin(faz) * 0.1 * genlik, 0, 0.15); // sol el dizginde
      bas.rotation.x = p * 0.6;
    },
  };
}
