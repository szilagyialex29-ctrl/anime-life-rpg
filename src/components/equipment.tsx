import { Lock, Check, Shield, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AVATAR_IMAGES } from "@/lib/avatar-assets";
import { EQUIPMENT, AURAS, unlocked, type EquipmentId, type AuraId } from "@/lib/progression";
import type { ClassId } from "@/lib/game-data";

type Props = { cls: ClassId; level: number; equipment: EquipmentId; aura: AuraId; onEquip: (id: EquipmentId) => void; onAura: (id: AuraId) => void };
export function Equipment({ cls, level, equipment, aura, onEquip, onAura }: Props) {
  const next = [...EQUIPMENT, ...AURAS].filter(item => item.level > level).sort((a,b) => a.level - b.level)[0];
  return <section className="system-window p-4">
    <h2 className="font-display text-sm text-primary flex items-center gap-2"><Shield className="size-4" /> FELSZERELÉS</h2>
    <div className="grid grid-cols-3 gap-2 mt-3">
      {EQUIPMENT.map(item => {
        const open = unlocked(level, item);
        return <Button key={item.id} variant="ghost" disabled={!open} aria-pressed={equipment === item.id} onClick={() => onEquip(item.id)} className={`h-auto p-0 flex flex-col gap-0 overflow-hidden border whitespace-normal ${equipment === item.id ? "border-primary bg-primary/10" : "border-border"}`}>
          <img src={AVATAR_IMAGES[cls][item.tier]} alt={item.name} width={512} height={512} loading="lazy" className={`w-full aspect-square object-cover ${!open ? "grayscale opacity-40" : ""}`} />
          <span className="p-2 text-xs leading-tight w-full min-h-16">{item.name}<span className="flex items-center justify-center gap-1 text-accent mt-1">{open ? equipment === item.id ? <Check className="size-3" /> : <Shield className="size-3" /> : <Lock className="size-3" />}{item.level}. szint</span></span>
        </Button>;
      })}
    </div>
    <h3 className="font-display text-sm text-primary flex items-center gap-2 mt-5"><Flame className="size-4" /> AURÁK</h3>
    <div className="grid grid-cols-2 gap-2 mt-3">
      {AURAS.map(item => <Button key={item.id} variant="ghost" disabled={!unlocked(level, item)} aria-pressed={aura === item.id} onClick={() => onAura(item.id)} className={`h-auto min-h-16 whitespace-normal justify-start p-2 border ${aura === item.id ? "border-primary bg-primary/10" : "border-border"}`}>
        <span className={`aura-swatch aura-swatch-${item.id} shrink-0`} />
        <span className="text-left text-xs">{item.name}<span className="block text-muted-foreground">{!unlocked(level,item) ? "🔒 " : ""}{item.level}. szint</span></span>
      </Button>)}
    </div>
    {next && <p className="text-xs text-muted-foreground mt-3">Következő feloldás: {next.name} · {next.level}. szint</p>}
  </section>;
}