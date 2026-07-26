# TensorDojo home redesign

Exploration of four directions to replace the current type-led landing page
(`artifacts/tensor-dojo/src/pages/HomePage.tsx`).

## Current baseline

- Two-column hero: copy + live `DotProductExplorer`
- Stats strip → resume → why tiles → curriculum grid → FAQ
- Strengths: honest product demo, strong mono/technical voice, real sim in the fold
- Gaps: single-demo under-sells breadth; feels like a polished SaaS landing; path through 8 tracks is a card grid, not a journey

## Alternatives

| ID | Name | Pitch | Risk | Best for |
|----|------|-------|------|----------|
| **A** | Immersive Dojo Floor | Make “dojo” literal — huge training mat, belt path | Higher visual cost | Brand-forward relaunch |
| **B** | Editorial Lab Notebook | Light paper + serif science notebook | Theme split with dark lessons | Differentiating from AI SaaS |
| **C** | Mission Control | Product shell as home; resume-first | Can intimidate new users | Power users / return visits |
| **D** | Proof Gallery | Centered pitch + 3 live demos + path rail | Needs hero presets | Lowest-risk evolution |

## Recommendation

Originally recommended **D** as lowest-risk. **Shipped: B — Editorial Lab Notebook** (user choice).

### Implemented (B)

- Warm paper light palette + home graph-paper grid (`.lab-home`)
- Newsreader display serif for home headings
- Hero reframed as lab notebook figure card (`Fig. 1` spine)
- New editorial copy: “touching the variables”
- Inline stats under CTAs; paper cards for why/curriculum
- Dark mode keeps slate canvas with faint grid + same editorial type

Screenshots of the live build:

- `implemented-B-light.png` / `implemented-B-light-full.png`
- `implemented-B-dark.png`

## Files

| File | What |
|------|------|
| `mockups.html` | Interactive, text-accurate mockups (open in browser) |
| `concept-A-dojo-floor.jpg` | Mood concept — immersive training floor |
| `concept-B-lab-notebook.jpg` | Mood concept — editorial paper lab |
| `concept-C-mission-control.jpg` | Mood concept — command-center shell |
| `concept-D-proof-gallery.jpg` | Mood concept — multi-demo gallery |

Open the mockups:

```bash
open docs/redesign/home/mockups.html
```
