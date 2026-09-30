// SPDX-License-Identifier: MIT
// Grey Leno Fly Brain — landing page.
//   1. Hero: a WebGL point-cloud fruit-fly brain whose regions light up as "stage events" hit them.
//   2. Lab: a live 834-neuron LIF network (./lif.js, Shiu et al. 2024 parameters) you can throw things at.
import { LIFNetwork, buildCSR, rng, decodeMotor, dopamine } from './lif.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// =====================================================================================
//  1. HERO BRAIN (raw WebGL, no libraries)
// =====================================================================================
// Anatomy is stylised, front view, x = left/right, y = dorsal/ventral, z = anterior/posterior.
const REGIONS = [
  //  name                 centre            radii            count  colour (r,g,b)
  { key: 'central',  c: [0, 0.05, 0],     r: [0.95, 0.62, 0.48], n: 16000, col: [1.0, 0.72, 0.30] },
  { key: 'opticL',   c: [-1.62, 0.02, 0], r: [0.52, 0.80, 0.46], n: 9000, col: [0.40, 0.95, 0.88], shell: true },
  { key: 'opticR',   c: [1.62, 0.02, 0],  r: [0.52, 0.80, 0.46], n: 9000, col: [0.40, 0.95, 0.88], shell: true },
  { key: 'mbL',      c: [-0.46, 0.42, -0.28], r: [0.20, 0.16, 0.16], n: 1800, col: [1.0, 0.95, 0.88] },
  { key: 'mbR',      c: [0.46, 0.42, -0.28],  r: [0.20, 0.16, 0.16], n: 1800, col: [1.0, 0.95, 0.88] },
  { key: 'alL',      c: [-0.26, -0.22, 0.40], r: [0.17, 0.15, 0.15], n: 1600, col: [1.0, 0.36, 0.30] },
  { key: 'alR',      c: [0.26, -0.22, 0.40],  r: [0.17, 0.15, 0.15], n: 1600, col: [1.0, 0.36, 0.30] },
  { key: 'sez',      c: [0, -0.62, 0.05], r: [0.42, 0.24, 0.30], n: 4200, col: [0.62, 0.92, 0.69] },
  { key: 'cx',       c: [0, 0.18, -0.05], r: [0.30, 0.10, 0.12], n: 1400, col: [1.0, 0.55, 0.35] },
];

function buildCloud(seed = 138639) {
  const R = rng(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(R() || 1e-9)) * Math.cos(2 * Math.PI * R());
  const total = REGIONS.reduce((s, r) => s + r.n, 0);
  const pos = new Float32Array(total * 3), col = new Float32Array(total * 3), region = new Uint8Array(total);
  let k = 0;
  REGIONS.forEach((reg, ri) => {
    reg.start = k;
    for (let i = 0; i < reg.n; i++, k++) {
      // uniform in a ball, or layered shells for the optic lobe (lamina / medulla / lobula)
      let x = gauss(), y = gauss(), z = gauss();
      const len = Math.hypot(x, y, z) || 1;
      let rad = Math.cbrt(R());
      if (reg.shell) rad = [0.98, 0.78, 0.52][(R() * 3) | 0] + gauss() * 0.04;
      x = (x / len) * rad; y = (y / len) * rad; z = (z / len) * rad;
      pos[k * 3] = reg.c[0] + x * reg.r[0];
      pos[k * 3 + 1] = reg.c[1] + y * reg.r[1];
      pos[k * 3 + 2] = reg.c[2] + z * reg.r[2];
      const j = 0.85 + R() * 0.3;
      col[k * 3] = reg.col[0] * j; col[k * 3 + 1] = reg.col[1] * j; col[k * 3 + 2] = reg.col[2] * j;
      region[k] = ri;
    }
    reg.end = k;
  });
  return { pos, col, region, total };
}

const VS = `
attribute vec3 aPos; attribute vec3 aCol; attribute float aAct;
uniform mat3 uRot; uniform float uAspect, uScale, uDpr, uOffset, uOffsetY;
varying vec3 vCol; varying float vAct;
void main() {
  vec3 p = uRot * aPos;
  float persp = 1.0 / (2.9 - p.z * 0.35);
  gl_Position = vec4(p.x * persp * uScale / uAspect + uOffset, p.y * persp * uScale + uOffsetY, 0.0, 1.0);
  gl_PointSize = (1.8 + aAct * 6.0) * uDpr * persp * 2.6;
  vCol = aCol; vAct = aAct;
}`;
const FS = `
precision mediump float;
varying vec3 vCol; varying float vAct;
void main() {
  vec2 d = gl_PointCoord - 0.5; float r = dot(d, d);
  if (r > 0.25) discard;
  float glow = exp(-r * 14.0);
  vec3 c = mix(vCol * 0.55, vec3(1.0, 0.93, 0.75), vAct * 0.8);
  gl_FragColor = vec4(c * glow, glow * (0.34 + vAct * 0.9));
}`;

