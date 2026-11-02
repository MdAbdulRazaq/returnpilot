// Mock process.env FIRST, before any imports
vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
vi.stubEnv("APP_ENV", "development");
vi.stubEnv("SHOPIFY_API_KEY", "test-key");
vi.stubEnv("SHOPIFY_API_SECRET", "test-secret");
vi.stubEnv("SHOPIFY_SCOPES", "read_orders,read_returns");
vi.stubEnv("SHOPIFY_API_VERSION", "2025-07");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
vi.stubEnv("TOKEN_ENCRYPTION_KEY", "test-token-encryption-key-123456789012"); // 44 chars
vi.stubEnv("TOKEN_ENCRYPTION_KEY_VERSION", "1");
vi.stubEnv("CRON_SECRET", "test-cron-secret-1234"); // 16 chars
vi.stubEnv("RESEND_API_KEY", "test-resend-key");
vi.stubEnv("EMAIL_FROM", "test@example.com");
vi.stubEnv("EMAIL_DIGEST_SECRET", "test-digest-secret");
vi.stubEnv("EMAIL_INITIAL_LOOKBACK_DAYS", "7");
vi.stubEnv("EMAIL_MAX_ALERTS_PER_EMAIL", "50");
vi.stubEnv("EMAIL_RESEND_TIMEOUT_MS", "8000");

// Import vitest first
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies
vi.mock("@/lib/supabase/admin", () => {
  return {
    getAdminClient: vi.fn(),
  };
});

vi.mock("@/lib/email/queries", () => {
  return {
    getShopList: vi.fn(),
    getLastSuccessfulDelivery: vi.fn(),
    getAlertsSince: vi.fn(),
    recordDeliveryAttempt: vi.fn(),
  };
});

vi.mock("@/lib/email/templates/digest", () => {
  return {
    renderDigestEmail: vi.fn(),
  };
});

