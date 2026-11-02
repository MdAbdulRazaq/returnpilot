import { cookies } from "next/headers";
import { getShopIdFromSession } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings/queries";
import SettingsForm from "@/components/settings/SettingsForm";
import { redirect } from "next/navigation";

interface SettingsPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedSearchParams = await searchParams;
  let status = resolvedSearchParams.status;
  if (status !== "success" && status !== "validation-error") {
    status = undefined;
  }

  const cookieStore = await cookies();
  const shopId = await getShopIdFromSession(cookieStore);

  if (!shopId) {
    redirect("/api/auth");
  }

  const settings = await getSettings(shopId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <p className="mb-6 text-gray-600">
        Manage your notification email and alert preferences.
      </p>
      <SettingsForm settings={settings} status={status} />
    </div>
  );
}