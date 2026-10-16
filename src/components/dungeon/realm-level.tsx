import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, LogOut, Pause, Play, RotateCcw, Sword } from "lucide-react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { ATTACK_CD, ATTACK_DMG, ATTACK_RANGE, PLAYER_HP, PLAYER_SPEED, REALMS, hazardAt, moveInRealm, type Realm, type RealmId } from "@/lib/realms";

type Foe = { name: string; boss: boolean; x: number; z: number; hp: number; max: number; atk: number; speed: number; cd: number; hit: number };
type State = { x: number; z: number; yaw: number; pitch: number; hp: number; cd: number; swing: number; keys: Set<string>; active: boolean; foes: Foe[]; over: null | "win" | "lose"; log: string; burn: number };
type Hud = { hp: number; foes: number; boss: { name: string; hp: number; max: number } | null; log: string; over: State["over"]; burning: boolean };

const fresh = (r: Realm): State => ({
  x: r.start.x, z: r.start.z, yaw: 0, pitch: 0, hp: PLAYER_HP, cd: 0, swing: 0, keys: new Set(), active: true, burn: 0,
  foes: r.enemies.map(e => ({ name: e.name, boss: !!e.boss, x: e.x, z: e.z, hp: e.hp, max: e.hp, atk: e.atk, speed: e.speed, cd: 1, hit: 0 })),
  over: null, log: "Kattints a nézelődéshez · WASD mozgás · Szóköz / bal klikk támadás",
});

