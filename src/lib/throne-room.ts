export const HALL = { halfWidth: 11, minZ: -21, maxZ: 17, radius: 0.35, speed: 4.5 };
export const COLUMN_Z = [10, 3, -4, -11];
export const COLUMNS = [-6, 6].flatMap(x => COLUMN_Z.map(z => ({ x, z })));

export function canWalk(x: number, z: number): boolean {
  const r = HALL.radius;
  if (Math.abs(x) > HALL.halfWidth - r || z < HALL.minZ + r || z > HALL.maxZ - r) return false;
  if (COLUMNS.some(c => Math.abs(x - c.x) < 0.85 + r && Math.abs(z - c.z) < 0.85 + r)) return false;
  // The throne and Igris are solid, while the broad stairs remain walkable.
  if (Math.abs(x) < 1.8 + r && z < -15.2 && z > -18.7) return false;
  if (Math.hypot(x - 3.5, z + 12.5) < 0.9 + r) return false;
  return true;
}

export function moveInHall(x: number, z: number, dx: number, dz: number) {
  // Substeps prevent a large movement from tunnelling through a column.
  const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15));
  for (let i = 0; i < count; i++) {
    if (canWalk(x + dx / count, z)) x += dx / count;
    if (canWalk(x, z + dz / count)) z += dz / count;
  }
  return { x, z };
}

export function hallGround(x: number, z: number) {
  if (Math.abs(x) > 5.6 || z > -12.8) return 0;
  if (z > -13.4) return 0.22;
  if (z > -14) return 0.44;
  if (z > -14.6) return 0.66;
  return 0.88;
}