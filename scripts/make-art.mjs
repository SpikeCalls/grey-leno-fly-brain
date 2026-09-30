// Regenerates the README art from real simulations:  node scripts/make-art.mjs
//   assets/banner.svg  — animated hero banner (stylised brain point cloud, pulsing spikes)
//   assets/raster.svg  — a real spike raster from the toy LIF brain hit by a "rotten tomato"
import { writeFileSync } from 'node:fs';
import { rng, LIFNetwork, toyFlyBrain } from '../src/lif.js';

const R = rng(138639);
const g = () => Math.sqrt(-2 * Math.log(R() || 1e-9)) * Math.cos(2 * Math.PI * R());

// ---------------------------------------------------------------- banner
const W = 1280, H = 420;
const regions = [
  { c: [920, 215], r: [150, 95], n: 520, col: '#ffb84d' },    // central brain
  { c: [690, 215], r: [80, 125], n: 300, col: '#6ff3e2', shell: 1 }, // optic lobe L
  { c: [1150, 215], r: [80, 125], n: 300, col: '#6ff3e2', shell: 1 }, // optic lobe R
  { c: [860, 150], r: [30, 24], n: 70, col: '#fff3e0' },      // mushroom body calyces
  { c: [980, 150], r: [30, 24], n: 70, col: '#fff3e0' },
  { c: [882, 250], r: [26, 22], n: 60, col: '#ff5a4a' },      // antennal lobes
  { c: [958, 250], r: [26, 22], n: 60, col: '#ff5a4a' },
  { c: [920, 318], r: [70, 36], n: 150, col: '#9ee7b0' },     // SEZ
];
let dots = '';
let k = 0;
for (const reg of regions) {
  for (let i = 0; i < reg.n; i++, k++) {
    let x = g(), y = g();
    const len = Math.hypot(x, y) || 1;
    const rad = reg.shell ? [0.97, 0.75, 0.5][(R() * 3) | 0] + g() * 0.04 : Math.sqrt(R());
    x = reg.c[0] + (x / len) * rad * reg.r[0];
    y = reg.c[1] + (y / len) * rad * reg.r[1];
    const spiking = R() < 0.14;
    const r = (0.9 + R() * 1.3).toFixed(1);
    if (spiking) {
      const d = (R() * 3).toFixed(2), dur = (1.6 + R() * 2.4).toFixed(2);
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${reg.col}" class="s" style="animation-delay:${d}s;animation-duration:${dur}s"/>`;
    } else {
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${reg.col}" opacity="${(0.25 + R() * 0.35).toFixed(2)}"/>`;
    }
  }
}
const banner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Grey Leno Fly Brain — 138,639 neurons, 15.1M connections">
<defs>
  <radialGradient id="spot" cx="68%" cy="45%" r="55%"><stop offset="0" stop-color="#3a1512"/><stop offset="1" stop-color="#110608"/></radialGradient>
  <linearGradient id="carpet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c1a17" stop-opacity="0"/><stop offset="1" stop-color="#7c1a17" stop-opacity=".75"/></linearGradient>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <style>
    .s{opacity:.15;animation-name:spike;animation-iteration-count:infinite;animation-timing-function:ease-out}
    @keyframes spike{0%{opacity:1}12%{opacity:.9}40%{opacity:.18}100%{opacity:.15}}
    .rec{animation:blink 1.4s steps(2) infinite}@keyframes blink{50%{opacity:.25}}
    text{font-family:Impact,"Arial Black","Helvetica Neue",Arial,sans-serif}
    .mono{font-family:"SFMono-Regular",Menlo,Consolas,monospace}
  </style>
