import { SettingsOutput } from "@/lib/settings/types";

interface SettingsFormProps {
  settings: SettingsOutput;
  status?: string;
}

export default function SettingsForm({ settings, status }: SettingsFormProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {status === "success" && (
        <div className="mb-4 p-4 bg-green-100 text-green-800 rounded">
          Settings saved successfully.
        </div>
      )}
      {status === "validation-error" && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded">
          Please fix the errors below.
        </div>
      )}
      <form method="POST" action="/api/settings" className="space-y-6">
        <div>
          <label htmlFor="notification_email" className="block text-sm font-medium text-gray-700 mb-2">
            Notification email
          </label>
          <input
            id="notification_email"
            name="notification_email"
            type="email"
            required
            defaultValue={settings.notification_email ?? ""}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="alerts_enabled"
              name="alerts_enabled"
              type="checkbox"
              defaultChecked={settings.alerts_enabled}
              className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="alerts_enabled" className="font-medium text-gray-700">
              Enable alert emails
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Receive daily digest emails when refunds are detected without a confirmed return
            </p>
          </div>
        </div>
        <div>
          <button type="submit" className="w-flex items-center justify-center rounded-md border border-transparent bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
            Save settings
          </button>
        </div>
      </form>
    </div>
  );
}