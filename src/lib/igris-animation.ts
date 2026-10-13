import * as THREE from "three";

const boneKey = (name: string) => name.replace(/^.*bones\[([^\]]+)\]$/, "$1").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

/** Bind Mixamo rotations to this cloned rig, not duplicate FBX bone names.
 * Translation/scale tracks stay excluded so imports cannot reset world placement.
 */
export function bindIgrisAttack(source: THREE.AnimationClip, model: THREE.Object3D) {
  const nodes = new Map<string, THREE.Object3D[]>();
  model.traverse(node => {
    if (!(node as THREE.Bone).isBone) return;
    const key = boneKey(node.name);
    nodes.set(key, [...(nodes.get(key) ?? []), node]);
  });
  const clip = source.clone();
  clip.tracks = source.tracks.flatMap(track => {
    const dot = track.name.lastIndexOf(".");
    if (dot < 0 || track.name.slice(dot) !== ".quaternion") return [];
    return (nodes.get(boneKey(track.name.slice(0, dot))) ?? []).map(node => {
      const bound = track.clone(); bound.name = `${node.uuid}.quaternion`; return bound;
    });
  });
  if (!clip.tracks.length) throw new Error("Az animáció nem kompatibilis Igris Mixamo-csontvázával.");
  clip.name = "igris-imported-attack";
  return clip;
}