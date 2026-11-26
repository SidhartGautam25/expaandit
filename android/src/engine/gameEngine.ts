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
  canMoveBlock,
  getBlockRect,
  getTargetStrip,
  executeSpawn,
  executeExtrusion,
  executeExtrusionAction,
  executeMoveBlock,
  getExtrusionMoveOptions,
  getExtrusionTurn,
  getValidExtrudeDirections,
  hasPlayerAnyLegalMove,
  hasPlayerOwnLegalMove,
  hasAnyPlayableMoveOnBoard,
  isBoardCompletelyFull,
  computeExtrusionScores,
} from "./extrusion/extrusionEngine";
export type { ExtrudeDirection, TerritoryZone, ExtrusionAction, ExtrusionMove, ExtrusionPlayMode, RectBounds } from "./extrusion/extrusionEngine";
export { getBotExtrusionMove } from "./ai/extrusionAi";