function floorTexture(base: string, line: string, snow: boolean) {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d")!;
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { g.globalAlpha = Math.random() * 0.25; g.fillStyle = Math.random() > 0.5 ? line : "#ffffff"; g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); }
  g.globalAlpha = snow ? 0.25 : 0.8; g.strokeStyle = line; g.lineWidth = snow ? 1 : 3;
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64 + (snow ? 10 : 0)); g.stroke(); g.beginPath(); g.moveTo(i * 64 + (i % 2) * 32, 0); g.lineTo(i * 64 + (i % 2) * 32, 256); g.stroke(); }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 15); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function Architecture({ realm }: { realm: Realm }) {
  const c = realm.colors; const ice = realm.id === "ice-cave";
  const floor = useMemo(() => floorTexture(c.floor, c.floorLine, ice), [c, ice]);
  const len = realm.maxZ - realm.minZ; const midZ = (realm.maxZ + realm.minZ) / 2; const W = realm.halfW * 2;
  const runes = useRef<THREE.Group>(null); const lava = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    runes.current?.children.forEach((o, i) => { o.position.y = 3 + Math.sin(t * 1.3 + i) * 0.4; o.rotation.y = t * 0.8 + i; });
    if (lava.current) lava.current.emissiveIntensity = 1.6 + Math.sin(t * 2.5) * 0.5;
  });
  const icicles = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ x: (Math.sin(i * 12.9) * 0.5) * W * 0.95, z: realm.maxZ - ((i * 0.83) % 1) * len, h: 0.8 + ((i * 7.3) % 1) * 2.2 })), [W, len, realm.maxZ]);
  return <group>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, midZ]} receiveShadow><planeGeometry args={[W, len]} /><meshStandardMaterial map={floor} roughness={ice ? 0.35 : 0.9} metalness={ice ? 0.1 : 0} /></mesh>
    <mesh rotation-x={Math.PI / 2} position={[0, 9, midZ]}><planeGeometry args={[W, len]} /><meshStandardMaterial color={c.wall} roughness={1} side={THREE.DoubleSide} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * realm.halfW, 4.5, midZ]} rotation-y={-s * Math.PI / 2} receiveShadow><planeGeometry args={[len, 9]} /><meshStandardMaterial color={c.wall} roughness={ice ? 0.4 : 0.95} /></mesh>)}
    {[realm.minZ, realm.maxZ].map((z, i) => <mesh key={z} position={[0, 4.5, z]} rotation-y={i ? Math.PI : 0}><planeGeometry args={[W, 9]} /><meshStandardMaterial color={c.wall} /></mesh>)}
    {realm.obstacles.map((o, i) => ice
      ? <group key={i} position={[o.x, 0, o.z]} rotation-y={i}>
          <mesh position-y={1.6} castShadow><coneGeometry args={[o.r * 0.8, 3.4, 6]} /><meshStandardMaterial color={c.pillar} emissive={c.pillar} emissiveIntensity={0.35} transparent opacity={0.85} roughness={0.1} /></mesh>
          <mesh position={[0.5, 0.8, 0.3]} rotation-z={-0.4} castShadow><coneGeometry args={[o.r * 0.4, 1.8, 5]} /><meshStandardMaterial color={c.accent} emissive={c.pillar} emissiveIntensity={0.4} transparent opacity={0.8} /></mesh>
        </group>
      : <group key={i} position={[o.x, 0, o.z]}>
          <mesh position-y={4.5} castShadow receiveShadow><cylinderGeometry args={[o.r, o.r * 1.15, 9, 6]} /><meshStandardMaterial color={c.pillar} roughness={0.85} flatShading /></mesh>
          <mesh position-y={2.2}><torusGeometry args={[o.r * 1.05, 0.06, 6, 6]} /><meshStandardMaterial color={c.accent} emissive={c.accent} emissiveIntensity={2} /></mesh>
        </group>)}
    {ice && icicles.map((p, i) => <mesh key={i} position={[p.x, 9 - p.h / 2, p.z]} rotation-x={Math.PI}><coneGeometry args={[0.18, p.h, 5]} /><meshStandardMaterial color={c.accent} emissive={c.pillar} emissiveIntensity={0.25} transparent opacity={0.85} /></mesh>)}
    {realm.hazards.map((h, i) => <mesh key={i} rotation-x={-Math.PI / 2} position={[h.x, 0.02, h.z]}><planeGeometry args={[h.w, h.d]} /><meshStandardMaterial ref={i === 0 ? lava : null} color="#ff4a10" emissive={c.accent} emissiveIntensity={1.8} /></mesh>)}
    {realm.hazards.map((h, i) => <pointLight key={`l${i}`} position={[h.x, 0.8, h.z]} color={c.light} intensity={6} distance={9} />)}
    {!ice && <group ref={runes}>{Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[(i % 2 ? 1 : -1) * 3, 3, 4 - i * 5]}><torusGeometry args={[0.35, 0.05, 6, 6]} /><meshStandardMaterial color={c.accent} emissive={c.accent} emissiveIntensity={3} /></mesh>)}</group>}
    {Array.from({ length: 5 }, (_, i) => <pointLight key={`f${i}`} position={[(i % 2 ? 1 : -1) * 4, 5, realm.maxZ - 4 - i * 11]} color={c.light} intensity={ice ? 10 : 8} distance={16} />)}
    <mesh position={[0, 1, realm.minZ + 3]}><boxGeometry args={[6, 2, 3]} /><meshStandardMaterial color={c.pillar} emissive={c.accent} emissiveIntensity={0.15} /></mesh>
  </group>;
}

