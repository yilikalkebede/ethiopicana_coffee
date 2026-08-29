import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/profile");

  return (
    <section className="mx-auto max-w-sm px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-tag text-belt-700">Account</p>
      <h1 className="mt-2 text-3xl text-ink">Your profile</h1>

      <ProfileForm
        firstName={user.firstName}
        lastName={user.lastName}
        email={user.email}
        phone={user.phone ?? ""}
      />
    </section>
  );
}
