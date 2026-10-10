import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useFBX } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import slashAsset from "@/assets/igris-slash.asset.json";
import kickAsset from "@/assets/igris-kick.asset.json";
import spinAsset from "@/assets/igris-spin.asset.json";

export const IGRIS_URL = "/models/igris.fbx";

type State = { pos: THREE.Vector3; face: number; anim: string; hit?: number | undefined; hp?: number; attackId?: number; paused?: boolean };

/** Splits the loose sword (separate parts standing beside the body in bind pose) off the skinned mesh. */
function splitSword(mesh: THREE.SkinnedMesh) {
  const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  const n = p.count;
  const par: number[] = Array.from({ length: n }, (_, i) => i);
  const find = (start: number) => { let i = start; while (true) { const parent = par[i]; if (parent === undefined || parent === i) return i; const grand = par[parent]; if (grand === undefined) return parent; par[i] = grand; i = grand; } };
  const seen = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
    const j = seen.get(k); if (j === undefined) seen.set(k, i); else par[find(i)] = find(j);
  }
  for (let t = 0; t < n; t += 3) { const a = find(t); par[find(t + 1)] = a; par[find(t + 2)] = a; }
  const minX = new Map<number, number>();
  for (let i = 0; i < n; i++) { const r = find(i); minX.set(r, Math.min(minX.get(r) ?? Infinity, p.getX(i))); }
  const isSword = (i: number) => (minX.get(find(i)) ?? 0) > 1.45;

  const pick = (want: boolean, attrs: string[]) => {
    const geo = new THREE.BufferGeometry();
    const tris: number[] = [];
    for (let t = 0; t < n; t += 3) if (isSword(t) === want) tris.push(t);
    for (const name of attrs) {
      const src = g.attributes[name] as THREE.BufferAttribute; if (!src) continue;
      const out = new (src.array.constructor as Float32ArrayConstructor)(tris.length * 3 * src.itemSize);
      tris.forEach((t, k) => { for (let v = 0; v < 3; v++) for (let c = 0; c < src.itemSize; c++) out[(k * 3 + v) * src.itemSize + c] = src.array[(t + v) * src.itemSize + c] ?? 0; });
      geo.setAttribute(name, new THREE.BufferAttribute(out, src.itemSize, src.normalized));
    }
    return geo;
  };
  const body = pick(false, Object.keys(g.attributes));
  const sword = pick(true, ["position", "normal", "uv"]);
  sword.computeBoundingBox();
  return { body, sword };
}

function buildIgris(src: THREE.Group, height: number, tint?: string) {
  const root = SkeletonUtils.clone(src) as THREE.Group;
  root.updateMatrixWorld(true);
  let hand: THREE.Bone | null = null;
  root.traverse(o => { if ((o as THREE.Bone).isBone && /RightHand$/.test(o.name)) hand = o as THREE.Bone; });
  const meshes: THREE.SkinnedMesh[] = [];
  root.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(o as THREE.SkinnedMesh); });
  for (const mesh of meshes) {
    const base = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material; if (!base) continue;
    const mat = base.clone() as THREE.MeshPhongMaterial;
    if (tint) { mat.emissive = new THREE.Color(tint); mat.emissiveIntensity = 0.25; }
    mesh.material = mat; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    const { body, sword } = splitSword(mesh);
    if (!hand || !sword.boundingBox || sword.getAttribute("position").count === 0) continue;
    mesh.geometry = body;
    const bb = sword.boundingBox;
    // Grip: middle of the handle (bottom part, below the crossguard).
    const grip = new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.min.y + (bb.max.y - bb.min.y) * 0.17, (bb.min.z + bb.max.z) / 2);
    const swordMesh = new THREE.Mesh(sword, mat);
    swordMesh.castShadow = true; swordMesh.matrixAutoUpdate = false;
    // Desired pose in mesh space at bind time: grip at the palm, blade pointing forward and up.
    const palm = new THREE.Vector3(); (hand as THREE.Bone).getWorldPosition(palm); mesh.worldToLocal(palm);
    const desired = new THREE.Matrix4()
      .makeTranslation(palm.x, palm.y, palm.z)
      .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2.6))
      .multiply(new THREE.Matrix4().makeTranslation(-grip.x, -grip.y, -grip.z));
    const boneInv = (hand as THREE.Bone).matrixWorld.clone().invert();
    swordMesh.matrix.copy(boneInv.multiply(mesh.matrixWorld).multiply(desired));
    (hand as THREE.Bone).add(swordMesh);
  }
  const box = new THREE.Box3().setFromObject(root); const h = box.max.y - box.min.y || 1;
  const s = height / h; root.scale.multiplyScalar(s); root.position.y = -box.min.y * s;
  return root;
}

export function IgrisBoss({ height, tint, get }: { height: number; tint?: string; get: () => State }) {
  const fbx = useFBX(IGRIS_URL);
  const slash = useFBX(slashAsset.url);
  const kick = useFBX(kickAsset.url);
  const spin = useFBX(spinAsset.url);
  const model = useMemo(() => buildIgris(fbx, height, tint), [fbx, height, tint]);
  const root = useRef<THREE.Group>(null);
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const actions = useMemo(() => [fbx, slash, kick, spin].map((source, index) => {
    const original = source.animations[0]; if (!original) return null;
    const clip = original.clone(); clip.name = `igris-${index}`;
    clip.tracks = clip.tracks.filter(t => !/Hips\.position/.test(t.name));
    const action = mixer.clipAction(clip);
    if (index > 0) { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; }
    return action;
  }), [fbx, slash, kick, spin, mixer]);
  useEffect(() => () => { mixer.stopAllAction(); }, [mixer]);
  const dead = useRef(0); const lastAttack = useRef(-1); const active = useRef<THREE.AnimationAction | null>(null); const remaining = useRef(0);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05); const s = get(); const g = root.current; if (!g) return;
    g.position.copy(s.pos); g.rotation.y = s.face;
    if (s.paused) return;
    remaining.current = Math.max(0, remaining.current - dt);
    const attackId = s.attackId ?? 0;
    if (s.anim === "attack-melee-right" && attackId !== lastAttack.current) {
      lastAttack.current = attackId;
      const next = actions[1 + ((attackId - 1 + 3) % 3)];
      if (next) {
        active.current?.fadeOut(0.1);
        next.reset().setEffectiveTimeScale(next.getClip().duration / 1.1).fadeIn(0.1).play();
        active.current = next; remaining.current = 1.1;
      }
    }
    if (remaining.current === 0 && active.current !== actions[0]) {
      active.current?.fadeOut(0.15); const walk = actions[0];
      walk?.reset().fadeIn(0.15).play(); active.current = walk ?? null;
    }
    if (s.anim === "die") dead.current = Math.min(1, dead.current + dt * 1.5); else dead.current = 0;
    const walk = actions[0]; if (walk) walk.timeScale = s.anim === "walk" ? 1 : 0;
    mixer.timeScale = s.anim === "die" ? 0 : 1;
    mixer.update(dt);
    g.rotation.x = -dead.current * 1.45;
    const flash = s.hit && s.hit > 0 ? 1 + s.hit * 0.08 : 1; g.scale.setScalar(flash);
  });
  return <group ref={root}><primitive object={model} /></group>;
}

useFBX.preload(IGRIS_URL);