function FoeMesh({ foe, realm }: { foe: Foe; realm: Realm }) {
  const g = useRef<THREE.Group>(null); const c = realm.colors; const s = foe.boss ? 1.7 : 1; const ice = realm.id === "ice-cave";
  useFrame(({ clock }) => {
    const o = g.current; if (!o) return;
    o.visible = foe.hp > 0; o.position.set(foe.x, Math.sin(clock.elapsedTime * 3 + foe.x) * 0.05, foe.z);
    o.scale.setScalar(s * (1 + foe.hit * 0.15));
  });
  return <group ref={g}>
    <mesh position-y={1.1} castShadow><capsuleGeometry args={[0.38, 1.1, 4, 8]} /><meshStandardMaterial color={c.enemy} roughness={ice ? 0.3 : 0.7} /></mesh>
    <mesh position-y={2.05} castShadow><sphereGeometry args={[0.28, 12, 12]} /><meshStandardMaterial color={c.enemy} /></mesh>
    <mesh position={[0.1, 2.1, 0.24]}><sphereGeometry args={[0.05, 6, 6]} /><meshStandardMaterial emissive={c.enemyGlow} emissiveIntensity={4} color={c.enemyGlow} /></mesh>
    <mesh position={[-0.1, 2.1, 0.24]}><sphereGeometry args={[0.05, 6, 6]} /><meshStandardMaterial emissive={c.enemyGlow} emissiveIntensity={4} color={c.enemyGlow} /></mesh>
    {ice ? <mesh position={[0, 2.4, 0]}><coneGeometry args={[0.25, 0.6, 5]} /><meshStandardMaterial color={c.pillar} emissive={c.pillar} emissiveIntensity={0.6} /></mesh>
      : <>{[-1, 1].map(k => <mesh key={k} position={[k * 0.18, 2.35, 0]} rotation-z={-k * 0.5}><coneGeometry args={[0.06, 0.4, 5]} /><meshStandardMaterial color="#111" /></mesh>)}</>}
    <mesh position={[0.55, 1.2, 0.2]} rotation-x={0.3}><boxGeometry args={[0.07, 1.4, 0.15]} /><meshStandardMaterial color={c.enemyGlow} emissive={c.enemyGlow} emissiveIntensity={1.5} /></mesh>
    <pointLight position-y={1.5} color={c.enemyGlow} intensity={foe.boss ? 4 : 1.5} distance={4} />
  </group>;
}

function Sim({ realm, st, report }: { realm: Realm; st: RefObject<State>; report: (h: Hud) => void }) {
  const { camera, gl } = useThree(); const t = useRef(0); const blade = useRef<THREE.Mesh>(null);
  useEffect(() => {
    const cv = gl.domElement;
    const look = (e: MouseEvent) => { if (document.pointerLockElement !== cv || !st.current.active) return; st.current.yaw -= e.movementX * 0.0022; st.current.pitch = THREE.MathUtils.clamp(st.current.pitch - e.movementY * 0.0022, -1.2, 1.2); };
    const click = () => { if (!st.current.active) return; if (document.pointerLockElement !== cv) cv.requestPointerLock()?.catch(() => {}); else st.current.keys.add("Attack"); };
    document.addEventListener("mousemove", look); cv.addEventListener("mousedown", click);
    return () => { document.removeEventListener("mousemove", look); cv.removeEventListener("mousedown", click); };
  }, [gl, st]);
  useFrame((_, raw) => {
    const s = st.current; const dt = Math.min(raw, 0.05);
    if (s.active && !s.over) {
      const f = Number(s.keys.has("KeyW") || s.keys.has("ArrowUp")) - Number(s.keys.has("KeyS") || s.keys.has("ArrowDown"));
      const sd = Number(s.keys.has("KeyD") || s.keys.has("ArrowRight")) - Number(s.keys.has("KeyA") || s.keys.has("ArrowLeft"));
      const n = Math.hypot(f, sd) || 1; const d = PLAYER_SPEED * dt / n;
      const p = moveInRealm(realm, s.x, s.z, (-Math.sin(s.yaw) * f + Math.cos(s.yaw) * sd) * d, (-Math.cos(s.yaw) * f - Math.sin(s.yaw) * sd) * d);
      s.x = p.x; s.z = p.z;
      const hz = hazardAt(realm, s.x, s.z); s.burn = hz ? 1 : 0; if (hz) s.hp -= hz.dps * dt;
      s.cd -= dt; s.swing = Math.max(0, s.swing - dt * 3);
      if ((s.keys.has("Space") || s.keys.has("Attack")) && s.cd <= 0) {
        s.cd = ATTACK_CD; s.swing = 1; s.keys.delete("Attack");
        const fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw); let hits = 0;
        for (const e of s.foes) {
          if (e.hp <= 0) continue; const dx = e.x - s.x, dz = e.z - s.z; const dist = Math.hypot(dx, dz);
          if (dist < ATTACK_RANGE + (e.boss ? 0.6 : 0) && (dx * fx + dz * fz) / (dist || 1) > 0.35) {
            const dmg = Math.round(ATTACK_DMG * (0.85 + Math.random() * 0.3)); e.hp -= dmg; e.hit = 1; hits++;
            s.log = e.hp <= 0 ? `${e.name} legyőzve!` : `${e.name}: −${dmg}`;
          }
        }
        if (!hits) s.log = "A csapás a levegőbe ment.";
      }
      for (const e of s.foes) {
        if (e.hp <= 0) continue; e.hit = Math.max(0, e.hit - dt * 4); e.cd -= dt;
        const dx = s.x - e.x, dz = s.z - e.z; const dist = Math.hypot(dx, dz);
        if (dist < 14 && dist > 1.4) { const m = moveInRealm(realm, e.x, e.z, dx / dist * e.speed * dt, dz / dist * e.speed * dt, e.boss ? 0.7 : 0.45); e.x = m.x; e.z = m.z; }
        if (dist <= 1.8 && e.cd <= 0) { e.cd = e.boss ? 1.1 : 1.4; s.hp -= e.atk; s.log = `${e.name} megsebzett: −${e.atk}`; }
      }
      if (s.hp <= 0) { s.hp = 0; s.over = "lose"; document.exitPointerLock?.(); }
      else if (s.foes.every(e => e.hp <= 0)) { s.over = "win"; document.exitPointerLock?.(); }
    }
    camera.position.set(s.x, 1.7, s.z); camera.rotation.order = "YXZ"; camera.rotation.set(s.pitch, s.yaw, 0);
    if (blade.current) { blade.current.position.copy(camera.position); blade.current.quaternion.copy(camera.quaternion); blade.current.translateX(0.45); blade.current.translateY(-0.4); blade.current.translateZ(-0.8); blade.current.rotateZ(0.5 - s.swing * 1.6); blade.current.rotateX(-s.swing * 0.6); }
    t.current += dt;
    if (t.current > 0.12) {
      t.current = 0; const alive = s.foes.filter(e => e.hp > 0); const boss = s.foes.find(e => e.boss && e.hp > 0 && Math.hypot(e.x - s.x, e.z - s.z) < 16);
      report({ hp: Math.ceil(s.hp), foes: alive.length, boss: boss ? { name: boss.name, hp: Math.max(0, boss.hp), max: boss.max } : null, log: s.log, over: s.over, burning: s.burn > 0 });
    }
  });
  return <mesh ref={blade}><boxGeometry args={[0.05, 0.9, 0.12]} /><meshStandardMaterial color="#b8c4d6" metalness={0.9} roughness={0.2} emissive={realm.colors.accent} emissiveIntensity={0.25} /></mesh>;
}

