"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import type { BikeStatus } from "@/lib/types";

export function ToggleStatusButton({
  bikeId,
  status,
}: {
  bikeId: number;
  status: BikeStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isSubmittingRef = useRef(false);

  const isMissing = status === "missing";
  const targetStatus = isMissing ? "active" : "missing";

  async function toggle() {
    // Synchronously block double clicks caused by fast clicking or network latency
    if (isSubmittingRef.current || pending) {
      return;
    }
    isSubmittingRef.current = true;
    setPending(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/bikes/${bikeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(data.error ?? "Failed to update bicycle status.");
        setPending(false);
        isSubmittingRef.current = false;
        return;
      }

      router.refresh();
    } catch {
      setErrorMessage("Network error. Could not reach server.");
    } finally {
      setPending(false);
      isSubmittingRef.current = false;
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-busy={pending}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isMissing
            ? "border-moss bg-white text-moss hover:bg-mist"
            : "border-clay bg-clay text-sand hover:bg-clay/90"
        }`}
      >
        {pending && (
          <svg
            className="h-3.5 w-3.5 animate-spin text-current"
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
        )}
        <span>
          {pending
            ? isMissing
              ? "Marking as found…"
              : "Reporting missing…"
            : isMissing
              ? "Mark as found"
              : "Report Missing"}
        </span>
      </button>
      {errorMessage ? (
        <span className="text-xs text-clay font-medium">{errorMessage}</span>
      ) : null}
    </div>
  );
}
