// Uji beban Lawan Monster: N pemain virtual mengetuk selama D detik + pemantau GET.
// Pakai: node tools/uji-beban-monster.cjs <base-url> [pemain=300] [detik=20] [pemantau=pemain]
// Lokal: jalankan tools/dev-server.cjs, seed {"kata": N} (email w0..wN-1@mail.com = peserta festival), mulai event, lalu jalankan skrip ini.
// Produksi: pemain harus peserta festival asli (email di tab Satu Kata), jadi uji beban produksi butuh data uji; batas perangkat baru 300/10 menit per IP.
const [base = 'http://127.0.0.1:8787', nPemain = '300', detik = '20', nPantau] = process.argv.slice(2);
const N = Number(nPemain), D = Number(detik) * 1000, P = nPantau == null ? N : Number(nPantau);
const lat = [], galat = {};
let req = 0, diterima = 0, dikirim = 0;
const jalan = (ms) => new Promise((r) => setTimeout(r, ms));
async function panggil(method, body, ip) {
  const t0 = performance.now();
  req++;
  try {
    const r = await fetch(base + '/api/monster', {method, headers: {'Content-Type': 'application/json', 'X-Forwarded-For': ip}, body: body && JSON.stringify(body)});
    const d = await r.json();
    lat.push(performance.now() - t0);
    if (!d.ok) galat[d.error] = (galat[d.error] || 0) + 1;
    return d;
  } catch (e) { galat[e.name] = (galat[e.name] || 0) + 1; return {}; }
}
async function pemain(i, akhir, id) {
  const ip = `10.${(i >> 8) & 255}.${i & 255}.${(i * 7) & 255}`;
  const m = await panggil('POST', {aksi: 'masuk', perangkat: 'uji-beban-perangkat-' + String(i).padStart(6, '0'), email: `w${i}@mail.com`}, ip);
  if (!m.token) return;
  let seq = 0, iv = 1000;
  await jalan(Math.random() * 1000);
  while (Date.now() < akhir) {
    const n = 4 + Math.floor(Math.random() * 6); // 4–9 tap per detik, seperti jari manusia
    dikirim += n;
    const d = await panggil('POST', {aksi: 'tap', token: m.token, n, seq: ++seq, e: id}, ip);
    if (d.ok) { diterima += d.terima; iv = (d.status && d.status.interval) || iv; }
    await jalan(iv);
  }
}
async function pemantau(akhir) {
  while (Date.now() < akhir) { await panggil('GET', null, '10.255.0.1'); await jalan(2500); }
}
(async () => {
  const awal = await (await fetch(base + '/api/monster')).json();
  if (awal.fase !== 'tanding') { console.error('Event belum berjalan (fase ' + awal.fase + '). Mulai dulu lewat admin.'); process.exit(1); }
  const akhir = Date.now() + D, t0 = Date.now();
  await Promise.all([...Array.from({length: N}, (_, i) => pemain(i, akhir, awal.id)), ...Array.from({length: P}, () => pemantau(akhir))]);
  await jalan(500);
  const st = await (await fetch(base + '/api/monster', {headers: {'Cache-Control': 'no-cache'}})).json();
  lat.sort((a, b) => a - b);
  const q = (p) => Math.round(lat[Math.min(lat.length - 1, Math.floor(lat.length * p))] || 0);
  const dtk = (Date.now() - t0) / 1000;
  console.log(JSON.stringify({pemain: N, pemantau: P, detik: Math.round(dtk), permintaan: req, perDetik: Math.round(req / dtk), latensiMs: {p50: q(0.5), p95: q(0.95), p99: q(0.99)},
    galat, tapDikirim: dikirim, tapDiterimaServer: diterima, totalSebelum: awal.total, totalSesudah: st.total, level: st.level, fase: st.fase}, null, 1));
})();
