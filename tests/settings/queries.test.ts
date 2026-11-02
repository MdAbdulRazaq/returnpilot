import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSettings, updateSettings } from "@/lib/settings/queries";
import { ExplanationConfigurationQueries } from "@/lib/api/settings/queries";
import type { SettingsOutput } from "@/lib/settings/types";
import type { ExplanationConfiguration } from "@/lib/api/settings/types";

// Mock the Supabase admin client
vi.mock("@/lib/supabase/admin", () => {
  return {
    getAdminClient: vi.fn(),
  };
});

import { getAdminClient } from "@/lib/supabase/admin";

describe("settings/queries", () => {
  const mockShopId = "test-shop-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSettings", () => {
    it("returns settings when row exists", async () => {
      const mockData: SettingsOutput = {
        notification_email: "test@example.com",
        alerts_enabled: true,
      };

      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => {
                return Promise.resolve({ data: mockData, error: null });
              }
            }),
          }),
        }),
      };

      (getAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase as any);

      const result = await getSettings(mockShopId);
      expect(result).toEqual(mockData);
    });

    it("throws error when no settings row exists", async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => {
                return Promise.resolve({ data: null, error: { code: "PGRST116" } });
              }
            }),
          }),
        }),
      };

      (getAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase as any);

      await expect(getSettings(mockShopId)).rejects.toThrow(
        `Settings not found for shop ${mockShopId}`
      );
    });

    it("propagates database errors", async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => {
                return Promise.resolve({ data: null, error: { message: "DB error" } });
              }
            }),
          }),
        }),
      };

      (getAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase as any);

      await expect(getSettings(mockShopId)).rejects.toThrow("DB error");
    });
  });

  describe("updateSettings", () => {
    it("updates settings and returns updated row", async () => {
      const input = {
        notification_email: "new@example.com",
        alerts_enabled: false,
      };
      const mockData: SettingsOutput = {
        notification_email: input.notification_email,
        alerts_enabled: input.alerts_enabled,
      };

      const mockSupabase = {
        from: () => ({
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => {
                  return Promise.resolve({ data: mockData, error: null });
                }
              }),
            }),
          }),
        }),
      };

      (getAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase as any);

      const result = await updateSettings(mockShopId, input);
      expect(result).toEqual(mockData);
    });

    it("propagates database errors", async () => {
      const input = {
        notification_email: "test@example.com",
        alerts_enabled: true,
      };

      const mockSupabase = {
        from: () => ({
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => {
                  return Promise.resolve({ data: null, error: { message: "Update failed" } });
                }
              }),
            }),
          }),
        }),
      };

      (getAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase as any);

      await expect(updateSettings(mockShopId, input)).rejects.toThrow("Update failed");
    });
  });

  describe("ExplanationConfigurationQueries", () => {
    const mockShopId = "test-shop-id";

    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe("saveConfiguration", () => {
      it("should save configuration without throwing", async () => {
        const config: ExplanationConfiguration = {
          id: `config-${mockShopId}-${Date.now()}`,
          shopId: mockShopId,
          explanationEnabled: true,
          explanationLevel: 'detailed',
          includeTechnicalDetails: false,
          enableConfidenceScoring: true,
          enableHistoricalContext: true,
          enableEnhancedEvidence: true,
          explanationFormat: 'merchant-friendly',
          collectExplanationFeedback: true,
          feedbackCollectionEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Should not throw
        await expect(ExplanationConfigurationQueries.saveConfiguration(config)).resolves.not.toThrow();
      });
    });

    describe("getConfiguration", () => {
      it("should return null when no configuration exists", async () => {
        const result = await ExplanationConfigurationQueries.getConfiguration(mockShopId);
        expect(result).toBeNull();
      });
    });

    describe("getOrCreateConfiguration", () => {
      it("should create and return a default configuration when none exists", async () => {
        const result = await ExplanationConfigurationQueries.getOrCreateConfiguration(mockShopId);

        expect(result).toBeDefined();
        expect(result.shopId).toBe(mockShopId);
        expect(result.explanationEnabled).toBe(true);
        expect(result.explanationLevel).toBe('detailed');
        expect(result.includeTechnicalDetails).toBe(false);
        expect(result.enableConfidenceScoring).toBe(true);
        expect(result.enableHistoricalContext).toBe(true);
        expect(result.enableEnhancedEvidence).toBe(true);
        expect(result.explanationFormat).toBe('merchant-friendly');
        expect(result.collectExplanationFeedback).toBe(true);
        expect(result.feedbackCollectionEnabled).toBe(true);
        expect(result.id).toContain(`config-${mockShopId}-`);
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.updatedAt).toBeInstanceOf(Date);
      });

      it("should create a new configuration each time (simulated behavior)", async () => {
        // In the simulated implementation, each call creates a new configuration
        const firstConfig = await ExplanationConfigurationQueries.getOrCreateConfiguration(mockShopId);
        const secondConfig = await ExplanationConfigurationQueries.getOrCreateConfiguration(mockShopId);

        // Should both be valid configurations
        expect(firstConfig).toBeDefined();
        expect(secondConfig).toBeDefined();

        // Should have same shopId
        expect(firstConfig.shopId).toBe(mockShopId);
        expect(secondConfig.shopId).toBe(mockShopId);

        // Should have same default values
        expect(firstConfig.explanationEnabled).toBe(true);
        expect(secondConfig.explanationEnabled).toBe(true);
        expect(firstConfig.explanationLevel).toBe('detailed');
        expect(secondConfig.explanationLevel).toBe('detailed');

        // But different IDs due to timestamp in simulated implementation
        expect(firstConfig.id).not.toBe(secondConfig.id);
      });
    });
  });
});