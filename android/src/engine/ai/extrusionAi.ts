import type { GameBoard } from "../../types/board";
import type { Coord } from "../../types/box";
import type { Player } from "../../types/game";
import {
  EXTRUSION_DIRECTIONS,
  executeExtrusionAction,
  getExtrusionMoveOptions,
  getExtrusionTurn,
  getSlideTarget,
  getSubBoards,
  getTargetStrip,
  type ExtrusionAction,
  type ExtrusionMove,
  type ExtrusionMoveOptions,
  type ExtrusionPlayMode,
} from "../extrusion/extrusionEngine";

interface PlanOptions {
  tapsRemaining: number;
  tapsPerTurn: number;
  difficulty: number;
  forcedOpponentPlay?: boolean;
  isCancelled?: () => boolean;
}

interface SearchProfile {
  depth: number;
  actionWidth: number;
  turnWidth: number;
  replyWidth: number;
  transitions: number;
  milliseconds: number;
  blunderRate: number;
}

const PROFILES: readonly SearchProfile[] = [
  { depth: 0, actionWidth: 1, turnWidth: 1, replyWidth: 0, transitions: 0, milliseconds: 0, blunderRate: 0.35 },
  { depth: 0, actionWidth: 1, turnWidth: 1, replyWidth: 0, transitions: 0, milliseconds: 0, blunderRate: 0.35 },
  { depth: 1, actionWidth: 5, turnWidth: 5, replyWidth: 1, transitions: 140, milliseconds: 110, blunderRate: 0.15 },
  { depth: 1, actionWidth: 6, turnWidth: 6, replyWidth: 2, transitions: 180, milliseconds: 135, blunderRate: 0.15 },
  { depth: 1, actionWidth: 7, turnWidth: 7, replyWidth: 3, transitions: 240, milliseconds: 170, blunderRate: 0.15 },
  { depth: 3, actionWidth: 7, turnWidth: 6, replyWidth: 0, transitions: 1100, milliseconds: 260, blunderRate: 0 },
  { depth: 3, actionWidth: 8, turnWidth: 7, replyWidth: 0, transitions: 1500, milliseconds: 350, blunderRate: 0 },
  { depth: 4, actionWidth: 8, turnWidth: 7, replyWidth: 0, transitions: 2100, milliseconds: 460, blunderRate: 0 },
  { depth: 4, actionWidth: 9, turnWidth: 8, replyWidth: 0, transitions: 2700, milliseconds: 550, blunderRate: 0 },
  { depth: 4, actionWidth: 10, turnWidth: 9, replyWidth: 0, transitions: 3500, milliseconds: 650, blunderRate: 0 },
];

interface ArenaCell {
  front: number;
  home: Player | null;
  centerDistance: number;
}

interface Analysis {
  options: ExtrusionMoveOptions;
  value: number;
  terminal: boolean;
  pressure: Record<Player, Float32Array>;
  key?: string;
}

interface TurnCandidate {
  board: GameBoard;
  moves: ExtrusionAction[];
  forced: boolean;
  value: number;
}

interface TableEntry {
  depth: number;
  value: number;
  bound: "exact" | "lower" | "upper";
}

interface Search {
  player: Player;
  difficulty: number;
  profile: SearchProfile;
  arenaCells: Array<ArenaCell | undefined>;
  frontSizes: number[];
  analyses: WeakMap<GameBoard, Analysis>;
  turns: WeakMap<GameBoard, Map<string, TurnCandidate[]>>;
  table?: Map<string, TableEntry>;
  deadline: number;
  nextYield: number;
  transitions: number;
  isCancelled?: () => boolean;
}

const SEARCH_LIMIT = Symbol("extrusion search limit");

function opponent(player: Player): Player {
  return player === 1 ? 2 : 1;
}

