import { GameBoard } from "../../types/board";
import { GameBox, BoxDefinition, getCaptureThreshold, Coord } from "../../types/box";
import { CampaignLevel } from "../../types/level";
import { cellsFromShape } from "./boxShapes";
import { assignBoxColors, BOX_PALETTE } from "./boxColors";
import { EXTRUSION_THEME } from "../../constants/theme/extrusionTheme";

function findAnchor(cells: { row: number; col: number }[]): { row: number; col: number } {
  return cells.reduce((min, c) =>
    c.row < min.row || (c.row === min.row && c.col < min.col) ? c : min
  );
}

function createBoxFromDefinition(def: BoxDefinition): GameBox {
  const anchor = findAnchor(def.cells);
  return {
    id: def.id,
    size: def.size,
    captureThreshold: getCaptureThreshold(def.size),
    cells: def.cells,
    anchor,
    shape: def.shape,
    count: 0,
    owner: null,
    claimedBy: null,
    frozenBy: null,
    rewards: def.rewards,
    powerGrants: def.powerGrants,
    baseColor: BOX_PALETTE[0],
  };
}

export function createBoardFromLevel(
  level: CampaignLevel,
  options?: { reservedColors?: string[] }
): GameBoard {
  const cellMap: (string | null)[][] = Array.from({ length: level.rows }, () =>
    Array(level.cols).fill(null)
  );
  const boxes: Record<string, GameBox> = {};

  const subBoards = level.subBoards ?? [];
  const neutralBlocks = [
    ...(level.neutralBlocks ?? []),
    ...subBoards.flatMap((subBoard) => subBoard.neutralBlocks ?? []),
  ];

  neutralBlocks.forEach((definition, index) => {
    const green = definition.blockType === "movable_green";
    const r1 = Math.min(definition.r1, definition.r2 ?? definition.r1);
    const r2 = Math.max(definition.r1, definition.r2 ?? definition.r1);
    const c1 = Math.min(definition.c1, definition.c2 ?? definition.c1);
    const c2 = Math.max(definition.c1, definition.c2 ?? definition.c1);
    if (r1 < 0 || r2 >= level.rows || c1 < 0 || c2 >= level.cols) return;
    if (subBoards.length > 0 && !subBoards.some(
      (sb) => r1 >= sb.r1 && r2 <= sb.r2 && c1 >= sb.c1 && c2 <= sb.c2
    )) return;

    const cells: Coord[] = [];
    for (let row = r1; row <= r2; row++) {
      for (let col = c1; col <= c2; col++) {
        if (cellMap[row][col] !== null) return;
        cells.push({ row, col });
      }
    }

    const id = `neutral-${level.campaignNumber}-${index}`;
    const size = cells.length;
    boxes[id] = {
      id,
      blockType: green ? "movable_green" : "neutral",
      size,
      captureThreshold: size,
      cells,
      anchor: { row: r1, col: c1 },
      shape: size === 1 ? "single" : "square",
      count: size,
      owner: null,
      claimedBy: null,
      frozenBy: null,
      baseColor: green
        ? EXTRUSION_THEME.greenBlock.primary
        : EXTRUSION_THEME.neutralBlock.primary,
    };
    for (const cell of cells) cellMap[cell.row][cell.col] = id;
  });

  const initialWhiteRows: number[] =
    level.rows % 2 === 1 ? [Math.floor(level.rows / 2)] : [];

  const initialWhiteCells: string[] = [];
  if (level.subBoards && level.subBoards.length > 0) {
    for (const sb of level.subBoards) {
      const sbRows = sb.r2 - sb.r1 + 1;
      if (sbRows % 2 === 1) {
        const midRow = sb.r1 + Math.floor(sbRows / 2);
        for (let c = sb.c1; c <= sb.c2; c++) {
          initialWhiteCells.push(`${midRow},${c}`);
        }
      }
    }
  }

  return {
    rows: level.rows,
    cols: level.cols,
    cellMap,
    boxes,
    unlockedWhiteRows: initialWhiteRows,
    unlockedWhiteCells: initialWhiteCells,
    subBoards: level.subBoards,
  };
}

