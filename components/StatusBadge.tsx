import type { BikeStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: BikeStatus }) {
  const missing = status === "missing";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${
        missing ? "bg-clay/15 text-clay" : "bg-leaf/15 text-moss"
      }`}
    >
      {missing ? "Missing" : "Active"}
    </span>
  );
}
