import { z } from "zod";

export const TIME_PERIOD_VALUES = [
  "last_hour",
  "last_6_hours",
  "last_24_hours",
  "last_7_days",
  "last_30_days",
  "last_60_days",
  "last_year",
] as const;

export type TimePeriod = (typeof TIME_PERIOD_VALUES)[number];

const timePeriodSchema = z.enum(TIME_PERIOD_VALUES);

const analyticsQueryParamsBase = z.object({
  time_period: timePeriodSchema.optional(),
  start_date: z.string().datetime({ offset: true }).optional(),
  end_date: z.string().datetime({ offset: true }).optional(),
  users: z.string().optional(),
  projects: z.string().optional(),
});

export const AnalyticsQueryParamsSchema = analyticsQueryParamsBase.readonly();

export type AnalyticsQueryParams = Partial<
  z.infer<typeof AnalyticsQueryParamsSchema>
>;

export const PaginatedAnalyticsQueryParamsSchema = analyticsQueryParamsBase
  .extend({
    page: z.number().int().min(0).default(0),
    per_page: z.number().int().min(1).default(20),
  })
  .readonly();

export type PaginatedAnalyticsQueryParams = Partial<
  z.infer<typeof PaginatedAnalyticsQueryParamsSchema>
>;
