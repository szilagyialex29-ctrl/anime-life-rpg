import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, useAnimations, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import type { Stat } from "@/lib/game-data";
import { playerFighter, type Gate } from "@/lib/dungeon";

type View = "moba" | "action" | "platform";
type Anim = "idle" | "walk" | "sprint" | "attack-melee-right" | "die" | "jump";
type Enemy = { id: number; boss: boolean; pos: THREE.Vector3; hp: number; maxHp: number; atk: number; cd: number; hit: number; anim: Anim; face: number };
type Game = {
  pos: THREE.Vector3; vy: number; face: number; hp: number; maxHp: number; mana: number; maxMana: number; atk: number;
  cd: number; swing: number; target: THREE.Vector3 | null; enemies: Enemy[]; runes: { pos: THREE.Vector3; taken: boolean }[];
  over: null | "win" | "lose"; log: string; blast: number;
};
type Hud = { hp: number; maxHp: number; mana: number; maxMana: number; runes: number; guards: number; bossHp: number; bossMax: number; shield: boolean; log: string; over: Game["over"] };

const SPEED = 6, GRAVITY = 22, JUMP = 8, MINX = -6.5, MAXX = 6.5, MINZ = -46, MAXZ = 4;
const LEDGES = [{ x: -3.5, z: -14, w: 4, d: 4, h: 1.3 }, { x: 3.5, z: -24, w: 4, d: 4, h: 1.3 }];
const groundAt = (x: number, z: number) => LEDGES.reduce((g, l) => (Math.abs(x - l.x) < l.w / 2 && Math.abs(z - l.z) < l.d / 2 ? Math.max(g, l.h) : g), 0);

function stoneTexture(dark: string, light: string) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = dark; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const v = 0.75 + Math.random() * 0.25;
    g.globalAlpha = v; g.fillStyle = light; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
    g.globalAlpha = 0.15; g.fillStyle = "#000";
    for (let i = 0; i < 30; i++) g.fillRect(x * 64 + Math.random() * 60, y * 64 + Math.random() * 60, 2, 2);
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Character({ url, height, tint, get }: { url: string; height: number; tint?: string; get: () => { pos: THREE.Vector3; face: number; anim: Anim; hit?: number } }) {
  const { scene, animations } = useGLTF(url);
  const root = useRef<THREE.Group>(null);
  const model = useMemo(() => {
    const m = SkeletonUtils.clone(scene) as THREE.Group;
    m.traverse(o => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true; mesh.receiveShadow = true;
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        if (tint) { mat.emissive = new THREE.Color(tint); mat.emissiveIntensity = 0.35; }
        mesh.material = mat;
      }
    });
    const box = new THREE.Box3().setFromObject(m); const h = box.max.y - box.min.y || 1;
    m.scale.setScalar(height / h); m.position.y = -box.min.y * (height / h);
    return m;
  }, [scene, height, tint]);
  const { actions } = useAnimations(animations, root);
  const cur = useRef<string>("");
  useFrame(() => {
    const s = get(); const g = root.current; if (!g) return;
    g.position.copy(s.pos); g.rotation.y = s.face;
    const flash = s.hit && s.hit > 0 ? 1 + s.hit * 0.15 : 1; g.scale.setScalar(flash);
    if (cur.current !== s.anim) {
      const next = actions[s.anim]; const prev = actions[cur.current];
      if (next) { next.reset().fadeIn(0.15).play(); if (s.anim === "die") { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; } }
      prev?.fadeOut(0.15); cur.current = s.anim;
    }
  });
  return <group ref={root}><primitive object={model} /></group>;
}

function Prop({ url, position, scale = 1, rotation = 0 }: { url: string; position: [number, number, number]; scale?: number; rotation?: number }) {
  const { scene } = useGLTF(url);
  const m = useMemo(() => { const c = scene.clone(); c.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return c; }, [scene]);
  return <primitive object={m} position={position} scale={scale} rotation-y={rotation} />;
}

