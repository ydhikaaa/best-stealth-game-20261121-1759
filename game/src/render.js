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

// Deterministic 0..1 hash for per-item variation (stable across frames).
function hash2(a, b) {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function drawScene(ctx, game) {
  const { level, player, guards, time } = game;
  ctx.fillStyle = '#07090f';
  ctx.fillRect(0, 0, 1280, 800);

  drawCarShell(ctx, level, time);
  for (const g of level.gravel) drawGravel(ctx, g);
  drawExit(ctx, game);
  for (const c of level.coverLow) drawCover(ctx, c, true);
  for (const c of level.coverHigh) drawCover(ctx, c, false);
  drawProps(ctx, level, time);
  drawStarPedestal(ctx, game);
  for (const item of level.loot) if (!item.taken) drawLoot(ctx, item, time);
  for (const s of game.smokes) drawSmoke(ctx, s);
  for (const coin of game.coinsOut) drawCoinOnFloor(ctx, coin);
  drawLightPools(ctx, level, time);
  drawStarBeam(ctx, game, time);
  for (const g of guards) drawCone(ctx, g, time, game);
  for (const fx of game.rings) drawRing(ctx, fx);
  drawPlayer(ctx, player, time);
  for (const g of guards) drawGuard(ctx, g, time);
  for (const f of game.floats) drawFloat(ctx, f);
  for (const g of guards) if (g.bubble) drawBubble(ctx, g);
  drawVignette(ctx);
}

function drawCarShell(ctx, level, time) {
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
  // Windows along both side walls, looking out on the night.
  drawWindows(ctx, time);
  ctx.restore();
  // Walls of the car.
  ctx.strokeStyle = '#54432e';
  ctx.lineWidth = 6;
  ctx.strokeRect(VIEW.x - 3, VIEW.y - 3, VIEW.w + 6, VIEW.h + 6);
  ctx.strokeStyle = 'rgba(214,178,110,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(VIEW.x + 3, VIEW.y + 3, VIEW.w - 6, VIEW.h - 6);
  // Gangway doors at both ends of the car, and the brass name plates.
  drawGangwayDoor(ctx, true);
  drawGangwayDoor(ctx, false);
  drawNamePlates(ctx, level);
}

// Windows: deep-blue night glass with stars, a moon, and — every few
// seconds — a trackside light streak sweeping past outside.
function drawWindows(ctx, time) {
  const bands = [4, WORLD_H - 19];
  for (let b = 0; b < bands.length; b++) {
    const y0 = bands[b];
    ctx.fillStyle = 'rgba(70,120,220,0.06)';
    ctx.fillRect(VIEW.x, wy(y0 - 3), VIEW.w, 21 * SY);
    for (let i = 0; i < 9; i++) {
      const x = wx(26 + i * 96 + (b ? 40 : 0));
      const y = wy(y0), w = 62 * SX, h = 15 * SY;
      const grad = ctx.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, '#0a1c38');
      grad.addColorStop(1, '#173f6e');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.fill();
      ctx.fillStyle = 'rgba(220,235,255,0.85)';
      for (let s = 0; s < 5; s++) {
        const sx = x + 6 + hash2(i * 7 + b * 31, s * 13) * (w - 12);
        const sy = y + 3 + hash2(i * 3 + s, b * 17) * (h - 6);
        ctx.fillRect(sx, sy, 1.4, 1.4);
      }
      if (i === (b ? 6 : 2)) {
        const mx = x + w * 0.68, my = y + h * 0.38;
        ctx.fillStyle = 'rgba(240,246,255,0.28)';
        ctx.beginPath(); ctx.arc(mx, my, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e9eef7';
        ctx.beginPath(); ctx.arc(mx, my, 4.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(160,175,200,0.55)';
        ctx.beginPath(); ctx.arc(mx - 1.4, my - 1, 1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(214,178,110,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + 1); ctx.lineTo(x + w / 2, y + h - 1);
      ctx.stroke();
    }
  }
  // Passing light streak.
  const period = 11, dur = 1.7, ph = time % period;
  if (ph < dur) {
    const t = ph / dur;
    const cx = VIEW.x - 90 + t * (VIEW.w + 180);
    const alpha = Math.sin(t * Math.PI) * 0.5;
    for (const y0 of bands) {
      const y = wy(y0);
      const g = ctx.createLinearGradient(cx - 70, 0, cx + 70, 0);
      g.addColorStop(0, 'rgba(255,230,170,0)');
      g.addColorStop(0.5, `rgba(255,230,170,${alpha})`);
      g.addColorStop(1, 'rgba(255,230,170,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 70, y - 2, 140, 19 * SY);
    }
  }
}

function drawGangwayDoor(ctx, isLeft) {
  const w = 13;
  const x = isLeft ? VIEW.x + 1 : VIEW.x + VIEW.w - w - 1;
  const y = wy(266), h = 88 * SY;
  ctx.fillStyle = '#22303f';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#54432e';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  // Door window with a moonlit glint.
  ctx.fillStyle = '#12293f';
  ctx.fillRect(x + 3, y + 9, w - 6, 25);
  ctx.fillStyle = 'rgba(233,238,247,0.9)';
  ctx.beginPath(); ctx.arc(x + w / 2 + 2, y + 17, 2.3, 0, Math.PI * 2); ctx.fill();
  // Panel ribs.
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 44 + i * 12); ctx.lineTo(x + w - 2, y + 44 + i * 12);
    ctx.stroke();
  }
  // Brass handle.
  ctx.fillStyle = '#d8b46a';
  ctx.beginPath();
  ctx.arc(x + (isLeft ? w - 4 : 4), y + h / 2 + 14, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawNamePlates(ctx, level) {
  const text = level.name.replace('—', '·').replace(/\s+Car$/, '').toUpperCase();
  ctx.font = 'bold 10px Georgia, serif';
  const pw = ctx.measureText(text).width + 18, ph = 19;
  const plates = [
    { x: wx(52) - pw / 2, y: wy(252) - ph },
    { x: wx(832) - pw / 2, y: wy(356) },
  ];
  for (const p of plates) {
    const g = ctx.createLinearGradient(0, p.y, 0, p.y + ph);
    g.addColorStop(0, '#8a6f35');
    g.addColorStop(0.5, '#c9a54e');
    g.addColorStop(1, '#7c612c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(p.x, p.y, pw, ph, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(40,28,8,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#2e2008';
    ctx.textAlign = 'center';
    ctx.fillText(text, p.x + pw / 2, p.y + 13.5);
    ctx.fillStyle = 'rgba(46,32,8,0.9)';
    for (const [sx, sy] of [[4, 4], [pw - 4, 4], [4, ph - 4], [pw - 4, ph - 4]]) {
      ctx.beginPath(); ctx.arc(p.x + sx, p.y + sy, 1.3, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.textAlign = 'left';
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
  // Twinkle: a brief four-point glint, phased per item.
  const tw = Math.pow(Math.max(0, Math.sin(time * 1.6 + item.x * 0.11 + item.y * 0.05)), 6);
  if (tw > 0.04) {
    const L = (star ? 14 : 9.5) * (0.35 + tw);
    ctx.strokeStyle = star ? `rgba(210,240,255,${0.9 * tw})` : `rgba(255,255,255,${0.85 * tw})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-L, 0); ctx.lineTo(L, 0);
    ctx.moveTo(0, -L); ctx.lineTo(0, L);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${tw})`;
    ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
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
  counter: ['#54432e', '#665334', 'SERVICE'],
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

// Kinds whose furniture detail replaces the centre label.
const DETAIL_KINDS = new Set([
  'luggage', 'sacks', 'berth', 'curtain', 'table', 'bench', 'bar',
  'armchairs', 'sofa', 'plant', 'safe', 'strongbox', 'vaultdoor',
]);

function drawCover(ctx, c, isLow) {
  const x = wx(c.x), y = wy(c.y), w = c.w * SX, h = c.h * SY;
  const st = COVER_STYLE[c.kind] || ['#444', '#555', ''];
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = st[0];
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = st[1];
  ctx.fillRect(x, y, w, Math.min(7, h));
  const det = COVER_DETAIL[c.kind];
  if (det) det(ctx, c, x, y, w, h);
  ctx.strokeStyle = isLow ? 'rgba(160,200,160,0.5)' : 'rgba(0,0,0,0.45)';
  ctx.lineWidth = isLow ? 1.5 : 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  if (isLow) {
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.setLineDash([]);
  }
  if (st[2] && w > 52 && h > 20 && !DETAIL_KINDS.has(c.kind)) {
    ctx.fillStyle = 'rgba(255,240,200,0.55)';
    ctx.font = 'bold 9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(st[2], x + w / 2, y + h / 2 + 3);
  }
}

// ------------------------------------------------- furniture detail ----
// Each painter works in screen pixels inside the cover rect and uses the
// item's world position as a hash seed, so no two pieces are identical.

function sackBlob(ctx, cx, cy, r, tone) {
  ctx.fillStyle = tone;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.arc(cx, cy - r - 1.5, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 1.15, Math.PI * 1.5); ctx.stroke();
}

const COVER_DETAIL = {
  crates(ctx, c, x, y, w, h) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    for (let yy = y + 11; yy < y + h - 2; yy += 11) {
      ctx.beginPath(); ctx.moveTo(x + 2, yy); ctx.lineTo(x + w - 2, yy); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(28,18,8,0.55)';
    ctx.fillRect(x + w * 0.18, y + 1, 5, h - 2);
    ctx.fillRect(x + w * 0.72, y + 1, 5, h - 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.moveTo(x + 2, y + h - 2); ctx.lineTo(x + w - 2, y + 2); ctx.stroke();
  },

  luggage(ctx, c, x, y, w, h) {
    const shades = ['#5f4870', '#54406b', '#6b5278'];
    const n = 3, cw = (w - 8) / n;
    for (let i = 0; i < n; i++) {
      const cx = x + 4 + i * cw;
      ctx.fillStyle = shades[i % 3];
      ctx.beginPath(); ctx.roundRect(cx, y + 5, cw - 3, h - 10, 4); ctx.fill();
      ctx.fillStyle = 'rgba(20,12,26,0.6)';
      ctx.fillRect(cx + cw / 2 - 4.5, y + 5, 3.5, h - 10);
      ctx.fillRect(cx + cw / 2 + 1.5, y + 5, 3.5, h - 10);
      ctx.strokeStyle = '#c9a54e';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(cx + cw / 2 - 1.5, y + 5, 4.5, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,200,0.75)';
      ctx.fillRect(cx + 4, y + h - 13, 9, 5);
    }
  },

  sacks(ctx, c, x, y, w, h) {
    const n = Math.max(2, Math.floor(w / 22));
    for (let i = 0; i < n; i++) {
      const cx = x + (i + 0.5) * (w / n);
      const r = Math.min(h * 0.42, w / n * 0.46);
      sackBlob(ctx, cx, y + h / 2 + 2, r, i % 2 ? '#6d6150' : '#7a6c58');
    }
  },

  berth(ctx, c, x, y, w, h) {
    // Headboard, pillow, mattress and a folded blanket.
    ctx.fillStyle = '#223349';
    ctx.fillRect(x, y, 5, h);
    ctx.fillStyle = '#42597a';
    ctx.fillRect(x + 5, y + 3, w - 8, h - 6);
    ctx.fillStyle = '#ddd6c4';
    ctx.beginPath(); ctx.roundRect(x + 9, y + 7, w * 0.24, h - 14, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(90,80,60,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x + 9, y + 7, w * 0.24, h - 14, 4); ctx.stroke();
    ctx.fillStyle = '#7a3049';
    ctx.fillRect(x + w * 0.4, y + 5, w * 0.56, h - 10);
    ctx.fillStyle = '#93506a';
    ctx.fillRect(x + w * 0.4, y + 5, 5, h - 10);
    ctx.strokeStyle = 'rgba(255,220,230,0.35)';
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(x + w * 0.4 + 3, y + 8, w * 0.56 - 6, h - 16);
    ctx.setLineDash([]);
  },

  curtain(ctx, c, x, y, w, h) {
    for (let px = x + 3; px < x + w - 2; px += 6) {
      ctx.fillStyle = (Math.floor((px - x) / 6) % 2) ? 'rgba(0,0,0,0.22)' : 'rgba(255,200,210,0.10)';
      ctx.fillRect(px, y + 2, 3.4, h - 4);
    }
    ctx.fillStyle = '#c9a54e';
    ctx.fillRect(x, y + h - 3, w, 2);
  },

  table(ctx, c, x, y, w, h) {
    // White cloth, place settings and a little centrepiece.
    ctx.fillStyle = '#e9e3d3';
    ctx.beginPath(); ctx.roundRect(x + 3, y + 3, w - 6, h - 6, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(120,105,80,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x + 6, y + 6, w - 12, h - 12, 2); ctx.stroke();
    const spots = [[0.26, 0.32], [0.74, 0.32], [0.26, 0.7], [0.74, 0.7]];
    for (const [fx, fy] of spots) {
      const px = x + w * fx, py = y + h * fy;
      ctx.fillStyle = '#fbfaf5';
      ctx.beginPath(); ctx.arc(px, py, 5.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#b9b0a0';
      ctx.beginPath(); ctx.arc(px, py, 5.4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py, 2.8, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(190,220,240,0.85)';
      ctx.beginPath(); ctx.arc(px + 8.5, py - 3.5, 2, 0, Math.PI * 2); ctx.fill();
    }
    const cx = x + w / 2, cy = y + h / 2;
    ctx.fillStyle = '#3f6038';
    ctx.beginPath(); ctx.arc(cx, cy, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c95d7a';
    ctx.beginPath(); ctx.arc(cx, cy - 1.5, 2.1, 0, Math.PI * 2); ctx.fill();
  },

  counter(ctx, c, x, y, w, h) {
    // Serving counter: a cloche dome, trays and glasses along the top.
    ctx.fillStyle = '#8d99a6';
    ctx.beginPath(); ctx.arc(x + w / 2, y + 22, 13, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#c8d2dc';
    ctx.beginPath(); ctx.arc(x + w / 2 - 3, y + 17, 4, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#d8b46a';
    ctx.fillRect(x + 6, y + 22, w - 12, 2.5);
    ctx.fillStyle = 'rgba(240,244,248,0.8)';
    ctx.fillRect(x + 8, y + 34, w - 16, 7);
    ctx.fillStyle = 'rgba(190,220,240,0.8)';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 11 + i * 13, y + 52 + (i % 2) * 14, 3.4, 6);
    ctx.fillStyle = 'rgba(255,240,200,0.5)';
    ctx.font = 'bold 8px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('SERVICE', x + w / 2, y + h - 6);
  },

  bench(ctx, c, x, y, w, h) {
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.4;
    for (let i = 1; i < 4; i++) {
      const yy = y + (h / 4) * i;
      ctx.beginPath(); ctx.moveTo(x + 3, yy); ctx.lineTo(x + w - 3, yy); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(230,220,200,0.16)';
    ctx.fillRect(x + 4, y + 3, w - 8, 3);
  },

  bar(ctx, c, x, y, w, h) {
    // Bottle row on the back shelf, brass rail, panelled front.
    const bottleCols = ['#3f7a4a', '#b07f2e', '#7a3a3a', '#4a6b8a', '#8a8f96', '#5d4a7a'];
    ctx.fillStyle = 'rgba(20,12,4,0.55)';
    ctx.fillRect(x + 4, y + 4, w - 8, 17);
    const n = Math.max(5, Math.floor(w / 13));
    for (let i = 0; i < n; i++) {
      const bx = x + 8 + i * ((w - 16) / n);
      const bh = 8 + hash2(c.x + i * 3, c.y) * 5;
      ctx.fillStyle = bottleCols[i % bottleCols.length];
      ctx.fillRect(bx, y + 21 - bh, 4.6, bh);
      ctx.fillRect(bx + 1.4, y + 21 - bh - 3.4, 1.8, 3.6);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(bx + 0.8, y + 21 - bh + 1.5, 1.1, bh - 3);
    }
    ctx.fillStyle = '#d8b46a';
    ctx.fillRect(x + 3, y + 22, w - 6, 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    for (let px = x + w / 4; px < x + w - 4; px += w / 4) {
      ctx.beginPath(); ctx.moveTo(px, y + 28); ctx.lineTo(px, y + h - 3); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,240,200,0.6)';
    ctx.font = 'bold 8.5px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE BAR', x + w / 2, y + h - 5);
  },

  armchairs(ctx, c, x, y, w, h) {
    const n = 2, cw = (w - 9) / n;
    for (let i = 0; i < n; i++) {
      const cx = x + 4 + i * (cw + 1);
      ctx.fillStyle = '#68464e';
      ctx.beginPath(); ctx.roundRect(cx, y + 4, cw, h - 8, 7); ctx.fill();
      ctx.fillStyle = '#7d5760';
      ctx.beginPath(); ctx.roundRect(cx + 5, y + 9, cw - 10, h * 0.42, 5); ctx.fill();
      ctx.fillStyle = '#8d6873';
      ctx.beginPath(); ctx.roundRect(cx + 7, y + h * 0.55, cw - 14, h * 0.3, 4); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(cx + 1.5, y + 8, 3, h - 16);
      ctx.fillRect(cx + cw - 4.5, y + 8, 3, h - 16);
    }
  },

  cabinet(ctx, c, x, y, w, h) {
    ctx.strokeStyle = 'rgba(216,180,106,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
    ctx.beginPath(); ctx.moveTo(x + 5, y + h / 2); ctx.lineTo(x + w - 5, y + h / 2); ctx.stroke();
    ctx.fillStyle = 'rgba(16,20,14,0.65)';
    const n = Math.max(4, Math.floor(w / 14));
    for (let i = 0; i < n; i++) {
      const bx = x + 9 + i * ((w - 18) / n);
      ctx.fillRect(bx, y + 11, 4, h / 2 - 14);
      ctx.fillRect(bx + 1.3, y + 8.5, 1.6, 3);
      ctx.fillRect(bx, y + h / 2 + 6, 4, h / 2 - 13);
    }
    ctx.strokeStyle = 'rgba(220,235,255,0.14)';
    ctx.beginPath(); ctx.moveTo(x + 8, y + h - 6); ctx.lineTo(x + w * 0.5, y + 6); ctx.stroke();
  },

  sofa(ctx, c, x, y, w, h) {
    const n = 3, cw = (w - 8) / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? '#4d5c47' : '#546550';
      ctx.beginPath(); ctx.roundRect(x + 4 + i * cw, y + 3, cw - 2.5, h - 6, 4); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x + 2, y + 3, 4, h - 6);
    ctx.fillRect(x + w - 6, y + 3, 4, h - 6);
  },

  plant(ctx, c, x, y, w, h) {
    const cx = x + w / 2, cy = y + h / 2;
    ctx.fillStyle = '#8a5638';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 5); ctx.lineTo(cx + 6, cy + 5);
    ctx.lineTo(cx + 4, cy + 11); ctx.lineTo(cx - 4, cy + 11);
    ctx.closePath(); ctx.fill();
    const greens = ['#3a5c3a', '#47704a', '#2e4a2e', '#557c58'];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + hash2(c.x, i) * 0.7;
      const r = 4.5 + hash2(c.y, i * 3) * 3;
      ctx.fillStyle = greens[i % 4];
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 6.5, cy - 3 + Math.sin(a) * 4.5, r, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  safe(ctx, c, x, y, w, h) {
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
    const cx = x + w / 2, cy = y + h / 2;
    ctx.strokeStyle = '#c8ccd2';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy - 8, 7.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy - 8, 2, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const a = i * (Math.PI * 2 / 3) + 0.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 3, cy - 8 + Math.sin(a) * 3);
      ctx.lineTo(cx + Math.cos(a) * 7, cy - 8 + Math.sin(a) * 7);
      ctx.stroke();
    }
    ctx.fillStyle = '#c8ccd2';
    ctx.fillRect(cx - 9, cy + 12, 18, 3.4);
    ctx.fillStyle = 'rgba(255,240,200,0.5)';
    for (const [rx, ry] of [[9, 9], [w - 9, 9], [9, h - 9], [w - 9, h - 9]]) {
      ctx.beginPath(); ctx.arc(x + rx, y + ry, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  },

  strongbox(ctx, c, x, y, w, h) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x + 3, y + 9); ctx.lineTo(x + w - 3, y + 9); ctx.stroke();
    ctx.fillStyle = 'rgba(24,20,14,0.6)';
    ctx.fillRect(x + w * 0.22, y + 1, 6, h - 2);
    ctx.fillRect(x + w * 0.7, y + 1, 6, h - 2);
    ctx.strokeStyle = '#c9a54e';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2 + 3, 6.5, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,200,0.5)';
    for (const [rx, ry] of [[7, 5], [w - 7, 5], [7, h - 5], [w - 7, h - 5]]) {
      ctx.beginPath(); ctx.arc(x + rx, y + ry, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  },

  vaultdoor(ctx, c, x, y, w, h) {
    const cx = x + w / 2, cy = y + h / 2;
    const R = Math.min(w, h) * 0.33;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#aeb6bf';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 3; i++) {
      const a = i * (Math.PI * 2 / 3) + 0.4;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(a) * R * 0.92, cy - Math.sin(a) * R * 0.92);
      ctx.lineTo(cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92);
      ctx.stroke();
    }
    ctx.fillStyle = '#c9a54e';
    ctx.beginPath(); ctx.arc(cx, cy, 4.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x + 3, y + 10, 4, h - 20);
    ctx.fillRect(x + w - 7, y + 10, 4, h - 20);
    ctx.fillStyle = 'rgba(255,240,200,0.55)';
    for (let i = 0; i < 6; i++) {
      const a = i * (Math.PI / 3) + 0.26;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * (R + 6), cy + Math.sin(a) * (R + 6), 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  },
};

// ---------------------------------------------------- loose props ----
// Decorative set dressing from levels.js `props`: no collision, no logic,
// purely what the eye lands on between the cover pieces.

function drawProps(ctx, level, time) {
  for (const p of level.props || []) {
    switch (p.kind) {
      case 'sackpile': propSackPile(ctx, p); break;
      case 'cratesmall': propCrateSmall(ctx, p); break;
      case 'trolley': case 'cart': propCart(ctx, p); break;
      case 'readlamp': propReadLamp(ctx, p, time); break;
      case 'slippers': propSlippers(ctx, p); break;
      case 'stool': propStool(ctx, p); break;
      case 'sidetable': propSideTable(ctx, p); break;
      case 'rug': propRug(ctx, p); break;
      case 'case': propCase(ctx, p, time); break;
      case 'tripwire': propTripwire(ctx, p, time); break;
    }
  }
}

function propSackPile(ctx, p) {
  const x = wx(p.x), y = wy(p.y), w = p.w * SX, h = p.h * SY;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 3, y + 4, w, h);
  const spots = [[0.26, 0.62], [0.62, 0.66], [0.44, 0.3], [0.8, 0.34], [0.14, 0.3]];
  spots.forEach(([fx, fy], i) => {
    const r = Math.min(w, h) * (0.26 + hash2(p.x + i, p.y) * 0.07);
    sackBlob(ctx, x + w * fx, y + h * fy, r, i % 2 ? '#6d6150' : '#7a6c58');
  });
  ctx.fillStyle = 'rgba(255,240,200,0.5)';
  ctx.font = 'bold 8px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('MAIL', x + w / 2, y + h - 4);
}

function propCrateSmall(ctx, p) {
  const x = wx(p.x), y = wy(p.y), w = p.w * SX, h = p.h * SY;
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = '#5a4026';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#6e4f2e';
  ctx.fillRect(x, y, w, 6);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  for (let yy = y + 11; yy < y + h - 2; yy += 11) {
    ctx.beginPath(); ctx.moveTo(x + 2, yy); ctx.lineTo(x + w - 2, yy); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(28,18,8,0.55)';
  ctx.fillRect(x + w * 0.42, y + 1, 5, h - 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function propCart(ctx, p) {
  const x = wx(p.x), y = wy(p.y), w = p.w * SX, h = p.h * SY;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 3, y + 4, w, h);
  // Frame and shelves.
  ctx.fillStyle = '#7d8894';
  ctx.fillRect(x, y + 6, w, 4);
  ctx.fillRect(x, y + h - 9, w, 3.4);
  ctx.fillStyle = '#5d6873';
  ctx.fillRect(x + 2, y + 6, 3, h - 12);
  ctx.fillRect(x + w - 5, y + 6, 3, h - 12);
  // A cloche dome and tray on top.
  ctx.fillStyle = '#aeb9c4';
  ctx.beginPath(); ctx.arc(x + w * 0.36, y + 7, 9, Math.PI, 0); ctx.fill();
  ctx.fillStyle = 'rgba(240,244,248,0.85)';
  ctx.fillRect(x + w * 0.58, y + 2.5, w * 0.34, 4.5);
  ctx.fillStyle = '#c95d7a';
  ctx.beginPath(); ctx.arc(x + w * 0.72, y + 4.5, 1.8, 0, Math.PI * 2); ctx.fill();
  // Handle and wheels.
  ctx.strokeStyle = '#c9a54e';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 3, y + 9); ctx.lineTo(x + 1, y + 9); ctx.stroke();
  ctx.fillStyle = '#1c1f24';
  for (const fx of [0.14, 0.86]) {
    ctx.beginPath(); ctx.arc(x + w * fx, y + h - 2.5, 3.6, 0, Math.PI * 2); ctx.fill();
  }
}

function propReadLamp(ctx, p, time) {
  const x = wx(p.x), y = wy(p.y);
  const flicker = 0.85 + 0.15 * Math.sin(time * 5.1 + p.x);
  const g = ctx.createRadialGradient(x, y, 1, x, y, 17);
  g.addColorStop(0, `rgba(255,205,110,${0.5 * flicker})`);
  g.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2c2118';
  ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd98c';
  ctx.beginPath(); ctx.arc(x, y - 0.6, 1.9, 0, Math.PI * 2); ctx.fill();
}

function propSlippers(ctx, p) {
  const x = wx(p.x), y = wy(p.y);
  ctx.fillStyle = '#a8bdd2';
  for (const dx of [-5.5, 5.5]) {
    ctx.beginPath(); ctx.ellipse(x + dx, y, 3.6, 6.4, dx * 0.03, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath(); ctx.ellipse(x - 5.5, y - 3.4, 2.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 5.5, y - 3.4, 2.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
}

function propStool(ctx, p) {
  const x = wx(p.x), y = wy(p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.arc(x + 1.5, y + 2.5, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a3049';
  ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9a54e';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(x, y, 8.2, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,220,230,0.35)';
  ctx.beginPath(); ctx.arc(x - 2.5, y - 2.5, 3, 0, Math.PI * 2); ctx.fill();
}

function propSideTable(ctx, p) {
  const x = wx(p.x), y = wy(p.y), w = p.w * SX, h = p.h * SY;
  const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2 - 2;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.arc(cx + 2, cy + 3, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4d3a26';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9a54e';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx, cy, r - 2.5, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(200,228,248,0.9)';
  ctx.beginPath(); ctx.arc(cx - 4, cy - 3, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b07f2e';
  ctx.beginPath(); ctx.arc(cx + 5, cy + 4, 2.4, 0, Math.PI * 2); ctx.fill();
}

function propRug(ctx, p) {
  const x = wx(p.x), y = wy(p.y), w = p.w * SX, h = p.h * SY;
  ctx.fillStyle = '#40222e';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#c9a54e';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x + 5.5, y + 5.5, w - 11, h - 11);
  ctx.strokeStyle = 'rgba(201,165,78,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 11.5, y + 11.5, w - 23, h - 23);
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(Math.PI / 4);
  ctx.strokeRect(-13, -13, 26, 26);
  ctx.restore();
}

function propCase(ctx, p, time) {
  const x = wx(p.x), y = wy(p.y), w = p.w * SX, h = p.h * SY;
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = '#2c2620';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#4a4238';
  ctx.fillRect(x + 7, y + h * 0.52, w - 14, h * 0.34);
  // The gem inside, coloured by hash, with a slow twinkle.
  const gems = ['#e34a6b', '#5aa2e8', '#57c98a', '#e8c85a'];
  const cx = x + w / 2, cy = y + h * 0.36;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = gems[Math.floor(hash2(p.x, p.y) * 4) % 4];
  ctx.fillRect(-4.6, -4.6, 9.2, 9.2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(-4.6, -4.6, 4.4, 4.4);
  ctx.restore();
  const tw = Math.pow(Math.max(0, Math.sin(time * 1.5 + p.x * 0.2)), 6);
  if (tw > 0.05) {
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * tw})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 8 * tw - 2, cy); ctx.lineTo(cx + 8 * tw + 2, cy);
    ctx.moveTo(cx, cy - 8 * tw - 2); ctx.lineTo(cx, cy + 8 * tw + 2);
    ctx.stroke();
  }
  // Glass over the top.
  ctx.fillStyle = 'rgba(165,215,255,0.13)';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.strokeStyle = '#c9a54e';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeStyle = 'rgba(230,245,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + 5, y + h - 5); ctx.lineTo(x + w * 0.45, y + 4); ctx.stroke();
}

function propTripwire(ctx, p, time) {
  const x1 = wx(p.x1), y1 = wy(p.y1), x2 = wx(p.x2), y2 = wy(p.y2);
  // Emitter posts.
  for (const [px, py] of [[x1, y1], [x2, y2]]) {
    ctx.fillStyle = '#22262c';
    ctx.fillRect(px - 2.5, py - 5, 5, 10);
    ctx.fillStyle = '#ff5347';
    ctx.beginPath(); ctx.arc(px, py - 1.5, 1.8, 0, Math.PI * 2); ctx.fill();
  }
  const pulse = 0.68 + 0.32 * Math.sin(time * 3.2 + p.y1);
  ctx.strokeStyle = `rgba(255,60,50,${0.16 * pulse})`;
  ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = `rgba(255,96,84,${0.9 * pulse})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  // A spark travelling the wire.
  const f = (time * 0.22 + p.y1 * 0.01) % 1;
  ctx.fillStyle = 'rgba(255,190,180,0.95)';
  ctx.beginPath();
  ctx.arc(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 1.7, 0, Math.PI * 2);
  ctx.fill();
}

// ------------------------------------------- the Velmora Star display ----

function starItem(level) {
  return level.loot.find((i) => i.name.includes('VELMORA'));
}

function drawStarPedestal(ctx, game) {
  const star = starItem(game.level);
  if (!star) return;
  const x = wx(star.x), y = wy(star.y);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.roundRect(x - 29, y - 12, 60, 36, 5); ctx.fill();
  const g = ctx.createLinearGradient(0, y - 18, 0, y + 20);
  g.addColorStop(0, '#4a4238');
  g.addColorStop(1, '#2a251f');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(x - 30, y - 18, 60, 38, 5); ctx.fill();
  ctx.strokeStyle = '#c9a54e';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#c9a54e';
  ctx.fillRect(x - 30, y - 6.5, 60, 2);
  // Glass dome over the display.
  ctx.strokeStyle = 'rgba(190,225,255,0.55)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(x, y - 1, 17, Math.PI, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(230,245,255,0.3)';
  ctx.beginPath(); ctx.arc(x, y - 1, 13.5, Math.PI * 1.2, Math.PI * 1.55); ctx.stroke();
}

function drawStarBeam(ctx, game, time) {
  const star = starItem(game.level);
  if (!star) return;
  const x = wx(star.x), y = wy(star.y);
  const taken = star.taken;
  const pulse = 0.75 + 0.25 * Math.sin(time * 2.1);
  const alpha = (taken ? 0.08 : 0.12) * pulse;
  const top = VIEW.y + 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const grad = ctx.createLinearGradient(0, top, 0, y);
  grad.addColorStop(0, `rgba(150,210,255,${alpha * 0.35})`);
  grad.addColorStop(1, `rgba(170,225,255,${alpha})`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x - 7, top); ctx.lineTo(x + 7, top);
  ctx.lineTo(x + 20, y - 4); ctx.lineTo(x - 20, y - 4);
  ctx.closePath(); ctx.fill();
  // Sparkles rising through the beam.
  for (let i = 0; i < 6; i++) {
    const f = (time * 0.13 + i / 6 + hash2(i, 7) * 0.2) % 1;
    const sx = x + Math.sin(f * 9 + i * 2.4) * 9;
    const sy = y - 6 - f * (y - top - 14);
    ctx.globalAlpha = Math.max(0.08, (taken ? 0.3 : 0.75) * (1 - f));
    ctx.fillStyle = '#dcf5ff';
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
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
    g.addColorStop(0, 'rgba(255,216,130,0.46)');
    g.addColorStop(0.38, 'rgba(255,182,82,0.22)');
    g.addColorStop(0.72, 'rgba(255,168,66,0.08)');
    g.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    // Dust motes drifting slowly through the lamplight.
    for (let i = 0; i < 9; i++) {
      const a0 = hash2(l.x + i * 3.1, l.y) * Math.PI * 2;
      const fr = 0.15 + hash2(l.y, i * 7.7) * 0.72;
      const ang = a0 + time * 0.07 * (1 + (i % 3) * 0.6);
      const mx = x + Math.cos(ang) * r * fr;
      const my = y + Math.sin(ang) * r * fr * 0.9 + Math.sin(time * 0.6 + i * 1.9) * 2.5;
      const tw = 0.14 + 0.3 * (0.5 + 0.5 * Math.sin(time * 0.8 + i * 2.3));
      ctx.fillStyle = `rgba(255,236,190,${tw})`;
      ctx.fillRect(mx, my, 1.6, 1.6);
    }
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
  // Shimmer: a dashed edge that crawls slowly around the cone, plus a
  // soft breathing glow just inside the rim.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r, a - half, a + half);
  ctx.closePath();
  ctx.strokeStyle = g.state === 'SPOTTED' ? 'rgba(255,140,130,0.35)' : 'rgba(255,232,170,0.28)';
  ctx.setLineDash([7, 11]);
  ctx.lineDashOffset = -time * 30;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r * 0.96, a - half, a + half);
  ctx.closePath();
  ctx.strokeStyle = `rgba(255,240,200,${0.05 + 0.035 * Math.sin(time * 2.2 + g.x)})`;
  ctx.lineWidth = 3;
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
  ctx.strokeStyle = g.state === 'SPOTTED' ? '#ff5347' : g.state === 'SUSPICIOUS' ? '#ffa53d' : 'rgba(34,37,44,0.35)';
  ctx.lineWidth = g.state === 'PATROL' ? 1 : 2;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 12, w, 20, 6);
  ctx.stroke();
  ctx.lineWidth = 1;
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

  drawFieldNotes(ctx, game);
}

// The thief's notebook for this car: what is aboard, what to mind, and
// what the floor will do to your footsteps. Written from live car data.
function drawFieldNotes(ctx, game) {
  const { level } = game;
  panel(ctx, 8, 566, 180, 188, 'FIELD NOTES');
  ctx.font = 'italic 12px Georgia, serif';
  ctx.fillStyle = '#cfd6df';
  let y = 596;
  const note = (text) => { ctx.fillText(text, 18, y); y += 21; };
  const topLoot = level.loot.reduce((a, b) => (b.value > (a ? a.value : -1) ? b : a), null);
  if (topLoot) note(`Prize: ${topLoot.name} ($${topLoot.value})`);
  note(`Prizes left aboard: ${game.lootLeft} of ${game.lootTotal}`);
  note(`Wardens on this car: ${game.guards.length}`);
  const lit = level.lamps.filter((l) => l.on).length;
  note(`Lamps lit: ${lit} of ${level.lamps.length} — douse [R]`);
  if (level.gravel && level.gravel.length) {
    note(`Gravel: ${level.gravel.length} patch${level.gravel.length > 1 ? 'es' : ''} — loud`);
    note('unless you sneak across.');
  } else {
    note('Carpet throughout — soft steps.');
  }
  note(game.spottedThisCar ? 'They know a thief is aboard.' : 'No one suspects a thing… yet.');
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

  drawDetection(ctx, game);
}

// The sharpest eyes on you right now: the most suspicious warden, how
// close the nearest one walks, and what to do about it.
function drawDetection(ctx, game) {
  const p = game.player;
  panel(ctx, 1092, 360, 180, 132, 'DETECTION');
  let top = null, nearest = null, nd = Infinity;
  for (const g of game.guards) {
    if (!top || g.suspicion > top.suspicion) top = g;
    const d = Math.hypot(g.x - p.x, g.y - p.y);
    if (d < nd) { nd = d; nearest = g; }
  }
  let y = 390;
  ctx.font = '12.5px sans-serif';
  if (top && top.suspicion > 0.02) {
    ctx.fillStyle = top.suspicion > 0.7 ? '#ff7a5c' : top.suspicion > 0.35 ? '#ffa53d' : '#ffd66e';
    ctx.fillText(`${top.name} — ${top.state}`, 1104, y); y += 8;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(1104, y, 150, 7);
    ctx.fillStyle = top.suspicion > 0.7 ? '#ff5347' : top.suspicion > 0.35 ? '#ffa53d' : '#ffd66e';
    ctx.fillRect(1104, y, 150 * top.suspicion, 7);
    y += 24;
  } else {
    ctx.fillStyle = '#7be495';
    ctx.fillText('No eyes on you', 1104, y);
    y += 24;
  }
  ctx.fillStyle = '#aebdd0';
  ctx.font = '12.5px sans-serif';
  if (nearest) ctx.fillText(`Nearest warden: ${Math.round(nd / 10)} paces`, 1104, y);
  y += 19;
  ctx.fillStyle = top && top.suspicion > 0.7 ? '#ff7a5c' : '#9fb0c3';
  ctx.font = 'italic 12px Georgia, serif';
  ctx.fillText(top && top.suspicion > 0.7 ? 'Break line of sight — now!' : top && top.suspicion > 0.35 ? 'Freeze, or slip to shadow.' : 'The car is calm.', 1104, y);
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
