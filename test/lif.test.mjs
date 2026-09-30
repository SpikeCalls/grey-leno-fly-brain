import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIFNetwork, buildCSR, SHIU_PARAMS, decodeMotor, dopamine, toyFlyBrain } from '../src/lif.js';

test('a silent network stays at rest', () => {
  const net = new LIFNetwork(buildCSR(3, []));
  net.run(100);
  assert.equal(net.totalSpikes, 0);
  for (const v of net.v) assert.equal(v, SHIU_PARAMS.v0);
});

test('a Poisson source fires near its target rate', () => {
  const net = new LIFNetwork(buildCSR(1, []), {}, { seed: 3 });
  net.stimulate([0], 100);
  net.run(5000);
  const hz = net.rate([0]);
  assert.ok(hz > 80 && hz < 110, `rate ${hz}`);
});

test('a strong excitatory synapse relays a spike after the delay', () => {
  // 40 synapses * 0.275 mV = 11 mV conductance kick -> crosses the 7 mV gap
  const net = new LIFNetwork(buildCSR(2, [[0, 1, 40]]), {}, { seed: 1 });
  net.stimulate([0], 1000);
  const times = { 0: [], 1: [] };
  net.run(50, (i, t) => times[i].push(t));
  assert.ok(times[0].length > 0);
  assert.ok(times[1].length > 0);
  assert.ok(times[1][0] - times[0][0] >= SHIU_PARAMS.tDelay - 1e-9);
});

test('an inhibitory synapse never makes its target fire', () => {
  const net = new LIFNetwork(buildCSR(2, [[0, 1, -40]]), {}, { seed: 1 });
  net.stimulate([0], 500);
  net.run(500);
  assert.equal(net.spikeCount[1], 0);
  assert.ok(net.v[1] <= SHIU_PARAMS.v0);
});

test('refractory period caps the firing rate', () => {
  const net = new LIFNetwork(buildCSR(1, []), {}, { seed: 9 });
  net.stimulate([0], 100000);
  net.run(1000);
  const maxHz = 1000 / SHIU_PARAMS.tRef;
  assert.ok(net.rate([0]) <= maxHz + 1);
});

test('motor decoding saturates and signs turns', () => {
  const m = decodeMotor({ forward: 80, turnL: 30, turnR: 10, startle: 3 });
  assert.equal(m.forward, 1);
  assert.equal(m.backward, 0);
  assert.equal(m.turn, 0.5);
  assert.ok(Math.abs(m.startle - 0.2) < 1e-9);
});

test('dopamine is reward minus punishment, bounded', () => {
  assert.equal(dopamine(10, 10), 0);
  assert.ok(dopamine(200, 0) > 0.99);
  assert.ok(dopamine(0, 200) < -0.99);
});

test('toy fly brain: stimulating the senses drives the motor layer', () => {
  const { graph, layers } = toyFlyBrain();
  const net = new LIFNetwork(graph, {}, { seed: 5 });
  net.stimulate(layers.sensory, 150);
  net.run(300);
  assert.ok(net.rate(layers.central) > 0, 'central fires');
  assert.ok(net.rate(layers.motor) > 0, 'motor fires');
});
