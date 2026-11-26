import React, { useMemo, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  PanResponder,
  useWindowDimensions,
  Pressable,
} from "react-native";
import { GameBoard } from "../../types/board";
import { Player } from "../../types/game";
import { Coord, GameBox } from "../../types/box";
import { TurnState } from "../../types/session";
import {
  fitBoardLayout,
  getBoardContentSize,
  getBoardMetrics,
  createBoardMetrics,
  getCellLayout,
  BoardMetrics,
} from "../../engine/board/boardLayout";
import {
  getRowTerritoryZone,
  getCellTerritoryZone,
  canSpawnAt,
  canExpandBlock,
  getBlockRect,
  ExtrudeDirection,
  TerritoryZone,
} from "../../engine/extrusion/extrusionEngine";
import { EXTRUSION_THEME, SUB_BOARD_THEMES } from "../../constants/theme/extrusionTheme";
import { GAME_SCENE } from "../../constants/theme";
import type { GameLayoutDensity } from "../../utils/gameLayoutDensity";

const INNER_BORDER = 1;

interface GridBoardProps {
  board: GameBoard;
  onTileTap: (row: number, col: number) => void;
  onSpawn?: (row: number, col: number) => void;
  onExtrude?: (boxId: string, direction: ExtrudeDirection) => void;
  onTileLongPress?: (row: number, col: number) => void;
  disabled: boolean;
  lastBotMoves: Coord[];
  activePlayer: Player;
  turn: TurnState;
  targetingMode?: boolean;
  excludedBoxId?: string | null;
  gameMode?: "bot" | "pvp";
  player1ColorHex?: string;
  player2ColorHex?: string;
  availableHeight?: number;
  layoutDensity?: GameLayoutDensity;
}

interface ExtrudedBlockItemProps {
  box: GameBox;
  board: GameBoard;
  metrics: BoardMetrics;
  activePlayer: Player;
  disabled: boolean;
  player1ColorHex: string;
  player2ColorHex: string;
  isSelected: boolean;
  onSelect: (boxId: string) => void;
  onExtrude?: (boxId: string, direction: ExtrudeDirection) => void;
  getColOffset?: (col: number) => number;
  getRowOffset?: (row: number) => number;
  paddingTop?: number;
}

