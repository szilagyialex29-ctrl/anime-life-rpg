export const MAX_LEVEL = 100;
export const xpFor = (lvl: number) => 100 + lvl * 50;
export function levelOf(xp: number) {
  let l = 1, r = xp;
  while (l < MAX_LEVEL && r >= xpFor(l)) { r -= xpFor(l); l++; }
  if (l === MAX_LEVEL) return { level: l, cur: xpFor(l), need: xpFor(l) };
  return { level: l, cur: r, need: xpFor(l) };
}
export const rank = (l: number) => (l >= 30 ? "S" : l >= 20 ? "A" : l >= 12 ? "B" : l >= 7 ? "C" : l >= 3 ? "D" : "E");


export const EQUIPMENT = [
 { id: "starter", level: 1, tier: 0, name: "Újonc felszerelés" },
 { id: "enchanted", level: 3, tier: 1, name: "Elvarázsolt felszerelés" },
 { id: "legendary", level: 7, tier: 2, name: "Legendás felszerelés" },
] as const;
export const AURAS = [
 { id: "none", level: 1, name: "Aura nélkül" },
 { id: "frost", level: 2, name: "Ébredő erő" },
 { id: "emerald", level: 5, name: "Vadász kisugárzás" },
 { id: "gold", level: 10, name: "Uralkodó aura" },
] as const;
export type EquipmentId = typeof EQUIPMENT[number]["id"];
export type AuraId = typeof AURAS[number]["id"];
export function unlocked(level: number, item: { level: number }) { return level >= item.level; }
export function resolveEquipment(id: EquipmentId, level: number) {
 return EQUIPMENT.find(item => item.id === id && unlocked(level, item)) ?? EQUIPMENT[0];
}
export function resolveAura(id: AuraId, level: number) {
 return AURAS.find(item => item.id === id && unlocked(level, item)) ?? AURAS[0];
}
