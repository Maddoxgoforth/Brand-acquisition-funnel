import type { DetailedHTMLProps, HTMLAttributes } from "react";

type WistiaPlayerElement = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  "media-id": string;
  aspect?: string | number;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "wistia-player": WistiaPlayerElement;
    }
  }
}