export default function RealmLevel({ id }: { id: RealmId }) {
  const realm = REALMS[id]; const c = realm.colors;
  const st = useRef<State>(fresh(realm)); const [run, setRun] = useState(0);
  const [hud, setHud] = useState<Hud>({ hp: PLAYER_HP, foes: realm.enemies.length, boss: null, log: st.current.log, over: null, burning: false });
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) { e.preventDefault(); st.current.keys.add(e.code); }
      if (e.code === "Escape") { st.current.active = false; st.current.keys.clear(); setPaused(true); }
    };
    const up = (e: KeyboardEvent) => st.current.keys.delete(e.code);
    const lockChange = () => { if (!document.pointerLockElement && !st.current.over) { st.current.active = false; st.current.keys.clear(); setPaused(true); } };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); document.addEventListener("pointerlockchange", lockChange);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); document.removeEventListener("pointerlockchange", lockChange); if (document.pointerLockElement) document.exitPointerLock(); };
  }, []);
  const resume = () => { st.current.active = true; setPaused(false); };
  const restart = () => { st.current = fresh(realm); setPaused(false); setRun(r => r + 1); };
  const exit = () => { if (document.pointerLockElement) document.exitPointerLock(); };
  return <main className="fixed inset-0 bg-background text-foreground overflow-hidden">
    <Canvas key={run} shadows dpr={[1, 1.5]} camera={{ fov: 70, near: 0.05, far: 80 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: realm.id === "ice-cave" ? 0.75 : 0.9 }}>
      <color attach="background" args={[c.bg]} />
      <fog attach="fog" args={[c.bg, 14, 55]} />
      <ambientLight intensity={realm.id === "ice-cave" ? 0.55 : 0.3} color={c.fill} />
      <hemisphereLight args={[c.fill, c.bg, 0.4]} />
      <Environment resolution={64} environmentIntensity={0.25}><Lightformer intensity={0.8} color={c.fill} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[16, 60, 1]} /><Lightformer intensity={0.6} color={c.light} position={[0, 3, -30]} scale={[10, 5, 1]} /></Environment>
      <Architecture realm={realm} />
      {st.current.foes.map((f, i) => <FoeMesh key={i} foe={f} realm={realm} />)}
      <Sim realm={realm} st={st} report={setHud} />
    </Canvas>
    {hud.burning && <div className="absolute inset-0 pointer-events-none bg-destructive/20" />}
    <header className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 pointer-events-none">
      <div className="flex items-start gap-3"><Button asChild size="icon" variant="secondary" className="pointer-events-auto" title="Vissza"><Link to="/" onClick={exit}><ArrowLeft className="size-4" /></Link></Button>
        <div><p className="text-xs text-primary font-display">[ {realm.rank}-RANG KAPU ]</p><h1 className="font-display text-lg sm:text-2xl">{realm.title}</h1><p className="text-sm text-muted-foreground">{realm.subtitle}</p></div></div>
      <div className="flex gap-2 pointer-events-auto">
        <Button size="icon" variant="secondary" title="Újrakezdés" aria-label="Újrakezdés" onClick={restart}><RotateCcw className="size-4" /></Button>
        <Button size="icon" variant="secondary" title={paused ? "Folytatás" : "Szünet"} aria-label={paused ? "Folytatás" : "Szünet"} onClick={() => { if (paused) resume(); else { st.current.active = false; setPaused(true); exit(); } }}>{paused ? <Play className="size-4" /> : <Pause className="size-4" />}</Button>
        <Button asChild variant="destructive" size="sm"><Link to="/" onClick={exit}><LogOut className="size-4" />Kilépés</Link></Button>
      </div>
    </header>
    {hud.boss && <div className="absolute left-1/2 top-24 -translate-x-1/2 w-[min(480px,85vw)] pointer-events-none"><p className="text-center font-display text-sm text-destructive mb-1">{hud.boss.name}</p><div className="h-2 bg-muted rounded"><div className="h-full bg-destructive rounded transition-all" style={{ width: `${(hud.boss.hp / hud.boss.max) * 100}%` }} /></div></div>}
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-1.5 rounded-full bg-foreground/60 pointer-events-none" />
    <footer className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-3 pointer-events-none">
      <div className="w-[min(320px,60vw)]"><p className="text-xs font-display mb-1">HP {hud.hp} / {PLAYER_HP} · Ellenfelek: {hud.foes}</p><div className="h-2 bg-muted rounded"><div className="h-full bg-primary rounded transition-all" style={{ width: `${(hud.hp / PLAYER_HP) * 100}%` }} /></div><p className="text-xs text-muted-foreground mt-2">{hud.log}</p></div>
      <Button size="lg" className="pointer-events-auto" aria-label="Támadás" onPointerDown={() => st.current.keys.add("Attack")}><Sword className="size-5" /></Button>
    </footer>
    {(paused || hud.over) && <div className="absolute inset-0 grid place-items-center bg-background/60">
      <div className="text-center space-y-3 p-6 border border-border bg-popover/95 rounded-md">
        <p className="font-display text-xl">{hud.over === "win" ? "KAPU MEGTISZTÍTVA" : hud.over === "lose" ? "ELBUKTÁL" : "SZÜNET"}</p>
        <p className="text-sm text-muted-foreground">{hud.over === "win" ? `${realm.title} összes ellenfele legyőzve.` : hud.over === "lose" ? "Próbáld újra, kerüld a csapásokat." : "Kattints a folytatáshoz, majd a pályára a nézelődéshez."}</p>
        <div className="flex gap-2 justify-center">{hud.over ? <Button onClick={restart}><RotateCcw className="size-4" />Újra</Button> : <Button onClick={resume}><Play className="size-4" />Folytatás</Button>}<Button asChild variant="secondary"><Link to="/">Kilépés</Link></Button></div>
      </div>
    </div>}
  </main>;
}
