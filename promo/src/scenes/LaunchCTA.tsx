import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "900"],
  subsets: ["latin"],
});

const { fontFamily: monoFamily } = loadMono("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
});

const CYAN = "#00e1ff";
const VIOLET = "#7b61ff";
const GREEN = "#00ff9d";
const BG = "#050505";

/* ---------- Pulsing ring effect ---------- */
const PulseRings: React.FC = () => {
  const frame = useCurrentFrame();

  const rings = [0, 1, 2].map((i) => {
    const delay = i * 25;
    const progress = ((frame - delay) % 90) / 90;
    const visible = frame > delay;
    const scale = visible ? 0.3 + progress * 1.5 : 0;
    const opacity = visible ? Math.max(0, 0.25 - progress * 0.3) : 0;

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          border: `1px solid ${CYAN}`,
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -55%) scale(${scale})`,
          opacity,
        }}
      />
    );
  });

  return <>{rings}</>;
};

/* ---------- Stats row ---------- */
const stats = [
  { value: "100%", label: "On-Chain" },
  { value: "60s", label: "Min Interval" },
  { value: "~0.04", label: "FLOW / delivery" },
  { value: "MIT", label: "Licensed" },
];

export const LaunchCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "Live on Flow Mainnet" badge
  const badgeSpring = spring({
    frame,
    fps,
    delay: 10,
    config: { damping: 14, stiffness: 80 },
  });
  const badgeScale = interpolate(badgeSpring, [0, 1], [0.5, 1]);

  // Main heading
  const headSpring = spring({
    frame,
    fps,
    delay: 25,
    config: { damping: 200 },
  });
  const headY = interpolate(headSpring, [0, 1], [60, 0]);

  // URL
  const urlSpring = spring({
    frame,
    fps,
    delay: 40,
    config: { damping: 200 },
  });
  const urlY = interpolate(urlSpring, [0, 1], [30, 0]);

  // Contract address
  const addrSpring = spring({
    frame,
    fps,
    delay: 55,
    config: { damping: 200 },
  });

  // Stats row
  const statsSpring = spring({
    frame,
    fps,
    delay: 75,
    config: { damping: 200 },
  });

  // Background atmospheric glow
  const glowSize = interpolate(
    frame % 100,
    [0, 50, 100],
    [500, 650, 500]
  );
  const glowOpacity = interpolate(frame, [20, 60], [0, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Final logo lockup
  const lockupSpring = spring({
    frame,
    fps,
    delay: 100,
    config: { damping: 200 },
  });

  // Pulsing dot for "live" badge
  const dotPulse = interpolate(
    frame % 40,
    [0, 20, 40],
    [0.6, 1, 0.6]
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        fontFamily,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: glowSize,
          height: glowSize,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${CYAN}20 0%, ${VIOLET}10 40%, transparent 70%)`,
          opacity: glowOpacity,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -55%)",
          filter: "blur(50px)",
        }}
      />

      <PulseRings />

      {/* Live badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 28px",
          borderRadius: 100,
          backgroundColor: `${GREEN}10`,
          border: `1px solid ${GREEN}35`,
          marginBottom: 44,
          transform: `scale(${badgeScale})`,
          opacity: badgeSpring,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: GREEN,
            boxShadow: `0 0 ${12 * dotPulse}px ${GREEN}`,
            opacity: dotPulse,
          }}
        />
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: GREEN,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Live on Flow Mainnet
        </span>
      </div>

      {/* Main heading */}
      <div
        style={{
          fontSize: 88,
          fontWeight: 900,
          color: "rgba(255,255,255,0.95)",
          letterSpacing: -3,
          opacity: headSpring,
          transform: `translateY(${headY}px)`,
          marginBottom: 28,
          textAlign: "center",
        }}
      >
        Start Streaming
      </div>

      {/* URL */}
      <div
        style={{
          fontSize: 38,
          fontWeight: 600,
          fontFamily: monoFamily,
          opacity: urlSpring,
          transform: `translateY(${urlY}px)`,
          marginBottom: 20,
          letterSpacing: 1,
          background: `linear-gradient(90deg, ${CYAN}, ${VIOLET})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        streamvest.vercel.app
      </div>

      {/* Contract address */}
      <div
        style={{
          fontSize: 18,
          color: "rgba(255,255,255,0.2)",
          fontFamily: monoFamily,
          opacity: addrSpring,
          marginBottom: 64,
          letterSpacing: 0.5,
        }}
      >
        Contract: 0x5ec90e3dcf0067c4
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: 80,
          opacity: statsSpring,
        }}
      >
        {stats.map((stat, i) => {
          const itemSpring = spring({
            frame,
            fps,
            delay: 80 + i * 10,
            config: { damping: 200 },
          });

          return (
            <div
              key={i}
              style={{
                textAlign: "center",
                opacity: itemSpring,
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: "rgba(255,255,255,0.9)",
                  marginBottom: 8,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: "rgba(255,255,255,0.35)",
                  fontWeight: 400,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Final logo lockup */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: lockupSpring,
        }}
      >
        {/* Mini logo mark */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v7m0 0L4.5 7M7 9l2.5-2" stroke="#050505" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="7" cy="11" r="1" fill="#050505" />
          </svg>
        </div>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "rgba(255,255,255,0.15)",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          StreamVest
        </span>
      </div>
    </AbsoluteFill>
  );
};
