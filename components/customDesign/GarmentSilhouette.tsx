import { GARMENT_VIEWBOX, type GarmentTemplate } from "@/lib/customDesign";

export default function GarmentSilhouette({
  template,
  className,
}: {
  template: GarmentTemplate;
  className?: string;
}) {
  if (template.kind === "image") {
    // A local static asset also drawn straight into canvas ops elsewhere — next/image's layout machinery buys nothing here.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={template.imageSrc} alt={template.label} className={`${className} object-contain`} />;
  }

  return (
    <svg
      viewBox={`0 0 ${GARMENT_VIEWBOX.width} ${GARMENT_VIEWBOX.height}`}
      className={className}
      aria-hidden
    >
      {template.polygons.map((polygon, i) => (
        <polygon
          key={i}
          points={polygon.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="#050505"
          stroke="#2a2a2a"
          strokeWidth={2}
        />
      ))}
      {template.decorations?.map((d, i) => (
        <polyline
          key={i}
          points={d.points.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke="#1c1c1c"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
