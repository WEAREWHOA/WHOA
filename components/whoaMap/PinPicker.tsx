"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, CircleMarker } from "leaflet";

/**
 * Dropping the pin yourself.
 *
 * Geocoding a city puts the pin in the middle of Lisbon. The sticker is
 * on one particular lamppost, and the difference between those two is
 * most of why a map of stickers is worth looking at at all.
 *
 * Optional on purpose. Somebody sending in a photo from six months ago
 * may genuinely only know the city, and demanding a precise spot would
 * lose that submission rather than improve it. Leave it alone and the
 * city gets geocoded exactly as before.
 *
 * The map is loaded in an effect, like the one on the public page, and
 * for the same reason: Leaflet reaches for `window` as it loads.
 */

/** Rounded before it is sent. Seven decimals is a centimetre, which is
 *  a precision nobody has and a privacy question nobody asked for;
 *  five is about a metre and is plenty for finding a lamppost. */
function round(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}

export default function PinPicker() {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<CircleMarker | null>(null);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !holder.current || map.current) return;

      const instance = L.map(holder.current, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxBounds: [
          [-85, -180],
          [85, 180],
        ],
        maxBoundsViscosity: 1,
        // On by default here, unlike the public map: this one is a tool
        // somebody is actively working in, and zooming to a street is
        // the whole job.
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(instance);

      instance.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        const lat = round(e.latlng.lat);
        const lng = round(e.latlng.lng);

        if (marker.current) marker.current.setLatLng([lat, lng]);
        else {
          marker.current = L.circleMarker([lat, lng], {
            radius: 9,
            color: "#ff7a00",
            weight: 3,
            fillColor: "#ff7a00",
            fillOpacity: 0.5,
          }).addTo(instance);
        }
        setPoint({ lat, lng });
      });

      map.current = instance;
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  /** The phone that is standing next to the sticker already knows. */
  async function useMyLocation() {
    if (!navigator.geolocation) {
      setLocateError("This browser can't share a location. Drop the pin by hand instead.");
      return;
    }
    setLocating(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = round(position.coords.latitude);
        const lng = round(position.coords.longitude);
        setPoint({ lat, lng });
        setLocating(false);

        const instance = map.current;
        if (!instance) return;
        const L = await import("leaflet");
        instance.setView([lat, lng], 17);
        if (marker.current) marker.current.setLatLng([lat, lng]);
        else {
          marker.current = L.circleMarker([lat, lng], {
            radius: 9,
            color: "#ff7a00",
            weight: 3,
            fillColor: "#ff7a00",
            fillOpacity: 0.5,
          }).addTo(instance);
        }
      },
      () => {
        // Deliberately one message whichever way it failed. Refused,
        // unavailable and timed out all have the same answer for the
        // person: put it in by hand.
        setLocating(false);
        setLocateError("Couldn't get your location. Tap the map to drop the pin instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function clear() {
    setPoint(null);
    setLocateError(null);
    if (marker.current && map.current) {
      map.current.removeLayer(marker.current);
      marker.current = null;
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">
        Exactly where?{" "}
        <span className="font-normal text-muted">
          Optional. Without it we&apos;ll just place it in the city.
        </span>
      </span>

      <div
        ref={holder}
        className="h-64 w-full overflow-hidden rounded-xl border border-border"
        role="application"
        aria-label="Tap the map to drop a pin where you saw it"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="border-border-strong hover:border-flame-2/60 rounded-full border px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors disabled:opacity-50"
        >
          {locating ? "Finding you…" : "Use my location"}
        </button>

        {point ? (
          <>
            <span className="text-xs text-muted">
              Pinned at {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
            </span>
            <button
              type="button"
              onClick={clear}
              className="text-xs text-muted underline underline-offset-2 hover:text-flame-2"
            >
              Clear
            </button>
          </>
        ) : (
          <span className="text-xs text-muted">Tap the map to drop a pin.</span>
        )}
      </div>

      {locateError && <span className="text-flame-3 text-xs">{locateError}</span>}

      {/* Empty when nothing is pinned, so the server sees no coordinates
          and falls back to geocoding the city, exactly as before. */}
      <input type="hidden" name="latitude" value={point?.lat ?? ""} />
      <input type="hidden" name="longitude" value={point?.lng ?? ""} />
    </div>
  );
}
