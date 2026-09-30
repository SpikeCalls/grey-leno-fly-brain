// SPDX-License-Identifier: MIT
// ---------------------------------------------------------------------------
//  lif.js — a tiny, dependency-free leaky integrate-and-fire (LIF) engine
//  using the same neuron model and default parameters as the whole-brain
//  Drosophila model of Shiu et al. 2024 (Nature), which FlyLeno runs live
//  on the full FlyWire v783 connectome.
//
//  This file is an independent, educational re-implementation written for
//  this repository. It is small enough to read in one sitting and runs in
//  Node, the browser, or a Web Worker.
//
//    dv/dt = (v0 - v + g) / tMbr        membrane voltage (mV)
//    dg/dt = -g / tau                   synaptic conductance (mV)
//    v > vTh  ->  spike, v = vReset, g = 0, refractory for tRef ms
//    each spike adds (signed synapse count * wSyn) to g of every target
//    after tDelay ms
//
//  Both ODEs are linear, so one step of length dt is integrated exactly.
// ---------------------------------------------------------------------------

/** Default parameters (ms / mV) — Shiu et al. 2024. */
export const SHIU_PARAMS = Object.freeze({
  v0: -52,      // resting potential
  vReset: -52,  // reset potential
  vTh: -45,     // spike threshold
  tMbr: 20,     // membrane time constant
  tau: 5,       // synaptic time constant
  tRef: 2.2,    // refractory period
  tDelay: 1.8,  // axonal + synaptic delay
  wSyn: 0.275,  // mV per synapse
  dt: 0.1,      // integration step
});

/**
 * Build a compressed-sparse-row graph from an edge list.
 * @param {number} n  number of neurons
 * @param {Array<[number, number, number]>} edges  [pre, post, signedSynapseCount]
 */
export function buildCSR(n, edges) {
  const rowPtr = new Uint32Array(n + 1);
  for (const [pre] of edges) rowPtr[pre + 1]++;
  for (let i = 0; i < n; i++) rowPtr[i + 1] += rowPtr[i];
  const fill = rowPtr.slice(0, n);
  const targets = new Int32Array(edges.length);
  const weights = new Int16Array(edges.length);
  for (const [pre, post, w] of edges) {
    const k = fill[pre]++;
    targets[k] = post;
    weights[k] = w;
  }
  return { n, rowPtr, targets, weights };
}

/** Small deterministic PRNG (mulberry32) so demos and tests are reproducible. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class LIFNetwork {
  /**
   * @param {{n:number,rowPtr:Uint32Array,targets:Int32Array,weights:Int16Array}} graph
   * @param {Partial<typeof SHIU_PARAMS>} params
   * @param {{seed?:number}} opts
   */
  constructor(graph, params = {}, opts = {}) {
    this.g = graph;
    this.p = { ...SHIU_PARAMS, ...params };
    const { dt, tMbr, tau, tDelay, tRef } = this.p;
    this.n = graph.n;
    this.em = Math.exp(-dt / tMbr);
    this.eg = Math.exp(-dt / tau);
    // exact voltage response over one step to a conductance that decays with tau
    this.cg = (tau / (tau - tMbr)) * (this.eg - this.em);
    this.delaySteps = Math.max(1, Math.round(tDelay / dt));
    this.refSteps = Math.round(tRef / dt);
    this.random = rng(opts.seed ?? 7);
    this.reset();
  }

  reset() {
    const n = this.n;
    this.v = new Float32Array(n).fill(this.p.v0);
    this.cond = new Float32Array(n);
    this.refUntil = new Int32Array(n);
    this.spikeCount = new Uint32Array(n);
    this.ring = Array.from({ length: this.delaySteps }, () => []);
    this.stim = new Map();       // neuron -> Poisson rate (Hz)
    this.step = 0;
    this.totalSpikes = 0;
  }

  /** Drive a set of neurons as Poisson sources (Hz). rate = 0 removes the drive. */
  stimulate(indices, rateHz) {
    for (const i of indices) {
      if (rateHz > 0) this.stim.set(i, rateHz); else this.stim.delete(i);
    }
  }

  get timeMs() { return this.step * this.p.dt; }

  /**
   * Advance one dt. Returns the indices of neurons that spiked this step.
   * @returns {number[]}
   */
  tick() {
    const { v0, vReset, vTh, dt, wSyn } = this.p;
    const { rowPtr, targets, weights } = this.g;
    const slot = this.step % this.delaySteps;

    // 1) deliver spikes emitted tDelay ago
    const arrived = this.ring[slot];
    for (const pre of arrived) {
      for (let e = rowPtr[pre]; e < rowPtr[pre + 1]; e++) this.cond[targets[e]] += weights[e] * wSyn;
    }
    arrived.length = 0;

    // 2) integrate every neuron exactly over dt, then threshold
    const fired = [];
    for (let i = 0; i < this.n; i++) {
      if (this.refUntil[i] > this.step) continue;               // frozen while refractory
      const gi = this.cond[i];
      this.v[i] = v0 + (this.v[i] - v0) * this.em + gi * this.cg;
      this.cond[i] = gi * this.eg;
      if (this.v[i] > vTh) fired.push(i);
    }

    // 3) Poisson sources: a kick that always crosses threshold (as in Shiu et al.)
    for (const [i, rate] of this.stim) {
      if (this.refUntil[i] <= this.step && this.random() < rate * dt * 1e-3 && !fired.includes(i)) fired.push(i);
    }

    // 4) spike bookkeeping
    const out = this.ring[(this.step + this.delaySteps) % this.delaySteps];
    for (const i of fired) {
      this.v[i] = vReset;
      this.cond[i] = 0;
      this.refUntil[i] = this.step + this.refSteps;
      this.spikeCount[i]++;
      out.push(i);
    }
    this.totalSpikes += fired.length;
    this.step++;
    return fired;
  }

  /** Run for `ms` milliseconds; calls onSpike(i, tMs) for every spike. */
  run(ms, onSpike) {
    const steps = Math.round(ms / this.p.dt);
    for (let s = 0; s < steps; s++) {
      const fired = this.tick();
      if (onSpike) for (const i of fired) onSpike(i, this.timeMs);
    }
  }

  /** Mean firing rate (Hz) of a group since the last reset. */
  rate(indices) {
    if (!indices.length || this.step === 0) return 0;
    let s = 0;
    for (const i of indices) s += this.spikeCount[i];
    return s / indices.length / (this.timeMs / 1000);
  }
}

