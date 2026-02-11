import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700", "900"],
  subsets: ["latin"],
});

const ACCENT = "#00ef8b";

export const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Heading
  const headSpring = spring({ frame, fps, config: { damping: 200 } });
  const headY = interpolate(headSpring, [0, 1], [40, 0]);

  // Three steps appearing
  const steps = ["Lock", "Stream", "Done"];
  const stepSprings = steps.map((_, i) =>
    spring({ frame, fps, delay: 20 + i * 18, config: { damping: 15, stiffness: 120 } })
  );

  // Tank visualization
  const tankAppear = spring({ frame, fps, delay: 70, config: { damping: 200 } });

  // Fill level animates from full to partially drained
  const fillPercent = interpolate(frame, [80, 140], [95, 40], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Droplet animation (cycling)
  const dropletActive = frame > 85;
  const dropletY = dropletActive
    ? interpolate(frame % 20, [0, 20], [0, 80])
    : 0;
  const dropletOpacity = dropletActive
    ? interpolate(frame % 20, [0, 5, 15, 20], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#09090b",
        fontFamily,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 120,
        padding: 80,
      }}
    >
      {/* Left side: text */}
      <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: "#fafafa",
            letterSpacing: -1,
            opacity: headSpring,
            transform: `translateY(${headY}px)`,
          }}
        >
          The fix is simple.
        </div>

        <div style={{ display: "flex", gap: 30 }}>
          {steps.map((step, i) => {
            const s = stepSprings[i];
            const scale = interpolate(s, [0, 1], [0.5, 1]);
            return (
              <div
                key={step}
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  color: i === 2 ? ACCENT : "#fafafa",
                  padding: "16px 32px",
                  borderRadius: 16,
                  backgroundColor: i === 2 ? `${ACCENT}15` : "#18181b",
                  border: `2px solid ${i === 2 ? ACCENT : "#27272a"}`,
                  transform: `scale(${scale})`,
                  opacity: s,
                }}
              >
                {step}
                {i < 2 && (
                  <span style={{ color: "#52525b", marginLeft: 16 }}>→</span>
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontSize: 24,
            color: "#71717a",
            maxWidth: 500,
            lineHeight: 1.6,
            opacity: interpolate(frame, [60, 80], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Deposit FLOW → mint an NFT → tokens stream automatically.
          No bots. No claims. No trust.
        </div>
      </div>

      {/* Right side: animated tank */}
      <div
        style={{
          opacity: tankAppear,
          transform: `scale(${tankAppear})`,
        }}
      >
        <svg width={280} height={360} viewBox="0 0 280 360">
          {/* Tank body */}
          <rect
            x={40}
            y={30}
            width={200}
            height={260}
            rx={20}
            fill="none"
            stroke="#27272a"
            strokeWidth={3}
          />

          {/* Fill */}
          <rect
            x={43}
            y={30 + 260 * (1 - fillPercent / 100)}
            width={194}
            height={260 * (fillPercent / 100)}
            rx={17}
            fill={`${ACCENT}20`}
          />

          {/* Fill top line (meniscus) */}
          <line
            x1={43}
            y1={30 + 260 * (1 - fillPercent / 100)}
            x2={237}
            y2={30 + 260 * (1 - fillPercent / 100)}
            stroke={ACCENT}
            strokeWidth={2}
            opacity={0.8}
          />

          {/* Tank label */}
          <text
            x={140}
            y={170}
            textAnchor="middle"
            fill={ACCENT}
            fontSize={22}
            fontWeight={700}
            fontFamily={fontFamily}
          >
            {Math.round(fillPercent)}% remaining
          </text>

          {/* Drip nozzle */}
          <rect
            x={125}
            y={290}
            width={30}
            height={20}
            rx={4}
            fill="#27272a"
          />

          {/* Droplet */}
          <circle
            cx={140}
            cy={320 + dropletY}
            r={8}
            fill={ACCENT}
            opacity={dropletOpacity}
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
