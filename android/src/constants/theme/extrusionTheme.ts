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
export const BOARD_TRAY_BG = "#E5DDD0"; // Warmer, richer neutral tray background for multi-board levels
export const BOARD_BORDER_COLOR = "#DDD5C7";

// ── SUB-BOARD IDENTIFIER THEMES (Levels 11–20) ──
// Distinct, soothing border colors and matching badge styles to make independent
// sub-boards immediately recognizable and easily distinguishable from one another.
export const SUB_BOARD_THEMES = [
  {
    tag: "A",
    name: "Indigo",
    borderColor: "#818CF8", // Distinct crisp border
    badgeBg: "#EEF2FF",
    badgeBorder: "#A5B4FC",
    badgeText: "#4338CA",
    cardBg: "#FFFFFF",
  },
  {
    tag: "B",
    name: "Teal",
    borderColor: "#2DD4BF", // Distinct crisp border
    badgeBg: "#F0FDFA",
    badgeBorder: "#5EEAD4",
    badgeText: "#0F766E",
    cardBg: "#FFFFFF",
  },
  {
    tag: "C",
    name: "Amber",
    borderColor: "#FBBF24", // Distinct crisp border
    badgeBg: "#FFFBEB",
    badgeBorder: "#FDE68A",
    badgeText: "#B45309",
    cardBg: "#FFFFFF",
  },
  {
    tag: "D",
    name: "Rose",
    borderColor: "#FB7185", // Distinct crisp border
    badgeBg: "#FFF1F2",
    badgeBorder: "#FECDD3",
    badgeText: "#BE123C",
    cardBg: "#FFFFFF",
  },
] as const;

export type SubBoardTheme = (typeof SUB_BOARD_THEMES)[number];

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
    trayBg: BOARD_TRAY_BG,
    borderColor: BOARD_BORDER_COLOR,
    cellRadius: 7, // Restored original soft roundness
    blockRadius: 8,
  },
  subBoards: SUB_BOARD_THEMES,
} as const;

export function getPlayerExtrusionTheme(player: Player) {
  return player === 1 ? EXTRUSION_THEME.player1 : EXTRUSION_THEME.player2;
}
