import { useEffect, useMemo } from "react";
import { useTexture, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import stoneImage from "@/assets/throne-stone.jpg";
import throneAsset from "@/assets/throne.asset.json";
import { COLUMNS, COLUMN_Z } from "@/lib/throne-room";

export type HallPalette = Record<"stone" | "wall" | "trim" | "metal" | "warm" | "cold" | "glass" | "void" | "runner", string>;

function pointedPath(half: number, spring: number, rise: number) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    points.push(new THREE.Vector3(-half * (1 - t) ** 2, spring + rise * (2 * t - t * t), 0));
  }
  for (let i = 1; i <= 24; i++) {
    const t = i / 24;
    points.push(new THREE.Vector3(half * t * t, spring + rise * (1 - t * t), 0));
  }
  return new THREE.CatmullRomCurve3(points);
}

function windowShape(width = 2.6, bottom = 3, spring = 7.4, top = 9.4) {
  const shape = new THREE.Shape(); const h = width / 2;
  shape.moveTo(-h, bottom); shape.lineTo(h, bottom); shape.lineTo(h, spring);
  shape.quadraticCurveTo(h, top - 0.7, 0, top);
  shape.quadraticCurveTo(-h, top - 0.7, -h, spring); shape.closePath();
  return shape;
}

function buildArchitecture() {
  const stone: THREE.BufferGeometry[] = [], trim: THREE.BufferGeometry[] = [], metal: THREE.BufferGeometry[] = [];
  const box = (list: THREE.BufferGeometry[], x: number, y: number, z: number, w: number, h: number, d: number) => list.push(new THREE.BoxGeometry(w, h, d).translate(x, y, z));
  const tube = (list: THREE.BufferGeometry[], curve: THREE.Curve<THREE.Vector3>, r: number, x: number, z: number, rotation = 0) => {
    const geo = new THREE.TubeGeometry(curve, 48, r, 8, false);
    geo.rotateY(rotation); geo.translate(x, 0, z); list.push(geo);
  };
  // Column shafts, stepped bases, and sculpted capitals share one draw call.
  for (const { x, z } of COLUMNS) {
    box(stone, x, 0.2, z, 1.7, 0.4, 1.7);
    box(trim, x, 0.48, z, 1.35, 0.16, 1.35);
    stone.push(new THREE.CylinderGeometry(0.55, 0.67, 6.5, 16).translate(x, 3.8, z));
    for (const y of [0.75, 6.7, 7.05]) box(trim, x, y, z, 1.35, 0.18, 1.35);
    box(stone, x, 7.3, z, 1.6, 0.38, 1.6);
    // Four slim engaged shafts create clustered Gothic columns.
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2;
      trim.push(new THREE.CylinderGeometry(0.12, 0.16, 6, 8).translate(x + Math.cos(a) * 0.5, 3.65, z + Math.sin(a) * 0.5));
    }
  }
  for (const z of COLUMN_Z) {
    tube(trim, pointedPath(6, 7.45, 3.9), 0.2, 0, z);
    tube(stone, pointedPath(6, 7.45, 4.25), 0.29, 0, z);
  }
  for (const x of [-6, 6]) for (let i = 0; i < COLUMN_Z.length - 1; i++) {
    const a = COLUMN_Z[i], b = COLUMN_Z[i + 1]; if (a === undefined || b === undefined) continue;
    tube(trim, pointedPath(3.5, 7.45, 2.6), 0.18, x, (a + b) / 2, Math.PI / 2);
  }
  // True apertures in the side walls, not windows pasted onto solid boxes.
  const windows = [-14.5, -7.5, -0.5, 6.5];
  for (const side of [-1, 1]) {
    const wall = new THREE.Shape();
    wall.moveTo(-21, 0); wall.lineTo(17, 0); wall.lineTo(17, 12.4); wall.lineTo(-21, 12.4); wall.closePath();
    for (const z of windows) {
      const hole = new THREE.Path(); const h = 1.4;
      hole.moveTo(z - h, 3); hole.lineTo(z - h, 7.4);
      hole.quadraticCurveTo(z - h, 8.7, z, 9.5); hole.quadraticCurveTo(z + h, 8.7, z + h, 7.4);
      hole.lineTo(z + h, 3); hole.closePath(); wall.holes.push(hole);
    }
    const geo = new THREE.ExtrudeGeometry(wall, { depth: 0.6, bevelEnabled: false });
    geo.rotateY(-Math.PI / 2); geo.translate(side * 11 + 0.3, 0, 0); stone.push(geo);
    box(trim, side * 10.8, 0.65, -2, 0.35, 0.24, 38);
    box(trim, side * 10.8, 10, -2, 0.35, 0.25, 38);
    for (const z of windows) {
      tube(trim, pointedPath(1.55, 7.4, 2.35), 0.15, side * 10.72, z, Math.PI / 2);
      for (const dz of [-1.5, 1.5]) box(trim, side * 10.72, 5.15, z + dz, 0.3, 4.4, 0.25);
      box(trim, side * 10.7, 2.9, z, 0.6, 0.22, 3.4);
      box(metal, side * 10.7, 5.85, z, 0.1, 5.5, 0.07);
      for (const y of [4.5, 6.5, 7.4]) box(metal, side * 10.7, y, z, 0.1, 0.08, 2.75);
    }
  }
  box(stone, 0, 6.2, -21.3, 22.6, 12.4, 0.6);
  box(stone, 0, 6.2, 17.3, 22.6, 12.4, 0.6);
  box(stone, 0, 12.5, -2, 22.6, 0.5, 38.6);
  for (let i = 0; i < 4; i++) box(stone, 0, (i + 1) * 0.11, -17.3 - i * 0.3, 11.2 - i * 0.35, (i + 1) * 0.22, 9 - i * 0.6);
  // Pointed rear-wall niche frames the throne.
  tube(trim, pointedPath(4.3, 5.8, 4.7), 0.25, 0, -20.88);
  for (const x of [-4.3, 4.3]) box(trim, x, 3, -20.88, 0.38, 6, 0.32);
  // A hanging iron crown chandelier, chain and twelve candle sockets.
  for (const radius of [2.25, 1.15]) {
    const ring = new THREE.TorusGeometry(radius, 0.07, 8, 64); ring.rotateX(Math.PI / 2); ring.translate(0, 7.5, -1); metal.push(ring);
  }
  metal.push(new THREE.CylinderGeometry(0.045, 0.045, 4.8, 8).translate(0, 10, -1));
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6; const x = Math.cos(a) * 2.25, z = -1 + Math.sin(a) * 2.25;
    metal.push(new THREE.CylinderGeometry(0.1, 0.13, 0.3, 8).translate(x, 7.62, z));
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 7.5, z), new THREE.Vector3(x * 0.55, 8.5, -1 + (z + 1) * 0.55), new THREE.Vector3(0, 9.2, -1)]);
    metal.push(new THREE.TubeGeometry(curve, 16, 0.035, 5, false));
  }
  const merge = (items: THREE.BufferGeometry[]) => {
    // Extrusions are non-indexed; all inputs must use the same representation.
    const flat = items.map(g => g.index ? g.toNonIndexed() : g);
    const result = mergeGeometries(flat, false);
    new Set([...items, ...flat]).forEach(g => g.dispose());
    if (!result) throw new Error("Hall geometry failed");
    return result;
  };
  return { stone: merge(stone), trim: merge(trim), metal: merge(metal), windows };
}