vi.mock("@/lib/email/resendClient", () => {
  return {
    __esModule: true,
    default: {
      emails: {
        send: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/log", () => {
  return {
    logInfo: vi.fn(),
    logError: vi.fn(),
  };
});

vi.mock("@/lib/env", () => {
  return {
    getEnv: vi.fn(() => ({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      APP_ENV: "development",
      SHOPIFY_API_KEY: "test-key",
      SHOPIFY_API_SECRET: "test-secret",
      SHOPIFY_SCOPES: "read_orders,read_returns",
      SHOPIFY_API_VERSION: "2025-07",
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
      TOKEN_ENCRYPTION_KEY: "test-token-encryption-key-123456789012", // 44 chars
      TOKEN_ENCRYPTION_KEY_VERSION: 1,
      CRON_SECRET: "test-cron-secret-1234", // 16 chars
      RESEND_API_KEY: "test-resend-key",
      EMAIL_FROM: "test@example.com",
      EMAIL_DIGEST_SECRET: "test-digest-secret",
      EMAIL_INITIAL_LOOKBACK_DAYS: 7,
      EMAIL_MAX_ALERTS_PER_EMAIL: 50,
      EMAIL_RESEND_TIMEOUT_MS: 8000,
    })),
  };
});

// Now import the module to test
import type { Shop, AlertRow, DeliveryRecord } from "@/lib/email/types";
import { processEmailDigest } from "@/lib/email/service";

// Import and type-cast the mocked functions to access mock methods
const {
  getShopList,
  getLastSuccessfulDelivery,
  getAlertsSince,
  recordDeliveryAttempt,
} = await import("@/lib/email/queries");
const { renderDigestEmail } = await import("@/lib/email/templates/digest");
const resendModule = await import("@/lib/email/resendClient");
const resend = resendModule.default;
const { logInfo, logError } = await import("@/lib/log");

// For TypeScript compatibility, we need to assert the mock types
const mockGetShopList = getShopList as ReturnType<typeof vi.fn>;
const mockGetLastSuccessfulDelivery = getLastSuccessfulDelivery as ReturnType<typeof vi.fn>;
const mockGetAlertsSince = getAlertsSince as ReturnType<typeof vi.fn>;
const mockRecordDeliveryAttempt = recordDeliveryAttempt as ReturnType<typeof vi.fn>;
const mockRenderDigestEmail = renderDigestEmail as ReturnType<typeof vi.fn>;
const mockResendEmailsSend = (resend.emails.send as ReturnType<typeof vi.fn>);
const mockLogInfo = logInfo as ReturnType<typeof vi.fn>;
const mockLogError = logError as ReturnType<typeof vi.fn>;

describe("lib/email/service", () => {
  const mockShopId = "test-shop-id";
  const mockShopId2 = "test-shop-id-2";
  const mockEmail = "test@example.com";
  const mockEmail2 = "test2@example.com";
  const mockRunStartedAt = new Date("2026-07-17T10:00:00Z");
  const mockWindowEnd = mockRunStartedAt.toISOString();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(mockRunStartedAt);

    // Reset mock implementations before each test
    mockGetShopList.mockReset();
    mockGetLastSuccessfulDelivery.mockReset();
    mockGetAlertsSince.mockReset();
    mockRecordDeliveryAttempt.mockReset();
    mockRenderDigestEmail.mockReset();
    mockResendEmailsSend.mockReset();
    mockLogInfo.mockReset();
    mockLogError.mockReset();
  });

  describe("processEmailDigest", () => {
    describe("alerts_enabled filtering", () => {
      it("skips shop when alerts_enabled is false", async () => {
        // Arrange - mock shop with alerts_enabled = false
        const mockShops: Shop[] = [
          {
            id: mockShopId,
            email: mockEmail,
            uninstalled_at: null,
            encrypted_access_token: "token",
            alerts_enabled: false, // This should cause the shop to be skipped
          }
        ];

        // Mock the queries
        mockGetShopList.mockResolvedValue(mockShops);

        // Act
        await processEmailDigest();

        // Assert - verify the shop was skipped
        expect(mockGetShopList).toHaveBeenCalledOnce();
        expect(mockGetShopList).toHaveBeenCalledWith();

        // Verify that no further processing happened for this shop
        expect(mockGetLastSuccessfulDelivery).not.toHaveBeenCalled();
        expect(mockGetAlertsSince).not.toHaveBeenCalled();
        expect(mockRecordDeliveryAttempt).not.toHaveBeenCalled();
        expect(mockResendEmailsSend).not.toHaveBeenCalled();

        // Verify the skip was logged
        expect(mockLogInfo).toHaveBeenCalledWith(
          'email_digest_shop_skipped',
          expect.objectContaining({
            shopId: mockShopId,
            reason: 'alerts_disabled',
          })
        );
      });

      it("processes shop when alerts_enabled is true", async () => {
        // Arrange - mock shop with alerts_enabled = true
        const mockShops: Shop[] = [
          {
            id: mockShopId,
            email: mockEmail,
            uninstalled_at: null,
            encrypted_access_token: "token",
            alerts_enabled: true, // This should allow processing to continue
          }
        ];

        // Mock the queries
        mockGetShopList.mockResolvedValue(mockShops);

        const mockLastDelivery = null; // No previous delivery
        mockGetLastSuccessfulDelivery.mockResolvedValue(mockLastDelivery);

        const mockAlerts: AlertRow[] = [
          {
            id: "alert-1",
            shop_id: mockShopId,
            shopify_refund_id: "refund-1",
            shopify_order_id: "order-1",
            order_name: "#1001",
            refund_amount: 25.99,
            currency: "USD",
            money_at_risk: 25.99,
            reason: "NO_RETURN",
            status: "open",
            refunded_at: null,
            detected_at: "2026-07-16T10:00:00Z",
          }
        ];

        mockGetAlertsSince.mockResolvedValue(mockAlerts);
        mockRecordDeliveryAttempt.mockResolvedValue({
          id: "delivery-1",
          shop_id: mockShopId,
          notification_type: "daily_digest",
          window_start: mockWindowEnd, // Simplified
          window_end: mockWindowEnd,
          sent_at: new Date().toISOString(),
          status: "sent",
          provider_message_id: "test-email-id",
          alert_count: 1,
          duration_ms: 100,
          created_at: new Date().toISOString(),
        });

        mockRenderDigestEmail.mockReturnValue({
          html: "<html>test</html>",
          text: "test"
        });

        mockResendEmailsSend.mockResolvedValue({
          data: { id: "test-email-id" }
        });

        // Act
        await processEmailDigest();

        // Assert - verify normal processing occurred
        expect(mockGetShopList).toHaveBeenCalledOnce();
        expect(mockGetLastSuccessfulDelivery).toHaveBeenCalledWith(mockShopId, 'daily_digest');
        expect(mockGetAlertsSince).toHaveBeenCalledWith(
          mockShopId,
          expect.any(String), // windowStart
          mockWindowEnd
        );
        expect(mockRecordDeliveryAttempt).toHaveBeenCalledOnce();
        expect(mockResendEmailsSend).toHaveBeenCalledOnce();

        // Verify the email was sent
        expect(mockResendEmailsSend).toHaveBeenCalledWith(
          expect.objectContaining({
            to: mockEmail,
            subject: expect.stringContaining("ReturnPilot Daily Refund Digest"),
          })
        );

        // Verify success was logged
        expect(mockLogInfo).toHaveBeenCalledWith(
          'email_digest_attempt',
          expect.objectContaining({
            shopId: mockShopId,
            notificationType: 'daily_digest',
            status: 'sent',
          })
        );
      });

      it("processes only shops with alerts_enabled = true when mixed", async () => {
        // Arrange - mock shops with mixed alerts_enabled values
        const mockShops: Shop[] = [
          {
            id: mockShopId,
            email: mockEmail,
            uninstalled_at: null,
            encrypted_access_token: "token",
            alerts_enabled: false, // Should be skipped
          },
          {
            id: mockShopId2,
            email: mockEmail2,
            uninstalled_at: null,
            encrypted_access_token: "token",
            alerts_enabled: true, // Should be processed
          }
        ];

        // Mock the queries
        mockGetShopList.mockResolvedValue(mockShops);

        const mockLastDelivery = null; // No previous delivery
        mockGetLastSuccessfulDelivery.mockResolvedValue(mockLastDelivery);

        const mockAlerts: AlertRow[] = [
          {
            id: "alert-1",
            shop_id: mockShopId2,
            shopify_refund_id: "refund-1",
            shopify_order_id: "order-1",
            order_name: "#1001",
            refund_amount: 25.99,
            currency: "USD",
            money_at_risk: 25.99,
            reason: "NO_RETURN",
            status: "open",
            refunded_at: null,
            detected_at: "2026-07-16T10:00:00Z",
          }
        ];

        mockGetAlertsSince.mockResolvedValue(mockAlerts);
        mockRecordDeliveryAttempt.mockResolvedValue({
          id: "delivery-1",
          ship_id: mockShopId2,
          notification_type: "daily_digest",
          window_start: mockWindowEnd,
          window_end: mockWindowEnd,
          sent_at: new Date().toISOString(),
          status: "sent",
          provider_message_id: "test-email-id",
          alert_count: 1,
          duration_ms: 100,
          created_at: new Date().toISOString(),
        });

        mockRenderDigestEmail.mockReturnValue({
          html: "<html>test</html>",
          text: "test"
        });

        mockResendEmailsSend.mockResolvedValue({
          data: { id: "test-email-id" }
        });

        // Act
        await processEmailDigest();

        // Assert
        expect(mockGetShopList).toHaveBeenCalledOnce();
        expect(mockGetShopList).toHaveBeenCalledWith();

        // Verify that only the enabled shop was processed further
        expect(mockGetLastSuccessfulDelivery).toHaveBeenCalledTimes(1);
        expect(mockGetLastSuccessfulDelivery).toHaveBeenCalledWith(mockShopId2, 'daily_digest');

        expect(mockGetAlertsSince).toHaveBeenCalledTimes(1);
        expect(mockGetAlertsSince).toHaveBeenCalledWith(
          mockShopId2,
          expect.any(String),
          mockWindowEnd
        );

        expect(mockRecordDeliveryAttempt).toHaveBeenCalledTimes(1);
        expect(mockRecordDeliveryAttempt).toHaveBeenCalledWith(
          expect.objectContaining({
            shop_id: mockShopId2,
          })
        );

        expect(mockResendEmailsSend).toHaveBeenCalledTimes(1);
        expect(mockResendEmailsSend).toHaveBeenCalledWith(
          expect.objectContaining({
            to: mockEmail2,
          })
        );

        // Verify that the disabled shop was logged as skipped
        expect(mockLogInfo).toHaveBeenCalledWith(
          'email_digest_shop_skipped',
          expect.objectContaining({
            shopId: mockShopId,
            reason: 'alerts_disabled',
          })
        );

        // Verify that the enabled shop was processed and success logged
        expect(mockLogInfo).toHaveBeenCalledWith(
          'email_digest_attempt',
          expect.objectContaining({
            shopId: mockShopId2,
            notificationType: 'daily_digest',
            status: 'sent',
          })
        );
      });
    });
  });
});