"use client";

import { useEffect, useState } from "react";

export function WriteNfcButton({ path }: { path: string }) {
  const [baseUrl, setBaseUrl] = useState("");
  const [supported, setSupported] = useState(true);
  const [msg, setMsg] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success" | "warn" | "error">("info");
  const [busy, setBusy] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [testBusy, setTestBusy] = useState(false);

  useEffect(() => {
    // 1. Initialize base URL from localStorage or current window origin
    const saved = localStorage.getItem("boat_public_base_url");
    if (saved && saved.startsWith("http")) {
      setBaseUrl(saved.replace(/\/$/, ""));
    } else {
      setBaseUrl(window.location.origin);
    }

    // 2. Check Web NFC support (available in Chrome for Android over HTTPS/localhost)
    setSupported("NDEFReader" in window);
  }, []);

  const fullUrl = `${baseUrl || "http://localhost:3000"}${path}`;
  const isHttps = fullUrl.startsWith("https://");
  const isLocalOrInsecure = /localhost|127\.0\.0\.1|192\.168\./.test(fullUrl) || !isHttps;

  function updateBaseUrl(newBase: string) {
    const cleaned = newBase.trim().replace(/\/$/, "");
    setBaseUrl(cleaned);
    if (cleaned.startsWith("http")) {
      localStorage.setItem("boat_public_base_url", cleaned);
    }
  }

  /**
   * Flashes the NFC tag with a standard NFC Forum NDEF URI record (recordType: "url").
   * Native OS background scanners on unlocked phones will immediately detect this
   * and prompt/open the URL in the browser without any third-party app!
   */
  async function writeNdef() {
    setBusy(true);
    setStatusType("info");
    setMsg("Hold the NTAG215 sticker firmly against the back of your phone…");

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ndef = new (window as any).NDEFReader();

      // Writing recordType "url" produces a standard NFC Forum Well-Known URI ('U') record
      await ndef.write(
        {
          records: [
            {
              recordType: "url",
              data: fullUrl,
            },
          ],
        },
        { overwrite: true }
      );

      setStatusType("success");
      setMsg(
        isHttps
          ? "🎉 Flashed with NDEF URI! Tap your unlocked phone on the sticker to verify it opens the webpage directly."
          : "⚠️ Flashed with NDEF! Note: Because this URL is HTTP/local, iOS requires HTTPS to trigger background tap. Use an HTTPS address for production."
      );
    } catch (e) {
      const err = e as { name?: string; message?: string };
      setStatusType("error");
      if (err.name === "NotAllowedError") {
        setMsg("NFC permission denied by browser. Tap allow when prompted.");
      } else {
        setMsg(`Flash failed: ${err.message ?? String(err)}`);
      }
    } finally {
      setBusy(false);
    }
  }

  /**
   * Reads an NFC tag using Web NFC to verify whether it contains a valid NDEF URI record.
   */
  async function testTag() {
    setTestBusy(true);
    setStatusType("info");
    setMsg("Hold your NFC sticker to your phone to verify its NDEF format…");

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ndef.onreading = (event: any) => {
        const records = event.message.records;
        const urlRecord = records.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (r: any) => r.recordType === "url" || r.recordType === "absolute-url"
        );

        if (urlRecord) {
          const decoder = new TextDecoder();
          const decoded = decoder.decode(urlRecord.data);
          setStatusType("success");
          setMsg(`✅ Valid NDEF URI Tag Verified! Target: ${decoded}`);
        } else {
          setStatusType("warn");
          setMsg(
            `⚠️ Tag scanned, but found record types: ${records.map((r: { recordType: string }) => r.recordType).join(", ")}. It was not flashed with an NDEF URI record.`
          );
        }
        setTestBusy(false);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ndef.onreadingerror = () => {
        setStatusType("error");
        setMsg("Could not read tag. Ensure tag is in contact with the NFC antenna.");
        setTestBusy(false);
      };
    } catch (e) {
      const err = e as { message?: string };
      setStatusType("error");
      setMsg(`Scan failed: ${err.message ?? String(e)}`);
      setTestBusy(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setStatusType("info");
      setMsg("URL copied! In NFC Tools: Write → Add a record → Custom URL/URI (do NOT select 'Text').");
    } catch {
      setStatusType("error");
      setMsg("Could not copy automatically. Please select and copy the URL manually.");
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-moss/15 bg-white/70 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-moss">
            NFC Plate Flasher (NDEF URI)
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className="text-[11px] font-medium text-moss/70 hover:text-moss underline"
        >
          {showConfig ? "Hide target domain" : "Change target domain"}
        </button>
      </div>

      {showConfig ? (
        <div className="space-y-1.5 rounded-xl bg-mist/60 p-2.5 text-xs">
          <label className="block font-medium text-ink/75">
            Public Base URL (HTTPS recommended):
          </label>
          <div className="flex gap-1.5">
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => updateBaseUrl(e.target.value)}
              placeholder="https://your-domain.com"
              className="w-full rounded-lg border border-moss/20 bg-white px-2.5 py-1 text-xs font-mono text-ink outline-none focus:border-moss"
            />
            <button
              type="button"
              onClick={() => updateBaseUrl(window.location.origin)}
              className="shrink-0 rounded-lg border border-moss/25 bg-white px-2 py-1 text-[11px] font-medium text-moss hover:bg-moss/5"
            >
              Reset to origin
            </button>
          </div>
          <p className="text-[11px] text-ink/60">
            For phones to open the bike page without opening any app, the URL must be accessible to them. If developing locally, use Cloudflare Tunnel or ngrok with HTTPS.
          </p>
        </div>
      ) : null}

      <div>
        <p className="break-all font-mono text-xs font-medium text-ink bg-mist/40 p-2 rounded-lg border border-moss/10">
          {fullUrl}
        </p>
      </div>

      {isLocalOrInsecure ? (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50/80 p-2.5 text-xs text-amber-900 space-y-1">
          <p className="font-semibold flex items-center gap-1">
            <span>⚠️</span> Native phone tap requires HTTPS:
          </p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            iPhone (iOS CoreNFC) and modern Android only launch the browser on tap without dedicated apps when flashed with an <strong className="font-semibold">HTTPS</strong> URL. Tapping an <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">http://localhost</code> tag will not open on iPhone.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-300/80 bg-emerald-50/80 p-2 text-[11px] text-emerald-900 flex items-center gap-1.5">
          <span>✅</span>
          <span>Valid HTTPS NDEF URI. Native tap will launch browser directly on iOS & Android.</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {supported ? (
          <>
            <button
              type="button"
              onClick={writeNdef}
              disabled={busy || testBusy || !fullUrl}
              className="w-full rounded-xl border border-moss/30 bg-moss px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-moss/90 disabled:opacity-50 transition"
            >
              {busy ? "Waiting for NTAG215 sticker…" : "Flash NDEF URI to sticker (Web NFC)"}
            </button>
            <button
              type="button"
              onClick={testTag}
              disabled={busy || testBusy}
              className="w-full rounded-xl border border-moss/25 bg-moss/5 px-3 py-1.5 text-xs font-semibold text-moss hover:bg-moss/10 disabled:opacity-50 transition"
            >
              {testBusy ? "Scanning… Tap sticker to back of phone" : "Test / Verify Tag NDEF format"}
            </button>
          </>
        ) : (
          <div className="rounded-xl bg-mist/50 p-2.5 text-xs text-ink/75 space-y-1">
            <p className="font-medium text-moss">Web NFC is not active on this browser.</p>
            <p className="text-[11px] leading-relaxed">
              Writing directly from the browser requires <strong>Chrome on Android</strong>.
            </p>
            <p className="text-[11px] leading-relaxed">
              To flash this sticker right now:
            </p>
            <ul className="list-disc pl-4 text-[11px] space-y-0.5">
              <li>
                <strong>Using ESP32 + RC522:</strong> Open <code className="font-mono bg-white px-1 rounded">firmware/nfc_ndef_flasher/nfc_ndef_flasher.ino</code> and upload via Arduino IDE.
              </li>
              <li>
                <strong>Using Phone (NFC Tools):</strong> Click <em>Copy link</em> below, open NFC Tools, choose <strong>Write → Add a record → Custom URL/URI</strong> (do NOT choose Text), and tap your sticker.
              </li>
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={copyUrl}
            className="text-xs font-medium text-moss underline hover:text-leaf"
          >
            Copy NDEF URL
          </button>
          <span className="text-[11px] text-ink/45 font-mono">Format: NFC Forum Type 2 NDEF</span>
        </div>
      </div>

      {msg ? (
        <div
          className={`rounded-xl p-2.5 text-xs ${
            statusType === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : statusType === "error"
              ? "border border-red-200 bg-red-50 text-red-800"
              : statusType === "warn"
              ? "border border-amber-200 bg-amber-50 text-amber-800"
              : "border border-moss/15 bg-mist text-ink/80"
          }`}
        >
          {msg}
        </div>
      ) : null}
    </div>
  );
}