function createSearch(board: GameBoard, player: Player, options: PlanOptions): Search {
  const difficulty = Math.max(1, Math.min(10, Math.round(options.difficulty) || 1));
  const profile = PROFILES[difficulty - 1];
  const arenaCells = new Array<ArenaCell | undefined>(board.rows * board.cols);
  const frontSizes = getSubBoards(board).map((arena, front) => {
    const midRow = (arena.r1 + arena.r2) / 2;
    const midCol = (arena.c1 + arena.c2) / 2;
    for (let row = arena.r1; row <= arena.r2; row++) {
      for (let col = arena.c1; col <= arena.c2; col++) {
        arenaCells[row * board.cols + col] = {
          front,
          home: row < midRow ? 1 : row > midRow ? 2 : null,
          centerDistance: Math.abs(row - midRow) + 0.4 * Math.abs(col - midCol),
        };
      }
    }
    return (arena.r2 - arena.r1 + 1) * (arena.c2 - arena.c1 + 1);
  });
  const now = Date.now();
  return {
    player,
    difficulty,
    profile,
    arenaCells,
    frontSizes,
    analyses: new WeakMap(),
    turns: new WeakMap(),
    table: profile.depth === 4 ? new Map() : undefined,
    deadline: now + profile.milliseconds,
    nextYield: now + 7,
    transitions: 0,
    isCancelled: options.isCancelled,
  };
}

function cellIndex(board: GameBoard, { row, col }: Coord): number {
  return row >= 0 && row < board.rows && col >= 0 && col < board.cols
    ? row * board.cols + col
    : -1;
}

function analyze(board: GameBoard, search: Search): Analysis {
  const cached = search.analyses.get(board);
  if (cached) return cached;

  const options = getExtrusionMoveOptions(board);
  const boxes = Object.values(board.boxes);
  const scoring = { 1: 0, 2: 0 };
  const invaded = { 1: 0, 2: 0 };
  const threats = { 1: 0, 2: 0 };
  const denied = { 1: 0, 2: 0 };
  const margins = new Array<number>(search.frontSizes.length).fill(0);
  const pressure = {
    1: new Float32Array(search.arenaCells.length),
    2: new Float32Array(search.arenaCells.length),
  };

  for (const box of boxes) {
    const owner = box.owner;
    if (owner === null) continue;
    scoring[owner] += box.cells.length;
    for (const cell of box.cells) {
      const arena = search.arenaCells[cellIndex(board, cell)];
      if (!arena) continue;
      margins[arena.front] += owner === search.player ? 1 : -1;
      if (arena.home === opponent(owner)) invaded[owner]++;
    }

    // Identify large open strips and those a single neutral block is pinning.
    if (search.profile.depth === 0 || box.cells.length === 0) continue;
    const front = search.arenaCells[cellIndex(board, box.cells[0])]?.front;
    if (front === undefined) continue;
    for (const direction of EXTRUSION_DIRECTIONS) {
      const targets = getTargetStrip(box, direction);
      let neutralIndex = -1;
      let available = true;
      for (const target of targets) {
        const index = cellIndex(board, target);
        if (index < 0 || search.arenaCells[index]?.front !== front) {
          available = false;
          break;
        }
        const occupant = board.cellMap[target.row][target.col];
        if (occupant === null) continue;
        if (board.boxes[occupant]?.owner !== null || neutralIndex >= 0) {
          available = false;
          break;
        }
        neutralIndex = index;
      }
      if (!available) continue;
      if (neutralIndex >= 0) {
        denied[owner] += targets.length;
        pressure[owner][neutralIndex] = Math.max(pressure[owner][neutralIndex], targets.length);
      } else {
        threats[owner] = Math.max(threats[owner], targets.length);
        for (const target of targets) {
          const index = cellIndex(board, target);
          pressure[owner][index] = Math.max(pressure[owner][index], targets.length);
        }
      }
    }
  }

  const player = search.player;
  const rival = opponent(player);
  const own = options.players[player];
  const enemy = options.players[rival];
  const ownCount = own.spawns.length + own.expansions.length;
  const enemyCount = enemy.spawns.length + enemy.expansions.length;
  const terminal = ownCount === 0 && enemyCount === 0 && options.neutral.length === 0;
  const scoreMargin = scoring[player] - scoring[rival];
  const frontControl = margins.length > 1
    ? margins.reduce((sum, margin, front) =>
        sum + Math.max(-1, Math.min(1, (2 * margin) / search.frontSizes[front])), 0)
    : 0;
  const forcedPressure = ownCount === 0 && enemyCount > 0 ? -1
    : enemyCount === 0 && ownCount > 0 ? 1 : 0;

  const value = terminal
    ? Math.sign(scoreMargin) * 10000 + scoreMargin
    : 5 * scoreMargin +
      1.2 * (invaded[player] - invaded[rival]) +
      0.35 * (own.expansions.length - enemy.expansions.length) +
      0.8 * (threats[player] - threats[rival]) +
      0.24 * (denied[rival] - denied[player]) +
      3.5 * frontControl +
      9 * forcedPressure;

  const result = { options, value, terminal, pressure };
  search.analyses.set(board, result);
  return result;
}