function heroBrain(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, alpha: true });
  if (!gl) { canvas.remove(); return null; }
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog); gl.useProgram(prog);

  const cloud = buildCloud();
  const act = new Float32Array(cloud.total);
  const buf = (data, name, size, usage = gl.STATIC_DRAW) => {
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    const loc = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    return b;
  };
  buf(cloud.pos, 'aPos', 3); buf(cloud.col, 'aCol', 3);
  const actBuf = buf(act, 'aAct', 1, gl.DYNAMIC_DRAW);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uRot = U('uRot'), uAspect = U('uAspect'), uScale = U('uScale'), uDpr = U('uDpr'), uOffset = U('uOffset'), uOffsetY = U('uOffsetY');
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.disable(gl.DEPTH_TEST);

  let yaw = -0.35, pitch = 0.18, dragging = false, lx = 0, ly = 0, spin = reduceMotion ? 0 : 0.0016;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    yaw += (e.clientX - lx) * 0.006; pitch = Math.max(-1.2, Math.min(1.2, pitch + (e.clientY - ly) * 0.006));
    lx = e.clientX; ly = e.clientY;
  });
  addEventListener('pointerup', () => { dragging = false; });

  // Region "events" — waves of activity that travel sense -> central -> descending (SEZ)
  const byKey = Object.fromEntries(REGIONS.map((r) => [r.key, r]));
  const waves = [];
  const fire = (key, strength, delay = 0, dur = 900) => waves.push({ reg: byKey[key], t0: performance.now() + delay, dur, strength });
  const SCENES = [
    { log: 'LC4 looming neurons: a heckler leans in', path: [['opticL', 1], ['opticR', 1], ['central', 0.5, 250], ['sez', 0.8, 520]] },
    { log: 'JO antennal neurons: applause', path: [['alL', 1], ['alR', 1], ['central', 0.6, 220], ['mbL', 0.9, 380], ['mbR', 0.9, 380], ['sez', 0.6, 600]] },
    { log: 'bitter taste neurons: rotten tomato', path: [['sez', 1], ['central', 0.55, 260], ['cx', 0.8, 420]] },
    { log: 'PAM dopamine: the crowd laughs, Leno learns', path: [['mbL', 1], ['mbR', 1], ['cx', 0.7, 300], ['central', 0.4, 400]] },
    { log: 'R1-6 photoreceptors: the spotlight swings', path: [['opticL', 0.8], ['opticR', 0.8], ['cx', 0.6, 300]] },
  ];
  const log = document.getElementById('brainlog');
  let sceneIdx = 0;
  const playScene = (s) => { for (const [k, st, d] of s.path) fire(k, st, d || 0); if (log) log.textContent = s.log; };
  const loop = () => { playScene(SCENES[sceneIdx++ % SCENES.length]); };
  setTimeout(loop, 600);
  const sceneTimer = setInterval(loop, 3600);

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(uAspect, w / h); gl.uniform1f(uDpr, dpr * Math.max(1, h / 560));
    // keep the brain big on wide screens, fit it on phones
    const wide = w / h > 1.2;
    gl.uniform1f(uScale, wide ? 1.25 : Math.max(0.6, (w / h) * 1.0));
    gl.uniform1f(uOffset, wide ? 0.4 : 0);
    gl.uniform1f(uOffsetY, wide ? 0.08 : 0.55);
  }
  resize(); addEventListener('resize', resize);

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  const R = rng(9);
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    // decay
    for (let i = 0; i < act.length; i++) act[i] *= 0.9;
    // spontaneous background firing (~ a few Hz per neuron)
    for (let s = 0; s < 260; s++) act[(R() * act.length) | 0] = 0.55 + R() * 0.45;
    // travelling waves
    for (let w = waves.length - 1; w >= 0; w--) {
      const wv = waves[w], t = (now - wv.t0) / wv.dur;
      if (t < 0) continue;
      if (t > 1) { waves.splice(w, 1); continue; }
      const env = Math.sin(Math.PI * t) * wv.strength;
      const n = (wv.reg.end - wv.reg.start) * 0.05 * env;
      for (let s = 0; s < n; s++) act[wv.reg.start + ((R() * (wv.reg.end - wv.reg.start)) | 0)] = 1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, actBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, act);

    if (!dragging) yaw += spin;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    // column-major mat3 = Rx(pitch) * Ry(yaw)
    gl.uniformMatrix3fv(uRot, false, [cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy]);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, cloud.total);
  }
  requestAnimationFrame(frame);
  return { fire, stop: () => clearInterval(sceneTimer) };
}

