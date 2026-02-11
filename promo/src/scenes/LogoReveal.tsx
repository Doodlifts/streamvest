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
  weights: ["400", "700", "900"],
  subsets: ["latin"],
});

loadMono("normal", { weights: ["400"], subsets: ["latin"] });

const CYAN = "#00e1ff";
const VIOLET = "#7b61ff";
const BG = "#050505";

/* ---------- Dot grid background ---------- */
const DotGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const gridOpacity = interpolate(frame, [0, 40], [0, 0.12], {
    extrapolateRight: "clamp",
  });

  const dots: React.ReactNode[] = [];
  const spacing = 60;
  const cols = Math.ceil(1920 / spacing);
  const rows = Math.ceil(1080 / spacing);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(
        <circle
          key={`${r}-${c}`}
          cx={c * spacing + 30}
          cy={r * spacing + 30}
          r={1.2}
          fill="white"
        />
      );
    }
  }

  return (
    <svg
      width={1920}
      height={1080}
      style={{ position: "absolute", top: 0, left: 0, opacity: gridOpacity }}
    >
      {dots}
    </svg>
  );
};

/* ---------- Floating ambient particles ---------- */
const Particles: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [20, 60], [0, 1], {
    extrapolateRight: "clamp",
  });

  const particles = Array.from({ length: 18 }, (_, i) => {
    const seed = i * 137.5;
    const baseX = (seed * 7.3) % 1920;
    const baseY = (seed * 4.1) % 1080;
    const speed = 0.3 + (i % 5) * 0.15;
    const size = 2 + (i % 3) * 1.5;
    const isCyan = i % 3 === 0;

    const y = baseY + Math.sin((frame * speed * 0.02) + seed) * 30;
    const x = baseX + Math.cos((frame * speed * 0.015) + seed * 0.5) * 20;
    const particleOpacity = 0.15 + Math.sin((frame * 0.03) + i) * 0.1;

    return (
      <circle
        key={i}
        cx={x}
        cy={y}
        r={size}
        fill={isCyan ? CYAN : VIOLET}
        opacity={particleOpacity}
      />
    );
  });

  return (
    <svg
      width={1920}
      height={1080}
      style={{ position: "absolute", top: 0, left: 0, opacity }}
    >
      {particles}
    </svg>
  );
};

/* ---------- Main scene ---------- */
export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo mark spring
  const logoSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0.3, 1]);
  const logoRotation = interpolate(logoSpring, [0, 1], [45, 0]);

  // Brand name
  const nameSpring = spring({
    frame,
    fps,
    delay: 18,
    config: { damping: 200 },
  });
  const nameY = interpolate(nameSpring, [0, 1], [50, 0]);

  // Gradient underline
  const lineWidth = interpolate(frame, [30, 65], [0, 360], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tagline
  const tagSpring = spring({
    frame,
    fps,
    delay: 40,
    config: { damping: 200 },
  });
  const tagY = interpolate(tagSpring, [0, 1], [30, 0]);

  // Atmospheric glow
  const glowOpacity = interpolate(frame, [10, 50], [0, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glowScale = interpolate(frame, [10, 80], [0.6, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
      }}
    >
      <DotGrid />
      <Particles />

      {/* Atmospheric glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${CYAN}25 0%, ${VIOLET}10 40%, transparent 70%)`,
          opacity: glowOpacity,
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -55%) scale(${glowScale})`,
          filter: "blur(40px)",
        }}
      />

      {/* Logo mark */}
      <div
        style={{
          width: 90,
          height: 90,
          borderRadius: 20,
          background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`,
          transform: `scale(${logoScale}) rotate(${logoRotation}deg)`,
          marginBottom: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 60px ${CYAN}40, 0 0 120px ${VIOLET}20`,
        }}
      >
        {/* Arrow icon inside */}
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path
            d="M20 8v18m0 0l-7-6m7 6l7-6"
            stroke="#050505"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="30" r="2.5" fill="#050505" />
        </svg>
      </div>

      {/* Brand name */}
      <div
        style={{
          fontSize: 108,
          fontWeight: 900,
          letterSpacing: -4,
          opacity: nameSpring,
          transform: `translateY(${nameY}px)`,
          lineHeight: 1,
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.9)" }}>Stream</span>
        <span
          style={{
            background: `linear-gradient(90deg, ${CYAN}, ${VIOLET})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Vest
        </span>
      </div>

      {/* Gradient underline */}
      <div
        style={{
          width: lineWidth,
          height: 3,
          background: `linear-gradient(90deg, ${CYAN}, ${VIOLET})`,
          marginTop: 20,
          marginBottom: 28,
          borderRadius: 2,
          opacity: 0.7,
        }}
      />

      {/* Tagline */}
      <div
        style={{
          fontSize: 30,
          fontWeight: 400,
          color: "rgba(255,255,255,0.45)",
          opacity: tagSpring,
          transform: `translateY(${tagY}px)`,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        Autonomous Token Vesting on Flow
      </div>
    </AbsoluteFill>
  );
};
