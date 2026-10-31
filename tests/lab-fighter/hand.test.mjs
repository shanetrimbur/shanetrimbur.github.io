// node --test tests/lab-fighter/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measure, makeHand, sidesOf, flatten, HandStream, NeutralCapture, OneEuro, wrap } from '../../public/lab/fighter/hand.js';
import { rng, between } from './rng.mjs';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

function randomDigits(r) {
  const finger = () => ({ flex: between(r, 0, 65), curl: between(r, 0, 150), spread: between(r, -20, 20) });
  return { thumb: { open: between(r, 10, 70), curl: between(r, 0, 100) }, index: finger(), middle: finger(), ring: finger(), pinky: finger() };
}

test('synthetic hand round trip recovers digit angles within 3 degrees (both hands)', () => {
  const r = rng(7);
  for (let i = 0; i < 200; i++) {
    const digits = randomDigits(r);
    for (const chirality of ['right', 'left']) {
      const h = makeHand({ digits, chirality, roll: between(r, -40, 40) });
      const m = measure(h.image, h.world);
      assert.equal(m.valid, true, m.reason);
      close(m.digits.thumb.open, digits.thumb.open, 3, `${chirality} thumb.open`);
      close(m.digits.thumb.curl, digits.thumb.curl, 3, `${chirality} thumb.curl`);
      for (const f of ['index', 'middle', 'ring', 'pinky']) {
        close(m.digits[f].flex, digits[f].flex, 3, `${chirality} ${f}.flex`);
        close(m.digits[f].curl, digits[f].curl, 3, `${chirality} ${f}.curl`);
        close(m.digits[f].spread, digits[f].spread, 3, `${chirality} ${f}.spread`);
      }
    }
  }
});

test('roll follows the picture rotation of the hand', () => {
  for (const chirality of ['right', 'left']) {
    const a = measure(...Object.values(makeHand({ chirality, roll: 0 })));
    const b = measure(...Object.values(makeHand({ chirality, roll: 25 })));
    close(wrap(b.roll - a.roll), 25, 1e-6, `${chirality} roll`);
  }
});

test('a bone pointing at the camera hides its spread instead of guessing', () => {
  const h = makeHand({ digits: { index: { flex: 85, curl: 10, spread: 0 } } });
  assert.equal(measure(h.image, h.world).digits.index.spread, null);
});

test('screen sides: right hand has the thumb on the left, left hand the reverse, mirror flips', () => {
  const right = makeHand({ chirality: 'right' }), left = makeHand({ chirality: 'left' });
  assert.deepEqual(sidesOf(measure(right.image, right.world)), { legLeftDigit: 'index', armLeftDigit: 'thumb' });
  assert.deepEqual(sidesOf(measure(left.image, left.world)), { legLeftDigit: 'middle', armLeftDigit: 'pinky' });
  assert.deepEqual(sidesOf(measure(right.image, right.world, { mirror: true })), { legLeftDigit: 'middle', armLeftDigit: 'pinky' });
});

test('framing: ok, too far, too close, near edge', () => {
  const at = o => { const h = makeHand(o); return measure(h.image, h.world).framing.status; };
  assert.equal(at({}), 'ok');
  assert.equal(at({ scale: 0.8 }), 'too far');
  assert.equal(at({ scale: 5 }), 'too close');
  assert.equal(at({ cx: 0.97 }), 'near edge');
});

test('G6: bad frames are rejected without throwing', () => {
  const good = makeHand();
  const nanImage = good.image.map((p, i) => (i === 8 ? { ...p, x: NaN } : p));
  const zero = good.world.map(() => ({ x: 0, y: 0, z: 0 }));
  const huge = good.world.map(p => ({ x: p.x * 100, y: p.y * 100, z: p.z * 100 }));
  const cases = [
    [undefined, undefined], [[], []], [good.image.slice(0, 20), good.world], [nanImage, good.world],
    [good.image, zero], [good.image, huge], [good.image.map(() => null), good.world], ['x', 7],
  ];
  for (const [im, w] of cases) {
    const m = measure(im, w);
    assert.equal(m.valid, false);
    assert.equal(typeof m.reason, 'string');
  }
  assert.equal(measure(good.image, good.world, { aspect: 0 }).valid, false);
});

test('One Euro: constant stays constant, a step converges', () => {
  const f = new OneEuro();
  for (let t = 0; t < 1000; t += 16) assert.equal(f.f(3, t), 3);
  let y = 0;
  for (let t = 1000; t < 4000; t += 16) y = f.f(10, t);
  close(y, 10, 1e-3, 'step');
});

test('HandStream holds a hidden spread and keeps roll continuous across ±180', () => {
  const s = new HandStream();
  const up = makeHand({ roll: 178 }), over = makeHand({ roll: -178 });
  const a = s.push(measure(up.image, up.world), 0);
  const b = s.push(measure(over.image, over.world), 16);
  assert.ok(Math.abs(wrap(b.roll - a.roll)) < 10, `roll jumped ${a.roll} -> ${b.roll}`);
  const hidden = makeHand({ digits: { index: { flex: 88, curl: 0, spread: 0 } } });
  const c = s.push(measure(hidden.image, hidden.world), 32);
  assert.equal(c['index.spread'], b['index.spread']);
  assert.equal(s.push({ valid: false }, 48), null);
});

test('NeutralCapture averages frames and records the sides', () => {
  const n = new NeutralCapture(3);
  const h = makeHand({ chirality: 'left' });
  const m = measure(h.image, h.world);
  for (let i = 0; i < 3; i++) n.add(flatten(m), m);
  assert.equal(n.ready, true);
  close(n.value['index.flex'], m.digits.index.flex, 1e-9, 'neutral');
  assert.deepEqual(n.sides, { legLeftDigit: 'middle', armLeftDigit: 'pinky' });
});
