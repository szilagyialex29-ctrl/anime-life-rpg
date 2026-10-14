import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Crosshair, Pause, Play, RotateCcw, Sword, Upload, X, ArrowUp, ArrowDown } from "lucide-react";
import * as THREE from "three";
import { FBXLoader } from "three-stdlib";
import { Button } from "@/components/ui/button";
import { HALL, moveInHall, hallGround } from "@/lib/throne-room";
import { bindIgrisAttack } from "@/lib/igris-animation";
import { IgrisBoss } from "./igris-boss";
import { ThroneArchitecture, type HallPalette } from "./throne-architecture";

type Input = { keys: Set<string>; yaw: number; pitch: number; active: boolean; reset: number; attackId: number };

function Explorer({ input, report }: { input: RefObject<Input>; report: (x: number, z: number) => void }) {
  const { camera, gl } = useThree();
  const pos = useRef({ x: 0, z: 12 }); const lastReset = useRef(0); const timer = useRef(0);
  useEffect(() => {
    const canvas = gl.domElement;
    const look = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas && e.buttons !== 1) return;
      if (!input.current.active || (e.target !== canvas && !document.pointerLockElement)) return;
      input.current.yaw -= e.movementX * 0.002;
      input.current.pitch = THREE.MathUtils.clamp(input.current.pitch - e.movementY * 0.002, -1.35, 1.35);
    };
    const lock = () => { if (input.current.active) canvas.requestPointerLock()?.catch(() => {}); };
    document.addEventListener("mousemove", look); canvas.addEventListener("click", lock);
    return () => { document.removeEventListener("mousemove", look); canvas.removeEventListener("click", lock); };
  }, [gl, input]);
  useFrame((_, raw) => {
    const s = input.current; const dt = Math.min(raw, 0.05);
    if (s.reset !== lastReset.current) { pos.current = { x: 0, z: 12 }; lastReset.current = s.reset; s.yaw = 0; s.pitch = 0.07; }
    if (s.active) {
      const forward = Number(s.keys.has("KeyW") || s.keys.has("ArrowUp")) - Number(s.keys.has("KeyS") || s.keys.has("ArrowDown"));
      const side = Number(s.keys.has("KeyD")) - Number(s.keys.has("KeyA"));
      const length = Math.hypot(forward, side) || 1;
      const distance = HALL.speed * dt / length;
      const dx = (-Math.sin(s.yaw) * forward + Math.cos(s.yaw) * side) * distance;
      const dz = (-Math.cos(s.yaw) * forward - Math.sin(s.yaw) * side) * distance;
      pos.current = moveInHall(pos.current.x, pos.current.z, dx, dz);
    }
    camera.position.set(pos.current.x, 1.7 + hallGround(pos.current.x, pos.current.z), pos.current.z);
    camera.rotation.order = "YXZ"; camera.rotation.set(s.pitch, s.yaw, 0);
    timer.current += dt;
    if (timer.current > 0.2) { report(pos.current.x, pos.current.z); timer.current = 0; }
  });
  return null;
}

function Boss({ input, clip, onReady }: { input: RefObject<Input>; clip: THREE.AnimationClip | null; onReady: (model: THREE.Object3D) => void }) {
  // A validation rig is loaded alongside Igris so incompatible imports never reach his mixer.
  const { scene } = useThree();
  useEffect(() => {
    const timer = setInterval(() => {
      let rig: THREE.Object3D | null = null;
      scene.traverse(o => { if ((o as THREE.Bone).isBone && /RightArm$/.test(o.name)) rig = o; });
      if (rig) { onReady(scene); clearInterval(timer); }
    }, 200);
    return () => clearInterval(timer);
  }, [scene, onReady]);
  const position = useRef(new THREE.Vector3(3.5, 0, -12.5));
  return <IgrisBoss height={2.7} attackClip={clip} get={() => ({ pos: position.current, face: 0, anim: input.current.attackId ? "attack-melee-right" : "idle", attackId: input.current.attackId, paused: !input.current.active })} />;
}

