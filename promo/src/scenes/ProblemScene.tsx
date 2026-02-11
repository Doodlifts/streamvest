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
  weights: ["400", "600", "800"],
  subsets: ["latin"],
});

const ACCENT = "#00ef8b";
const RED = "#ef4444";

const problems = [
  { icon: "⏰", text: "Manual claims every period" },
  { icon: "🤝", text: "Trust intermediaries with your tokens" },
  { icon: "🖥️", text: "Off-chain infrastructure & keeper bots" },
  { icon: "💸", text: "Gas costs on every claim" },
];

const ProblemItem: React.FC<{
  icon: string;
  text: string;
  index: number;
}> = ({ icon, text, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const itemSpring = spring({
    frame,
    fps,
    delay: index * 15,
    config: { damping: 200 },
  });

  const x = interpolate(itemSpring, [0, 1], [-80, 0]);
  const opacity = itemSpring;

  // Strike-through animation (appears later)
  const strikeProgress = interpolate(
    frame,
    [80 + index * 8, 100 + index * 8],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const textOpacity = interpolate(
    frame,
    [80 + index * 8, 100 + index * 8],
    [1, 0.35],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        opacity,
        transform: `translateX(${x}px)`,
        marginBottom: 28,
        position: "relative",
      }}
    >
      <div
        style={{
          fontSize: 36,
          width: 64,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1c1c1e",
          borderRadius: 14,
          border: `1px solid #27272a`,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: 30,
          color: "#e4e4e7",
          fontWeight: 600,
          opacity: textOpacity,
          position: "relative",
        }}
      >
        {text}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: `${strikeProgress}%`,
            height: 3,
            backgroundColor: RED,
            transform: "translateY(-50%)",
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
};

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headingSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const headingOpacity = headingSpring;
  const headingY = interpolate(headingSpring, [0, 1], [30, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#09090b",
        fontFamily,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      {/* Heading */}
      <div
        style={{
          fontSize: 56,
          fontWeight: 800,
          color: "#fafafa",
          marginBottom: 60,
          opacity: headingOpacity,
          transform: `translateY(${headingY}px)`,
          letterSpacing: -1,
        }}
      >
        Token vesting is{" "}
        <span style={{ color: RED }}>broken</span>
      </div>

      {/* Problem list */}
      <div style={{ width: 700 }}>
        {problems.map((p, i) => (
          <ProblemItem key={i} icon={p.icon} text={p.text} index={i} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
