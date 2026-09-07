import { AFRICA_MAINLAND, AFRICA_MADAGASCAR } from "@/lib/africaOutline";
import { ETHIOPIA_BORDER } from "@/lib/ethiopiaBorder";

// Same projection idea as EthiopiaCoordinateMap, but framed to the whole
// continent so Ethiopia's real outline can be highlighted at its real
// position within Africa -- a locator inset, not a replacement for the
// detailed regional map.
const ALL_POINTS = [...AFRICA_MAINLAND, ...AFRICA_MADAGASCAR];
const LONS = ALL_POINTS.map(([lon]) => lon);
const LATS = ALL_POINTS.map(([, lat]) => lat);
const PAD = 3;
const LON_MIN = Math.min(...LONS) - PAD;
const LON_MAX = Math.max(...LONS) + PAD;
const LAT_MIN = Math.min(...LATS) - PAD;
const LAT_MAX = Math.max(...LATS) + PAD;

const VIEW = 120;

function project([lon, lat]: [number, number]): [number, number] {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * VIEW;
  const y = VIEW - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * VIEW;
  return [x, y];
}

function ringPath(ring: [number, number][]): string {
  return (
    ring
      .map((point, i) => {
        const [x, y] = project(point);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + " Z"
  );
}

const AFRICA_PATH = `${ringPath(AFRICA_MAINLAND)} ${ringPath(AFRICA_MADAGASCAR)}`;
const ETHIOPIA_PATH = ringPath(ETHIOPIA_BORDER);

export function AfricaLocatorMap() {
  return (
    <div className="w-full border border-line bg-paper p-2.5">
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="w-full">
        <title>Ethiopia&apos;s location within Africa</title>
        <path d={AFRICA_PATH} className="fill-belt-100 stroke-belt-300" strokeWidth="0.75" />
        <path d={ETHIOPIA_PATH} className="fill-belt-700 stroke-belt-900" strokeWidth="0.75" />
      </svg>
      <p className="mt-1.5 text-center font-mono text-[10px] uppercase tracking-tag text-ink-soft">
        Ethiopia in Africa
      </p>
    </div>
  );
}
