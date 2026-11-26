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
  getCellLayout,
  type CellLayout,
} from "../../engine/board/boardLayout";
import {
  findSubBoardForCell,
  getCellTerritoryZone,
  canSpawnAt,
  canExpandBlock,
  getBlockRect,
  type ExtrudeDirection,
} from "../../engine/extrusion/extrusionEngine";
import { EXTRUSION_THEME } from "../../constants/theme/extrusionTheme";
import type { SubBoardConfig } from "../../types/campaignBlueprint";
import type { GameLayoutDensity } from "../../utils/gameLayoutDensity";

function getSubBoardOffsets(
  subBoards: readonly SubBoardConfig[],
  start: "r1" | "c1",
  end: "r2" | "c2",
  extraGap: number
) {
  const offsets = new Map<SubBoardConfig, number>();

  // Shift each sub-board as a unit so every tile inside keeps the same spacing.
  for (const subBoard of [...subBoards].sort((a, b) => a[start] - b[start])) {
    let offset = 0;
    for (const [previous, previousOffset] of offsets) {
      if (previous[end] < subBoard[start]) {
        offset = Math.max(offset, previousOffset + extraGap);
      }
    }
    offsets.set(subBoard, offset);
  }

  return offsets;
}

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
  layout: CellLayout;
  borderRadius: number;
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
  layout,
  borderRadius,
  activePlayer,
  disabled,
  player1ColorHex,
  player2ColorHex,
  isSelected,
  onSelect,
  onExtrude,
}: ExtrudedBlockItemProps) {
  const isNeutral = box.owner === null;
  const isOwned = box.owner === activePlayer || isNeutral;

  const blockColor = isNeutral
    ? EXTRUSION_THEME.neutralBlock.primary
    : box.owner === 1
      ? player1ColorHex
      : player2ColorHex;

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
        layout,
        {
          borderRadius,
          backgroundColor: blockColor,
          borderColor: isSelected
            ? EXTRUSION_THEME.board.frameBg
            : EXTRUSION_THEME.neutralBlock.border,
          borderWidth: isSelected ? 2 : isNeutral ? 1 : 0,
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

  const isTight = layoutDensity === "tight";
  const framePadding = isTight ? 8 : 12;
  const maxBoardWidth = Math.min(screenWidth - (isTight ? 12 : 16), 460);
  const gridGap = isTight ? 3 : 4;
  const extraSubBoardGap = gridGap * 3;
  const fallbackBoardHeight = Math.max(200, screenHeight - (isTight ? 130 : 160));
  const heightSlack = isTight ? 2 : 4;
  const maxBoardHeight =
    availableHeight && availableHeight > 80
      ? availableHeight - heightSlack
      : fallbackBoardHeight;

  const { columnOffsets, rowOffsets, extraWidth, extraHeight } = useMemo(() => {
    const subBoards = board.subBoards ?? [];
    const columnOffsets = getSubBoardOffsets(subBoards, "c1", "c2", extraSubBoardGap);
    const rowOffsets = getSubBoardOffsets(subBoards, "r1", "r2", extraSubBoardGap);
    return {
      columnOffsets,
      rowOffsets,
      extraWidth: Math.max(0, ...columnOffsets.values()),
      extraHeight: Math.max(0, ...rowOffsets.values()),
    };
  }, [board.subBoards, extraSubBoardGap]);

  const { metrics: fittedMetrics } = fitBoardLayout(
    maxBoardWidth - framePadding * 2 - extraWidth,
    maxBoardHeight - framePadding * 2 - extraHeight,
    board.cols,
    board.rows,
    { padding: gridGap, gap: gridGap }
  );
  const metrics = {
    ...fittedMetrics,
    cellSize: Math.max(16, Math.floor(fittedMetrics.cellSize)),
  };
  const { width, height } = getBoardContentSize(metrics, board.cols, board.rows);
  const tileRadius = metrics.cellSize * EXTRUSION_THEME.board.tileRadiusRatio;
  const cellStep = metrics.cellSize + metrics.gap;
  const whiteRows = board.unlockedWhiteRows ?? [];

  const getTileLayout = (row: number, col: number): CellLayout => {
    const layout = getCellLayout(row, col, metrics);
    if (columnOffsets.size <= 1) return layout;

    const subBoard = findSubBoardForCell(board, row, col);
    if (!subBoard) return layout;

    return {
      ...layout,
      left: layout.left + (columnOffsets.get(subBoard) ?? 0),
      top: layout.top + (rowOffsets.get(subBoard) ?? 0),
    };
  };

  return (
    <View style={[styles.boardFrame, { padding: framePadding }]}>
      <View
        style={[
          styles.container,
          { width: width + extraWidth, height: height + extraHeight },
        ]}
      >
        {Array.from({ length: board.rows }, (_, row) =>
          Array.from({ length: board.cols }, (_, col) => {
            if (board.cellMap[row]?.[col] !== null) return null;

            const zone = getCellTerritoryZone(
              board,
              row,
              col,
              board.unlockedWhiteCells,
              whiteRows
            );
            if (zone === "void") return null;

            const cellBg =
              zone === "neutral"
                ? EXTRUSION_THEME.neutral.bg
                : EXTRUSION_THEME[zone].territoryBg;
            const layout = getTileLayout(row, col);
            const canSpawnHere = canSpawnAt(
              board,
              row,
              col,
              activePlayer,
              whiteRows,
              board.unlockedWhiteCells
            );

            return (
              <Pressable
                key={`cell-${row}-${col}`}
                style={({ pressed }) => [
                  styles.gridCell,
                  layout,
                  { backgroundColor: cellBg, borderRadius: tileRadius },
                  pressed && styles.pressedCell,
                ]}
                disabled={disabled || !canSpawnHere}
                onPress={() => {
                  if (disabled || !canSpawnHere) return;
                  setSelectedBoxId(null);
                  (onSpawn ?? onTileTap)(row, col);
                }}
              />
            );
          })
        )}

        {Object.values(board.boxes).map((box) => {
          const { r1, c1, r2, c2 } = getBlockRect(box);
          const layout = getTileLayout(r1, c1);

          return (
            <ExtrudedBlockItem
              key={`block-${box.id}`}
              box={box}
              board={board}
              layout={{
                ...layout,
                width: layout.width + (c2 - c1) * cellStep,
                height: layout.height + (r2 - r1) * cellStep,
              }}
              borderRadius={tileRadius}
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
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  boardFrame: {
    borderRadius: 20,
    backgroundColor: EXTRUSION_THEME.board.frameBg,
    alignSelf: "center",
  },
  container: {
    backgroundColor: EXTRUSION_THEME.board.canvasBg,
    overflow: "hidden",
  },
  gridCell: {
    position: "absolute",
  },
  pressedCell: {
    opacity: 0.8,
  },
  claimedBlock: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  directionHint: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: EXTRUSION_THEME.board.canvasBg,
    borderColor: EXTRUSION_THEME.board.frameBg,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  hintArrow: {
    color: EXTRUSION_THEME.board.frameBg,
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
