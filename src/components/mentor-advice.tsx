import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askMentor } from "@/lib/mentor.functions";
import type { MentorInput } from "@/lib/mentor-schema";
import { MENTORS } from "@/lib/game-data";
import { MENTOR_IMAGES } from "@/lib/avatar-assets";

export function MentorAdvice({ player }: { player: Omit<MentorInput, "challenge"> }) {
  const ask = useServerFn(askMentor);
  const [challenge, setChallenge] = useState("");
  const [busy, setBusy] = useState(false);
  const [advice, setAdvice] = useState("");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || challenge.trim().length < 3) return;
    setBusy(true); setError(""); setAdvice("");
    try {
      const result = await ask({ data: { ...player, challenge } });
      if ("error" in result && result.error) setError(result.error);
      else if ("text" in result && result.text) setAdvice(result.text);
    } catch (err) { setError(err instanceof Error ? err.message : "A mentor most nem elérhető."); }
    finally { setBusy(false); }
  }
  return <section className="system-window p-5">
    <div className="flex gap-3 items-center mb-4">
      <img src={MENTOR_IMAGES[player.mentor]} alt={MENTORS[player.mentor].name} width={64} height={64} loading="lazy" className="size-14 object-cover border border-primary" />
      <div><p className="font-display text-xs text-accent">[ MI TANÁCS ]</p><h2 className="font-display text-base mt-1">{MENTORS[player.mentor].name}</h2></div>
    </div>
    <form onSubmit={submit}>
      <label htmlFor="challenge" className="block mb-2">Mi a mai kihívásod?</label>
      <textarea id="challenge" value={challenge} onChange={e => setChallenge(e.target.value)} maxLength={2000} disabled={busy} placeholder="Nehezen veszem rá magam az edzésre…" rows={3} className="w-full resize-y bg-input/20 border border-input p-3 outline-none focus:border-primary" />
      <div className="flex items-center justify-between gap-2 mt-2"><span className="text-xs text-muted-foreground">{challenge.length} / 2000</span><Button type="submit" disabled={busy || challenge.trim().length < 3}>{busy ? <LoaderCircle className="animate-spin" /> : <Send />}Tanácsot kérek</Button></div>
    </form>
    {busy && <p role="status" className="text-accent mt-4">{MENTORS[player.mentor].name} átnézi a jelentésed…</p>}
    {error && <p role="alert" className="text-destructive mt-4">{error}</p>}
    {advice && <div aria-live="polite" className="mt-5 border-t border-border pt-4 whitespace-pre-wrap leading-relaxed">{advice}</div>}
  </section>;
}