import { z } from 'zod';

export const AiEvalSchema = z.object({
  score: z.number().int().min(0).max(10),
  feedback: z.string(),
  highlights: z.array(z.string()).default([]),
});
