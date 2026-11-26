import { BoxDefinition, BoxShapeType } from "./box";

/** Definition of a neutral black block placed on the board initially */
export interface NeutralBlockDef {
  r1: number;
  c1: number;
  r2?: number;
  c2?: number;
}

/** Declarative recipe for building a campaign stage — add new entries to extend the campaign. */
export interface CampaignPlacement {
  id: string;
  anchor: { row: number; col: number };
  shape: BoxShapeType;
  extras?: Partial<Pick<BoxDefinition, "rewards" | "powerGrants">>;
}

/** Definition of an independent sub-board on the battlefield */
export interface SubBoardConfig {
  id: string;
  name?: string;
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  neutralBlocks?: NeutralBlockDef[];
}

export interface CampaignBlueprint {
  id: string;
  campaignNumber: number;
  name: string;
  description: string;
  rows: number;
  cols: number;
  botDifficulty: number;
  /** Independent sub-boards with their own territory zones and boundaries */
  subBoards?: SubBoardConfig[];
  /** Neutral black blocks present from the start of the level */
  neutralBlocks?: NeutralBlockDef[];
  /** Multi-cell shapes placed before singles fill the rest. Omit for a classic uniform grid. */
  placements?: CampaignPlacement[];
  defaultTapsPerTurn?: number;
  showResources?: boolean;
  showPowers?: boolean;
  /** Hidden levels stay in the registry but are excluded from the main campaign UI. */
  hidden?: boolean;
}
