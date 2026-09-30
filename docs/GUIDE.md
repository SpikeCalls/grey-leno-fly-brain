# How to run a show

Open [flyleno.viosarcade.xyz](https://flyleno.viosarcade.xyz/) in a desktop browser. The first load downloads about 33 MB (mostly the connectome) and shows `Loading fly brain… x / 31.3 MB`. When the counter reads `138.6k neurons · 15.09M connections` and `sim time` starts moving, the fly is alive.

## 1. Look around

| Control | What it does |
|---|---|
| **Audience · Wide · Close-up · Follow · Free** | Camera presets. *Free* lets you orbit with the mouse. |
| **Eyes · Fly eyes** | See the stage through Leno's eyes, as a human would or as a compound eye. The same image feeds the R1-6 photoreceptors. |
| **markers** | Show stage markers. |
| **Leno / Fly-Leno** | Swap between the Grey Leno ragdoll and a fly-bodied Leno. |
| **📹 Cams · ▶ YouTube · 🟩 Green** | Live camera wall, the music player, green-screen. |
| **🔊 80** | Master volume. |

## 2. Throw things

| Throw | What the fly feels |
|---|---|
| 🍅 tomato | A splat. Rapier physics knocks the body part it hits; the impact drives touch neurons. |
| 🔧 pipe | A heavy metal pipe: the biggest knock of the four. |
| 🌹 rose | A soft landing and a compliment: a touch pulse plus a reward. |
| 🧊 sugar | A sugar cube. Touching it with legs or mouth drives the sugar taste neurons (LB2d, LB3). |

Watch the **MOTOR OUTPUT** panel: Forward (P9), Backward (MDN), Turn (DNa01/02), Startle (giant fiber), Groom (aDN1), Feed/talk (MN9). Those six bars are Leno's body.

## 3. Read its mind

- **MIND**: Dopamine (PAM − PPL1) and Mood, a slow average of it.
- **STATE OF MIND**: arousal, stress, fear, morale, hunger, nausea, homesickness, sleepiness, dizziness.
- **BODY**: health, energy, wetness, grime.
- **BRAIN HEALTH**: brain load and brain worms.
- **Deciding / Instinct / Brood**: what the action selector is about to do, which drive is winning, and eggs (5 % chance, adjustable).
- **NEURAL STATE · ALL CELLS**: every soma in the brain, lighting up as it spikes. Tick *rotate* to spin it.
- **SPIKE RASTER**: 200 rows. Tagged motor and stimulus neurons at the top, a rolling sample of everything else below.

## 4. Run the show

Press **run the show** to let the director go through the rundown, or click a segment yourself: Opening, Monologue, Phone-in, Take it away Johnny!, sponsor break, technical difficulties, the Space scabies telethon, The rotten éclair, guests (Mr. Frog, The Jonkler, Kybo Rin, a goose), Sunday drive, dance party, Vote Leno, 500 years young, Do The Leno, Spin the Wheel of Leno, Lullaby, Sign-off.

**EVENTS** are one-shot chaos: Goose, Spider-Leno, swatter glove, electric racket, duendes, clown car, The Rapture, rain cloud, mushroom, falling rig, tomato/pipe/rose storms, standing ovation, sugar shower, heckler, stagehand snack, *We'll Be Right Back*. The crowd buttons (Applause, Cheers, Laughter, Gasp, Boos) are your direct line to its dopamine neurons.

## 5. Teach it

Leno's voice comes from motor neurons, and the synapses onto them are plastic and gated by dopamine.

**Teach a word.** Type a word next to **Teach** and press it. Every few seconds a stagehand says the word, and the fly hears it through its Johnston's organ. When Leno's own babble matches the word well enough (score ≥ 0.5), the teacher rewards him with a dopamine pulse. Press **Stop** to end the lesson.

**Shape it by hand.** Hit **Applause** or **Laughter** right after a sound you like, **Boos** after one you don't. Rewarded sounds become more likely over a few minutes.

The line `synaptic learning: x mV/s on N synapses` shows how fast the weights are moving.

## 6. Brain settings

| Setting | Effect |
|---|---|
| Spike-frequency adaptation | Each spike raises the threshold a little. Keeps loud input from igniting runaway activity. Off = the pure Shiu et al. model. |
| Dopamine plasticity | Turn learning on or off. |
| Eyesight | Feed the camera image to the photoreceptors. |
| Forgetting | Let learned weights drift back. |
| Brain worms | Silence quiet, non-essential neurons over time, up to 35 % of the brain. Heal them to restore. |
| Ambience / hearing gain | Background sensory noise and how loud the world sounds to the antennae. |
| Egg chance | Default 5 %. |

## 7. Tips

- **Speed** trades smoothness for time. At 1.00 × real time the whole brain simulates at the rate a fly lives.
- **Pause** and **Reset** stop and reset the show and the brain together.
- If the fly locks into constant firing after "Smells bad", press **Reset**. That stimulus is marked ⚠ because it ignites runaway activity in this model.
- For hearing, the page asks to capture this tab's audio so the fly can hear the music. You can decline; the in-world sounds still reach it.
- On a phone the sidebar stacks under the stage. It works, but a laptop is kinder to a fly.