function ExtrudedBlockItem({
  box,
  board,
  metrics,
  activePlayer,
  disabled,
  player1ColorHex,
  player2ColorHex,
  isSelected,
  onSelect,
  onExtrude,
  getColOffset,
  getRowOffset,
  paddingTop,
}: ExtrudedBlockItemProps) {
  const rect = getBlockRect(box);
  const { r1, c1, r2, c2 } = rect;

  const colOffset = getColOffset ? getColOffset(c1) : 0;
  const rowOffset = getRowOffset ? getRowOffset(r1) : 0;
  const topPad = paddingTop ?? metrics.padding;

  const boxLeft =
    metrics.padding + c1 * (metrics.cellSize + metrics.gap) + colOffset;
  const boxTop = topPad + r1 * (metrics.cellSize + metrics.gap) + rowOffset;
  const widthInCells = c2 - c1 + 1;
  const heightInCells = r2 - r1 + 1;
  const boxWidthPx =
    widthInCells * metrics.cellSize + (widthInCells - 1) * metrics.gap;
  const boxHeightPx =
    heightInCells * metrics.cellSize + (heightInCells - 1) * metrics.gap;

  const isNeutral = box.owner === null;
  const isOwned = box.owner === activePlayer || isNeutral;
  const isP1 = box.owner === 1;

  const blockColor = isNeutral
    ? EXTRUSION_THEME.neutralBlock.primary
    : isP1
      ? EXTRUSION_THEME.player1.primary
      : EXTRUSION_THEME.player2.primary;

  const blockBorderColor = isNeutral
    ? EXTRUSION_THEME.neutralBlock.border
    : isP1
      ? EXTRUSION_THEME.player1.blockBorder
      : EXTRUSION_THEME.player2.blockBorder;

  const hasExtrudedRef = useRef(false);

  const blockPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled && isOwned,
        onMoveShouldSetPanResponder: (_evt, gestureState) => {
          if (disabled || !isOwned) return false;
          return Math.hypot(gestureState.dx, gestureState.dy) > 5;
        },
        onPanResponderGrant: () => {
          hasExtrudedRef.current = false;
        },
        onPanResponderMove: (_evt, gestureState) => {
          if (disabled || !isOwned || hasExtrudedRef.current) return;
          const dx = gestureState.dx;
          const dy = gestureState.dy;
          const dist = Math.hypot(dx, dy);

          if (dist >= 14) {
            let direction: ExtrudeDirection;
            if (Math.abs(dx) > Math.abs(dy)) {
              direction = dx > 0 ? "right" : "left";
            } else {
              direction = dy > 0 ? "down" : "up";
            }

            hasExtrudedRef.current = true;
            if (onExtrude) {
              onExtrude(box.id, direction);
            }
          }
        },
        onPanResponderRelease: (_evt, gestureState) => {
          if (disabled || !isOwned) return;
          const dist = Math.hypot(gestureState.dx, gestureState.dy);
          if (!hasExtrudedRef.current && dist < 10) {
            onSelect(box.id);
          }
        },
      }),
    [disabled, isOwned, box.id, onExtrude, onSelect]
  );

  return (
    <View
      style={[
        styles.claimedBlock,
        {
          left: boxLeft,
          top: boxTop,
          width: boxWidthPx,
          height: boxHeightPx,
          backgroundColor: blockColor,
          borderColor: isSelected ? "#F59E0B" : blockBorderColor,
          borderWidth: isSelected ? 3 : 2.5,
        },
      ]}
      {...blockPanResponder.panHandlers}
    >
      {/* Direction hints when block is active/selected */}
      {isSelected && isOwned && !disabled && (
        <>
          {canExpandBlock(board, box, "up") && (
            <Pressable
              onPress={() => onExtrude?.(box.id, "up")}
              style={[styles.directionHint, styles.hintUp]}
            >
              <Text style={styles.hintArrow}>▲</Text>
            </Pressable>
          )}
          {canExpandBlock(board, box, "down") && (
            <Pressable
              onPress={() => onExtrude?.(box.id, "down")}
              style={[styles.directionHint, styles.hintDown]}
            >
              <Text style={styles.hintArrow}>▼</Text>
            </Pressable>
          )}
          {canExpandBlock(board, box, "left") && (
            <Pressable
              onPress={() => onExtrude?.(box.id, "left")}
              style={[styles.directionHint, styles.hintLeft]}
            >
              <Text style={styles.hintArrow}>◀</Text>
            </Pressable>
          )}
          {canExpandBlock(board, box, "right") && (
            <Pressable
              onPress={() => onExtrude?.(box.id, "right")}
              style={[styles.directionHint, styles.hintRight]}
            >
              <Text style={styles.hintArrow}>▶</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

export function GridBoard({
  board,
  onTileTap,
  onSpawn,
  onExtrude,
  disabled,
  activePlayer,
  player1ColorHex = EXTRUSION_THEME.player1.primary,
  player2ColorHex = EXTRUSION_THEME.player2.primary,
  availableHeight,
  layoutDensity = "normal",
}: GridBoardProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  const isTallBoard = board.rows > board.cols;
  const isTight = layoutDensity === "tight";
  const isMultiSubBoard = Boolean(board.subBoards && board.subBoards.length > 1);
  const framePadding = isTight ? 1 : 2;
  const maxBoardWidth = Math.min(screenWidth - (isTight ? 12 : 16), 460);
  // Minimized tight gap between boxes to keep them close together:
  const gridGap = isTight ? 1 : 1.2;
  const boardPadding = isTight ? 2 : 2.5;
  const subBoardGapX = isMultiSubBoard ? (isTight ? 8 : 10) : 0;
  const subBoardGapY = isMultiSubBoard ? (isTight ? 10 : 12) : 0;
  const boardPaddingTop = isMultiSubBoard ? (isTight ? 20 : 24) : boardPadding;
  const boardPaddingBottom = boardPadding;
  const fallbackBoardHeight = Math.max(200, screenHeight - (isTight ? 130 : 160));
  const heightSlack = isTight ? 2 : 4;
  const maxBoardHeight =
    availableHeight && availableHeight > 80
      ? availableHeight - heightSlack
      : fallbackBoardHeight;

  const { getColOffset, getRowOffset, totalExtraWidth, totalExtraHeight } =
    useMemo(() => {
      if (!isMultiSubBoard || !board.subBoards) {
        return {
          getColOffset: () => 0,
          getRowOffset: () => 0,
          totalExtraWidth: 0,
          totalExtraHeight: 0,
        };
      }

      const uniqueC1 = Array.from(new Set(board.subBoards.map((s) => s.c1))).sort(
        (a, b) => a - b
      );
      const uniqueR1 = Array.from(new Set(board.subBoards.map((s) => s.r1))).sort(
        (a, b) => a - b
      );

      const getColOffset = (col: number) => {
        let count = 0;
        for (let i = 1; i < uniqueC1.length; i++) {
          if (col >= uniqueC1[i]) count++;
        }
        return count * subBoardGapX;
      };

      const getRowOffset = (row: number) => {
        let count = 0;
        for (let i = 1; i < uniqueR1.length; i++) {
          if (row >= uniqueR1[i]) count++;
        }
        return count * subBoardGapY;
      };

      const totalExtraWidth = Math.max(0, uniqueC1.length - 1) * subBoardGapX;
      const totalExtraHeight = Math.max(0, uniqueR1.length - 1) * subBoardGapY;

      return { getColOffset, getRowOffset, totalExtraWidth, totalExtraHeight };
    }, [isMultiSubBoard, board.subBoards, subBoardGapX, subBoardGapY]);

  const { metrics, contentWidth, contentHeight } = useMemo(() => {
    const innerMaxWidth = Math.max(40, maxBoardWidth - INNER_BORDER * 2);
    const innerMaxHeight = Math.max(40, maxBoardHeight - INNER_BORDER * 2);

    // Dynamic adaptation for all smartphone screens:
    // Box size dynamically adopts to the screen while keeping squares and fitting both dimensions:
    const cellFromWidth = Math.floor(
      (innerMaxWidth - boardPadding * 2 - (board.cols - 1) * gridGap - totalExtraWidth) /
        board.cols
    );
    const cellFromHeight = Math.floor(
      (innerMaxHeight - boardPaddingTop - boardPaddingBottom - (board.rows - 1) * gridGap - totalExtraHeight) /
        board.rows
    );

    const cellSize = Math.max(16, Math.min(cellFromWidth, cellFromHeight));
    const metrics = createBoardMetrics(cellSize, gridGap, boardPadding);
    const baseSize = getBoardContentSize(metrics, board.cols, board.rows);
    const contentWidth = baseSize.width + totalExtraWidth;
    const contentHeight =
      boardPaddingTop +
      boardPaddingBottom +
      board.rows * cellSize +
      Math.max(board.rows - 1, 0) * gridGap +
      totalExtraHeight;

    return {
      metrics,
      contentWidth,
      contentHeight,
    };
  }, [
    maxBoardHeight,
    maxBoardWidth,
    board.cols,
    board.rows,
    gridGap,
    boardPadding,
    boardPaddingTop,
    boardPaddingBottom,
    totalExtraWidth,
    totalExtraHeight,
  ]);

  const boardWidth = contentWidth + INNER_BORDER * 2;
  const boardHeight = contentHeight + INNER_BORDER * 2;

  const whiteRows = useMemo(
    () => board.unlockedWhiteRows ?? [],
    [board.unlockedWhiteRows]
  );

  const boxes = useMemo(() => Object.values(board.boxes), [board.boxes]);

  return (
    <View style={[styles.boardFrame, { padding: framePadding }]}>
      <View
        style={[
          styles.container,
          { width: boardWidth, height: boardHeight },
          isMultiSubBoard && { backgroundColor: EXTRUSION_THEME.board.trayBg },
        ]}
      >
        <View
          style={[
            styles.contentLayer,
            { width: contentWidth, height: contentHeight },
          ]}
        >
          {/* Sub-board frames and identifier badges */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {isMultiSubBoard &&
              board.subBoards?.map((sb, idx) => {
                const sbCols = sb.c2 - sb.c1 + 1;
                const sbRows = sb.r2 - sb.r1 + 1;
                const theme = SUB_BOARD_THEMES[idx % SUB_BOARD_THEMES.length];
                const left =
                  metrics.padding +
                  sb.c1 * (metrics.cellSize + metrics.gap) +
                  getColOffset(sb.c1) -
                  2;
                const top =
                  boardPaddingTop +
                  sb.r1 * (metrics.cellSize + metrics.gap) +
                  getRowOffset(sb.r1) -
                  2;
                const width =
                  sbCols * metrics.cellSize + (sbCols - 1) * metrics.gap + 4;
                const height =
                  sbRows * metrics.cellSize + (sbRows - 1) * metrics.gap + 4;

                const badgeTop = Math.max(2, top - (isTight ? 16 : 19));
                const arenaName = (sb.name ?? `Arena ${idx + 1}`).toUpperCase();
                const badgeText = `${theme.tag} · ${arenaName}`;

                return (
                  <React.Fragment key={`subboard-group-${sb.id}`}>
                    {/* Sub-board Arena Card Frame */}
                    <View
                      style={[
                        styles.subBoardCard,
                        {
                          left,
                          top,
                          width,
                          height,
                          borderColor: theme.borderColor,
                          backgroundColor: theme.cardBg,
                        },
                      ]}
                    />

                    {/* Sub-board Identifier Header Badge */}
                    <View
                      style={[
                        styles.subBoardBadge,
                        {
                          left: left + 2,
                          top: badgeTop,
                          maxWidth: width,
                          backgroundColor: theme.badgeBg,
                          borderColor: theme.badgeBorder,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.subBoardBadgeDot,
                          { backgroundColor: theme.borderColor },
                        ]}
                      />
                      <Text
                        style={[
                          styles.subBoardBadgeText,
                          { color: theme.badgeText },
                        ]}
                        numberOfLines={1}
                      >
                        {badgeText}
                      </Text>
                    </View>
                  </React.Fragment>
                );
              })}
          </View>

          {/* 1. Grid Cells with Territory Tinting */}
          {Array.from({ length: board.rows }).map((_, r) => {
            return Array.from({ length: board.cols }).map((__, c) => {
              const zone = getCellTerritoryZone(
                board,
                r,
                c,
                board.unlockedWhiteCells,
                whiteRows
              );
              if (zone === "void") return null;

              const isNeutral = zone === "neutral";
              const isP1 = zone === "player1";

              // Soothing territory tinting with subtle matching blending borders
              const cellBg = isNeutral
                ? EXTRUSION_THEME.neutral.bg
                : isP1
                  ? EXTRUSION_THEME.player1.territoryBg
                  : EXTRUSION_THEME.player2.territoryBg;

              const cellBorder = isNeutral
                ? EXTRUSION_THEME.neutral.cellBorder
                : isP1
                  ? EXTRUSION_THEME.player1.cellBorder
                  : EXTRUSION_THEME.player2.cellBorder;

              const cellLeft =
                metrics.padding +
                c * (metrics.cellSize + metrics.gap) +
                getColOffset(c);
              const cellTop =
                boardPaddingTop +
                r * (metrics.cellSize + metrics.gap) +
                getRowOffset(r);

              const isEmpty = board.cellMap[r]?.[c] === null;
              const canSpawnHere =
                isEmpty &&
                canSpawnAt(
                  board,
                  r,
                  c,
                  activePlayer,
                  whiteRows,
                  board.unlockedWhiteCells
                );

              return (
                <Pressable
                  key={`cell-bg-${r}-${c}`}
                  style={[
                    styles.gridCell,
                    {
                      left: cellLeft,
                      top: cellTop,
                      width: metrics.cellSize,
                      height: metrics.cellSize,
                      backgroundColor: cellBg,
                      borderColor: cellBorder,
                      borderWidth: 1.5,
                    },
                    canSpawnHere && !disabled && styles.spawnableCellGlow,
                  ]}
                  disabled={disabled || !canSpawnHere}
                  onPress={() => {
                    if (disabled || !canSpawnHere) return;
                    setSelectedBoxId(null);
                    // Normal single click creates a 1×1 block immediately!
                    if (onSpawn) {
                      onSpawn(r, c);
                    } else {
                      onTileTap(r, c);
                    }
                  }}
                />
              );
            });
          })}

          {/* 2. Solid Claimed Blocks (Extruded Rectangles) */}
          {boxes.map((box) => (
            <ExtrudedBlockItem
              key={`block-${box.id}`}
              box={box}
              board={board}
              metrics={metrics}
              activePlayer={activePlayer}
              disabled={disabled}
              player1ColorHex={player1ColorHex}
              player2ColorHex={player2ColorHex}
              isSelected={selectedBoxId === box.id}
              onSelect={(id) =>
                setSelectedBoxId((prev) => (prev === id ? null : id))
              }
              onExtrude={onExtrude}
              getColOffset={getColOffset}
              getRowOffset={getRowOffset}
              paddingTop={boardPaddingTop}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  boardFrame: {
    borderRadius: 14,
    backgroundColor: EXTRUSION_THEME.board.frameBg,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    alignSelf: "center",
  },
  container: {
    backgroundColor: EXTRUSION_THEME.board.canvasBg,
    borderRadius: 10,
    borderWidth: INNER_BORDER,
    borderColor: EXTRUSION_THEME.board.borderColor,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  contentLayer: {
    position: "relative",
  },
  gridCell: {
    position: "absolute",
    borderRadius: EXTRUSION_THEME.board.cellRadius,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  spawnableCellGlow: {
    opacity: 0.95,
  },
  claimedBlock: {
    position: "absolute",
    borderRadius: EXTRUSION_THEME.board.blockRadius,
    borderWidth: 2.5,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
    shadowColor: "#1A202C",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    elevation: 2,
    overflow: "visible",
  },
  directionHint: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FBBF24",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  hintArrow: {
    color: "#78350F",
    fontSize: 11,
    fontWeight: "900",
    includeFontPadding: false,
  },
  hintUp: {
    top: -12,
    alignSelf: "center",
  },
  hintDown: {
    bottom: -12,
    alignSelf: "center",
  },
  hintLeft: {
    left: -12,
    top: "50%",
    transform: [{ translateY: -11 }],
  },
  hintRight: {
    right: -12,
    top: "50%",
    transform: [{ translateY: -11 }],
  },
  subBoardCard: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: EXTRUSION_THEME.board.cellRadius + 4,
    borderWidth: 2.5,
    zIndex: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  subBoardBadge: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1.2,
    zIndex: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  subBoardBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  subBoardBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});
