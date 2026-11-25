import { GameBoard } from "../../types/board";
import { GameBox, Coord } from "../../types/box";
import { Player } from "../../types/game";
import { cloneBoard } from "../board/boardFactory";

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
 * Returns initial neutral (white) rows for a board.
 * If rows is odd (e.g. 5), the center row (index 2) is neutral from the start.
 * If rows is even (e.g. 6), there are no neutral rows initially (split at rows/2).
 */
export function computeInitialWhiteRows(rows: number): number[] {
  if (rows % 2 === 1) {
    return [Math.floor(rows / 2)];
  }
  return [];
}

/**
 * Returns the territory zone of a given row.
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
 * Computes all dynamically unlocked white rows based on how far
 * Player 1 has pushed down into Player 2's territory, and how far
 * Player 2 has pushed up into Player 1's territory.
 */
export function computeUnlockedWhiteRows(
  totalRows: number,
  board: GameBoard,
  previouslyUnlocked: number[] = []
): number[] {
  const whiteSet = new Set<number>(previouslyUnlocked);

  const isEven = totalRows % 2 === 0;
  const p1BaseMax = isEven ? totalRows / 2 - 1 : Math.floor(totalRows / 2) - 1;
  const p2BaseMin = isEven ? totalRows / 2 : Math.floor(totalRows / 2) + 1;

  if (!isEven) {
    whiteSet.add(Math.floor(totalRows / 2));
  }

  let maxP1Row = -1;
  let minP2Row = totalRows;

  for (const box of Object.values(board.boxes)) {
    if (box.owner === 1) {
      for (const cell of box.cells) {
        if (cell.row > maxP1Row) maxP1Row = cell.row;
      }
    } else if (box.owner === 2) {
      for (const cell of box.cells) {
        if (cell.row < minP2Row) minP2Row = cell.row;
      }
    }
  }

  // Player 1 invaded Player 2's territory (rows >= p2BaseMin)
  if (maxP1Row >= p2BaseMin) {
    for (let r = p2BaseMin; r <= maxP1Row; r++) {
      whiteSet.add(r);
    }
  }

  // Player 2 invaded Player 1's territory (rows <= p1BaseMax)
  if (minP2Row <= p1BaseMax) {
    for (let r = minP2Row; r <= p1BaseMax; r++) {
      whiteSet.add(r);
    }
  }

  return Array.from(whiteSet).sort((a, b) => a - b);
}

/**
 * Checks whether the given player is allowed to spawn a 1x1 block at (row, col).
 */
