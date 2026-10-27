"use client";

import { useEffect, useState } from "react";

export function WriteNfcButton({ path }: { path: string }) {
  const [url, setUrl] = useState("");
  const [supported, setSupported] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setUrl(window.location.origin + path);
    setSupported("NDEFReader" in window);
  }, [path]);

  const temporary = /localhost|127\.0\.0\.1|192\.168\.|trycloudflare|ngrok/.test(url);

  async function write() {
    setBusy(true);
    setMsg("Hold the sticker against the back of your phone…");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ndef = new (window as any).NDEFReader();
      await ndef.write({ records: [{ recordType: "url", data: url }] }, { overwrite: true });
      setMsg("Written! Tap the sticker again to test it.");
    } catch (e) {
      const err = e as { name?: string; message?: string };
      setMsg(err.name === "NotAllowedError" ? "NFC permission denied." : `Write failed: ${err.message ?? err}`);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMsg("URL copied. Paste it into NFC Tools → Write → URL.");
    } catch {
      setMsg("Could not copy. Select the URL above manually.");
    }
  }

  return (
    <div className="space-y-2 pt-2">
      <p className="break-all font-mono text-xs text-ink/70">{url}</p>
      {temporary ? (
        <p className="text-xs text-amber-800">
          This is a temporary or local address. Write stickers from your deployed site, or the sticker will stop working.
        </p>
      ) : null}
      {supported ? (
        <button
          type="button"
          onClick={write}
          disabled={busy || !url}
          className="w-full rounded-xl border border-moss/30 bg-moss/5 px-3 py-2 text-xs font-semibold text-moss disabled:opacity-50"
        >
          {busy ? "Waiting for sticker…" : "Write link to NFC sticker"}
        </button>
      ) : (
        <p className="text-xs text-ink/60">
          Writing from the browser needs Chrome on Android over HTTPS. On iPhone or other browsers, use the copy button and the NFC Tools app.
        </p>
      )}
      <button type="button" onClick={copy} className="text-xs font-medium text-moss underline">
        Copy link
      </button>
      {msg ? <p className="text-xs text-moss">{msg}</p> : null}
    </div>
  );
}