// Pure fantasy-RPG rules: hunter rank, combat stats, monsters, loot, quests.
// The Glow-Up life-quest XP and the mentor system stay separate; this module only reads player level.
import type { Stat } from "./game-data";

export type HunterRank = "E" | "D" | "C" | "B" | "A" | "S";
export const RANK_ORDER: HunterRank[] = ["E", "D", "C", "B", "A", "S"];
/** Monster level band of each rank, and the player level needed to attempt promotion INTO that rank. */
export const RANKS: Record<HunterRank, { minLevel: number; band: [number, number]; title: string }> = {
  E: { minLevel: 1, band: [1, 5], title: "Kezdő kalandor" },
  D: { minLevel: 5, band: [5, 15], title: "Céhtag vadász" },
  C: { minLevel: 15, band: [15, 30], title: "Veterán" },
  B: { minLevel: 30, band: [30, 50], title: "Elit vadász" },
  A: { minLevel: 50, band: [50, 75], title: "Sárkányölő" },
  S: { minLevel: 75, band: [75, 100], title: "Nemzeti szintű vadász" },
};

export type Tier = "normal" | "elite" | "miniboss" | "boss";
export const TIERS: Record<Tier, { name: string; mult: number; drop: number }> = {
  normal: { name: "Normál", mult: 1, drop: 0.15 },
  elite: { name: "Elit", mult: 1.6, drop: 0.3 },
  miniboss: { name: "Miniboss", mult: 2.5, drop: 0.55 },
  boss: { name: "Főellenfél", mult: 4, drop: 1 },
};

const NAMES: Record<HunterRank, Record<Tier, string>> = {
  E: { normal: "Barlangi goblin", elite: "Goblin sámán", miniboss: "Kobold őrkapitány", boss: "Goblin király" },
  D: { normal: "Vérfarkas", elite: "Acélagyarú lycan", miniboss: "Mocsári lidérc", boss: "Kőgólem" },
  C: { normal: "Orkharcos", elite: "Sötételf íjász", miniboss: "Ork hadúr", boss: "Wyvern-anya" },
  B: { normal: "Csontlovag", elite: "Démon kardforgató", miniboss: "Vámpírgróf", boss: "Igris, a Vörös Lovag" },
  A: { normal: "Jégtroll", elite: "Fagyelf mágus", miniboss: "Baruka, a jégelf", boss: "Fagysárkány" },
  S: { normal: "Hangyakatona", elite: "Hangyalovag", miniboss: "Óriás hangyakirálynő", boss: "Kamish, az Égi Sárkány" },
};

export type Monster = { id: string; name: string; rank: HunterRank; tier: Tier; level: number; hp: number; atk: number; def: number; spd: number; xp: number; gold: number; drop: number };

export function makeMonster(rank: HunterRank, tier: Tier): Monster {
  const [lo, hi] = RANKS[rank].band;
  const tierStep = { normal: 0, elite: 0.33, miniboss: 0.66, boss: 1 }[tier];
  const level = Math.round(lo + (hi - lo) * tierStep);
  const m = TIERS[tier].mult;
  return {
    id: `${rank}-${tier}`, name: NAMES[rank][tier], rank, tier, level,
    hp: Math.round((40 + level * 18) * m),
    atk: Math.round((6 + level * 2.6) * Math.pow(m, 0.6)),
    def: Math.round((2 + level * 1.2) * Math.pow(m, 0.5)),
    spd: 8 + Math.round(level / 3),
    xp: Math.round((20 + level * 8) * m),
    gold: Math.round((5 + level * 3) * m),
    drop: TIERS[tier].drop,
  };
}

// ---------- Items ----------
export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";
export const RARITIES: Record<Rarity, { name: string; mult: number; cls: string }> = {
  common: { name: "Közönséges", mult: 1, cls: "text-muted-foreground" },
  rare: { name: "Ritka", mult: 1.5, cls: "text-primary" },
  epic: { name: "Epikus", mult: 2.2, cls: "text-accent" },
  legendary: { name: "Legendás", mult: 3.2, cls: "text-accent font-bold" },
  mythic: { name: "Mítikus", mult: 4.5, cls: "text-destructive" },
};
export type Slot = "weapon" | "armor" | "accessory";
export type Item = { id: string; slot: Slot; name: string; rarity: Rarity; base: number; plus: number; rank: HunterRank };
export const MAX_PLUS = 10;
const SLOT_NAMES: Record<Slot, string[]> = {
  weapon: ["Kard", "Tőr", "Varázsbot", "Lándzsa"],
  armor: ["Páncél", "Köpeny", "Pikkelyvért"],
  accessory: ["Amulett", "Gyűrű", "Rúnakő"],
};
export const itemPower = (it: Item) => Math.round(it.base * RARITIES[it.rarity].mult * (1 + it.plus * 0.1));
export const upgradeCost = (it: Item) => Math.round(50 * (it.plus + 1) * RARITIES[it.rarity].mult * (1 + RANK_ORDER.indexOf(it.rank)));
export const sellValue = (it: Item) => Math.round(upgradeCost({ ...it, plus: 0 }) * 0.4);

