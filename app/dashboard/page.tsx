import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { latestLocation, listBikesForOwner } from "@/lib/bikes";
import { StatusBadge } from "@/components/StatusBadge";
import { appUrl, mockScannerLocation } from "@/lib/campus";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const bikes = await listBikesForOwner(user.id);
  const withLast = await Promise.all(
    bikes.map(async (bike) => ({
      bike,
      last: await latestLocation(bike.id),
    }))
  );
  const mockScanner = mockScannerLocation();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-moss">Your bicycles</h1>
          <p className="text-sm text-ink/65">NFC Plate, RFID/BLE Tag, and live campus map.</p>
        </div>
        <Link
          href="/dashboard/bikes/new"
          className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-sand transition hover:bg-moss/90"
        >
          Register a bicycle
        </Link>
      </div>

      {withLast.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-ink/70 shadow-sm">
          No bicycles yet. Register one, then write its URL onto an NTAG215 sticker or link your RFID tag.
        </div>
      ) : (
        <ul className="grid gap-4">
          {withLast.map(({ bike, last }) => (
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
                      {" · "}NFC: {appUrl()}/bike/{bike.public_id}
                    </p>
                  </div>
                  <StatusBadge status={bike.status} />
                </div>
                <p className="mt-3 text-sm text-ink/70">
                  {last
                    ? `Last seen: ${new Date(last.recorded_at).toLocaleString()} · ${Number(last.lat).toFixed(4)}, ${Number(last.lng).toFixed(4)} (${last.source.toUpperCase()})`
                    : `Last known: ${mockScanner.scannerName} (Mock pointer active)`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
