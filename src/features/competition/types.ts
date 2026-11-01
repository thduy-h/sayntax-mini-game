export type Question = {
  id: string;
  title: string;
  context: string;
  question: string;
  options: { id: string; label: string }[];
};
export type Command = "forward" | "left" | "right";
export type Position = { x: number; y: number };
export type MapDefinition = {
  id: string;
  name: string;
  width: number;
  height: number;
  start: Position;
  goal: Position;
  walls: string[];
  initialDirection: number;
  maxCommands: number;
};
export type Stage = {
  stageNo: number;
  status: "pending" | "active" | "finalized" | "skipped";
  roundId: string | null;
  roomCode?: string;
  activeIndex: number;
  activeItemId?: string;
  totalItems?: number;
  itemStartedAt?: string | null;
  itemDeadline?: string | null;
  itemFinalizedAt?: string | null;
  progress?: { total: number; submitted: number };
  teamStatus?: { name: string; submitted: boolean }[];
  startedAt: string | null;
  deadlineAt: string | null;
  config?: {
    scenarioIds?: string[];
    questions?: Question[];
    levelIds?: string[];
    maps?: MapDefinition[];
  };
  challenge?: Question | MapDefinition | null;
  review?: {
    itemId: string;
    explanation?: string;
    options?: { id: string; score: number }[];
    optimalCommands?: Command[];
  }[];
};
export type CompetitionState = {
  mode: "competition";
  role: "mc" | "team" | "presentation";
  serverNow: string;
  rulesVersion?: "v5" | "legacy";
  competitionMode?: "full" | "robot_only";
  resultsState?: string;
  ceremonyPhase?: "waiting" | "intro" | "ranking" | "winner" | "explanation" | "closing";
  robotDemo?: RobotDemoState;
  robotLevels?: RobotLevelSummary[];
  scoreExplanations?: ScoreExplanation[];
  demoStage?: number | null;
  a11yColorblindSim?: boolean;
  a11yViewMode?: "before" | "after";
  a11yViewScope?: string | null;
  joinCode?: string;
  teamsCount?: number;
  competition: {
    id: string;
    name: string;
    status: string;
    expiresAt: string;
    winnerTeamId: string | null;
  };
  stages: Stage[];
  teams?: { id: string; name: string }[];
  recoveryRequests?: { id: string; teamId: string; expiresAt: string }[];
  presentationEnabled?: boolean;
  own?: {
    teamId: string;
    competitionTeamId: string;
    name: string;
    submissions: {
      itemId: string;
      answerId: string | null;
      score: number | null;
    }[];
    tieSubmitted: boolean;
  };
  leaderboard?: {
    teamId: string;
    name: string;
    accessibility: number;
    robot: number;
    accessibility50: number;
    robot50: number;
    final100: number;
    rank: number;
    perfectAccessibility: number;
    optimalRobot: number;
    officialRobotRuns?: number;
  }[];
  tie?: {
    active: boolean;
    attempt: number;
    deadlineAt: string;
    candidates: string[];
    challenge?: Question;
  };
};
export type Identity = {
  competitionId: string;
  role: "mc" | "team";
  token: string;
  teamId?: string;
  competitionTeamId?: string;
  stage?: number;
  code?: string;
};

export type RobotLevelSummary = {
  itemId: string; canonicalVersion: string; label?: string; successful: boolean;
  firstCommands: number | null; bestCommands: number | null; optimalCommands?: number | null;
  extraCommands?: number | null; bestBaseScore: number; officialRuns: number;
  optimizationAttempts: number; penalty: number; finalScore: number; isOptimal?: boolean;
  history?: { run: number; successful: boolean; commandsUsed: number; baseScore: number; optimization: boolean }[];
};
export type RobotDemoState = {
  version: number; status: "idle" | "editing" | "running" | "paused" | "completed" | "failed";
  commands: Command[]; trace: { x: number; y: number; direction: number; blocked: boolean; goal: boolean }[];
  currentStepIndex: number; playbackOriginStep?: number; startedAt?: string | null;
  updatedAt?: string; serverNow?: string; explanation: boolean; solution?: Command[];
};
export type ScoreExplanation = {
  teamId: string; name: string;
  accessibility: { itemId: string; label: string; score: number; maximum: number }[];
  robot: RobotLevelSummary[];
  totals: NonNullable<CompetitionState["leaderboard"]>[number];
};

export type RobotExecution = { trace: { x: number; y: number; direction: number; blocked: boolean; goal: boolean }[] };
