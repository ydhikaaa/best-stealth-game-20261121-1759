// main.js — boot, the game loop and the state machine for Midnight Manifest.
// Screens: title, per-car intro, play, pause, car complete, game complete,
// fail. Gadgets, loot, strikes, score, heat and staging (?car=&stage=) live
// here; movement lives in player.js, wardens in guards.js, drawing in
// render.js, sound in audio.js.

import { CARS } from './levels.js';
import { Guard } from './guards.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { drawScene, drawHUD, drawCenterCard, toWorld, formatTime } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sound = new SoundBank();
const input = new Input(canvas, toWorld);

const params = new URLSearchParams(location.search);
const stage = params.get('stage');
const startCar = Math.max(1, Math.min(5, parseInt(params.get('car') || '1', 10) || 1));

const game = {
  screen: 'title',
  carIndex: startCar - 1,
  level: null,
  player: null,
  guards: [],
  smokes: [],
  coinsOut: [],
  rings: [],
  floats: [],
  time: 0,
  elapsed: 0,
  heat: 0,
  strikes: 0,
  totalScore: 0,
  carScore: 0,
  lootTaken: 0,
  lootTotal: 0,
  lootLeft: 0,
  spottedThisCar: false,
  ghostCars: 0,
  message: '',
};

function loadCar(index, keepScore) {
  const src = CARS[index];
  game.level = {
    ...src,
    lamps: src.lamps.map((l) => ({ ...l })),
    loot: src.loot.map((l) => ({ ...l })),
    gravel: src.gravel,
    coverHigh: src.coverHigh,
    coverLow: src.coverLow,
  };
  game.carIndex = index;
  game.player = new Player(game.level);
  game.guards = src.guards.map((d, i) => new Guard(d, i));
  game.smokes = [];
  game.coinsOut = [];
  game.rings = [];
  game.floats = [];
  game.carScore = 0;
  game.strikes = 0;
  game.spottedThisCar = false;
  game.lootTotal = game.level.loot.length;
  game.lootTaken = 0;
  game.lootLeft = game.lootTotal;
  if (!keepScore) game.totalScore = 0;
  if (stage) applyStage();
}

function applyStage() {
  const p = game.player;
  const L = game.level;
  if (stage === 'cover') {
    // Dining car: thief crouched behind a low bench, deep in the room.
    const bench = L.coverLow[0];
    p.x = bench.x + bench.w / 2;
    p.y = bench.y + bench.h + 16;
    p.forceSneak = true;
  } else if (stage === 'near') {
    // A warden at 60% suspicion, saying "Who's there?", thief at the cone edge.
    const g = game.guards[0];
    g.x = 430; g.y = 300; g.angle = 0;
    g.suspicion = 0.6;
    g.state = 'SUSPICIOUS';
    g.say("Who's there?", 9999);
    p.x = 596; p.y = 252;
    p.angle = Math.PI;
  } else if (stage === 'coin') {
    // A coin has just landed: its warden turns to the ring, thief slips past.
    const g = game.guards[0];
    const coin = { x: 330, y: 380 };
    game.coinsOut.push(coin);
    g.x = 300; g.y = 240;
    g.angle = Math.atan2(coin.y - g.y, coin.x - g.x);
    g.investigate(coin.x, coin.y, false);
    g.say('Hm?', 9999);
    game.rings.push({ x: coin.x, y: coin.y, r: 96, age: 1.15, life: 2.4, frozen: true });
    // Slipping past in shadow, crouched behind the low bench at the room's foot.
    p.x = 165; p.y = 556;
    p.forceSneak = true;
    p.angle = 0.5;
  } else if (stage === 'vault') {
    // Vault car: everything taken, the Star included; exit in reach.
    for (const item of L.loot) item.taken = true;
    game.lootTaken = game.lootTotal;
    game.lootLeft = 0;
    game.carScore = L.loot.reduce((s, i) => s + i.value, 0);
    p.x = 786; p.y = 310;
    game.floats.push({ x: 440, y: 268, text: '+$1000 THE VELMORA STAR', color: '#aee6ff', age: 0.4, life: 99 });
  }
}

function startPlay() {
  sound.ensure();
  sound.startAmbience();
  game.screen = 'play';
}