// =====================================================================================
//  2. LAB — a toy fly brain wired so each sense has a favourite behaviour, like the real one
// =====================================================================================
const EVENTS = {
  tomato:   { module: 0, rate: 200, pools: ['backward', 'groom'], da: 'ppl1' },
  applause: { module: 1, rate: 300, pools: ['feed', 'forward'], da: 'pam' },
  sugar:    { module: 2, rate: 200, pools: ['feed', 'forward'], da: 'pam' },
  heckler:  { module: 3, rate: 200, pools: ['startle', 'turnL', 'turnR'], da: 'ppl1' },
};
const POOLS = ['forward', 'backward', 'turnL', 'turnR', 'startle', 'groom', 'feed'];
const POOL_INFO = {
  forward: 'P9 / oDN1', backward: 'MDN', turnL: 'DNa01/02 L', turnR: 'DNa01/02 R', startle: 'giant fiber', groom: 'aDN1', feed: 'MN9',
};

function buildLabBrain(seed = 2024) {
  const R = rng(seed);
  const SENS = 30, MOD = 150, DPOOL = 6, MPOOL = 6, DA_PAM = 20, DA_PPL = 10;
  let off = 0; const block = (n) => { const s = off; off += n; return Array.from({ length: n }, (_, i) => s + i); };
  const sensory = Object.keys(EVENTS).map(() => block(SENS));
  const modules = Object.keys(EVENTS).map(() => block(MOD));
  const desc = Object.fromEntries(POOLS.map((p) => [p, block(DPOOL)]));
  const motor = Object.fromEntries(POOLS.map((p) => [p, block(MPOOL)]));
  const pam = block(DA_PAM), ppl1 = block(DA_PPL);
  const edges = [];
  const pick = (arr) => arr[(R() * arr.length) | 0];
  const syn = (max) => 1 + ((R() * max) | 0);
  const sign = () => (R() < 0.12 ? -1 : 1);
  const evs = Object.values(EVENTS);
  sensory.forEach((S, m) => { for (const i of S) for (let k = 0; k < 14; k++) edges.push([i, pick(modules[m]), sign() * syn(40)]); });
  modules.forEach((M, m) => {
    for (const i of M) {
      for (let k = 0; k < 7; k++) edges.push([i, pick(R() < 0.8 ? M : modules[(R() * modules.length) | 0]), sign() * syn(14)]);
      for (const p of evs[m].pools) if (R() < 0.6) edges.push([i, pick(desc[p]), syn(60)]);
      if (R() < 0.4) edges.push([i, pick(evs[m].da === 'pam' ? pam : ppl1), syn(60)]);
    }
  });
  for (const p of POOLS) for (const i of desc[p]) for (let k = 0; k < 3; k++) edges.push([i, pick(motor[p]), syn(60)]);
  // left/right turning neurons inhibit each other
  for (const i of desc.turnL) edges.push([i, pick(desc.turnR), -30]);
  for (const i of desc.turnR) edges.push([i, pick(desc.turnL), -30]);
  const layerOf = new Uint8Array(off);
  const mark = (arr, v) => arr.forEach((i) => { layerOf[i] = v; });
  sensory.flat().forEach((i) => { layerOf[i] = 0; });
  mark(modules.flat(), 1); mark([...Object.values(desc).flat(), ...pam, ...ppl1], 2); mark(Object.values(motor).flat(), 3);
  return { graph: buildCSR(off, edges), sensory, motor, pam, ppl1, layerOf, n: off };
}

