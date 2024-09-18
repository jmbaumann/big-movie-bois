import type { ReactElement } from "react";
import {
  Clapperboard,
  Disc3,
  Eye,
  Film,
  Heart,
  Popcorn,
  Projector,
  Sofa,
  Star,
  Tv,
  Video,
  Videotape,
} from "lucide-react";

import { cn } from "~/utils/shadcn";

export default function StudioIcon({ image }: { image?: string | null }) {
  if (!image) return <></>;

  const icon = image.split("#")[0];
  const color = image.split("#")[1];

  let svg: ReactElement;
  switch (icon) {
    case "clapperboard":
      svg = <Clapperboard />;
      break;
    case "disc3":
      svg = <Disc3 />;
      break;
    case "eye":
      svg = <Eye />;
      break;
    case "film":
      svg = <Film />;
      break;
    case "heart":
      svg = <Heart />;
      break;
    case "popcorn":
      svg = <Popcorn />;
      break;
    case "projector":
      svg = <Projector />;
      break;
    case "sofa":
      svg = <Sofa />;
      break;
    case "star":
      svg = <Star />;
      break;
    case "tv":
      svg = <Tv />;
      break;
    case "video":
      svg = <Video />;
      break;
    case "videotape":
      svg = <Videotape />;
      break;
    default:
      svg = <></>;
  }

  return (
    <div
      className={cn("bg-primary h-[40px] w-[40px] rounded-full p-2 text-white", color ? `bg-[#${color}]` : "")}
      style={{ backgroundColor: `#${color}` }}
    >
      {svg}
    </div>
  );
}
