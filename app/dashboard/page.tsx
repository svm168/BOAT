import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listBikesForOwner } from "@/lib/bikes";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const bikes = await listBikesForOwner(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-moss">Your bicycles</h1>
          <p className="text-sm text-ink/65">RFID/BLE Tag and live campus map.</p>
        </div>
        <Link
          href="/dashboard/bikes/new"
          className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-sand transition hover:bg-moss/90"
        >
          Register a bicycle
        </Link>
      </div>

      {bikes.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-ink/70 shadow-sm">
          No bicycles yet. Register one to link your bicycle tag.
        </div>
      ) : (
        <ul className="grid gap-4">
          {bikes.map((bike) => {
            const details = [bike.color, bike.model].filter(Boolean).join(" · ");
            return (
              <li key={bike.id}>
                <Link
                  href={`/dashboard/bikes/${bike.id}`}
                  className="block rounded-3xl bg-white p-5 shadow-sm transition hover:ring-2 hover:ring-leaf/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl text-moss">{bike.name}</h2>
                      <p className="text-sm text-ink/60">
                        Tag ID: <span className="font-mono text-xs font-semibold text-moss">{bike.tag_id || "Unset"}</span>
                      </p>
                      {details && (
                        <p className="mt-1 text-xs text-ink/65">
                          {details}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={bike.status} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