function Torch({ position }: { position: [number, number, number] }) {
  const l = useRef<THREE.PointLight>(null);
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => { if (l.current) l.current.intensity = 14 + Math.sin(clock.elapsedTime * 9 + seed) * 3 + Math.sin(clock.elapsedTime * 23 + seed) * 2; });
  return (
    <group position={position}>
      <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.08, 0.12, 0.6, 8]} /><meshStandardMaterial color="#3b2a1e" /></mesh>
      <mesh position={[0, 0.4, 0]}><sphereGeometry args={[0.14, 10, 10]} /><meshBasicMaterial color="#ffb45c" /></mesh>
      <pointLight ref={l} position={[0, 0.6, 0]} color="#ff9a4a" distance={11} decay={2} />
    </group>
  );
}

function Arena({ onFloor }: { onFloor: (e: ThreeEvent<PointerEvent>) => void }) {
  const floor = useMemo(() => { const t = stoneTexture("#16151c", "#3a3846"); t.repeat.set(4, 16); return t; }, []);
  const wall = useMemo(() => { const t = stoneTexture("#121117", "#2b2934"); t.repeat.set(16, 2); return t; }, []);
  const pillars = useMemo(() => Array.from({ length: 8 }, (_, i) => -4 - i * 5.5), []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -21]} receiveShadow onPointerDown={onFloor}>
        <planeGeometry args={[16, 54]} /><meshStandardMaterial map={floor} roughness={0.85} metalness={0.05} />
      </mesh>
      {[-8, 8].map(x => (
        <mesh key={x} position={[x, 2.5, -21]} receiveShadow><boxGeometry args={[1, 5, 54]} /><meshStandardMaterial map={wall} roughness={0.95} /></mesh>
      ))}
      <mesh position={[0, 2.5, -48.5]}><boxGeometry args={[16, 5, 1]} /><meshStandardMaterial map={wall} roughness={0.95} /></mesh>
      {pillars.map(z => [-6.9, 6.9].map(x => (
        <group key={`${x}${z}`}>
          <mesh position={[x, 2, z]} castShadow><boxGeometry args={[0.9, 4, 0.9]} /><meshStandardMaterial map={wall} color="#8a8698" /></mesh>
          <Torch position={[x * 0.88, 2.4, z + 0.7]} />
        </group>
      )))}
      {LEDGES.map((l, i) => (
        <mesh key={i} position={[l.x, l.h / 2, l.z]} castShadow receiveShadow onPointerDown={onFloor}>
          <boxGeometry args={[l.w, l.h, l.d]} /><meshStandardMaterial map={wall} color="#a6a2b6" />
        </mesh>
      ))}
      {/* boss circle */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, -38]}><ringGeometry args={[5, 5.3, 64]} /><meshBasicMaterial color="#7b2cff" transparent opacity={0.7} /></mesh>
      <Prop url="/models/dungeon-gate.glb" position={[0, 0, 2.8]} scale={2.4} />
      <Prop url="/models/dungeon-gate.glb" position={[0, 0, -47.5]} scale={2.6} />
      <Prop url="/models/dungeon-rocks.glb" position={[-5, 0, -8]} scale={1.6} />
      <Prop url="/models/dungeon-rocks.glb" position={[5.2, 0, -31]} scale={1.8} rotation={1.4} />
      <Prop url="/models/dungeon-chest.glb" position={[4.8, 0, -44]} scale={1.6} rotation={-0.6} />
      <Prop url="/models/dungeon-sword.glb" position={[-4.5, 0, -43]} scale={1.8} rotation={0.8} />
    </group>
  );
}

function Rune({ get }: { get: () => { pos: THREE.Vector3; taken: boolean } }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const r = get(); if (!g.current) return;
    g.current.visible = !r.taken; g.current.position.set(r.pos.x, r.pos.y + 0.9 + Math.sin(clock.elapsedTime * 2) * 0.15, r.pos.z);
    g.current.rotation.y = clock.elapsedTime * 1.5;
  });
  return (
    <group ref={g}>
      <mesh><octahedronGeometry args={[0.35]} /><meshStandardMaterial color="#5fb8ff" emissive="#2f8cff" emissiveIntensity={2.5} /></mesh>
      <pointLight color="#4aa8ff" intensity={6} distance={5} />
    </group>
  );
}

