import { notFound } from "next/navigation";
import { getPublicBike } from "@/lib/bikes";
import { campusCenter, mockScannerLocation } from "@/lib/campus";
import { BikeMapDynamic } from "@/components/BikeMapDynamic";
import { ReportLocationButton } from "@/components/ReportLocationButton";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function PublicBikePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bike = await getPublicBike(id.toLowerCase());
  if (!bike) notFound();

  const campus = campusCenter();
  const mockScanner = mockScannerLocation();

  // If no hardware fix has been recorded yet, show mock scanner fix at IIT Roorkee
  const effectiveLast = bike.lastLocation
    ? {
        lat: bike.lastLocation.lat,
        lng: bike.lastLocation.lng,
        recordedAt: bike.lastLocation.recordedAt,
        source: bike.lastLocation.source,
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
    <div className="mx-auto max-w-lg space-y-6">
      <section className="space-y-3 rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf">
              Campus bicycle
            </p>
            <h1 className="font-display text-3xl text-moss">{bike.name}</h1>
            <p className="text-sm text-ink/60">
              {[bike.color, bike.model].filter(Boolean).join(" · ") || "Registered bicycle"}
            </p>
          </div>
          <StatusBadge status={bike.status} />
        </div>

        <dl className="grid gap-3 text-sm">
          {bike.tagId ? (
            <div>
              <dt className="text-ink/50">Bicycle Tag (RFID / BLE)</dt>
              <dd className="font-mono text-xs font-semibold text-moss">{bike.tagId}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-ink/50">Owner</dt>
            <dd className="font-medium">{bike.owner.displayName}</dd>
          </div>
          {bike.owner.phone ? (
            <div>
              <dt className="text-ink/50">Phone</dt>
              <dd>
                <a className="text-moss underline" href={`tel:${bike.owner.phone}`}>
                  {bike.owner.phone}
                </a>
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-ink/50">Address on campus</dt>
            <dd>
              {[bike.owner.hostel, bike.owner.room].filter(Boolean).join(", ") ||
                "Not listed — use the phone number"}
            </dd>
          </div>
          <div>
            <dt className="text-ink/50">Color / Model</dt>
            <dd>{[bike.color, bike.model].filter(Boolean).join(" · ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-ink/50">Owner email</dt>
            <dd>
              <a className="text-moss underline" href={`mailto:${bike.owner.email}`}>{bike.owner.email}</a>
            </dd>
          </div>
          <div>
            <dt className="text-ink/50">Registered</dt>
            <dd>{bike.registeredAt.slice(0, 10)}</dd>
          </div>
          <div>
            <dt className="text-ink/50">Last seen</dt>
            <dd>
              {bike.lastLocation
                ? `${bike.lastLocation.recordedAt.slice(0, 16)} · ${bike.lastLocation.source.toUpperCase()}`
                : "No sightings yet"}
            </dd>
          </div>
        </dl>

        <ReportLocationButton publicId={bike.publicId} />
      </section>

      <section className="h-72 overflow-hidden rounded-3xl bg-white p-2 shadow-sm">
        <BikeMapDynamic
          center={{ lat: effectiveLast.lat, lng: effectiveLast.lng }}
          trail={[{ lat: effectiveLast.lat, lng: effectiveLast.lng }]}
          last={effectiveLast}
          label={bike.name}
        />
      </section>
    </div>
  );
}
