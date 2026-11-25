import { Player } from "../../types/game";

/**
 * ============================================================================
 * SWEET & VIBRANT CANDY PUZZLE THEME (LILAC PURPLE & CORAL ORANGE)
 * ============================================================================
 * Beautiful, joyful pastel tones inspired by the classic candy puzzle palette.
 * Crisp, clean square tiles with reduced corner roundness and thicker,
 * luminous borders that blend smoothly with each block's internal fill.
 *
 * Easily tweak or manage the player colors here:
 * ============================================================================
 */

// ── PLAYER 1 (Sweet Lilac / Lavender Purple - from palette.plot #C28BE0) ──
export const PLAYER_1_PRIMARY = "#C28BE0";
export const PLAYER_1_BLOCK_BORDER = "#D9B7EC"; // ~38% lighter tint that softly mixes with fill
export const PLAYER_1_TERRITORY_BG = "#F8F1FB";
export const PLAYER_1_CELL_BORDER = "#EDDCF6";
export const PLAYER_1_TEXT = "#7C35A8";
export const PLAYER_1_PILL_BG = "#F4EBF9";

// ── PLAYER 2 (Sweet Coral Peach / Tangerine - from palette.plot #F2954B) ──
export const PLAYER_2_PRIMARY = "#F2954B";
export const PLAYER_2_BLOCK_BORDER = "#F7BF93"; // ~38% lighter tint that softly mixes with fill
export const PLAYER_2_TERRITORY_BG = "#FDF2E9";
export const PLAYER_2_CELL_BORDER = "#FBDFC9";
export const PLAYER_2_TEXT = "#A04C0F";
export const PLAYER_2_PILL_BG = "#FCEBDC";

// ── NEUTRAL ZONE (Clean White) ──
export const NEUTRAL_ZONE_BG = "#FFFFFF";
export const NEUTRAL_ZONE_CELL_BORDER = "#EDE7DE";

// ── NEUTRAL BLACK / CHARCOAL BLOCK (Soothing Matte Slate / Charcoal) ──
export const NEUTRAL_BLOCK_PRIMARY = "#252B36";
export const NEUTRAL_BLOCK_BORDER = "#555B68";
export const NEUTRAL_BLOCK_TEXT = "#FFFFFF";

// ── BOARD CANVAS & FRAME (Warm Soothing Neutral Stone / Paper) ──
export const BOARD_FRAME_BG = "#F5EFE6";
export const BOARD_CANVAS_BG = "#EAE3D6";
export const BOARD_BORDER_COLOR = "#DDD5C7";

/**
 * Structured Theme Token Object
 */
export const EXTRUSION_THEME = {
  player1: {
    primary: PLAYER_1_PRIMARY,
    blockBorder: PLAYER_1_BLOCK_BORDER,
    territoryBg: PLAYER_1_TERRITORY_BG,
    cellBorder: PLAYER_1_CELL_BORDER,
    text: PLAYER_1_TEXT,
    pillBg: PLAYER_1_PILL_BG,
  },
  player2: {
    primary: PLAYER_2_PRIMARY,
    blockBorder: PLAYER_2_BLOCK_BORDER,
    territoryBg: PLAYER_2_TERRITORY_BG,
    cellBorder: PLAYER_2_CELL_BORDER,
    text: PLAYER_2_TEXT,
    pillBg: PLAYER_2_PILL_BG,
  },
  neutral: {
    bg: NEUTRAL_ZONE_BG,
    cellBorder: NEUTRAL_ZONE_CELL_BORDER,
  },
  neutralBlock: {
    primary: NEUTRAL_BLOCK_PRIMARY,
    border: NEUTRAL_BLOCK_BORDER,
    text: NEUTRAL_BLOCK_TEXT,
  },
  board: {
    frameBg: BOARD_FRAME_BG,
    canvasBg: BOARD_CANVAS_BG,
    borderColor: BOARD_BORDER_COLOR,
    cellRadius: 7, // Restored original soft roundness
    blockRadius: 8,
  },
} as const;

export function getPlayerExtrusionTheme(player: Player) {
  return player === 1 ? EXTRUSION_THEME.player1 : EXTRUSION_THEME.player2;
}
