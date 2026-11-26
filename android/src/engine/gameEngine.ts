export { executeTap, executeFreeze, canFreezeBox, canInitiateFreezeTurn, FREEZE_TAP_COST, isFrozenPlot, isOwnFrozenPlot, getTapCostForBox, isCaptureMove } from "./rules/tapRules";
export { getValidMoves, isValidTapTarget, isValidTapAction, isValidFreezeTarget, isSelfAttackMove, isTappableBox, createMoveContext, hasAnyLegalMove, isMidTurn } from "./rules/moveRules";
export type { MoveContext, TurnRuleState } from "./rules/moveRules";
export { checkWinCondition, computeScores } from "./rules/winRules";
export {
  createBoardFromLevel,
  cloneBoard,
  getBoxAt,
  getCellDisplayState,
  makeBoxDef,
  fillGridWithSingles,
} from "./board/boardFactory";
export { getBotMoveForLevel, getBotActionForLevel } from "./ai/aiEngine";
export type { BotAction } from "./ai/aiEngine";

export {
  computeInitialWhiteRows,
  computeUnlockedWhiteRows,
  computeUnlockedWhiteState,
  getRowTerritoryZone,
  getCellTerritoryZone,
  getSubBoards,
  findSubBoardForCell,
  findSubBoardForBox,
  canSpawnAt,
  canExpandBlock,
  getBlockRect,
  getTargetStrip,
  executeSpawn,
  executeExtrusion,
  getValidExtrudeDirections,
  hasPlayerAnyLegalMove,
  isBoardCompletelyFull,
  computeExtrusionScores,
  getBotExtrusionMove,
} from "./extrusion/extrusionEngine";
export type { ExtrudeDirection, TerritoryZone, ExtrusionMove, RectBounds } from "./extrusion/extrusionEngine";
