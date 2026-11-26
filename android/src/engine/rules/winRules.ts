import { GameBoard } from "../../types/board";
import { Player } from "../../types/game";
import { WinState } from "../../types/engine";
import {
  computeExtrusionScores,
  hasPlayerAnyLegalMove,
  isBoardCompletelyFull,
} from "../extrusion/extrusionEngine";

export function checkWinCondition(
  board: GameBoard,
  playerToCheck?: Player,
  unlockedWhiteRows?: number[]
): WinState {
  const whiteRows = unlockedWhiteRows ?? board.unlockedWhiteRows ?? [];
  const { player1Score, player2Score, totalCells } = computeExtrusionScores(board);
  const occupiedCount = player1Score + player2Score;

  const isFull = isBoardCompletelyFull(board) || occupiedCount >= totalCells;

  // Check if either or both players have legal moves
  const p1CanMove = hasPlayerAnyLegalMove(board, 1, whiteRows, board.unlockedWhiteCells);
  const p2CanMove = hasPlayerAnyLegalMove(board, 2, whiteRows, board.unlockedWhiteCells);

  let isOver = false;
  let winner: Player | "draw" | null = null;

  if (isFull) {
    isOver = true;
  } else if (!p1CanMove && !p2CanMove) {
    // Neither player can make any move
    isOver = true;
  } else if (playerToCheck !== undefined) {
    // If active player cannot move and opponent also cannot move
    const activeCanMove = playerToCheck === 1 ? p1CanMove : p2CanMove;
    const opponent = playerToCheck === 1 ? 2 : 1;
    const opponentCanMove = opponent === 1 ? p1CanMove : p2CanMove;
    if (!activeCanMove && !opponentCanMove) {
      isOver = true;
    }
  }

  if (isOver) {
    if (player1Score > player2Score) winner = 1;
    else if (player2Score > player1Score) winner = 2;
    else winner = "draw";
  }

  return {
    isOver,
    winner,
    player1Score,
    player2Score,
    totalBoxes: totalCells,
  };
}

export function computeScores(board: GameBoard): { player1: number; player2: number } {
  const { player1Score, player2Score } = computeExtrusionScores(board);
  return { player1: player1Score, player2: player2Score };
}