function Throne() {
  const { scene } = useGLTF(throneAsset.url);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const bounds = new THREE.Box3().setFromObject(clone); const scale = 3.2 / (bounds.max.y - bounds.min.y || 1);
    clone.scale.setScalar(scale);
    clone.position.set(-(bounds.min.x + bounds.max.x) * scale / 2, -bounds.min.y * scale, -(bounds.min.z + bounds.max.z) * scale / 2);
    return clone;
  }, [scene]);
  return <group position={[0, 0.88, -17.1]}><primitive object={model} /></group>;
}

export function ThroneArchitecture({ palette: p }: { palette: HallPalette }) {
  const source = useTexture(stoneImage);
  const maps = useMemo(() => {
    const floor = source.clone(); floor.wrapS = floor.wrapT = THREE.RepeatWrapping; floor.repeat.set(5.5, 9.5); floor.colorSpace = THREE.SRGBColorSpace; floor.needsUpdate = true;
    const wall = source.clone(); wall.wrapS = wall.wrapT = THREE.RepeatWrapping; wall.repeat.set(0.2, 0.2); wall.colorSpace = THREE.SRGBColorSpace; wall.needsUpdate = true;
    return { floor, wall };
  }, [source]);
  const geo = useMemo(buildArchitecture, []);
  const glass = useMemo(() => new THREE.ShapeGeometry(windowShape()), []);
  useEffect(() => () => { maps.floor.dispose(); maps.wall.dispose(); geo.stone.dispose(); geo.trim.dispose(); geo.metal.dispose(); glass.dispose(); }, [maps, geo, glass]);
  return <>
    <mesh geometry={geo.stone} castShadow receiveShadow><meshStandardMaterial map={maps.wall} color={p.wall} roughness={0.9} /></mesh>
    <mesh geometry={geo.trim} castShadow receiveShadow><meshStandardMaterial map={maps.wall} color={p.trim} roughness={0.75} /></mesh>
    <mesh geometry={geo.metal} castShadow><meshStandardMaterial color={p.metal} metalness={0.85} roughness={0.38} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, -2]} receiveShadow><planeGeometry args={[22, 38]} /><meshStandardMaterial map={maps.floor} color={p.stone} roughness={0.65} metalness={0.08} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 1.9]}><planeGeometry args={[3.5, 27]} /><meshStandardMaterial color={p.runner} roughness={1} /></mesh>
    {[-1, 1].flatMap(side => geo.windows.map(z => <group key={`${side}-${z}`}>
      <mesh geometry={glass} position={[side * 11.02, 0, z]} rotation-y={Math.PI / 2}><meshStandardMaterial color={p.glass} emissive={p.cold} emissiveIntensity={0.4} side={THREE.DoubleSide} roughness={0.3} /></mesh>
      <pointLight position={[side * 9.2, 6, z]} color={p.cold} intensity={24} distance={17} decay={2} />
    </group>))}
    {Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return <mesh key={i} position={[Math.cos(a) * 2.25, 7.92, -1 + Math.sin(a) * 2.25]}><capsuleGeometry args={[0.065, 0.22, 3, 6]} /><meshBasicMaterial color={p.warm} /></mesh>; })}
    <pointLight position={[0, 7.4, -1]} color={p.warm} intensity={100} distance={30} decay={2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.002} />
    <pointLight position={[0, 5, -17]} color={p.warm} intensity={38} distance={14} />
    <Throne />
  </>;
}