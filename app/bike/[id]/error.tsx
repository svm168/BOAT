"use client";

export default function BikeError({ error }: { error: Error }) {
  return (
    <div className="space-y-3 rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="font-display text-3xl text-moss">Could not load this plate</h1>
      <p className="text-ink/70">
        Usually this means TiDB is not connected. Open `/api/health` and confirm `ok: true`.
      </p>
      <pre className="overflow-auto rounded-xl bg-mist p-3 text-xs">{error.message}</pre>
    </div>
  );
}
