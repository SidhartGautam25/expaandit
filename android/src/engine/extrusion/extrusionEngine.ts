import { GameBoard } from "../../types/board";
import { GameBox, Coord } from "../../types/box";
import { Player } from "../../types/game";
import { SubBoardConfig } from "../../types/campaignBlueprint";
import { cloneBoard } from "../board/boardFactory";
import { PLAYER_1_PRIMARY, PLAYER_2_PRIMARY } from "../../constants/theme/extrusionTheme";

export type ExtrudeDirection = "up" | "down" | "left" | "right";
export type TerritoryZone = "player1" | "player2" | "neutral";

export type ExtrusionMove =
  | { type: "spawn"; row: number; col: number; player: Player }
  | { type: "extrude"; boxId: string; direction: ExtrudeDirection; player: Player };

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
  unlockedWhiteCells?: string[] | Set<string>,
  unlockedWhiteRows?: number[] | Set<number>
): TerritoryZone | "void" {
  const sb = findSubBoardForCell(board, row, col);
  if (!sb) return "void";

  const key = `${row},${col}`;
  if (unlockedWhiteCells) {
    const cellSet = Array.isArray(unlockedWhiteCells)
      ? new Set(unlockedWhiteCells)
      : unlockedWhiteCells;
    if (cellSet.has(key)) return "neutral";
  }

  if (!board.subBoards || board.subBoards.length <= 1) {
    if (unlockedWhiteRows) {
      const rowSet = Array.isArray(unlockedWhiteRows)
        ? new Set(unlockedWhiteRows)
        : unlockedWhiteRows;
      if (rowSet.has(row)) return "neutral";
    }
  }

  const sbRows = sb.r2 - sb.r1 + 1;
  const relRow = row - sb.r1;

  if (sbRows % 2 === 1 && relRow === Math.floor(sbRows / 2)) {
    return "neutral";
  }

  return relRow < sbRows / 2 ? "player1" : "player2";
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

    for (const box of Object.values(board.boxes)) {
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

/**
 * Checks whether the given player is allowed to spawn a 1x1 block at (row, col).
 * Core Rule: A player can only spawn in their own region (or neutral white zone).
 * Players CANNOT click to spawn inside the opponent's territory!
 */
export function canSpawnAt(
  board: GameBoard,
  row: number,
  col: number,
  player: Player,
  unlockedWhiteRows?: number[],
  unlockedWhiteCells?: string[]
): boolean {
  if (row < 0 || row >= board.rows || col < 0 || col >= board.cols) {
    return false;
  }
  // Cell must be completely empty
  if (board.cellMap[row]?.[col] !== null) {
    return false;
  }

  const whiteCells = unlockedWhiteCells ?? board.unlockedWhiteCells;
  const whiteRows = unlockedWhiteRows ?? board.unlockedWhiteRows;
  const zone = getCellTerritoryZone(board, row, col, whiteCells, whiteRows);

  if (zone === "void") return false;
  if (zone === "neutral") return true;
  if (player === 1 && zone === "player1") return true;
  if (player === 2 && zone === "player2") return true;

  // Cannot spawn in opponent's territory
  return false;
}

/**
 * Computes bounding rectangle coordinates for a rectangular block.
 */
export function getBlockRect(box: GameBox): RectBounds {
  let r1 = Infinity;
  let c1 = Infinity;
  let r2 = -Infinity;
  let c2 = -Infinity;

  if (box && Array.isArray(box.cells)) {
    for (const cell of box.cells) {
      if (cell.row < r1) r1 = cell.row;
      if (cell.row > r2) r2 = cell.row;
      if (cell.col < c1) c1 = cell.col;
      if (cell.col > c2) c2 = cell.col;
    }
  }

  if (!isFinite(r1)) {
    return { r1: 0, c1: 0, r2: 0, c2: 0 };
  }

  return { r1, c1, r2, c2 };
}

/**
 * Returns the target layer of cells that would be added if the box expands in direction `dir`.
 */
export function getTargetStrip(box: GameBox, direction: ExtrudeDirection): Coord[] {
  const { r1, c1, r2, c2 } = getBlockRect(box);
  const strip: Coord[] = [];

  switch (direction) {
    case "up":
      for (let c = c1; c <= c2; c++) {
        strip.push({ row: r1 - 1, col: c });
      }
      break;
    case "down":
      for (let c = c1; c <= c2; c++) {
        strip.push({ row: r2 + 1, col: c });
      }
      break;
    case "left":
      for (let r = r1; r <= r2; r++) {
        strip.push({ row: r, col: c1 - 1 });
      }
      break;
    case "right":
      for (let r = r1; r <= r2; r++) {
        strip.push({ row: r, col: c2 + 1 });
      }
      break;
  }

  return strip;
}

/**
 * Checks if a block can expand in `direction`.
 * Sub-board independence rule: All target cells must be within the SAME sub-board
 * and completely empty. Expansion outside the sub-board boundary is illegal.
 */
export function canExpandBlock(
  board: GameBoard,
  box: GameBox,
  direction: ExtrudeDirection
): boolean {
  const strip = getTargetStrip(box, direction);
  if (strip.length === 0) return false;

  const sb = findSubBoardForBox(board, box);

  for (const cell of strip) {
    if (sb) {
      // Must stay strictly within the sub-board boundary
      if (
        cell.row < sb.r1 ||
        cell.row > sb.r2 ||
        cell.col < sb.c1 ||
        cell.col > sb.c2
      ) {
        return false;
      }
    } else {
      if (
        cell.row < 0 ||
        cell.row >= board.rows ||
        cell.col < 0 ||
        cell.col >= board.cols
      ) {
        return false;
      }
    }
    // Emptiness check (cannot expand into opponent or own separate blocks)
    if (board.cellMap[cell.row][cell.col] !== null) {
      return false;
    }
  }

  return true;
}

/**
 * Spawns a new 1x1 block on an empty valid cell.
 * Consumes 1 action.
 */
export function executeSpawn(
  board: GameBoard,
  row: number,
  col: number,
  player: Player,
  unlockedWhiteRows: number[] = [],
  unlockedWhiteCells?: string[]
): {
  board: GameBoard;
  boxId: string;
  unlockedWhiteRows: number[];
  unlockedWhiteCells: string[];
} | null {
  if (!canSpawnAt(board, row, col, player, unlockedWhiteRows, unlockedWhiteCells)) {
    return null;
  }

  const nextBoard = cloneBoard(board);
  const boxId = `b-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const newBox: GameBox = {
    id: boxId,
    size: 1,
    captureThreshold: 1,
    cells: [{ row, col }],
    anchor: { row, col },
    shape: "single",
    count: 1,
    owner: player,
    claimedBy: player,
    frozenBy: null,
    baseColor: player === 1 ? PLAYER_1_PRIMARY : PLAYER_2_PRIMARY,
  };

  nextBoard.boxes[boxId] = newBox;
  nextBoard.cellMap[row][col] = boxId;

  const whiteState = computeUnlockedWhiteState(
    nextBoard,
    nextBoard.unlockedWhiteCells ?? [],
    unlockedWhiteRows
  );
  nextBoard.unlockedWhiteRows = whiteState.unlockedWhiteRows;
  nextBoard.unlockedWhiteCells = whiteState.unlockedWhiteCells;

  return {
    board: nextBoard,
    boxId,
    unlockedWhiteRows: whiteState.unlockedWhiteRows,
    unlockedWhiteCells: whiteState.unlockedWhiteCells,
  };
}

/**
 * Extrudes an existing rectangular block in the chosen direction by 1 layer along its edge.
 * Consumes 1 action.
 */
export function executeExtrusion(
  board: GameBoard,
  boxId: string,
  direction: ExtrudeDirection,
  player: Player,
  unlockedWhiteRows: number[] = [],
  unlockedWhiteCells?: string[]
): {
  board: GameBoard;
  box: GameBox;
  unlockedWhiteRows: number[];
  unlockedWhiteCells: string[];
  addedCells: Coord[];
} | null {
  const box = board.boxes[boxId];
  // Can be extruded by owner, or if neutral (box.owner === null) by either player
  if (!box || (box.owner !== player && box.owner !== null)) {
    return null;
  }

  if (!canExpandBlock(board, box, direction)) {
    return null;
  }

  const nextBoard = cloneBoard(board);
  const targetBox = nextBoard.boxes[boxId];
  const strip = getTargetStrip(targetBox, direction);

  for (const cell of strip) {
    targetBox.cells.push({ row: cell.row, col: cell.col });
    nextBoard.cellMap[cell.row][cell.col] = boxId;
  }

  targetBox.size = targetBox.cells.length;
  targetBox.count = targetBox.size;
  targetBox.captureThreshold = targetBox.size;

  // Re-anchor to top-left cell
  let minR = Infinity;
  let minC = Infinity;
  for (const c of targetBox.cells) {
    if (c.row < minR || (c.row === minR && c.col < minC)) {
      minR = c.row;
      minC = c.col;
    }
  }
  targetBox.anchor = { row: minR, col: minC };

  const whiteState = computeUnlockedWhiteState(
    nextBoard,
    nextBoard.unlockedWhiteCells ?? [],
    unlockedWhiteRows
  );
  nextBoard.unlockedWhiteRows = whiteState.unlockedWhiteRows;
  nextBoard.unlockedWhiteCells = whiteState.unlockedWhiteCells;

  return {
    board: nextBoard,
    box: targetBox,
    unlockedWhiteRows: whiteState.unlockedWhiteRows,
    unlockedWhiteCells: whiteState.unlockedWhiteCells,
    addedCells: strip,
  };
}

/**
 * Returns all valid directions an owned block can expand.
 */
export function getValidExtrudeDirections(
  board: GameBoard,
  box: GameBox
): ExtrudeDirection[] {
  const directions: ExtrudeDirection[] = ["up", "down", "left", "right"];
  return directions.filter((dir) => canExpandBlock(board, box, dir));
}

/**
 * Checks if a player has any legal moves available (spawn or extrusion on any sub-board).
 */
export function hasPlayerAnyLegalMove(
  board: GameBoard,
  player: Player,
  unlockedWhiteRows: number[] = [],
  unlockedWhiteCells?: string[]
): boolean {
  const whiteCells = unlockedWhiteCells ?? board.unlockedWhiteCells;
  const subBoards = getSubBoards(board);

  // 1. Check if can spawn in any sub-board cell
  for (const sb of subBoards) {
    for (let r = sb.r1; r <= sb.r2; r++) {
      for (let c = sb.c1; c <= sb.c2; c++) {
        if (canSpawnAt(board, r, c, player, unlockedWhiteRows, whiteCells)) {
          return true;
        }
      }
    }
  }

  // 2. Check if any owned or neutral block can expand
  for (const box of Object.values(board.boxes)) {
    if (box.owner === player || box.owner === null) {
      if (
        canExpandBlock(board, box, "up") ||
        canExpandBlock(board, box, "down") ||
        canExpandBlock(board, box, "left") ||
        canExpandBlock(board, box, "right")
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Returns whether all playable cells on all sub-boards are occupied.
 */
export function isBoardCompletelyFull(board: GameBoard): boolean {
  const subBoards = getSubBoards(board);
  for (const sb of subBoards) {
    for (let r = sb.r1; r <= sb.r2; r++) {
      for (let c = sb.c1; c <= sb.c2; c++) {
        if (board.cellMap[r][c] === null) {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Computes exact count of captured grid cells for Player 1 and Player 2 across all sub-boards.
 */
export function computeExtrusionScores(board: GameBoard): {
  player1Score: number;
  player2Score: number;
  totalCells: number;
} {
  let player1Score = 0;
  let player2Score = 0;

  for (const box of Object.values(board.boxes)) {
    if (box.owner === 1) {
      player1Score += box.cells.length;
    } else if (box.owner === 2) {
      player2Score += box.cells.length;
    }
  }

  const subBoards = getSubBoards(board);
  let totalPlayableCells = 0;
  for (const sb of subBoards) {
    totalPlayableCells += (sb.r2 - sb.r1 + 1) * (sb.c2 - sb.c1 + 1);
  }

  return {
    player1Score,
    player2Score,
    totalCells: totalPlayableCells > 0 ? totalPlayableCells : board.rows * board.cols,
  };
}

/**
 * Intelligent AI choice for Bot (Player 2) across all sub-boards.
 */
export function getBotExtrusionMove(
  board: GameBoard,
  botPlayer: Player = 2,
  unlockedWhiteRows: number[] = [],
  difficulty: number = 3
): ExtrusionMove | null {
  const expansions: {
    move: ExtrusionMove;
    gain: number;
    territoryBonus: number;
    targetRow: number;
  }[] = [];

  // 1. Gather all legal expansions across all sub-boards
  for (const box of Object.values(board.boxes)) {
    if (box.owner === botPlayer) {
      const directions: ExtrudeDirection[] = ["up", "down", "left", "right"];
      for (const dir of directions) {
        if (canExpandBlock(board, box, dir)) {
          const strip = getTargetStrip(box, dir);
          const gain = strip.length;
          const sb = findSubBoardForBox(board, box);
          const sbMid = sb ? sb.r1 + Math.floor((sb.r2 - sb.r1 + 1) / 2) : Math.floor(board.rows / 2);

          let territoryBonus = 0;
          let targetRow = 0;
          for (const c of strip) {
            targetRow += c.row;
            if (c.row < sbMid) {
              territoryBonus += 3; // pushing into opponent's territory in that sub-board!
            }
          }
          targetRow /= strip.length;

          expansions.push({
            move: { type: "extrude", boxId: box.id, direction: dir, player: botPlayer },
            gain,
            territoryBonus,
            targetRow,
          });
        }
      }
    } else if (box.owner === null) {
      const directions: ExtrudeDirection[] = ["up", "down", "left", "right"];
      for (const dir of directions) {
        if (canExpandBlock(board, box, dir)) {
          const strip = getTargetStrip(box, dir);
          const sb = findSubBoardForBox(board, box);
          const sbMid = sb ? sb.r1 + Math.floor((sb.r2 - sb.r1 + 1) / 2) : Math.floor(board.rows / 2);

          let territoryBonus = 0;
          let targetRow = 0;
          for (const c of strip) {
            targetRow += c.row;
            if (c.row < sbMid) {
              territoryBonus += 1.5;
            }
          }
          targetRow /= strip.length;

          expansions.push({
            move: { type: "extrude", boxId: box.id, direction: dir, player: botPlayer },
            gain: 0,
            territoryBonus,
            targetRow,
          });
        }
      }
    }
  }

  // 2. Gather all legal spawns across all sub-boards
  const spawns: { move: ExtrusionMove; score: number }[] = [];
  const subBoards = getSubBoards(board);
  for (const sb of subBoards) {
    const sbMid = sb.r1 + Math.floor((sb.r2 - sb.r1 + 1) / 2);
    const sbCenterCol = sb.c1 + Math.floor((sb.c2 - sb.c1 + 1) / 2);

    for (let r = sb.r1; r <= sb.r2; r++) {
      for (let c = sb.c1; c <= sb.c2; c++) {
        if (canSpawnAt(board, r, c, botPlayer, unlockedWhiteRows, board.unlockedWhiteCells)) {
          let score = 1;
          const distToMid = Math.abs(r - sbMid);
          score += Math.max(0, 4 - distToMid);
          const distToCenterCol = Math.abs(c - sbCenterCol);
          score += Math.max(0, 3 - distToCenterCol);

          spawns.push({
            move: { type: "spawn", row: r, col: c, player: botPlayer },
            score,
          });
        }
      }
    }
  }

  if (expansions.length === 0 && spawns.length === 0) {
    return null;
  }

  expansions.sort((a, b) => b.gain * 2 + b.territoryBonus - (a.gain * 2 + a.territoryBonus));
  spawns.sort((a, b) => b.score - a.score);

  if (expansions.length === 0) {
    return spawns[0].move;
  }

  const blunderRoll = Math.random();
  const blunderThreshold = difficulty <= 1 ? 0.4 : difficulty <= 2 ? 0.2 : 0.05;

  if (blunderRoll < blunderThreshold && spawns.length > 0 && Math.random() < 0.5) {
    const randomIdx = Math.floor(Math.random() * Math.min(3, spawns.length));
    return spawns[randomIdx].move;
  }

  const bestExpansion = expansions[0];
  const bestSpawn = spawns[0];

  if (bestExpansion.gain >= 2 || bestExpansion.territoryBonus > 0 || !bestSpawn) {
    return bestExpansion.move;
  }

  const botBoxCount = Object.values(board.boxes).filter((b) => b.owner === botPlayer).length;
  if (botBoxCount <= 1 && bestSpawn.score >= 5) {
    return bestSpawn.move;
  }

  return bestExpansion.move;
}
