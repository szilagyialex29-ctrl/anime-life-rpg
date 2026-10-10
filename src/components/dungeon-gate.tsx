import { lazy, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
const DungeonGame = lazy(() => import("@/components/dungeon/dungeon-game"));
import { Button } from "@/components/ui/button";
import type { Stat } from "@/lib/game-data";
import { GATES, SKILLS, keysAvailable, playerFighter, skillDamage, type Gate, type Skill, type Fighter } from "@/lib/dungeon";

type Store = { day: string; used: number; shadows: string[]; cleared: string[] };
const KEY = "glowup-dungeon";

type Battle = { gate: Gate; me: Fighter; bossHp: number; log: string[]; over: null | "win" | "lose" };

export function DungeonGates({ level, stats, doneToday, day, onXp }: {
  level: number; stats: Record<Stat, number>; doneToday: number; day: string; onXp: (xp: number) => void;
}) {
  const [st, setSt] = useState<Store>({ day, used: 0, shadows: [], cleared: [] });
  const [loaded, setLoaded] = useState(false);
  const [b, setB] = useState<Battle | null>(null);
  const [live, setLive] = useState<Gate | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const p = JSON.parse(raw) as Store; setSt(p.day === day ? p : { ...p, day, used: 0 }); }
    } catch { localStorage.removeItem(KEY); }
    setLoaded(true);
  }, [day]);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify(st)); }, [st, loaded]);

  const keys = keysAvailable(doneToday, st.used);

  function enter3d(g: Gate) {
    if (keys < 1) return;
    setSt({ ...st, used: st.used + 1 });
    setLive(g);
  }
  function finish3d(won: boolean) {
    const g = live; if (!g) return;
    if (won) {
      onXp(g.xp);
      setSt(s => ({ ...s, cleared: s.cleared.includes(g.rank) ? s.cleared : [...s.cleared, g.rank] }));
      const me = playerFighter(level, stats);
      setB({ gate: g, me, bossHp: 0, log: [`[RENDSZER] ${g.boss} legyőzve a 3D kapuban. +${g.xp} XP`], over: "win" });
    }
  }

  function enter(g: Gate) {
    if (keys < 1) return;
    setSt({ ...st, used: st.used + 1 });
    const me = playerFighter(level, stats);
    me.atk += st.shadows.length * 2;
    setB({ gate: g, me, bossHp: g.hp, log: [`[RENDSZER] ${g.rank}-rangú kapu megnyílt. Ellenfél: ${g.boss}.`], over: null });
  }

  function act(skill: Skill) {
    if (!b || b.over) return;
    const sk = SKILLS[skill];
    if (b.me.mana < sk.mana) return;
    const dmg = skillDamage(skill, b.me, stats, Math.random());
    const bossHp = Math.max(0, b.bossHp - dmg);
    const log = [...b.log, `Te: ${sk.name} → ${dmg} sebzés.`];
    let hp = b.me.hp;
    if (bossHp > 0) {
      const hit = skill === "dash" ? Math.round(b.gate.atk * 0.3) : Math.round(b.gate.atk * (0.8 + Math.random() * 0.4));
      hp = Math.max(0, hp - hit);
      log.push(`${b.gate.boss} visszaüt: ${hit} sebzés.`);
    }
    const mana = Math.min(b.me.mana - sk.mana + 3, 30 + stats.MANA * 5);
    let over: Battle["over"] = null;
    if (bossHp === 0) { over = "win"; log.push(`[RENDSZER] Kapu megtisztítva. +${b.gate.xp} XP`); onXp(b.gate.xp); setSt(s => ({ ...s, cleared: s.cleared.includes(b.gate.rank) ? s.cleared : [...s.cleared, b.gate.rank] })); }
    else if (hp === 0) { over = "lose"; log.push("[RENDSZER] Elbuktál. Teljesíts több küldetést, és erősödj."); }
    setB({ ...b, bossHp, me: { ...b.me, hp, mana }, log: log.slice(-6), over });
  }

  function extract() {
    if (!b || b.over !== "win") return;
    const ok = Math.random() < 0.6;
    if (ok && !st.shadows.includes(b.gate.boss)) setSt({ ...st, shadows: [...st.shadows, b.gate.boss] });
    setB({ ...b, over: null, log: [...b.log, ok ? `„Ébredj!” — ${b.gate.boss} csatlakozott az árnyékseregedhez.` : "„Ébredj!” — a kinyerés sikertelen."].slice(-6) });
    setTimeout(() => setB(null), 1800);
  }

  return (
    <div className="system-window p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg text-primary">KAPUK</h2>
        <span className="font-display text-sm text-accent">🗝 {keys} kulcs</span>
      </div>
      {live && createPortal(
        <Suspense fallback={<div className="fixed inset-0 z-50 grid place-items-center bg-background font-display text-primary">[ RENDSZER ] Kapu töltése…</div>}>
          <DungeonGame gate={live} level={level} stats={stats} shadowBonus={st.shadows.length * 2} onExit={() => setLive(null)} onFinish={finish3d} />
        </Suspense>, document.body
      )}
      {!b && (
        <>
          <p className="text-xs text-muted-foreground mb-3">Minden teljesített napi küldetés = 1 kapu-kulcs. Árnyékok: {st.shadows.length ? st.shadows.join(", ") : "nincs"} (+{st.shadows.length * 2} ATK)</p>
          <ul className="grid gap-2">
            {GATES.map(g => {
              const locked = level < g.minLevel;
              return (
                <li key={g.rank} className="flex items-center justify-between gap-2 border border-border rounded-md p-2">
                  <div>
                    <div className="font-display text-sm">{g.rank}-rang · {g.boss} {st.cleared.includes(g.rank) && "✓"}</div>
                    <div className="text-xs text-muted-foreground">HP {g.hp} · ATK {g.atk} · +{g.xp} XP{locked && ` · lvl ${g.minLevel}+`}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" disabled={locked || keys < 1} onClick={() => enter3d(g)}>3D Belépés</Button>
                    <Button size="sm" variant="secondary" disabled={locked || keys < 1} onClick={() => enter(g)}>Gyors</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {b && (
        <div className="space-y-3">
          <div className="text-sm">
            <div className="flex justify-between"><span>{b.gate.boss}</span><span>{b.bossHp}/{b.gate.hp}</span></div>
            <div className="h-2 bg-muted rounded"><div className="h-2 bg-destructive rounded transition-all" style={{ width: `${(b.bossHp / b.gate.hp) * 100}%` }} /></div>
            <div className="flex justify-between mt-2"><span>Te · MANA {b.me.mana}</span><span>{b.me.hp}/{b.me.maxHp}</span></div>
            <div className="h-2 bg-muted rounded"><div className="h-2 bg-primary rounded transition-all" style={{ width: `${(b.me.hp / b.me.maxHp) * 100}%` }} /></div>
          </div>
          <ul className="text-xs font-mono space-y-0.5 text-muted-foreground">{b.log.map((l, i) => <li key={i}>{l}</li>)}</ul>
          {!b.over && (
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SKILLS) as Skill[]).map(k => (
                <Button key={k} size="sm" variant="secondary" disabled={b.me.mana < SKILLS[k].mana} onClick={() => act(k)} title={SKILLS[k].desc}>
                  {SKILLS[k].name}{SKILLS[k].mana ? ` (${SKILLS[k].mana})` : ""}
                </Button>
              ))}
            </div>
          )}
          {b.over === "win" && <div className="flex gap-2"><Button onClick={extract}>Ébredj! (árnyékkinyerés)</Button><Button variant="ghost" onClick={() => setB(null)}>Kilépés</Button></div>}
          {b.over === "lose" && <Button variant="ghost" onClick={() => setB(null)}>Vissza</Button>}
        </div>
      )}
    </div>
  );
}