function positionKey(board: GameBoard, search: Search): string {
  const analysis = analyze(board, search);
  if (analysis.key !== undefined) return analysis.key;

  // Normalize block IDs while preserving each block's footprint and owner.
  const labels = new Map<string, string>();
  let kinds = "";
  let cells = "";
  for (const row of board.cellMap) {
    for (const id of row) {
      if (id === null) {
        cells += ".";
        continue;
      }
      let label = labels.get(id);
      if (label === undefined) {
        label = String.fromCharCode(256 + labels.size);
        labels.set(id, label);
        const box = board.boxes[id];
        kinds += box?.blockType === "movable_green" ? "g" : (box?.owner ?? "b");
      }
      cells += label;
    }
  }
  analysis.key = kinds + "|" + cells + "|" + board.unlockedWhiteRows?.join(",") +
    "|" + board.unlockedWhiteCells?.join(";");
  return analysis.key;
}

function orderActions(
  board: GameBoard,
  moves: ExtrusionAction[],
  player: Player,
  mode: ExtrusionPlayMode,
  search: Search,
  width: number,
  followUp = false
): ExtrusionAction[] {
  const rival = opponent(player);
  const { pressure } = analyze(board, search);
  const ranked = moves.map((action) => {
    const block = action.type === "extrude" || action.type === "slide"
      ? board.boxes[action.boxId]
      : undefined;
    let targets: Coord[];
    if (action.type === "extrude") targets = getTargetStrip(board.boxes[action.boxId], action.direction);
    else if (action.type === "slide") {
      const target = getSlideTarget(board.boxes[action.boxId], action.direction);
      targets = target ? [target] : [];
    } else targets = [action];

    const owner = block ? block.owner
      : action.type === "spawn_green" ? null
      : mode === "forced-spawn" ? rival : player;
    const gain = owner === null ? 0 : owner === player ? targets.length : -targets.length;
    const arena = targets[0] && search.arenaCells[cellIndex(board, targets[0])];
    let value = gain * 2;
    for (const target of targets) {
      const index = cellIndex(board, target);
      if (index < 0) continue;
      if (search.difficulty > 1 && owner !== null) {
        const cell = search.arenaCells[index];
        const sign = owner === player ? 1 : -1;
        if (cell?.home === opponent(owner)) value += sign * 0.6;
        if (action.type === "spawn" && cell) value += sign * (0.8 - 0.12 * cell.centerDistance);
      }
      value += 0.4 * pressure[rival][index];
      if (owner === null) value -= 0.35 * pressure[player][index];
    }
    if (action.type === "slide" && block) {
      const index = cellIndex(board, block.cells[0]);
      value += 0.55 * (pressure[player][index] - pressure[rival][index]);
    }
    return { action, value, front: arena?.front ?? -1 };
  });
  ranked.sort((a, b) => b.value - a.value);

  // Include setup moves before their scoring follow-up is visible on the board.
  const setup = followUp && search.profile.depth >= 3 && width >= 4
    ? [
        ranked.find(({ action }) => action.type === "slide"),
        ranked.find(({ action }) => action.type === "extrude" && board.boxes[action.boxId].owner === null),
        ranked.find(({ action }) => action.type === "spawn"),
      ].filter((entry) => entry !== undefined)
    : [];

  // Reserve room for the best action on each front before filling the beam.
  const firstCount = Math.max(1, width - search.frontSizes.length - setup.length + 1);
  const selected = new Set(ranked.slice(0, firstCount));
  for (const entry of setup) {
    if (selected.size >= width) break;
    selected.add(entry);
  }
  const fronts = new Set([...selected].map((entry) => entry.front));
  for (const entry of ranked) {
    if (selected.size >= width) break;
    if (fronts.has(entry.front)) continue;
    selected.add(entry);
    fronts.add(entry.front);
  }
  for (const entry of ranked) {
    if (selected.size >= width) break;
    selected.add(entry);
  }
  return [...selected].map((entry) => entry.action);
}

