import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getBikeForOwner, latestLocation, locationTrail } from "@/lib/bikes";
import { appUrl, campusCenter, mockScannerLocation } from "@/lib/campus";
import { BikeMapDynamic } from "@/components/BikeMapDynamic";
import { StatusBadge } from "@/components/StatusBadge";
import { ToggleStatusButton } from "@/components/ToggleStatusButton";
import { SimulateScanButton } from "@/components/SimulateScanButton";
import { WriteNfcButton } from "@/components/WriteNfcButton";

export const dynamic = "force-dynamic";

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
    locationTrail(bike.id),
  ]);

  const campus = campusCenter();
  const mockScanner = mockScannerLocation();

  // If no hardware scanner ping is in database yet, bind to mock scanner location inside IIT Roorkee
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

  const chronological = [...trail].reverse().map((p) => ({
    lat: Number(p.lat),
    lng: Number(p.lng),
    recordedAt: String(p.recorded_at),
    source: p.source,
    note: p.reporter_note ?? undefined,
    isMock: false,
  }));

  const mapTrail = chronological.length > 0 ? chronological : [effectiveLast];

  const nfcUrl = `${appUrl()}/bike/${bike.public_id}`;

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
            trail={mapTrail}
            last={effectiveLast}
            label={bike.name}
          />
        </section>

        <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl text-moss">Bicycle & Plate Identifiers</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-ink/50">Bicycle Tag (RFID UID / BLE MAC)</dt>
              <dd className="font-mono text-sm font-semibold text-moss">
                {bike.tag_id || "Not assigned"}
              </dd>
            </div>
            <div>
              <dt className="text-ink/50">NFC URL (written to sticker)</dt>
              <dd className="break-all font-medium">{nfcUrl}</dd>
            </div>
            <div>
              <dt className="text-ink/50">iBeacon UUID</dt>
              <dd className="break-all font-mono text-xs">{bike.beacon_uuid}</dd>
            </div>
            <div>
              <dt className="text-ink/50">Major / Minor</dt>
              <dd className="font-mono">
                {bike.beacon_major} / {bike.beacon_minor}
              </dd>
            </div>
            <div>
              <dt className="text-ink/50">Latest fix</dt>
              <dd>
                {last ? (
                  <>
                    <span className="font-medium">
                      {Number(last.lat).toFixed(5)}, {Number(last.lng).toFixed(5)}
                    </span>
                    <span className="text-ink/60">
                      {" "}· {new Date(last.recorded_at).toLocaleTimeString()} · {last.source.toUpperCase()}
                      {last.reporter_note ? ` (${last.reporter_note})` : ""}
                    </span>
                  </>
                ) : (
                  <span className="text-amber-800">
                    {effectiveLast.lat.toFixed(5)}, {effectiveLast.lng.toFixed(5)} · Mock Scanner (IIT Roorkee)
                  </span>
                )}
              </dd>
            </div>
          </dl>

          <WriteNfcButton path={`/bike/${bike.public_id}`} />
          <SimulateScanButton tagId={bike.tag_id} publicId={bike.public_id} />

          <div className="pt-2">
            <a
              href={`/bike/${bike.public_id}`}
              className="inline-block text-sm font-medium text-moss underline"
            >
              Open public NFC page →
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
