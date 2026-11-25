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
    description: "Same 10×6 board — your opponent starts thinking ahead.",
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
    botDifficulty: 3,
  },
  {
    id: "campaign-4",
    campaignNumber: 4,
    name: "Twin Plots",
    description: "Battle across the 10×6 board. Watch out for bot incursions.",
    rows: 10,
    cols: 6,
    botDifficulty: 2,
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
    botDifficulty: 4,
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
    description: "Four pillar blocks break wide horizontal growth, creating three distinct clash corridors.",
    rows: 10,
    cols: 6,
    botDifficulty: 5,
    neutralBlocks: [
      { r1: 2, c1: 1 },
      { r1: 2, c1: 4 },
      { r1: 7, c1: 1 },
      { r1: 7, c1: 4 },
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
    botDifficulty: 7,
    neutralBlocks: [
      { r1: 4, c1: 1 },
      { r1: 4, c1: 4 },
      { r1: 5, c1: 1 },
      { r1: 5, c1: 4 },
    ],
  },

  // ── Advanced Stages (11–20): High Mastery 10×6 Battlefield ──
  {
    id: "campaign-11",
    campaignNumber: 11,
    name: "Diamond Vault",
    description: "Four central diamond obstacles channel the fight into outer corridors.",
    rows: 10,
    cols: 6,
    botDifficulty: 6,
    neutralBlocks: [
      { r1: 2, c1: 2 },
      { r1: 2, c1: 3 },
      { r1: 7, c1: 2 },
      { r1: 7, c1: 3 },
    ],
  },
  {
    id: "campaign-12",
    campaignNumber: 12,
    name: "Outer Squeeze",
    description: "Corner and edge barriers force aggressive center extrusion.",
    rows: 10,
    cols: 6,
    botDifficulty: 7,
    neutralBlocks: [
      { r1: 1, c1: 0 },
      { r1: 3, c1: 5 },
      { r1: 6, c1: 0 },
      { r1: 8, c1: 5 },
    ],
  },
  {
    id: "campaign-13",
    campaignNumber: 13,
    name: "Crossroad Gauntlet",
    description: "Diagonal pinwheel obstacles challenge your block geometry.",
    rows: 10,
    cols: 6,
    botDifficulty: 7,
    neutralBlocks: [
      { r1: 2, c1: 2 },
      { r1: 4, c1: 1 },
      { r1: 5, c1: 4 },
      { r1: 7, c1: 3 },
    ],
  },
  {
    id: "campaign-14",
    campaignNumber: 14,
    name: "Territory Lock",
    description: "Offset corridor blocks. Plan two moves ahead before committing an edge.",
    rows: 10,
    cols: 6,
    botDifficulty: 7,
    neutralBlocks: [
      { r1: 1, c1: 1 },
      { r1: 3, c1: 3 },
      { r1: 6, c1: 2 },
      { r1: 8, c1: 4 },
    ],
  },
  {
    id: "campaign-15",
    campaignNumber: 15,
    name: "Rim Bastion",
    description: "Deep wing blocks protect the borders, forcing a direct clash through the middle.",
    rows: 10,
    cols: 6,
    botDifficulty: 7,
    neutralBlocks: [
      { r1: 2, c1: 1 },
      { r1: 4, c1: 3 },
      { r1: 5, c1: 2 },
      { r1: 7, c1: 4 },
    ],
  },
  {
    id: "campaign-16",
    campaignNumber: 16,
    name: "Checkpoint Maze",
    description: "Four obstacles guarding territory gates. Timing neutral expansions is critical.",
    rows: 10,
    cols: 6,
    botDifficulty: 8,
    neutralBlocks: [
      { r1: 3, c1: 1 },
      { r1: 3, c1: 4 },
      { r1: 6, c1: 1 },
      { r1: 6, c1: 4 },
    ],
  },
  {
    id: "campaign-17",
    campaignNumber: 17,
    name: "Diagonal Spire",
    description: "Challenging diagonal layout forcing precision multi-cell extrusion.",
    rows: 10,
    cols: 6,
    botDifficulty: 8,
    neutralBlocks: [
      { r1: 1, c1: 2 },
      { r1: 3, c1: 1 },
      { r1: 6, c1: 4 },
      { r1: 8, c1: 3 },
    ],
  },
  {
    id: "campaign-18",
    campaignNumber: 18,
    name: "Omega Cross",
    description: "Perimeter and center anchors test your total board vision.",
    rows: 10,
    cols: 6,
    botDifficulty: 9,
    neutralBlocks: [
      { r1: 2, c1: 3 },
      { r1: 4, c1: 0 },
      { r1: 5, c1: 5 },
      { r1: 7, c1: 2 },
    ],
  },
  {
    id: "campaign-19",
    campaignNumber: 19,
    name: "Grand Bastion",
    description: "Wide defensive pillars. The bot anticipates your growth trajectories.",
    rows: 10,
    cols: 6,
    botDifficulty: 9,
    neutralBlocks: [
      { r1: 2, c1: 1 },
      { r1: 2, c1: 4 },
      { r1: 7, c1: 1 },
      { r1: 7, c1: 4 },
    ],
  },
  {
    id: "campaign-20",
    campaignNumber: 20,
    name: "Omega Finale",
    description: "The ultimate 10×6 battlefield. Master neutral block strategy to claim victory.",
    rows: 10,
    cols: 6,
    botDifficulty: 10,
    neutralBlocks: [
      { r1: 3, c1: 2 },
      { r1: 3, c1: 3 },
      { r1: 6, c1: 2 },
      { r1: 6, c1: 3 },
    ],
  },
];
