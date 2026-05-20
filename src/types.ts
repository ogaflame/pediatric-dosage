/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AgeTableRow {
  min: number;
  max: number;
  mg_min?: number;
  mg_max?: number;
  dose_mg?: number;
  day_mg?: number;
  freq?: string;
}

export interface MaxConfig {
  type: "abs_mgday" | "kg_mgday" | "both";
  v?: number; // for abs_mgday or kg_mgday
  kg?: number; // for both
  abs?: number; // for both
}

export interface Indication {
  label: string;
  min: number;
  max: number;
}

export interface Drug {
  id: string;
  name: string;
  conc_mg_per_mL: number;
  round_mL?: number;
  kg_mgkgday?: number;
  kg_mgkgday_range?: { min: number; max: number };
  max?: MaxConfig;
  max_unit?: "mg" | "µg";
  note?: string;
  age_table?: AgeTableRow[];
  per_dose_age_table?: AgeTableRow[];
  inline_per_dose?: boolean;
  indications_day?: Record<string, Indication>;
  per_dose_unified?: { min: number; max: number };
}