</defs>
<rect width="${W}" height="${H}" fill="url(#spot)"/>
<rect y="${H - 140}" width="${W}" height="140" fill="url(#carpet)"/>
<g filter="url(#glow)">${dots}</g>
<g transform="translate(64 0)">
  <rect x="0" y="70" width="190" height="30" rx="3" fill="#d2332a" fill-opacity=".15" stroke="#d2332a"/>
  <circle class="rec" cx="18" cy="85" r="5" fill="#d2332a"/>
  <text x="32" y="91" class="mono" font-size="14" fill="#f4e8dc" letter-spacing="3" style="font-family:monospace">ON AIR · EP 1</text>
  <text x="0" y="178" font-size="84" fill="#7c1a17">GREY LENO</text>
  <text x="0" y="172" font-size="84" fill="#d2332a">GREY LENO</text>
  <text x="0" y="248" font-size="54" fill="#f4e8dc">HAS A FLY BRAIN.</text>
  <text x="0" y="298" font-size="17" fill="#ffc94a" style="font-family:monospace">138,639 neurons · 15.1M connections</text>
  <text x="0" y="324" font-size="17" fill="#b59c95" style="font-family:monospace">FlyWire v783 · LIF, Shiu et al. 2024</text>
  <text x="0" y="350" font-size="17" fill="#b59c95" style="font-family:monospace">running live in your browser</text>
</g>
</svg>`;
writeFileSync(new URL('../assets/banner.svg', import.meta.url), banner);

// ---------------------------------------------------------------- raster (real simulation)
const { graph, layers } = toyFlyBrain();
const net = new LIFNetwork(graph, {}, { seed: 11 });
const spikes = [];
net.run(150, (i, t) => spikes.push([t, i]));
net.stimulate(layers.sensory, 150);
net.run(350, (i, t) => spikes.push([t, i]));
const RW = 1200, RH = 360, PAD = 60, T = 500; // px, px, px, ms
const layerColor = (i) => (i < layers.central[0] ? '#d2332a' : i < layers.descending[0] ? '#ffc94a' : i < layers.motor[0] ? '#9ee7b0' : '#6ff3e2');
const sx = (t) => PAD + (t / T) * (RW - PAD - 40), sy = (i) => 20 + (i / graph.n) * (RH - 60);
const paths = {};
for (const [t, i] of spikes) { const c = layerColor(i); paths[c] = (paths[c] || '') + `M${sx(t).toFixed(1)} ${sy(i).toFixed(1)}h1.8v1.6h-1.8z`; }
const marks = Object.entries(paths).map(([c, d]) => `<path fill="${c}" d="${d}"/>`).join('');
const label = (name, i0, i1, col, dy = 0) => `<text x="${PAD - 8}" y="${((sy(i0) + sy(i1)) / 2 + 4 + dy).toFixed(0)}" text-anchor="end" fill="${col}" font-size="11">${name}</text>`;
let ticks = '';
for (let t = 0; t <= T; t += 100) ticks += `<line x1="${sx(t)}" x2="${sx(t)}" y1="${RH - 38}" y2="${RH - 33}" stroke="#b59c95"/><text x="${sx(t)}" y="${RH - 20}" text-anchor="middle" fill="#b59c95" font-size="11">${t} ms</text>`;
const raster = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${RW} ${RH}" width="${RW}" height="${RH}" role="img" aria-label="Spike raster: a rotten tomato at 150 ms drives sensory, central, descending and motor neurons">
<style>text{font-family:"SFMono-Regular",Menlo,Consolas,monospace}</style>
<rect width="${RW}" height="${RH}" fill="#0b0405"/>
<rect x="${sx(150)}" y="14" width="${sx(500) - sx(150)}" height="${RH - 50}" fill="#d2332a" fill-opacity=".06"/>
<line x1="${sx(150)}" x2="${sx(150)}" y1="14" y2="${RH - 36}" stroke="#d2332a" stroke-dasharray="4 4"/>
<text x="${sx(150) + 8}" y="30" fill="#f4e8dc" font-size="12">🍅 tomato lands · sensory neurons driven at 150 Hz</text>
${marks}
${label('sensory', layers.sensory[0], layers.sensory.at(-1), '#d2332a')}
${label('central', layers.central[0], layers.central.at(-1), '#ffc94a')}
${label('desc.', layers.descending[0], layers.descending.at(-1), '#9ee7b0', -5)}
${label('motor', layers.motor[0], layers.motor.at(-1), '#6ff3e2', 7)}
${ticks}
</svg>`;
writeFileSync(new URL('../assets/raster.svg', import.meta.url), raster);
console.log('banner.svg', banner.length, 'bytes · raster.svg', raster.length, 'bytes ·', spikes.length, 'spikes');
