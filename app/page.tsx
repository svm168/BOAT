import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="max-w-2xl space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-leaf">
          Closed-campus number plates
        </p>
        <h1 className="font-display text-4xl leading-tight text-moss sm:text-5xl">
          Bicycle Ownership and Address Tag
        </h1>
        <p className="text-lg text-ink/75">
          Tap an NFC plate to see who owns the bike. Community phones later relay BLE beacons so
          an owner can open a map and see the last known campus location — without reporting the
          bike missing first.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/register"
            className="rounded-full bg-moss px-5 py-2.5 text-sm font-semibold text-sand"
          >
            Create owner account
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-ink/15 px-5 py-2.5 text-sm font-semibold"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl text-moss">NFC ownership</h2>
          <p className="mt-2 text-ink/70">
            Anyone can tap a sticker with a phone. No app. They land on{" "}
            <code className="rounded bg-mist px-1">/bike/&lt;id&gt;</code> and see owner name,
            contact, hostel, and a one-tap GPS report button.
          </p>
        </article>
        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl text-moss">Passive location</h2>
          <p className="mt-2 text-ink/70">
            The ESP32-C3 broadcasts a short iBeacon pulse, then sleeps. The web app already
            stores every location ping in TiDB. The Flutter scanner comes after this dashboard
            works end to end.
          </p>
        </article>
      </section>
    </div>
  );
}
