import { Detector } from "../types";
import { terminalDetectors } from "./terminals";
import { shellDetectors } from "./shells";
import { editorDetectors } from "./editors";
import { wmDetectors } from "./wm";
import { miscDetectors } from "./misc";

// All detectors in priority order
export const allDetectors: Detector[] = [
  ...terminalDetectors,
  ...shellDetectors,
  ...editorDetectors,
  ...wmDetectors,
  ...miscDetectors,
];

export * from "./terminals";
export * from "./shells";
export * from "./editors";
export * from "./wm";
export * from "./misc";
