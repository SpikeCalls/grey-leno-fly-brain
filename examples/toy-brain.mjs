// Run:  node examples/toy-brain.mjs
// A terminal-sized fly brain: poke the senses, watch the spikes, read the motor output.
import { LIFNetwork, toyFlyBrain, decodeMotor, dopamine } from '../src/lif.js';

const { graph, layers } = toyFlyBrain();
const net = new LIFNetwork(graph, {}, { seed: 11 });

const COLS = 80, MS = 400, BIN = MS / COLS;
const rows = ['sensory', 'central', 'descending', 'motor'];
const hist = Object.fromEntries(rows.map((r) => [r, new Array(COLS).fill(0)]));
const layerOf = new Map();
for (const r of rows) for (const i of layers[r]) layerOf.set(i, r);

console.log('\n  🪰  toy fly brain — ' + graph.n + ' LIF neurons, ' + graph.targets.length + ' connections\n');
console.log('  t=0–100 ms  : silence');
console.log('  t=100–400 ms: 🍅 a rotten tomato hits — sensory neurons fire at 150 Hz\n');

net.run(100, (i, t) => hist[layerOf.get(i)][Math.min(COLS - 1, (t / BIN) | 0)]++);
net.stimulate(layers.sensory, 150);
net.run(300, (i, t) => hist[layerOf.get(i)][Math.min(COLS - 1, (t / BIN) | 0)]++);

const shade = ' .:-=+*#%@';
for (const r of rows) {
  const max = Math.max(1, ...hist[r]);
  const line = hist[r].map((c) => shade[Math.min(9, Math.ceil((c / max) * 9))]).join('');
  console.log('  ' + r.padStart(10) + ' │' + line + '│');
}
console.log('  ' + ' '.repeat(10) + ' └' + '─'.repeat(COLS) + '┘ ' + MS + ' ms\n');

// Split the motor layer into pools like the real descending/motor neurons FlyLeno reads.
const m = layers.motor, q = (a, b) => m.slice(a, b);
const rates = {
  forward: net.rate(q(0, 8)), backward: net.rate(q(8, 16)),
  turnL: net.rate(q(16, 22)), turnR: net.rate(q(22, 28)),
  startle: net.rate(q(28, 32)), groom: net.rate(q(32, 36)), feed: net.rate(q(36, 40)),
};
const cmd = decodeMotor(rates);
const bar = (x) => '█'.repeat(Math.round(Math.abs(x) * 20)).padEnd(20, '·');
console.log('  Grey Leno motor command');
for (const [k, v] of Object.entries(cmd)) console.log('  ' + k.padStart(10) + ' ' + bar(v) + ' ' + v.toFixed(2));
console.log('\n  dopamine (PAM 30 Hz vs PPL1 5 Hz) =', dopamine(30, 5).toFixed(2), '→ the crowd loved it\n');
