type Point = { label: string; value: number };

/** Dependency-free inline-SVG line chart — the only chart shape here that
 * actually benefits from SVG (a continuous trend over time). No charting
 * library pulled in for what's a single polyline. */
export function LineChart({
  data,
  height = 160,
  color = "#8a5a35",
  formatValue,
}: {
  data: Point[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}) {
  if (data.length === 0) {
    return <p className="font-body text-sm text-ink-soft">No data yet.</p>;
  }

  const width = 600;
  const padding = 24;
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  const coords = data.map((d, i) => ({
    x: padding + i * stepX,
    y: padding + (height - padding * 2) * (1 - (d.value - min) / range),
  }));

  const last = data[data.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Line chart">
        <polyline
          points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={2}
        />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={2.5} fill={color} />
        ))}
      </svg>
      <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-tag text-ink-soft">
        <span>{data[0].label}</span>
        <span>{formatValue ? formatValue(last.value) : last.value}</span>
        <span>{last.label}</span>
      </div>
    </div>
  );
}
