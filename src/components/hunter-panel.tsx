import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Stat } from "@/lib/game-data";
import {
  RANKS, RANK_ORDER, TIERS, RARITIES, DAILY, STORY, SECRETS, REPEAT_REWARD, MAX_PLUS, POINT_LABELS,
  makeMonster, makeItem, combatStats, damage, freePoints, canPromote, rankUnlocked, itemPower, upgradeCost, sellValue,
  type Rpg, type Monster, type Tier, type HunterRank, type Points, type Item,
} from "@/lib/rpg";

type Mode = { kind: "hunt" } | { kind: "dungeon"; stage: number } | { kind: "trial" };
type Fight = { m: Monster; mhp: number; log: string[]; over: null | "win" | "lose"; mode: Mode; rank: HunterRank };
const DUNGEON_STAGES: Tier[] = ["normal", "elite", "miniboss", "boss"];
const DUNGEON_NAMES: Record<HunterRank, string> = { E: "Goblinbarlang", D: "Holdfény-erdő", C: "Wyvern-szirt", B: "Vörös vár", A: "Fagykatedrális", S: "Égi Sárkány fészke" };

type Props = { rpg: Rpg; setRpg: (f: (r: Rpg) => Rpg) => void; level: number; life: Record<Stat, number>; onXp: (xp: number) => void };

