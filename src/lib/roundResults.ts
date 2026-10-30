import type { ArenaState, GameId } from "../types";

export const gameName = (game: GameId) => game === "accessibility" ? "Accessibility Unlock" : "Robot Commands";

// arena-get-state already scopes scores to room.config.roundId. Never combine
// score rows from different rounds to build a game summary.
export function roundResults(state: ArenaState) {
  if (!state.round) return null;
  const scores = new Map(state.scores.map((entry) => [entry.team_id, entry.score]));
  const ordered = state.teams.map((team) => ({ ...team, score: scores.get(team.id) ?? 0 }))
    .sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  let rank = 0;
  return {
    roundId: state.round.id,
    title: gameName(state.round.game),
    completed: state.round.status === "completed",
    interrupted: state.round.status === "interrupted",
    maximum: state.round.game === "accessibility" ? (state.round.config.scenarioIds?.length ?? 0) * 100 : (state.round.config.levelIds?.length ?? 0) * 320,
    teams: ordered.map((team, index) => {
      if (index === 0 || team.score !== ordered[index - 1].score) rank = index + 1;
      return { ...team, rank };
    }),
  };
}
