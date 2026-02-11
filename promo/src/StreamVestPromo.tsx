import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { LogoReveal } from "./scenes/LogoReveal";
import { TransformScene } from "./scenes/TransformScene";
import { ValueProps } from "./scenes/ValueProps";
import { LaunchCTA } from "./scenes/LaunchCTA";

export const StreamVestPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#050505" }}>
      <TransitionSeries>
        {/* Scene 1: Logo Reveal — 5s */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <LogoReveal />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* Scene 2: ~~Vesting~~ → Streaming — 5.5s */}
        <TransitionSeries.Sequence durationInFrames={165}>
          <TransformScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: 15 })}
        />

        {/* Scene 3: Three value propositions — 7s */}
        <TransitionSeries.Sequence durationInFrames={210}>
          <ValueProps />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />

        {/* Scene 4: Live on Mainnet CTA — 12s */}
        <TransitionSeries.Sequence durationInFrames={360}>
          <LaunchCTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