function restartCar() {
  const score = game.totalScore;
  loadCar(game.carIndex, true);
  game.totalScore = score;
  game.screen = 'play';
}

function completeCar() {
  let bonus = 0;
  if (!game.spottedThisCar) {
    bonus = 500;
    game.ghostCars++;
  }
  game.totalScore += game.carScore + bonus;
  game.carScore = 0;
  sound.jingle();
  if (game.carIndex >= CARS.length - 1) {
    game.screen = 'gameComplete';
    sound.fanfare();
  } else {
    game.screen = 'carComplete';
    game.message = bonus ? 'GHOST bonus +500 — never seen.' : 'Seen, but through.';
  }
}

function spotted() {
  game.strikes++;
  game.spottedThisCar = true;
  game.heat = Math.min(100, game.heat + 30);
  sound.alarm();
  if (game.strikes >= 3) {
    game.screen = 'fail';
  } else {
    // Restart the car, keeping the strikes so three strikes still fail it.
    const strikes = game.strikes;
    const score = game.totalScore;
    loadCar(game.carIndex, true);
    game.totalScore = score;
    game.strikes = strikes;
    game.spottedThisCar = true;
    game.screen = 'play';
  }
}

function throwCoin(x, y) {
  const p = game.player;
  if (p.coins <= 0) return;
  const d = Math.hypot(x - p.x, y - p.y);
  const maxThrow = 240;
  if (d > maxThrow) {
    x = p.x + ((x - p.x) / d) * maxThrow;
    y = p.y + ((y - p.y) / d) * maxThrow;
  }
  p.coins--;
  game.coinsOut.push({ x, y });
  game.rings.push({ x, y, r: 120, age: 0, life: 1.1 });
  sound.coin();
  for (const g of game.guards) {
    if (Math.hypot(g.x - x, g.y - y) < 210) g.hearNoise(x, y);
  }
}

function dropSmoke() {
  const p = game.player;
  if (p.smokes <= 0) return;
  p.smokes--;
  game.smokes.push({ x: p.x, y: p.y, r: 58, life: 4.5 });
  sound.smokePop();
}

function douseLamp() {
  const p = game.player;
  if (p.douses <= 0) return;
  const lamp = p.nearestLamp(game.level, 78);
  if (!lamp) return;
  lamp.on = false;
  p.douses--;
  sound.douse();
  game.floats.push({ x: lamp.x, y: lamp.y - 14, text: 'lamp doused', color: '#9fb0c3', age: 0, life: 1.4 });
}

function update(dt) {
  game.time += dt;
  if (game.screen !== 'play') return;
  game.elapsed += dt;
  const p = game.player;
  const fx = { heat: game.heat };
  p.update(dt, input, game.level);
  game.heat = fx.heat;
  if (p.stepped) sound.footstep(p.stepLoud);

  // Gadget keys and clicks.
  for (const click of input.clicks) throwCoin(click.x, click.y);
  if (input.hit('c')) {
    const a = p.angle;
    throwCoin(p.x + Math.cos(a) * 150, p.y + Math.sin(a) * 150);
  }
  if (input.hit('q')) dropSmoke();
  if (input.hit('r')) douseLamp();

  // Noise rings from the player's own movement.
  if (p.noise > 0) {
    game.rings.push({ x: p.x, y: p.y, r: p.noise, age: 0, life: 0.7 });
    for (const g of game.guards) {
      if (Math.hypot(g.x - p.x, g.y - p.y) < p.noise + 20) g.hearNoise(p.x, p.y);
    }
  }

  // Wardens.
  for (const g of game.guards) {
    const result = g.update(dt, game.time, game.level, p, game.smokes, fx);
    game.heat = fx.heat;
    if (g.footstepNear) {
      g.footstepNear = false;
      const d = Math.hypot(g.x - p.x, g.y - p.y);
      if (d < 240) sound.footstep(d < 130);
    }
    if (result === 'spotted') { spotted(); return; }
  }

  // Smoke fades.
  for (const s of game.smokes) s.life -= dt;
  game.smokes = game.smokes.filter((s) => s.life > 0);

  // Loot pickup.
  for (const item of game.level.loot) {
    if (!item.taken && Math.hypot(item.x - p.x, item.y - p.y) < 24) {
      item.taken = true;
      game.lootTaken++;
      game.lootLeft--;
      game.carScore += item.value;
      sound.pickup(item.value >= 1000);
      game.floats.push({
        x: item.x, y: item.y - 16,
        text: `+$${item.value} ${item.name}`,
        color: item.value >= 1000 ? '#aee6ff' : '#ffd66e',
        age: 0, life: 1.6,
      });
    }
  }

  // Exit.
  const e = game.level.exit;
  if (game.lootLeft === 0 && Math.hypot(e.x - p.x, e.y - p.y) < 26) completeCar();

  // Heat cools slowly when nothing happens.
  game.heat = Math.max(0, game.heat - dt * 1.6);
}

