import { CampaignBlueprint } from "../types/campaignBlueprint";

/**
 * Main campaign stages (1–20) — append new blueprints here to extend the campaign.
 * Bot difficulty and shape layout are declared per stage.
 */
export const CAMPAIGN_BLUEPRINTS: CampaignBlueprint[] = [
  // ── Stage 0: Interactive Tutorial with Clibo ──
  {
    id: "campaign-0",
    campaignNumber: 0,
    name: "Clibo's Training",
    description: "Learn tapping, capturing territory, and freeze rules step-by-step with Clibo!",
    rows: 4,
    cols: 4,
    botDifficulty: 1,
  },

  // ── Classic grid (levels 1–3): 8×6 territorial grid ──
  {
    id: "campaign-1",
    campaignNumber: 1,
    name: "First Steps",
    description: "Learn the basics on an 8×6 grid. The bot makes plenty of mistakes.",
    rows: 8,
    cols: 6,
    botDifficulty: 1,
  },
  {
    id: "campaign-2",
    campaignNumber: 2,
    name: "Warming Up",
    description: "Same 8×6 board — your opponent starts thinking ahead.",
    rows: 8,
    cols: 6,
    botDifficulty: 2,
  },
  {
    id: "campaign-3",
    campaignNumber: 3,
    name: "Grid Master",
    description: "Master the 8×6 grid as the competition heats up.",
    rows: 8,
    cols: 6,
    botDifficulty: 3,
  },

  // ── Stages 4–10: 8×6 territorial grid ──
  {
    id: "campaign-4",
    campaignNumber: 4,
    name: "Twin Plots",
    description: "Battle across the 8×6 board. Watch out for bot incursions.",
    rows: 8,
    cols: 6,
    botDifficulty: 2,
  },
  {
    id: "campaign-5",
    campaignNumber: 5,
    name: "Twin Plots II",
    description: "The bot plays sharper and attacks center territory aggressively.",
    rows: 8,
    cols: 6,
    botDifficulty: 3,
  },
  {
    id: "campaign-6",
    campaignNumber: 6,
    name: "Block Party",
    description: "Deep extrusion warfare. Push into enemy territory to unlock white zones.",
    rows: 8,
    cols: 6,
    botDifficulty: 4,
  },
  {
    id: "campaign-7",
    campaignNumber: 7,
    name: "Corner Cuts",
    description: "Extrude broad blocks along boundaries. The strategist awakens.",
    rows: 8,
    cols: 6,
    botDifficulty: 4,
  },
  {
    id: "campaign-8",
    campaignNumber: 8,
    name: "Mixed Terrain",
    description: "Multiple extrusion fronts across the 8×6 battlefield.",
    rows: 8,
    cols: 6,
    botDifficulty: 5,
  },
  {
    id: "campaign-9",
    campaignNumber: 9,
    name: "Shape Storm",
    description: "Grandmaster bot lookahead across 48 territory cells.",
    rows: 8,
    cols: 6,
    botDifficulty: 6,
  },
  {
    id: "campaign-10",
    campaignNumber: 10,
    name: "Cascade Finale",
    description: "Maximum pressure. Defeat the ultimate bot to conquer the territory.",
    rows: 8,
    cols: 6,
    botDifficulty: 7,
  },

  // ── Post-finale classic grid (11–13): freeze mastery vs smarter bots ──
  {
    id: "campaign-11",
    campaignNumber: 11,
    name: "Freeze Basics",
    description:
      "Classic 5×5 grid. The bot now freezes plots and thinks several moves ahead.",
    rows: 5,
    cols: 5,
    botDifficulty: 6,
  },
  {
    id: "campaign-12",
    campaignNumber: 12,
    name: "Cold Front",
    description:
      "Same classic board — your opponent chains captures into freeze traps.",
    rows: 5,
    cols: 5,
    botDifficulty: 7,
  },
  {
    id: "campaign-13",
    campaignNumber: 13,
    name: "Ice Breaker",
    description:
      "Prove you can out-plan a neural-level bot on the familiar grid.",
    rows: 5,
    cols: 5,
    botDifficulty: 7,
  },

  // ── Wide freeze battlefields (14–17): 7×6 boards, territory gates freeze ──
  {
    id: "campaign-14",
    campaignNumber: 14,
    name: "Territory Lock",
    description:
      "7×6 board with corner forts and a central spine. Capture corridors before you can freeze deep plots.",
    rows: 7,
    cols: 6,
    botDifficulty: 7,
    placements: [
      { id: "fort-nw", anchor: { row: 0, col: 0 }, shape: "square" },
      { id: "fort-ne", anchor: { row: 0, col: 4 }, shape: "square" },
      { id: "gate-n", anchor: { row: 0, col: 2 }, shape: "horizontal" },
      { id: "wall-w", anchor: { row: 2, col: 0 }, shape: "vertical" },
      { id: "wall-e", anchor: { row: 2, col: 5 }, shape: "vertical" },
      { id: "bulwark", anchor: { row: 3, col: 2 }, shape: "l-shape" },
      { id: "spine", anchor: { row: 5, col: 2 }, shape: "horizontal" },
      { id: "keep-s", anchor: { row: 5, col: 0 }, shape: "square" },
    ],
  },
  {
    id: "campaign-15",
    campaignNumber: 15,
    name: "Rim Siege",
    description:
      "Large shapes ring the map. Singles in the middle are easy to contest but hard to freeze without border territory.",
    rows: 7,
    cols: 6,
    botDifficulty: 7,
    placements: [
      { id: "rim-n", anchor: { row: 0, col: 1 }, shape: "horizontal3" },
      { id: "rim-s", anchor: { row: 6, col: 2 }, shape: "horizontal3" },
      { id: "tower-l", anchor: { row: 1, col: 0 }, shape: "vertical" },
      { id: "tower-r", anchor: { row: 1, col: 5 }, shape: "vertical" },
      { id: "citadel", anchor: { row: 2, col: 2 }, shape: "square" },
      { id: "hook-l", anchor: { row: 4, col: 0 }, shape: "l-shape" },
      { id: "hook-r", anchor: { row: 4, col: 4 }, shape: "l-shape" },
      { id: "bridge", anchor: { row: 3, col: 4 }, shape: "zigzag" },
    ],
  },
  {
    id: "campaign-16",
    campaignNumber: 16,
    name: "Checkpoint Maze",
    description:
      "Triple-wide bars and corner hooks create checkpoints. Plan two turns ahead to open freeze lanes.",
    rows: 7,
    cols: 6,
    botDifficulty: 8,
    placements: [
      { id: "bar-top", anchor: { row: 1, col: 1 }, shape: "horizontal3" },
      { id: "bar-mid", anchor: { row: 4, col: 2 }, shape: "horizontal3" },
      { id: "pillar-l", anchor: { row: 0, col: 0 }, shape: "vertical" },
      { id: "pillar-r", anchor: { row: 2, col: 5 }, shape: "vertical" },
      { id: "vault", anchor: { row: 2, col: 2 }, shape: "square" },
      { id: "snag-l", anchor: { row: 5, col: 0 }, shape: "l-shape" },
      { id: "snag-r", anchor: { row: 5, col: 4 }, shape: "l-shape" },
      { id: "zig", anchor: { row: 0, col: 3 }, shape: "zigzag" },
    ],
  },
  {
    id: "campaign-17",
    campaignNumber: 17,
    name: "Frozen Depths",
    description:
      "Four corner blocks and narrow spans — only a few plots touch each territory pocket. Maximum freeze planning.",
    rows: 7,
    cols: 6,
    botDifficulty: 8,
    placements: [
      { id: "quad-a", anchor: { row: 0, col: 0 }, shape: "square" },
      { id: "quad-b", anchor: { row: 0, col: 4 }, shape: "square" },
      { id: "quad-c", anchor: { row: 4, col: 0 }, shape: "square" },
      { id: "quad-d", anchor: { row: 4, col: 4 }, shape: "square" },
      { id: "span-n", anchor: { row: 2, col: 1 }, shape: "horizontal" },
      { id: "span-s", anchor: { row: 4, col: 2 }, shape: "horizontal" },
      { id: "keep", anchor: { row: 2, col: 3 }, shape: "l-shape" },
      { id: "post", anchor: { row: 6, col: 1 }, shape: "horizontal3" },
    ],
  },

  // ── Ultimate classic duel (18) ──
  {
    id: "campaign-18",
    campaignNumber: 18,
    name: "Omega Grid",
    description:
      "Return to the classic 5×5 arena. Face the Grand Strategist — every freeze and capture is calculated.",
    rows: 5,
    cols: 5,
    botDifficulty: 9,
  },

  // ── Grand block finales (19–20): 8×6 mega shapes ──
  {
    id: "campaign-19",
    campaignNumber: 19,
    name: "Grand Blocks",
    description:
      "8×6 battlefield with 3×2 mega plots, 2×2 squares, and L-hooks. Territory lines decide who may freeze what.",
    rows: 8,
    cols: 6,
    botDifficulty: 9,
    placements: [
      { id: "mega-a", anchor: { row: 0, col: 0 }, shape: "block3x2" },
      { id: "mega-b", anchor: { row: 0, col: 3 }, shape: "block3x2" },
      { id: "sq-mid", anchor: { row: 2, col: 1 }, shape: "square" },
      { id: "l-west", anchor: { row: 2, col: 4 }, shape: "l-shape" },
      { id: "triple", anchor: { row: 4, col: 0 }, shape: "horizontal3" },
      { id: "sq-s", anchor: { row: 4, col: 3 }, shape: "square" },
      { id: "l-east", anchor: { row: 6, col: 0 }, shape: "l-shape" },
      { id: "zag", anchor: { row: 6, col: 3 }, shape: "zigzag" },
    ],
  },
  {
    id: "campaign-20",
    campaignNumber: 20,
    name: "Omega Finale",
    description:
      "The final 8×6 war board. Mega blocks, tight chokepoints, and the Omega Mind bot — conquer the campaign.",
    rows: 8,
    cols: 6,
    botDifficulty: 10,
    placements: [
      { id: "wing-l", anchor: { row: 0, col: 0 }, shape: "block3x2" },
      { id: "wing-r", anchor: { row: 0, col: 3 }, shape: "block3x2" },
      { id: "core", anchor: { row: 3, col: 1 }, shape: "square" },
      { id: "spine", anchor: { row: 2, col: 0 }, shape: "vertical" },
      { id: "hook", anchor: { row: 3, col: 4 }, shape: "l-shape" },
      { id: "bar", anchor: { row: 5, col: 1 }, shape: "horizontal3" },
      { id: "fort", anchor: { row: 6, col: 3 }, shape: "square" },
      { id: "zag", anchor: { row: 6, col: 0 }, shape: "zigzag" },
    ],
  },
];
