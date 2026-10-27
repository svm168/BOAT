"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export function RegisterBikeForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const isSubmittingRef = useRef(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Guard against rapid duplicate clicks immediately before React re-render
    if (isSubmittingRef.current || pending) {
      return;
    }
    isSubmittingRef.current = true;
    setPending(true);
    setError("");

    try {
      const form = new FormData(event.currentTarget);
      const payload = {
        name: form.get("name"),
        color: form.get("color"),
        model: form.get("model"),
      };

      const response = await fetch("/api/bikes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not register bicycle.");
        setPending(false);
        isSubmittingRef.current = false;
        return;
      }

      router.push(`/dashboard/bikes/${data.bike.id}`);
      router.refresh();
    } catch {
      setError("Network error while registering bicycle. Please try again.");
      setPending(false);
      isSubmittingRef.current = false;
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-medium text-ink/80">
        Bicycle nickname <span className="text-clay">*</span>
        <input
          name="name"
          required
          placeholder="e.g. Red Atlas, Firefox Mountain"
          className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm focus:border-moss focus:outline-none focus:ring-1 focus:ring-moss"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-ink/80">
          Color
          <input
            name="color"
            placeholder="e.g. Matte Black"
            className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm focus:border-moss focus:outline-none focus:ring-1 focus:ring-moss"
          />
        </label>
        <label className="block text-sm font-medium text-ink/80">
          Model
          <input
            name="model"
            placeholder="e.g. Hero Sprint"
            className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm focus:border-moss focus:outline-none focus:ring-1 focus:ring-moss"
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-xl bg-clay/10 p-3 text-sm text-clay font-medium">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-moss px-4 py-3 text-sm font-semibold text-sand transition hover:bg-moss/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <svg
              className="h-4 w-4 animate-spin text-sand"
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
            <span>Registering bicycle…</span>
          </>
        ) : (
          "Register bicycle"
        )}
      </button>
    </form>
  );
}
