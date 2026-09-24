"use client";

import ElementBoxes from "@/components/go/ElementBoxes";

/**
 * Through the door: the four elements, immediately.
 *
 * No intro and no chrome on purpose. The portal belongs on the way in
 * (see GoGate) — once someone is through it, anything between them and
 * the four doors is just a delay, and the doors say what they are without
 * a heading above them telling them to pick one.
 */
export default function SsbdExperience() {
  return (
    <div className="go-root">
      <div className="go-stage">
        <ElementBoxes />
      </div>
    </div>
  );
}
