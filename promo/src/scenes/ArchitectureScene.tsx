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
  weights: ["400", "600", "800"],
  subsets: ["latin"],
});

const { fontFamily: monoFamily } = loadMono("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
});

const ACCENT = "#00ef8b";

type BoxProps = {
  label: string;
  sublabel: string;
  x: number;
  y: number;
  delay: number;
  accent?: boolean;
};

const ArchBox: React.FC<BoxProps> = ({ label, sublabel, x, y, delay, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, delay, config: { damping: 200 } });
  const scale = interpolate(s, [0, 1], [0.7, 1]);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `scale(${scale})`,
        opacity: s,
      }}
    >
      <div
        style={{
          padding: "20px 28px",
          borderRadius: 16,
          backgroundColor: accent ? `${ACCENT}12` : "#18181b",
          border: `2px solid ${accent ? ACCENT : "#27272a"}`,
          minWidth: 220,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: accent ? ACCENT : "#fafafa",
            fontFamily: monoFamily,
            marginBottom: 6,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 15,
            color: "#71717a",
            fontFamily,
          }}
        >
          {sublabel}
        </div>
      </div>
    </div>
  );
};

const AnimatedArrow: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay: number;
}> = ({ x1, y1, x2, y2, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const currentX = x1 + (x2 - x1) * progress;
  const currentY = y1 + (y2 - y1) * progress;

  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
    >
      <line
        x1={x1}
        y1={y1}
        x2={currentX}
        y2={currentY}
        stroke={ACCENT}
        strokeWidth={2}
        strokeDasharray="6 4"
        opacity={0.6}
      />
      {progress > 0.9 && (
        <circle cx={x2} cy={y2} r={5} fill={ACCENT} opacity={0.8} />
      )}
    </svg>
  );
};

export const ArchitectureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headSpring = spring({ frame, fps, config: { damping: 200 } });

  // Autonomous loop pulse
  const loopPulse = interpolate(
    frame % 40,
    [0, 20, 40],
    [0.3, 0.7, 0.3],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const loopVisible = interpolate(frame, [100, 115], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
          top: 60,
          width: "100%",
          textAlign: "center",
          fontSize: 48,
          fontWeight: 800,
          color: "#fafafa",
          opacity: headSpring,
          letterSpacing: -1,
        }}
      >
        How it works
      </div>

      {/* Architecture boxes */}
      <ArchBox
        label="Flow Wallet"
        sublabel="User connects & signs"
        x={120}
        y={200}
        delay={15}
      />
      <ArchBox
        label="StreamVest.createStream()"
        sublabel="Mints NFT with locked FLOW"
        x={480}
        y={180}
        delay={30}
        accent
      />
      <ArchBox
        label="SchedulerV2.createHandler()"
        sublabel="Sets up autonomous delivery"
        x={900}
        y={180}
        delay={45}
      />
      <ArchBox
        label="FlowTransactionScheduler"
        sublabel="Queues first delivery"
        x={1340}
        y={200}
        delay={60}
      />

      {/* Autonomous loop box */}
      <div
        style={{
          position: "absolute",
          left: 560,
          top: 460,
          opacity: loopVisible,
        }}
      >
        <div
          style={{
            padding: "28px 48px",
            borderRadius: 20,
            backgroundColor: `${ACCENT}08`,
            border: `2px solid ${ACCENT}`,
            boxShadow: `0 0 ${40 * loopPulse}px ${ACCENT}30`,
            textAlign: "center",
            minWidth: 700,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: ACCENT,
              marginBottom: 12,
            }}
          >
            Autonomous Loop
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#a1a1aa",
              fontFamily: monoFamily,
              lineHeight: 1.8,
            }}
          >
            Scheduler fires → handler executes → tokens sent → reschedules next
          </div>
        </div>
      </div>

      {/* Arrows */}
      <AnimatedArrow x1={380} y1={240} x2={480} y2={220} delay={25} />
      <AnimatedArrow x1={760} y1={220} x2={900} y2={220} delay={40} />
      <AnimatedArrow x1={1180} y1={220} x2={1340} y2={240} delay={55} />
      <AnimatedArrow x1={910} y1={280} x2={910} y2={460} delay={90} />

      {/* Bottom text */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          width: "100%",
          textAlign: "center",
          fontSize: 26,
          fontWeight: 600,
          color: "#52525b",
          opacity: interpolate(frame, [120, 140], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        No keeper bots · No off-chain infrastructure · Fully on-chain
      </div>
    </AbsoluteFill>
  );
};
