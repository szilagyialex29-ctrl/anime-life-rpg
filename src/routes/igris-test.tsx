import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
const View = lazy(() => import("@/components/dungeon/igris-preview"));
export const Route = createFileRoute("/igris-test")({ ssr: false, component: () => <Suspense fallback={null}><View /></Suspense> });
