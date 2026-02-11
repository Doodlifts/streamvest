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
  weights: ["400", "600", "800"],
  subsets: ["latin"],
});

const ACCENT = "#00ef8b";

type Feature = {
  title: string;
  description: string;
  icon: string;
};

const features: Feature[] = [
  {
    icon: "◆",
    title: "NFT-Based Vesting",
    description: "Each stream is a tradeable NFT — transfer, sell, or compose vesting schedules",
  },
  {
    icon: "⟳",
    title: "Autonomous Delivery",
    description: "Flow's native scheduler handles every delivery — set it and forget it",
  },
  {
    icon: "◎",
    title: "On-Chain SVG",
    description: "Live-updating artwork shows fill level, rate, and status — all generated in Cadence",
  },
  {
    icon: "⬡",
    title: "Fully Composable",
    description: "Standard NFT interfaces — works with Flow wallets, marketplaces, and dApps",
  },
];

const FeatureCard: React.FC<{
  feature: Feature;
  index: number;
}> = ({ feature, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const row = Math.floor(index / 2);
  const col = index % 2;

  const cardSpring = spring({
    frame,
    fps,
    delay: 15 + index * 12,
    config: { damping: 18, stiffness: 100 },
  });

  const scale = interpolate(cardSpring, [0, 1], [0.8, 1]);
  const opacity = cardSpring;

  // Subtle hover effect on the icon
  const iconPulse = interpolate(
    (frame + index * 15) % 60,
    [0, 30, 60],
    [1, 1.1, 1]
  );

  return (
    <div
      style={{
        position: "absolute",
        left: col === 0 ? 200 : 1000,
        top: row === 0 ? 200 : 560,
        width: 680,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          padding: "36px 40px",
          borderRadius: 20,
          backgroundColor: "#18181b",
          border: "1px solid #27272a",
          display: "flex",
          gap: 28,
          alignItems: "flex-start",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 14,
            backgroundColor: `${ACCENT}12`,
            border: `1px solid ${ACCENT}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            color: ACCENT,
            flexShrink: 0,
            transform: `scale(${iconPulse})`,
          }}
        >
          {feature.icon}
        </div>

        <div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#fafafa",
              marginBottom: 10,
              fontFamily,
            }}
          >
            {feature.title}
          </div>
          <div
            style={{
              fontSize: 19,
              color: "#a1a1aa",
              lineHeight: 1.5,
              fontFamily,
              fontWeight: 400,
            }}
          >
            {feature.description}
          </div>
        </div>
      </div>
    </div>
  );
};

export const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headSpring = spring({ frame, fps, config: { damping: 200 } });
  const headY = interpolate(headSpring, [0, 1], [30, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#09090b",
        fontFamily,
      }}
    >
      {/* Heading */}
      <div
        style={{
          position: "absolute",
          top: 70,
          width: "100%",
          textAlign: "center",
          fontSize: 48,
          fontWeight: 800,
          color: "#fafafa",
          opacity: headSpring,
          transform: `translateY(${headY}px)`,
          letterSpacing: -1,
        }}
      >
        Built for <span style={{ color: ACCENT }}>real</span> use cases
      </div>

      {/* Feature cards */}
      {features.map((f, i) => (
        <FeatureCard key={i} feature={f} index={i} />
      ))}
    </AbsoluteFill>
  );
};
