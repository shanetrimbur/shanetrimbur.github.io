// Pure, fixed-step game rules. Camera coordinates never become body positions or impulses.
export const STEP = 1 / 60;
export const clamp = (v, lo, hi) =>
  Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
export function approach(value, target, speed, dt) {
  return value + clamp(target - value, -speed * dt, speed * dt);
}
export function makeFighter(x, facing) {
  return {
    x,
    facing,
    extension: 0,
    aim: 1.3,
    lean: 0,
    limb: "lead",
    health: 100,
    guard: false,
    recovery: 0,
    cooldown: 0,
    armed: true,
    hit: false,
    flash: 0,
    walk: 0,
    moving: 0,
    contact: "both",
    strikes: 0,
    landed: 0,
  };
}
export function makeGame() {
  return {
    fighters: [makeFighter(-0.49, 1), makeFighter(0.49, -1)],
    time: 0,
    mode: "dummy",
    ended: false,
    events: [],
    aiPhase: 0,
  };
}
export function safeInput(input = {}) {
  const active = input.active === true;
  return {
    extension: active ? clamp(input.extension, 0, 1) : 0,
    aim: active ? clamp(input.aim, 0.75, 1.55) : 1.3,
    lean: active ? clamp(input.lean, -0.1, 0.1) : 0,
    limb: ["lead", "rear", "kick"].includes(input.limb) ? input.limb : "lead",
    move: clamp(input.move ?? 0, -1, 1),
    guard: input.guard === true || !active,
  };
}
export function aiInput(game) {
  if (game.mode !== "spar") return { active: true, extension: 0, guard: false };
  const phase = game.time % 3.2;
  const distance = game.fighters[1].x - game.fighters[0].x;
  const limb = Math.floor(game.time / 3.2) % 3 === 2 ? "kick" : "lead";
  const desired = limb === "kick" ? 0.81 : 0.67;
  return {
    active: true,
    limb,
    extension:
      phase > 1.1 && phase < 1.65
        ? Math.sin(((phase - 1.1) / 0.55) * Math.PI)
        : 0,
    aim: 1.2 + 0.18 * Math.sin(game.time),
    move:
      distance > desired + 0.02 ? 0.45 : distance < desired - 0.06 ? -0.45 : 0,
    guard: phase > 2.1,
  };
}
export function stepGame(game, input, dt = STEP) {
  dt = clamp(dt, 0, STEP);
  game.events = [];
  if (game.ended) return;
  game.time += dt;
  const inputs = [safeInput(input), safeInput(aiInput(game))];
  game.fighters.forEach((f, i) => {
    const c = inputs[i];
    f.flash = Math.max(0, f.flash - dt);
    f.cooldown = Math.max(0, f.cooldown - dt);
    f.recovery = Math.max(0, f.recovery - dt);
    f.guard = c.guard;
    // Changing limbs first retracts; prevents teleporting an extended fist into a foot.
    if (f.limb !== c.limb && f.extension < 0.1) f.limb = c.limb;
    const target =
      f.limb === c.limb && !f.guard && f.recovery === 0 ? c.extension : 0;
    f.extension = approach(
      f.extension,
      target,
      target > f.extension ? 3.1 : 4.8,
      dt,
    );
    f.aim = approach(f.aim, c.aim, 1.5, dt);
    f.lean = approach(f.lean, c.lean, 0.4, dt);
    if (f.extension < 0.22) {
      f.armed = true;
      f.hit = false;
    }
    if (f.extension > 0.48 && f.armed && !f.cooldown) {
      f.armed = false;
      f.strikes++;
      f.cooldown = 0.38;
    }
    const supportLocked = f.limb === "kick" && f.extension > 0.1;
    const speed =
      (supportLocked ? 0 : c.move) *
      (f.extension > 0.3 ? 0.16 : 0.7) *
      (f.guard ? 0.5 : 1);
    f.moving = speed;
    f.x = clamp(f.x + f.facing * speed * dt, -1.45, 1.45);
    f.walk += Math.abs(speed) * dt * 9;
    f.contact = f.limb === "kick" && f.extension > 0.15 ? "right" : "both";
  });
  const [a, b] = game.fighters;
  // Character collision: bounded roots cannot cross, fly, or collapse together.
  if (b.x - a.x < 0.57) {
    const center = clamp((a.x + b.x) / 2, -1.165, 1.165);
    a.x = center - 0.285;
    b.x = center + 0.285;
  }
  game.fighters.forEach((f, i) => {
    const other = game.fighters[1 - i];
    const reach = f.limb === "kick" ? 0.93 : 0.72;
    if (
      !f.armed &&
      !f.hit &&
      f.extension > 0.7 &&
      Math.abs(f.x - other.x) < reach &&
      !f.recovery
    ) {
      f.hit = true;
      f.landed++;
      other.flash = 0.18;
      const blocked = other.guard;
      other.health = Math.max(
        0,
        other.health - (blocked ? 2 : f.limb === "kick" ? 12 : 8),
      );
      other.recovery = blocked ? 0.09 : 0.2;
      game.events.push({
        type: blocked ? "block" : "hit",
        attacker: i,
        limb: f.limb,
      });
      if (!other.health) {
        game.ended = true;
        game.events.push({ type: "round", winner: i });
      }
    }
  });
}
// Bounded catch-up: a suspended tab never produces seconds of delayed attacks.
export class FixedClock {
  constructor() {
    this.last = null;
    this.accumulator = 0;
  }
  reset() {
    this.last = null;
    this.accumulator = 0;
  }
  advance(now, callback) {
    if (this.last === null) {
      this.last = now;
      return 0;
    }
    this.accumulator += clamp((now - this.last) / 1000, 0, 0.08);
    this.last = now;
    let count = 0;
    while (this.accumulator >= STEP && count < 5) {
      callback(STEP);
      this.accumulator -= STEP;
      count++;
    }
    return count;
  }
}
