import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { IgrisBoss } from "./igris-boss";
import { JinwooPlayer } from "./jinwoo-player";

function Fighters() {
  const state = useRef({ anim: "idle", attackId: 0, paused: false });
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    state.current.attackId = Math.floor(time / 3) + 1;
    state.current.anim = time % 3 < 1.3 ? "attack-melee-right" : "walk";
  });
  return <><IgrisBoss height={3.4} get={() => ({ ...state.current, pos: new THREE.Vector3(1.8, 0, 0), face: 0 })} /><JinwooPlayer get={() => ({ ...state.current, pos: new THREE.Vector3(-1.8, 0, 0), face: 0 })} /></>;
}
export default function MotionCheck() {
  return <div className="fixed inset-0"><Canvas camera={{ position: [0, 3, 9], fov: 45 }}><ambientLight intensity={1.5} /><directionalLight position={[2, 8, 4]} intensity={2} /><Environment resolution={64}><Lightformer intensity={2} position={[0, 5, 0]} scale={10} /></Environment><Suspense fallback={null}><Fighters /></Suspense></Canvas></div>;
}