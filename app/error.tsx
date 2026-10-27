"use client";

export default function ErrorPage({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <div className="space-y-3 rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="font-display text-3xl text-moss">Something broke</h1>
      <p className="text-ink/70">
        If this is the first run, finish SETUP.md: schema in TiDB, then `.env.local`, then restart
        `npm run dev`.
      </p>
      <pre className="overflow-auto rounded-xl bg-mist p-3 text-xs">{error.message}</pre>
    </div>
  );
}
