"use client";

import { useEffect, useRef } from "react";

// ── Finance vocabulary for the rain columns ──────────────────────────────────
const WORDS = [
  "₹","$","€","£","¥","%","∑","Δ","→","≈",
  "GST","TDS","PAN","ITR","ROC","MCA",
  "P&L","EBIT","PAT","PBT","NAV","NPV","IRR","DCF",
  "WACC","CAGR","ROCE","ROE","ROI","EPS","PE",
  "18%","28%","12%","5%","30%","2.5%","7.2%","0.5%",
  "₹1L","₹10L","₹1Cr","₹50L","₹2Cr","₹500","₹99",
  "1.2x","3x","10x","2.8x","0.9x",
  "EBITDA","Revenue","Margin","Equity","Debt","Assets",
  "Runway","Burn","CAC","LTV","ARR","MRR","ARPU",
  "Break-Even","Cash Flow","Working Capital",
  "4,20,000","12,50,000","99,999","1,00,00,000",
  "Profit","Loss","Tax","Audit","Balance","Credit","Debit",
  "Seed","Series A","Series B","IPO","Exit","Valuation",
];

// Color themes: [r,g,b] — purple, violet, teal, amber, green, blue
const PALETTE: [number, number, number][] = [
  [139, 92, 246],
  [124, 58, 237],
  [99,  102, 241],
  [251, 191, 36],
  [34,  197, 94],
  [56,  189, 248],
];

interface RainDrop {
  colX: number;       // fixed screen X for this column
  y: number;          // current screen Y
  speed: number;      // px per frame
  wordIdx: number;
  fontSize: number;
  opacity: number;
  color: [number, number, number];
  trail: number;      // how many trail chars to show
  trailY: number[];   // y positions of trail
  trailAlpha: number[];
}

interface Sparkline {
  x: number; y: number;
  w: number; h: number;
  pts: number[];
  color: [number, number, number];
  opacity: number;
  vx: number; vy: number;
  label: string;
}

interface Candle {
  x: number; y: number;
  bars: { o: number; c: number; hi: number; lo: number }[];
  color: [number, number, number];
  opacity: number;
  vx: number; vy: number;
  bw: number; h: number;
}

