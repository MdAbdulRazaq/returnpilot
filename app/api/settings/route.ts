import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getShopIdFromSession } from "@/lib/auth/session";
import { settingsUpdateSchema } from "@/lib/settings/types";
import { updateSettings } from "@/lib/settings/queries";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Authenticate
  const cookieStore = await cookies();
  const shopId = await getShopIdFromSession(cookieStore);
  if (!shopId) {
    return new NextResponse(null, { status: 401 });
  }

  // Get form data
  const formData = await req.formData();
  const input = Object.fromEntries(formData.entries());
  // Ensure alerts_enabled is present and convert to boolean
  let alertsEnabled = false;
  if (Object.prototype.hasOwnProperty.call(input, 'alerts_enabled')) {
    const value = input.alerts_enabled;
    if (typeof value === 'string') {
      alertsEnabled = value === 'on' || value === 'true';
    } else {
      // It's already a boolean? Actually, from form data it's always a string, but just in case.
      alertsEnabled = Boolean(value);
    }
  } else {
    alertsEnabled = false;
  }

  // Create a parsed object for validation
  const parsedInput = {
    notification_email: input.notification_email,
    alerts_enabled: alertsEnabled,
  };

  // Validate
  const parseResult = settingsUpdateSchema.safeParse(parsedInput);
  if (!parseResult.success) {
    // Validation failed: redirect with validation-error
    const url = new URL("/settings", req.nextUrl.origin);
    url.searchParams.set("status", "validation-error");
    return NextResponse.redirect(url, 303);
  }

  // Update settings
  await updateSettings(shopId, parseResult.data);

  // Success: redirect with success
  const url = new URL("/settings", req.nextUrl.origin);
  url.searchParams.set("status", "success");
  return NextResponse.redirect(url, 303);
}