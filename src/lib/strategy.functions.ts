import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { strategyInput } from "./strategy-schema";

export const askStrategy = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => strategyInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { error: "Az MI-stratéga kapcsolata nincs beállítva.", status: 401 };
    const { strategyAdvice } = await import("./strategy.server");
    const reply = await strategyAdvice(getRequest(), apiKey, data);
    if (reply.runId) setResponseHeader("X-Lovable-AIG-Run-ID", reply.runId);
    return reply;
  });
