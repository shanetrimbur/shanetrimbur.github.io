// Fixed-step arcade puppetry. Four independent limb channels; root motion stays separate.
export const STEP = 1 / 60;
export const LIMBS = ["lead", "rear", "kick", "rearKick"];
export const clamp = (v, lo, hi) =>
  Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
export function approach(v, t, s, dt) {
  return v + clamp(t - v, -s * dt, s * dt);
}
const isLeg = (name) => name === "kick" || name === "rearKick";
const channel = () => ({
  extension: 0,
  aim: 1.3,
  spread: 0,
  bend: 0.8,
  lift: 0,
  armed: true,
  hit: false,
  cooldown: 0,
});
export function makeFighter(x, facing) {
  return {
    x,
    facing,
    limbs: Object.fromEntries(LIMBS.map((n) => [n, channel()])),
    extension: 0,
    aim: 1.3,
    lean: 0,
    twist: 0,
    crouch: 0,
    limb: "lead",
    health: 100,
    guard: false,
    recovery: 0,
    flash: 0,
    walk: 0,
    moving: 0,
    contact: "both",
    activeLeg: null,
    strikes: 0,
    landed: 0,
    combo: 0,
    lastHit: -100,
  };
}
export function makeGame(playerIndex = 0) {
  return {
    fighters: [makeFighter(-0.49, 1), makeFighter(0.49, -1)],
    playerIndex: playerIndex === 1 ? 1 : 0,
    time: 0,
    mode: "dummy",
    ended: false,
    events: [],
  };
}
export function safeInput(input = {}) {
  const active = input.active === true;
  const selected = LIMBS.includes(input.limb) ? input.limb : "lead";
  const limbs = Object.fromEntries(
    LIMBS.map((name) => {
      const source =
        input.limbs?.[name] ||
        (name === selected
          ? {
              extension: input.extension,
              aim: input.aim,
              lift: isLeg(name) ? input.extension : 0,
            }
          : {});
      return [
        name,
        {
          extension: active ? clamp(source.extension ?? 0, 0, 1) : 0,
          lift: active ? clamp(source.lift ?? 0, 0, 1) : 0,
          aim: active ? clamp(source.aim ?? 1.3, 0.65, 1.8) : 1.3,
          spread: active ? clamp(source.spread ?? 0, -1, 1) : 0,
          bend: active ? clamp(source.bend ?? 0.8, 0, 1) : 0.8,
        },
      ];
    }),
  );
  return {
    limbs,
    lean: active ? clamp(input.lean ?? 0, -0.28, 0.28) : 0,
    twist: active ? clamp(input.twist ?? 0, -0.35, 0.35) : 0,
    crouch: active ? clamp(input.crouch ?? 0, 0, 0.2) : 0,
    move: clamp(input.move ?? 0, -1, 1),
    guard: input.guard === true || !active,
  };
}
export function aiInput(game, index = 1 - game.playerIndex) {
  if (game.mode !== "spar") return { active: true };
  const phase = game.time % 2.4,
    cycle = Math.floor(game.time / 2.4),
    name = LIMBS[cycle % 4];
  const d = Math.abs(game.fighters[index].x - game.fighters[1 - index].x),
    desired = isLeg(name) ? 0.81 : 0.65;
  const strike =
    phase > 0.65 && phase < 1.25
      ? Math.sin(((phase - 0.65) / 0.6) * Math.PI)
      : 0;
  return {
    active: true,
    limb: name,
    extension: strike,
    aim: 1.25 + 0.22 * Math.sin(game.time),
    move: d > desired + 0.03 ? 0.6 : d < desired - 0.06 ? -0.4 : 0,
    guard: phase > 1.55,
  };
}
export function stepGame(game, input, dt = STEP) {
  dt = clamp(dt, 0, STEP);
  game.events = [];
  if (game.ended) return;
  game.time += dt;
  const inputs = game.fighters.map((_, i) =>
    safeInput(i === game.playerIndex ? input : aiInput(game, i)),
  );
  game.fighters.forEach((f, i) => {
    const c = inputs[i];
    f.flash = Math.max(0, f.flash - dt);
    f.recovery = Math.max(0, f.recovery - dt);
    f.guard = c.guard;
    // Both arms can move together. Legs share a support constraint, with hysteresis to prevent foot-flipping.
    const l = c.limbs.kick.lift,
      r = c.limbs.rearKick.lift;
    if (!f.activeLeg) {
      if (Math.max(l, r) > 0.18) f.activeLeg = l >= r ? "kick" : "rearKick";
    } else if (
      c.limbs[f.activeLeg].lift < 0.1 &&
      f.limbs[f.activeLeg].lift < 0.1
    )
      f.activeLeg = null;
    for (const name of LIMBS) {
      const p = f.limbs[name],
        target = c.limbs[name],
        allowed = !isLeg(name) || f.activeLeg === name;
      p.cooldown = Math.max(0, p.cooldown - dt);
      const ext = allowed && !f.guard ? target.extension : 0;
      p.extension = approach(p.extension, ext, ext > p.extension ? 7 : 9, dt);
      p.lift = approach(p.lift, allowed && !f.guard ? target.lift : 0, 6, dt);
      p.aim = approach(p.aim, target.aim, 3.8, dt);
      p.spread = approach(p.spread, target.spread, 5, dt);
      p.bend = approach(p.bend, target.bend, 6, dt);
      if (p.extension < 0.46) {
        p.armed = true;
        p.hit = false;
      }
      if (p.extension > 0.68 && p.armed && !p.cooldown) {
        p.armed = false;
        p.cooldown = 0.22;
        f.strikes++;
      }
    }
    f.lean = approach(f.lean, c.lean, 1.8, dt);
    f.twist = approach(f.twist, c.twist, 2.5, dt);
    f.crouch = approach(f.crouch, c.crouch, 0.65, dt);
    f.limb = LIMBS.reduce((a, b) =>
      f.limbs[a].extension >= f.limbs[b].extension ? a : b,
    );
    f.extension = f.limbs[f.limb].extension;
    f.aim = f.limbs[f.limb].aim;
    const kicking = f.activeLeg && f.limbs[f.activeLeg].lift > 0.12;
    // Thumb travel remains available during strikes; a supporting foot always stays on the floor.
    const speed = c.move * (kicking ? 0.48 : 1.05) * (f.guard ? 0.75 : 1);
    f.moving = speed;
    f.x = clamp(f.x + f.facing * speed * dt, -1.45, 1.45);
    f.walk += Math.abs(speed) * dt * 9;
    f.contact = kicking ? (f.activeLeg === "kick" ? "right" : "left") : "both";
  });
  const [a, b] = game.fighters;
  if (b.x - a.x < 0.57) {
    const mid = clamp((a.x + b.x) / 2, -1.165, 1.165);
    a.x = mid - 0.285;
    b.x = mid + 0.285;
  }
  // Collect simultaneous contacts before applying recovery, so neither side wins by array order.
  const hits = [];
  game.fighters.forEach((f, i) =>
    LIMBS.forEach((name) => {
      const p = f.limbs[name],
        reach = isLeg(name) ? 0.93 : 0.73;
      if (
        !p.armed &&
        !p.hit &&
        p.extension > 0.74 &&
        Math.abs(f.x - game.fighters[1 - i].x) < reach
      ) {
        p.hit = true;
        hits.push({ attacker: i, limb: name });
      }
    }),
  );
  for (const hit of hits) {
    const f = game.fighters[hit.attacker],
      other = game.fighters[1 - hit.attacker],
      blocked = other.guard;
    f.landed++;
    f.combo = game.time - f.lastHit < 1.1 ? f.combo + 1 : 1;
    f.lastHit = game.time;
    other.flash = 0.18;
    other.health = Math.max(
      0,
      other.health - (blocked ? 1 : isLeg(hit.limb) ? 10 : 6),
    );
    other.recovery = blocked ? 0.06 : 0.14;
    game.events.push({
      ...hit,
      type: blocked ? "block" : "hit",
      combo: f.combo,
    });
  }
  if (game.fighters.some((f) => !f.health)) {
    game.ended = true;
    game.events.push({
      type: "round",
      winner: a.health === b.health ? null : a.health > b.health ? 0 : 1,
    });
  }
}
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
    let n = 0;
    while (this.accumulator >= STEP && n < 5) {
      callback(STEP);
      this.accumulator -= STEP;
      n++;
    }
    return n;
  }
}
