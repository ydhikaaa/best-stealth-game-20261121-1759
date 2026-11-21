// render.js — all canvas drawing: train-car floors (carpet and gravel),
// lamp light pools against the dark, translucent vision cones that change
// colour with suspicion, cover, characters, effects (noise rings, smoke,
// coins, floating text, speech bubbles) and the full HUD in panels.

import { WORLD_W, WORLD_H } from './levels.js';
import { CONE_RANGE } from './guards.js';

export const VIEW = { x: 196, y: 52, w: 888, h: 640 };
const SX = VIEW.w / WORLD_W;
const SY = VIEW.h / WORLD_H;

export function toWorld(cx, cy) {
  return { x: (cx - VIEW.x) / SX, y: (cy - VIEW.y) / SY };
}

const wx = (x) => VIEW.x + x * SX;
const wy = (y) => VIEW.y + y * SY;

export function drawScene(ctx, game) {
  const { level, player, guards, time } = game;
  ctx.fillStyle = '#07090f';
  ctx.fillRect(0, 0, 1280, 800);

  drawCarShell(ctx, level);
  for (const g of level.gravel) drawGravel(ctx, g);
  drawExit(ctx, game);
  for (const item of level.loot) if (!item.taken) drawLoot(ctx, item, time);
  for (const c of level.coverLow) drawCover(ctx, c, true);
  for (const c of level.coverHigh) drawCover(ctx, c, false);
  for (const s of game.smokes) drawSmoke(ctx, s);
  for (const coin of game.coinsOut) drawCoinOnFloor(ctx, coin);
  drawLightPools(ctx, level, time);
  for (const g of guards) drawCone(ctx, g, time, game);
  for (const fx of game.rings) drawRing(ctx, fx);
  drawPlayer(ctx, player, time);
  for (const g of guards) drawGuard(ctx, g, time);
  for (const f of game.floats) drawFloat(ctx, f);
  for (const g of guards) if (g.bubble) drawBubble(ctx, g);
  drawVignette(ctx);
}

function drawCarShell(ctx, level) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
  ctx.clip();
  // Carpet: deep red-brown with a subtle woven stripe pattern.
  ctx.fillStyle = '#2a1a20';
  ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let x = 0; x < WORLD_W; x += 44) ctx.fillRect(wx(x), VIEW.y, 1, VIEW.h);
  for (let y = 0; y < WORLD_H; y += 44) ctx.fillRect(VIEW.x, wy(y), VIEW.w, 1);
  // Centre corridor runner.
  ctx.fillStyle = 'rgba(120,40,50,0.20)';
  ctx.fillRect(VIEW.x, wy(268), VIEW.w, 84 * SY);
  ctx.restore();
  // Walls of the car.
  ctx.strokeStyle = '#54432e';
  ctx.lineWidth = 6;
  ctx.strokeRect(VIEW.x - 3, VIEW.y - 3, VIEW.w + 6, VIEW.h + 6);
  ctx.strokeStyle = 'rgba(214,178,110,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(VIEW.x + 3, VIEW.y + 3, VIEW.w - 6, VIEW.h - 6);
  // Entry door (left).
  ctx.fillStyle = '#1c2733';
  ctx.fillRect(VIEW.x - 4, wy(282), 8, 56 * SY);
}

function drawGravel(ctx, g) {
  ctx.fillStyle = '#3d3a33';
  ctx.fillRect(wx(g.x), wy(g.y), g.w * SX, g.h * SY);
  ctx.fillStyle = 'rgba(200,190,160,0.20)';
  for (let i = 0; i < g.w * g.h / 260; i++) {
    const px = wx(g.x) + ((i * 37) % Math.max(1, g.w * SX - 4));
    const py = wy(g.y) + ((i * 53) % Math.max(1, g.h * SY - 4));
    ctx.fillRect(px, py, 2, 2);
  }
}

