import { z } from "zod";

const n = z.number().finite();
export const strategyInput = z.object({
  question: z.string().trim().max(1000),
  mentor: z.enum(["jinwoo", "chahaein", "jinho", "gunhee", "yoonho", "jinchul"]),
  cls: z.enum(["warrior", "mage", "wanderer"]),
  level: z.number().int().min(1).max(100),
  rank: z.enum(["E", "D", "C", "B", "A", "S"]),
  freePoints: z.number().int().min(0).max(1000),
  points: z.object({ str: n, vit: n, def: n, agi: n, int: n }),
  combat: z.object({ maxHp: n, atk: n, def: n, spd: n, crit: n, maxMana: n }),
  gold: n, potions: n,
  equipment: z.array(z.object({ slot: z.string().max(20), name: z.string().max(80), rarity: z.string().max(20), plus: n, power: n, equipped: z.boolean() })).max(40),
  battles: z.array(z.object({ enemy: z.string().max(80), rank: z.string().max(2), tier: z.string().max(10), level: n, result: z.enum(["win", "lose"]), hpLeftPct: n, turns: n })).max(10),
});
export type StrategyInput = z.infer<typeof strategyInput>;
