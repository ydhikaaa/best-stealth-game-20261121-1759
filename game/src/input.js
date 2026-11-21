// input.js — keyboard and mouse state for the game.
// Tracks held keys, one-shot pressed keys (consumed each frame by main),
// and the mouse position converted into world coordinates by main.

export class Input {
  constructor(canvas, toWorld) {
    this.canvas = canvas;
    this.toWorld = toWorld;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, wx: 0, wy: 0, down: false };
    this.clicks = [];

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
      const w = this.toWorld(this.mouse.x, this.mouse.y);
      this.mouse.wx = w.x;
      this.mouse.wy = w.y;
    });
    canvas.addEventListener('mousedown', (e) => {
      this.mouse.down = true;
      const w = this.toWorld(this.mouse.x, this.mouse.y);
      this.clicks.push({ x: w.x, y: w.y });
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
  }

  down(...names) {
    return names.some((n) => this.keys.has(n));
  }

  // One-shot: true only on the frame the key went down.
  hit(...names) {
    return names.some((n) => this.pressed.has(n));
  }

  endFrame() {
    this.pressed.clear();
    this.clicks.length = 0;
  }
}