/** Helper to place a box at an anchor using a shape template */
export function makeBoxDef(
  id: string,
  anchor: { row: number; col: number },
  shape: import("../../types/box").BoxShapeType,
  extras?: Partial<Pick<BoxDefinition, "rewards" | "powerGrants">>
): BoxDefinition {
  const cells = cellsFromShape(anchor, shape);
  return {
    id,
    size: cells.length,
    cells,
    shape,
    ...extras,
  };
}

/** Fill a rectangular region with single-cell boxes */
export function fillGridWithSingles(
  rows: number,
  cols: number,
  prefix = "box"
): BoxDefinition[] {
  const defs: BoxDefinition[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      defs.push(makeBoxDef(`${prefix}-${r}-${c}`, { row: r, col: c }, "single"));
    }
  }
  return defs;
}

export function cloneBoard(board: GameBoard): GameBoard {
  const cellMap = board.cellMap.map((row) => [...row]);
  const boxes: Record<string, GameBox> = {};
  for (const [id, box] of Object.entries(board.boxes)) {
    boxes[id] = {
      ...box,
      cells: box.cells.map((c) => ({ ...c })),
      anchor: { ...box.anchor },
      rewards: box.rewards ? { ...box.rewards } : undefined,
      powerGrants: box.powerGrants ? [...box.powerGrants] : undefined,
      baseColor: box.baseColor,
    };
  }
  return {
    rows: board.rows,
    cols: board.cols,
    cellMap,
    boxes,
    unlockedWhiteRows: board.unlockedWhiteRows ? [...board.unlockedWhiteRows] : undefined,
    unlockedWhiteCells: board.unlockedWhiteCells ? [...board.unlockedWhiteCells] : undefined,
    subBoards: board.subBoards,
  };
}

export function getBoxAt(
  board: GameBoard,
  row: number,
  col: number
): GameBox | null {
  if (row < 0 || row >= board.rows || col < 0 || col >= board.cols) return null;
  const boxId = board.cellMap[row][col];
  if (!boxId) return null;
  return board.boxes[boxId] ?? null;
}

export function getCellDisplayState(
  board: GameBoard,
  row: number,
  col: number
): {
  box: GameBox | null;
  isAnchor: boolean;
  isPlayable: boolean;
} {
  const box = getBoxAt(board, row, col);
  if (!box) return { box: null, isAnchor: false, isPlayable: false };
  const isAnchor = box.anchor.row === row && box.anchor.col === col;
  return { box, isAnchor, isPlayable: true };
}

export function isSameBoxCell(
  board: GameBoard,
  row: number,
  col: number,
  boxId: string
): boolean {
  if (row < 0 || row >= board.rows || col < 0 || col >= board.cols) return false;
  return board.cellMap[row][col] === boxId;
}

/** Tighter margins between cells of the same multi-cell box */
export function getCellMargins(
  board: GameBoard,
  row: number,
  col: number,
  boxId: string
): { marginTop: number; marginBottom: number; marginLeft: number; marginRight: number } {
  const gap = 2;
  const outer = 3;
  return {
    marginTop: isSameBoxCell(board, row - 1, col, boxId) ? 0 : outer,
    marginBottom: isSameBoxCell(board, row + 1, col, boxId) ? 0 : outer,
    marginLeft: isSameBoxCell(board, row, col - 1, boxId) ? 0 : outer,
    marginRight: isSameBoxCell(board, row, col + 1, boxId) ? 0 : outer,
  };
}

export function getRewardPreview(box: GameBox): string {
  if (!box.rewards) return "";
  const parts: string[] = [];
  if (box.rewards.money) parts.push("💵");
  if (box.rewards.gold) parts.push("🥇");
  if (box.rewards.silver) parts.push("🥈");
  return parts.join("");
}

export function getPowerPreview(box: GameBox): string {
  if (!box.powerGrants?.length) return "";
  const icons: Record<string, string> = {
    extra_tap: "⚡",
    steal: "🔄",
    destroy: "💥",
    freeze: "❄️",
  };
  return box.powerGrants.map((g) => icons[g.powerId] ?? "✨").join("");
}
