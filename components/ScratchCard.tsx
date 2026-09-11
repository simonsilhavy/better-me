'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** How much of the foil has to go before the rest gives up on its own. */
const REVEAL_AT = 0.45;

/** Radius of the scratched track, in CSS pixels. */
const BRUSH = 24;

/**
 * A foil over a card — sometimes one you can rub off, sometimes one that does
 * not budge yet.
 *
 * The children are rendered the whole time and the canvas simply covers them,
 * because that is what makes rubbing feel like uncovering rather than like
 * waiting for a progress bar.
 *
 * `locked` is the honest state for "not yet": the foil takes no input at all
 * and says so, rather than letting you rub at something that will never come
 * off. Everything under it is `inert` either way.
 */
export function ScratchCard({
  onReveal,
  title,
  hint,
  locked = false,
  children,
}: {
  onReveal: () => void;
  /** Printed on the foil — says what is under it. */
  title: string;
  /** Smaller line under it, e.g. when it becomes scratchable. */
  hint?: string;
  /** When true the foil refuses to come off and takes no pointer input. */
  locked?: boolean;
  children: React.ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const down = useRef(false);
  const done = useRef(false);
  const [fading, setFading] = useState(false);

  const paintFoil = useCallback(() => {
    const el = canvas.current;
    const box = wrap.current;
    if (!el || !box) return;

    const dpr = window.devicePixelRatio || 1;
    const w = box.clientWidth;
    const h = box.clientHeight;
    if (w === 0 || h === 0) return;

    el.width = Math.round(w * dpr);
    el.height = Math.round(h * dpr);
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;

    const ctx = el.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);

    // Brushed metal: a diagonal sheen with a few lighter bands across it.
    // A locked foil is duller — it should not look like it invites rubbing.
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    if (locked) {
      sheen.addColorStop(0, '#232734');
      sheen.addColorStop(0.5, '#2d3242');
      sheen.addColorStop(1, '#212430');
    } else {
      sheen.addColorStop(0, '#2b3040');
      sheen.addColorStop(0.42, '#3a4157');
      sheen.addColorStop(0.5, '#4a5270');
      sheen.addColorStop(0.58, '#3a4157');
      sheen.addColorStop(1, '#272b38');
    }
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#e8eaf0';
    ctx.lineWidth = 1;
    for (let x = -h; x < w; x += 7) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + h, 0);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    const baseline = h / 2 - (locked ? 4 : 0);

    if (locked) {
      ctx.font = '18px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('🔒', w / 2, baseline - 26);
    }

    ctx.fillStyle = locked ? '#8b90a3' : '#c3c8d6';
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(title, w / 2, baseline - (hint ? 6 : -4));
    if (hint) {
      ctx.fillStyle = locked ? '#6f748a' : '#8b90a3';
      ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(hint, w / 2, baseline + 14);
    }
  }, [title, hint, locked]);

  useEffect(() => {
    paintFoil();
    const box = wrap.current;
    if (!box || typeof ResizeObserver === 'undefined') return;
    // Repainting on resize would wipe the scratching, so it only tracks size
    // while the foil is still whole.
    const ro = new ResizeObserver(() => {
      if (!done.current && !down.current) paintFoil();
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, [paintFoil]);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setFading(true);
    // Let the foil fade before the parent drops it, so it does not blink out.
    setTimeout(onReveal, 420);
  }, [onReveal]);

  /** Share of fully erased pixels, sampled on a coarse grid to stay cheap. */
  const scratchedFraction = () => {
    const el = canvas.current;
    const ctx = el?.getContext('2d', { willReadFrequently: true });
    if (!el || !ctx) return 0;
    const step = 8;
    const data = ctx.getImageData(0, 0, el.width, el.height).data;
    let clear = 0;
    let total = 0;
    for (let y = 0; y < el.height; y += step) {
      for (let x = 0; x < el.width; x += step) {
        total++;
        if (data[(y * el.width + x) * 4 + 3] === 0) clear++;
      }
    }
    return total === 0 ? 0 : clear / total;
  };

  const erase = (e: React.PointerEvent) => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx || done.current) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = BRUSH * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (last.current) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, BRUSH, 0, Math.PI * 2);
    ctx.fill();

    last.current = { x, y };
    if (scratchedFraction() >= REVEAL_AT) finish();
  };

  return (
    <div ref={wrap} className="relative">
      {/* inert, not aria-hidden: the answer field underneath is focusable, and
          hiding focusable content from assistive tech without disabling it is
          a trap. inert takes it out of both the tab order and the a11y tree. */}
      <div inert={!fading}>{children}</div>

      <canvas
        ref={canvas}
        className="absolute inset-0 rounded-xl transition-opacity duration-300"
        style={{
          opacity: fading ? 0 : 1,
          touchAction: 'none',
          cursor: fading || locked ? 'default' : 'grab',
          pointerEvents: fading || locked ? 'none' : 'auto',
        }}
        onPointerDown={(e) => {
          if (locked) return;
          down.current = true;
          last.current = null;
          e.currentTarget.setPointerCapture(e.pointerId);
          erase(e);
        }}
        onPointerMove={(e) => {
          if (!locked && down.current) erase(e);
        }}
        onPointerUp={() => {
          down.current = false;
          last.current = null;
        }}
        onPointerLeave={() => {
          down.current = false;
          last.current = null;
        }}
      />

      {!fading && !locked && (
        <button
          type="button"
          onClick={finish}
          className="bm-press absolute bottom-2 right-2 rounded-lg border border-[var(--border)] bg-[var(--panel)]/80 px-2.5 py-1 text-[11px] text-[var(--muted)] backdrop-blur"
        >
          Odkrýt rovnou
        </button>
      )}
    </div>
  );
}
