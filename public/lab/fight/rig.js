import * as T from "./vendor/three.module.js";
const vec = (a) => new T.Vector3(...a);
const qtmp = new T.Quaternion();
export async function loadAnatomy() {
  const [res, metadata] = await Promise.all([
    fetch("./assets/anatomy.mskin"),
    fetch("./assets/anatomy.json").then((r) => {
      if (!r.ok) throw Error("Anatomy metadata unavailable");
      return r.json();
    }),
  ]);
  if (!res.ok) throw Error("Anatomy mesh unavailable");
  const buffer = await res.arrayBuffer(),
    d = new DataView(buffer);
  if (new TextDecoder().decode(buffer.slice(0, 8)) !== "MSKIN001")
    throw Error("Invalid anatomy mesh");
  const n = d.getUint32(8, true),
    ni = d.getUint32(12, true),
    parts = d.getUint32(16, true);
  if (
    n > 100000 ||
    parts !== 8 ||
    buffer.byteLength !== 284 + n * 48 + parts * 4 + ni * 4
  )
    throw Error("Invalid anatomy dimensions");
  let o = 20;
  const readF = () => {
    const v = d.getFloat32(o, true);
    o += 4;
    return v;
  };
  const offsets = Array.from(
    { length: 22 },
    () => new T.Vector3(readF(), readF(), readF()),
  );
  const positions = new Float32Array(n * 3),
    normals = new Float32Array(n * 3),
    joints = new Uint16Array(n * 4),
    weights = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) positions[i * 3 + c] = readF();
    for (let c = 0; c < 3; c++) normals[i * 3 + c] = readF();
    for (let c = 0; c < 4; c++) {
      joints[i * 4 + c] = d.getUint16(o, true);
      o += 2;
    }
    for (let c = 0; c < 4; c++) weights[i * 4 + c] = readF();
  }
  const indices = new Uint32Array(ni),
    geometry = new T.BufferGeometry();
  let cursor = 0;
  for (let p = 0; p < parts; p++) {
    const count = d.getUint32(o, true);
    o += 4;
    if (count % 3 || cursor + count > ni)
      throw Error("Invalid anatomy indices");
    geometry.addGroup(cursor, count, Math.min(p, 2));
    for (let i = 0; i < count; i++) {
      indices[cursor++] = d.getUint32(o, true);
      o += 4;
    }
  }
  geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new T.BufferAttribute(normals, 3));
  geometry.setAttribute("skinIndex", new T.BufferAttribute(joints, 4));
  geometry.setAttribute("skinWeight", new T.BufferAttribute(weights, 4));
  geometry.setIndex(new T.BufferAttribute(indices, 1));
  const inverse = metadata.source_bind_positions.map((p, i) => {
    const q = new T.Quaternion(...metadata.alignment_rotations[i]);
    return new T.Matrix4()
      .makeRotationFromQuaternion(q)
      .setPosition(vec(p).applyQuaternion(q).negate());
  });
  return { geometry, offsets, inverse, metadata };
}
// Analytical two-link IK. The target is clamped inside reach; pole fixes the bend plane.
export function solveTwoLink(start, target, pole, a, b) {
  const direction = target.clone().sub(start);
  const distance = T.MathUtils.clamp(
    direction.length(),
    Math.abs(a - b) + 0.02,
    a + b - 0.012,
  );
  if (direction.lengthSq() < 1e-8) direction.set(0, -1, 0);
  else direction.normalize();
  const side = pole
    .clone()
    .sub(start)
    .addScaledVector(direction, -pole.clone().sub(start).dot(direction));
  if (side.lengthSq() < 1e-8)
    side.crossVectors(
      direction,
      Math.abs(direction.y) < 0.9
        ? new T.Vector3(0, 1, 0)
        : new T.Vector3(1, 0, 0),
    );
  side.normalize();
  const along = (a * a - b * b + distance * distance) / (2 * distance);
  const height = Math.sqrt(Math.max(0, a * a - along * along));
  return {
    middle: start
      .clone()
      .addScaledVector(direction, along)
      .addScaledVector(side, height),
    end: start.clone().addScaledVector(direction, distance),
  };
}
export class AnatomyFighter {
  constructor(asset, muscleColor) {
    this.group = new T.Group();
    this.poseSpace = new T.Group();
    this.group.add(this.poseSpace);
    this.offsets = asset.offsets;
    this.bones = asset.offsets.map((o, i) => {
      const b = new T.Bone();
      b.name = asset.metadata.names[i];
      b.position.copy(o);
      return b;
    });
    asset.metadata.parents.forEach((p, i) => {
      if (p < 0) this.poseSpace.add(this.bones[i]);
      else this.bones[p].add(this.bones[i]);
    });
    this.materials = [0xdad1b6, muscleColor, 0x6c9da0].map(
      (color) =>
        new T.MeshStandardMaterial({
          color,
          roughness: 0.72,
          metalness: 0.04,
          side: T.DoubleSide,
        }),
    );
    this.mesh = new T.SkinnedMesh(asset.geometry, this.materials);
    this.poseSpace.add(this.mesh);
    this.poseSpace.updateMatrixWorld(true);
    this.skeleton = new T.Skeleton(
      this.bones,
      asset.inverse.map((m) => m.clone()),
    );
    this.mesh.bind(this.skeleton, new T.Matrix4());
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
  }
  position(i) {
    this.poseSpace.updateMatrixWorld(true);
    return this.poseSpace.worldToLocal(
      this.bones[i].getWorldPosition(new T.Vector3()),
    );
  }
  orient(i, child, start, end) {
    // World here means character-local, before its arena yaw and translation.
    const desired = new T.Quaternion().setFromUnitVectors(
      this.offsets[child].clone().normalize(),
      end.clone().sub(start).normalize(),
    );
    const parent = this.bones[i].parent;
    const parentQ = parent.getWorldQuaternion(new T.Quaternion());
    const spaceQ = this.poseSpace.getWorldQuaternion(new T.Quaternion());
    this.bones[i].quaternion.copy(
      parentQ.invert().multiply(spaceQ).multiply(desired),
    );
    this.poseSpace.updateMatrixWorld(true);
  }
  limb(a, b, end, target, pole) {
    const start = this.position(a);
    const solution = solveTwoLink(
      start,
      target,
      pole,
      this.offsets[b].length(),
      this.offsets[end].length(),
    );
    this.orient(a, b, start, solution.middle);
    this.orient(b, end, solution.middle, solution.end);
  }
  level(i, rotation = new T.Quaternion()) {
    const parent = this.bones[i].parent.getWorldQuaternion(new T.Quaternion());
    this.bones[i].quaternion.copy(
      parent
        .invert()
        .multiply(this.poseSpace.getWorldQuaternion(new T.Quaternion()))
        .multiply(rotation),
    );
  }
  update(f, opponentDistance = Infinity) {
    this.group.position.x = f.x;
    this.group.rotation.y = (f.facing * Math.PI) / 2;
    for (const b of this.bones) b.quaternion.identity();
    this.bones[0].position.y = 0.84;
    this.bones[2].rotation.x = f.lean - (f.recovery > 0 ? 0.06 : 0);
    this.poseSpace.updateMatrixWorld(true);
    const kick = f.limb === "kick" ? f.extension : 0;
    // The right foot is always the support foot during a kick. No root Y input exists.
    const stride =
      Math.abs(f.moving) > 0.05 && kick < 0.1 ? Math.sin(f.walk) * 0.075 : 0;
    const liftL =
      Math.abs(f.moving) > 0.05 ? Math.max(0, Math.cos(f.walk)) * 0.025 : 0;
    const liftR =
      Math.abs(f.moving) > 0.05 ? Math.max(0, -Math.cos(f.walk)) * 0.025 : 0;
    const footL = new T.Vector3(
      0.12,
      0.095 + liftL + kick * Math.min(0.74, f.aim - 0.1),
      0.17 + stride + kick * 0.54,
    );
    // Contact stop: do not let the target pass through the opponent's torso.
    footL.z = Math.min(footL.z, Math.max(0.18, opponentDistance - 0.25));
    const footR = new T.Vector3(
      -0.12,
      0.095 + (kick > 0.1 ? 0 : liftR),
      -0.2 - stride,
    );
    this.limb(14, 15, 16, footL, new T.Vector3(0.15, 0.5, 1.4));
    this.limb(18, 19, 20, footR, new T.Vector3(-0.15, 0.5, 1.4));
    this.level(16, qtmp.setFromAxisAngle(new T.Vector3(1, 0, 0), kick * -0.9));
    this.level(20);
    for (const [upper, lower, hand, sign, name] of [
      [7, 8, 9, 1, "lead"],
      [11, 12, 13, -1, "rear"],
    ]) {
      const ext = f.limb === name ? f.extension : 0;
      const target = new T.Vector3(
        sign * (0.13 - ext * 0.06),
        (f.guard ? 1.39 : 1.3) * (1 - ext) + f.aim * ext,
        0.22 + ext * 0.32,
      );
      target.z = Math.min(target.z, Math.max(0.22, opponentDistance - 0.23));
      this.limb(
        upper,
        lower,
        hand,
        target,
        new T.Vector3(sign * 0.55, 0.92, 0.18),
      );
      // Wrist follows forearm; fingers use the same authored closed grip as Tracer.
      this.bones[hand].quaternion.identity();
    }
    this.poseSpace.updateMatrixWorld(true);
    for (const m of this.materials) {
      m.emissive.setHex(f.flash > 0 ? 0xffad58 : 0x000000);
      m.emissiveIntensity = f.flash > 0 ? 0.4 : 0;
    }
  }
}
