"use client";

import { useState } from "react";

export function ReportLocationButton({ publicId }: { publicId: string }) {
  const [state, setState] = useState<"idle" | "locating" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function report() {
    if (!navigator.geolocation) {
      setState("error");
      setMessage("This browser cannot share GPS. Try Chrome or Safari on a phone.");
      return;
    }

    setState("locating");
    setMessage("Asking for location permission…");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setState("saving");
        setMessage("Sending location…");
        const response = await fetch("/api/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyM: pos.coords.accuracy,
            source: "web",
          }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setState("error");
          setMessage(data.error ?? "Could not save location.");
          return;
        }
        setState("done");
        setMessage("Location saved. The owner can see this pin on their map.");
      },
      (err) => {
        setState("error");
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Enable it for this site and try again."
            : "Could not read GPS. Step outdoors or wait a few seconds, then retry."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={report}
        disabled={state === "locating" || state === "saving"}
        className="w-full rounded-full bg-moss px-4 py-3 text-sm font-semibold text-sand disabled:opacity-60"
      >
        {state === "locating"
          ? "Getting GPS…"
          : state === "saving"
            ? "Saving…"
            : "Report this bike's location"}
      </button>
      {message ? (
        <p className={`text-sm ${state === "error" ? "text-clay" : "text-ink/70"}`}>{message}</p>
      ) : null}
    </div>
  );
}