function World({ game, view, keys, onTick }: { game: React.MutableRefObject<Game>; view: View; keys: React.MutableRefObject<Set<string>>; onTick: () => void }) {
  const playerAnim = useRef<Anim>("idle");
  const fx = useRef<THREE.Mesh>(null); const shield = useRef<THREE.Mesh>(null);
  const look = useMemo(() => new THREE.Vector3(), []); const camT = useMemo(() => new THREE.Vector3(), []);
  const tick = useRef(0);

  useFrame(({ camera, clock }, raw) => {
    const dt = Math.min(raw, 0.05); const g = game.current; const k = keys.current;
    if (g.over || k.has("paused")) { onTick(); return; }
    // input
    let mx = 0, mz = 0;
    if (k.has("KeyA") || k.has("ArrowLeft")) view === "platform" ? (mz += 1) : (mx -= 1);
    if (k.has("KeyD") || k.has("ArrowRight")) view === "platform" ? (mz -= 1) : (mx += 1);
    if (view !== "platform") { if (k.has("KeyW") || k.has("ArrowUp")) mz -= 1; if (k.has("KeyS") || k.has("ArrowDown")) mz += 1; }
    const stick = (keys as unknown as { stick?: { x: number; y: number } }).stick;
    if (stick) { if (view === "platform") mz -= stick.x; else { mx += stick.x; mz += stick.y; } }
    if (mx || mz) g.target = null;
    if (g.target) { const d = g.target.clone().sub(g.pos); d.y = 0; if (d.length() < 0.2) g.target = null; else { d.normalize(); mx = d.x; mz = d.z; } }
    const len = Math.hypot(mx, mz);
    const moving = len > 0.05;
    if (moving) {
      const nx = THREE.MathUtils.clamp(g.pos.x + (mx / Math.max(len, 1)) * SPEED * dt, MINX, MAXX);
      const nz = THREE.MathUtils.clamp(g.pos.z + (mz / Math.max(len, 1)) * SPEED * dt, MINZ, MAXZ);
      if (groundAt(nx, g.pos.z) <= g.pos.y + 0.3) g.pos.x = nx;
      if (groundAt(g.pos.x, nz) <= g.pos.y + 0.3) g.pos.z = nz;
      g.face = Math.atan2(mx, mz);
    }
    if (k.has("Space") && g.pos.y <= groundAt(g.pos.x, g.pos.z) + 0.01) { g.vy = JUMP; k.delete("Space"); }
    g.vy -= GRAVITY * dt; g.pos.y += g.vy * dt;
    const gr = groundAt(g.pos.x, g.pos.z); if (g.pos.y < gr) { g.pos.y = gr; g.vy = 0; }

    const guardsLeft = g.enemies.filter(e => !e.boss && e.hp > 0).length;
    const runesLeft = g.runes.filter(r => !r.taken).length;
    const shielded = guardsLeft > 0 || runesLeft > 0;

    // attacks
    g.cd -= dt; g.swing -= dt; g.blast -= dt; g.mana = Math.min(g.maxMana, g.mana + dt * 2);
    const hitAround = (radius: number, dmg: number, arc: boolean) => {
      let any = false;
      for (const e of g.enemies) {
        if (e.hp <= 0) continue;
        const d = e.pos.clone().sub(g.pos); d.y = 0; const dist = d.length();
        const ang = Math.abs(Math.atan2(Math.sin(Math.atan2(d.x, d.z) - g.face), Math.cos(Math.atan2(d.x, d.z) - g.face)));
        if (dist < radius + (e.boss ? 0.8 : 0) && (!arc || ang < 1.4 || dist < 1)) {
          if (e.boss && shielded) { g.log = "[RENDSZER] A boss pajzsa aktív: gyűjtsd be a rúnákat és győzd le az őröket!"; continue; }
          e.hp = Math.max(0, e.hp - dmg); e.hit = 1; any = true;
          if (e.hp === 0) { e.anim = "die"; g.log = e.boss ? "[RENDSZER] A boss elesett!" : "Őr legyőzve."; }
        }
      }
      return any;
    };
    if ((k.has("KeyF") || k.has("attack")) && g.cd <= 0) {
      k.delete("attack"); g.cd = 0.45; g.swing = 0.35;
      hitAround(2.2, Math.round(g.atk * (0.85 + Math.random() * 0.3)), true);
    }
    if ((k.has("KeyQ") || k.has("skill")) && g.mana >= 15 && g.blast < -0.6) {
      k.delete("skill"); k.delete("KeyQ"); g.mana -= 15; g.blast = 0.5; g.swing = 0.35;
      hitAround(4.2, Math.round(g.atk * 2), false);
    }

    // runes
    for (const r of g.runes) if (!r.taken && r.pos.distanceTo(g.pos) < 1.3) { r.taken = true; g.log = "Rúna begyűjtve."; }

    // enemies
    for (const e of g.enemies) {
      e.hit = Math.max(0, e.hit - dt * 5);
      if (e.hp <= 0) continue;
      const d = g.pos.clone().sub(e.pos); d.y = 0; const dist = d.length();
      const aggro = e.boss ? 13 : 9; const reach = e.boss ? 2.4 : 1.5;
      e.cd -= dt;
      if (dist < aggro && dist > reach * 0.8) {
        d.normalize(); const sp = e.boss ? 2.6 : 3.2;
        const nx = e.pos.x + d.x * sp * dt, nz = e.pos.z + d.z * sp * dt;
        if (groundAt(nx, nz) < 0.1) { e.pos.x = nx; e.pos.z = nz; }
        e.face = Math.atan2(d.x, d.z); e.anim = "walk";
      } else if (dist <= reach * 0.8 + 0.4) {
        e.face = Math.atan2(d.x, d.z);
        if (e.cd <= 0) {
          e.cd = e.boss ? 1.3 : 1.1; e.anim = "attack-melee-right";
          if (dist < reach + 0.3 && g.pos.y < 1) { g.hp = Math.max(0, g.hp - e.atk); if (g.hp === 0) { g.over = "lose"; playerAnim.current = "die"; } }
        } else if (e.cd < 0.6) e.anim = "idle";
      } else e.anim = "idle";
    }
    const boss = g.enemies.find(e => e.boss)!;
    if (boss.hp <= 0 && !g.over) g.over = "win";

    if (g.over !== "lose") playerAnim.current = g.swing > 0 ? "attack-melee-right" : g.pos.y > gr + 0.05 ? "jump" : moving ? "sprint" : "idle";

    // fx
    if (fx.current) { const s = g.blast > 0 ? (0.5 - g.blast) * 9 : 0; fx.current.visible = g.blast > 0; fx.current.scale.setScalar(s + 0.1); fx.current.position.set(g.pos.x, g.pos.y + 0.1, g.pos.z); }
    if (shield.current) { shield.current.visible = shielded && boss.hp > 0; shield.current.position.copy(boss.pos).setY(1.6); shield.current.rotation.y = clock.elapsedTime; }

    // camera
    const off = view === "moba" ? [0, 13, 8] : view === "action" ? [0, 4.2, 7] : [13, 3.5, 0];
    camT.set(g.pos.x * (view === "platform" ? 0 : 1) + off[0], g.pos.y + off[1], g.pos.z + off[2]);
    camera.position.lerp(camT, 1 - Math.exp(-5 * dt));
    look.lerp(new THREE.Vector3(view === "platform" ? 0 : g.pos.x, g.pos.y + 1, g.pos.z - (view === "action" ? 3 : 0)), 1 - Math.exp(-8 * dt));
    camera.lookAt(look);

    tick.current += dt; if (tick.current > 0.1) { tick.current = 0; onTick(); }
  });

  const g = game.current;
  return (
    <>
      <Character url="/models/dungeon-hero.glb" height={1.7} tint="#1d4ed8" get={() => ({ pos: g.pos, face: g.face, anim: playerAnim.current })} />
      {/* player aura */}
      <AuraRing get={() => g.pos} />
      <mesh ref={fx} rotation-x={-Math.PI / 2} visible={false}><ringGeometry args={[0.4, 0.5, 48]} /><meshBasicMaterial color="#60a5fa" transparent opacity={0.8} /></mesh>
      {g.enemies.map(e => (
        <Character key={e.id} url="/models/dungeon-orc.glb" height={e.boss ? 3.6 : 1.6} tint={e.boss ? "#7f1d1d" : undefined} get={() => e} />
      ))}
      <mesh ref={shield}><icosahedronGeometry args={[2.3, 1]} /><meshBasicMaterial color="#a855f7" wireframe transparent opacity={0.5} /></mesh>
      {g.runes.map((r, i) => <Rune key={i} get={() => r} />)}
    </>
  );
}

