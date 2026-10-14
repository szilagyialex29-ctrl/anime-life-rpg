import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

const ThroneRoom = lazy(() => import("@/components/dungeon/throne-room"));

export const Route = createFileRoute("/throne-room")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Igris gótikus trónterme — Glow-Up RPG" },
    { name: "description", content: "Bejárható gótikus kőcsarnok, boltívek, trón és Igris a Glow-Up böngészős RPG-ben." },
    { property: "og:title", content: "Igris gótikus trónterme — Glow-Up RPG" },
    { property: "og:description", content: "Fedezd fel a gótikus tróntermet és próbáld ki Igris támadó mozdulatait." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-background text-primary">Trónterem betöltése…</div>}><ThroneRoom /></Suspense>,
});