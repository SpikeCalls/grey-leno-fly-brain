# flyleno.viosarcade.xyz, A to Z

An audit of the live site as of 30 September 2026, read from the running page, its network requests and its source. Findings are ranked by how much they help the site spread.

## At a glance

| | |
|---|---|
| Title | `FlyLeno — TUURD Talk` |
| Stack | Plain ES modules, three.js 0.170 (jsDelivr import map), Rapier 0.19.3 physics, YouTube IFrame API, one Web Worker |
| Brain | 138,639 neurons · 15,091,983 connections · 54,492,922 synapses (FlyWire v783), LIF after Shiu et al. 2024 |
| Measured speed | 1.00 × real time, ~71,000 spikes/s, on a mid-range laptop in the Claude desktop browser |
| First load | ~33 MB: connectome 31.3 MB, positions 0.8 MB, Rapier 0.74 MB, three.js 0.26 MB, Leno GLB 0.27 MB, ~50 JS modules |
| Page load event | ~1.2 s, then the brain streams in with a progress counter |
| Modules | 48 first-party JS files, each fetched separately |
| Controls | 93 buttons, 20 show segments, 19 events, 5 crowd reactions |

## What works really well

1. **The idea sells itself.** "A real fly brain runs a talk show" is a one-sentence hook, and the page proves it with live counters, a raster and a 3D map of every soma.
2. **The science is real and credited.** The About dialog cites Shiu et al., FlyWire, Schlegel et al. and separates the connectome from the engineered layers. That honesty is rare and is exactly what makes scientists share it.
3. **The engineering is impressive.** Lazy exact integration of 15 M connections in plain JS at real time, in a worker, is a genuine feat.
4. **Deep content.** Twenty segments, nineteen events, guests, a learning loop you can teach words to. People will find new things on the third visit.
5. **It works on a phone.** At 320 px the sidebar stacks under the stage and the brain still runs.

## Fix first (biggest reach for least work)

### 1. Link previews are empty
There is no `description`, no Open Graph and no Twitter card. Every share on X, Discord, Telegram or Reddit shows a bare URL.

```html
<meta name="description" content="A whole fruit-fly brain, 138,639 real neurons from the FlyWire connectome, runs live in your browser and puppeteers Grey Leno on the TUURD Talk stage.">
<meta property="og:title" content="Grey Leno has a fruit fly brain">
<meta property="og:description" content="138,639 real Drosophila neurons. 15.1M connections. One late-night host.">
<meta property="og:image" content="https://flyleno.viosarcade.xyz/og.jpg">
<meta property="og:url" content="https://flyleno.viosarcade.xyz/">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#110608">
```

Use a 1200 × 630 still of Leno on stage with "138,639 neurons" burned in. `assets/grey-leno-poster.jpg` in this repo, cropped, works.

### 2. The 31 MB connectome is cached for only 10 minutes
`data/connectome.bin.gz` is served with `Cache-Control: max-age=600`. A friend who comes back an hour later downloads it again. The file never changes between versions, so version its name and cache it for a year:

```text
data/connectome.v783.bin.gz   Cache-Control: public, max-age=31536000, immutable
```

Same for `positions.bin.gz`, `neurons.json` and the GLB.

### 3. No favicon, robots.txt or sitemap
All three return 404. The tab shows a blank icon next to every other tab the visitor has open. A 🪰 favicon is two lines:

```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🪰</text></svg>">
```

### 4. A loading error flashes in the brain panel
On the first cold load the brain panel showed `error: Cannot read properties of undefined (reading 'fill')` while the connectome was at 29.0 / 31.3 MB. After loading finished it cleared and the model ran normally. It reads as a crash to a first-time visitor. Most likely a UI update touches a typed array before the worker's `ready` message arrives; guard those updates until `ready`.

### 5. Ask for audio capture only when it is wanted
The page requests capture permission so the fly can hear the music. A permission prompt before anything is on screen scares people away. Put it behind a "Let Leno hear the music" button with one sentence of why.

## Make it spread

- **Clip button.** Record the last 10 seconds of the canvas with `canvas.captureStream()` + `MediaRecorder` and offer a download. Every clip that gets posted is an ad with the URL in the corner.
- **Share the moment.** After a big event (Rapture, clown car, standing ovation), show "Share this" with a pre-filled post: *"A real fruit fly brain just hosted a talk show and got hit by 40 tomatoes 🪰🍅 flyleno.viosarcade.xyz"*.
- **Permalinks to segments.** `#goose`, `#rapture`, `#teach` jump straight to the good parts, so posts can link to a specific bit.
- **A visible source link.** Link this repo from the About dialog and the footer. Developers share what they can read.
- **Put the About text in the HTML.** It is injected on click, so search engines and link unfurlers never see the best copy on the site.

## Performance

- **Bundle the modules.** 48 separate module requests form a waterfall before the stage appears. One esbuild or Vite pass cuts it to one or two files.
- **Start the show before the brain finishes.** Show the stage and let Leno idle during the 31 MB download, then hand control to the brain. The progress counter already exists; move it into the scene.
- **Preload the critical files.** `<link rel="modulepreload" href="js/main.js">` and `<link rel="preload" as="fetch" crossorigin href="data/connectome.bin.gz">`.
- **Lite mode.** A `LITE` flag already exists in `main.js`. Default to it on phones.

## Accessibility

- 3 of 93 buttons have no text and no `aria-label`. Emoji-only labels (🍅, 🔧, 🌹, 🧊, 📹) are read out as emoji names at best; give them `aria-label`s.
- Respect `prefers-reduced-motion` for camera shake and flashes.
- The sidebar is dense; collapsible groups would help keyboard and screen-reader users as much as phone users.

## Rights check

The credits are thorough, which is good. A few assets are copyrighted third-party material: Half-Life 2 body sounds (Valve), lightsaber sounds (Lucasfilm), the *We'll Be Right Back* sting (Adult Swim) and audio cut from Vinesauce videos. If the site gets big, these are the first takedown targets. Swapping them for CC0 equivalents removes the risk. The Grey Leno model is used under the Nexus Mods terms, and the repo here does not redistribute it.

## Scorecard

| Area | Score | Why |
|---|:-:|---|
| Concept & hook | 10 | A real connectome as a talk-show host |
| Scientific integrity | 9 | Cited, parameters visible, biology vs. theatre labelled |
| Engineering | 9 | Whole brain at real time in JS |
| Content depth | 9 | 20 segments, 19 events, teachable voice |
| First impression | 6 | 33 MB wait, loading error flash, permission prompt |
| Shareability | 3 | No previews, no favicon, no clip or share tools |
| Caching & performance | 5 | 10-minute cache on 31 MB, 48-module waterfall |
| Accessibility | 6 | Unlabelled emoji buttons, no reduced-motion |