// ---------------------------------------------------------------------------
//  Motor decoding & dopamine — the same read-out idea FlyLeno uses to turn
//  descending-neuron firing into Grey Leno's body commands.
// ---------------------------------------------------------------------------

/** Rates (Hz) at which each behaviour saturates. */
export const MOTOR_GAINS = Object.freeze({
  forward: 40,   // P9 / oDN1
  backward: 40,  // MDN (moonwalker descending neuron)
  turn: 40,      // DNa01/02, left minus right
  startle: 15,   // giant fiber
  groom: 40,     // aDN1
  feed: 40,      // MN9 (proboscis) — Leno's "talk"
});

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** Map group rates (Hz) to normalised motor commands in [0,1] (turn in [-1,1]). */
export function decodeMotor(r, gains = MOTOR_GAINS) {
  return {
    forward: clamp01((r.forward ?? 0) / gains.forward),
    backward: clamp01((r.backward ?? 0) / gains.backward),
    turn: Math.max(-1, Math.min(1, ((r.turnL ?? 0) - (r.turnR ?? 0)) / gains.turn)),
    startle: clamp01((r.startle ?? 0) / gains.startle),
    groom: clamp01((r.groom ?? 0) / gains.groom),
    feed: clamp01((r.feed ?? 0) / gains.feed),
  };
}

/** Dopamine signal: reward (PAM) minus punishment (PPL1), squashed to [-1, 1]. */
export const dopamine = (pamHz, ppl1Hz, scaleHz = 20) => Math.tanh((pamHz - ppl1Hz) / scaleHz);

// ---------------------------------------------------------------------------
//  A toy "fly-like" network for demos: sensory -> central -> descending ->
//  motor, with ~12% inhibitory synapses. It is NOT the FlyWire connectome —
//  it is a stand-in you can run anywhere in milliseconds.
// ---------------------------------------------------------------------------
export function toyFlyBrain({ sensory = 120, central = 600, descending = 40, motor = 40, fanout = 14, seed = 42 } = {}) {
  const R = rng(seed);
  const layers = [];
  let off = 0;
  for (const [name, size] of [['sensory', sensory], ['central', central], ['descending', descending], ['motor', motor]]) {
    layers.push({ name, start: off, size });
    off += size;
  }
  const n = off;
  const pick = (L) => L.start + ((R() * L.size) | 0);
  const [S, C, D, M] = layers;
  const edges = [];
  const connect = (from, to, k, synMax) => {
    for (let i = from.start; i < from.start + from.size; i++) {
      for (let j = 0; j < k; j++) {
        const sign = R() < 0.12 ? -1 : 1;
        edges.push([i, pick(to), sign * (1 + ((R() * synMax) | 0))]);
      }
    }
  };
  connect(S, C, fanout, 40);
  connect(C, C, (fanout / 2) | 0, 14);
  connect(C, D, 3, 40);
  connect(D, M, 3, 60);
  const idx = (L) => Array.from({ length: L.size }, (_, k) => L.start + k);
  return { graph: buildCSR(n, edges), layers: Object.fromEntries(layers.map((L) => [L.name, idx(L)])) };
}
