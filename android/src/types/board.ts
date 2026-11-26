import { GameBox } from "./box";
import { SubBoardConfig } from "./campaignBlueprint";

export interface GameBoard {
  rows: number;
  cols: number;
  /** boxId per cell; null = empty/unplayable */
  cellMap: (string | null)[][];
  boxes: Record<string, GameBox>;
  /** Unlocked neutral (white) row indices */
  unlockedWhiteRows?: number[];
  /** Set of unlocked neutral white cells (formatted as "r,c") */
  unlockedWhiteCells?: string[];
  /** Independent sub-boards when the board is divided into separate regions */
  subBoards?: SubBoardConfig[];
}

export function getTotalBoxCount(board: GameBoard): number {
  return Object.keys(board.boxes).length;
}

/** Sum of box sizes — max score points on the board */
export function getTotalBoardPoints(board: GameBoard): number {
  return Object.values(board.boxes).reduce((sum, box) => sum + box.size, 0);
}