function updateFx(dt) {
  for (const r of game.rings) if (!r.frozen) r.age += dt;
  game.rings = game.rings.filter((r) => r.frozen || r.age < r.life);
  for (const f of game.floats) if (f.life < 90) f.age += dt;
  game.floats = game.floats.filter((f) => f.age < f.life);
}

function draw() {
  drawScene(ctx, game);
  drawHUD(ctx, game);
  const L = game.level;
  if (game.screen === 'title') {
    drawCenterCard(ctx, 'MIDNIGHT MANIFEST', [
      'The night train to Velmora carries one treasure too many.',
      'Cross all five cars, take every prize, and reach each exit unseen.',
      'Wardens patrol with swaying lanterns. Light betrays you; shadow is home.',
      'Throw coins, drop smoke, douse lamps. Three strikes in a car and it is over.',
    ], 'Click or press ENTER to board');
  } else if (game.screen === 'intro') {
    drawCenterCard(ctx, L.name, [L.intro,
      `Loot aboard: ${game.lootTotal} items · Wardens: ${game.guards.length}`,
    ], 'Press ENTER to slip in');
  } else if (game.screen === 'pause') {
    drawCenterCard(ctx, 'PAUSED', ['The train rolls on without you.'], 'P or ESC to resume · M mute');
  } else if (game.screen === 'carComplete') {
    drawCenterCard(ctx, `${L.name} — CLEAN`, [
      game.message,
      `Total score so far: ${game.totalScore}`,
    ], 'Press ENTER for the next car');
  } else if (game.screen === 'gameComplete') {
    drawCenterCard(ctx, 'THE VELMORA STAR IS YOURS', [
      `Final score: ${game.totalScore}`,
      `Ghost cars: ${game.ghostCars} of 5 · Time: ${formatTime(game.elapsed)}`,
      'The train arrives at dawn. You were never on it.',
    ], 'Press ENTER to play again');
  } else if (game.screen === 'fail') {
    drawCenterCard(ctx, 'CAUGHT IN THE ACT', [
      'Three strikes. The wardens march you off the train at the next station.',
      `Score kept: ${game.totalScore}`,
    ], 'Press ENTER to try the car again');
  }
}

function handleKeys() {
  if (input.hit('m')) sound.toggleMute();
  if (game.screen === 'title') {
    if (input.hit('enter') || input.clicks.length) {
      loadCar(game.carIndex, false);
      game.screen = 'intro';
    }
  } else if (game.screen === 'intro') {
    if (input.hit('enter') || input.clicks.length) startPlay();
  } else if (game.screen === 'play') {
    if (input.hit('p', 'escape')) game.screen = 'pause';
  } else if (game.screen === 'pause') {
    if (input.hit('p', 'escape')) game.screen = 'play';
  } else if (game.screen === 'carComplete') {
    if (input.hit('enter')) {
      loadCar(game.carIndex + 1, true);
      game.screen = 'intro';
    }
  } else if (game.screen === 'gameComplete' || game.screen === 'fail') {
    if (input.hit('enter')) {
      if (game.screen === 'fail') { restartCar(); game.screen = 'intro'; }
      else { loadCar(0, false); game.screen = 'intro'; }
    }
  }
}

loadCar(game.carIndex, false);
if (stage) {
  // Staged scenes render straight into play for screenshots.
  game.screen = 'play';
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  handleKeys();
  update(dt);
  updateFx(dt);
  draw();
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
