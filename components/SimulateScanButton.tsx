"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SimulateScanButton({
  tagId,
  publicId,
}: {
  tagId: string;
  publicId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSimulate() {
    if (loading) return;
    setLoading(true);
    setResult(null);

    // Random slight jitter around IIT Roorkee campus to simulate movement between stands
    const locations = [
      { name: "Central Library Stand", lat: 29.8655, lng: 77.8960, scannerId: "ROORKEE-LIB-1" },
      { name: "Main Building Gate", lat: 29.8649, lng: 77.8966, scannerId: "ROORKEE-GATE-1" },
      { name: "Student Activity Center (SAC)", lat: 29.8635, lng: 77.8982, scannerId: "ROORKEE-SAC-1" },
      { name: "Rajendra Bhawan Cycle Stand", lat: 29.8682, lng: 77.8945, scannerId: "ROORKEE-RAJ-1" },
    ];
    const loc = locations[Math.floor(Math.random() * locations.length)];

    try {
      const response = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagId: tagId || publicId,
          lat: loc.lat,
          lng: loc.lng,
          source: "rfid",
          scannerId: loc.scannerId,
          note: `Scanned at ${loc.name}`,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setResult(`Recorded fix at ${loc.name}!`);
        router.refresh();
      } else {
        setResult(data.error ?? "Failed to simulate scanner ping.");
      }
    } catch {
      setResult("Network error testing scanner.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1.5 pt-2">
      <button
        type="button"
        onClick={handleSimulate}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-moss/30 bg-moss/5 px-3 py-2 text-xs font-semibold text-moss transition hover:bg-moss/10 disabled:opacity-50"
      >
        {loading ? (
          <>
            <svg
              className="h-3.5 w-3.5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Simulating ESP32 ping…</span>
          </>
        ) : (
          "Simulate Hardware Ping (ESP32 / RFID)"
        )}
      </button>
      {result && <p className="text-center text-xs text-moss">{result}</p>}
    </div>
  );
}
