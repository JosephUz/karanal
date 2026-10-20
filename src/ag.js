// Bağlantı: botlu oyun (tarayıcıdaki Oda, gecikmesiz) ya da çevrim içi (WebSocket). İkisi de aynı yüzü verir:
// gonder(m), al() → gelen mesajlar, kapat(). Yerelde adim(dt) odayı ilerletir.
import { Oda } from './oda.js';
import { SERVER } from './config.js';

export function yerelBaglanti({ ad, avatar, sure, zorluk }) {
  const oda = new Oda({ ad: 'Botlu koşu', sure, zorluk }), kuyruk = [];
  const id = oda.katil(m => kuyruk.push(m), ad, avatar);
  return { yerel: true, oda, gonder: m => oda.mesaj(id, m), al: () => kuyruk.splice(0), adim: dt => oda.adim(dt), kapat() {} };
}

/** Sunucu adresi: sayfa sunucunun kendisinden açıldıysa (yerelde) aynı adres, yoksa config.js → SERVER. */
export function sunucuAdresi() {
  const h = location.hostname, kendi = h === SERVER || h === 'localhost' || /^[\d.]+$|^\[/.test(h);
  const p = new URLSearchParams(location.search).get('sunucu');
  if (p) return p;
  return kendi ? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}` : 'wss://' + SERVER;
}

/** Çevrim içi bağlantı. olay(tur): 'acik' | 'kapali'. */
export function sunucuBaglanti(olay) {
  const kuyruk = []; let ws = null, acik = false, kapandi = false;
  try { ws = new WebSocket(sunucuAdresi()); } catch { setTimeout(() => olay('kapali')); return { yerel: false, gonder() {}, al: () => [], kapat() {}, get acik() { return false; } }; }
  ws.onopen = () => { acik = true; olay('acik'); };
  ws.onclose = ws.onerror = () => { if (kapandi) return; kapandi = true; acik = false; olay('kapali'); };
  ws.onmessage = e => { try { kuyruk.push(JSON.parse(e.data)); } catch { /* bozuk */ } };
  return {
    yerel: false,
    get acik() { return acik; },
    gonder(m) { if (acik && ws.readyState === 1) ws.send(JSON.stringify(m)); },
    al: () => kuyruk.splice(0),
    kapat() { kapandi = true; try { ws.close(); } catch { /* yok */ } },
  };
}
