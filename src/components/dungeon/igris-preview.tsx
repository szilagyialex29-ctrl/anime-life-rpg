import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { IgrisBoss } from "./igris-boss";
const s = { pos: new THREE.Vector3(), face: 0, anim: new URLSearchParams(location.search).get("a") ?? "walk" };
export default function P() {
  const side = location.search.includes("side");
  return <div style={{ position: "fixed", inset: 0 }}><Canvas camera={{ position: side ? [6, 2.5, 0] : [0, 2.5, 6], fov: 45 }} onCreated={({ camera }) => camera.lookAt(0, 1.7, 0)}>
    <color attach="background" args={["#888"]} /><ambientLight intensity={1.5} /><directionalLight position={[3, 5, 4]} intensity={2} />
    <Suspense fallback={null}><IgrisBoss height={3.4} get={() => s} /></Suspense></Canvas></div>;
}
