# The neuroscience

## The connectome

In 2024 the FlyWire consortium published the first complete wiring diagram of an adult animal brain: a female *Drosophila melanogaster*, reconstructed from electron microscopy (Dorkenwald et al. 2024, *Nature*). Version 783 contains about 139,000 neurons and 54.5 million synapses. Schlegel et al. 2024 annotated it with cell types, hemilineages and super-classes.

FlyLeno uses v783 with a minimum of 1 synapse per connection:

| | |
|---|--:|
| Neurons | 138,639 |
| Connections (pre → post pairs) | 15,091,983 |
| Synapses | 54,492,922 |
| Super-classes | 11 (sensory, optic, central, descending, ascending, motor, endocrine, visual projection, visual centrifugal, sensory-ascending, unknown) |

Each connection carries a **signed weight**: the synapse count, negative when the presynaptic neuron is predicted to release GABA or glutamate (inhibitory in most fly circuits), positive for acetylcholine.

## The neuron model

A leaky integrate-and-fire neuron is a capacitor with a leak and a trigger:

```text
dv/dt = (v₀ − v + g) / τm
dg/dt = −g / τs
```

Synaptic input arrives as jumps in `g`. `g` decays quickly (5 ms), and `v` follows it slowly (20 ms). When `v` crosses −45 mV the neuron spikes, resets to −52 mV and ignores everything for 2.2 ms. Each spike adds `synapses × 0.275 mV` to every target's `g`, 1.8 ms later.

That is all. There are no ion channels, no dendrites and no neuromodulators in the base model. Shiu et al. 2024 showed that this is already enough to be useful: activating sugar- or water-sensing neurons in the model on the FlyWire wiring predicted which downstream neurons feed the proboscis motor program, and optogenetic experiments in real flies confirmed many of them. Grooming circuits from antennal mechanosensors were predicted the same way.

**How many synapses does it take?** The gap from rest to threshold is 7 mV. With these time constants a conductance jump of `g` peaks at about 0.16 · `g` in voltage, 9 ms later. So one presynaptic spike alone needs roughly 160 synapses (44 mV of `g`) to fire its target. In practice neurons fire when many inputs arrive within a few milliseconds of each other.

## Senses

Stage events become Poisson spike trains on identified sensory neurons:

- **Hearing.** Johnston's organ, the fly's antennal ear, is split into bands. JO-B (30–300 Hz, courtship song range) and JO-A (0.3–4 kHz, vibration) are driven live from the in-world audio mix. Applause drives JO-C/E/F.
- **Taste.** Bitter (LB1) for a rotten tomato, sugar and water (LB2d, LB3) for sugar, plus low-rate ambient noise on all gustatory neurons.
- **Smell.** Fruit and vinegar receptors (DM1–4, VA2) per antenna, and Or56a (geosmin) for "smells bad". The geosmin stimulus is flagged in the UI because in this model it ignites self-sustaining runaway activity.
- **Vision.** 400 R1-6 photoreceptors per eye, sampled from 4,423, report brightness and motion of what the fly's camera sees. LC4 looming detectors fire when a heckler leans in.

## Motor output

Descending neurons are the bottleneck between brain and body, about 1,300 cells that carry every command to the ventral nerve cord. A handful have famous single-neuron phenotypes, and FlyLeno reads exactly those:

- **P9 (DNp09, DNg97)**: forward walking.
- **MDN**, the moonwalker descending neuron: backward walking.
- **DNa01 / DNa02**: steering. Left minus right gives the turn.
- **Giant fiber (DNp01)**: the escape jump.
- **aDN1 (DNg62)**: antennal grooming.
- **MN9**: the proboscis motor neuron. For Leno, it is the mouth.

Voice comes from DNg02 and DNp13, which control wing power and courtship song in real flies. Retching comes from pharyngeal motor neurons. The fart is the oviposition descending neurons (oviDN), which is exactly as undignified as it sounds.

## Dopamine and learning

The fly's mushroom body learns by dopamine. PAM neurons signal reward, PPL1 neurons signal punishment. In FlyLeno, cheers, laughs and applause drive PAM; boos and gasps drive PPL1. The model reads its own dopaminergic activity:

```text
DA = tanh((rate(PAM) − rate(PPL1)) / 20 Hz)
```

`DA` does two jobs.

1. **Inside the connectome**: a three-factor plasticity rule on every synapse onto the articulator motor neurons (Leno's vocal tract). A synapse that was active just before its target fired becomes eligible, and dopamine converts eligibility into a weight change. Utterances followed by applause get more drive from whatever context produced them.
2. **Outside the connectome**: an action selector learns the value of each spontaneous behaviour from the dopamine that follows it.

Neither rule is part of Shiu et al.; both are clearly labelled as additions in the app.

## What this is not

A fly in a browser is not a fly. The model has no neuromodulation beyond this one loop, no gap junctions, no ventral nerve cord, no body feedback except what the show adds, and synapse counts stand in for synaptic strength. It is a faithful wiring diagram with a deliberately simple neuron. That is the point, and it is also the fun: a real fly's circuit diagram, driven far outside anything a fly has experienced, hosting a talk show.

## References

- Dorkenwald, S. et al. Neuronal wiring diagram of an adult brain. *Nature* 634, 124–138 (2024).
- Schlegel, P. et al. Whole-brain annotation and multi-connectome cell typing of *Drosophila*. *Nature* 634, 139–152 (2024).
- Shiu, P. K. et al. A *Drosophila* computational brain model reveals sensorimotor processing. *Nature* 634, 210–219 (2024). [doi:10.1038/s41586-024-07763-9](https://www.nature.com/articles/s41586-024-07763-9) · code: [philshiu/Drosophila_brain_model](https://github.com/philshiu/Drosophila_brain_model)
