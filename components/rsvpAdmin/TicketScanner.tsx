"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import { scanTicketAction, type ScanResult } from "@/app/rsvp-admin/actions";

/**
 * How long a verdict stays up before the scanner will read again.
 *
 * Without it one ticket held in frame re-scans every animation frame, and
 * the second read of a ticket that just succeeded comes back "already
 * used" — the door would refuse the person it just admitted.
 */
const VERDICT_MS = 2500;

type Verdict = ScanResult & { at: number };

function verdictStyle(status: ScanResult["status"]): { box: string; heading: string } {
  if (status === "admitted") {
    return { box: "border-tier-icon bg-tier-icon/15 text-tier-icon", heading: "LET THEM IN" };
  }
  if (status === "already-used") {
    return { box: "border-flame-1 bg-flame-1/15 text-flame-3", heading: "REFUSED — ALREADY USED" };
  }
  if (status === "wrong-event") {
    return { box: "border-flame-1 bg-flame-1/15 text-flame-3", heading: "REFUSED — WRONG EVENT" };
  }
  if (status === "not-found") {
    return { box: "border-flame-1 bg-flame-1/15 text-flame-3", heading: "REFUSED — NOT A TICKET" };
  }
  if (status === "unauthorized") {
    return { box: "border-border-strong bg-surface-raised text-muted", heading: "YOU CAN'T SCAN" };
  }
  if (status === "unreadable") {
    return { box: "border-border-strong bg-surface-raised text-muted", heading: "NOT ONE OF OURS" };
  }
  return { box: "border-border-strong bg-surface-raised text-muted", heading: "SOMETHING WENT WRONG" };
}

function timeOnly(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * The door scanner: camera in, verdict out.
 *
 * Decoding happens on-device with jsQR against frames pulled off the video
 * — no image ever leaves the phone, and it works the same on iOS as on
 * Android (Safari still has no BarcodeDetector, so the platform API would
 * have meant shipping this fallback anyway).
 *
 * The camera only runs while someone is actually working the door: it's
 * started by a tap and stopped on unmount, because a page that silently
 * holds a camera open is both a battery problem and a trust problem.
 */
export default function TicketScanner({
  eventId,
  eventTitle,
  onAdmitted,
}: {
  /** Tonight's event — anything else scanned is refused as wrong-event. */
  eventId: string;
  eventTitle: string;
  /** Lets the surrounding list update its counts without a page load. */
  onAdmitted?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  // Read inside the animation loop, which closes over its first render —
  // a ref rather than state so the loop always sees the current value.
  const busyRef = useRef(false);
  const lastTextRef = useRef("");

  const [scanning, setScanning] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  // Whatever happens — navigating away, switching tabs, closing the phone —
  // the camera must not be left running.
  useEffect(() => stop, [stop]);

  const handleText = useCallback(
    async (text: string) => {
      busyRef.current = true;
      try {
        const result = await scanTicketAction(text, eventId);
        setVerdict({ ...result, at: Date.now() });
        if (result.status === "admitted") onAdmitted?.();
      } catch {
        setVerdict({ status: "error", message: "Couldn't reach the guest list.", at: Date.now() });
      }
      window.setTimeout(() => {
        busyRef.current = false;
        lastTextRef.current = "";
      }, VERDICT_MS);
    },
    [eventId, onAdmitted],
  );

  const start = useCallback(async () => {
    setCameraError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        window.isSecureContext === false
          ? "The camera needs a secure (https) connection."
          : "This browser won't give us a camera. Use the guest list below instead.",
      );
      return;
    }

    try {
      // The rear camera, which is the one pointed at a ticket.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      // iOS refuses to play an inline video without both of these.
      video.setAttribute("playsinline", "true");
      video.muted = true;
      await video.play();
      setScanning(true);

      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);

        const canvas = canvasRef.current;
        if (!canvas || !video.videoWidth || busyRef.current) return;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
        if (!found?.data || found.data === lastTextRef.current) return;

        lastTextRef.current = found.data;
        void handleText(found.data);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      setCameraError(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow it in your browser settings, or use the guest list below."
          : "Couldn't open the camera. Use the guest list below instead.",
      );
      stop();
    }
  }, [handleText, stop]);

  const style = verdict ? verdictStyle(verdict.status) : null;

  return (
    <div className="card-surface rounded-2xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl tracking-wide">Scan tickets</h3>
          <p className="mt-0.5 text-sm text-muted">
            Point the camera at a guest&apos;s QR code — {eventTitle}.
          </p>
        </div>
        <button
          type="button"
          onClick={scanning ? stop : start}
          className={
            scanning
              ? "rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold uppercase text-muted transition-colors hover:text-foreground"
              : "btn-flame rounded-full px-6 py-2.5 text-sm font-semibold uppercase"
          }
        >
          {scanning ? "Stop camera" : "Start scanning"}
        </button>
      </div>

      {cameraError && (
        <p className="border-flame-1/40 bg-flame-1/10 text-flame-3 mt-4 rounded-lg border px-4 py-3 text-sm">
          {cameraError}
        </p>
      )}

      {/* The verdict sits above the picture, big enough to read at arm's
          length in the dark, because that's the only thing the person on
          the door actually needs to look at. */}
      {verdict && style && (
        <div className={`mt-4 rounded-2xl border-2 px-5 py-4 ${style.box}`}>
          <p className="font-display text-2xl tracking-wide sm:text-3xl">{style.heading}</p>
          {verdict.status !== "unauthorized" && "name" in verdict && verdict.name && (
            <p className="mt-1 text-lg font-semibold text-foreground">{verdict.name}</p>
          )}
          {verdict.status === "already-used" && "checkedInAt" in verdict && (
            <p className="mt-1 text-sm">
              Came in at {timeOnly(verdict.checkedInAt)}
              {verdict.checkedInBy ? ` · scanned by ${verdict.checkedInBy}` : ""}
            </p>
          )}
          {verdict.status === "wrong-event" && (
            <p className="mt-1 text-sm">That ticket is for a different event.</p>
          )}
          {verdict.status === "unauthorized" && (
            <p className="mt-1 text-sm">Your session ended — log in again.</p>
          )}
          {verdict.status === "error" && "message" in verdict && (
            <p className="mt-1 text-sm">{verdict.message}</p>
          )}
        </div>
      )}

      <div className={`mt-4 overflow-hidden rounded-2xl bg-black ${scanning ? "" : "hidden"}`}>
        <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted />
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {!scanning && !cameraError && (
        <p className="mt-4 text-sm text-muted">
          Camera stays off until you start it, and stops when you leave this tab.
        </p>
      )}
    </div>
  );
}
