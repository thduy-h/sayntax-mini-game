import { createContext } from "react";

// Authenticated competition screens consume the server projection. Practice
// without a provider retains its independent local simulation controls.
export const AccessibilityDisplayContext = createContext<{
  colorblindSim: boolean;
  busy: boolean;
  onColorblindSimChange?: (enabled: boolean) => void;
} | null>(null);
