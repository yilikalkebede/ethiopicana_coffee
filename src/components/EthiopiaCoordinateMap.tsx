import Link from "next/link";
import { ETHIOPIA_BORDER } from "@/lib/ethiopiaBorder";
import { AfricaLocatorMap } from "@/components/AfricaLocatorMap";

// Padded bounding box around the real border polygon (see
// src/lib/ethiopiaBorder.ts) -- the frame the outline and every marker are
// projected into, so a region's dot always lands inside its own country.
const LONS = ETHIOPIA_BORDER.map(([lon]) => lon);
const LATS = ETHIOPIA_BORDER.map(([, lat]) => lat);
const PAD = 0.6;
const LON_MIN = Math.min(...LONS) - PAD;
const LON_MAX = Math.max(...LONS) + PAD;
const LAT_MIN = Math.min(...LATS) - PAD;
const LAT_MAX = Math.max(...LATS) + PAD;

const VIEW_W = 400;
const VIEW_H = 340;
const MARGIN = 24;

function project([lon, lat]: [number, number]): [number, number] {
  const x = MARGIN + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (VIEW_W - MARGIN * 2);
  const y = VIEW_H - MARGIN - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * (VIEW_H - MARGIN * 2);
  return [x, y];
}

const BORDER_PATH =
  ETHIOPIA_BORDER.map((point, i) => {
    const [x, y] = project(point);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z";

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
    <div className="relative border border-line bg-belt-50/50 p-6">
      <div className="absolute right-4 top-4 z-10">
        <AfricaLocatorMap />
      </div>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full">
        <title>Map of Ethiopia with our coffee regions marked by real coordinates</title>
        <path d={BORDER_PATH} className="fill-belt-100 stroke-belt-500" strokeWidth="1.5" />

        {plotted.map((region) => {
          const [x, y] = project([region.longitude, region.latitude]);
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
        Boundary simplified for display · regions plotted by real coordinates
      </p>
    </div>
  );
}
