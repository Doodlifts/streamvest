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

const CYAN = "#00e1ff";
const VIOLET = "#7b61ff";
const RED = "#ff4444";
const BG = "#050505";

export const TransformScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "VESTING" text appears
  const vestingSpring = spring({
    frame,
    fps,
    delay: 5,
    config: { damping: 200 },
  });
  const vestingY = interpolate(vestingSpring, [0, 1], [60, 0]);

  // Strikethrough line animates across
  const strikeProgress = interpolate(frame, [35, 60], [0, 110], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "VESTING" dims after strikethrough
  const vestingDim = interpolate(frame, [55, 70], [0.9, 0.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Arrow slides in
  const arrowSpring = spring({
    frame,
    fps,
    delay: 55,
    config: { damping: 15, stiffness: 100 },
  });
  const arrowX = interpolate(arrowSpring, [0, 1], [-60, 0]);

  // "STREAMING" text reveals
  const streamSpring = spring({
    frame,
    fps,
    delay: 70,
    config: { damping: 14, stiffness: 80 },
  });
  const streamScale = interpolate(streamSpring, [0, 1], [0.7, 1]);

  // Subtitle fades in
  const subSpring = spring({
    frame,
    fps,
    delay: 95,
    config: { damping: 200 },
  });
  const subY = interpolate(subSpring, [0, 1], [30, 0]);

  // Background glow for STREAMING
  const streamGlow = interpolate(frame, [70, 100], [0, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
      {/* Background glow behind STREAMING */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${CYAN}20 0%, ${VIOLET}10 50%, transparent 80%)`,
          opacity: streamGlow,
          top: "35%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          filter: "blur(60px)",
        }}
      />

      {/* Main transformation row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 50,
          marginBottom: 60,
        }}
      >
        {/* VESTING with strikethrough */}
        <div
          style={{
            position: "relative",
            opacity: vestingSpring,
            transform: `translateY(${vestingY}px)`,
          }}
        >
          <span
            style={{
              fontSize: 120,
              fontWeight: 900,
              color: `rgba(255,255,255,${vestingDim})`,
              letterSpacing: -3,
              textTransform: "uppercase",
            }}
          >
            Vesting
          </span>

          {/* Strikethrough line */}
          <div
            style={{
              position: "absolute",
              left: "-3%",
              right: "-3%",
              top: "52%",
              height: 5,
              backgroundColor: RED,
              transform: "translateY(-50%) rotate(-2deg)",
              borderRadius: 3,
              clipPath: `inset(0 ${100 - strikeProgress}% 0 0)`,
            }}
          />
        </div>

        {/* Arrow */}
        <div
          style={{
            opacity: arrowSpring,
            transform: `translateX(${arrowX}px)`,
          }}
        >
          <svg width="72" height="36" viewBox="0 0 72 36" fill="none">
            <path
              d="M4 18h56m0 0l-10-10m10 10l-10 10"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* STREAMING with gradient */}
        <span
          style={{
            fontSize: 120,
            fontWeight: 900,
            letterSpacing: -3,
            textTransform: "uppercase",
            background: `linear-gradient(90deg, ${CYAN}, ${VIOLET})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            opacity: streamSpring,
            transform: `scale(${streamScale})`,
            display: "inline-block",
            transformOrigin: "left center",
          }}
        >
          Streaming
        </span>
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 32,
          fontWeight: 400,
          color: "rgba(255,255,255,0.4)",
          opacity: subSpring,
          transform: `translateY(${subY}px)`,
          letterSpacing: 0.5,
          textAlign: "center",
          maxWidth: 800,
          lineHeight: 1.5,
        }}
      >
        Every vesting schedule becomes a{" "}
        <span style={{ color: CYAN, fontWeight: 700 }}>sovereign NFT</span>
        {" "}that streams tokens autonomously
      </div>
    </AbsoluteFill>
  );
};
