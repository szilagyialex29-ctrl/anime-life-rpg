// Pure realm rules shared by the 3D scenes and tests: layout, collision, hazards, enemies.
export type RealmId = "ice-cave" | "demon-castle";
export type Obstacle = { x: number; z: number; r: number };
export type Hazard = { x: number; z: number; w: number; d: number; dps: number };
export type EnemySpec = { name: string; x: number; z: number; hp: number; atk: number; speed: number; boss?: boolean };

export type Realm = {
  id: RealmId; title: string; rank: string; subtitle: string;
  halfW: number; minZ: number; maxZ: number; start: { x: number; z: number };
  obstacles: Obstacle[]; hazards: Hazard[]; enemies: EnemySpec[];
  colors: { bg: string; floor: string; floorLine: string; wall: string; pillar: string; accent: string; light: string; fill: string; enemy: string; enemyGlow: string };
};

export const PLAYER_R = 0.45;
export const PLAYER_SPEED = 5;
export const PLAYER_HP = 200;
export const ATTACK_RANGE = 2.6;
export const ATTACK_DMG = 28;
export const ATTACK_CD = 0.45;

const iceCrystals: Obstacle[] = [];
for (let i = 0; i < 7; i++) {
  iceCrystals.push({ x: -6 + (i % 2) * 1.2, z: 6 - i * 7.5, r: 1.1 });
  iceCrystals.push({ x: 6 - (i % 2) * 1.2, z: 2.5 - i * 7.5, r: 1.1 });
}
iceCrystals.push({ x: -1.8, z: -18, r: 1.2 }, { x: 2.2, z: -30, r: 1.3 });

const basalt: Obstacle[] = [];
for (let i = 0; i < 6; i++) { basalt.push({ x: -5, z: 6 - i * 9, r: 0.9 }, { x: 5, z: 6 - i * 9, r: 0.9 }); }

export const REALMS: Record<RealmId, Realm> = {
  "ice-cave": {
    id: "ice-cave", title: "Fagyos Jégbarlang", rank: "A", subtitle: "Baruka fagyos birodalma",
    halfW: 8, minZ: -50, maxZ: 10, start: { x: 0, z: 8 },
    obstacles: iceCrystals, hazards: [],
    enemies: [
      { name: "Jégtroll", x: -3, z: -6, hp: 90, atk: 10, speed: 2.2 },
      { name: "Fagyelf mágus", x: 3, z: -12, hp: 70, atk: 12, speed: 2.8 },
      { name: "Jégtroll", x: 0, z: -22, hp: 90, atk: 10, speed: 2.2 },
      { name: "Fagyelf mágus", x: -4, z: -28, hp: 70, atk: 12, speed: 2.8 },
      { name: "Baruka, a jégelf", x: 0, z: -42, hp: 320, atk: 18, speed: 3.2, boss: true },
    ],
    colors: { bg: "#0b1726", floor: "#dfeaf2", floorLine: "#9fb8cc", wall: "#5f86a8", pillar: "#7fd8ff", accent: "#bff0ff", light: "#8fd6ff", fill: "#cfe8ff", enemy: "#a9c7dc", enemyGlow: "#5fd0ff" },
  },
  "demon-castle": {
    id: "demon-castle", title: "Démonvár", rank: "B/S", subtitle: "Az alvilági csarnok",
    halfW: 8, minZ: -50, maxZ: 10, start: { x: 0, z: 8 },
    obstacles: basalt,
    hazards: [
      { x: 0, z: -8, w: 10, d: 1.6, dps: 30 },
      { x: -4.5, z: -20, w: 4, d: 6, dps: 30 },
      { x: 4.5, z: -27, w: 4, d: 6, dps: 30 },
      { x: 0, z: -35, w: 12, d: 1.6, dps: 30 },
    ],
    enemies: [
      { name: "Démon kardforgató", x: 2, z: -4, hp: 100, atk: 13, speed: 2.8 },
      { name: "Démon kardforgató", x: -2, z: -14, hp: 100, atk: 13, speed: 2.8 },
      { name: "Alvilági őr", x: 0, z: -24, hp: 150, atk: 16, speed: 2.4 },
      { name: "Démon kardforgató", x: 3, z: -31, hp: 100, atk: 13, speed: 2.8 },
      { name: "Baran, a démonkirály", x: 0, z: -43, hp: 380, atk: 22, speed: 3, boss: true },
    ],
    colors: { bg: "#0d0606", floor: "#2a2526", floorLine: "#141011", wall: "#1c1517", pillar: "#262022", accent: "#ff5a1f", light: "#ff6a2a", fill: "#ffb07a", enemy: "#3a1414", enemyGlow: "#ff3b1f" },
  },
};

/** Moves a circle through the realm, per axis, so sliding along walls and pillars still works. */
export function moveInRealm(realm: Realm, x: number, z: number, dx: number, dz: number, r = PLAYER_R) {
  const ok = (nx: number, nz: number) =>
    Math.abs(nx) <= realm.halfW - r && nz >= realm.minZ + r && nz <= realm.maxZ - r &&
    realm.obstacles.every(o => Math.hypot(nx - o.x, nz - o.z) >= o.r + r);
  let nx = x, nz = z;
  if (ok(x + dx, z)) nx = x + dx;
  if (ok(nx, z + dz)) nz = z + dz;
  return { x: nx, z: nz };
}

export function hazardAt(realm: Realm, x: number, z: number) {
  return realm.hazards.find(h => Math.abs(x - h.x) <= h.w / 2 && Math.abs(z - h.z) <= h.d / 2) ?? null;
}
