import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
const Check = lazy(() => import("@/components/dungeon/motion-check"));
export const Route = createFileRoute("/motion-check")({ ssr: false, component: () => <Suspense fallback={null}><Check /></Suspense> });