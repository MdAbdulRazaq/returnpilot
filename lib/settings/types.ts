import { z } from "zod";

export const settingsUpdateSchema = z.object({
  notification_email: z.string().trim().email(),
  alerts_enabled: z.boolean(),
});

export type SettingsInput = z.infer<typeof settingsUpdateSchema>;

export interface SettingsOutput {
  notification_email: string | null;
  alerts_enabled: boolean;
}