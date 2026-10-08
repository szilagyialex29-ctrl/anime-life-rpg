import type { Stat } from "./game-data";

export type GateRank = "E" | "D" | "C" | "B" | "A" | "S";
export type Gate = { rank: GateRank; boss: string; hp: number; atk: number; minLevel: number; xp: number };

export const GATES: Gate[] = [
  { rank: "E", boss: "Goblin vezér", hp: 60, atk: 6, minLevel: 1, xp: 30 },
  { rank: "D", boss: "Acélagyarú lycan", hp: 110, atk: 10, minLevel: 3, xp: 50 },
  { rank: "C", boss: "Kőóriás", hp: 180, atk: 15, minLevel: 5, xp: 80 },
  { rank: "B", boss: "Igris, a Vörös Lovag", hp: 280, atk: 22, minLevel: 8, xp: 120 },
  { rank: "A", boss: "Baruka, a jégelf", hp: 400, atk: 30, minLevel: 12, xp: 180 },
  { rank: "S", boss: "Beru, a hangyakirály", hp: 600, atk: 42, minLevel: 18, xp: 300 },
];

/** One gate key per completed daily quest. */
export const keysAvailable = (doneToday: number, usedToday: number) => Math.max(0, doneToday - usedToday);

export type Fighter = { hp: number; maxHp: number; mana: number; atk: number };

export function playerFighter(level: number, stats: Record<Stat, number>): Fighter {
  const maxHp = 80 + level * 10 + stats.HP * 6;
  return { hp: maxHp, maxHp, mana: 30 + stats.MANA * 5, atk: 8 + level * 2 + stats.STR * 2 };
}

export type Skill = "strike" | "focus" | "dash";
export const SKILLS: Record<Skill, { name: string; mana: number; desc: string }> = {
  strike: { name: "Csapás", mana: 0, desc: "Alap támadás (STR)" },
  focus: { name: "Mana-robbanás", mana: 15, desc: "Dupla sebzés (INT)" },
  dash: { name: "Árnyéklépés", mana: 10, desc: "Kitérés + kontra (CHA)" },
};

export function skillDamage(skill: Skill, f: Fighter, stats: Record<Stat, number>, roll: number): number {
  const base = f.atk * (0.8 + roll * 0.4);
  if (skill === "focus") return Math.round(base * 2 + stats.INT * 3);
  if (skill === "dash") return Math.round(base * 0.7 + stats.CHA * 2);
  return Math.round(base);
}