export default function Background3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef   = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rawCtx = canvas.getContext("2d");
    if (!rawCtx) return;
    const G = rawCtx as CanvasRenderingContext2D;
    const C = canvas as HTMLCanvasElement;

    let W = 0, H = 0;
    let drops: RainDrop[]   = [];
    let sparks: Sparkline[] = [];
    let candles: Candle[]   = [];

    function rnd(a: number, b: number) { return a + Math.random() * (b - a); }
    function rndInt(a: number, b: number) { return Math.floor(rnd(a, b)); }
    function rndPalette(): [number, number, number] { return PALETTE[rndInt(0, PALETTE.length)]; }

    function buildDrops() {
      drops = [];
      const COL_W = 52;
      const numCols = Math.ceil(W / COL_W) + 2;
      for (let c = 0; c < numCols; c++) {
        const TRAIL = rndInt(3, 9);
        drops.push({
          colX: c * COL_W + rnd(-10, 10),
          y: rnd(-H, 0),
          speed: rnd(0.4, 1.6),
          wordIdx: rndInt(0, WORDS.length),
          fontSize: rndInt(11, 17),
          opacity: rnd(0.12, 0.38),
          color: rndPalette(),
          trail: TRAIL,
          trailY: Array.from({ length: TRAIL }, (_, i) => -i * 22),
          trailAlpha: Array.from({ length: TRAIL }, (_, i) => 1 - i / TRAIL),
        });
      }
    }

    function buildSparks() {
      sparks = Array.from({ length: 14 }, () => {
        const w = rnd(120, 260);
        const h = rnd(50, 90);
        return {
          x: rnd(0, W - w), y: rnd(60, H - h - 60),
          w, h,
          pts: Array.from({ length: 18 }, () => Math.random()),
          color: rndPalette(),
          opacity: rnd(0.08, 0.22),
          vx: rnd(-0.18, 0.18), vy: rnd(-0.12, 0.12),
          label: WORDS[rndInt(0, WORDS.length)],
        };
      });
    }

    function buildCandles() {
      candles = Array.from({ length: 8 }, () => {
        const bw = rnd(6, 14);
        const h  = rnd(60, 130);
        return {
          x: rnd(0, W - 120), y: rnd(60, H - h - 60),
          bars: Array.from({ length: 8 }, () => {
            const o = Math.random(), c2 = Math.random();
            return { o, c: c2, hi: Math.max(o,c2)+rnd(0,0.12), lo: Math.min(o,c2)-rnd(0,0.12) };
          }),
          color: rndPalette(),
          opacity: rnd(0.09, 0.22),
          vx: rnd(-0.15, 0.15), vy: rnd(-0.1, 0.1),
          bw, h,
        };
      });
    }

    function init() {
      W = window.innerWidth;
      H = window.innerHeight;
      C.width  = W;
      C.height = H;
      buildDrops();
      buildSparks();
      buildCandles();
    }

    init();
    window.addEventListener("resize", init);

    let t = 0;

    function frame() {
      t += 0.008;

      // Semi-transparent clear — creates trailing fade effect
      G.fillStyle = "rgba(9,9,11,0.18)";
      G.fillRect(0, 0, W, H);

      // ── Rain columns ──────────────────────────────────────────────
      for (const d of drops) {
        d.y += d.speed;
        if (d.y > H + 80) {
          d.y = rnd(-200, -40);
          d.wordIdx = rndInt(0, WORDS.length);
          d.speed   = rnd(0.4, 1.6);
          d.opacity = rnd(0.12, 0.38);
          d.color   = rndPalette();
        }

        const [r, g, b] = d.color;
        const word = WORDS[d.wordIdx];
        G.font = `bold ${d.fontSize}px 'Courier New', monospace`;

        // Draw trail (fading copies going upward)
        const step = d.fontSize + 4;
        for (let k = d.trail - 1; k >= 0; k--) {
          const ty = d.y - k * step;
          if (ty < -20 || ty > H + 20) continue;
          const a = d.opacity * (1 - k / d.trail) * 0.7;
          G.fillStyle = `rgba(${r},${g},${b},${a})`;
          // Alternate words in trail for variety
          const w2 = WORDS[(d.wordIdx + k) % WORDS.length];
          G.fillText(w2, d.colX, ty);
        }

        // Draw bright head
        G.fillStyle = `rgba(${r},${g},${b},${d.opacity})`;
        G.fillText(word, d.colX, d.y);

        // Bright tip glow
        G.fillStyle = `rgba(255,255,255,${d.opacity * 0.45})`;
        G.fillText(word.charAt(0), d.colX, d.y);
      }

      // ── Perspective grid — two planes ─────────────────────────────
      const drawGrid = (
        cy: number, zFar: number, alpha: number, rgb: [number,number,number]
      ) => {
        const COLS = 24, ROWS = 14;
        const GW = W * 3.5, GH = H * 2.5;
        const FOV = 500;
        const CX = W / 2;

        const proj = (wx: number, wy: number, wz: number) => {
          const s = FOV / (FOV + wz);
          return { px: wx * s + CX, py: wy * s + cy };
        };

        G.save();
        const [r, g2, b2] = rgb;
        // horizontal lines
        for (let row = 0; row <= ROWS; row++) {
          const frac = row / ROWS;
          const wz = frac * zFar;
          const wy = -GH / 2 + GH * frac;
          const a  = alpha * (0.4 + 0.6 * frac) * (0.5 + 0.5 * Math.sin(t * 0.7 + row * 0.4));
          const p1 = proj(-GW / 2, wy, wz);
          const p2 = proj( GW / 2, wy, wz);
          G.strokeStyle = `rgba(${r},${g2},${b2},${a})`;
          G.lineWidth = 0.7;
          G.beginPath(); G.moveTo(p1.px, p1.py); G.lineTo(p2.px, p2.py); G.stroke();
        }
        // vertical lines
        for (let col = 0; col <= COLS; col++) {
          const frac = col / COLS;
          const wx   = -GW / 2 + GW * frac;
          const pNear = proj(wx, -GH / 2, 0);
          const pFar  = proj(wx,  GH / 2, zFar);
          const a = alpha * (0.3 + 0.4 * Math.abs(Math.sin(t + col * 0.25)));
          G.strokeStyle = `rgba(${r},${g2},${b2},${a})`;
          G.lineWidth = 0.7;
          G.beginPath(); G.moveTo(pNear.px, pNear.py); G.lineTo(pFar.px, pFar.py); G.stroke();
        }
        G.restore();
      };

      drawGrid(H * 0.78, 900, 0.13, [109, 40, 217]);
      drawGrid(H * 0.22, 900, 0.09, [56, 189, 248]);

      // ── Sparklines ────────────────────────────────────────────────
      for (const sp of sparks) {
        sp.x += sp.vx; sp.y += sp.vy;
        if (sp.x < -sp.w)  sp.x = W + 10;
        if (sp.x > W + 10) sp.x = -sp.w;
        if (sp.y < -sp.h)  sp.y = H + 10;
        if (sp.y > H + 10) sp.y = -sp.h;

        const [r, g, b] = sp.color;
        const a = sp.opacity * (0.7 + 0.3 * Math.sin(t * 1.2 + sp.x * 0.01));

        G.save();
        G.translate(sp.x, sp.y);

        // Axis
        G.strokeStyle = `rgba(${r},${g},${b},${a * 0.35})`;
        G.lineWidth = 0.8;
        G.beginPath(); G.moveTo(0, sp.h); G.lineTo(sp.w, sp.h); G.stroke();
        G.beginPath(); G.moveTo(0, 0);    G.lineTo(0, sp.h);    G.stroke();

        // Y tick marks
        for (let k = 0; k <= 3; k++) {
          const ty = sp.h - (k / 3) * sp.h;
          G.strokeStyle = `rgba(${r},${g},${b},${a * 0.2})`;
          G.beginPath(); G.moveTo(-3, ty); G.lineTo(sp.w, ty); G.stroke();
        }

        // Line
        G.strokeStyle = `rgba(${r},${g},${b},${a})`;
        G.lineWidth = 1.5;
        G.beginPath();
        sp.pts.forEach((v, i) => {
          const px2 = (i / (sp.pts.length - 1)) * sp.w;
          const py2 = sp.h - v * sp.h * 0.85 - sp.h * 0.05;
          i === 0 ? G.moveTo(px2, py2) : G.lineTo(px2, py2);
        });
        G.stroke();

        // Gradient fill under line
        const grad = G.createLinearGradient(0, 0, 0, sp.h);
        grad.addColorStop(0, `rgba(${r},${g},${b},${a * 0.18})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        G.fillStyle = grad;
        G.beginPath();
        sp.pts.forEach((v, i) => {
          const px2 = (i / (sp.pts.length - 1)) * sp.w;
          const py2 = sp.h - v * sp.h * 0.85 - sp.h * 0.05;
          i === 0 ? G.moveTo(px2, py2) : G.lineTo(px2, py2);
        });
        G.lineTo(sp.w, sp.h); G.lineTo(0, sp.h); G.closePath(); G.fill();

        // Label
        G.font = `bold 10px 'Courier New', monospace`;
        G.fillStyle = `rgba(${r},${g},${b},${a * 0.7})`;
        G.fillText(sp.label, 2, -4);

        G.restore();
      }

      // ── Candlestick charts ────────────────────────────────────────
      for (const cd of candles) {
        cd.x += cd.vx; cd.y += cd.vy;
        if (cd.x < -200) cd.x = W + 20;
        if (cd.x > W + 20) cd.x = -200;
        if (cd.y < -cd.h - 20) cd.y = H + 20;
        if (cd.y > H + 20) cd.y = -cd.h - 20;

        const a = cd.opacity * (0.7 + 0.3 * Math.sin(t * 0.9 + cd.y * 0.01));
        const gap = cd.bw * 2.2;

        G.save();
        G.translate(cd.x, cd.y);

        // Axis
        G.strokeStyle = `rgba(200,200,220,${a * 0.2})`;
        G.lineWidth = 0.6;
        G.beginPath(); G.moveTo(0, cd.h); G.lineTo(cd.bars.length * gap + cd.bw, cd.h); G.stroke();

        cd.bars.forEach((bar, i) => {
          const isUp = bar.c >= bar.o;
          const [r2, g2, b2] = isUp ? [34,197,94] as [number,number,number] : [239,68,68] as [number,number,number];
          const col = `rgba(${r2},${g2},${b2},${a})`;
          const bx  = i * gap;
          const top = cd.h * (1 - Math.max(bar.o, bar.c));
          const bot = cd.h * (1 - Math.min(bar.o, bar.c));
          const mid = bx + cd.bw / 2;

          G.strokeStyle = col;
          G.lineWidth = 1;
          G.beginPath();
          G.moveTo(mid, Math.max(0, cd.h * (1 - bar.hi)));
          G.lineTo(mid, Math.min(cd.h, cd.h * (1 - bar.lo)));
          G.stroke();

          G.fillStyle = col;
          G.fillRect(bx, top, cd.bw, Math.max(1.5, bot - top));
        });

        G.restore();
      }

      // ── Strong edge vignette ──────────────────────────────────────
      const vig = G.createRadialGradient(W/2, H/2, H*0.15, W/2, H/2, H*0.9);
      vig.addColorStop(0, "rgba(9,9,11,0)");
      vig.addColorStop(1, "rgba(9,9,11,0.72)");
      G.fillStyle = vig;
      G.fillRect(0, 0, W, H);

      rafRef.current = requestAnimationFrame(frame);
    }

    frame();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", init);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
