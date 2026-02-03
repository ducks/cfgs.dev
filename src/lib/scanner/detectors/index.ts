// Config-based detector system
// Detectors are defined in ./config/*.json and loaded by loader.ts

export {
  allDetectors,
  terminalDetectors,
  shellDetectors,
  editorDetectors,
  wmDetectors,
  miscDetectors,
} from "./loader";
