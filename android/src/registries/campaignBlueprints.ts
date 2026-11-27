import { CampaignBlueprint } from "../types/campaignBlueprint";

/**
 * Main campaign stages (1–20) — all unified to 10×6 territorial grid.
 * Starting from Level 5, neutral black blocks act as interactive obstacles
 * that can be expanded by both players but do not award capture points.
 */
export const CAMPAIGN_BLUEPRINTS: CampaignBlueprint[] = [
  // ── Stage 0: Interactive Tutorial ──
  {
    id: "campaign-0",
    campaignNumber: 0,
    name: "Clibo's Training",
    description: "Learn tapping, extrusion, and territory rules on the 10×6 board!",
    rows: 10,
    cols: 6,
    botDifficulty: 1,
  },

  // ── Early Stages (1–4): Open 10×6 Battlefield (No Obstacles) ──
  {
    id: "campaign-1",
    campaignNumber: 1,
    name: "First Steps",
    description: "Learn the basics on a 10×6 grid. The bot makes plenty of mistakes.",
    rows: 10,
    cols: 6,
    botDifficulty: 1,
  },
  {
    id: "campaign-2",
    campaignNumber: 2,
    name: "Warming Up",
    description: "Same 10×6 board with a bot that favors the frontier.",
    rows: 10,
    cols: 6,
    botDifficulty: 2,
  },
  {
    id: "campaign-3",
    campaignNumber: 3,
    name: "Grid Master",
    description: "Master the 10×6 grid as the competition heats up.",
    rows: 10,
    cols: 6,
    botDifficulty: 2,
  },
  {
    id: "campaign-4",
    campaignNumber: 4,
    name: "Twin Plots",
    description: "Battle across the 10×6 board. Watch out for bot incursions.",
    rows: 10,
    cols: 6,
    botDifficulty: 3,
  },

  // ── Stage 5: Introduction of Neutral Black Block at the Center ──
  {
    id: "campaign-5",
    campaignNumber: 5,
    name: "Center Core",
    description: "A neutral black block sits at the center! Both players can extrude it, but it gives no points.",
    rows: 10,
    cols: 6,
    botDifficulty: 3,
    // 1 center 2×2 block at the exact midline center (rows 4–5, cols 2–3)
    neutralBlocks: [
      { r1: 4, c1: 2, r2: 5, c2: 3 },
    ],
  },

  // ── Stage 6: Two Neutral Black Blocks (Symmetrically Placed) ──
  {
    id: "campaign-6",
    campaignNumber: 6,
    name: "Twin Monoliths",
    description: "Two neutral blocks placed symmetrically so neither player is favored.",
    rows: 10,
    cols: 6,
    botDifficulty: 4,
    neutralBlocks: [
      { r1: 3, c1: 2 }, // P1 territory center
      { r1: 6, c1: 3 }, // P2 territory center (180° symmetric)
    ],
  },

  // ── Stage 7: Two Neutral Black Blocks (Flank / Wing Placements) ──
  {
    id: "campaign-7",
    campaignNumber: 7,
    name: "Flank Guards",
    description: "Two neutral blocks guarding the outer wings. Push through the center or steer around.",
    rows: 10,
    cols: 6,
    botDifficulty: 5,
    neutralBlocks: [
      { r1: 2, c1: 1 }, // P1 outer wing
      { r1: 7, c1: 4 }, // P2 outer wing (180° symmetric)
    ],
  },

  // ── Stage 8: Four Neutral Black Blocks (Pillars / Fortress Gates) ──
  {
    id: "campaign-8",
    campaignNumber: 8,
    name: "The Pillars",
    description: "Four black pillars and two sliding green blocks shape the middle lanes.",
    rows: 10,
    cols: 6,
    botDifficulty: 6,
    neutralBlocks: [
      { r1: 2, c1: 1 },
      { r1: 2, c1: 4 },
      { r1: 7, c1: 1 },
      { r1: 7, c1: 4 },
      { r1: 4, c1: 2, blockType: "movable_green" },
      { r1: 5, c1: 3, blockType: "movable_green" },
    ],
  },

  // ── Stage 9: Four Neutral Black Blocks (Staggered Diagonal Maze) ──
  {
    id: "campaign-9",
    campaignNumber: 9,
    name: "Staggered Maze",
    description: "Diagonally offset obstacles prevent easy rectangular planning across all quadrants.",
    rows: 10,
    cols: 6,
    botDifficulty: 6,
    neutralBlocks: [
      { r1: 1, c1: 2 },
      { r1: 3, c1: 4 },
      { r1: 6, c1: 1 },
      { r1: 8, c1: 3 },
    ],
  },

  // ── Stage 10: Four Neutral Black Blocks (Frontier Border Pinch) ──
  {
    id: "campaign-10",
    campaignNumber: 10,
    name: "Border Gateways",
    description: "Four blocks pinch the midline crossing. Seize the bottlenecks to trap your rival.",
    rows: 10,
    cols: 6,
    botDifficulty: 6,
    neutralBlocks: [
      { r1: 4, c1: 1 },
      { r1: 4, c1: 4 },
      { r1: 5, c1: 1 },
      { r1: 5, c1: 4 },
    ],
  },

  // ── Multi Sub-Board Stages (11–20) ──
  // Each sub-board functions independently with its own territory and midline.
  // Expansions and slides stay inside the block's sub-board.

  // ── Stages 11–13: Two Independent Sub-Boards (Different Sizes) ──
  {
    id: "campaign-11",
    campaignNumber: 11,
    name: "Twin Channels",
    description: "Two independent sub-boards (10×3 & 8×3). Fight across two fronts simultaneously.",
    rows: 10,
    cols: 6,
    botDifficulty: 7,
    subBoards: [
      { id: "sb-1", name: "Left Front", r1: 0, c1: 0, r2: 9, c2: 2 },
      { id: "sb-2", name: "Right Front", r1: 1, c1: 3, r2: 8, c2: 5 },
    ],
  },
  {
    id: "campaign-12",
    campaignNumber: 12,
    name: "Asymmetric Arenas",
    description: "A narrow lane with sliding green blocks runs alongside a wider field.",
    rows: 10,
    cols: 6,
    botDifficulty: 7,
    subBoards: [
      { id: "sb-1", name: "Narrow Gate", r1: 0, c1: 0, r2: 9, c2: 1 },
      { id: "sb-2", name: "Grand Field", r1: 0, c1: 2, r2: 9, c2: 5 },
    ],
    neutralBlocks: [
      { r1: 4, c1: 0, blockType: "movable_green" },
      { r1: 5, c1: 1, blockType: "movable_green" },
    ],
  },
  {
    id: "campaign-13",
    campaignNumber: 13,
    name: "Dual Bastions",
    description: "Two independent arenas (8×3 & 10×3) with neutral barrier blocks in each.",
    rows: 10,
    cols: 6,
    botDifficulty: 7,
    subBoards: [
      { id: "sb-1", name: "West Bastion", r1: 1, c1: 0, r2: 8, c2: 2 },
      { id: "sb-2", name: "East Citadel", r1: 0, c1: 3, r2: 9, c2: 5 },
    ],
    neutralBlocks: [
      { r1: 4, c1: 1 },
      { r1: 5, c1: 4 },
    ],
  },

  // ── Stages 14–17: Three Independent Sub-Boards (Different Sizes) ──
  {
    id: "campaign-14",
    campaignNumber: 14,
    name: "Triple Corridors",
    description: "Three independent lane sub-boards (10×2, 8×2, and 10×2). Manage three battle lines.",
    rows: 10,
    cols: 6,
    botDifficulty: 8,
    subBoards: [
      { id: "sb-1", name: "West Lane", r1: 0, c1: 0, r2: 9, c2: 1 },
      { id: "sb-2", name: "Center Spine", r1: 1, c1: 2, r2: 8, c2: 3 },
      { id: "sb-3", name: "East Lane", r1: 0, c1: 4, r2: 9, c2: 5 },
    ],
  },
  {
    id: "campaign-15",
    campaignNumber: 15,
    name: "The Citadel & Wings",
    description: "Three sub-boards of varying heights (8×2, 10×2, 6×2). Flank the grand central keep.",
    rows: 10,
    cols: 6,
    botDifficulty: 8,
    subBoards: [
      { id: "sb-1", name: "Left Flank", r1: 1, c1: 0, r2: 8, c2: 1 },
      { id: "sb-2", name: "High Keep", r1: 0, c1: 2, r2: 9, c2: 3 },
      { id: "sb-3", name: "Right Flank", r1: 2, c1: 4, r2: 7, c2: 5 },
    ],
  },
  {
    id: "campaign-16",
    campaignNumber: 16,
    name: "Triad Bastion",
    description: "The center has a black obstacle, and green blocks can shift the outer lanes.",
    rows: 10,
    cols: 6,
    botDifficulty: 8,
    subBoards: [
      { id: "sb-1", name: "Outer Left", r1: 0, c1: 0, r2: 9, c2: 1 },
      { id: "sb-2", name: "Center Core", r1: 1, c1: 2, r2: 8, c2: 3 },
      { id: "sb-3", name: "Outer Right", r1: 0, c1: 4, r2: 9, c2: 5 },
    ],
    neutralBlocks: [
      { r1: 4, c1: 2 },
      { r1: 4, c1: 0, blockType: "movable_green" },
      { r1: 5, c1: 5, blockType: "movable_green" },
    ],
  },
  {
    id: "campaign-17",
    campaignNumber: 17,
    name: "Triptych Arena",
    description: "Three staggered sub-boards (6×2, 10×2, and 8×2). Coordinate extrusion across fronts.",
    rows: 10,
    cols: 6,
    botDifficulty: 9,
    subBoards: [
      { id: "sb-1", name: "Court A", r1: 2, c1: 0, r2: 7, c2: 1 },
      { id: "sb-2", name: "Court B", r1: 0, c1: 2, r2: 9, c2: 3 },
      { id: "sb-3", name: "Court C", r1: 1, c1: 4, r2: 8, c2: 5 },
    ],
  },

  // ── Stages 18–20: Four Independent Sub-Boards (Different Sizes) ──
  {
    id: "campaign-18",
    campaignNumber: 18,
    name: "Quad Quadrants",
    description: "Four independent sub-boards in a 2×2 layout (5×3, 4×3, 4×3, 5×3). Multi-arena warfare.",
    rows: 10,
    cols: 6,
    botDifficulty: 9,
    subBoards: [
      { id: "sb-1", name: "North-West", r1: 0, c1: 0, r2: 4, c2: 2 },
      { id: "sb-2", name: "North-East", r1: 0, c1: 3, r2: 3, c2: 5 },
      { id: "sb-3", name: "South-West", r1: 6, c1: 0, r2: 9, c2: 2 },
      { id: "sb-4", name: "South-East", r1: 5, c1: 3, r2: 9, c2: 5 },
    ],
  },
  {
    id: "campaign-19",
    campaignNumber: 19,
    name: "Four Fronts",
    description: "Four asymmetric sub-boards with green sliding blocks in the two larger fronts.",
    rows: 10,
    cols: 6,
    botDifficulty: 9,
    subBoards: [
      { id: "sb-1", name: "Sector Alpha", r1: 0, c1: 0, r2: 3, c2: 1 },
      { id: "sb-2", name: "Sector Beta", r1: 0, c1: 2, r2: 4, c2: 5 },
      { id: "sb-3", name: "Sector Gamma", r1: 5, c1: 0, r2: 9, c2: 3 },
      { id: "sb-4", name: "Sector Delta", r1: 6, c1: 4, r2: 9, c2: 5 },
    ],
    neutralBlocks: [
      { r1: 2, c1: 3, blockType: "movable_green" },
      { r1: 7, c1: 2, blockType: "movable_green" },
    ],
  },
  {
    id: "campaign-20",
    campaignNumber: 20,
    name: "Omega Quad Finale",
    description: "The ultimate four-quadrant battlefield (four 5×3 sub-boards) with neutral core blocks.",
    rows: 10,
    cols: 6,
    botDifficulty: 10,
    subBoards: [
      { id: "sb-1", name: "Quadrant I", r1: 0, c1: 0, r2: 4, c2: 2 },
      { id: "sb-2", name: "Quadrant II", r1: 0, c1: 3, r2: 4, c2: 5 },
      { id: "sb-3", name: "Quadrant III", r1: 5, c1: 0, r2: 9, c2: 2 },
      { id: "sb-4", name: "Quadrant IV", r1: 5, c1: 3, r2: 9, c2: 5 },
    ],
    neutralBlocks: [
      { r1: 2, c1: 1 },
      { r1: 2, c1: 4 },
      { r1: 7, c1: 1 },
      { r1: 7, c1: 4 },
    ],
  },
];
