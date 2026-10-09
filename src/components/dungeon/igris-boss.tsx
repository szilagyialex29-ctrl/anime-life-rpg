import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useFBX } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

export const IGRIS_URL = "/models/igris.fbx";

type State = { pos: THREE.Vector3; face: number; anim: string; hit?: number | undefined; hp?: number };

/** Splits the loose sword (separate parts standing beside the body in bind pose) off the skinned mesh. */
function splitSword(mesh: THREE.SkinnedMesh) {
  const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
  const p = g.attributes.position as THREE.BufferAttribute;
  const n = p.count;
  const par = Int32Array.from({ length: n }, (_, i) => i);
  const find = (i: number) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
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
      tris.forEach((t, k) => { for (let v = 0; v < 3; v++) for (let c = 0; c < src.itemSize; c++) out[(k * 3 + v) * src.itemSize + c] = src.array[(t + v) * src.itemSize + c]; });
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
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).clone() as THREE.MeshPhongMaterial;
    if (tint) { mat.emissive = new THREE.Color(tint); mat.emissiveIntensity = 0.25; }
    mesh.material = mat; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    const { body, sword } = splitSword(mesh);
    if (!hand || !sword.boundingBox || sword.attributes.position.count === 0) continue;
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
  const model = useMemo(() => buildIgris(fbx, height, tint), [fbx, height, tint]);
  const root = useRef<THREE.Group>(null);
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const walk = useMemo(() => { const c = fbx.animations[0]; if (!c) return null; const clip = c.clone(); clip.tracks = clip.tracks.filter(t => !/Hips\.position/.test(t.name)); return mixer.clipAction(clip); }, [fbx, mixer]);
  useEffect(() => { walk?.play(); return () => { mixer.stopAllAction(); }; }, [walk, mixer]);
  const lunge = useRef(0); const dead = useRef(0); const last = useRef("");

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05); const s = get(); const g = root.current; if (!g) return;
    if (s.anim !== last.current && s.anim === "attack-melee-right") lunge.current = 1;
    last.current = s.anim;
    lunge.current = Math.max(0, lunge.current - dt * 2.2);
    if (s.anim === "die") dead.current = Math.min(1, dead.current + dt * 1.5); else dead.current = 0;
    if (walk) walk.timeScale = s.anim === "walk" ? 1 : s.anim === "die" ? 0 : 0.25;
    mixer.update(dt);
    g.position.copy(s.pos); g.rotation.y = s.face;
    const swing = Math.sin(lunge.current * Math.PI);
    g.rotation.x = swing * 0.35 - dead.current * 1.45;
    const flash = s.hit && s.hit > 0 ? 1 + s.hit * 0.08 : 1; g.scale.setScalar(flash);
  });
  return <group ref={root}><primitive object={model} /></group>;
}

useFBX.preload(IGRIS_URL);
