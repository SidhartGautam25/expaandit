import type { Player } from "../../types/game";

export const PLAYER_1_PRIMARY = "#F5402B";
export const PLAYER_2_PRIMARY = "#EEAB04";

const CREAM = "#E8E4D9";
const BLACK = "#1A1718";

export const EXTRUSION_THEME = {
  player1: {
    primary: PLAYER_1_PRIMARY,
    territoryBg: "#F0D5CD",
    cellBorder: "#EAB6AB",
    text: "#84281D",
    pillBg: "#F8E1DB",
  },
  player2: {
    primary: PLAYER_2_PRIMARY,
    territoryBg: "#F1E2B7",
    cellBorder: "#E5CA83",
    text: "#6B4700",
    pillBg: "#FAEDCA",
  },
  neutral: {
    bg: CREAM,
  },
  neutralBlock: {
    primary: BLACK,
    border: "#68615C",
  },
  board: {
    frameBg: CREAM,
    canvasBg: BLACK,
    tileRadiusRatio: 0.13,
  },
} as const;

export function getPlayerExtrusionTheme(player: Player) {
  return player === 1 ? EXTRUSION_THEME.player1 : EXTRUSION_THEME.player2;
}