function lab() {
  const brain = buildLabBrain();
  const net = new LIFNetwork(brain.graph, {}, { seed: 17 });
  const allSensory = brain.sensory.flat();
  net.stimulate(allSensory, 4);               // ambient chatter
  const active = new Set();
  const keys = Object.keys(EVENTS);

  document.querySelectorAll('.throw').forEach((btn) => {
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      const ev = btn.dataset.ev, cfg = EVENTS[ev];
      const on = !active.has(ev);
      on ? active.add(ev) : active.delete(ev);
      btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', String(on));
      net.stimulate(brain.sensory[keys.indexOf(ev)], on ? cfg.rate : 4);
    });
  });

  // motor meters
  const motorEl = document.getElementById('motor');
  const meters = {};
  for (const k of ['forward', 'backward', 'turn', 'startle', 'groom', 'feed']) {
    const row = document.createElement('div'); row.className = 'mrow';
    const label = k === 'turn' ? 'DNa01/02 L−R' : POOL_INFO[k];
    row.innerHTML = `<span>${k === 'feed' ? 'feed / talk' : k}<small>${label}</small></span><div class="meter"><b></b></div><output>0.00</output>`;
    motorEl.append(row);
    meters[k] = { bar: row.querySelector('b'), out: row.querySelector('output') };
  }

  // raster
  const cv = document.getElementById('raster'), ctx = cv.getContext('2d');
  const WINDOW = 600; // ms shown
  const spikes = [];  // [t, neuron]
  const COLORS = ['#d2332a', '#ffc94a', '#9ee7b0', '#6ff3e2'];
  const fitRaster = () => { const d = Math.min(devicePixelRatio || 1, 2); cv.width = cv.clientWidth * d; cv.height = cv.clientHeight * d; };
  fitRaster(); addEventListener('resize', fitRaster);

  // windowed rates
  const counts = new Float64Array(brain.n);
  const ema = {};
  const rateOf = (idx, winMs) => { let s = 0; for (const i of idx) s += counts[i]; return (s / idx.length) / (winMs / 1000); };
  const clock = document.getElementById('simclock');
  const daEl = document.getElementById('da'), moodEl = document.getElementById('mood');
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(cv);

  const SIM_MS_PER_FRAME = 6;
  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    counts.fill(0);
    const steps = Math.round(SIM_MS_PER_FRAME / net.p.dt);
    for (let s = 0; s < steps; s++) {
      const fired = net.tick();
      for (const i of fired) { counts[i]++; spikes.push(net.timeMs, i); }
    }
    const now = net.timeMs;
    // drop old spikes
    let cut = 0; while (cut < spikes.length && spikes[cut] < now - WINDOW) cut += 2;
    if (cut) spikes.splice(0, cut);

    // rates -> EMA (tau 150 ms)
    const a = 1 - Math.exp(-SIM_MS_PER_FRAME / 150);
    const cur = Object.fromEntries(POOLS.map((p) => [p, rateOf(brain.motor[p], SIM_MS_PER_FRAME)]));
    cur.pam = rateOf(brain.pam, SIM_MS_PER_FRAME); cur.ppl1 = rateOf(brain.ppl1, SIM_MS_PER_FRAME);
    for (const k in cur) ema[k] = (ema[k] ?? 0) + (cur[k] - (ema[k] ?? 0)) * a;
    const cmd = decodeMotor(ema);
    for (const k in meters) {
      const v = cmd[k];
      meters[k].bar.style.width = (Math.abs(v) * 100).toFixed(1) + '%';
      meters[k].out.textContent = v.toFixed(2);
    }
    const da = dopamine(ema.pam, ema.ppl1);
    daEl.textContent = (da >= 0 ? '+' : '') + da.toFixed(2);
    moodEl.textContent = da > 0.3 ? 'PAM is firing. Leno will do that again.' : da < -0.3 ? 'PPL1 is firing. Leno will remember this.' : 'The crowd is quiet.';
    clock.textContent = Math.round(now).toLocaleString() + ' ms simulated';

    // draw
    const W = cv.width, H = cv.height;
    ctx.fillStyle = '#0b0405'; ctx.fillRect(0, 0, W, H);
    const rowH = H / brain.n, dot = Math.max(1.5, Math.min(3, W / 400));
    for (let k = 0; k < spikes.length; k += 2) {
      const t = spikes[k], i = spikes[k + 1];
      ctx.fillStyle = COLORS[brain.layerOf[i]];
      ctx.fillRect(((t - (now - WINDOW)) / WINDOW) * W, i * rowH, dot, Math.max(1, rowH * 1.4));
    }
  }
  requestAnimationFrame(frame);
}

// =====================================================================================
heroBrain(document.getElementById('brain'));
lab();
