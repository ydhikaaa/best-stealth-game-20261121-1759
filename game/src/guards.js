// guards.js — train wardens: waypoint patrols, swaying lantern vision cones,
// line of sight blocked by high cover (and by low cover when the player is
// sneaking behind it), suspicion that fills and recovers, investigation of
// last-seen points and noises, and the SPOTTED call.

export const CONE_RANGE = 178;
export const CONE_HALF = 0.56; // radians, ~32 degrees each side

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function segHitsRect(x1, y1, x2, y2, r) {
  // Segment vs AABB: sample-free slab test.
  const dx = x2 - x1, dy = y2 - y1;
  let t0 = 0, t1 = 1;
  const axes = [
    [dx, x1, r.x, r.x + r.w],
    [dy, y1, r.y, r.y + r.h],
  ];
  for (const [d, p, lo, hi] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) return false;
    } else {
      let ta = (lo - p) / d, tb = (hi - p) / d;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
      if (t0 > t1) return false;
    }
  }
  return true;
}

export function lineOfSight(x1, y1, x2, y2, level, playerSneaking, smokes) {
  for (const c of level.coverHigh) {
    if (segHitsRect(x1, y1, x2, y2, c)) return false;
  }
  if (playerSneaking) {
    for (const c of level.coverLow) {
      if (segHitsRect(x1, y1, x2, y2, c)) return false;
    }
  }
  for (const s of smokes) {
    // Smoke blocks sight when the segment passes through the cloud.
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((s.x - x1) * dx + (s.y - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = x1 + dx * t, py = y1 + dy * t;
    if (Math.hypot(px - s.x, py - s.y) < s.r) return false;
  }
  return true;
}

let guardSeq = 0;

export class Guard {
  constructor(def, index) {
    this.id = guardSeq++;
    this.name = 'Warden ' + (index + 1);
    this.path = def.path;
    this.speed = def.speed;
    this.x = def.path[0][0];
    this.y = def.path[0][1];
    this.wp = 1 % def.path.length;
    this.angle = Math.atan2(def.path[this.wp][1] - this.y, def.path[this.wp][0] - this.x);
    this.state = 'PATROL'; // PATROL | SUSPICIOUS | SPOTTED
    this.mode = 'patrol'; // patrol | pause | goto | look | return
    this.suspicion = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.lastSeen = null;
    this.target = null;
    this.timer = 0;
    this.bubble = null;
    this.bubbleT = 0;
    this.saidHm = false;
    this.alerted = false; // has fully suspected once: next full meter = SPOTTED
    this.stepT = 0;
  }

  say(text, dur = 1.6) {
    this.bubble = text;
    this.bubbleT = dur;
  }

  coneAngle(time) {
    // Lanterns sway gently on a moving train.
    return this.angle + Math.sin(time * 1.4 + this.phase) * 0.09;
  }

  investigate(x, y, urgent) {
    this.target = { x, y };
    this.mode = 'goto';
    if (urgent) {
      this.state = 'SUSPICIOUS';
      this.say("Who's there?");
    }
  }

  hearNoise(x, y) {
    if (this.mode === 'patrol' || this.mode === 'return') {
      this.investigate(x, y, false);
      if (!this.bubble) this.say('Hm?', 1.2);
    }
  }

  // Returns 'spotted' when this guard catches the player this frame.
  update(dt, time, level, player, smokes, fx) {
    if (this.bubbleT > 0) {
      this.bubbleT -= dt;
      if (this.bubbleT <= 0) this.bubble = null;
    }
    const dx = player.x - this.x, dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const inCone = dist < CONE_RANGE &&
      Math.abs(angleDiff(Math.atan2(dy, dx), this.coneAngle(time))) < CONE_HALF;
    const visible = inCone &&
      lineOfSight(this.x, this.y, player.x, player.y, level, player.sneaking, smokes);

    if (visible) {
      this.lastSeen = { x: player.x, y: player.y };
      const proximity = 1.25 - (dist / CONE_RANGE) * 0.75; // closer fills faster
      const light = player.lit ? 1.45 : 1.0;
      const posture = player.sprinting ? 1.8 : player.sneaking ? 0.5 : 1.0;
      this.suspicion += dt * 0.62 * proximity * light * posture;
      if (this.suspicion > 0.35 && !this.saidHm) {
        this.saidHm = true;
        this.say('Hm?', 1.1);
      }
      if (dist < 30) this.suspicion = 1; // bumped into the warden's lantern light
    } else {
      this.suspicion -= dt * (this.mode === 'look' ? 0.10 : 0.22);
      if (this.suspicion < 0.3) this.saidHm = false;
    }
    this.suspicion = Math.max(0, Math.min(1, this.suspicion));

    if (this.suspicion >= 1) {
      if (this.alerted) {
        this.state = 'SPOTTED';
        this.say('Got you!', 1.6);
        return 'spotted';
      }
      this.alerted = true;
      this.state = 'SUSPICIOUS';
      this.mode = 'pause';
      this.timer = 0.55;
      this.suspicion = 0.45;
      this.say("Who's there?", 1.8);
      fx.heat = Math.min(100, fx.heat + 18);
    }

    this.move(dt, level);
    return null;
  }

  move(dt, level) {
    let tx = null, ty = null, speed = this.speed;
    if (this.mode === 'patrol') {
      const [wx, wy] = this.path[this.wp];
      tx = wx; ty = wy;
      if (Math.hypot(wx - this.x, wy - this.y) < 6) {
        this.wp = (this.wp + 1) % this.path.length;
      }
    } else if (this.mode === 'pause') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.mode = this.lastSeen ? 'goto' : 'return';
        this.target = this.lastSeen;
      }
      return;
    } else if (this.mode === 'goto') {
      if (!this.target) { this.mode = 'return'; return; }
      tx = this.target.x; ty = this.target.y;
      speed = this.speed * 1.45;
      if (Math.hypot(tx - this.x, ty - this.y) < 10) {
        this.mode = 'look';
        this.timer = 2.1;
        this.lookBase = this.angle;
      }
    } else if (this.mode === 'look') {
      this.timer -= dt;
      this.angle = this.lookBase + Math.sin((2.1 - this.timer) * 2.6) * 0.85;
      if (this.timer <= 0) {
        this.mode = 'return';
        this.state = 'PATROL';
        this.alerted = false;
        this.suspicion = Math.min(this.suspicion, 0.3);
      }
      return;
    } else if (this.mode === 'return') {
      // Head back to the nearest waypoint, then resume the patrol loop.
      let best = 0, bd = Infinity;
      this.path.forEach(([wx, wy], i) => {
        const d = Math.hypot(wx - this.x, wy - this.y);
        if (d < bd) { bd = d; best = i; }
      });
      const [wx, wy] = this.path[best];
      tx = wx; ty = wy;
      if (bd < 8) {
        this.wp = (best + 1) % this.path.length;
        this.mode = 'patrol';
      }
    }
    if (tx === null) return;
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d > 1) {
      const step = Math.min(d, speed * dt);
      const nx = this.x + (dx / d) * step;
      const ny = this.y + (dy / d) * step;
      if (!hitsCover(nx, this.y, 13, level)) this.x = nx;
      if (!hitsCover(this.x, ny, 13, level)) this.y = ny;
      const want = Math.atan2(dy, dx);
      this.angle += clampAngle(angleDiff(want, this.angle), dt * 5);
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = speed > this.speed ? 0.24 : 0.34;
        this.footstepNear = true;
      }
    }
  }
}

function clampAngle(v, max) {
  return Math.max(-max, Math.min(max, v));
}

export function hitsCover(x, y, r, level) {
  const all = level.coverHigh.concat(level.coverLow);
  for (const c of all) {
    if (x + r > c.x && x - r < c.x + c.w && y + r > c.y && y - r < c.y + c.h) return true;
  }
  return false;
}