export function rollRarity(tier: Tier, r: number): Rarity {
  const bonus = { normal: 0, elite: 0.1, miniboss: 0.2, boss: 0.35 }[tier];
  const x = r + bonus;
  return x > 1.25 ? "mythic" : x > 1.05 ? "legendary" : x > 0.85 ? "epic" : x > 0.55 ? "rare" : "common";
}
export function makeItem(rank: HunterRank, tier: Tier, rand: () => number): Item {
  const slot = (["weapon", "armor", "accessory"] as Slot[])[Math.floor(rand() * 3)] ?? "weapon";
  const names = SLOT_NAMES[slot];
  const rarity = rollRarity(tier, rand());
  const ri = RANK_ORDER.indexOf(rank);
  return { id: `${Date.now().toString(36)}${Math.floor(rand() * 1e6).toString(36)}`, slot, rarity, rank, plus: 0,
    name: `${RANKS[rank].title.split(" ")[0]} ${names[Math.floor(rand() * names.length)] ?? names[0]}`,
    base: slot === "weapon" ? 6 + ri * 10 : slot === "armor" ? 4 + ri * 7 : 2 + ri * 3 };
}

// ---------- Player ----------
export type Points = { str: number; vit: number; def: number; agi: number; int: number };
export const POINTS_PER_LEVEL = 3;
export const POINT_LABELS: Record<keyof Points, string> = { str: "Erő (ATK)", vit: "Vitalitás (HP)", def: "Védelem (DEF)", agi: "Fürgeség (SPD, KRIT)", int: "Értelem (MANA)" };

export type Rpg = {
  rank: HunterRank; gold: number; hp: number | null; mana: number | null; points: Points;
  inventory: Item[]; equipped: Partial<Record<Slot, string>>; potions: number;
  kills: number; bossKills: number; day: string; dailyKills: number; dailyElite: number; claimedDaily: string[];
  dungeonsCleared: number; story: number; flags: string[]; secrets: string[]; claimedRepeat: number;
};
export const newRpg = (day: string): Rpg => ({
  rank: "E", gold: 50, hp: null, mana: null, points: { str: 0, vit: 0, def: 0, agi: 0, int: 0 }, inventory: [], equipped: {}, potions: 2,
  kills: 0, bossKills: 0, day, dailyKills: 0, dailyElite: 0, claimedDaily: [], dungeonsCleared: 0, story: 0, flags: [], secrets: [], claimedRepeat: 0,
});
export const spentPoints = (p: Points) => p.str + p.vit + p.def + p.agi + p.int;
export const freePoints = (level: number, p: Points) => (level - 1) * POINTS_PER_LEVEL - spentPoints(p);

export type CombatStats = { maxHp: number; atk: number; def: number; spd: number; crit: number; maxMana: number };
export function combatStats(level: number, rpg: Rpg, life: Record<Stat, number>): CombatStats {
  const eq = (s: Slot) => rpg.inventory.find(i => i.id === rpg.equipped[s]);
  const w = eq("weapon"), a = eq("armor"), x = eq("accessory");
  const p = rpg.points;
  return {
    maxHp: 100 + (level - 1) * 12 + p.vit * 10 + life.HP * 3 + (a ? itemPower(a) * 3 : 0),
    atk: 10 + (level - 1) * 3 + p.str * 2 + life.STR + (w ? itemPower(w) : 0),
    def: Math.round(5 + (level - 1) * 1.5 + p.def * 2 + (a ? itemPower(a) : 0)),
    spd: 10 + p.agi + (x ? Math.round(itemPower(x) / 2) : 0),
    crit: Math.min(60, 5 + p.agi * 0.5 + (x ? itemPower(x) * 0.3 : 0)),
    maxMana: 50 + level * 3 + p.int * 8 + life.MANA * 2,
  };
}

/** Damage after defence; never below 1. `crit` multiplies by 1.8. */
export function damage(atk: number, def: number, roll: number, crit: boolean, mult = 1) {
  const raw = atk * mult * (0.9 + roll * 0.2) - def * 0.5;
  return Math.max(1, Math.round(raw * (crit ? 1.8 : 1)));
}

