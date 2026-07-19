import type { COVER_VARIANTS } from "@/lib/content/schemas";

type Variant = (typeof COVER_VARIANTS)[number];

/**
 * Original project visuals, generated as inline SVG from each project's
 * actual mathematics. Abstract but semantically honest — the smile really
 * is an SVI total-variance curve; the field really is an advection flow;
 * no fake data is presented as results. Decorative: aria-hidden, with
 * text alternatives supplied by surrounding markup.
 */
export function CoverVisual({
  variant,
  className = "",
}: {
  variant: Variant;
  className?: string;
}) {
  const inner = renderVariant(variant);
  if (!inner) return null;
  return (
    <svg
      viewBox="0 0 400 240"
      aria-hidden
      className={`block h-auto w-full ${className}`}
      fill="none"
    >
      {inner}
    </svg>
  );
}

function renderVariant(variant: Variant) {
  switch (variant) {
    case "vol-surface":
      return <VolSurface />;
    case "advection":
      return <Advection />;
    case "tensor":
      return <Tensor />;
    case "orderbook":
      return <OrderBook />;
    case "localization":
      return <Localization />;
    case "trace":
      return <Trace />;
    case "grid":
      return <GridMarks />;
    case "none":
      return null;
  }
}

/* SVI raw parameterization: w(k) = a + b(ρ(k−m) + √((k−m)² + σ²)) */
function sviPath(a: number, b: number, rho: number, m: number, sig: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const k = -1.5 + (3 * i) / 60;
    const w = a + b * (rho * (k - m) + Math.sqrt((k - m) ** 2 + sig ** 2));
    const x = 30 + ((k + 1.5) / 3) * 340;
    const y = 210 - w * 260;
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

function VolSurface() {
  const smiles: {
    p: [number, number, number, number, number];
    opacity: number;
    main: boolean;
  }[] = [
    { p: [0.12, 0.14, -0.35, 0.05, 0.25], opacity: 1, main: true },
    { p: [0.18, 0.12, -0.3, 0.08, 0.35], opacity: 0.45, main: false },
    { p: [0.25, 0.1, -0.25, 0.1, 0.5], opacity: 0.22, main: false },
  ];
  // anchor markers on the main smile: 25Δ put, ATM, 25Δ call (k positions)
  const anchors = [-0.75, 0.05, 0.85];
  const [a, b, rho, m, sig] = smiles[0]!.p;
  return (
    <>
      <line x1="30" y1="210" x2="370" y2="210" stroke="var(--rule-strong)" />
      <line
        x1="200"
        y1="30"
        x2="200"
        y2="210"
        stroke="var(--rule)"
        strokeDasharray="2 4"
      />
      {smiles.map((s, i) => (
        <path
          key={i}
          d={sviPath(...s.p)}
          stroke={s.main ? "var(--signal)" : "var(--muted)"}
          strokeWidth={s.main ? 1.75 : 1}
          opacity={s.opacity}
        />
      ))}
      {anchors.map((k) => {
        const w = a + b * (rho * (k - m) + Math.sqrt((k - m) ** 2 + sig ** 2));
        const x = 30 + ((k + 1.5) / 3) * 340;
        const y = 210 - w * 260;
        return (
          <g key={k}>
            <circle cx={x} cy={y} r="3.5" fill="var(--annotation)" />
            <line
              x1={x}
              y1={y + 6}
              x2={x}
              y2="210"
              stroke="var(--annotation)"
              strokeDasharray="1 3"
              opacity="0.6"
            />
          </g>
        );
      })}
      <text
        x="30"
        y="24"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="var(--muted)"
        letterSpacing="1"
      >
        σ(k) — SVI TOTAL VARIANCE · ANCHORS: 25ΔP / ATM / 25ΔC
      </text>
      <text
        x="356"
        y="224"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="var(--faint)"
      >
        k
      </text>
    </>
  );
}

function Advection() {
  // steady rotational + shear flow: u = (0.6 + 0.5 sin(y), 0.4 cos(x))
  const arrows: React.ReactNode[] = [];
  for (let gx = 0; gx < 9; gx++) {
    for (let gy = 0; gy < 5; gy++) {
      const x = 45 + gx * 39;
      const y = 45 + gy * 38;
      const u = 0.6 + 0.5 * Math.sin(y / 40);
      const v = 0.45 * Math.cos(x / 55);
      const len = 13 / Math.hypot(u, v);
      const dx = u * len;
      const dy = v * len;
      arrows.push(
        <g key={`${gx}-${gy}`} opacity={0.75}>
          <line
            x1={x}
            y1={y}
            x2={x + dx}
            y2={y + dy}
            stroke="var(--muted)"
            strokeWidth="1"
          />
          <circle cx={x + dx} cy={y + dy} r="1.4" fill="var(--muted)" />
        </g>,
      );
    }
  }
  // concentration contours advected downwind
  const contours = [26, 44, 66].map((r, i) => (
    <ellipse
      key={r}
      cx={150 + i * 26}
      cy={128 + i * 6}
      rx={r * 1.5}
      ry={r * 0.8}
      transform={`rotate(${8 + i * 4} ${150 + i * 26} ${128 + i * 6})`}
      stroke="var(--signal)"
      strokeWidth={i === 0 ? 1.5 : 1}
      opacity={1 - i * 0.32}
    />
  ));
  return (
    <>
      {arrows}
      {contours}
      <circle cx="150" cy="128" r="3" fill="var(--annotation)" />
      <text
        x="30"
        y="24"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="var(--muted)"
        letterSpacing="1"
      >
        ∂c/∂t + u·∇c = ∇·(K∇c) + S − λc
      </text>
    </>
  );
}

function Tensor() {
  const cell = 22;
  const grid = (x0: number, y0: number, accent: number[][]) => (
    <g>
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}${c}`}
            x={x0 + c * cell}
            y={y0 + r * cell}
            width={cell}
            height={cell}
            stroke="var(--rule-strong)"
            fill={
              accent.some(([ar, ac]) => ar === r && ac === c)
                ? "var(--signal-soft)"
                : "none"
            }
          />
        )),
      )}
    </g>
  );
  return (
    <>
      <text
        x="30"
        y="24"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="var(--muted)"
        letterSpacing="1"
      >
        T = g₀I + g₁A + g₂A² · gᵢ = gᵢ(tr A, tr A², tr A³)
      </text>
      <text
        x="42"
        y="140"
        fontFamily="var(--font-serif)"
        fontSize="26"
        fill="var(--fg)"
        fontStyle="italic"
      >
        T =
      </text>
      {grid(88, 100, [
        [0, 0],
        [1, 1],
        [2, 2],
      ])}
      <text x="166" y="140" fontFamily="var(--font-serif)" fontSize="20" fill="var(--fg)">
        +
      </text>
      {grid(188, 100, [
        [0, 1],
        [1, 0],
        [1, 2],
        [2, 1],
      ])}
      <text x="266" y="140" fontFamily="var(--font-serif)" fontSize="20" fill="var(--fg)">
        +
      </text>
      {grid(288, 100, [
        [0, 2],
        [2, 0],
        [0, 0],
        [2, 2],
      ])}
      {/* rotation arc: invariance under Q */}
      <path
        d="M 330 60 A 110 110 0 0 1 360 120"
        stroke="var(--annotation)"
        strokeWidth="1.2"
        strokeDasharray="3 3"
      />
      <text
        x="336"
        y="52"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="var(--annotation)"
      >
        QTQᵀ
      </text>
    </>
  );
}

function OrderBook() {
  // depth ladder around a mid — shapes from a decaying profile, labeled abstract
  const levels = [0.9, 0.65, 0.8, 0.5, 0.42, 0.3];
  const rows: React.ReactNode[] = [];
  levels.forEach((depth, i) => {
    const y = 52 + i * 18;
    rows.push(
      <rect
        key={`b${i}`}
        x={196 - depth * 150}
        y={y}
        width={depth * 150}
        height="10"
        fill="var(--signal)"
        opacity={0.75 - i * 0.09}
      />,
      <rect
        key={`a${i}`}
        x="204"
        y={y - (i === 0 ? 0 : 0)}
        width={levels[levels.length - 1 - i]! * 150}
        height="10"
        fill="var(--annotation)"
        opacity={0.7 - i * 0.09}
      />,
    );
  });
  return (
    <>
      {rows}
      <line x1="200" y1="40" x2="200" y2="176" stroke="var(--fg)" strokeWidth="1" />
      <text
        x="30"
        y="24"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="var(--muted)"
        letterSpacing="1"
      >
        BID / MID / ASK — QUOTE LADDER (SCHEMATIC)
      </text>
      <path
        d="M30 210 L80 202 L120 208 L170 198 L220 204 L270 194 L320 200 L370 192"
        stroke="var(--muted)"
        strokeWidth="1"
        opacity="0.7"
      />
      <circle cx="370" cy="192" r="2.5" fill="var(--signal)" />
    </>
  );
}

function Localization() {
  const locales = ["es", "pt", "hi", "ar", "zh", "id", "fr", "sw"];
  const cx = 200;
  const cy = 124;
  return (
    <>
      {locales.map((code, i) => {
        const angle = (i / locales.length) * Math.PI * 2 - Math.PI / 2;
        const r = 82;
        const x = cx + Math.cos(angle) * r * 1.6;
        const y = cy + Math.sin(angle) * r * 0.85;
        return (
          <g key={code}>
            <line
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="var(--rule-strong)"
              strokeDasharray={i % 3 === 0 ? "none" : "2 3"}
            />
            <circle cx={x} cy={y} r="11" stroke="var(--muted)" fill="var(--bg)" />
            <text
              x={x}
              y={y + 3}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="9"
              fill="var(--fg)"
            >
              {code}
            </text>
          </g>
        );
      })}
      <rect
        x={cx - 22}
        y={cy - 12}
        width="44"
        height="24"
        stroke="var(--signal)"
        fill="var(--bg)"
      />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="var(--signal)"
      >
        src
      </text>
      <text
        x="30"
        y="24"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="var(--muted)"
        letterSpacing="1"
      >
        ONE SOURCE → MANY LOCALES · DASHED = TRANSLATION LAG
      </text>
    </>
  );
}

function Trace() {
  return (
    <>
      <path
        d="M30 140 L70 132 L100 150 L140 118 L180 126 L215 96 L255 108 L295 84 L335 92 L370 70"
        stroke="var(--signal)"
        strokeWidth="1.5"
      />
      {[70, 140, 215, 295, 370].map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy={[132, 118, 96, 84, 70][i]}
          r="2.5"
          fill="var(--annotation)"
        />
      ))}
      <line x1="30" y1="200" x2="370" y2="200" stroke="var(--rule-strong)" />
    </>
  );
}

function GridMarks() {
  const marks: React.ReactNode[] = [];
  for (let x = 0; x < 9; x++)
    for (let y = 0; y < 5; y++)
      marks.push(
        <g key={`${x}${y}`} opacity="0.5">
          <line
            x1={45 + x * 39 - 3}
            y1={45 + y * 38}
            x2={45 + x * 39 + 3}
            y2={45 + y * 38}
            stroke="var(--muted)"
          />
          <line
            x1={45 + x * 39}
            y1={45 + y * 38 - 3}
            x2={45 + x * 39}
            y2={45 + y * 38 + 3}
            stroke="var(--muted)"
          />
        </g>,
      );
  return (
    <>
      {marks}
      <circle cx={45 + 5 * 39} cy={45 + 2 * 38} r="4" fill="var(--signal)" />
    </>
  );
}