function* spendTransition(search: Search): Generator<void> {
  const now = Date.now();
  if (
    search.isCancelled?.() || ++search.transitions > search.profile.transitions ||
    now >= search.deadline
  ) throw SEARCH_LIMIT;
  if (now >= search.nextYield) {
    yield;
    search.nextYield = Date.now() + 7;
  }
}

function* generateTurns(
  board: GameBoard,
  player: Player,
  actions: number,
  forced: boolean,
  search: Search,
  root = false
): Generator<void, TurnCandidate[]> {
  const cacheKey = player + ":" + actions + ":" + forced + ":" + root;
  let cached = search.turns.get(board);
  if (!cached) {
    cached = new Map();
    search.turns.set(board, cached);
  }
  const previous = cached.get(cacheKey);
  if (previous) return previous;

  const actionWidth = root ? search.profile.actionWidth : Math.max(3, search.profile.actionWidth - 3);
  const turnWidth = root ? search.profile.turnWidth : Math.max(3, search.profile.turnWidth - 3);
  const sign = player === search.player ? 1 : -1;
  let partials: TurnCandidate[] = [{ board, moves: [], forced, value: analyze(board, search).value }];

  for (let step = 0; step < actions; step++) {
    const children = new Map<string, TurnCandidate>();
    for (const partial of partials) {
      const turn = getExtrusionTurn(analyze(partial.board, search).options, player, partial.forced);
      if (turn.moves.length === 0) {
        children.set(positionKey(partial.board, search) + ":" + partial.forced, partial);
        continue;
      }

      const ordered = orderActions(
        partial.board, turn.moves, player, turn.mode, search, actionWidth, step + 1 < actions
      );
      for (const action of ordered) {
        yield* spendTransition(search);
        const result = executeExtrusionAction(partial.board, action, player, turn.mode);
        if (!result) continue;
        const nextForced = partial.forced || turn.mode !== "own";
        const key = positionKey(result.board, search) + ":" + nextForced;
        if (children.has(key)) continue;
        children.set(key, {
          board: result.board,
          moves: [...partial.moves, action],
          forced: nextForced,
          value: analyze(result.board, search).value,
        });
      }
    }

    partials = Array.from(children.values())
      .sort((a, b) => sign * (b.value - a.value))
      .slice(0, step + 1 < actions ? actionWidth : turnWidth);
  }
  cached.set(cacheKey, partials);
  return partials;
}

function* minimax(
  board: GameBoard,
  player: Player,
  depth: number,
  actions: number,
  alpha: number,
  beta: number,
  search: Search
): Generator<void, number> {
  const analysis = analyze(board, search);
  if (depth === 0 || analysis.terminal) return analysis.value;

  const key = search.table ? player + "|" + positionKey(board, search) : "";
  const entry = search.table?.get(key);
  if (entry && entry.depth >= depth) {
    if (entry.bound === "exact") return entry.value;
    if (entry.bound === "lower") alpha = Math.max(alpha, entry.value);
    else beta = Math.min(beta, entry.value);
    if (alpha >= beta) return entry.value;
  }

  const originalAlpha = alpha;
  const originalBeta = beta;
  const maximizing = player === search.player;
  const turns = yield* generateTurns(board, player, actions, false, search);
  let best = maximizing ? -Infinity : Infinity;
  for (const turn of turns) {
    const value = yield* minimax(turn.board, opponent(player), depth - 1, actions, alpha, beta, search);
    if (maximizing) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, best);
    }
    if (alpha >= beta) break;
  }
  if (!Number.isFinite(best)) return analysis.value;

  if (search.table && (!entry || entry.depth <= depth)) {
    const bound = best <= originalAlpha ? "upper" : best >= originalBeta ? "lower" : "exact";
    search.table.set(key, { depth, value: best, bound });
  }
  return best;
}

