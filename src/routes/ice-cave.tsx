import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

const RealmLevel = lazy(() => import("@/components/dungeon/realm-level"));

export const Route = createFileRoute("/ice-cave")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Fagyos Jégbarlang (A-rang) — Glow-Up RPG" },
    { name: "description", content: "Jégcsapos, kristályos A-rangú 3D kapu jégtrollokkal, fagyelfekkel és Barukával." },
    { property: "og:title", content: "Fagyos Jégbarlang (A-rang) — Glow-Up RPG" },
    { property: "og:description", content: "Harcolj végig a fagyos barlangon és győzd le Barukát." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-background text-primary">Jégbarlang betöltése…</div>}><RealmLevel id="ice-cave" /></Suspense>,
});
