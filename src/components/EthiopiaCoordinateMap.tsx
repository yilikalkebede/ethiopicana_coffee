import Link from "next/link";

// Ethiopia's real approximate coordinate range, used only as an axis scale
// for plotting real region coordinates -- not a claimed border shape. This
// is a schematic data plot, not a map illustration, per the brand spec's
// rule against presenting invented/approximate geography as authentic.
const LAT_MIN = 3;
const LAT_MAX = 15;
const LON_MIN = 33;
const LON_MAX = 48;

// Several regions sit close together on the real map (Yirgacheffe/Sidama/Guji,
// Limu/Jimma) -- these per-region label offsets only keep the text legible,
// they never move the plotted marker itself.
const LABEL_OFFSET: Record<string, { dx: number; dy: number }> = {
  yirgacheffe: { dx: -38, dy: 4 },
  sidama: { dx: 30, dy: -8 },
  guji: { dx: 10, dy: 24 },
  limu: { dx: -22, dy: -6 },
  jimma: { dx: 6, dy: 18 },
  harrar: { dx: 0, dy: -11 },
};

type MapRegion = {
  name: string;
  match: string;
  latitude: number | null;
  longitude: number | null;
};

export function EthiopiaCoordinateMap({ regions }: { regions: MapRegion[] }) {
  const plotted = regions.filter(
    (r): r is MapRegion & { latitude: number; longitude: number } => r.latitude != null && r.longitude != null
  );

  if (plotted.length === 0) return null;

  return (
    <div className="border border-line bg-belt-50/50 p-6">
      <svg viewBox="0 0 400 320" className="w-full">
        <title>Coordinate plot of Ethiopicana&apos;s coffee regions by real latitude and longitude — select a region to view its detail page</title>
        <rect x="40" y="10" width="340" height="270" fill="none" stroke="currentColor" className="text-line" strokeWidth="1" />

        {/* Compass mark */}
        <g className="text-ink-soft">
          <line x1="20" y1="40" x2="20" y2="10" stroke="currentColor" strokeWidth="1" />
          <polygon points="20,4 16,14 24,14" fill="currentColor" />
          <text x="20" y="52" textAnchor="middle" className="font-mono" fontSize="9" fill="currentColor">N</text>
        </g>

        {/* Axis labels */}
        <text x="210" y="298" textAnchor="middle" className="font-mono" fontSize="10" fill="currentColor">
          {LON_MIN}°E — {LON_MAX}°E
        </text>
        <text x="14" y="145" textAnchor="middle" className="font-mono" fontSize="10" fill="currentColor" transform="rotate(-90 14 145)">
          {LAT_MIN}°N — {LAT_MAX}°N
        </text>

        {plotted.map((region) => {
          const x = 40 + ((region.longitude - LON_MIN) / (LON_MAX - LON_MIN)) * 340;
          const y = 280 - ((region.latitude - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 270;
          const offset = LABEL_OFFSET[region.match] ?? { dx: 0, dy: -11 };
          return (
            <g key={region.match}>
              <Link href={`/origins/${region.match}`}>
                <circle cx={x} cy={y} r="6" className="fill-belt-700 hover:fill-belt-900" />
                <text
                  x={x + offset.dx}
                  y={y + offset.dy}
                  textAnchor="middle"
                  className="font-mono fill-ink"
                  fontSize="11"
                >
                  {region.name}
                </text>
              </Link>
            </g>
          );
        })}
      </svg>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-tag text-ink-soft">
        Approximate positions by real coordinates — not to scale
      </p>
    </div>
  );
}
