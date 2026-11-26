import { GameBoard } from "../../types/board";
import { GameBox, Coord } from "../../types/box";
import { Player } from "../../types/game";
import { SubBoardConfig } from "../../types/campaignBlueprint";
import { EXTRUSION_THEME, PLAYER_1_PRIMARY, PLAYER_2_PRIMARY } from "../../constants/theme/extrusionTheme";

export const EXTRUSION_DIRECTIONS = ["up", "down", "left", "right"] as const;
export type ExtrudeDirection = (typeof EXTRUSION_DIRECTIONS)[number];
export type TerritoryZone = "player1" | "player2" | "neutral";
export type ExtrusionPlayMode = "own" | "forced-extrude" | "forced-spawn";

export type ExtrusionAction =
  | { type: "spawn"; row: number; col: number }
  | { type: "spawn_green"; row: number; col: number }
  | { type: "extrude"; boxId: string; direction: ExtrudeDirection }
  | { type: "slide"; boxId: string; direction: ExtrudeDirection };

export type ExtrusionMove = ExtrusionAction & { player: Player };

export interface RectBounds {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

/**
 * Returns sub-boards for a board. If no sub-boards are configured (e.g. Levels 1–10),
 * treats the whole board as a single independent sub-board spanning all rows and cols.
 */
export function getSubBoards(board: GameBoard): SubBoardConfig[] {
  if (board.subBoards && board.subBoards.length > 0) {
    return board.subBoards;
  }
  return [
    {
      id: "main",
      name: "Main Arena",
      r1: 0,
      c1: 0,
      r2: board.rows - 1,
      c2: board.cols - 1,
    },
  ];
}

/**
 * Finds which sub-board a given cell belongs to.
 * Returns null if the cell lies in void space between sub-boards.
 */
export function findSubBoardForCell(
  board: GameBoard,
  row: number,
  col: number
): SubBoardConfig | null {
  const subBoards = getSubBoards(board);
  for (const sb of subBoards) {
    if (row >= sb.r1 && row <= sb.r2 && col >= sb.c1 && col <= sb.c2) {
      return sb;
    }
  }
  return null;
}

/**
 * Finds which sub-board a given block belongs to.
 */
export function findSubBoardForBox(
  board: GameBoard,
  box: GameBox
): SubBoardConfig | null {
  if (!box.cells || box.cells.length === 0) return null;
  const c0 = box.cells[0];
  return findSubBoardForCell(board, c0.row, c0.col);
}

/**
 * Returns initial neutral (white) rows for a single board.
 */
export function computeInitialWhiteRows(rows: number): number[] {
  if (rows % 2 === 1) {
    return [Math.floor(rows / 2)];
  }
  return [];
}

/**
 * Returns the territory zone of a given row on a classic uniform board.
 */
export function getRowTerritoryZone(
  row: number,
  totalRows: number,
  unlockedWhiteRows: number[] | Set<number>
): TerritoryZone {
  const whiteSet = Array.isArray(unlockedWhiteRows)
    ? new Set(unlockedWhiteRows)
    : unlockedWhiteRows;

  if (whiteSet.has(row)) {
    return "neutral";
  }

  const isEven = totalRows % 2 === 0;
  if (isEven) {
    const mid = totalRows / 2;
    return row < mid ? "player1" : "player2";
  } else {
    const mid = Math.floor(totalRows / 2);
    if (row === mid) return "neutral";
    return row < mid ? "player1" : "player2";
  }
}

/**
 * Determines the territory zone of any cell, respecting independent sub-boards.
 * - Top half of sub-board: Player 1 territory.
 * - Bottom half of sub-board: Player 2 territory.
 * - Midline/invaded rows: Neutral white zone.
 * - Cells outside any sub-board: "void".
 */
export function getCellTerritoryZone(
  board: GameBoard,
  row: number,
  col: number,
  unlockedWhiteCells: string[] | Set<string> | undefined = board.unlockedWhiteCells,
  unlockedWhiteRows: number[] | Set<number> | undefined = board.unlockedWhiteRows
): TerritoryZone | "void" {
  const subBoard = findSubBoardForCell(board, row, col);
  if (!subBoard) return "void";
  const legacyRows = (board.subBoards?.length ?? 0) <= 1 ? unlockedWhiteRows : undefined;
  return territoryInSubBoard(subBoard, row, col, unlockedWhiteCells, legacyRows);
}

function includesCell<T>(values: T[] | Set<T> | undefined, value: T): boolean {
  return values instanceof Set ? values.has(value) : values?.includes(value) ?? false;
}

function territoryInSubBoard(
  subBoard: SubBoardConfig,
  row: number,
  col: number,
  whiteCells: string[] | Set<string> | undefined,
  whiteRows: number[] | Set<number> | undefined
): TerritoryZone {
  const midline = (subBoard.r1 + subBoard.r2) / 2;
  if (
    row === midline ||
    includesCell(whiteRows, row) ||
    includesCell(whiteCells, `${row},${col}`)
  ) return "neutral";
  return row < midline ? "player1" : "player2";
}

/**
 * Computes dynamically unlocked white cells and rows across all sub-boards.
 * When a player invades into the opponent's territory of an independent sub-board,
 * the rows up to their furthest block in that sub-board turn neutral white!
 */
export function computeUnlockedWhiteState(
  board: GameBoard,
  previouslyUnlockedCells: string[] = [],
  previouslyUnlockedRows: number[] = []
): { unlockedWhiteRows: number[]; unlockedWhiteCells: string[] } {
  const whiteCellSet = new Set<string>(previouslyUnlockedCells);
  const whiteRowSet = new Set<number>(previouslyUnlockedRows);

  const subBoards = getSubBoards(board);
  const boxes = Object.values(board.boxes);

  for (const sb of subBoards) {
    const sbRows = sb.r2 - sb.r1 + 1;
    const isEven = sbRows % 2 === 0;
    const p1BaseMax = sb.r1 + (isEven ? sbRows / 2 - 1 : Math.floor(sbRows / 2) - 1);
    const p2BaseMin = sb.r1 + (isEven ? sbRows / 2 : Math.floor(sbRows / 2) + 1);

    if (!isEven) {
      const midRow = sb.r1 + Math.floor(sbRows / 2);
      for (let c = sb.c1; c <= sb.c2; c++) {
        whiteCellSet.add(`${midRow},${c}`);
      }
      whiteRowSet.add(midRow);
    }

    let maxP1Row = -1;
    let minP2Row = sb.r2 + 1;

    for (const box of boxes) {
      if (box.owner === 1) {
        for (const cell of box.cells) {
          if (cell.col >= sb.c1 && cell.col <= sb.c2 && cell.row >= sb.r1 && cell.row <= sb.r2) {
            if (cell.row > maxP1Row) maxP1Row = cell.row;
          }
        }
      } else if (box.owner === 2) {
        for (const cell of box.cells) {
          if (cell.col >= sb.c1 && cell.col <= sb.c2 && cell.row >= sb.r1 && cell.row <= sb.r2) {
            if (cell.row < minP2Row) minP2Row = cell.row;
          }
        }
      }
    }

    // Player 1 invaded Player 2's territory of this sub-board
    if (maxP1Row >= p2BaseMin) {
      for (let r = p2BaseMin; r <= maxP1Row; r++) {
        for (let c = sb.c1; c <= sb.c2; c++) {
          whiteCellSet.add(`${r},${c}`);
        }
        whiteRowSet.add(r);
      }
    }

    // Player 2 invaded Player 1's territory of this sub-board
    if (minP2Row <= p1BaseMax) {
      for (let r = minP2Row; r <= p1BaseMax; r++) {
        for (let c = sb.c1; c <= sb.c2; c++) {
          whiteCellSet.add(`${r},${c}`);
        }
        whiteRowSet.add(r);
      }
    }
  }

  return {
    unlockedWhiteRows: Array.from(whiteRowSet).sort((a, b) => a - b),
    unlockedWhiteCells: Array.from(whiteCellSet),
  };
}

export function computeUnlockedWhiteRows(
  totalRows: number,
  board: GameBoard,
  previouslyUnlocked: number[] = []
): number[] {
  const result = computeUnlockedWhiteState(
    board,
    board.unlockedWhiteCells ?? [],
    previouslyUnlocked
  );
  return result.unlockedWhiteRows;
}

/** Check a spawn for the actor or for the opponent during forced play. */
export function canSpawnAt(
  board: GameBoard,
  row: number,
  col: number,
  player: Player,
  unlockedWhiteRows = board.unlockedWhiteRows,
  unlockedWhiteCells = board.unlockedWhiteCells,
  mode: ExtrusionPlayMode = "own"
): boolean {
  if (mode === "forced-extrude" || board.cellMap[row]?.[col] !== null) {
    return false;
  }

  const owner = mode === "forced-spawn" ? opponentOf(player) : player;
  const zone = getCellTerritoryZone(board, row, col, unlockedWhiteCells, unlockedWhiteRows);
  return zone === "neutral" || zone === (owner === 1 ? "player1" : "player2");
}

export function getBlockRect(box: GameBox): RectBounds {
  let r1 = Infinity;
  let c1 = Infinity;
  let r2 = -Infinity;
  let c2 = -Infinity;

  for (const cell of box.cells) {
    r1 = Math.min(r1, cell.row);
    c1 = Math.min(c1, cell.col);
    r2 = Math.max(r2, cell.row);
    c2 = Math.max(c2, cell.col);
  }

  return box.cells.length > 0 ? { r1, c1, r2, c2 } : { r1: 0, c1: 0, r2: 0, c2: 0 };
}

function getStripBounds(rect: RectBounds, direction: ExtrudeDirection): RectBounds {
  switch (direction) {
    case "up":
      return { ...rect, r1: rect.r1 - 1, r2: rect.r1 - 1 };
    case "down":
      return { ...rect, r1: rect.r2 + 1, r2: rect.r2 + 1 };
    case "left":
      return { ...rect, c1: rect.c1 - 1, c2: rect.c1 - 1 };
    case "right":
      return { ...rect, c1: rect.c2 + 1, c2: rect.c2 + 1 };
  }
}

function cellsInRect({ r1, c1, r2, c2 }: RectBounds): Coord[] {
  const cells: Coord[] = [];
  for (let row = r1; row <= r2; row++) {
    for (let col = c1; col <= c2; col++) {
      cells.push({ row, col });
    }
  }
  return cells;
}

export function getTargetStrip(box: GameBox, direction: ExtrudeDirection): Coord[] {
  return cellsInRect(getStripBounds(getBlockRect(box), direction));
}

function isOpenInSubBoard(
  board: GameBoard,
  bounds: RectBounds,
  subBoard: SubBoardConfig | null
): boolean {
  if (
    !subBoard ||
    bounds.r1 < subBoard.r1 || bounds.r2 > subBoard.r2 ||
    bounds.c1 < subBoard.c1 || bounds.c2 > subBoard.c2
  ) {
    return false;
  }

  for (let row = bounds.r1; row <= bounds.r2; row++) {
    for (let col = bounds.c1; col <= bounds.c2; col++) {
      if (board.cellMap[row]?.[col] !== null) return false;
    }
  }
  return true;
}

export function canExpandBlock(
  board: GameBoard,
  box: GameBox,
  direction: ExtrudeDirection,
  player?: Player,
  mode: ExtrusionPlayMode = "own"
): boolean {
  if (box.blockType === "movable_green" || box.cells.length === 0) return false;
  if (player !== undefined) {
    if (mode === "forced-spawn") return false;
    if (mode === "forced-extrude" && box.owner !== opponentOf(player)) return false;
    if (mode === "own" && box.owner !== null && box.owner !== player) return false;
  }

  return isOpenInSubBoard(
    board,
    getStripBounds(getBlockRect(box), direction),
    findSubBoardForBox(board, box)
  );
}

export function getValidExtrudeDirections(
  board: GameBoard,
  box: GameBox
): ExtrudeDirection[] {
  if (box.blockType === "movable_green" || box.cells.length === 0) return [];
  const rect = getBlockRect(box);
  const subBoard = findSubBoardForBox(board, box);
  return EXTRUSION_DIRECTIONS.filter((direction) =>
    isOpenInSubBoard(board, getStripBounds(rect, direction), subBoard)
  );
}

const STEP: Record<ExtrudeDirection, Coord> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
};

