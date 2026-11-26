import type { GameBoard } from "../../types/board";
import type { Player } from "../../types/game";
import type { WinState } from "../../types/engine";
import { computeExtrusionScores, hasAnyPlayableMoveOnBoard } from "../extrusion/extrusionEngine";

export function checkWinCondition(
  board: GameBoard,
  _playerToCheck?: Player,
  unlockedWhiteRows = board.unlockedWhiteRows
): WinState {
  const { player1Score, player2Score, totalCells } = computeExtrusionScores(board);
  const isOver = !hasAnyPlayableMoveOnBoard(board, unlockedWhiteRows);
  let winner: Player | "draw" | null = null;
  if (isOver) {
    if (player1Score > player2Score) winner = 1;
    else if (player2Score > player1Score) winner = 2;
    else winner = "draw";
  }
  return { isOver, winner, player1Score, player2Score, totalBoxes: totalCells };
}

export function computeScores(board: GameBoard): { player1: number; player2: number } {
  const { player1Score, player2Score } = computeExtrusionScores(board);
  return { player1: player1Score, player2: player2Score };
}
