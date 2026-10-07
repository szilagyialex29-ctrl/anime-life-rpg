import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import warrior from "@/assets/warrior.jpg";
import mage from "@/assets/mage.jpg";
import wanderer from "@/assets/wanderer.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Glow-Up Rendszer — Szintlépős életmód tracker" },
      { name: "description", content: "Edzés, bőrápolás, tanulás és alvás RPG-stílusban: lépj szintet, fejleszd anime avatárod." },
      { property: "og:title", content: "Glow-Up Rendszer" },
      { property: "og:description", content: "Napi küldetések, XP, szarkasztikus Sensei. Lépj szintet a valóságban." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Stat = "STR" | "CHA" | "INT" | "HP" | "MANA";
type ClassId = "warrior" | "mage" | "wanderer";
const CLASSES: Record<ClassId, { name: string; img: string; bonus: Stat; desc: string }> = {
  warrior: { name: "Harcos", img: warrior, bonus: "STR", desc: "+20% XP edzésre" },
  mage: { name: "Mágus", img: mage, bonus: "INT", desc: "+20% XP tanulásra" },
  wanderer: { name: "Vándor", img: wanderer, bonus: "CHA", desc: "+20% XP stílusra" },
};
const QUESTS: { id: string; label: string; stat: Stat; xp: number }[] = [
  { id: "pushups", label: "50 fekvőtámasz", stat: "STR", xp: 30 },
  { id: "run", label: "20 perc futás / séta", stat: "STR", xp: 30 },
  { id: "skin", label: "Esti bőrápolási rutin", stat: "CHA", xp: 20 },
  { id: "outfit", label: "Átgondolt outfit ma", stat: "CHA", xp: 15 },
  { id: "study", label: "45 perc fókuszált tanulás", stat: "INT", xp: 30 },
  { id: "sleep", label: "7+ óra alvás", stat: "HP", xp: 25 },
  { id: "water", label: "2 liter víz", stat: "MANA", xp: 20 },
];
const PENALTY = [
  { id: "p1", label: "150 fekvőtámasz + 100 guggolás", stat: "STR" as Stat, xp: 10 },
  { id: "p2", label: "10 km gyaloglás", stat: "HP" as Stat, xp: 10 },
  { id: "p3", label: "2 óra tanulás telefon nélkül", stat: "INT" as Stat, xp: 10 },
];
const DARES = [
  "Táncold el a legcikibb trendet a nappaliban, és posztold.",
  "Énekelj el egy Disney-dalt teljes átéléssel, kamerába.",
  "Mondd el drámai anime-monológban, miért hagytad ki a küldetést.",
  "Csinálj 'reggeli rutin' videót mint egy túlbuzgó influenszer.",
];
const SENSEI = {
  done: ["Hm. Nem vagy teljesen reménytelen.", "Egy pipa. Ne kérj tapsot.", "Lassan, de még ez is haladás."],
  idle: ["Még mindig a kanapén? A dokkolt avatárod sír.", "A tegnapi éned is ennyit mondott.", "Edzés vagy kifogás. Választhatsz."],
  levelup: ["SZINTLÉPÉS. Na ne bízd el magad.", "Új szint. A hétköznapi emberek most kezdenek irigyelni."],
};
const pick = (a: string[]): string => a[Math.floor(Math.random() * a.length)] ?? "";
const today = () => new Date().toISOString().slice(0, 10);

type State = {
  cls: ClassId | null;
  name: string;
  xp: number;
  stats: Record<Stat, number>;
  day: string;
  done: string[];
  penaltyUntil: number | null;
  dare: string | null;
};
const initial: State = {
  cls: null, name: "", xp: 0, day: today(), done: [], penaltyUntil: null, dare: null,
  stats: { STR: 1, CHA: 1, INT: 1, HP: 1, MANA: 1 },
};
const xpFor = (lvl: number) => 100 + lvl * 50;
function levelOf(xp: number) {
  let l = 1, r = xp;
  while (r >= xpFor(l)) { r -= xpFor(l); l++; }
  return { level: l, cur: r, need: xpFor(l) };
}
const rank = (l: number) => (l >= 30 ? "S" : l >= 20 ? "A" : l >= 12 ? "B" : l >= 7 ? "C" : l >= 3 ? "D" : "E");

function Index() {
  const [s, setS] = useState<State>(initial);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [pick1, setPick1] = useState<ClassId>("warrior");
  const [nm, setNm] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("glowup");
    let st: State = raw ? { ...initial, ...JSON.parse(raw) } : initial;
    if (st.cls && st.day !== today()) {
      const failed = st.done.filter((d) => QUESTS.some((q) => q.id === d)).length < QUESTS.length;
      st = { ...st, day: today(), done: [] };
      if (failed && !st.penaltyUntil) st = { ...st, penaltyUntil: Date.now() + 864e5, dare: pick(DARES) };
    }
    if (st.penaltyUntil && Date.now() > st.penaltyUntil) st = { ...st, penaltyUntil: null, dare: null };
    setS(st); setLoaded(true);
    setMsg(st.penaltyUntil ? "[FIGYELMEZTETÉS] Büntetési zóna aktív." : pick(SENSEI.idle));
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
            <button key={id} onClick={() => setPick1(id)}
              className={`system-window overflow-hidden text-left transition ${pick1 === id ? "ring-2 ring-primary scale-[1.02]" : "opacity-70 hover:opacity-100"}`}>
              <img src={CLASSES[id].img} alt={CLASSES[id].name} width={768} height={1024} className="w-full aspect-[3/4] object-cover" />
              <div className="p-4">
                <h2 className="font-display text-xl">{CLASSES[id].name}</h2>
                <p className="text-accent text-sm">{CLASSES[id].desc}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="system-window p-4 mt-6 flex flex-col md:flex-row gap-3">
          <input value={nm} onChange={(e) => setNm(e.target.value)} placeholder="Játékosnév"
            className="flex-1 bg-input/20 border border-input px-3 py-2 outline-none focus:border-primary" />
          <button disabled={!nm.trim()} onClick={() => setS({ ...initial, cls: pick1, name: nm.trim() })}
            className="font-display bg-primary text-primary-foreground px-6 py-2 disabled:opacity-40">ÉBREDÉS</button>
        </div>
      </main>
    );
  }

  const c = CLASSES[s.cls];
  const lv = levelOf(s.xp);
  const inPenalty = !!s.penaltyUntil;
  const list = inPenalty ? PENALTY : QUESTS;
  const auraLvl = Math.min(lv.level, 30);

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
    } else setMsg(after > before ? `[SZINTLÉPÉS: ${after}] ${pick(SENSEI.levelup)}` : `+${gain} XP · ${pick(SENSEI.done)}`);
    setS(next);
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-6xl mx-auto grid lg:grid-cols-[340px_1fr] gap-6">
      <aside className="space-y-4">
        <div className="system-window overflow-hidden relative">
          <img src={c.img} alt={c.name} width={768} height={1024} className="w-full aspect-[3/4] object-cover"
            style={{ filter: `drop-shadow(0 0 ${auraLvl}px var(--color-primary)) saturate(${1 + auraLvl / 30})` }} />
          <div className="absolute top-3 right-3 font-display text-4xl glow-text">{rank(lv.level)}</div>
          <div className="p-4">
            <p className="font-display text-xs text-primary">{c.name.toUpperCase()}</p>
            <h1 className="font-display text-2xl">{s.name}</h1>
            <p className="text-muted-foreground">Szint {lv.level}</p>
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
        <button onClick={() => { if (confirm("Biztos újrakezded?")) { localStorage.removeItem("glowup"); setS(initial); } }}
          className="text-xs text-muted-foreground underline">Új karakter</button>
      </aside>

      <section className="space-y-4">
        <div className="system-window p-4 border-l-4 border-l-accent">
          <p className="font-display text-xs text-accent">SENSEI</p>
          <p className="text-lg">„{msg}”</p>
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
            <p className="text-xs text-muted-foreground mt-2">Lejár: {new Date(s.penaltyUntil!).toLocaleString("hu-HU")}</p>
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
                  <button onClick={() => complete(q)} disabled={d}
                    className={`w-full flex items-center justify-between gap-3 p-3 border transition ${d ? "border-primary bg-primary/10 opacity-60" : "border-border hover:border-primary hover:bg-primary/5"}`}>
                    <span className="flex items-center gap-3">
                      <span className={`w-5 h-5 border border-primary grid place-items-center text-xs ${d ? "bg-primary text-primary-foreground" : ""}`}>{d ? "✓" : ""}</span>
                      <span className={d ? "line-through" : ""}>{q.label}</span>
                    </span>
                    <span className="font-display text-xs text-accent">{q.stat} · +{q.xp}XP</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {!inPenalty && (
            <p className="text-xs text-muted-foreground mt-4">Figyelem: ha éjfélig nem teljesíted mindet, a Rendszer büntetési zónába helyez.</p>
          )}
        </div>
      </section>
    </main>
  );
}