export function getSlideTarget(box: GameBox, direction: ExtrudeDirection): Coord | null {
  const from = box.cells[0];
  if (box.blockType !== "movable_green" || box.owner !== null || box.cells.length !== 1) {
    return null;
  }
  const step = STEP[direction];
  return { row: from.row + step.row, col: from.col + step.col };
}

export function canMoveBlock(board: GameBoard, box: GameBox, direction: ExtrudeDirection): boolean {
  const to = getSlideTarget(box, direction);
  if (!to || board.cellMap[to.row]?.[to.col] !== null) return false;
  const subBoard = findSubBoardForBox(board, box);
  return !!subBoard && to.row >= subBoard.r1 && to.row <= subBoard.r2 &&
    to.col >= subBoard.c1 && to.col <= subBoard.c2;
}

function opponentOf(player: Player): Player {
  return player === 1 ? 2 : 1;
}

interface PlayerMoveOptions {
  spawns: ExtrusionAction[];
  expansions: ExtrusionAction[];
}

export interface ExtrusionMoveOptions {
  players: Record<Player, PlayerMoveOptions>;
  neutral: ExtrusionAction[];
}

/** Enumerate both players' options and the shared obstacle actions once per position. */
export function getExtrusionMoveOptions(
  board: GameBoard,
  unlockedWhiteRows = board.unlockedWhiteRows,
  unlockedWhiteCells = board.unlockedWhiteCells
): ExtrusionMoveOptions {
  const players: ExtrusionMoveOptions["players"] = {
    1: { spawns: [], expansions: [] },
    2: { spawns: [], expansions: [] },
  };
  const neutral: ExtrusionAction[] = [];
  const subBoards = getSubBoards(board);
  const whiteRows = subBoards.length === 1 ? new Set(unlockedWhiteRows) : undefined;
  const whiteCells = new Set(unlockedWhiteCells);

  for (const subBoard of subBoards) {
    for (let row = subBoard.r1; row <= subBoard.r2; row++) {
      for (let col = subBoard.c1; col <= subBoard.c2; col++) {
        if (board.cellMap[row]?.[col] !== null) continue;
        const zone = territoryInSubBoard(subBoard, row, col, whiteCells, whiteRows);
        const spawn: ExtrusionAction = { type: "spawn", row, col };
        if (zone !== "player2") players[1].spawns.push(spawn);
        if (zone !== "player1") players[2].spawns.push(spawn);
        if (zone === "neutral") neutral.push({ type: "spawn_green", row, col });
      }
    }
  }

  for (const box of Object.values(board.boxes)) {
    if (box.blockType === "movable_green") {
      for (const direction of EXTRUSION_DIRECTIONS) {
        if (canMoveBlock(board, box, direction)) {
          neutral.push({ type: "slide", boxId: box.id, direction });
        }
      }
      continue;
    }
    const moves = box.owner === null ? neutral : players[box.owner].expansions;
    for (const direction of getValidExtrudeDirections(board, box)) {
      moves.push({ type: "extrude", boxId: box.id, direction });
    }
  }

  return { players, neutral };
}

