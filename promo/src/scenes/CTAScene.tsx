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
  weights: ["400", "600", "900"],
  subsets: ["latin"],
});

const { fontFamily: monoFamily } = loadMono("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
});

const ACCENT = "#00ef8b";

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "Live on Mainnet" badge
  const badgeSpring = spring({
    frame,
    fps,
    delay: 0,
    config: { damping: 15, stiffness: 100 },
  });
  const badgeScale = interpolate(badgeSpring, [0, 1], [0.5, 1]);

  // Main CTA text
  const ctaSpring = spring({
    frame,
    fps,
    delay: 15,
    config: { damping: 200 },
  });
  const ctaY = interpolate(ctaSpring, [0, 1], [50, 0]);

  // URL
  const urlSpring = spring({
    frame,
    fps,
    delay: 30,
    config: { damping: 200 },
  });
  const urlY = interpolate(urlSpring, [0, 1], [30, 0]);

  // Contract address
  const addrSpring = spring({
    frame,
    fps,
    delay: 45,
    config: { damping: 200 },
  });

  // Glow pulse behind logo
  const glowSize = interpolate(
    frame % 80,
    [0, 40, 80],
    [400, 500, 400]
  );
  const glowOpacity = interpolate(
    frame,
    [20, 50],
    [0, 0.25],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Bottom bar items
  const bottomSpring = spring({
    frame,
    fps,
    delay: 60,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#09090b",
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
          background: `radial-gradient(circle, ${ACCENT}30 0%, transparent 70%)`,
          opacity: glowOpacity,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -60%)",
        }}
      />

      {/* Live badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 24px",
          borderRadius: 100,
          backgroundColor: `${ACCENT}15`,
          border: `1px solid ${ACCENT}40`,
          marginBottom: 36,
          transform: `scale(${badgeScale})`,
          opacity: badgeSpring,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: ACCENT,
            boxShadow: `0 0 12px ${ACCENT}`,
          }}
        />
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: ACCENT,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          Live on Flow Mainnet
        </span>
      </div>

      {/* Main heading */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: "#fafafa",
          letterSpacing: -2,
          opacity: ctaSpring,
          transform: `translateY(${ctaY}px)`,
          marginBottom: 24,
        }}
      >
        Start Streaming
      </div>

      {/* URL */}
      <div
        style={{
          fontSize: 36,
          fontWeight: 600,
          color: ACCENT,
          fontFamily: monoFamily,
          opacity: urlSpring,
          transform: `translateY(${urlY}px)`,
          marginBottom: 28,
          letterSpacing: 0.5,
        }}
      >
        streamvest.vercel.app
      </div>

      {/* Contract address */}
      <div
        style={{
          fontSize: 20,
          color: "#52525b",
          fontFamily: monoFamily,
          opacity: addrSpring,
          marginBottom: 60,
        }}
      >
        Deployed at 0x5ec90e3dcf0067c4
      </div>

      {/* Bottom bar: key stats */}
      <div
        style={{
          display: "flex",
          gap: 60,
          opacity: bottomSpring,
        }}
      >
        {[
          { label: "Fully On-Chain", value: "100%" },
          { label: "Min Interval", value: "60s" },
          { label: "Cost Per Delivery", value: "~0.04 FLOW" },
          { label: "License", value: "MIT" },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: "#fafafa",
                marginBottom: 6,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: 16,
                color: "#71717a",
                fontWeight: 400,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* StreamVest wordmark at very bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          fontSize: 20,
          color: "#27272a",
          fontWeight: 700,
          letterSpacing: 2,
        }}
      >
        STREAMVEST
      </div>
    </AbsoluteFill>
  );
};
