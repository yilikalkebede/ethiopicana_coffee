import { requirePortalUser } from "@/lib/portalAuth";
import { PortalShell } from "@/components/PortalShell";
import { SettingsForm } from "@/components/SettingsForm";
import { getSettings } from "@/lib/settings";

export default async function AdminSettingsPage() {
  await requirePortalUser("ADMIN", "/admin/settings");
  const settings = await getSettings();

  return (
    <PortalShell basePath="/admin" roleLabel="Admin" active="settings">
      <h1 className="text-3xl text-ink">Settings</h1>
      <p className="mt-2 font-body text-sm text-ink-soft">
        Store-wide values used at checkout. Changes take effect immediately.
      </p>
      <div className="mt-8">
        <SettingsForm settings={settings} />
      </div>
    </PortalShell>
  );
}
