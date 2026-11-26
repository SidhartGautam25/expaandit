import { BoxDefinition } from "./box";
import { NeutralBlockDef, SubBoardConfig } from "./campaignBlueprint";

export interface CampaignLevel {
  id: string;
  /** 1-based stage number in the main campaign (0 = legacy/hidden) */
  campaignNumber: number;
  name: string;
  description: string;
  rows: number;
  cols: number;
  boxes: BoxDefinition[];
  /** Independent sub-boards with their own territory zones and boundaries */
  subBoards?: SubBoardConfig[];
  /** Neutral black blocks present from the start of the level */
  neutralBlocks?: NeutralBlockDef[];
  defaultTapsPerTurn: number;
  botDifficulty: number;
  /** Always show resource bar (even at 0) */
  showResources?: boolean;
  /** Always show power bar hint */
  showPowers?: boolean;
  /** Excluded from main campaign UI (treasure/power legacy levels) */
  hidden?: boolean;
}
