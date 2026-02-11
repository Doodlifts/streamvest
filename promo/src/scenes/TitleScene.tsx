import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700", "900"],
  subsets: ["latin"],
});

const ACCENT = "#00ef8b";

export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo / brand mark animation
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 120 },
  });

  const logoRotation = interpolate(logoScale, [0, 1], [-90, 0]);

  // Title text
  const titleSpring = spring({
    frame,
    fps,
    delay: 10,
    config: { damping: 200 },
  });
  const titleY = interpolate(titleSpring, [0, 1], [60, 0]);
  const titleOpacity = titleSpring;

  // Tagline
  const taglineSpring = spring({
    frame,
    fps,
    delay: 25,
    config: { damping: 200 },
  });
  const taglineY = interpolate(taglineSpring, [0, 1], [40, 0]);
  const taglineOpacity = taglineSpring;

  // Decorative line
  const lineWidth = interpolate(frame, [20, 50], [0, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle glow pulse
  const glowOpacity = interpolate(
    frame,
    [40, 70, 100, 130],
    [0, 0.3, 0.15, 0.3],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#09090b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}22 0%, transparent 70%)`,
          opacity: glowOpacity,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Animated diamond/logo mark */}
      <div
        style={{
          width: 80,
          height: 80,
          border: `3px solid ${ACCENT}`,
          borderRadius: 16,
          transform: `scale(${logoScale}) rotate(${logoRotation}deg)`,
          marginBottom: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            backgroundColor: ACCENT,
            borderRadius: 6,
            transform: `rotate(45deg)`,
          }}
        />
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 96,
          fontWeight: 900,
          color: "#fafafa",
          letterSpacing: -3,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        Stream<span style={{ color: ACCENT }}>Vest</span>
      </div>

      {/* Decorative line */}
      <div
        style={{
          width: lineWidth,
          height: 2,
          backgroundColor: ACCENT,
          marginTop: 20,
          marginBottom: 20,
          opacity: 0.6,
        }}
      />

      {/* Tagline */}
      <div
        style={{
          fontSize: 32,
          fontWeight: 400,
          color: "#a1a1aa",
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          letterSpacing: 1,
        }}
      >
        Autonomous Token Vesting on Flow
      </div>
    </AbsoluteFill>
  );
};
