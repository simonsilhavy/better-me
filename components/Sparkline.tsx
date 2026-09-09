/**
 * A bar sparkline, drawn as plain SVG. Recharts per card would mean a chart
 * runtime for every habit on the page; this is a dozen rectangles.
 */
export function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length === 0) return null;

  const max = Math.max(...values, 1);
  const width = 100;
  const height = 24;
  const gap = 1;
  const barWidth = Math.max(1, width / values.length - gap);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-6 w-full"
      role="img"
      aria-label={`Průběh za období, ${values.length} dní`}
    >
      {values.map((v, i) => {
        const h = v === 0 ? 1 : Math.max(1.5, (v / max) * height);
        return (
          <rect
            key={i}
            x={i * (barWidth + gap)}
            y={height - h}
            width={barWidth}
            height={h}
            rx={0.6}
            fill={color}
            fillOpacity={v === 0 ? 0.18 : 1}
          />
        );
      })}
    </svg>
  );
}
