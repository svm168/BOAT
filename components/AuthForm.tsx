"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload =
      mode === "login"
        ? {
            email: form.get("email"),
            password: form.get("password"),
          }
        : {
            email: form.get("email"),
            password: form.get("password"),
            displayName: form.get("displayName"),
            phone: form.get("phone"),
            hostel: form.get("hostel"),
            room: form.get("room"),
          };

    const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "register" ? (
        <label className="block text-sm">
          Full name
          <input
            name="displayName"
            required
            className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2"
          />
        </label>
      ) : null}
      <label className="block text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2"
        />
      </label>
      {mode === "register" ? (
        <>
          <label className="block text-sm">
            Phone (shown on NFC tap)
            <input
              name="phone"
              className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Hostel / block
              <input
                name="hostel"
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Room
              <input
                name="room"
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2"
              />
            </label>
          </div>
        </>
      ) : null}
      {error ? <p className="text-sm text-clay">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-moss px-4 py-3 text-sm font-semibold text-sand disabled:opacity-60"
      >
        {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