function hasOwnMoves(options: PlayerMoveOptions): boolean {
  return options.spawns.length > 0 || options.expansions.length > 0;
}

export function getExtrusionTurn(
  options: ExtrusionMoveOptions,
  player: Player,
  forcedOpponentPlay = false
): { mode: ExtrusionPlayMode; moves: ExtrusionAction[] } {
  const own = options.players[player];
  if (forcedOpponentPlay || !hasOwnMoves(own)) {
    const other = options.players[opponentOf(player)];
    if (other.expansions.length > 0) {
      return { mode: "forced-extrude", moves: other.expansions };
    }
    if (other.spawns.length > 0) {
      return { mode: "forced-spawn", moves: other.spawns };
    }
  }

  // Shared obstacle moves are the fallback when neither player can score.
  return { mode: "own", moves: [...own.spawns, ...own.expansions, ...options.neutral] };
}

export function hasPlayerOwnLegalMove(board: GameBoard, player: Player): boolean {
  return hasOwnMoves(getExtrusionMoveOptions(board).players[player]);
}

export function hasAnyPlayableMoveOnBoard(
  board: GameBoard,
  unlockedWhiteRows = board.unlockedWhiteRows,
  unlockedWhiteCells = board.unlockedWhiteCells
): boolean {
  if (isBoardCompletelyFull(board)) return false;
  const options = getExtrusionMoveOptions(board, unlockedWhiteRows, unlockedWhiteCells);
  return hasOwnMoves(options.players[1]) || hasOwnMoves(options.players[2]) || options.neutral.length > 0;
}