function drawExit(ctx, game) {
  const e = game.level.exit;
  const open = game.lootLeft === 0;
  const x = wx(e.x), y = wy(e.y);
  ctx.fillStyle = open ? '#1d4d2e' : '#402a18';
  ctx.fillRect(x - 4, y - 30 * SY, 10, 60 * SY);
  ctx.fillStyle = open ? '#57e389' : '#c98f3d';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT OPEN' : 'EXIT', x - 12, y - 36 * SY);
  if (open) {
    ctx.fillStyle = 'rgba(87,227,137,0.18)';
    ctx.fillRect(x - 16, y - 30 * SY, 14, 60 * SY);
  }
}

function drawLoot(ctx, item, time) {
  const x = wx(item.x), y = wy(item.y);
  const star = item.name.includes('VELMORA');
  const bob = Math.sin(time * 2.4 + item.x) * 2;
  ctx.save();
  ctx.translate(x, y + bob);
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, star ? 30 : 20);
  glow.addColorStop(0, star ? 'rgba(150,220,255,0.55)' : 'rgba(255,214,110,0.45)');
  glow.addColorStop(1, 'rgba(255,214,110,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, star ? 30 : 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = star ? '#aee6ff' : '#ffd66e';
  if (star) {
    drawStar(ctx, 0, 0, 5, 11, 5);
  } else {
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(-2, -2, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawStar(ctx, cx, cy, spikes, outer, inner) {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
  for (let i = 0; i < spikes; i++) {
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
  }
  ctx.closePath();
  ctx.fill();
}

const COVER_STYLE = {
  crates: ['#5a4026', '#6e4f2e', 'CRATES'],
  luggage: ['#4d3a55', '#5f4870', 'LUGGAGE'],
  sacks: ['#5c5142', '#6d6150', 'MAIL'],
  berth: ['#31435c', '#3d5474', 'BERTH'],
  curtain: ['#5c2e3e', '#703a4d', ''],
  table: ['#6b5a41', '#7d6a4d', 'TABLE'],
  counter: ['#54432e', '#66533400', 'SERVICE'],
  bench: ['#4a3826', '#59452e', ''],
  bar: ['#6e5326', '#86662f', 'THE BAR'],
  armchairs: ['#54383e', '#68464e', 'LOUNGE'],
  cabinet: ['#463723', '#57462c', 'CABINET'],
  sofa: ['#3e4a3a', '#4d5c47', ''],
  plant: ['#2e4a2e', '#3a5c3a', ''],
  safe: ['#3a4149', '#49525c', 'SAFE'],
  strongbox: ['#4c4436', '#5e5545', 'STRONG BOX'],
  vaultdoor: ['#5c5340', '#6f6450', 'VAULT'],
};

function drawCover(ctx, c, isLow) {
  const x = wx(c.x), y = wy(c.y), w = c.w * SX, h = c.h * SY;
  const st = COVER_STYLE[c.kind] || ['#444', '#555', ''];
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = st[0];
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = st[1];
  ctx.fillRect(x, y, w, Math.min(7, h));
  ctx.strokeStyle = isLow ? 'rgba(160,200,160,0.5)' : 'rgba(0,0,0,0.45)';
  ctx.lineWidth = isLow ? 1.5 : 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  if (isLow) {
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.setLineDash([]);
  }
  if (st[2] && w > 52 && h > 20) {
    ctx.fillStyle = 'rgba(255,240,200,0.55)';
    ctx.font = 'bold 9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(st[2], x + w / 2, y + h / 2 + 3);
  }
}

function drawLightPools(ctx, level, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of level.lamps) {
    if (!l.on) continue;
    const x = wx(l.x), y = wy(l.y);
    // Gas lamps breathe: a slight flicker in radius and warmth.
    const flicker = 1 + Math.sin(time * 7.3 + l.x * 1.7 + l.y) * 0.03
      + Math.sin(time * 13.1 + l.x) * 0.015;
    const r = l.r * SX * flicker;
    const g = ctx.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, 'rgba(255,196,92,0.34)');
    g.addColorStop(0.55, 'rgba(255,170,70,0.15)');
    g.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  for (const l of level.lamps) {
    const x = wx(l.x), y = wy(l.y);
    ctx.fillStyle = l.on ? '#ffca6a' : '#3a3f46';
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.stroke();
    if (!l.on) {
      ctx.fillStyle = 'rgba(200,200,210,0.6)';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('doused', x, y + 14);
    }
  }
}

function drawCone(ctx, g, time, game) {
  const a = g.coneAngle(time);
  const half = 0.56;
  const x = wx(g.x), y = wy(g.y), r = CONE_RANGE * SX;
  let fill = 'rgba(255,214,110,0.16)';
  if (g.state === 'SPOTTED') fill = 'rgba(255,70,60,0.30)';
  else if (g.suspicion > 0.35 || g.state === 'SUSPICIOUS') fill = 'rgba(255,150,60,0.24)';
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r, a - half, a + half);
  ctx.closePath();
  // Clip the cone against high cover so sight reads honestly.
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,130,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  // Lantern glow at the guard's hand.
  ctx.fillStyle = 'rgba(255,190,90,0.85)';
  ctx.beginPath();
  ctx.arc(x + Math.cos(a) * 12, y + Math.sin(a) * 12, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawSmoke(ctx, s) {
  const x = wx(s.x), y = wy(s.y), r = s.r * SX;
  const g = ctx.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, 'rgba(190,198,210,0.88)');
  g.addColorStop(1, 'rgba(190,198,210,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function drawCoinOnFloor(ctx, coin) {
  const x = wx(coin.x), y = wy(coin.y);
  ctx.fillStyle = '#ffd66e';
  ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#a87f24';
  ctx.stroke();
}

function drawRing(ctx, ring) {
  const x = wx(ring.x), y = wy(ring.y);
  const t = ring.age / ring.life;
  ctx.strokeStyle = `rgba(140,220,255,${0.75 * (1 - t)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, ring.r * SX * t, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPlayer(ctx, p, time) {
  const x = wx(p.x), y = wy(p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(x, y + 9, 11, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  // Cloak body.
  ctx.fillStyle = p.sneaking ? '#274b63' : '#35648a';
  ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
  // Hood.
  ctx.fillStyle = '#1b3247';
  ctx.beginPath(); ctx.arc(x, y - 2, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8c9a0';
  ctx.beginPath();
  ctx.arc(x + Math.cos(p.angle) * 3, y - 2 + Math.sin(p.angle) * 3, 3.4, 0, Math.PI * 2);
  ctx.fill();
  if (p.lit) {
    ctx.strokeStyle = 'rgba(255,205,100,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.stroke();
  }
  if (p.hidden) {
    ctx.fillStyle = '#7be495';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', x, y - 22);
  } else if (p.sprinting) {
    ctx.fillStyle = '#ffb0a0';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOUD!', x, y - 22);
  }
}

function drawGuard(ctx, g, time) {
  const x = wx(g.x), y = wy(g.y);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(x, y + 9, 11, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = g.state === 'SPOTTED' ? '#a33327' : g.state === 'SUSPICIOUS' ? '#8a5a20' : '#5c3a21';
  ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
  // Uniform cap + face toward facing.
  ctx.fillStyle = '#2e1f14';
  ctx.beginPath(); ctx.arc(x, y - 2, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8c9a0';
  ctx.beginPath();
  ctx.arc(x + Math.cos(g.angle) * 3, y - 2 + Math.sin(g.angle) * 3, 3.2, 0, Math.PI * 2);
  ctx.fill();
  // Suspicion meter above the head.
  if (g.suspicion > 0.02) {
    const w = 30;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - w / 2, y - 26, w, 5);
    ctx.fillStyle = g.suspicion > 0.7 ? '#ff5347' : g.suspicion > 0.35 ? '#ffa53d' : '#ffd66e';
    ctx.fillRect(x - w / 2 + 1, y - 25, (w - 2) * g.suspicion, 3);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.suspicion > 0.7 ? '!' : '?', x, y - 30);
  }
}

function drawFloat(ctx, f) {
  const x = wx(f.x), y = wy(f.y) - f.age * 26;
  ctx.globalAlpha = Math.max(0, 1 - f.age / f.life);
  ctx.fillStyle = f.color;
  ctx.font = 'bold 14px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(f.text, x, y);
  ctx.globalAlpha = 1;
}

function drawBubble(ctx, g) {
  const x = wx(g.x), y = wy(g.y) - 44;
  ctx.font = 'italic 12px Georgia, serif';
  const w = ctx.measureText(g.bubble).width + 16;
  ctx.fillStyle = 'rgba(250,246,235,0.95)';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 12, w, 20, 6);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 8); ctx.lineTo(x + 4, y + 8); ctx.lineTo(x, y + 15);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#22252c';
  ctx.textAlign = 'center';
  ctx.fillText(g.bubble, x, y + 2);
}

function drawVignette(ctx) {
  const g = ctx.createRadialGradient(640, 400, 320, 640, 400, 760);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
}

// ---------------------------------------------------------------- HUD ----

export function drawHUD(ctx, game) {
  const { level, player } = game;
  ctx.textAlign = 'left';
  // Top bar.
  ctx.fillStyle = '#101623';
  ctx.fillRect(0, 0, 1280, 44);
  ctx.fillStyle = '#d8b46a';
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText('MIDNIGHT MANIFEST', 16, 29);
  ctx.fillStyle = '#e8e4da';
  ctx.font = '15px Georgia, serif';
  ctx.fillText(level.name, 252, 28);
  ctx.font = '14px monospace';
  ctx.fillStyle = '#ffd66e';
  ctx.fillText(`LOOT ${game.lootTaken}/${game.lootTotal}  $${game.carScore}`, 520, 28);
  ctx.fillStyle = '#aebdd0';
  ctx.fillText(`TIME ${formatTime(game.elapsed)}`, 716, 28);
  ctx.fillStyle = game.heat > 60 ? '#ff7a5c' : '#aebdd0';
  ctx.fillText(`HEAT ${Math.round(game.heat)}`, 836, 28);
  ctx.fillStyle = '#e8e4da';
  ctx.fillText(`SCORE ${game.totalScore + game.carScore}`, 946, 28);
  ctx.fillStyle = game.strikes ? '#ff7a5c' : '#aebdd0';
  ctx.fillText(`STRIKES ${game.strikes}/3`, 1082, 28);
  if (!game.spottedThisCar) {
    ctx.fillStyle = '#7be495';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('GHOST', 1216, 28);
  }

  drawLeftPanel(ctx, game);
  drawRightPanel(ctx, game);

  // Bottom controls line.
  ctx.fillStyle = '#101623';
  ctx.fillRect(0, 762, 1280, 38);
  ctx.fillStyle = '#8fa2ba';
  ctx.font = '12.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'WASD move · SHIFT sneak (hide at low cover) · SPACE sprint (loud) · C / click throw coin · Q smoke · R douse lamp · P pause · M mute',
    640, 786);
  ctx.textAlign = 'left';
}

function panel(ctx, x, y, w, h, title) {
  ctx.fillStyle = 'rgba(13,18,29,0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(216,180,106,0.4)';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = '#d8b46a';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText(title, x + 12, y + 20);
}

function drawLeftPanel(ctx, game) {
  const { level, player } = game;
  panel(ctx, 8, 52, 180, 300, 'OBJECTIVES');
  ctx.font = '12.5px sans-serif';
  let y = 84;
  const line = (done, text) => {
    ctx.fillStyle = done ? '#7be495' : '#cfd6df';
    ctx.fillText((done ? '✓ ' : '○ ') + text, 18, y);
    y += 20;
  };
  line(game.lootLeft === 0, `Take all loot (${game.lootTaken}/${game.lootTotal})`);
  line(false, 'Reach the EXIT unseen');
  line(!game.spottedThisCar, 'Stay a GHOST (+500)');
  y += 8;
  ctx.fillStyle = '#d8b46a';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText('GADGETS', 18, y); y += 20;
  ctx.font = '12.5px sans-serif';
  ctx.fillStyle = '#cfd6df';
  ctx.fillText(`◉ Coins [C]      × ${player.coins}`, 18, y); y += 19;
  ctx.fillText(`◍ Smoke [Q]     × ${player.smokes}`, 18, y); y += 19;
  ctx.fillText(`✦ Douses [R]    × ${player.douses}`, 18, y); y += 26;
  ctx.fillStyle = '#d8b46a';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText('TRAIN PROGRESS', 18, y); y += 20;
  ctx.font = '12px sans-serif';
  for (let i = 0; i < 5; i++) {
    const done = i < game.carIndex;
    const here = i === game.carIndex;
    ctx.fillStyle = done ? '#7be495' : here ? '#ffd66e' : '#5d6b7d';
    ctx.fillText(`${done ? '✓' : here ? '▸' : '○'} Car ${i + 1}`, 18, y);
    y += 17;
  }

  panel(ctx, 8, 362, 180, 196, 'LEGEND');
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#cfd6df';
  const rows = [
    ['Cone', 'lantern sight'],
    ['Gold pool', 'lamp light: seen faster'],
    ['Dark floor', 'shadow: safer'],
    ['Dashed box', 'low cover: sneak to hide'],
    ['Solid box', 'high cover: blocks sight'],
    ['Speckled', 'gravel: loud unless sneaking'],
  ];
  let ly = 394;
  for (const [a, b] of rows) {
    ctx.fillStyle = '#d8b46a';
    ctx.fillText(a, 18, ly);
    ctx.fillStyle = '#9fb0c3';
    ctx.fillText(b, 18, ly + 12);
    ly += 28;
  }
}

function drawRightPanel(ctx, game) {
  panel(ctx, 1092, 52, 180, 300, 'WARDENS');
  ctx.font = '12.5px sans-serif';
  let y = 84;
  for (const g of game.guards) {
    const st = g.state;
    ctx.fillStyle = st === 'SPOTTED' ? '#ff7a5c' : st === 'SUSPICIOUS' ? '#ffa53d' : '#7be495';
    ctx.fillText(g.name, 1104, y);
    ctx.fillStyle = '#aebdd0';
    ctx.fillText(st, 1180, y);
    y += 15;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(1104, y, 150, 5);
    ctx.fillStyle = g.suspicion > 0.7 ? '#ff5347' : g.suspicion > 0.35 ? '#ffa53d' : '#ffd66e';
    ctx.fillRect(1104, y, 150 * g.suspicion, 5);
    y += 22;
  }
  y += 4;
  ctx.fillStyle = '#d8b46a';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText('STATUS', 1104, y); y += 19;
  ctx.font = '12.5px sans-serif';
  ctx.fillStyle = game.player.lit ? '#ffd66e' : '#7be495';
  ctx.fillText(game.player.lit ? 'You are LIT' : 'You are in shadow', 1104, y); y += 18;
  ctx.fillStyle = game.player.hidden ? '#7be495' : '#aebdd0';
  ctx.fillText(game.player.hidden ? 'HIDDEN at cover' : game.player.sprinting ? 'Making NOISE' : 'Quiet', 1104, y);
}

export function formatTime(s) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
}

// ------------------------------------------------------------- screens ----

export function drawCenterCard(ctx, title, lines, footer) {
  ctx.fillStyle = 'rgba(4,6,10,0.72)';
  ctx.fillRect(0, 0, 1280, 800);
  const w = 560, h = 120 + lines.length * 26 + 54;
  const x = (1280 - w) / 2, y = (800 - h) / 2;
  ctx.fillStyle = '#101623';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#d8b46a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#d8b46a';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 640, y + 46);
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = '#e8e4da';
  lines.forEach((ln, i) => ctx.fillText(ln, 640, y + 84 + i * 26));
  if (footer) {
    ctx.fillStyle = '#8fa2ba';
    ctx.font = '13px sans-serif';
    ctx.fillText(footer, 640, y + h - 20);
  }
  ctx.textAlign = 'left';
}
