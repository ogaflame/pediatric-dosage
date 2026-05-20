/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgeTableRow, MaxConfig } from "../types";

export function roundTo(x: number | null | undefined, unit: number | undefined): number | null {
  if (x === null || x === undefined || isNaN(x)) return null;
  if (!unit || unit <= 0) return x;
  return Math.round(x / unit) * unit;
}

export function fmt(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const s = n.toFixed(digits);
  return s.replace(/\.?0+$/, "");
}

export function nearlyEqual(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) <= eps;
}

export function pickAgeRow(age: number | null | undefined, table: AgeTableRow[] | undefined): AgeTableRow | null {
  if (age === null || age === undefined || isNaN(age)) return null;
  if (!table) return null;
  return table.find((r) => age >= r.min && age < r.max) ?? null;
}

export function getMaxMgDay(max: MaxConfig | undefined, wt: number): number | null {
  if (!max) return null;
  if (max.type === "abs_mgday") return max.v ?? null;
  if (max.type === "kg_mgday") return (max.v ?? null) ? wt * max.v : null;
  if (max.type === "both") {
    const kgCap = (max.kg ?? null) ? wt * max.kg : null;
    const absCap = max.abs ?? null;
    if (kgCap === null) return absCap;
    if (absCap === null) return kgCap;
    return Math.min(kgCap, absCap);
  }
  return null;
}
