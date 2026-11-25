import { Player } from "../../types/game";

/**
 * ============================================================================
 * SOOTHING MINIMALIST PUZZLE THEME (SHIKAKU AESTHETIC)
 * ============================================================================
 * Flat, velvety matte pastels with borderless tiles and ultra-fine gaps.
 * Zero harsh outlines, zero cartoonish gradients.
 *
 * Easily tweak or manage the player colors here:
 * ============================================================================
 */

// ── PLAYER 1 (Soft Slate / Sky Periwinkle Pastel Blue - Shikaku Blue) ──
export const PLAYER_1_PRIMARY = "#94B4DE";
export const PLAYER_1_TERRITORY_BG = "#EAF1FA";
export const PLAYER_1_TEXT = "#4A6E9E";
export const PLAYER_1_PILL_BG = "#EBF2FB";

// ── PLAYER 2 (Soft Dusty Rose / Mauve Berry Pastel - Shikaku Pink) ──
export const PLAYER_2_PRIMARY = "#D07EA4";
export const PLAYER_2_TERRITORY_BG = "#FAEEF4";
export const PLAYER_2_TEXT = "#98476F";
export const PLAYER_2_PILL_BG = "#FBEEF3";

// ── NEUTRAL ZONE (Clean White) ──
export const NEUTRAL_ZONE_BG = "#FFFFFF";

// ── BOARD CANVAS & FRAME (Warm Soothing Neutral Stone) ──
export const BOARD_FRAME_BG = "#ECE8E1";
export const BOARD_CANVAS_BG = "#DFD9CE"; // Canvas color seen in the hairline 2.5px gaps
export const BOARD_BORDER_COLOR = "#D5CEBF";

/**
 * Structured Theme Token Object
 */
export const EXTRUSION_THEME = {
  player1: {
    primary: PLAYER_1_PRIMARY,
    territoryBg: PLAYER_1_TERRITORY_BG,
    text: PLAYER_1_TEXT,
    pillBg: PLAYER_1_PILL_BG,
  },
  player2: {
    primary: PLAYER_2_PRIMARY,
    territoryBg: PLAYER_2_TERRITORY_BG,
    text: PLAYER_2_TEXT,
    pillBg: PLAYER_2_PILL_BG,
  },
  neutral: {
    bg: NEUTRAL_ZONE_BG,
  },
  board: {
    frameBg: BOARD_FRAME_BG,
    canvasBg: BOARD_CANVAS_BG,
    borderColor: BOARD_BORDER_COLOR,
    cellRadius: 7,
    blockRadius: 8,
  },
} as const;

export function getPlayerExtrusionTheme(player: Player) {
  return player === 1 ? EXTRUSION_THEME.player1 : EXTRUSION_THEME.player2;
}