export function HunterPanel({ rpg, setRpg, level, life, onXp }: Props) {
  const st = combatStats(level, rpg, life);
  const hp = Math.min(rpg.hp ?? st.maxHp, st.maxHp);
  const mana = Math.min(rpg.mana ?? st.maxMana, st.maxMana);
  const [f, setF] = useState<Fight | null>(null);
  const free = freePoints(level, rpg.points);
  const ri = RANK_ORDER.indexOf(rpg.rank);
  const innCost = 10 + ri * 20;

  function start(rank: HunterRank, tier: Tier, mode: Mode) {
    if (hp <= 1) { toast.error("Túl gyenge vagy. Pihenj a fogadóban vagy igyál bájitalt."); return; }
    const m = makeMonster(rank, tier);
    setF({ m, mhp: m.hp, log: [`[RENDSZER] ${TIERS[tier].name} ellenfél: ${m.name} (Lv ${m.level})`], over: null, mode, rank });
  }

  function win(fi: Fight, myHp: number, myMana: number, log: string[]) {
    const { m } = fi;
    const drop = Math.random() < m.drop ? makeItem(fi.rank, m.tier, Math.random) : null;
    log.push(`[GYŐZELEM] +${m.xp} XP · +${m.gold} arany${drop ? ` · Zsákmány: ${drop.name} (${RARITIES[drop.rarity].name})` : ""}`);
    onXp(m.xp);
    const promote = fi.mode.kind === "trial";
    const dungeonDone = fi.mode.kind === "dungeon" && fi.mode.stage === DUNGEON_STAGES.length - 1;
    setRpg(r => {
      const next = RANK_ORDER[RANK_ORDER.indexOf(r.rank) + 1];
      return {
        ...r, hp: myHp, mana: myMana, gold: r.gold + m.gold, kills: r.kills + 1, dailyKills: r.dailyKills + 1,
        dailyElite: r.dailyElite + (m.tier === "normal" ? 0 : 1), bossKills: r.bossKills + (m.tier === "boss" ? 1 : 0),
        inventory: drop ? [...r.inventory, drop] : r.inventory,
        dungeonsCleared: r.dungeonsCleared + (dungeonDone ? 1 : 0),
        rank: promote && next ? next : r.rank,
      };
    });
    if (promote) toast.success(`[RANGEMELÉS] Mostantól ${RANK_ORDER[ri + 1]}-rangú vadász vagy!`);
    if (dungeonDone) toast.success(`[DUNGEON] ${DUNGEON_NAMES[fi.rank]} megtisztítva!`);
    setF({ ...fi, mhp: 0, log: log.slice(-7), over: "win" });
  }

  function act(kind: "attack" | "skill" | "potion" | "flee") {
    if (!f || f.over) return;
    const log = [...f.log];
    let myHp = hp, myMana = mana, mhp = f.mhp;
    const { m } = f;
    if (kind === "flee") {
      if (m.tier === "boss") return;
      if (Math.random() < 0.5 + (st.spd - m.spd) * 0.03) { setRpg(r => ({ ...r, hp: myHp, mana: myMana })); setF(null); toast("Sikeresen elmenekültél."); return; }
      log.push("A menekülés sikertelen!");
    }
    const playerTurn = () => {
      if (kind === "potion") {
        const heal = Math.round(st.maxHp * 0.4); myHp = Math.min(st.maxHp, myHp + heal);
        setRpg(r => ({ ...r, potions: r.potions - 1 })); log.push(`Bájital: +${heal} HP`); return;
      }
      if (kind === "flee") return;
      const crit = Math.random() * 100 < st.crit;
      const mult = kind === "skill" ? 1.8 : 1;
      if (kind === "skill") myMana -= 25;
      const d = damage(st.atk, m.def, Math.random(), crit, mult);
      mhp = Math.max(0, mhp - d);
      log.push(`Te: ${kind === "skill" ? "Árnyékpenge" : "Támadás"} → ${d}${crit ? " KRITIKUS!" : ""}`);
    };
    const monsterTurn = () => {
      if (mhp <= 0) return;
      const d = damage(m.atk, st.def, Math.random(), Math.random() < 0.08);
      myHp = Math.max(0, myHp - d); log.push(`${m.name} → ${d} sebzés`);
    };
    if (st.spd >= m.spd) { playerTurn(); monsterTurn(); } else { monsterTurn(); if (myHp > 0) playerTurn(); }
    myMana = Math.min(st.maxMana, myMana + 4);
    if (mhp <= 0) return win({ ...f, mhp }, myHp, myMana, log);
    if (myHp <= 0) {
      const lost = Math.round(rpg.gold * 0.1);
      log.push(`[VERESÉG] Elájultál. -${lost} arany. Pihenj és erősödj.`);
      setRpg(r => ({ ...r, hp: 1, mana: myMana, gold: r.gold - lost }));
      setF({ ...f, mhp, log: log.slice(-7), over: "lose" }); return;
    }
    setRpg(r => ({ ...r, hp: myHp, mana: myMana }));
    setF({ ...f, mhp, log: log.slice(-7) });
  }

  function continueDungeon() {
    if (!f || f.mode.kind !== "dungeon") return;
    const stage = f.mode.stage + 1;
    if (stage >= DUNGEON_STAGES.length) { setF(null); return; }
    start(f.rank, DUNGEON_STAGES[stage] ?? "boss", { kind: "dungeon", stage });
  }

  const rest = () => { if (rpg.gold < innCost) return toast.error("Nincs elég aranyad."); setRpg(r => ({ ...r, gold: r.gold - innCost, hp: null, mana: null })); toast.success("Kipihented magad. HP és MANA tele."); };
  const buyPotion = () => { if (rpg.gold < 25) return toast.error("Nincs elég aranyad."); setRpg(r => ({ ...r, gold: r.gold - 25, potions: r.potions + 1 })); };
  const addPoint = (k: keyof Points) => free > 0 && setRpg(r => ({ ...r, points: { ...r.points, [k]: r.points[k] + 1 } }));
  const reward = (xp: number, gold: number, patch: (r: Rpg) => Partial<Rpg>, msg: string) => { onXp(xp); setRpg(r => ({ ...r, gold: r.gold + gold, ...patch(r) })); toast.success(`${msg} +${xp} XP${gold ? ` · +${gold} arany` : ""}`); };
  const upgrade = (it: Item) => {
    const c = upgradeCost(it); if (rpg.gold < c || it.plus >= MAX_PLUS) return;
    setRpg(r => ({ ...r, gold: r.gold - c, inventory: r.inventory.map(i => i.id === it.id ? { ...i, plus: i.plus + 1 } : i) }));
  };
  const sell = (it: Item) => setRpg(r => ({ ...r, gold: r.gold + sellValue(it), inventory: r.inventory.filter(i => i.id !== it.id),
    equipped: Object.fromEntries(Object.entries(r.equipped).filter(([, v]) => v !== it.id)) }));

  const promo = canPromote(rpg, level);
  const repeatReady = rpg.dungeonsCleared > rpg.claimedRepeat;
  const chapter = STORY[rpg.story];

  return (
    <div className="system-window p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="font-display text-lg text-primary">VADÁSZ · {rpg.rank}-RANG <span className="text-xs text-muted-foreground">{RANKS[rpg.rank].title}</span></h2>
        <span className="font-display text-sm text-accent">{rpg.gold} arany · 🧪 {rpg.potions}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
        <Bar label="HP" v={hp} max={st.maxHp} cls="bg-destructive" />
        <Bar label="MANA" v={mana} max={st.maxMana} cls="bg-primary" />
        <div className="border border-border p-2">ATK <b className="text-accent">{st.atk}</b> · DEF <b className="text-accent">{st.def}</b></div>
        <div className="border border-border p-2">SPD <b className="text-accent">{st.spd}</b> · KRIT <b className="text-accent">{st.crit.toFixed(1)}%</b></div>
      </div>

      {f ? (
        <div className="space-y-3">
          <div className="text-sm">
            <div className="flex justify-between"><span>{f.m.name} · {TIERS[f.m.tier].name} · Lv {f.m.level}</span><span>{f.mhp}/{f.m.hp}</span></div>
            <div className="h-2 bg-muted"><div className="h-2 bg-destructive transition-all" style={{ width: `${(f.mhp / f.m.hp) * 100}%` }} /></div>
            <p className="text-xs text-muted-foreground mt-1">ATK {f.m.atk} · DEF {f.m.def} · SPD {f.m.spd} · Zsákmány esély {Math.round(f.m.drop * 100)}%</p>
          </div>
          <ul className="text-xs font-mono space-y-0.5 text-muted-foreground">{f.log.map((l, i) => <li key={i}>{l}</li>)}</ul>
          {!f.over && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => act("attack")}>Támadás</Button>
              <Button size="sm" variant="secondary" disabled={mana < 25} onClick={() => act("skill")}>Árnyékpenge (25)</Button>
              <Button size="sm" variant="secondary" disabled={rpg.potions < 1} onClick={() => act("potion")}>Bájital ({rpg.potions})</Button>
              {f.m.tier !== "boss" && <Button size="sm" variant="ghost" onClick={() => act("flee")}>Menekülés</Button>}
            </div>
          )}
          {f.over === "win" && f.mode.kind === "dungeon" && f.mode.stage < DUNGEON_STAGES.length - 1
            ? <div className="flex gap-2"><Button onClick={continueDungeon}>Tovább a következő terembe</Button><Button variant="ghost" onClick={() => setF(null)}>Kilépés</Button></div>
            : f.over && <Button variant="ghost" onClick={() => setF(null)}>Vissza</Button>}
        </div>
      ) : (
        <Tabs defaultValue="hunt">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="hunt">Vadászat</TabsTrigger>
            <TabsTrigger value="dungeon">Dungeonök</TabsTrigger>
            <TabsTrigger value="quests">Küldetések</TabsTrigger>
            <TabsTrigger value="char">Karakterlap{free > 0 ? ` (${free})` : ""}</TabsTrigger>
            <TabsTrigger value="gear">Felszerelés</TabsTrigger>
            <TabsTrigger value="rank">Rang</TabsTrigger>
          </TabsList>

          <TabsContent value="hunt" className="space-y-2">
            <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={rest}>Fogadó: teljes gyógyulás ({innCost} arany)</Button><Button size="sm" variant="secondary" onClick={buyPotion}>Bájital vásárlás (25 arany)</Button></div>
            {RANK_ORDER.filter(r => rankUnlocked(rpg, r)).map(r => (
              <div key={r} className="border border-border p-2">
                <p className="font-display text-sm mb-2">{r}-rangú vadászterület</p>
                <div className="flex flex-wrap gap-2">
                  {(["normal", "elite"] as Tier[]).map(t => { const m = makeMonster(r, t); return (
                    <Button key={t} size="sm" variant="outline" onClick={() => start(r, t, { kind: "hunt" })}>{m.name} · Lv {m.level}</Button>); })}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="dungeon" className="space-y-2">
            <p className="text-xs text-muted-foreground">4 terem: normál → elit → miniboss → főellenfél. A HP-d termek között nem töltődik.</p>
            {RANK_ORDER.map(r => { const locked = !rankUnlocked(rpg, r); const boss = makeMonster(r, "boss"); return (
              <div key={r} className="flex items-center justify-between gap-2 border border-border p-2">
                <div><div className="font-display text-sm">{r} · {DUNGEON_NAMES[r]}</div><div className="text-xs text-muted-foreground">Főellenfél: {boss.name} (Lv {boss.level}){locked && ` · ${r}-rang szükséges`}</div></div>
                <Button size="sm" disabled={locked} onClick={() => start(r, "normal", { kind: "dungeon", stage: 0 })}>Belépés</Button>
              </div>); })}
          </TabsContent>

          <TabsContent value="quests" className="space-y-3 text-sm">
            <div><p className="font-display text-xs text-primary mb-1">[ NAPI VADÁSZAT ]</p>
              {DAILY.map(q => { const ok = q.need(rpg), got = rpg.claimedDaily.includes(q.id); return (
                <div key={q.id} className="flex justify-between items-center border border-border p-2 mb-1"><span>{q.label}</span>
                  <Button size="sm" disabled={!ok || got} onClick={() => reward(q.xp, q.gold, r => ({ claimedDaily: [...r.claimedDaily, q.id] }), "Napi küldetés kész!")}>{got ? "Átvéve" : `+${q.xp} XP`}</Button></div>); })}
              <p className="text-xs text-muted-foreground">Ma: {rpg.dailyKills} legyőzött szörny, {rpg.dailyElite} elit.</p>
            </div>
            <div><p className="font-display text-xs text-primary mb-1">[ ISMÉTELHETŐ ]</p>
              <div className="flex justify-between items-center border border-border p-2"><span>Tisztíts meg egy dungeont ({rpg.dungeonsCleared - rpg.claimedRepeat} beváltható)</span>
                <Button size="sm" disabled={!repeatReady} onClick={() => reward(REPEAT_REWARD.xp, REPEAT_REWARD.gold, r => ({ claimedRepeat: r.claimedRepeat + 1 }), "Céhjutalom!")}>+{REPEAT_REWARD.xp} XP</Button></div>
            </div>
            <div><p className="font-display text-xs text-primary mb-1">[ FŐ TÖRTÉNET ]</p>
              {chapter ? (() => { const ok = rankUnlocked(rpg, chapter.rank) && level >= chapter.level; return (
                <div className="border border-accent p-3"><p className="font-display">{chapter.title}</p>
                  {ok ? <><p className="text-muted-foreground my-2">{chapter.text(rpg.flags)}</p>
                    <div className="flex flex-wrap gap-2">{chapter.choices.map(c => (
                      <Button key={c.flag} size="sm" variant="secondary" onClick={() => reward(c.xp, c.gold, r => ({ story: r.story + 1, flags: [...r.flags, c.flag], potions: r.potions + (c.potions ?? 0) }), c.label)}>{c.label} (+{c.xp} XP{c.gold ? `, +${c.gold} arany` : ""}{c.potions ? `, +${c.potions} bájital` : ""})</Button>))}</div></>
                    : <p className="text-xs text-muted-foreground mt-1">Feltétel: {chapter.rank}-rang és {chapter.level}. szint.</p>}
                </div>); })() : <p className="text-muted-foreground">A történet véget ért… egyelőre. Döntéseid: {rpg.flags.join(", ")}</p>}
            </div>
            <div><p className="font-display text-xs text-primary mb-1">[ TITKOS KIHÍVÁSOK ]</p>
              {SECRETS.map(s => { const got = rpg.secrets.includes(s.id), ok = s.test(rpg); return (
                <div key={s.id} className="flex justify-between items-center border border-border p-2 mb-1"><span>{got || ok ? s.label : "??? – rejtett kihívás"}</span>
                  {ok && !got && <Button size="sm" onClick={() => reward(s.xp, s.gold, r => ({ secrets: [...r.secrets, s.id] }), "Titkos kihívás!")}>Átvétel</Button>}{got && <span className="text-xs text-accent">✓</span>}</div>); })}
            </div>
          </TabsContent>

          <TabsContent value="char" className="space-y-2 text-sm">
            <p>Szint {level} · Elkölthető pont: <b className="text-accent">{free}</b> (szintenként 3)</p>
            {(Object.keys(POINT_LABELS) as (keyof Points)[]).map(k => (
              <div key={k} className="flex justify-between items-center border-b border-border/40 py-1"><span>{POINT_LABELS[k]}: <b>{rpg.points[k]}</b></span>
                <Button size="sm" variant="outline" disabled={free < 1} onClick={() => addPoint(k)}>+</Button></div>))}
            <p className="text-xs text-muted-foreground">Legyőzött szörnyek: {rpg.kills} · Főellenfelek: {rpg.bossKills} · Dungeonök: {rpg.dungeonsCleared}</p>
          </TabsContent>

          <TabsContent value="gear" className="space-y-2 text-sm">
            {rpg.inventory.length === 0 && <p className="text-muted-foreground">Még nincs zsákmányod. Győzz le szörnyeket!</p>}
            {rpg.inventory.map(it => { const on = rpg.equipped[it.slot] === it.id, c = upgradeCost(it); return (
              <div key={it.id} className={`border p-2 flex flex-wrap items-center justify-between gap-2 ${on ? "border-primary bg-primary/10" : "border-border"}`}>
                <div><span className={RARITIES[it.rarity].cls}>{it.name}{it.plus ? ` +${it.plus}` : ""}</span>
                  <span className="block text-xs text-muted-foreground">{RARITIES[it.rarity].name} · {it.slot === "weapon" ? "Fegyver (ATK)" : it.slot === "armor" ? "Páncél (DEF, HP)" : "Kiegészítő (SPD, KRIT)"} · Erő {itemPower(it)}</span></div>
                <div className="flex gap-1">
                  <Button size="sm" variant={on ? "default" : "outline"} onClick={() => setRpg(r => ({ ...r, equipped: { ...r.equipped, [it.slot]: on ? undefined : it.id } }))}>{on ? "Levesz" : "Felvesz"}</Button>
                  <Button size="sm" variant="secondary" disabled={it.plus >= MAX_PLUS || rpg.gold < c} onClick={() => upgrade(it)}>{it.plus >= MAX_PLUS ? "MAX" : `Fejlesztés ${c}`}</Button>
                  {!on && <Button size="sm" variant="ghost" onClick={() => sell(it)}>Elad {sellValue(it)}</Button>}
                </div>
              </div>); })}
          </TabsContent>

          <TabsContent value="rank" className="space-y-2 text-sm">
            <p className="text-xs text-muted-foreground">A rang független a szinttől: a rangpróba főellenfelének legyőzésével léphetsz feljebb. Új rang = új vadászterületek, dungeonök, erősebb zsákmány és történet.</p>
            <div className="flex gap-1">{RANK_ORDER.map(r => <span key={r} className={`font-display px-2 py-1 border ${r === rpg.rank ? "border-primary text-primary" : rankUnlocked(rpg, r) ? "border-border" : "border-border opacity-40"}`}>{r}</span>)}</div>
            {promo.next && promo.trial ? (
              <div className="border border-accent p-3">
                <p>Következő: <b>{promo.next}-rang</b> — feltétel: {RANKS[promo.next].minLevel}. szint és a rangpróba: {promo.trial.name} (Lv {promo.trial.level})</p>
                <Button className="mt-2" size="sm" disabled={!promo.levelOk} onClick={() => start(rpg.rank, "boss", { kind: "trial" })}>{promo.levelOk ? "Rangpróba indítása" : `Szint ${RANKS[promo.next].minLevel} szükséges`}</Button>
              </div>
            ) : <p className="text-accent">Elérted a legmagasabb, S-rangot.</p>}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Bar({ label, v, max, cls }: { label: string; v: number; max: number; cls: string }) {
  return <div className="border border-border p-2"><div className="flex justify-between"><span>{label}</span><span>{v}/{max}</span></div><div className="h-1.5 bg-muted mt-1"><div className={`h-full ${cls}`} style={{ width: `${(v / max) * 100}%` }} /></div></div>;
}
