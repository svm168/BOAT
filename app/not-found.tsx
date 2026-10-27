import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl text-moss">Plate not found</h1>
      <p className="text-ink/70">That bicycle ID is not registered in BOAT.</p>
      <Link href="/" className="text-sm text-moss underline">
        Back home
      </Link>
    </div>
  );
}
