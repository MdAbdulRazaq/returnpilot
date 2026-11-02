import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/server
    vi.mock("next/server", () => {
      // Create a mock for the NextResponse function that also has redirect and json properties
      const NextResponseMock = vi.fn((body, init) => {
        // This mock implementation returns an object that mimics the shape needed for the tests.
        // The actual handler may call .json() or .redirect() on the returned object.
        // We'll mock those methods as needed.
        return {
          // If the handler calls .json() on the response, we mock it.
          json: vi.fn().mockResolvedValue(body),
          // If the handler calls .clone() or other methods, we can add them as needed.
          // For the settings route, we only need to check that NextResponse was called with certain args
          // and that NextResponse.redirect and NextResponse.json were called as mocks on the function itself.
          // However, the real NextResponse.redirect and NextResponse.json are functions that return a NextResponse instance.
          // In our mock, we will make NextResponse.redirect and NextResponse.json be mock functions that return a mock response.
          // But the test expects NextResponse.redirect and NextResponse.json to be mocks on the NextResponse function itself.
          // Looking at the test, they check NextResponse.mock.calls for the function, and NextResponse.redirect.mock.calls, etc.
          // So we need to attach mock properties to the NextResponseMock function.
          // We'll do that after defining the function.
          body,
          init
        };
      }) as any;

      // Attach mock properties to the function itself
      NextResponseMock.redirect = vi.fn();
      NextResponseMock.json = vi.fn();

      return { NextResponse: NextResponseMock };
    });

    // Mock next/headers
    vi.mock("next/headers", () => {
      return {
        cookies: vi.fn(),
      };
    });

    // Mock "@/lib/auth/session"
    vi.mock("@/lib/auth/session", () => {
      return {
        getShopIdFromSession: vi.fn(),
      };
    });

    // Mock "@/lib/settings/queries"
    vi.mock("@/lib/settings/queries", () => {
      return {
        getSettings: vi.fn(),
        updateSettings: vi.fn(),
      };
    });

    // We use the real settingsUpdateSchema
    import { settingsUpdateSchema } from "@/lib/settings/types";

    // Now import the route
    import { POST } from "@/app/api/settings/route";

    import { cookies } from "next/headers";
    import { getShopIdFromSession } from "@/lib/auth/session";
    import { updateSettings } from "@/lib/settings/queries";
    import { NextResponse } from "next/server";

    // Assert that NextResponse is the mocked version (since we mocked "next/server" above)
    const mockedNextResponse = NextResponse as unknown as {
      (body: any, init?: any): {
        json: ReturnType<typeof vi.fn>;
        init: any;
        [key: string]: any;
      };
      redirect: ReturnType<typeof vi.fn>;
      json: ReturnType<typeof vi.fn>;
      mock: any;
    };

    // Helper to create a mock Request object
    const createMockRequest = (formDataEntries: [string, string][], origin = "http://localhost") => {
      const formData = new FormData();
      for (const [key, value] of formDataEntries) {
        formData.append(key, value.toString());
      }

      return {
        formData: async () => formData,
        nextUrl: {
          origin,
        },
      };
    };

    describe("app/api/settings/route", () => {
      const mockShopId = "test-shop-id";
      const mockOrigin = "http://localhost";

      beforeEach(() => {
        vi.clearAllMocks();
        (cookies as ReturnType<typeof vi.fn>).mockReturnValue({
          get: vi.fn(),
        });
        (getShopIdFromSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockShopId);
      });

      describe("unauthenticated request", () => {
        it("returns 401", async () => {
          (getShopIdFromSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

          const req = createMockRequest([]);
          const res = await POST(req as any);

          // Check that NextResponse was called with null and { status: 401 }
          expect(mockedNextResponse).toHaveBeenCalledWith(null, { status: 401 });
        });
      });

      describe("valid form submission", () => {
        it("calls updateSettings and redirects with success", async () => {
          const formData = [
            ["notification_email", "test@example.com"] as [string, string],
            ["alerts_enabled", "true"] as [string, string],
          ];
          const req = createMockRequest(formData, mockOrigin);

          const res = await POST(req as any);

          // Validate that updateSettings was called with correct parsed data
          expect(updateSettings).toHaveBeenCalledOnce();
          expect(updateSettings).toHaveBeenCalledWith(
            mockShopId,
            {
              notification_email: "test@example.com",
              alerts_enabled: true,
            }
          );

          // Check that NextResponse.redirect was called with the correct args
          expect(mockedNextResponse.redirect).toHaveBeenCalledOnce();
          const redirectCall = mockedNextResponse.redirect.mock.calls[0]!;
          expect(redirectCall[0]).toBeInstanceOf(URL);
          expect(redirectCall[0].pathname).toBe("/settings");
          expect(redirectCall[0].searchParams.get("status")).toBe("success");
          expect(redirectCall[1]).toBe(303);
        });
      });

      describe("invalid email", () => {
        it("does not call updateSettings and redirects with validation-error", async () => {
          const formData = [
            ["notification_email", "invalid-email"] as [string, string],
            ["alerts_enabled", "true"] as [string, string],
          ];
          const req = createMockRequest(formData, mockOrigin);

          const res = await POST(req as any);

          expect(updateSettings).not.toHaveBeenCalled();

          // Check that NextResponse.redirect was called with validation-error
          expect(mockedNextResponse.redirect).toHaveBeenCalledOnce();
          const redirectCall = mockedNextResponse.redirect.mock.calls[0]!;
          expect(redirectCall[0]).toBeInstanceOf(URL);
          expect(redirectCall[0].pathname).toBe("/settings");
          expect(redirectCall[0].searchParams.get("status")).toBe("validation-error");
          expect(redirectCall[1]).toBe(303);
        });
      });

      describe("checkbox handling", () => {
        it("checkbox present -> alerts_enabled = true", async () => {
          const formData = [
            ["notification_email", "test@example.com"] as [string, string],
            // For a checkbox, when checked, the value is typically "on"
            ["alerts_enabled", "on"] as [string, string],
          ];
          const req = createMockRequest(formData, mockOrigin);

          const res = await POST(req as any);

          expect(updateSettings).toHaveBeenCalledOnce();
          expect(updateSettings).toHaveBeenCalledWith(
            mockShopId,
            {
              notification_email: "test@example.com",
              alerts_enabled: true,
            }
          );

          expect(mockedNextResponse.redirect).toHaveBeenCalledOnce();
          const redirectCall = mockedNextResponse.redirect.mock.calls[0]!;
          expect(redirectCall[0]).toBeInstanceOf(URL);
          expect(redirectCall[0].pathname).toBe("/settings");
          expect(redirectCall[0].searchParams.get("status")).toBe("success");
          expect(redirectCall[1]).toBe(303);
        });

        it("checkbox absent -> alerts_enabled = false", async () => {
          const formData = [
            ["notification_email", "test@example.com"] as [string, string],
            // No checkbox entry means unchecked
          ];
          const req = createMockRequest(formData, mockOrigin);

          const res = await POST(req as any);

          expect(updateSettings).toHaveBeenCalledOnce();
          expect(updateSettings).toHaveBeenCalledWith(
            mockShopId,
            {
              notification_email: "test@example.com",
              alerts_enabled: false,
            }
          );

          expect(mockedNextResponse.redirect).toHaveBeenCalledOnce();
          const redirectCall = mockedNextResponse.redirect.mock.calls[0]!;
          expect(redirectCall[0]).toBeInstanceOf(URL);
          expect(redirectCall[0].pathname).toBe("/settings");
          expect(redirectCall[0].searchParams.get("status")).toBe("success");
          expect(redirectCall[1]).toBe(303);
        });
      });

      describe("unknown fields are ignored", () => {
        it("only notification_email and alerts_enabled are passed to updateSettings", async () => {
          const formData = [
            ["notification_email", "test@example.com"] as [string, string],
            ["alerts_enabled", "true"] as [string, string],
            ["unknown_field", "should be ignored"] as [string, string],
          ];
          const req = createMockRequest(formData, mockOrigin);

          const res = await POST(req as any);

          expect(updateSettings).toHaveBeenCalledOnce();
          expect(updateSettings).toHaveBeenCalledWith(
            mockShopId,
            {
              notification_email: "test@example.com",
              alerts_enabled: true,
            }
          );

          expect(mockedNextResponse.redirect).toHaveBeenCalledOnce();
          const redirectCall = mockedNextResponse.redirect.mock.calls[0]!;
          expect(redirectCall[0]).toBeInstanceOf(URL);
          expect(redirectCall[0].pathname).toBe("/settings");
          expect(redirectCall[0].searchParams.get("status")).toBe("success");
          expect(redirectCall[1]).toBe(303);
        });
      });

      describe("no database access outside query layer", () => {
        it("only calls updateSettings from the queries layer", async () => {
          const formData = [
            ["notification_email", "test@example.com"] as [string, string],
            ["alerts_enabled", "true"] as [string, string],
          ];
          const req = createMockRequest(formData, mockOrigin);

          await POST(req as any);

          // Ensure getSettings is not confused (since it's not used in this route)
          // We mock getSettings, so we can check if it was called.
          // Although not required by the route, we mock it to satisfy the requirement.
          // We expect it not to be called.
          const { getSettings } = await import("@/lib/settings/queries");
          expect(getSettings).not.toHaveBeenCalled();
          expect(updateSettings).toHaveBeenCalledOnce();
        });
      });
    });