/** Forced play and shared obstacles give either actor an action whenever one exists. */
export function hasPlayerAnyLegalMove(
  board: GameBoard,
  _player: Player,
  unlockedWhiteRows = board.unlockedWhiteRows,
  unlockedWhiteCells = board.unlockedWhiteCells
): boolean {
  return hasAnyPlayableMoveOnBoard(board, unlockedWhiteRows, unlockedWhiteCells);
}

function updateBox(
  board: GameBoard,
  box: GameBox,
  occupied: Coord[],
  vacated?: Coord
): GameBoard {
  const cellMap = [...board.cellMap];
  const setCell = ({ row, col }: Coord, id: string | null) => {
    if (cellMap[row] === board.cellMap[row]) cellMap[row] = [...board.cellMap[row]];
    cellMap[row][col] = id;
  };
  if (vacated) setCell(vacated, null);
  for (const cell of occupied) setCell(cell, box.id);
  return { ...board, cellMap, boxes: { ...board.boxes, [box.id]: box } };
}

function placeSingleBlock(board: GameBoard, row: number, col: number, owner: Player | null) {
  // Plans can refer to a new block on their second action, so IDs must be repeatable.
  const prefix = (owner === null ? "green-" : "spawn-") + row + "-" + col;
  let id = prefix;
  for (let n = 2; board.boxes[id]; n++) id = prefix + "-" + n;

  const cell = { row, col };
  const box: GameBox = {
    id,
    blockType: owner === null ? "movable_green" : "standard",
    size: 1,
    captureThreshold: 1,
    cells: [cell],
    anchor: cell,
    shape: "single",
    count: 1,
    owner,
    claimedBy: owner,
    frozenBy: null,
    baseColor: owner === null
      ? EXTRUSION_THEME.greenBlock.primary
      : owner === 1 ? PLAYER_1_PRIMARY : PLAYER_2_PRIMARY,
  };
  return { board: updateBox(board, box, [cell]), boxId: id };
}

