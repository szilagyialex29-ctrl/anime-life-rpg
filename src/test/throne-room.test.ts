import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { COLUMNS, canWalk, moveInHall, hallGround } from "@/lib/throne-room";
import { bindIgrisAttack } from "@/lib/igris-animation";

describe("Throne room movement", () => {
  it.each([[11, 0], [-11, 0], [0, -21], [0, 17]])("blocks the hall wall at %s, %s", (x, z) => {
    expect(canWalk(x, z)).toBe(false);
  });
  it.each(COLUMNS)("blocks each column at $x, $z", ({ x, z }) => {
    expect(canWalk(x, z)).toBe(false);
    expect(moveInHall(x - 2, z, 4, 0).x).toBeLessThan(x - 1.19);
  });
  it("slides along a wall without stopping forward movement", () => {
    const p = moveInHall(10.6, 5, 1, -1);
    expect(p.x).toBeLessThanOrEqual(10.65);
    expect(p.z).toBeCloseTo(4);
  });
  it("allows the central aisle and climbs the dais", () => {
    expect(canWalk(0, -14.5)).toBe(true);
    expect(hallGround(0, -13)).toBe(0.22);
    expect(hallGround(4, -16)).toBe(0.88);
  });
});

describe("Igris imported attack", () => {
  it("binds Mixamo names to every cloned bone and rejects root movement", () => {
    const rig = new THREE.Group();
    const a = new THREE.Bone(); a.name = "mixamorigRightArm";
    const b = new THREE.Bone(); b.name = "mixamorigRightArm"; rig.add(a, b);
    const source = new THREE.AnimationClip("attack", 1, [
      new THREE.QuaternionKeyframeTrack("mixamorig:RightArm.quaternion", [0], [0, 0, 0, 1]),
      new THREE.VectorKeyframeTrack("mixamorig:Hips.position", [0], [100, 100, 100]),
    ]);
    const clip = bindIgrisAttack(source, rig);
    expect(clip.tracks.map(t => t.name)).toEqual([`${a.uuid}.quaternion`, `${b.uuid}.quaternion`]);
    expect(source.tracks).toHaveLength(2);
  });
  it("rejects an incompatible skeleton", () => {
    const source = new THREE.AnimationClip("bad", 1, [new THREE.QuaternionKeyframeTrack("OtherBone.quaternion", [0], [0, 0, 0, 1])]);
    expect(() => bindIgrisAttack(source, new THREE.Group())).toThrow("nem kompatibilis");
  });
});