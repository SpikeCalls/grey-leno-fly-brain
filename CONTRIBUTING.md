# Contributing

Ideas, bug reports and pull requests are welcome.

- `npm test` must pass. Add a test for any change to `src/lif.js`.
- `site/lif.js` and `site/assets/` are copied from `src/` and `assets/` by `npm run sync` and by the Pages workflow.
- Regenerate the README art with `npm run art` if you change the toy brain.
- Keep the line between biology and theatre clear. If something is engineered for the show rather than taken from the connectome or a published model, say so in the docs.
- No bundler, no build step. The site must open straight from `site/index.html` on a static host.

Good first issues: new stage events for the lab, a spike-sonification toggle, a share-a-clip button.
