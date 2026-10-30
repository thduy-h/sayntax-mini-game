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
  status: "pending" | "active" | "finalized";
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
  demoStage?: number | null;
  joinCode?: string;
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
