/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Drug } from "./types";

export const DAY_DRUGS: Drug[] = [
  {
    id: "asverin",
    name: "アスベリンシロップ0.5%（5mg/mL）",
    conc_mg_per_mL: 5,
    round_mL: 0.1,
    kg_mgkgday: 1.5,
    note: "体重換算：1.5 mg/kg/日（暫定）",
  },
  {
    id: "carbocisteine",
    name: "カルボシステインシロップ5%（50mg/mL）",
    conc_mg_per_mL: 50,
    round_mL: 0.1,
    kg_mgkgday: 30,
    max: { type: "abs_mgday", v: 1500 },
    note: "体重換算：30 mg/kg/日（上限1500mg/日）",
  },
  {
    id: "ambroxol",
    name: "アンブロキソール塩酸塩シロップ0.3%（3mg/mL）",
    conc_mg_per_mL: 3,
    round_mL: 0.1,
    kg_mgkgday: 0.9,
    max: { type: "abs_mgday", v: 45 },
    note: "体重換算：0.9 mg/kg/日（上限45mg/日）",
  },
  {
    id: "transamin",
    name: "トランサミンシロップ5%（50mg/mL）",
    conc_mg_per_mL: 50,
    round_mL: 0.1,
    age_table: [
      { min: 0, max: 2, mg_min: 75, mg_max: 200 },
      { min: 2, max: 4, mg_min: 150, mg_max: 350 },
      { min: 4, max: 7, mg_min: 250, mg_max: 650 },
      { min: 7, max: 15, mg_min: 400, mg_max: 1000 },
    ],
    max: { type: "abs_mgday", v: 1500 },
    note: "年齢別レンジ（上限1500mg/日）",
  },
  {
    id: "levocetirizine",
    name: "レボセチリジン塩酸塩シロップ0.05%（0.5mg/mL）",
    conc_mg_per_mL: 0.5,
    round_mL: 0.1,
    inline_per_dose: true,
    age_table: [
      { min: 0.5, max: 1, mg_min: 1.25, mg_max: 1.25 },
      { min: 1, max: 7, mg_min: 2.5, mg_max: 2.5 },
      { min: 7, max: 15, mg_min: 5.0, mg_max: 5.0 },
    ],
    per_dose_age_table: [
      { min: 0.5, max: 1, dose_mg: 1.25, day_mg: 1.25, freq: "分1（1日1回）" },
      { min: 1, max: 7, dose_mg: 1.25, day_mg: 2.5, freq: "分2（1日2回）" },
      { min: 7, max: 15, dose_mg: 2.5, day_mg: 5.0, freq: "分2（1日2回）" },
    ],
    note: "同一行で 1日量（上）＋1回量（下・色付き）",
  },
  {
    id: "rinderon",
    name: "リンデロンシロップ0.01%（0.1mg/mL）",
    conc_mg_per_mL: 0.1,
    round_mL: 0.01,
    indications_day: {
      asthma: { label: "気管支喘息", min: 0.1, max: 0.2 },
      urticaria: { label: "蕁麻疹", min: 0.1, max: 0.1 },
    },
    note: "疾患別（同時表示）",
  },
  {
    id: "meptin",
    name: "メプチンシロップ5µg/mL（0.005mg/mL）",
    conc_mg_per_mL: 0.005,
    round_mL: 0.01,
    kg_mgkgday_range: { min: 0.0025, max: 0.00375 },
    max: { type: "abs_mgday", v: 0.1 }, // 0.1 mg/日 = 100 µg/日
    max_unit: "µg",
    note: "体重換算レンジ（上限100µg/日）",
  },
];

export const PER_DOSE_DRUGS: Drug[] = [
  {
    id: "calonal",
    name: "カロナールシロップ2%（20mg/mL）",
    conc_mg_per_mL: 20,
    round_mL: 0.1,
    per_dose_unified: { min: 10, max: 15 }, // mg/kg/回
    max: { type: "both", kg: 60, abs: 1500 },
    note: "1回量（mg/kg/回）。日量上限は参考。",
  },
];
