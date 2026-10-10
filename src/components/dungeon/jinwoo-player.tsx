import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useFBX } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import comboAsset from "@/assets/jinwoo-combo.asset.json";

const BONE_MAP: Record<string, string> = {
  Bip001_Pelvis: "mixamorigHips", Bip001_Spine: "mixamorigSpine", Bip001_Spine1: "mixamorigSpine1", Bip001_Spine2: "mixamorigSpine2",
  Bip001_Neck: "mixamorigNeck", Bip001_Head: "mixamorigHead",
};
for (const [side, prefix] of [["L", "Left"], ["R", "Right"]]) {
  for (const [target, source] of [["Clavicle", "Shoulder"], ["UpperArm", "Arm"], ["Forearm", "ForeArm"], ["Hand", "Hand"], ["Thigh", "UpLeg"], ["Calf", "Leg"], ["Foot", "Foot"], ["Toe0", "ToeBase"]]) {
    BONE_MAP[`Bip001_${side}_${target}`] = `mixamorig${prefix}${source}`;
  }
}

type PlayerState = { pos: THREE.Vector3; face: number; anim: string; attackId: number; paused: boolean };

export function JinwooPlayer({ get }: { get: () => PlayerState }) {
  const fbx = useFBX(comboAsset.url);
  const walking = useFBX("/models/igris.fbx");
  const root = useRef<THREE.Group>(null);
  const prepared = useMemo(() => {
    const model = SkeletonUtils.clone(fbx) as THREE.Group;
    const bindTransforms = new Map<THREE.Object3D, { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 }>();
    model.traverse(o => bindTransforms.set(o, { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }));
    const original = fbx.animations[0];
    if (!original) throw new Error("Jinwoo támadása hiányzik.");
    const combo = original.clone(); combo.name = "jinwoo-combo";
    combo.tracks = combo.tracks.filter(t => !t.name.endsWith(".position"));
    // Keep only the highest-detail hair mesh, not four overlapping LODs.
    model.traverse(o => {
      const mesh = o as THREE.Mesh; if (!mesh.isMesh) return;
      if (/Hair0_NLOD[123]/.test(mesh.name)) mesh.visible = false;
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    });
    const source = SkeletonUtils.clone(walking) as THREE.Group;
    const targets: THREE.SkinnedMesh[] = []; const sources: THREE.SkinnedMesh[] = [];
    model.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) targets.push(o as THREE.SkinnedMesh); });
    source.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) sources.push(o as THREE.SkinnedMesh); });
    const target = targets.find(m => /Body0/.test(m.name)); const sourceMesh = sources[0]; const sourceClip = walking.animations[0];
    let walk: THREE.AnimationClip | null = null;
    if (target && sourceMesh && sourceClip) {
      model.updateWorldMatrix(true, true); source.updateWorldMatrix(true, true);
      walk = SkeletonUtils.retargetClip(target, sourceMesh, sourceClip, { names: BONE_MAP, hip: "mixamorigHips", fps: 24, preservePosition: true });
      walk.name = "jinwoo-walk";
      walk.tracks = walk.tracks.filter(t => !t.name.endsWith(".position"));
      walk.tracks.forEach(t => { t.name = t.name.replace(/^\.bones\[([^\]]+)\]/, "$1"); });
    }
    bindTransforms.forEach((t, o) => { o.position.copy(t.p); o.quaternion.copy(t.q); o.scale.copy(t.s); });
    // FBX contains one skeleton per mesh with duplicate names. Address every
    // matching bone by UUID instead of silently animating only the first rig.
    const bindAll = (clip: THREE.AnimationClip) => {
      clip.tracks = clip.tracks.flatMap(track => {
        const dot = track.name.lastIndexOf("."); const name = track.name.slice(0, dot); const property = track.name.slice(dot);
        const matches: THREE.Object3D[] = []; model.traverse(o => { if (o.name === name) matches.push(o); });
        return matches.map(o => { const copy = track.clone(); copy.name = o.uuid + property; return copy; });
      });
    };
    bindAll(combo); if (walk) bindAll(walk);
    const restMixer = new THREE.AnimationMixer(model);
    restMixer.clipAction(combo).play(); restMixer.update(0); restMixer.stopAllAction();
    const idle = new THREE.AnimationClip("jinwoo-idle", 1, combo.tracks.map(track => {
      const interpolant = (track as THREE.KeyframeTrack & { createInterpolant: () => { evaluate: (time: number) => ArrayLike<number> } }).createInterpolant();
      const value = Array.from(interpolant.evaluate(0));
      return new THREE.QuaternionKeyframeTrack(track.name, [0, 1], [...value, ...value]);
    }));
    model.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(model); const scale = 1.9 / (bounds.max.y - bounds.min.y || 1);
    // Normalize outside the animated hierarchy so Armature tracks cannot reset it.
    const normalized = new THREE.Group(); normalized.add(model); normalized.scale.setScalar(scale);
    normalized.position.set(-(bounds.min.x + bounds.max.x) * scale / 2, -bounds.min.y * scale, -(bounds.min.z + bounds.max.z) * scale / 2);
    return { model, normalized, clips: [idle, ...(walk ? [walk] : []), combo] };
  }, [fbx, walking]);
  const mixer = useMemo(() => new THREE.AnimationMixer(prepared.model), [prepared]);
  const actions = useMemo(() => Object.fromEntries(prepared.clips.map(c => [c.name, mixer.clipAction(c)])), [prepared, mixer]);
  const active = useRef<THREE.AnimationAction | null>(null); const lastAttack = useRef(-1); const remaining = useRef(0); const dead = useRef(0);
  useEffect(() => () => { mixer.stopAllAction(); }, [mixer]);
  useFrame((_, raw) => {
    const g = root.current; if (!g) return;
    const s = get(); const dt = Math.min(raw, 0.05);
    g.position.copy(s.pos); g.rotation.y = s.face;
    if (s.paused) return;
    remaining.current = Math.max(0, remaining.current - dt);
    if (s.attackId !== lastAttack.current && s.anim === "attack-melee-right") {
      lastAttack.current = s.attackId;
      const action = actions["jinwoo-combo"];
      if (action) {
        active.current?.fadeOut(0.08); action.reset().setLoop(THREE.LoopOnce, 1).setEffectiveTimeScale(action.getClip().duration / 0.45).fadeIn(0.08).play();
        action.clampWhenFinished = true; active.current = action; remaining.current = 0.45;
      }
    }
    if (remaining.current === 0) {
      const next = actions[s.anim === "sprint" || s.anim === "walk" ? "jinwoo-walk" : "jinwoo-idle"] ?? actions["jinwoo-idle"];
      if (next && next !== active.current) { active.current?.fadeOut(0.15); next.reset().fadeIn(0.15).play(); active.current = next; }
      if (next) next.timeScale = s.anim === "sprint" ? 1.5 : 1;
    }
    dead.current = s.anim === "die" ? Math.min(1, dead.current + dt * 1.5) : 0;
    mixer.timeScale = s.anim === "die" ? 0 : 1; mixer.update(dt); g.rotation.x = -dead.current * 1.4;
  });
  return <group ref={root}><primitive object={prepared.normalized} /></group>;
}