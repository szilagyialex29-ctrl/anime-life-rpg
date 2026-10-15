import { describe, expect, it } from "vitest";
import { REALMS, moveInRealm, hazardAt } from "@/lib/realms";

describe("realms", () => {
  it("walls block movement", () => {
    const r = REALMS["ice-cave"];
    expect(moveInRealm(r, 7, 8, 5, 0).x).toBeLessThanOrEqual(r.halfW);
  });
  it("crystals and pillars block movement", () => {
    const r = REALMS["demon-castle"]; const p = r.obstacles[0]!;
    const out = moveInRealm(r, p.x + 2, p.z, -2, 0);
    expect(Math.hypot(out.x - p.x, out.z - p.z)).toBeGreaterThan(p.r);
  });
  it("lava trenches burn, safe floor does not", () => {
    const r = REALMS["demon-castle"];
    expect(hazardAt(r, 0, -8)).not.toBeNull();
    expect(hazardAt(r, 0, 8)).toBeNull();
  });
  it("each realm ends with one boss", () => {
    for (const r of Object.values(REALMS)) expect(r.enemies.filter(e => e.boss)).toHaveLength(1);
  });
});
