type BarDatum = { label: string; value: number };

/** Dependency-free ranked horizontal bar list — plain SVG rects rather than
 * CSS width bars so it stays consistent with LineChart's rendering approach. */
export function BarChart({
  data,
  color = "#8a5a35",
  formatValue,
}: {
  data: BarDatum[];
  color?: string;
  formatValue?: (v: number) => string;
}) {
  if (data.length === 0) {
    return <p className="font-body text-sm text-ink-soft">No data yet.</p>;
  }

  const width = 600;
  const barHeight = 20;
  const gap = 12;
  const labelWidth = 160;
  const chartWidth = width - labelWidth;
  const height = data.length * (barHeight + gap);
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Bar chart">
      {data.map((d, i) => {
        const y = i * (barHeight + gap);
        const barWidth = (d.value / max) * (chartWidth - 80);
        return (
          <g key={d.label}>
            <text x={0} y={y + barHeight / 2 + 4} className="fill-current text-ink" fontSize={11}>
              {d.label.length > 22 ? `${d.label.slice(0, 21)}…` : d.label}
            </text>
            <rect x={labelWidth} y={y} width={barWidth} height={barHeight} fill={color} />
            <text x={labelWidth + barWidth + 8} y={y + barHeight / 2 + 4} className="fill-current text-ink-soft" fontSize={11}>
              {formatValue ? formatValue(d.value) : d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
