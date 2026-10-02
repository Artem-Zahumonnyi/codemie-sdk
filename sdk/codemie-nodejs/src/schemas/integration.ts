import { z } from "zod";
import { CredentialTypes, IntegrationType, type IntegrationTypeType } from "../models/integration";

export const IntegrationListParamsSchema = z
  .object({
    setting_type: z
      .enum([IntegrationType.USER, IntegrationType.PROJECT])
      .default(IntegrationType.USER),
    page: z.number().default(0),
    per_page: z.number().default(10),
    filters: z.record(z.string(), z.unknown()).optional(),
  })
  .readonly();
export type IntegrationListParams = Partial<z.infer<typeof IntegrationListParamsSchema>>;

export const IntegrationGetParamsSchema = z
  .object({
    integration_id: z.string(),
    setting_type: z
      .enum([IntegrationType.USER, IntegrationType.PROJECT])
      .default(IntegrationType.USER),
  })
  .readonly();
export type IntegrationGetParams = z.infer<typeof IntegrationGetParamsSchema>;

export const IntegrationGetByAliasParamsSchema = z
  .object({
    alias: z.string(),
    setting_type: z
      .enum([IntegrationType.USER, IntegrationType.PROJECT])
      .default(IntegrationType.USER),
  })
  .readonly();
export type IntegrationGetByAliasParams = Omit<
  z.infer<typeof IntegrationGetByAliasParamsSchema>,
  "setting_type"
> & {
  setting_type?: IntegrationTypeType;
};

const CredentialValueSchema = z.object({
  key: z.string(),
  value: z.unknown(),
});

export const IntegrationCreateParamsSchema = z
  .object({
    credential_type: z.enum(Object.values(CredentialTypes) as [string, ...string[]]),
    credential_values: z.array(CredentialValueSchema),
    project_name: z.string(),
    setting_type: z
      .enum([IntegrationType.USER, IntegrationType.PROJECT])
      .default(IntegrationType.USER),
    alias: z.string().optional(),
    default: z.boolean().optional().default(false),
    project: z.string().optional(),
    enabled: z.boolean().optional().default(true),
    external_id: z.string().optional(),
  })
  .readonly();
export type IntegrationCreateParams = Omit<
  z.infer<typeof IntegrationCreateParamsSchema>,
  "default" | "enabled"
> & {
  default?: boolean;
  enabled?: boolean;
};

export const IntegrationUpdateParamsSchema = IntegrationCreateParamsSchema;
export type IntegrationUpdateParams = Omit<
  z.infer<typeof IntegrationUpdateParamsSchema>,
  "default" | "enabled"
> & {
  default?: boolean;
  enabled?: boolean;
};
