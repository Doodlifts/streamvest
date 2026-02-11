import { Composition } from "remotion";
import { StreamVestPromo } from "./StreamVestPromo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="StreamVestPromo"
      component={StreamVestPromo}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
