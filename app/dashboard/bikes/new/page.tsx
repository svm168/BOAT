import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { RegisterBikeForm } from "@/components/RegisterBikeForm";

export default async function NewBikePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="font-display text-3xl text-moss">Register a bicycle</h1>
      <p className="text-sm text-ink/70">
        This creates the NFC public ID and assigns the next BLE minor value for firmware.
      </p>
      <RegisterBikeForm />
    </div>
  );
}
