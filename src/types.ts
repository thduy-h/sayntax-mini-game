export type GameId = "accessibility" | "robot";

export type AccessibilityOption = {
  id: string;
  label: string;
  detail: string;
  correct: boolean;
  points: number;
};

export type AccessibilityScenario = {
  id: string;
  code?: string;
  category?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  eyebrow: string;
  title: string;
  context: string;
  cue: string;
  options: AccessibilityOption[];
  principle: string;
  preview?: {
    type: string;
    before: Record<string, string>;
    after: Record<string, string>;
  };
  tags?: string[];
};

export type Direction = 0 | 1 | 2 | 3;
export type RobotCommand = "forward" | "left" | "right";
export type Cell = { x: number; y: number };

export type RobotLevel = {
  id: number;
  name: string;
  hint: string;
  start: Cell;
  goal: Cell;
  walls: string[];
  par: number;
  initialDirection?: Direction;
  tier?: "beginner" | "explorer" | "master";
  optimalCommands?: RobotCommand[];
};

export type RobotStepState = {
  position: Cell;
  direction: Direction;
  commandIndex: number;
  command: RobotCommand;
  blocked: boolean;
};

export type RobotRunResult = {
  position: Cell;
  direction: Direction;
  reachedGoal: boolean;
  blockedAt: number | null;
  path: Cell[];
  steps: RobotStepState[];
};

export type Team = {
  id: string;
  name: string;
  color: string;
  score: number;
  joinedAt: number;
};

export type ArenaRoomStatus = "lobby" | "locked" | "running" | "completed" | "expired";

export type ArenaRound = {
  id: string;
  game: GameId;
  status: "ready" | "running" | "completed" | "interrupted";
  config: {
    scenarioIds?: string[];
    levelIds?: string[];
  };
  content_version: string;
};

export type ArenaState = {
  room: {
    id: string;
    code: string;
    status: ArenaRoomStatus;
    expires_at: string;
    version: number;
  };
  round: ArenaRound | null;
  teams: Array<{ id: string; name: string; created_at: string }>;
  scores: Array<{ team_id: string; score: number; updated_at: string }>;
};

export type WorkshopIdentity =
  | { role: "mc"; roomCode: string; token: string }
  | { role: "team"; roomCode: string; token: string; teamId: string; teamName: string };