export function executeSpawn(
  board: GameBoard,
  row: number,
  col: number,
  player: Player,
  unlockedWhiteRows = board.unlockedWhiteRows ?? [],
  unlockedWhiteCells = board.unlockedWhiteCells,
  mode: ExtrusionPlayMode = "own"
) {
  if (!canSpawnAt(board, row, col, player, unlockedWhiteRows, unlockedWhiteCells, mode)) {
    return null;
  }
  const owner = mode === "forced-spawn" ? opponentOf(player) : player;
  const result = placeSingleBlock(board, row, col, owner);
  // A legal spawn only occupies territory that is already available to its owner.
  const whiteState = { unlockedWhiteRows, unlockedWhiteCells: unlockedWhiteCells ?? [] };
  return { ...result, board: { ...result.board, ...whiteState }, ...whiteState };
}

export function executeExtrusion(
  board: GameBoard,
  boxId: string,
  direction: ExtrudeDirection,
  player: Player,
  unlockedWhiteRows = board.unlockedWhiteRows ?? [],
  unlockedWhiteCells = board.unlockedWhiteCells ?? [],
  mode: ExtrusionPlayMode = "own"
) {
  const original = board.boxes[boxId];
  if (!original || !canExpandBlock(board, original, direction, player, mode)) return null;

  const addedCells = getTargetStrip(original, direction);
  const cells = [...original.cells, ...addedCells];
  const first = addedCells[0];
  const anchor = direction === "up" || direction === "left" ? first : original.anchor;
  const size = cells.length;
  const box = { ...original, cells, anchor, size, count: size, captureThreshold: size };
  const nextBoard = updateBox(board, box, addedCells);
  const whiteState = box.owner === null
    ? { unlockedWhiteRows, unlockedWhiteCells }
    : computeUnlockedWhiteState(nextBoard, unlockedWhiteCells, unlockedWhiteRows);

  return {
    board: { ...nextBoard, ...whiteState },
    box,
    addedCells,
    ...whiteState,
  };
}