export default function ThroneRoom() {
  const [palette, setPalette] = useState<HallPalette | null>(null);
  const input = useRef<Input>({ keys: new Set(), yaw: 0, pitch: 0.07, active: true, reset: 0, attackId: 0 });
  const [paused, setPaused] = useState(false); const [panel, setPanel] = useState(false);
  const [position, setPosition] = useState({ x: 0, z: 12 });
  const [clip, setClip] = useState<THREE.AnimationClip | null>(null);
  const [filename, setFilename] = useState("Alap támadások"); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const rig = useRef<THREE.Object3D | null>(null); const upload = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const keys = ["stone", "wall", "trim", "metal", "warm", "cold", "glass", "void", "runner"] as const;
    setPalette(Object.fromEntries(keys.map(k => [k, css.getPropertyValue(`--hall-${k}`).trim()])) as HallPalette);
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,select,textarea")) return;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown"].includes(e.code)) { e.preventDefault(); input.current.keys.add(e.code); }
      if (e.code === "Escape") { input.current.active = false; input.current.keys.clear(); setPaused(true); }
    };
    const up = (e: KeyboardEvent) => input.current.keys.delete(e.code);
    const blur = () => { input.current.keys.clear(); input.current.active = false; setPaused(true); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); if (document.pointerLockElement) document.exitPointerLock(); };
  }, []);
  function togglePause() { input.current.active = paused; input.current.keys.clear(); setPaused(!paused); if (document.pointerLockElement) document.exitPointerLock(); }
  async function importAttack(file: File) {
    setError(""); setBusy(true);
    try {
      if (!file.name.toLowerCase().endsWith(".fbx")) throw new Error("Mixamo FBX-fájlt válassz.");
      if (file.size > 25 * 1024 * 1024) throw new Error("A fájl legfeljebb 25 MB lehet.");
      if (!rig.current) throw new Error("Igris még töltődik. Próbáld újra néhány másodperc múlva.");
      const loaded = new FBXLoader().parse(await file.arrayBuffer(), "");
      const first = loaded.animations[0];
      if (!first) throw new Error("A fájl nem tartalmaz animációt.");
      bindIgrisAttack(first, rig.current);
      setClip(first); setFilename(file.name); input.current.attackId = 0;
      loaded.traverse(o => { const mesh = o as THREE.Mesh; if (mesh.isMesh) { mesh.geometry.dispose(); const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; mats.forEach(m => m.dispose()); } });
    } catch (e) { setError(e instanceof Error ? e.message : "A mozdulat nem tölthető be."); }
    finally { setBusy(false); if (upload.current) upload.current.value = ""; }
  }
  return <main className="fixed inset-0 bg-background text-foreground overflow-hidden">
    {palette && <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 1.7, 12], fov: 65, near: 0.08, far: 85 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.4 }}>
      <color attach="background" args={[palette.void]} />
      <fog attach="fog" args={[palette.void, 32, 72]} />
      <ambientLight intensity={0.35} color={palette.cold} />
      <Environment resolution={128} environmentIntensity={0.15}><Lightformer intensity={0.5} color={palette.cold} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[15, 35, 1]} /><Lightformer intensity={0.5} color={palette.warm} position={[0, 6, -18]} scale={[6, 5, 1]} /></Environment>
      <Suspense fallback={null}><ThroneArchitecture palette={palette} /></Suspense>
      <Suspense fallback={null}><Boss input={input} clip={clip} onReady={model => { rig.current = model; }} /></Suspense>
      <Explorer input={input} report={(x, z) => setPosition({ x, z })} />
    </Canvas>}
    <header className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5 pointer-events-none">
      <div className="flex items-start gap-3"><Button asChild size="icon" variant="secondary" className="pointer-events-auto" title="Vissza"><Link to="/"><ArrowLeft className="size-4" /></Link></Button><div><p className="text-xs text-primary font-display">[ IGRIS ]</p><h1 className="font-display text-lg sm:text-2xl">Gótikus trónterem</h1><p className="text-sm text-muted-foreground">Az uralkodó csarnoka</p></div></div>
      <div className="flex gap-2 pointer-events-auto"><Button size="icon" variant="secondary" title="Igris animációja" aria-label="Igris animációja" onClick={() => setPanel(!panel)}><Sword className="size-4" /></Button><Button size="icon" variant="secondary" title="Vissza a bejárathoz" aria-label="Vissza a bejárathoz" onClick={() => { input.current.reset++; }}><RotateCcw className="size-4" /></Button><Button size="icon" variant="secondary" title={paused ? "Folytatás" : "Szünet"} aria-label={paused ? "Folytatás" : "Szünet"} onClick={togglePause}>{paused ? <Play className="size-4" /> : <Pause className="size-4" />}</Button></div>
    </header>
    <Crosshair className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-4 text-foreground/40 pointer-events-none" />
    {panel && <section className="absolute right-5 top-32 sm:top-20 w-[min(320px,calc(100vw-40px))] bg-popover/95 border border-border p-4 rounded-md">
      <div className="flex justify-between items-center"><h2 className="font-display text-sm">IGRIS · TÁMADÁS</h2><Button size="icon" variant="ghost" aria-label="Bezárás" onClick={() => setPanel(false)}><X className="size-4" /></Button></div>
      <p className="text-sm text-muted-foreground break-all my-3">{filename}</p>
      <input ref={upload} type="file" accept=".fbx" aria-label="Mixamo támadásfájl" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void importAttack(file); }} />
      <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={busy} onClick={() => upload.current?.click()}><Upload className="size-4" />{busy ? "Betöltés…" : "Mixamo FBX"}</Button><Button size="sm" disabled={paused || busy} onClick={() => { input.current.attackId++; }}><Sword className="size-4" />Lejátszás</Button></div>
      {clip && <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setClip(null); setFilename("Alap támadások"); input.current.attackId = 0; }}>Alap mozdulatok</Button>}
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </section>}
    {paused && <div className="absolute inset-0 grid place-items-center pointer-events-none"><Button className="pointer-events-auto" onClick={togglePause}><Play className="size-4" />Folytatás</Button></div>}
    <footer className="absolute inset-x-0 bottom-0 p-5 flex items-end justify-between pointer-events-none">
      <div className="text-xs font-display text-muted-foreground"><p className="text-foreground mb-1">TRÓNTEREM</p><output aria-label="Helyzet">{position.x.toFixed(1)} · {position.z.toFixed(1)}</output></div>
      <div className="flex gap-2 pointer-events-auto"><Button size="icon" variant="secondary" aria-label="Előre" title="Előre" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); input.current.keys.add("KeyW"); }} onPointerUp={() => input.current.keys.delete("KeyW")} onPointerCancel={() => input.current.keys.clear()}><ArrowUp className="size-4" /></Button><Button size="icon" variant="secondary" aria-label="Hátra" title="Hátra" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); input.current.keys.add("KeyS"); }} onPointerUp={() => input.current.keys.delete("KeyS")} onPointerCancel={() => input.current.keys.clear()}><ArrowDown className="size-4" /></Button></div>
    </footer>
  </main>;
}