function AuraRing({ get }: { get: () => THREE.Vector3 }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (!m.current) return; const p = get(); m.current.position.set(p.x, p.y + 0.03, p.z); const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.08; m.current.scale.setScalar(s); });
  return (
    <mesh ref={m} rotation-x={-Math.PI / 2}><ringGeometry args={[0.55, 0.8, 48]} /><meshBasicMaterial color="#3b82f6" transparent opacity={0.55} /></mesh>
  );
}

function makeGame(gate: Gate, level: number, stats: Record<Stat, number>, shadowBonus: number): Game {
  const f = playerFighter(level, stats);
  let id = 0;
  const guard = (x: number, z: number): Enemy => ({ id: id++, boss: false, pos: new THREE.Vector3(x, 0, z), hp: Math.round(gate.hp * 0.4), maxHp: Math.round(gate.hp * 0.4), atk: Math.max(3, Math.round(gate.atk * 0.45)), cd: 1, hit: 0, anim: "idle", face: 0 });
  return {
    pos: new THREE.Vector3(0, 0, 0), vy: 0, face: Math.PI, hp: f.maxHp, maxHp: f.maxHp, mana: f.mana, maxMana: f.mana, atk: f.atk + shadowBonus,
    cd: 0, swing: 0, blast: 0, target: null, over: null, log: "[RENDSZER] Kapu megnyílt. Gyűjtsd be a 3 rúnát és győzd le az őröket.",
    enemies: [guard(2, -10), guard(-2, -19), guard(1, -28),
      { id: id++, boss: true, pos: new THREE.Vector3(0, 0, -40), hp: gate.hp * 3, maxHp: gate.hp * 3, atk: gate.atk, cd: 1.5, hit: 0, anim: "idle", face: 0 }],
    runes: [new THREE.Vector3(-3.5, 1.3, -14), new THREE.Vector3(3.5, 1.3, -24), new THREE.Vector3(-4.5, 0, -32)].map(pos => ({ pos, taken: false })),
  };
}

