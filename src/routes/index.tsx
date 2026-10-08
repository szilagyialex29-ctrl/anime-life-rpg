import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Equipment } from "@/components/equipment";
import { MentorAdvice } from "@/components/mentor-advice";
import { CLASSES, MENTORS, QUESTS, PENALTY, DARES, type Stat, type ClassId, type MentorId } from "@/lib/game-data";
import { levelOf, rank, resolveEquipment, resolveAura, type EquipmentId, type AuraId } from "@/lib/progression";
import { AVATAR_IMAGES, MENTOR_IMAGES } from "@/lib/avatar-assets";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Glow-Up Rendszer — Szintlépős életmód tracker" },
      { name: "description", content: "Edzés, bőrápolás, tanulás és alvás RPG-stílusban: lépj szintet, fejleszd anime avatárod." },
      { property: "og:title", content: "Glow-Up Rendszer" },
      { property: "og:description", content: "Napi küldetések, XP, és válassz mentort: Jinwoo, Cha Hae-In, Yoo Jin-Ho és többek. Lépj szintet a valóságban." },
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
    if (st.cls && st.day !== today()) {
      const failed = st.done.filter((d) => QUESTS.some((q) => q.id === d)).length < QUESTS.length;
      st = { ...st, day: today(), done: [] };
      if (failed && !st.penaltyUntil) st = { ...st, penaltyUntil: Date.now() + 864e5, dare: pick(DARES) };
    }
    if (st.penaltyUntil && Date.now() > st.penaltyUntil) st = { ...st, penaltyUntil: null, dare: null };
    setS(st); setLoaded(true);
    setMsg(st.penaltyUntil ? "[FIGYELMEZTETÉS] Büntetési zóna aktív." : pick(MENTORS[st.mentor ?? "jinwoo"].idle));
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem("glowup", JSON.stringify(s)); }, [s, loaded]);

  if (!loaded) return null;

  if (!s.cls) {
    return (
      <main className="min-h-screen px-4 py-10 max-w-5xl mx-auto">
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
          <Button variant="ghost" disabled={!nm.trim()} onClick={() => { setS({ ...initial, cls: pick1, mentor: pickM, name: nm.trim() }); setMsg(pick(MENTORS[pickM].idle)); }}
            className="font-display bg-primary text-primary-foreground px-6 py-2 disabled:opacity-40">ÉBREDÉS</Button>
        </div>
      </main>
    );
  }

  const c = CLASSES[s.cls];
  const m = MENTORS[s.mentor ?? "jinwoo"];
  const lv = levelOf(s.xp);
  const inPenalty = !!s.penaltyUntil;
  const list = inPenalty ? PENALTY : QUESTS;
  const equipment = resolveEquipment(s.equipment, lv.level);
  const aura = resolveAura(s.aura, lv.level);

  function complete(q: { id: string; stat: Stat; xp: number }) {
    if (s.done.includes(q.id)) return;
    const gain = Math.round(q.xp * (q.stat === c.bonus ? 1.2 : 1));
    const before = levelOf(s.xp).level;
    const nx = s.xp + gain;
    const after = levelOf(nx).level;
    let next: State = { ...s, xp: nx, done: [...s.done, q.id], stats: { ...s.stats, [q.stat]: s.stats[q.stat] + 1 } };
    if (inPenalty && PENALTY.every((p) => next.done.includes(p.id))) {
      next = { ...next, penaltyUntil: null, dare: null, done: [] };
      setMsg("[RENDSZER] Büntetés teljesítve. Visszatérés a normál küldetésekhez.");
    } else setMsg(after > before ? `[SZINTLÉPÉS: ${after}] ${pick(m.levelup)}` : `+${gain} XP · ${pick(m.done)}`);
    setS(next);
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-6xl mx-auto grid lg:grid-cols-[340px_1fr] gap-6">
      <aside className="space-y-4">
        <div className={`system-window overflow-hidden relative avatar-aura-${aura.id}`}>
          <img src={AVATAR_IMAGES[s.cls][equipment.tier]} alt={c.name} width={768} height={1024} className="w-full aspect-[3/4] object-cover"
            style={{ filter: `drop-shadow(0 0 ${auraLvl}px var(--color-primary)) saturate(${1 + auraLvl / 30})` }} />
          <div className="absolute top-3 right-3 font-display text-4xl glow-text">{rank(lv.level)}</div>
          <div className="p-4">
            <p className="font-display text-xs text-primary">{c.name.toUpperCase()}</p>
            <h1 className="font-display text-2xl">{s.name}</h1>
            <p className="text-muted-foreground">Szint {lv.level}</p><p className="text-xs text-accent mt-1">{equipment.name} · {aura.name}</p>
            <div className="h-2 bg-muted mt-2"><div className="h-full bg-primary" style={{ width: `${(lv.cur / lv.need) * 100}%` }} /></div>
            <p className="text-xs text-muted-foreground mt-1">{lv.cur} / {lv.need} XP</p>
          </div>
        </div>
        <div className="system-window p-4">
          <p className="font-display text-xs text-primary mb-3">[ STATISZTIKÁK ]</p>
          {(Object.keys(s.stats) as Stat[]).map((k) => (
            <div key={k} className="flex justify-between py-1 border-b border-border/40 last:border-0">
              <span className="font-display text-sm">{k}</span><span className="text-accent font-bold">{s.stats[k]}</span>
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

        {inPenalty && (
          <div className="system-window p-5 border-destructive">
            <p className="font-display text-destructive glow-text">[ BÜNTETÉSI ZÓNA ]</p>
            <p className="mt-1">Tegnap kihagytad a napi küldetést. A következő 24 órában csak büntető küldetések érhetők el – nehezebbek, kevesebb XP.</p>
            {s.dare && (
              <p className="mt-3 text-sm text-muted-foreground">
                Önkéntes ciki kihívás (TikTok, 24 órára): <span className="text-foreground">{s.dare}</span>
                <br />Csak vicces, ártalmatlan dolgot posztolj – semmi veszélyes vagy olyat, amit tényleg megbánnál.
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">Lejár: {new Date(s.penaltyUntil ?? 0).toLocaleString("hu-HU")}</p>
          </div>
        )}

        <div className="system-window p-5">
          <p className="font-display text-xs text-primary">[ {inPenalty ? "BÜNTETŐ" : "NAPI"} KÜLDETÉS ]</p>
          <h2 className="font-display text-xl mb-4">{inPenalty ? "Vezeklés" : "Felkészülés az erősödésre"}</h2>
          <ul className="space-y-2">
            {list.map((q) => {
              const d = s.done.includes(q.id);
              return (
                <li key={q.id}>
                  <Button variant="ghost" onClick={() => complete(q)} disabled={d}
                    className={`w-full h-auto whitespace-normal text-left flex items-center justify-between gap-3 p-3 border transition ${d ? "border-primary bg-primary/10 opacity-60" : "border-border hover:border-primary hover:bg-primary/5"}`}>
                    <span className="flex items-center gap-3">
                      <span className={`w-5 h-5 border border-primary grid place-items-center text-xs ${d ? "bg-primary text-primary-foreground" : ""}`}>{d ? "✓" : ""}</span>
                      <span className={d ? "line-through" : ""}>{q.label}</span>
                    </span>
                    <span className="font-display text-xs text-accent">{q.stat} · +{q.xp}XP</span>
                  </Button>
                </li>
              );
            })}
          </ul>
          {!inPenalty && (
            <p className="text-xs text-muted-foreground mt-4">Figyelem: ha éjfélig nem teljesíted mindet, a Rendszer büntetési zónába helyez.</p>
          )}
        </div>
        <MentorAdvice key={s.mentor ?? "jinwoo"} player={{ mentor: s.mentor ?? "jinwoo", cls: s.cls, name: s.name.slice(0,100), xp: s.xp, stats: s.stats, done: s.done, inPenalty }} />
      </section>
    </main>
  );
}
