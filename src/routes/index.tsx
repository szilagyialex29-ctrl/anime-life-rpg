import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HunterPanel } from "@/components/hunter-panel";
import { newRpg, combatStats, type Rpg } from "@/lib/rpg";
import { Button } from "@/components/ui/button";
import { Equipment } from "@/components/equipment";
import { BattleAdvisor } from "@/components/battle-advisor";
import { DungeonGates } from "@/components/dungeon-gate";
import { CLASSES, MENTORS, type Stat, type ClassId, type MentorId } from "@/lib/game-data";
import { levelOf, resolveEquipment, resolveAura, type EquipmentId, type AuraId } from "@/lib/progression";
import { AVATAR_IMAGES, MENTOR_IMAGES } from "@/lib/avatar-assets";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Árnyékvadász — Fantasy RPG Solo Leveling stílusban" },
      { name: "description", content: "Vadássz szörnyekre, tisztíts dungeonöket, lépj rangot és kérj MI haditanácsot a mentorodtól." },
      { property: "og:title", content: "Árnyékvadász RPG" },
      { property: "og:description", content: "Fantasy RPG: szörnyek, zsákmány, rangvizsgák és MI stat build tanácsadó Solo Leveling mentorokkal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const pick = (a: string[]): string => a[Math.floor(Math.random() * a.length)] ?? "";
const today = () => new Date().toISOString().slice(0, 10);

type State = {
  equipment: EquipmentId;
  aura: AuraId;
  cls: ClassId | null;
  mentor: MentorId | null;
  name: string;
  xp: number;
  stats: Record<Stat, number>;
  day: string;
  done: string[];
  penaltyUntil: number | null;
  dare: string | null;
  rpg?: Rpg;
};
const initial: State = {
  equipment: "starter", aura: "none", cls: null, mentor: null, name: "", xp: 0, day: today(), done: [], penaltyUntil: null, dare: null,
  stats: { STR: 1, CHA: 1, INT: 1, HP: 1, MANA: 1 },
};
function Index() {
  const [s, setS] = useState<State>(initial);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [pick1, setPick1] = useState<ClassId>("warrior");
  const [pickM, setPickM] = useState<MentorId>("jinwoo");
  const [showM, setShowM] = useState(false);
  const [nm, setNm] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("glowup");
    let st: State = { ...initial };
    try { if (raw) st = { ...initial, ...JSON.parse(raw) }; } catch { localStorage.removeItem("glowup"); }
    if (st.cls && !st.mentor) st = { ...st, mentor: "jinwoo" as MentorId };
    st = { ...st, day: today(), penaltyUntil: null, dare: null };
    const rpg = { ...newRpg(today()), ...st.rpg };
    st = { ...st, rpg: rpg.day === today() ? rpg : { ...rpg, day: today(), dailyKills: 0, dailyElite: 0, claimedDaily: [] } };
    setS(st); setLoaded(true);
    setMsg(pick(MENTORS[st.mentor ?? "jinwoo"].idle));
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem("glowup", JSON.stringify(s)); }, [s, loaded]);

  const curLevel = levelOf(s.xp).level;
  const prevLevel = useRef<number | null>(null);
  const [burst, setBurst] = useState<number | null>(null);
  useEffect(() => {
    if (!loaded) return undefined;
    if (prevLevel.current !== null && curLevel > prevLevel.current) {
      setBurst(curLevel); toast.success(`[SZINTLÉPÉS] Szint ${curLevel}! +3 képességpont, több HP és ATK.`);
      const t = setTimeout(() => setBurst(null), 2200); prevLevel.current = curLevel; return () => clearTimeout(t);
    }
    prevLevel.current = curLevel;
    return undefined;
  }, [curLevel, loaded]);

  if (!loaded) return null;

  if (!s.cls) {
    return (
      <main className="min-h-screen px-4 py-10 max-w-5xl mx-auto">
        <div className="flex justify-end mb-4"><Button asChild variant="secondary"><Link to="/throne-room">Gótikus trónterem →</Link></Button></div>
        <div className="system-window p-6 text-center mb-8">
          <p className="font-display text-xs text-primary">[ RENDSZER ]</p>
          <h1 className="font-display text-3xl md:text-4xl glow-text mt-2">Játékosnak választottak.</h1>
          <p className="text-muted-foreground mt-2">Válassz osztályt. Nincs visszaút. (Na jó, van, de ne mondd senkinek.)</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {(Object.keys(CLASSES) as ClassId[]).map((id) => (
            <Button variant="ghost" key={id} onClick={() => setPick1(id)}
              className={`system-window h-auto p-0 block whitespace-normal overflow-hidden text-left transition ${pick1 === id ? "ring-2 ring-primary scale-[1.02]" : "opacity-70 hover:opacity-100"}`}>
              <img src={CLASSES[id].img} alt={CLASSES[id].name} width={768} height={1024} className="w-full aspect-[3/4] object-cover" />
              <div className="p-4">
                <h2 className="font-display text-xl">{CLASSES[id].name}</h2>
                <p className="text-accent text-sm">{CLASSES[id].desc}</p>
              </div>
            </Button>
          ))}
        </div>
        <div className="system-window p-4 mt-6">
          <p className="font-display text-xs text-primary mb-1">[ MENTOR ]</p>
          <p className="text-sm text-muted-foreground mb-3">Nem mindenki lehet Jinwoo. Válassz, ki szóljon rád.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {(Object.keys(MENTORS) as MentorId[]).map((id) => (
              <Button variant="ghost" key={id} onClick={() => setPickM(id)}
                className={`h-auto whitespace-normal justify-start p-3 border text-left gap-3 ${pickM === id ? "border-primary bg-primary/10" : "border-border hover:border-primary opacity-80 hover:opacity-100"}`}>
                <span className="font-display">{MENTORS[id].name}</span>
                <span className="block text-xs text-muted-foreground">{MENTORS[id].title}</span>
              </Button>
            ))}
          </div>
        </div>
        <div className="system-window p-4 mt-6 flex flex-col md:flex-row gap-3">
          <input value={nm} onChange={(e) => setNm(e.target.value)} placeholder="Játékosnév"
            className="flex-1 bg-input/20 border border-input px-3 py-2 outline-none focus:border-primary" />
          <Button variant="ghost" disabled={!nm.trim()} onClick={() => { setS({ ...initial, rpg: newRpg(today()), cls: pick1, mentor: pickM, name: nm.trim() }); setMsg(pick(MENTORS[pickM].idle)); }}
            className="font-display bg-primary text-primary-foreground px-6 py-2 disabled:opacity-40">ÉBREDÉS</Button>
        </div>
      </main>
    );
  }

  const c = CLASSES[s.cls];
  const m = MENTORS[s.mentor ?? "jinwoo"];
  const lv = levelOf(s.xp);
  const equipment = resolveEquipment(s.equipment, lv.level);
  const aura = resolveAura(s.aura, lv.level);
  const rpg = s.rpg ?? newRpg(s.day);
  const cs = combatStats(lv.level, rpg, s.stats);
  const setRpg = (f: (r: Rpg) => Rpg) => setS(p => ({ ...p, rpg: f(p.rpg ?? newRpg(p.day)) }));

  return (
    <main className="min-h-screen px-4 py-8 max-w-6xl mx-auto grid lg:grid-cols-[340px_1fr] gap-6">
      {burst && <div className="fixed inset-0 z-50 grid place-items-center pointer-events-none"><div className="system-window px-10 py-6 text-center animate-in zoom-in fade-in duration-500"><p className="font-display text-xs text-primary">[ RENDSZER ]</p><p className="font-display text-4xl glow-text">SZINTLÉPÉS</p><p className="text-accent font-display text-2xl">Lv {burst}</p></div></div>}
      <aside className="space-y-4">
        <div className={`system-window overflow-hidden relative avatar-aura-${aura.id}`}>
          <img src={AVATAR_IMAGES[s.cls][equipment.tier]} alt={c.name} width={512} height={512} className="w-full aspect-square object-cover" />
          <div className="absolute top-3 right-3 font-display text-4xl glow-text">{rpg.rank}</div>
          <div className="p-4">
            <p className="font-display text-xs text-primary">{c.name.toUpperCase()}</p>
            <h1 className="font-display text-2xl">{s.name}</h1>
            <p className="text-muted-foreground">Szint {lv.level}</p><p className="text-xs text-accent mt-1">{equipment.name} · {aura.name}</p>
            <div className="h-2 bg-muted mt-2"><div className="h-full bg-primary" style={{ width: `${(lv.cur / lv.need) * 100}%` }} /></div>
            <p className="text-xs text-muted-foreground mt-1">{lv.cur} / {lv.need} XP</p>
          </div>
        </div>
        <div className="system-window p-4">
          <p className="font-display text-xs text-primary mb-3">[ HARCI STATISZTIKÁK ]</p>
          {Object.entries({ HP: cs.maxHp, ATK: cs.atk, DEF: cs.def, SPD: cs.spd, "KRIT %": Math.round(cs.crit), MANA: cs.maxMana }).map(([k, v]) => (
            <div key={k} className="flex justify-between py-1 border-b border-border/40 last:border-0">
              <span className="font-display text-sm">{k}</span><span className="text-accent font-bold">{v}</span>
            </div>
          ))}
        </div>
        <Equipment cls={s.cls} level={lv.level} equipment={equipment.id} aura={aura.id} onEquip={id => setS({ ...s, equipment: id })} onAura={id => setS({ ...s, aura: id })} />
        <Button variant="ghost" onClick={() => { if (confirm("Biztos újrakezded?")) { localStorage.removeItem("glowup"); setS(initial); } }}
          className="text-xs text-muted-foreground underline">Új karakter</Button>
      </aside>

      <section className="space-y-4">
        <div className="system-window p-4 border-l-4 border-l-accent">
          <div className="flex items-center justify-between">
            <p className="font-display text-xs text-accent">MENTOR · {m.name.toUpperCase()}</p>
            <Button variant="ghost" onClick={() => setShowM(!showM)} className="text-xs text-muted-foreground underline">cserél</Button>
          </div>
          <div className="flex items-center gap-3 mt-3"><img src={MENTOR_IMAGES[s.mentor ?? "jinwoo"]} alt={m.name} width={80} height={80} className="size-16 object-cover shrink-0 border border-accent" /><p className="text-lg">„{msg}"</p></div>
          {showM && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
              {(Object.keys(MENTORS) as MentorId[]).map((id) => (
                <Button variant="ghost" key={id} onClick={() => { setS({ ...s, mentor: id }); setShowM(false); setMsg(pick(MENTORS[id].idle)); }}
                  className={`h-auto whitespace-normal justify-start p-2 border text-left text-sm gap-2 ${s.mentor === id ? "border-primary bg-primary/10" : "border-border hover:border-primary"}`}>
                  <span className="font-display">{MENTORS[id].name}</span>
                  <span className="block text-xs text-muted-foreground">{MENTORS[id].title}</span>
                </Button>
              ))}
            </div>
          )}
        </div>

        <HunterPanel rpg={rpg} setRpg={setRpg} level={lv.level} life={s.stats} onXp={x => setS(p => ({ ...p, xp: p.xp + x }))} />
        <DungeonGates level={lv.level} stats={s.stats} day={s.day} doneToday={rpg.dailyKills} onXp={x => setS(p => ({ ...p, xp: p.xp + x }))} />
        <Button asChild variant="secondary" className="w-full"><Link to="/throne-room">Gótikus trónterem · Igris →</Link></Button>
        <BattleAdvisor rpg={rpg} level={lv.level} cls={s.cls} mentor={s.mentor ?? "jinwoo"} life={s.stats} />
      </section>
    </main>
  );
}
