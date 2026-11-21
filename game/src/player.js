// player.js — the thief: WASD/arrow movement with sneak (SHIFT, slow and
// silent, hides behind low cover) and sprint (SPACE, fast and loud), noise
// emission by floor type, lamp dousing, coin throws and smoke pellets.

import { WORLD_W, WORLD_H } from './levels.js';
import { hitsCover } from './guards.js';

export const WALK_SPEED = 148;
export const SNEAK_SPEED = 78;
export const SPRINT_SPEED = 262;
export const PLAYER_R = 13;

export class Player {
  constructor(level) {
    this.reset(level);
  }

  reset(level) {
    this.x = level.playerStart.x;
    this.y = level.playerStart.y;
    this.angle = 0;
    this.sneaking = false;
    this.forceSneak = false; // staged scenes: hold the crouch for screenshots
    this.sprinting = false;
    this.moving = false;
    this.lit = false;
    this.hidden = false;
    this.noise = 0; // radius of the noise made this frame
    this.stepT = 0;
    this.coins = level.coins;
    this.smokes = level.smokes;
    this.douses = level.douses;
    this.stepped = false; // a footstep sound is due (main plays it)
    this.stepLoud = false;
  }

  onGravel(level) {
    return level.gravel.some((g) =>
      this.x > g.x && this.x < g.x + g.w && this.y > g.y && this.y < g.y + g.h);
  }

  update(dt, input, level) {
    let mx = 0, my = 0;
    if (input.down('w', 'arrowup')) my -= 1;
    if (input.down('s', 'arrowdown')) my += 1;
    if (input.down('a', 'arrowleft')) mx -= 1;
    if (input.down('d', 'arrowright')) mx += 1;
    this.moving = mx !== 0 || my !== 0;
    this.sneaking = input.down('shift') || this.forceSneak;
    this.sprinting = input.down(' ') && this.moving && !this.sneaking;
    const speed = this.sneaking ? SNEAK_SPEED : this.sprinting ? SPRINT_SPEED : WALK_SPEED;
    if (this.moving) {
      const len = Math.hypot(mx, my);
      const vx = (mx / len) * speed * dt;
      const vy = (my / len) * speed * dt;
      if (!hitsCover(this.x + vx, this.y, PLAYER_R, level)) this.x += vx;
      if (!hitsCover(this.x, this.y + vy, PLAYER_R, level)) this.y += vy;
      this.x = Math.max(PLAYER_R + 4, Math.min(WORLD_W - PLAYER_R - 4, this.x));
      this.y = Math.max(PLAYER_R + 4, Math.min(WORLD_H - PLAYER_R - 4, this.y));
      this.angle = Math.atan2(my, mx);
    }

    // Noise: sprinting is loud anywhere; gravel crunches unless sneaking.
    const gravel = this.onGravel(level);
    this.noise = 0;
    if (this.moving && !this.sneaking) {
      if (this.sprinting) this.noise = 138;
      else if (gravel) this.noise = 96;
    }
    this.stepped = false;
    if (this.moving) {
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = this.sneaking ? 0.42 : this.sprinting ? 0.21 : 0.31;
        this.stepped = true;
        this.stepLoud = this.noise > 0;
      }
    }

    // Lit when standing in a live lamp's pool.
    this.lit = level.lamps.some((l) => l.on && Math.hypot(l.x - this.x, l.y - this.y) < l.r);

    // Hidden: sneaking with low cover between the player and every guard is
    // resolved per-guard in guards.js; the HUD flag means "crouched at cover".
    this.hidden = this.sneaking && level.coverLow.some((c) =>
      this.x > c.x - 20 && this.x < c.x + c.w + 20 &&
      this.y > c.y - 20 && this.y < c.y + c.h + 20);
  }

  nearestLamp(level, range) {
    let best = null, bd = range;
    for (const l of level.lamps) {
      if (!l.on) continue;
      const d = Math.hypot(l.x - this.x, l.y - this.y);
      if (d < bd) { bd = d; best = l; }
    }
    return best;
  }
}
