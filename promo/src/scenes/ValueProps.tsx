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

const CYAN = "#00e1ff";
const VIOLET = "#7b61ff";
const BG = "#050505";

type CardData = {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
};

const ChainIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <path
      d="M12 20l-2 2a4 4 0 005.66 5.66l4-4a4 4 0 000-5.66M20 12l2-2a4 4 0 00-5.66-5.66l-4 4a4 4 0 000 5.66"
      stroke={CYAN}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

const NftIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect x="4" y="4" width="24" height="24" rx="4" stroke={CYAN} strokeWidth="2.5" />
    <path d="M4 20l7-7 4 4 5-5 8 8" stroke={CYAN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="21" cy="11" r="2.5" stroke={CYAN} strokeWidth="2" />
  </svg>
);

const AutoIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <path
      d="M16 6a10 10 0 11-7.07 2.93"
      stroke={CYAN}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M9 4v5h5"
      stroke={CYAN}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="16" r="2" fill={CYAN} />
  </svg>
);

const cards: CardData[] = [
  {
    icon: <ChainIcon />,
    title: "Fully On-Chain",
    description: "No keepers, no bots, no off-chain infrastructure. Every delivery is executed by Flow's native scheduler.",
    accentColor: CYAN,
  },
  {
    icon: <NftIcon />,
    title: "NFT-Powered",
    description: "Each vesting stream is a tradeable NFT with live on-chain SVG artwork showing real-time status.",
    accentColor: VIOLET,
  },
  {
    icon: <AutoIcon />,
    title: "Autonomous Delivery",
    description: "Lock tokens, mint an NFT, and walk away. Tokens stream to the recipient on a schedule you define.",
    accentColor: CYAN,
  },
];

const FeatureCard: React.FC<{
  card: CardData;
  index: number;
}> = ({ card, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({
    frame,
    fps,
    delay: 25 + index * 20,
    config: { damping: 16, stiffness: 80 },
  });

  const y = interpolate(cardSpring, [0, 1], [80, 0]);
  const scale = interpolate(cardSpring, [0, 1], [0.9, 1]);

  // Subtle glow behind card
  const glowOpacity = interpolate(cardSpring, [0.5, 1], [0, 0.15], {
    extrapolateLeft: "clamp",
  });

  const cardWidth = 520;
  const gap = 40;
  const totalWidth = cards.length * cardWidth + (cards.length - 1) * gap;
  const startX = (1920 - totalWidth) / 2;
  const x = startX + index * (cardWidth + gap);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 320,
        width: cardWidth,
        opacity: cardSpring,
        transform: `translateY(${y}px) scale(${scale})`,
      }}
    >
      {/* Card glow */}
      <div
        style={{
          position: "absolute",
          inset: -20,
          borderRadius: 32,
          background: `radial-gradient(ellipse, ${card.accentColor}15 0%, transparent 70%)`,
          opacity: glowOpacity,
          filter: "blur(20px)",
        }}
      />

      {/* Card body */}
      <div
        style={{
          padding: "44px 40px",
          borderRadius: 24,
          backgroundColor: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
          position: "relative",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: `${card.accentColor}10`,
            border: `1px solid ${card.accentColor}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          {card.icon}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: "rgba(255,255,255,0.9)",
            marginBottom: 14,
            letterSpacing: -0.5,
          }}
        >
          {card.title}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 400,
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.6,
          }}
        >
          {card.description}
        </div>
      </div>
    </div>
  );
};

export const ValueProps: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Heading
  const headSpring = spring({
    frame,
    fps,
    delay: 5,
    config: { damping: 200 },
  });
  const headY = interpolate(headSpring, [0, 1], [40, 0]);

  // Subheading
  const subSpring = spring({
    frame,
    fps,
    delay: 15,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        fontFamily,
      }}
    >
      {/* Heading */}
      <div
        style={{
          position: "absolute",
          top: 100,
          width: "100%",
          textAlign: "center",
          opacity: headSpring,
          transform: `translateY(${headY}px)`,
        }}
      >
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            color: "rgba(255,255,255,0.9)",
            letterSpacing: -2,
            marginBottom: 16,
          }}
        >
          Built Different
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 400,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: 1,
            opacity: subSpring,
          }}
        >
          Three primitives that change how vesting works
        </div>
      </div>

      {/* Feature cards */}
      {cards.map((card, i) => (
        <FeatureCard key={i} card={card} index={i} />
      ))}

      {/* Bottom gradient line */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: "50%",
          transform: "translateX(-50%)",
          width: interpolate(frame, [120, 170], [0, 600], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          height: 1,
          background: `linear-gradient(90deg, transparent, ${CYAN}40, ${VIOLET}40, transparent)`,
        }}
      />
    </AbsoluteFill>
  );
};
