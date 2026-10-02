import { z } from "zod";
import { SkillSortBy, SkillScopeFilter } from "../models/skill";

export const SkillListParamsSchema = z
  .object({
    page: z.number().default(0),
    per_page: z.number().default(20),
    filters: z.record(z.string(), z.unknown()).optional(),
    sort_by: z.nativeEnum(SkillSortBy).optional(),
    scope: z.nativeEnum(SkillScopeFilter).optional(),
    assistant_id: z.string().optional(),
  })
  .readonly();

export type SkillListParams = Partial<z.infer<typeof SkillListParamsSchema>>;