export default function DungeonGame({ gate, level, stats, shadowBonus, onExit, onFinish }: {
  gate: Gate; level: number; stats: Record<Stat, number>; shadowBonus: number; onExit: () => void; onFinish: (won: boolean) => void;
}) {
  const [run, setRun] = useState(0);
  const game = useRef<Game>(makeGame(gate, level, stats, shadowBonus));
  const keys = useRef<Set<string>>(new Set());
  const [view, setView] = useState<View>("action");
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<Hud | null>(null);
  const reported = useRef(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Digit1") setView("moba"); if (e.code === "Digit2") setView("action"); if (e.code === "Digit3") setView("platform");
      if (e.code === "Escape" || e.code === "KeyP") setPaused(p => !p);
      if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
      keys.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => { if (e.code !== "Space") keys.current.delete(e.code); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);
  useEffect(() => { if (paused) keys.current.add("paused"); else keys.current.delete("paused"); }, [paused]);

  const onTick = () => {
    const g = game.current; const boss = g.enemies.find(e => e.boss)!;
    setHud({ hp: g.hp, maxHp: g.maxHp, mana: Math.floor(g.mana), maxMana: g.maxMana, runes: g.runes.filter(r => r.taken).length,
      guards: g.enemies.filter(e => !e.boss && e.hp <= 0).length, bossHp: boss.hp, bossMax: boss.maxHp,
      shield: g.runes.some(r => !r.taken) || g.enemies.some(e => !e.boss && e.hp > 0), log: g.log, over: g.over });
    if (g.over && !reported.current) { reported.current = true; setTimeout(() => onFinish(g.over === "win"), 0); }
  };
  const restart = () => { game.current = makeGame(gate, level, stats, shadowBonus); reported.current = false; setRun(r => r + 1); setPaused(false); };
  const onFloor = (e: ThreeEvent<PointerEvent>) => { if (view !== "moba") return; e.stopPropagation(); game.current.target = e.point.clone(); };
  const press = (k: string) => keys.current.add(k);
  const stickRef = keys as unknown as { stick?: { x: number; y: number } };

  return (
    <div className="fixed inset-0 z-50 bg-background select-none touch-none">
      <Canvas key={run} shadows dpr={[1, 1.75]} camera={{ position: [0, 5, 8], fov: 55 }}>
        <color attach="background" args={["#07070d"]} />
        <fog attach="fog" args={["#0a0a14", 14, 42]} />
        <ambientLight intensity={0.35} color="#8fa3ff" />
        <hemisphereLight args={["#5b6dff", "#1a1020", 0.45]} />
        <directionalLight position={[6, 14, 4]} intensity={0.9} color="#b8c4ff" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}
          shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={30} shadow-camera-bottom={-30} />
        <Environment resolution={64}>
          <Lightformer intensity={1.2} position={[0, 6, 0]} scale={[10, 10, 1]} color="#6b7bff" />
          <Lightformer intensity={0.6} color="#ff8a4a" position={[-6, 1, -2]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
        </Environment>
        <Suspense fallback={null}>
          <Arena onFloor={onFloor} />
          <World game={game} view={view} keys={keys} onTick={onTick} />
        </Suspense>
      </Canvas>

      {!hud && <div className="absolute inset-0 grid place-items-center font-display text-primary glow-text">[ RENDSZER ] Kapu töltése…</div>}

      {hud && (
        <div className="pointer-events-none absolute inset-0 p-3 md:p-5 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="system-window px-3 py-2 text-xs md:text-sm">
              <p className="font-display text-primary">{gate.rank}-RANGÚ KAPU</p>
              <p className={hud.runes === 3 ? "line-through opacity-60" : ""}>◆ Rúnák {hud.runes}/3</p>
              <p className={hud.guards === 3 ? "line-through opacity-60" : ""}>⚔ Őrök {hud.guards}/3</p>
              <p>☠ {gate.boss}</p>
            </div>
            <div className="pointer-events-auto flex gap-1">
              {(["moba", "action", "platform"] as View[]).map((v, i) => (
                <Button key={v} size="sm" variant={view === v ? "default" : "secondary"} onClick={() => setView(v)}>{i + 1} · {v === "moba" ? "Felül" : v === "action" ? "Akció" : "Platform"}</Button>
              ))}
              <Button size="sm" variant="secondary" onClick={() => setPaused(true)}>II</Button>
            </div>
          </div>

          <div className="mx-auto mt-3 w-full max-w-xl">
            <div className="flex justify-between font-display text-xs md:text-sm text-destructive"><span>{gate.boss}{hud.shield && " · PAJZS"}</span><span>{hud.bossHp}/{hud.bossMax}</span></div>
            <div className="h-3 bg-muted/60 border border-destructive/60"><div className="h-full bg-destructive transition-all" style={{ width: `${(hud.bossHp / hud.bossMax) * 100}%` }} /></div>
          </div>

          <p className="mx-auto mt-3 system-window px-3 py-1 text-xs md:text-sm text-center max-w-lg">{hud.log}</p>

          <div className="mt-auto flex items-end justify-between gap-3">
            <div className="system-window p-3 w-56 md:w-72 text-xs">
              <div className="flex justify-between"><span className="font-display">HP</span><span>{hud.hp}/{hud.maxHp}</span></div>
              <div className="h-2.5 bg-muted mb-2"><div className="h-full bg-primary transition-all" style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }} /></div>
              <div className="flex justify-between"><span className="font-display">MANA</span><span>{hud.mana}/{hud.maxMana}</span></div>
              <div className="h-2.5 bg-muted"><div className="h-full bg-accent transition-all" style={{ width: `${(hud.mana / hud.maxMana) * 100}%` }} /></div>
              <p className="hidden md:block mt-2 text-muted-foreground">{view === "moba" ? "Kattints a földre a mozgáshoz" : view === "platform" ? "A/D mozgás" : "WASD mozgás"} · F támadás · Q mana-robbanás · Space ugrás · 1/2/3 nézet · Esc szünet</p>
            </div>
            <div className="pointer-events-auto flex gap-2">
              <Button size="lg" variant="secondary" onPointerDown={() => press("Space")}>Ugrás</Button>
              <Button size="lg" variant="secondary" disabled={hud.mana < 15} onPointerDown={() => press("skill")}>Q · Robbanás</Button>
              <Button size="lg" onPointerDown={() => press("attack")}>F · Csapás</Button>
            </div>
          </div>
          <TouchStick onMove={v => { stickRef.stick = v ?? undefined; }} />
        </div>
      )}

      {(paused || hud?.over) && (
        <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
          <div className="system-window p-6 text-center space-y-3 max-w-sm">
            <p className="font-display text-xs text-primary">[ RENDSZER ]</p>
            <h2 className="font-display text-2xl glow-text">{hud?.over === "win" ? "KAPU MEGTISZTÍTVA" : hud?.over === "lose" ? "ELBUKTÁL" : "SZÜNET"}</h2>
            <p className="text-sm text-muted-foreground">{hud?.over === "win" ? `+${gate.xp} XP jóváírva. Kilépés után megpróbálhatod az árnyékkinyerést.` : hud?.over === "lose" ? "Teljesíts több küldetést, és erősödj. Vagy próbáld újra." : "A dungeon vár."}</p>
            <div className="flex gap-2 justify-center">
              {paused && !hud?.over && <Button onClick={() => setPaused(false)}>Folytatás</Button>}
              {hud?.over === "lose" && <Button onClick={restart}>Újra</Button>}
              <Button variant={hud?.over === "win" ? "default" : "secondary"} onClick={onExit}>{hud?.over === "win" ? "Ébredj! →" : "Kilépés"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TouchStick({ onMove }: { onMove: (v: { x: number; y: number } | null) => void }) {
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  return (
    <div className="pointer-events-auto absolute left-4 bottom-40 md:hidden size-32 rounded-full border border-primary/50 bg-primary/10"
      onPointerDown={e => { (e.target as HTMLElement).setPointerCapture(e.pointerId); const r = e.currentTarget.getBoundingClientRect(); origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }}
      onPointerMove={e => { if (!origin.current) return; let x = (e.clientX - origin.current.x) / 50, y = (e.clientY - origin.current.y) / 50; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } setKnob({ x, y }); onMove({ x, y }); }}
      onPointerUp={() => { origin.current = null; setKnob(null); onMove(null); }}>
      <div className="absolute size-12 rounded-full bg-primary/70" style={{ left: `calc(50% - 24px + ${(knob?.x ?? 0) * 40}px)`, top: `calc(50% - 24px + ${(knob?.y ?? 0) * 40}px)` }} />
    </div>
  );
}

useGLTF.preload("/models/dungeon-hero.glb");
useGLTF.preload("/models/dungeon-orc.glb");
