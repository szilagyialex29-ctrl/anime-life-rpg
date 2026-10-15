import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Swords, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askStrategy } from "@/lib/strategy.functions";
import type { StrategyInput } from "@/lib/strategy-schema";
import { MENTORS, type ClassId, type MentorId } from "@/lib/game-data";
import { MENTOR_IMAGES } from "@/lib/avatar-assets";
import { combatStats, freePoints, itemPower, type Rpg } from "@/lib/rpg";

type Props = { rpg: Rpg; level: number; cls: ClassId; mentor: MentorId; life: Parameters<typeof combatStats>[2] };

export function buildStrategyInput({ rpg, level, cls, mentor, life }: Props, question: string): StrategyInput {
  const equipped = new Set(Object.values(rpg.equipped));
  return {
    question, mentor, cls, level, rank: rpg.rank, freePoints: Math.max(0, freePoints(level, rpg.points)),
    points: rpg.points, combat: combatStats(level, rpg, life), gold: rpg.gold, potions: rpg.potions,
    equipment: rpg.inventory.slice(0, 40).map(i => ({ slot: i.slot, name: i.name, rarity: i.rarity, plus: i.plus, power: itemPower(i), equipped: equipped.has(i.id) })),
    battles: (rpg.battles ?? []).map(({ enemy, rank, tier, level: l, result, hpLeftPct, turns }) => ({ enemy, rank, tier, level: l, result, hpLeftPct, turns })),
  };
}

export function BattleAdvisor(props: Props) {
  const ask = useServerFn(askStrategy);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [advice, setAdvice] = useState("");
  const [error, setError] = useState("");
  const m = MENTORS[props.mentor];
  const battles = props.rpg.battles ?? [];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setAdvice("");
    try {
      const r = await ask({ data: buildStrategyInput(props, question) });
      if ("error" in r && r.error) setError(r.error);
      else if ("text" in r && r.text) setAdvice(r.text);
    } catch (err) { setError(err instanceof Error ? err.message : "A stratéga most nem elérhető."); }
    finally { setBusy(false); }
  }
  return <section className="system-window p-5">
    <div className="flex gap-3 items-center mb-4">
      <img src={MENTOR_IMAGES[props.mentor]} alt={m.name} width={64} height={64} loading="lazy" className="size-14 object-cover border border-primary" />
      <div><p className="font-display text-xs text-accent">[ HADITANÁCS · MI ]</p><h2 className="font-display text-base mt-1">{m.name} — stat build és harci stratégia</h2></div>
    </div>
    <p className="text-sm text-muted-foreground mb-2">A Rendszer elküldi a karakterlapod, a felszerelésed és az utolsó {battles.length} harcod eredményét.</p>
    {battles.length > 0 && <ul className="text-xs mb-3 space-y-1">{battles.slice(0, 5).map(b =>
      <li key={b.at} className="flex justify-between border-b border-border/40 py-1"><span>{b.enemy} (Lv {b.level})</span><span className={b.result === "win" ? "text-primary" : "text-destructive"}>{b.result === "win" ? `Győzelem · ${b.hpLeftPct}% HP maradt` : `Vereség · ellenfél ${b.hpLeftPct}% HP`}</span></li>)}</ul>}
    <form onSubmit={submit}>
      <label htmlFor="strategy-q" className="block mb-2 text-sm">Kérdés (nem kötelező)</label>
      <textarea id="strategy-q" value={question} onChange={e => setQuestion(e.target.value)} maxLength={1000} disabled={busy} rows={2}
        placeholder="Hogyan győzzem le a Goblin királyt?" className="w-full resize-y bg-input/20 border border-input p-3 outline-none focus:border-primary" />
      <div className="flex justify-end mt-2"><Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Swords />}Elemzés kérése</Button></div>
    </form>
    {busy && <p role="status" className="text-accent mt-4">{m.name} elemzi a harcaidat…</p>}
    {error && <p role="alert" className="text-destructive mt-4">{error}</p>}
    {advice && <div aria-live="polite" className="mt-5 border-t border-border pt-4 whitespace-pre-wrap leading-relaxed">{advice}</div>}
  </section>;
}
