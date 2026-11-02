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
        Server Error.
      </p>
      <pre className="overflow-auto rounded-xl bg-mist p-3 text-xs">{error.message}</pre>
    </div>
  );
}
