import http from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { WebSocketServer } from 'ws';
import { createRooms } from './server/odalar.mjs';

/**
 * Tek süreç, tek port: statik dosyalar (oyun) + WebSocket (çevrim içi odalar; server/odalar.mjs).
 * Cloudflare Tunnel bu portu karanal-sunucu.josephuz.com'a bağlar; oyun dosyaları Cloudflare'deki statik siteden
 * (karanal.josephuz.com, wrangler.jsonc) gelir ve tarayıcı bu adrese bağlanır. Yerelde sayfa da buradan açılır.
 * Proje klasörü ve three.js paketi dışında dosya verilmez; three /vendor/ altından node_modules'tan gelir.
 */
const root = path.dirname(fileURLToPath(import.meta.url));
const vendorDir = path.join(root, 'node_modules', 'three', 'build');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const rootFiles = ['index.html', 'style.css'];
const noStore = 'no-store, no-cache, must-revalidate, max-age=0';

async function buildStamp() {
  let newest = 0;
  const walk = async dir => { let l = []; try { l = await readdir(dir, { withFileTypes: true }); } catch { return; } for (const d of l) { const f = path.join(dir, d.name); if (d.isDirectory()) await walk(f); else if (/\.(js|mjs|css|html)$/.test(d.name)) { try { newest = Math.max(newest, (await stat(f)).mtimeMs); } catch { /* yok */ } } } };
  for (const f of rootFiles) { try { newest = Math.max(newest, (await stat(path.join(root, f))).mtimeMs); } catch { /* yok */ } }
  await walk(path.join(root, 'src')); await walk(path.join(root, 'server'));
  return new Date(newest).toISOString();
}
let stamp = 'bilinmiyor';

function resolveFile(pathname) {
  if (pathname === '/') pathname = '/index.html';
  const rel = path.normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  if (rel.includes('..')) return null;
  if (/^vendor[/\\]/.test(rel)) { const f = path.join(vendorDir, path.basename(rel)); return f.startsWith(vendorDir) ? f : null; }
  if (rootFiles.includes(rel) || /^(src|img)[/\\]/.test(rel)) { const f = path.join(root, rel); return f.startsWith(root) ? f : null; }
  return null;
}

// KOSU_SURE (sn): denemede kısa koşu (varsayılan ayar.js MAC.sure).
const rooms = createRooms({ sure: Number(process.env.KOSU_SURE) || undefined, log: (...a) => console.log(new Date().toLocaleTimeString('tr-TR'), ...a) });
const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/health') { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': noStore, 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify({ oyun: 'kara-nal', ...rooms.stats(), surum: stamp })); return; }
  const file = resolveFile(pathname), type = file && types[path.extname(file)];
  if (!type) { res.writeHead(404); res.end('Bulunamadı'); return; }
  try { const body = await readFile(file); res.writeHead(200, { 'Content-Type': type, 'Cache-Control': noStore }); res.end(body); }
  catch { res.writeHead(404); res.end('Bulunamadı'); }
});
/** WebSocket yalnız bilinen sayfalardan: aynı adres, *.josephuz.com, localhost. Origin'siz istemciler (testler) kabul. */
function allowedOrigin(req) {
  const origin = req.headers.origin; if (!origin) return true;
  try { const u = new URL(origin); return u.host === req.headers.host || u.hostname === 'josephuz.com' || u.hostname.endsWith('.josephuz.com') || u.hostname === 'localhost' || u.hostname === '127.0.0.1'; } catch { return false; }
}
const wss = new WebSocketServer({ server, maxPayload: 16 * 1024, verifyClient: ({ req }) => allowedOrigin(req) });
wss.on('connection', ws => rooms.attach(ws));
wss.on('error', () => {});
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { console.log(sig + ': kapanıyor.'); wss.close(); server.close(); process.exit(0); });

const host = process.env.HOST || '127.0.0.1', port = Number(process.env.PORT || 5220), shouldOpen = process.argv.includes('--open');
function ready(actual) {
  const url = 'http://127.0.0.1:' + actual;
  console.log('Kara Nal: ' + url);
  if (shouldOpen && process.platform === 'win32') spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', `Start-Process '${url}'`], { windowsHide: true, stdio: 'ignore' }).on('error', () => {});
}
server.on('listening', () => ready(server.address().port));
server.on('error', async error => {
  if (error.code !== 'EADDRINUSE') { console.error(error.message); process.exitCode = 1; return; }
  try { const r = await fetch('http://127.0.0.1:' + port + '/health', { signal: AbortSignal.timeout(1500) }); if ((await r.json()).oyun === 'kara-nal') { ready(port); process.exit(0); } } catch { /* başka bir sunucu */ }
  server.listen(0, host);
});
stamp = await buildStamp();
server.listen(port, host);
