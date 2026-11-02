import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getBikeForOwner, latestLocation, locationTrail } from "@/lib/bikes";
import { mockScannerLocation } from "@/lib/campus";
import { BikeMapDynamic } from "@/components/BikeMapDynamic";
import { StatusBadge } from "@/components/StatusBadge";
import { ToggleStatusButton } from "@/components/ToggleStatusButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await getSessionUser().catch(() => null);
  if (!user) return { title: "Bicycle Details" };
  const bike = await getBikeForOwner(Number(id), user.id);
  return {
    title: bike?.name ? bike.name : "Bicycle Details",
  };
}

export default async function BikeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const bike = await getBikeForOwner(Number(id), user.id);
  if (!bike) notFound();

  const [last, trail] = await Promise.all([
    latestLocation(bike.id),
    locationTrail(bike.id, 5),
  ]);
  const mockScanner = mockScannerLocation();

  const effectiveLast = last
    ? {
        lat: Number(last.lat),
        lng: Number(last.lng),
        recordedAt: String(last.recorded_at),
        source: last.source,
        note: last.reporter_note ?? undefined,
        isMock: false,
      }
    : {
        lat: mockScanner.lat,
        lng: mockScanner.lng,
        recordedAt: new Date().toISOString(),
        source: "rfid",
        note: mockScanner.scannerName,
        isMock: true,
      };

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm font-medium text-moss hover:underline">
        ← All bicycles
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-moss">{bike.name}</h1>
          <p className="text-sm text-ink/65">
            {[bike.color, bike.model].filter(Boolean).join(" · ") || "Campus bicycle"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={bike.status} />
          <ToggleStatusButton bikeId={bike.id} status={bike.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="h-96 overflow-hidden rounded-3xl bg-white p-2 shadow-sm">
          <BikeMapDynamic
            center={{ lat: effectiveLast.lat, lng: effectiveLast.lng }}
            last={effectiveLast}
            label={bike.name}
          />
        </section>

        <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl text-moss">Bicycle & Plate Identifiers</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-ink/50">Bicycle Tag</dt>
              <dd className="font-mono text-sm font-semibold text-moss">
                {bike.tag_id || "Not assigned"}
              </dd>
            </div>
            <div>
              <dt className="text-ink/50">iBeacon UUID</dt>
              <dd className="break-all font-mono text-xs">{bike.beacon_uuid}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Sightings Section (Max 5, latest at top) */}
      <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-moss">Sightings</h2>
          <span className="text-xs text-ink/50">
            {trail.length} recent sighting{trail.length === 1 ? "" : "s"}
          </span>
        </div>
        <hr className="border-ink/10" />
        {trail.length === 0 ? (
          <p className="py-2 text-sm text-ink/60">No sightings recorded yet.</p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {trail.map((loc) => {
              const dateStr = new Date(loc.recorded_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });
              return (
                <li key={loc.id} className="flex items-start justify-between py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-moss" />
                    <div>
                      <div className="font-semibold text-sm text-ink/85">
                        {Number(loc.lat).toFixed(5)}, {Number(loc.lng).toFixed(5)}
                      </div>
                      {loc.reporter_note && (
                        <div className="mt-0.5 text-xs text-ink/60">{loc.reporter_note}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded bg-mist px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-moss">
                      {loc.source}
                    </span>
                    <div className="mt-1 text-xs text-ink/50">{dateStr}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
