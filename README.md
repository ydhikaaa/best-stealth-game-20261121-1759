[![make.fun bounty](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/ydhikaaa/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/ydhikaaa/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

# Midnight Manifest

A top-down stealth heist aboard a sleeper train. The night train to Velmora
carries one treasure too many: cross all **five cars**, take every prize, and
reach each exit unseen. Wardens patrol with swaying lanterns — light betrays
you, shadow is home.

## The train

| Car | Name | Wardens | Aboard |
| --- | ---- | ------- | ------ |
| 1 | Baggage Car | 2 | crates, mail sacks, a brass compass |
| 2 | Sleeper Car | 3 | berths, curtains, a gold locket |
| 3 | Dining Car | 3 | silver trays, a vintage cognac |
| 4 | Lounge Car | 4 | the brass bar, a diamond tie pin |
| 5 | Vault Car | 5 | safes, strong boxes, **the Velmora Star** |

17 wardens in all. Each one patrols a route you can learn, carries a lantern
vision cone that sways with the motion of the train, and has a suspicion
meter that fills — faster when you are close, lit, or sprinting — and drains
again when you break line of sight. Fill it once and the warden pauses,
calls *"Who's there?"*, and walks to the last place they saw you. Fill it
again while they are alerted and you are **SPOTTED**: a strike, an alarm, and
the car restarts. Three strikes in one car and the run ends there.

## How to play

- **WASD / arrows** — move
- **SHIFT** — sneak: slow and silent, and low cover (benches, sofas, mail
  sacks, curtains) hides you from a warden's sight line
- **SPACE** — sprint: fast, but loud everywhere
- **C** or **mouse click** — throw a coin (5 per car): nearby wardens turn
  and investigate the landing ring
- **Q** — drop a smoke pellet (2 per car): the cloud blocks sight for a few
  seconds
- **R** — douse a nearby lamp (limited per car): darkness is safety
- **P / ESC** — pause · **M** — mute

High cover — luggage stacks, crates, seat rows, tables, the bar, safes —
blocks sight completely. Lamp pools make you **LIT** and fill suspicion
faster. Carpet is silent; gravel and ballast patches crunch unless you
sneak. A noise ring shows every sound you make, and wardens turn toward
noise they hear. Finish a car never spotted for the **GHOST bonus (+500)**.

## Screens and sound

Title card, a briefing card per car, pause, car-complete, game-complete and
fail screens. All sound is synthesized WebAudio — soft and loud footsteps,
a coin's clink, the hiss of a doused lamp, the alarm sting, success jingles,
and a low train rumble with a periodic rail clack. No audio files, no
libraries: pure canvas 2D and vanilla ES modules.

## Running it

```
node serve.ts          # then open http://localhost:8080
```

or serve the `game/` folder with any static HTTP server.

## Staging parameters (for screenshots)

The game accepts query parameters that set up deterministic scenes, so the
screenshots in `screenshots/` are real renders of staged play:

- `?car=N` — start at car N (1–5)
- `?car=3&stage=cover` — Dining Car: the thief crouched behind a low bench,
  HIDDEN, wardens on patrol
- `?car=3&stage=near` — a warden at ~60% suspicion saying *"Who's there?"*,
  the thief at the edge of the cone
- `?car=3&stage=coin` — a coin has just landed: its warden turns to the
  noise ring while the thief slips past behind cover
- `?car=5&stage=vault` — Vault Car: every prize taken, the Velmora Star
  included, exit open and in reach

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` via `vendor/makefun-game.ts`
- `serve.ts` — local static server
- `game/index.html` — the page and its styles
- `game/src/main.js` — boot, game loop, screens, gadgets, scoring
- `game/src/levels.js` — the five cars as data
- `game/src/guards.js` — patrols, vision cones, suspicion, investigation
- `game/src/player.js` — movement, noise, light, gadgets
- `game/src/render.js` — all canvas drawing and the HUD
- `game/src/audio.js` — WebAudio synth
- `game/src/input.js` — keyboard and mouse

Entry for the make.fun bounty
[Make the best stealth game](https://make.fun/bounty/best-stealth-game-20261121-1759).
MIT licensed.
