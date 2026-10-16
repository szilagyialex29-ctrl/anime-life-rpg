import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

const RealmLevel = lazy(() => import("@/components/dungeon/realm-level"));

export const Route = createFileRoute("/demon-castle")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Démonvár (B/S-rang) — Glow-Up RPG" },
    { name: "description", content: "Bazaltoszlopos alvilági csarnok lávaárkokkal, lebegő rúnákkal és démon kardforgatókkal." },
    { property: "og:title", content: "Démonvár (B/S-rang) — Glow-Up RPG" },
    { property: "og:description", content: "Kerüld a lávát és győzd le a démonkirályt." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-background text-primary">Démonvár betöltése…</div>}><RealmLevel id="demon-castle" /></Suspense>,
});
