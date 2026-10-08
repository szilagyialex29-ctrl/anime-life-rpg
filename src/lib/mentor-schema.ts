import { z } from "zod";

export const mentorInput = z.object({
  challenge: z.string().trim().min(3).max(2000),
  mentor: z.enum(["jinwoo", "chahaein", "jinho", "gunhee", "yoonho", "jinchul"]),
  cls: z.enum(["warrior", "mage", "wanderer"]),
  name: z.string().max(100),
  xp: z.number().int().min(0).max(10000000),
  stats: z.object({ STR: z.number().min(1), CHA: z.number().min(1), INT: z.number().min(1), HP: z.number().min(1), MANA: z.number().min(1) }),
  done: z.array(z.string().max(30)).max(20),
  inPenalty: z.boolean(),
});
export type MentorInput = z.infer<typeof mentorInput>;