export function canSpawnAt(
  board: GameBoard,
  row: number,
  col: number,
  player: Player,
  unlockedWhiteRows: number[]
): boolean {
  if (row < 0 || row >= board.rows || col < 0 || col >= board.cols) {
    return false;
  }
  // Cell must be completely empty
  if (board.cellMap[row]?.[col] !== null) {
    return false;
  }

  const zone = getRowTerritoryZone(row, board.rows, unlockedWhiteRows);
  if (zone === "neutral") return true;
  if (player === 1 && zone === "player1") return true;
  if (player === 2 && zone === "player2") return true;

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
 * Critical rule: All target cells in the new edge strip must be within boundaries
 * and completely empty. If even one is blocked or out-of-bounds, expansion is illegal (no partial growth).
 */
export function canExpandBlock(
  board: GameBoard,
  box: GameBox,
  direction: ExtrudeDirection
): boolean {
  const strip = getTargetStrip(box, direction);
  if (strip.length === 0) return false;

  for (const cell of strip) {
    // Boundary check
    if (
      cell.row < 0 ||
      cell.row >= board.rows ||
      cell.col < 0 ||
      cell.col >= board.cols
    ) {
      return false;
    }
    // Emptiness check (blocked by opponent or own separate block)
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
  unlockedWhiteRows: number[]
): {
  board: GameBoard;
  boxId: string;
  unlockedWhiteRows: number[];
} | null {
  if (!canSpawnAt(board, row, col, player, unlockedWhiteRows)) {
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
    baseColor: player === 1 ? "#2563EB" : "#EF4444",
  };

  nextBoard.boxes[boxId] = newBox;
  nextBoard.cellMap[row][col] = boxId;

  const nextWhiteRows = computeUnlockedWhiteRows(
    nextBoard.rows,
    nextBoard,
    unlockedWhiteRows
  );
  nextBoard.unlockedWhiteRows = nextWhiteRows;

  return {
    board: nextBoard,
    boxId,
    unlockedWhiteRows: nextWhiteRows,
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
  unlockedWhiteRows: number[]
): {
  board: GameBoard;
  box: GameBox;
  unlockedWhiteRows: number[];
  addedCells: Coord[];
} | null {
  const box = board.boxes[boxId];
  // Can be extruded by the owner, or if neutral (box.owner === null) by either player
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

  const nextWhiteRows = computeUnlockedWhiteRows(
    nextBoard.rows,
    nextBoard,
    unlockedWhiteRows
  );
  nextBoard.unlockedWhiteRows = nextWhiteRows;

  return {
    board: nextBoard,
    box: targetBox,
    unlockedWhiteRows: nextWhiteRows,
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
 * Checks if a player has any legal moves available (spawn or extrusion).
 */
export function hasPlayerAnyLegalMove(
  board: GameBoard,
  player: Player,
  unlockedWhiteRows: number[]
): boolean {
  // 1. Check if can spawn in any cell
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (canSpawnAt(board, r, c, player, unlockedWhiteRows)) {
        return true;
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
 * Returns whether all cells on the board are occupied.
 */
export function isBoardCompletelyFull(board: GameBoard): boolean {
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (board.cellMap[r][c] === null) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Computes exact count of captured grid cells for Player 1 and Player 2.
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

  return {
    player1Score,
    player2Score,
    totalCells: board.rows * board.cols,
  };
}

/**
 * Intelligent AI choice for Bot (Player 2).
 */
export function getBotExtrusionMove(
  board: GameBoard,
  botPlayer: Player = 2,
  unlockedWhiteRows: number[],
  difficulty: number = 3
): ExtrusionMove | null {
  const opponent: Player = botPlayer === 1 ? 2 : 1;
  const expansions: {
    move: ExtrusionMove;
    gain: number;
    territoryBonus: number;
    targetRow: number;
  }[] = [];

  // 1. Gather all legal expansions
  for (const box of Object.values(board.boxes)) {
    if (box.owner === botPlayer) {
      const directions: ExtrudeDirection[] = ["up", "down", "left", "right"];
      for (const dir of directions) {
        if (canExpandBlock(board, box, dir)) {
          const strip = getTargetStrip(box, dir);
          const gain = strip.length;
          // Territory bonus: pushing towards row 0 (Player 1 territory)
          let territoryBonus = 0;
          let targetRow = 0;
          for (const c of strip) {
            targetRow += c.row;
            if (c.row <= Math.floor(board.rows / 2) - 1) {
              territoryBonus += 3; // pushing into opponent territory!
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
      // Neutral black block expansion: does not award score points directly (gain: 0),
      // but can be used tactically to block opponent lanes
      const directions: ExtrudeDirection[] = ["up", "down", "left", "right"];
      for (const dir of directions) {
        if (canExpandBlock(board, box, dir)) {
          const strip = getTargetStrip(box, dir);
          let territoryBonus = 0;
          let targetRow = 0;
          for (const c of strip) {
            targetRow += c.row;
            if (c.row <= Math.floor(board.rows / 2) - 1) {
              territoryBonus += 1.5; // constrict Player 1 territory
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

  // 2. Gather all legal spawns
  const spawns: { move: ExtrusionMove; score: number }[] = [];
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (canSpawnAt(board, r, c, botPlayer, unlockedWhiteRows)) {
        let score = 1;
        // Prefer rows closer to the midline
        const distToMid = Math.abs(r - Math.floor(board.rows / 2));
        score += Math.max(0, 4 - distToMid);
        // Prefer central columns for expansion room
        const distToCenterCol = Math.abs(c - Math.floor(board.cols / 2));
        score += Math.max(0, 3 - distToCenterCol);

        spawns.push({
          move: { type: "spawn", row: r, col: c, player: botPlayer },
          score,
        });
      }
    }
  }

  if (expansions.length === 0 && spawns.length === 0) {
    return null;
  }

  // Sort expansions by total value: gain + territoryBonus
  expansions.sort((a, b) => b.gain * 2 + b.territoryBonus - (a.gain * 2 + a.territoryBonus));
  spawns.sort((a, b) => b.score - a.score);

  // If no blocks or no expansions, spawn
  if (expansions.length === 0) {
    return spawns[0].move;
  }

  // Blunder rate based on difficulty
  const blunderRoll = Math.random();
  const blunderThreshold = difficulty <= 1 ? 0.4 : difficulty <= 2 ? 0.2 : 0.05;

  if (blunderRoll < blunderThreshold && spawns.length > 0 && Math.random() < 0.5) {
    const randomIdx = Math.floor(Math.random() * Math.min(3, spawns.length));
    return spawns[randomIdx].move;
  }

  // Prefer high-gain expansion
  const bestExpansion = expansions[0];
  const bestSpawn = spawns[0];

  // If best expansion gives 2+ cells or pushes territory, definitely expand
  if (bestExpansion.gain >= 2 || bestExpansion.territoryBonus > 0 || !bestSpawn) {
    return bestExpansion.move;
  }

  // If board has few bot blocks (<= 1) and there's a strong spawn near midline, spawn
  const botBoxCount = Object.values(board.boxes).filter((b) => b.owner === botPlayer).length;
  if (botBoxCount <= 1 && bestSpawn.score >= 5) {
    return bestSpawn.move;
  }

  return bestExpansion.move;
}
