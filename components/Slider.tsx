'use client';

export function Slider({
  value,
  min,
  max,
  step,
  color,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  color?: string;
  onChange: (next: number) => void;
  ariaLabel: string;
}) {
  const fill = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <input
      type="range"
      className="bm-range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      style={
        {
          '--fill': `${fill}%`,
          ...(color ? { '--fill-color': color } : {}),
        } as React.CSSProperties
      }
    />
  );
}