function* immediateReply(
  board: GameBoard,
  search: Search,
  alpha: number
): Generator<void, number> {
  const player = opponent(search.player);
  const analysis = analyze(board, search);
  if (analysis.terminal) return analysis.value;
  const turn = getExtrusionTurn(analysis.options, player);
  let value = Infinity;
  for (const action of orderActions(board, turn.moves, player, turn.mode, search, search.profile.replyWidth)) {
    yield* spendTransition(search);
    const result = executeExtrusionAction(board, action, player, turn.mode);
    if (!result) continue;
    value = Math.min(value, analyze(result.board, search).value);
    if (value <= alpha) break;
  }
  return Number.isFinite(value) ? value : analysis.value;
}

function chooseFallback(
  board: GameBoard,
  player: Player,
  actions: number,
  forced: boolean,
  random: boolean,
  search: Search
): ExtrusionAction[] {
  const plan: ExtrusionAction[] = [];
  for (let step = 0; step < actions; step++) {
    const turn = getExtrusionTurn(analyze(board, search).options, player, forced);
    let moves = turn.moves;
    if (search.profile.depth === 0 && turn.mode === "own") {
      const scoring = moves.filter((action) =>
        action.type === "spawn" || (action.type === "extrude" && board.boxes[action.boxId].owner === player)
      );
      if (scoring.length > 0) moves = scoring;
    }
    if (moves.length === 0) break;
    const action = random
      ? moves[Math.floor(Math.random() * moves.length)]
      : orderActions(board, moves, player, turn.mode, search, 1)[0];
    const result = executeExtrusionAction(board, action, player, turn.mode);
    if (!result) break;
    forced ||= turn.mode !== "own";
    plan.push(action);
    board = result.board;
  }
  return plan;
}

function* searchPlan(
  board: GameBoard,
  player: Player,
  options: PlanOptions
): Generator<void, ExtrusionAction[]> {
  if (options.tapsRemaining <= 0 || options.isCancelled?.()) return [];
  const search = createSearch(board, player, options);
  const { profile } = search;
  const remaining = profile.depth === 0 ? 1 : options.tapsRemaining;
  const forced = options.forcedOpponentPlay ?? false;
  const blunder = profile.blunderRate > 0 && Math.random() < profile.blunderRate;
  let plan = chooseFallback(board, player, remaining, forced, blunder, search);
  if (plan.length === 0 || blunder || profile.depth === 0) return plan;

  try {
    const turns = yield* generateTurns(board, player, remaining, forced, search, true);
    let preferred = turns[0];
    if (!preferred) return plan;
    plan = preferred.moves;

    // Complete each horizon before accepting its result, retaining a full legal plan on timeout.
    const startDepth = profile.replyWidth > 0 ? 1 : 2;
    for (let depth = startDepth; depth <= profile.depth; depth++) {
      const ordered = [preferred, ...turns.filter((turn) => turn !== preferred)];
      let bestValue = -Infinity;
      let best = preferred;
      for (const turn of ordered) {
        const value = profile.replyWidth > 0
          ? yield* immediateReply(turn.board, search, bestValue)
          : yield* minimax(
              turn.board, opponent(player), depth - 1,
              options.tapsPerTurn, bestValue, Infinity, search
            );
        if (value > bestValue) {
          bestValue = value;
          best = turn;
        }
      }
      preferred = best;
      plan = best.moves;
    }
  } catch (error) {
    if (error !== SEARCH_LIMIT) throw error;
  }

  return options.isCancelled?.() ? [] : plan;
}

/** Search in short slices so deep turns leave room for the board to render. */
export async function planExtrusionTurn(
  board: GameBoard,
  player: Player,
  options: PlanOptions
): Promise<ExtrusionAction[]> {
  const work = searchPlan(board, player, options);
  for (let result = work.next(); ; result = work.next()) {
    if (result.done) return result.value;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (options.isCancelled?.()) return [];
  }
}

/** Single-action entry point for callers that do not retain the plan. */
export function getBotExtrusionMove(
  board: GameBoard,
  player: Player = 2,
  unlockedWhiteRows = board.unlockedWhiteRows,
  difficulty = 3
): ExtrusionMove | null {
  const position = unlockedWhiteRows === board.unlockedWhiteRows ? board : { ...board, unlockedWhiteRows };
  const work = searchPlan(position, player, { tapsRemaining: 2, tapsPerTurn: 2, difficulty });
  for (let result = work.next(); ; result = work.next()) {
    if (result.done) return result.value[0] ? { ...result.value[0], player } : null;
  }
}
