import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { mentorInput } from "./mentor-schema";

export const askMentor = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => mentorInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { error: "Az MI-mentor kapcsolata nincs beállítva.", status: 401 };
    const { mentorAdvice } = await import("./mentor.server");
    const reply = await mentorAdvice(getRequest(), apiKey, data);
    if (reply.runId) setResponseHeader("X-Lovable-AIG-Run-ID", reply.runId);
    return reply;
  });