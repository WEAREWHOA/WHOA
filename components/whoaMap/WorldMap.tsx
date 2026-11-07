"use client";

import { useEffect, useRef } from "react";

import type { Map as LeafletMap } from "leaflet";
import { PIN_KIND_LABELS, placeLabel, type MapPin } from "@/lib/whoaMap";
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL } from "@/lib/mapTiles";

/**
 * The pins, on a real map.
 *
 * Leaflet rather than Google Maps, for one practical reason: Google's
 * JavaScript map needs a billable API key, and there is not one here.
 * Leaflet needs none and draws the same thing.
 *
 * Imported inside an effect rather than at the top of the file because
 * Leaflet reaches for `window` as it loads. At the top it would run
 * during the server render and take the whole page down with it.
 */

const COLORS: Record<string, string> = {
  sticker: "#29e6ff",
  apparel: "#ff7a00",
};

export default function WorldMap({ pins }: { pins: MapPin[] }) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      // Strict Mode mounts an effect twice in development, and Leaflet
      // refuses a container it is already in. Checked rather than
      // guarded with a flag so a genuine remount still works.
      if (cancelled || !holder.current || map.current) return;

      const instance = L.map(holder.current, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        // Dragging past the edge of the world shows grey. The bounds
        // keep the map on the map.
        maxBounds: [
          [-85, -180],
          [85, 180],
        ],
        maxBoundsViscosity: 1,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: TILE_MAX_ZOOM,
      }).addTo(instance);

      for (const pin of pins) {
        if (pin.latitude === null || pin.longitude === null) continue;

        const color = COLORS[pin.kind] ?? COLORS.sticker;
        const marker = L.circleMarker([pin.latitude, pin.longitude], {
          radius: 7,
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.45,
        }).addTo(instance);

        // Built with the DOM rather than an HTML string, so a place
        // name with a < in it is text and not markup. This is
        // submitted content on a public page; it does not get to write
        // HTML.
        const popup = document.createElement("div");
        popup.className = "wm-popup";

        const image = document.createElement("img");
        image.src = pin.photoUrl;
        image.alt = `${PIN_KIND_LABELS[pin.kind]} in ${placeLabel(pin)}`;
        image.loading = "lazy";
        popup.appendChild(image);

        const kind = document.createElement("strong");
        kind.textContent = PIN_KIND_LABELS[pin.kind];
        kind.style.color = color;
        popup.appendChild(kind);

        const place = document.createElement("p");
        place.textContent = placeLabel(pin);
        popup.appendChild(place);

        const who = document.createElement("p");
        who.className = "wm-by";
        who.textContent = `Sent in by ${pin.uploadedBy}`;
        popup.appendChild(who);

        marker.bindPopup(popup);
      }

      map.current = instance;
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [pins]);

  return (
    <div
      ref={holder}
      className="whoa-map-dark h-[420px] w-full overflow-hidden rounded-2xl border border-border sm:h-[560px]"
      // Leaflet measures its container, and a container with no height
      // yet renders a map one pixel tall. The class above gives it one
      // before Leaflet ever looks.
      role="application"
      aria-label="Map of WHOA stickers and apparel spotted around the world"
    />
  );
}
