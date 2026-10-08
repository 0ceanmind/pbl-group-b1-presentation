# From Marrow to Microcyte — PBL Group B-1

Interactive presentation for the MD 2 (2026–2027) PBL Group B-1 research, under the supervision of Dr. Waqas Hameed.
Case: iron-deficiency anemia secondary to chronic menstrual blood loss, covering six student learning objectives.

**Live:** https://0ceanmind.github.io/pbl-group-b1-presentation/

## Presenting

| Key | Action |
| --- | --- |
| `→` `Space` `PgDn` | Next build / slide (works with presentation clickers) |
| `←` `PgUp` | Previous |
| `F` | Full screen |
| `O` / `Esc` | Slide overview |
| `T` | Light / dark theme (use light in very bright rooms) |
| `B` | Black screen |
| number + `Enter` | Jump to slide |

The stage is a fixed 1920×1080 canvas that scales to any screen. 3D scenes can be dragged to rotate.

## Structure

- `index.html` — all slide text
- `js/data.js` — case values, reference intervals, references
- `js/scenes/` — Three.js scenes (red cell stream, bone marrow, hepatic lobule, red-cell indices, heme synthesis)
- `js/slides/` — interactive SVG / canvas diagrams per SLO
- `vendor/` — Three.js (MIT) and GSAP (standard no-charge license), bundled locally so the deck also runs offline
- `fonts/` — Inter (SIL Open Font License)

Run locally with any static server, e.g. `python -m http.server`.
