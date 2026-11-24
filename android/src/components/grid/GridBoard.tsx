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
  getCellLayout,
  BoardMetrics,
} from "../../engine/board/boardLayout";
import {
  getRowTerritoryZone,
  canSpawnAt,
  canExpandBlock,
  getBlockRect,
  ExtrudeDirection,
  TerritoryZone,
} from "../../engine/gameEngine";
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
}: ExtrudedBlockItemProps) {
  const rect = getBlockRect(box);
  const { r1, c1, r2, c2 } = rect;

  const boxLeft = metrics.padding + c1 * (metrics.cellSize + metrics.gap);
  const boxTop = metrics.padding + r1 * (metrics.cellSize + metrics.gap);
  const widthInCells = c2 - c1 + 1;
  const heightInCells = r2 - r1 + 1;
  const boxWidthPx =
    widthInCells * metrics.cellSize + (widthInCells - 1) * metrics.gap;
  const boxHeightPx =
    heightInCells * metrics.cellSize + (heightInCells - 1) * metrics.gap;

  const isOwned = box.owner === activePlayer;
  const blockColor = box.owner === 1 ? player1ColorHex : player2ColorHex;
  const darkBorderColor = box.owner === 1 ? "#1E40AF" : "#991B1B";

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
          borderColor: isSelected ? "#FBBF24" : darkBorderColor,
          borderWidth: isSelected ? 3 : 2,
        },
      ]}
      {...blockPanResponder.panHandlers}
    >
      {/* 3D Extrusion Bottom Shadow */}
      <View
        pointerEvents="none"
        style={[styles.blockBottomBevel, { backgroundColor: darkBorderColor }]}
      />

      {/* Inner cell dividers */}
      {widthInCells > 1 &&
        Array.from({ length: widthInCells - 1 }).map((_, idx) => (
          <View
            key={`vline-${idx}`}
            pointerEvents="none"
            style={[
              styles.innerGridLineV,
              {
                left:
                  (idx + 1) * (metrics.cellSize + metrics.gap) - metrics.gap / 2,
              },
            ]}
          />
        ))}
      {heightInCells > 1 &&
        Array.from({ length: heightInCells - 1 }).map((_, idx) => (
          <View
            key={`hline-${idx}`}
            pointerEvents="none"
            style={[
              styles.innerGridLineH,
              {
                top:
                  (idx + 1) * (metrics.cellSize + metrics.gap) - metrics.gap / 2,
              },
            ]}
          />
        ))}

      {/* Block size label */}
      <View pointerEvents="none" style={styles.blockLabelContainer}>
        <Text style={styles.blockLabelText}>
          {box.size > 1 ? `${widthInCells}×${heightInCells}` : ""}
        </Text>
      </View>

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
  player1ColorHex = "#3B82F6",
  player2ColorHex = "#EF4444",
  availableHeight,
  layoutDensity = "normal",
}: GridBoardProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  const isTallBoard = board.rows > board.cols;
  const isTight = layoutDensity === "tight";
  const framePadding = isTight ? 1 : 2;
  const maxBoardWidth = Math.min(screenWidth - (isTight ? 16 : 24), 450);
  const gridGap = isTallBoard ? (isTight ? 3 : 4) : isTight ? 4 : 5;
  const boardPadding = isTight ? 6 : 8;
  const fallbackBoardHeight = Math.max(180, screenHeight - (isTight ? 220 : 310));
  const heightSlack = isTight ? 2 : 6;
  const maxBoardHeight =
    availableHeight && availableHeight > 80
      ? availableHeight - heightSlack
      : fallbackBoardHeight;

  const { metrics, contentWidth, contentHeight } = useMemo(() => {
    const innerMaxWidth = Math.max(40, maxBoardWidth - INNER_BORDER * 2);
    const innerMaxHeight = Math.max(40, maxBoardHeight - INNER_BORDER * 2);

    const widthMetrics = getBoardMetrics(
      innerMaxWidth,
      board.cols,
      board.rows,
      boardPadding,
      gridGap
    );
    const widthSize = getBoardContentSize(widthMetrics, board.cols, board.rows);
    const widthBasedFits =
      widthSize.width <= innerMaxWidth && widthSize.height <= innerMaxHeight;

    if (isTallBoard && widthBasedFits) {
      return {
        metrics: widthMetrics,
        contentWidth: widthSize.width,
        contentHeight: widthSize.height,
      };
    }

    if (
      !isTallBoard &&
      widthSize.width <= innerMaxWidth &&
      widthSize.height <= innerMaxHeight
    ) {
      const square = Math.min(innerMaxWidth, innerMaxHeight);
      const squareMetrics = getBoardMetrics(
        square,
        board.cols,
        board.rows,
        boardPadding,
        gridGap
      );
      const squareSize = getBoardContentSize(squareMetrics, board.cols, board.rows);
      return {
        metrics: squareMetrics,
        contentWidth: squareSize.width,
        contentHeight: squareSize.height,
      };
    }

    const fitted = fitBoardLayout(innerMaxWidth, innerMaxHeight, board.cols, board.rows, {
      gap: gridGap,
      padding: boardPadding,
      preferWidthCellSize: isTallBoard,
    });
    return {
      metrics: fitted.metrics,
      contentWidth: fitted.width,
      contentHeight: fitted.height,
    };
  }, [
    isTallBoard,
    maxBoardHeight,
    maxBoardWidth,
    board.cols,
    board.rows,
    gridGap,
    boardPadding,
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
        ]}
      >
        <View
          style={[
            styles.contentLayer,
            { width: contentWidth, height: contentHeight },
          ]}
        >
          {/* 1. Grid Cells with Territory Tinting */}
          {Array.from({ length: board.rows }).map((_, r) => {
            const zone: TerritoryZone = getRowTerritoryZone(r, board.rows, whiteRows);
            const isNeutral = zone === "neutral";
            const isP1 = zone === "player1";

            // Top three rows (0, 1, 2) are light Player 1 color
            // Bottom three rows (3, 4, 5) are light Player 2 color
            // Unlocked rows become crisp white
            const cellBg = isNeutral
              ? "#FFFFFF"
              : isP1
                ? "#EFF6FF" // light shade of Player 1
                : "#FFF1F2"; // light shade of Player 2

            const cellBorder = isNeutral
              ? "#CBD5E1"
              : isP1
                ? "#BFDBFE"
                : "#FECDD3";

            return Array.from({ length: board.cols }).map((__, c) => {
              const layout = getCellLayout(r, c, metrics);
              const isEmpty = board.cellMap[r]?.[c] === null;
              const canSpawnHere =
                isEmpty && canSpawnAt(board, r, c, activePlayer, whiteRows);

              return (
                <Pressable
                  key={`cell-bg-${r}-${c}`}
                  style={[
                    styles.gridCell,
                    {
                      left: layout.left,
                      top: layout.top,
                      width: layout.width,
                      height: layout.height,
                      backgroundColor: cellBg,
                      borderColor: cellBorder,
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
                >
                  {/* Subtle spawnable indicator */}
                  {isEmpty && canSpawnHere && !disabled && (
                    <View
                      style={[
                        styles.spawnDot,
                        {
                          backgroundColor:
                            activePlayer === 1
                              ? player1ColorHex
                              : player2ColorHex,
                        },
                      ]}
                    />
                  )}
                </Pressable>
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
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  boardFrame: {
    borderRadius: 20,
    backgroundColor: GAME_SCENE.board.frameDark,
    shadowColor: GAME_SCENE.board.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
    alignSelf: "center",
  },
  container: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: INNER_BORDER,
    borderColor: GAME_SCENE.board.frame,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  contentLayer: {
    position: "relative",
  },
  gridCell: {
    position: "absolute",
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  spawnableCellGlow: {
    borderColor: "rgba(100, 116, 139, 0.45)",
  },
  spawnDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    opacity: 0.65,
  },
  claimedBlock: {
    position: "absolute",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 3,
    overflow: "visible",
  },
  blockBottomBevel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    opacity: 0.35,
  },
  innerGridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    zIndex: 2,
  },
  innerGridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    zIndex: 2,
  },
  blockLabelContainer: {
    zIndex: 5,
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  blockLabelText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
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
});
