import { describe, it, expect } from "vitest";
import { levelOf, MAX_LEVEL } from "@/lib/game-data";
import { canPromote, combatStats, damage, freePoints, makeMonster, newRpg, upgradeCost, itemPower, type Item } from "@/lib/rpg";

const life = { STR: 0, CHA: 0, INT: 0, HP: 0, MANA: 0 };
describe("Fantasy RPG rules", () => {
  it("player level stops at 100", () => { expect(levelOf(10_000_000).level).toBe(MAX_LEVEL); });
  it("higher levels need more XP", () => { expect(levelOf(150).level).toBe(2); expect(levelOf(349).level).toBe(2); });
  it("each level grants 3 skill points", () => { expect(freePoints(4, newRpg("d").points)).toBe(9); });
  it("leveling raises HP and ATK", () => {
    const a = combatStats(1, newRpg("d"), life), b = combatStats(2, newRpg("d"), life);
    expect(b.maxHp - a.maxHp).toBe(12); expect(b.atk - a.atk).toBe(3);
  });
  it("damage is never below 1", () => { expect(damage(1, 1000, 0, false)).toBe(1); });
  it("bosses are stronger than normal monsters of the same rank", () => {
    expect(makeMonster("E", "boss").hp).toBeGreaterThan(makeMonster("E", "normal").hp);
    expect(makeMonster("E", "boss").drop).toBe(1);
  });
  it("rank promotion to D needs level 5", () => {
    expect(canPromote(newRpg("d"), 4).levelOk).toBe(false);
    expect(canPromote(newRpg("d"), 5).levelOk).toBe(true);
  });
  it("upgrades add 10% power and cost more each step", () => {
    const it0: Item = { id: "x", slot: "weapon", name: "K", rarity: "common", base: 10, plus: 0, rank: "E" };
    expect(itemPower({ ...it0, plus: 1 })).toBe(11);
    expect(upgradeCost({ ...it0, plus: 1 })).toBeGreaterThan(upgradeCost(it0));
  });
});
