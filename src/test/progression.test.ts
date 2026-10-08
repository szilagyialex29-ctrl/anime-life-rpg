import { describe, it, expect } from "vitest";
import { EQUIPMENT, AURAS, unlocked, resolveEquipment, resolveAura, levelOf } from "@/lib/progression";
import { mentorInput } from "@/lib/mentor-schema";
describe("Level-unlocked avatar cosmetics", () => {
  for (const item of [...EQUIPMENT, ...AURAS]) {
    it(`${item.id} unlocks at level ${item.level}, not before`, () => {
      expect(unlocked(item.level - 1, item)).toBe(false);
      expect(unlocked(item.level, item)).toBe(true);
    });
  }
  it("does not equip locked gear from saved state", () => {
    expect(resolveEquipment("legendary", 1).id).toBe("starter");
    expect(resolveAura("gold", 1).id).toBe("none");
  });
  it("unlocks level 3 gear through earned XP", () => {
    expect(levelOf(349).level).toBe(2);
    expect(resolveEquipment("enchanted", levelOf(350).level).id).toBe("enchanted");
  });
});
describe("Personalized mentor advice", () => {
  const input = { challenge: "Edzéshez kérnék tanácsot", mentor: "chahaein", cls: "warrior", name: "Alex", xp: 0, stats: { STR: 2, CHA: 1, INT: 1, HP: 1, MANA: 1 }, done: ["water"], inPenalty: false };
  it("retains selected mentor and current stats and quests", () => {
    const parsed = mentorInput.parse(input);
    expect(parsed.mentor).toBe("chahaein"); expect(parsed.stats.STR).toBe(2); expect(parsed.done).toEqual(["water"]);
  });
  it("rejects an unknown mentor", () => { expect(mentorInput.safeParse({ ...input, mentor: "unknown" }).success).toBe(false); });
});
import { keysAvailable, GATES } from "@/lib/dungeon";
describe("dungeon keys", () => {
  it("one key per completed quest minus used", () => {
    expect(keysAvailable(3, 1)).toBe(2);
    expect(keysAvailable(1, 2)).toBe(0);
  });
  it("E gate opens at level 1", () => { expect(GATES[0]?.minLevel).toBe(1); });
});