export function executeMoveBlock(board: GameBoard, box: GameBox, direction: ExtrudeDirection) {
  if (!canMoveBlock(board, box, direction)) return null;
  const destination = getSlideTarget(box, direction);
  if (!destination) return null;
  const source = box.cells[0];
  if (board.cellMap[source.row]?.[source.col] !== box.id) return null;
  const moved = { ...box, cells: [destination], anchor: destination };
  return {
    board: updateBox(board, moved, [destination], source),
    changedCells: [destination],
  };
}

export function executeExtrusionAction(
  board: GameBoard,
  action: ExtrusionAction,
  player: Player,
  mode: ExtrusionPlayMode
): { board: GameBoard; changedCells: Coord[] } | null {
  switch (action.type) {
    case "spawn": {
      const { row, col } = action;
      const result = executeSpawn(board, row, col, player, undefined, undefined, mode);
      return result ? { board: result.board, changedCells: [{ row, col }] } : null;
    }
    case "spawn_green": {
      const { row, col } = action;
      if (
        mode !== "own" || board.cellMap[row]?.[col] !== null ||
        getCellTerritoryZone(board, row, col) !== "neutral"
      ) {
        return null;
      }
      const result = placeSingleBlock(board, row, col, null);
      return { board: result.board, changedCells: [{ row, col }] };
    }
    case "extrude": {
      const result = executeExtrusion(
        board, action.boxId, action.direction, player, undefined, undefined, mode
      );
      return result ? { board: result.board, changedCells: result.addedCells } : null;
    }
    case "slide": {
      const box = board.boxes[action.boxId];
      return mode === "own" && box ? executeMoveBlock(board, box, action.direction) : null;
    }
  }
}

export function isBoardCompletelyFull(board: GameBoard): boolean {
  for (const subBoard of getSubBoards(board)) {
    for (let row = subBoard.r1; row <= subBoard.r2; row++) {
      for (let col = subBoard.c1; col <= subBoard.c2; col++) {
        if (board.cellMap[row]?.[col] === null) return false;
      }
    }
  }
  return true;
}

export function computeExtrusionScores(board: GameBoard): {
  player1Score: number;
  player2Score: number;
  totalCells: number;
} {
  let player1Score = 0;
  let player2Score = 0;
  for (const box of Object.values(board.boxes)) {
    if (box.owner === 1) player1Score += box.cells.length;
    if (box.owner === 2) player2Score += box.cells.length;
  }

  const totalCells = getSubBoards(board).reduce(
    (sum, sb) => sum + (sb.r2 - sb.r1 + 1) * (sb.c2 - sb.c1 + 1),
    0
  );
  return { player1Score, player2Score, totalCells };
}
