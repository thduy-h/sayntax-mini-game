import type { Command, MapDefinition } from "./types";
export function simulate(map: MapDefinition, commands: Command[]) {
  let x = map.start.x,
    y = map.start.y,
    direction = map.initialDirection;
  const steps = [{ x, y, direction, blocked: false, goal: false }];
  for (const command of commands.slice(0, 24)) {
    let blocked = false;
    if (command === "left") direction = (direction + 3) % 4;
    else if (command === "right") direction = (direction + 1) % 4;
    else {
      const nx = x + [0, 1, 0, -1][direction],
        ny = y + [-1, 0, 1, 0][direction];
      blocked =
        nx < 0 ||
        ny < 0 ||
        nx >= map.width ||
        ny >= map.height ||
        map.walls.includes(`${nx},${ny}`);
      if (!blocked) {
        x = nx;
        y = ny;
      }
    }
    const goal = x === map.goal.x && y === map.goal.y;
    steps.push({ x, y, direction, blocked, goal });
    if (blocked || goal) break;
  }
  return steps;
}