export function canPromote(rpg: Rpg, level: number): { next: HunterRank | null; levelOk: boolean; trial: Monster | null } {
  const i = RANK_ORDER.indexOf(rpg.rank);
  const next = RANK_ORDER[i + 1] ?? null;
  if (!next) return { next: null, levelOk: false, trial: null };
  return { next, levelOk: level >= RANKS[next].minLevel, trial: makeMonster(rpg.rank, "boss") };
}
export const rankUnlocked = (rpg: Rpg, r: HunterRank) => RANK_ORDER.indexOf(r) <= RANK_ORDER.indexOf(rpg.rank);

// ---------- Quests ----------
export const DAILY = [
  { id: "d-hunt", label: "Győzz le 5 szörnyet", need: (r: Rpg) => r.dailyKills >= 5, xp: 60, gold: 40 },
  { id: "d-elite", label: "Győzz le 1 elit vagy erősebb ellenfelet", need: (r: Rpg) => r.dailyElite >= 1, xp: 90, gold: 60 },
];
export const REPEAT_REWARD = { xp: 120, gold: 100 };
export type Choice = { label: string; flag: string; xp: number; gold: number; potions?: number };
export const STORY: { title: string; text: (flags: string[]) => string; rank: HunterRank; level: number; choices: [Choice, Choice] }[] = [
  { title: "1. Az Ébredés", rank: "E", level: 1, text: () => "Egy kék kapu nyílik a város szélén. A céh toborzója két ajánlatot tesz.",
    choices: [{ label: "Belépek a Vadászcéhbe", flag: "guild", xp: 50, gold: 80 }, { label: "Egyedül vadászom", flag: "solo", xp: 100, gold: 20 }] },
  { title: "2. Az elf követ", rank: "D", level: 5, text: f => `${f.includes("guild") ? "A céhmester" : "Egy idegen"} egy sebesült sötételfet hoz eléd, aki sárkányokról suttog.`,
    choices: [{ label: "Meggyógyítom", flag: "elf-ally", xp: 80, gold: 0, potions: 3 }, { label: "Kifaggatom", flag: "elf-secret", xp: 150, gold: 50 }] },
  { title: "3. A wyvern fészke", rank: "C", level: 15, text: f => f.includes("elf-ally") ? "Az elf szövetségesed elvezet a wyvern-fészekhez egy rejtett ösvényen." : "Az elf vallomása alapján megtalálod a wyvern-fészket – de csapda vár.",
    choices: [{ label: "Elpusztítom a tojásokat", flag: "slayer", xp: 250, gold: 150 }, { label: "Megkímélem a fiókákat", flag: "tamer", xp: 180, gold: 300 }] },
  { title: "4. Az árnyék trónja", rank: "B", level: 30, text: f => `Igris trónterme előtt állsz. ${f.includes("tamer") ? "Egy fiatal wyvern követ – hálából." : "A sárkányvér szaga rád tapadt."}`,
    choices: [{ label: "Párbajra hívom Igrist", flag: "duel", xp: 500, gold: 200 }, { label: "Csellel közelítek", flag: "trick", xp: 350, gold: 500 }] },
  { title: "5. Az Égi Sárkány", rank: "A", level: 50, text: f => f.includes("guild") ? "A céhek egyesült serege rád vár, hogy vezesd őket Kamish ellen." : "Egyedül állsz a sárkány árnyékában. Ahogy mindig.",
    choices: [{ label: "Frontális támadás", flag: "hero", xp: 1200, gold: 800 }, { label: "Az árnyékaim vezetnek", flag: "monarch", xp: 1500, gold: 400 }] },
];
export const SECRETS = [
  { id: "s-gold", label: "Kincsvadász – birtokolj 1000 aranyat", test: (r: Rpg) => r.gold >= 1000, xp: 200, gold: 0 },
  { id: "s-legend", label: "Ősi kovács – szerezz legendás vagy mítikus tárgyat", test: (r: Rpg) => r.inventory.some(i => i.rarity === "legendary" || i.rarity === "mythic"), xp: 300, gold: 200 },
  { id: "s-boss5", label: "Királyölő – győzz le 5 főellenfelet", test: (r: Rpg) => r.bossKills >= 5, xp: 400, gold: 300 },
  { id: "s-plus", label: "Mesterkovács – fejlessz egy tárgyat +10-re", test: (r: Rpg) => r.inventory.some(i => i.plus >= MAX_PLUS), xp: 500, gold: 0 },
];
