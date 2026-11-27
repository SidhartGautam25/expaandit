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
  getBlockRect,
  type ExtrudeDirection,
  type ExtrusionAction,
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
  legalMoves: readonly ExtrusionAction[];
  onMoveBlock: (boxId: string, direction: ExtrudeDirection) => void;
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

type BlockMove = Extract<ExtrusionAction, { boxId: string }>;

const ARROWS: Record<ExtrudeDirection, { glyph: string; x: number; y: number }> = {
  up: { glyph: "▲", x: 0, y: -1 },
  down: { glyph: "▼", x: 0, y: 1 },
  left: { glyph: "◀", x: -1, y: 0 },
  right: { glyph: "▶", x: 1, y: 0 },
};

const HINT_SIZE = 24;
const NO_BLOCK_MOVES: readonly BlockMove[] = [];

interface ExtrudedBlockItemProps {
  box: GameBox;
  layout: CellLayout;
  borderRadius: number;
  moves: readonly BlockMove[];
  disabled: boolean;
  player1ColorHex: string;
  player2ColorHex: string;
  isSelected: boolean;
  onSelect: (boxId: string) => void;
  onAction: (move: BlockMove) => void;
}

function ExtrudedBlockItem({
  box, layout, borderRadius, moves, disabled,
  player1ColorHex, player2ColorHex, isSelected, onSelect, onAction,
}: ExtrudedBlockItemProps) {
  const green = box.blockType === "movable_green";
  const neutral = box.owner === null;
  const canInteract = !disabled && moves.length > 0;
  const blockTheme = green ? EXTRUSION_THEME.greenBlock : EXTRUSION_THEME.neutralBlock;
  const backgroundColor = neutral ? blockTheme.primary : box.owner === 1 ? player1ColorHex : player2ColorHex;
  const acted = useRef(false);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => canInteract,
    onMoveShouldSetPanResponder: (_event, gesture) =>
      canInteract && Math.hypot(gesture.dx, gesture.dy) > 5,
    onPanResponderGrant: () => {
      acted.current = false;
    },
    onPanResponderMove: (_event, { dx, dy }) => {
      if (!canInteract || acted.current || Math.hypot(dx, dy) < 14) return;
      const direction = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? "right" : "left")
        : (dy > 0 ? "down" : "up");
      const action = moves.find((move) => move.direction === direction);
      if (!action) return;
      acted.current = true;
      onAction(action);
    },
    onPanResponderRelease: (_event, gesture) => {
      if (canInteract && !acted.current && Math.hypot(gesture.dx, gesture.dy) < 10) {
        onSelect(box.id);
      }
    },
  }), [canInteract, moves, box.id, onAction, onSelect]);

  return (
    <View
      accessible
      accessibilityLabel={green ? "Green sliding block" : neutral ? "Black block" : "Player " + box.owner + " block"}
      accessibilityActions={canInteract ? [{ name: "activate", label: "Select block" }] : undefined}
      onAccessibilityAction={canInteract ? () => onSelect(box.id) : undefined}
      style={[
        styles.claimedBlock,
        layout,
        {
          borderRadius,
          backgroundColor,
          borderColor: isSelected ? EXTRUSION_THEME.board.frameBg : blockTheme.border,
          borderWidth: isSelected ? 2 : neutral ? 1 : 0,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {green && <Text style={[styles.greenIcon, { fontSize: Math.min(18, layout.width / 2) }]}>✥</Text>}
    </View>
  );
}

export function GridBoard({
  board,
  legalMoves,
  onTileTap,
  onTileLongPress,
  onMoveBlock,
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
  const [selection, setSelection] = useState<{ id: string; player: Player } | null>(null);

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

  const { cellMoves, blockMoves } = useMemo(() => {
    const cellMoves = new Map<number, { spawn: boolean; green: boolean }>();
    const blockMoves = new Map<string, BlockMove[]>();
    for (const move of legalMoves) {
      if (move.type === "spawn" || move.type === "spawn_green") {
        const index = move.row * board.cols + move.col;
        const choices = cellMoves.get(index) ?? { spawn: false, green: false };
        if (move.type === "spawn") choices.spawn = true;
        else choices.green = true;
        cellMoves.set(index, choices);
      } else {
        const choices = blockMoves.get(move.boxId) ?? [];
        choices.push(move);
        blockMoves.set(move.boxId, choices);
      }
    }
    return { cellMoves, blockMoves };
  }, [board.cols, legalMoves]);

  const getBoxLayout = (box: GameBox): CellLayout => {
    const { r1, c1, r2, c2 } = getBlockRect(box);
    const layout = getTileLayout(r1, c1);
    return {
      ...layout,
      width: layout.width + (c2 - c1) * cellStep,
      height: layout.height + (r2 - r1) * cellStep,
    };
  };

  const onBlockAction = (move: BlockMove) => {
    if (move.type === "slide") onMoveBlock(move.boxId, move.direction);
    else onExtrude?.(move.boxId, move.direction);
  };

  const selectedBox = !disabled && selection?.player === activePlayer ? board.boxes[selection.id] : undefined;
  const selectedMoves = selectedBox ? blockMoves.get(selectedBox.id) ?? NO_BLOCK_MOVES : NO_BLOCK_MOVES;
  const selectedLayout = selectedBox && selectedMoves.length > 0 ? getBoxLayout(selectedBox) : null;
  const selectedGreen = selectedBox?.blockType === "movable_green";

  return (
    <View style={[styles.boardFrame, { padding: framePadding }]}>
      <View style={[styles.container, { width: width + extraWidth, height: height + extraHeight }]}>
        {Array.from({ length: board.rows }, (_, row) =>
          Array.from({ length: board.cols }, (_, col) => {
            if (board.cellMap[row]?.[col] !== null) return null;
            const zone = getCellTerritoryZone(board, row, col);
            if (zone === "void") return null;

            const choices = cellMoves.get(row * board.cols + col);
            const cellBg = zone === "neutral" ? EXTRUSION_THEME.neutral.bg : EXTRUSION_THEME[zone].territoryBg;
            const spawn = choices?.spawn ? () => {
              setSelection(null);
              (onSpawn ?? onTileTap)(row, col);
            } : undefined;
            const placeGreen = choices?.green && onTileLongPress ? () => {
              setSelection(null);
              onTileLongPress(row, col);
            } : undefined;

            return (
              <Pressable
                key={`cell-${row}-${col}`}
                style={({ pressed }) => [
                  styles.gridCell,
                  getTileLayout(row, col),
                  { backgroundColor: cellBg, borderRadius: tileRadius },
                  pressed && styles.pressedCell,
                ]}
                disabled={disabled || (!spawn && !placeGreen)}
                accessibilityRole="button"
                accessibilityLabel={`Empty tile, row ${row + 1}, column ${col + 1}`}
                accessibilityActions={placeGreen ? [{ name: "placeGreen", label: "Place green block" }] : undefined}
                onAccessibilityAction={placeGreen && !disabled ? (event) => {
                  if (event.nativeEvent.actionName === "placeGreen") placeGreen();
                } : undefined}
                onPress={spawn}
                onLongPress={placeGreen}
              />
            );
          })
        )}

        {Object.values(board.boxes).map((box) => (
          <ExtrudedBlockItem
            key={box.id}
            box={box}
            layout={getBoxLayout(box)}
            borderRadius={tileRadius}
            moves={blockMoves.get(box.id) ?? NO_BLOCK_MOVES}
            disabled={disabled}
            player1ColorHex={player1ColorHex}
            player2ColorHex={player2ColorHex}
            isSelected={selectedBox?.id === box.id && selectedMoves.length > 0}
            onSelect={(id) => setSelection((previous) =>
              previous?.id === id && previous.player === activePlayer ? null : { id, player: activePlayer }
            )}
            onAction={onBlockAction}
          />
        ))}

        {selectedLayout && selectedMoves.map((move) => {
          const { glyph, x, y } = ARROWS[move.direction];
          const left = selectedLayout.left + selectedLayout.width / 2 +
            x * (selectedLayout.width / 2 + gridGap) - HINT_SIZE / 2;
          const top = selectedLayout.top + selectedLayout.height / 2 +
            y * (selectedLayout.height / 2 + gridGap) - HINT_SIZE / 2;
          return (
            <Pressable
              key={move.direction}
              accessibilityRole="button"
              accessibilityLabel={(selectedGreen ? "Slide green block " : "Expand block ") + move.direction}
              onPress={() => onBlockAction(move)}
              style={[styles.directionHint, { left, top }, selectedGreen && styles.greenHint]}
            >
              <Text style={[styles.hintArrow, selectedGreen && styles.greenHintArrow]}>{glyph}</Text>
            </Pressable>
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
    zIndex: 2,
    width: HINT_SIZE,
    height: HINT_SIZE,
    borderRadius: HINT_SIZE / 2,
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
  greenIcon: {
    color: EXTRUSION_THEME.greenBlock.icon,
    includeFontPadding: false,
    fontWeight: "800",
  },
  greenHint: {
    backgroundColor: EXTRUSION_THEME.greenBlock.primary,
    borderColor: EXTRUSION_THEME.greenBlock.border,
  },
  greenHintArrow: {
    color: EXTRUSION_THEME.greenBlock.icon,
  },
});
