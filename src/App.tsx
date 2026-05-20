/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, ReactNode, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Printer, 
  Trash2, 
  Settings, 
  ChevronDown, 
  Info, 
  AlertCircle, 
  Table as TableIcon,
  Copy,
  X,
  Upload,
  Download,
  RefreshCw,
  FileCode
} from "lucide-react";
import { DAY_DRUGS, PER_DOSE_DRUGS } from "./constants";
import { 
  roundTo, 
  fmt, 
  nearlyEqual, 
  pickAgeRow, 
  getMaxMgDay 
} from "./lib/calc";
import { Drug } from "./types";

export default function App() {
  const [weight, setWeight] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingDrugId, setEditingDrugId] = useState<string | null>(null);
  
  // For Editing Drug Inline
  const [editForm, setEditForm] = useState<Partial<Drug>>({});

  const handleStartEdit = (d: Drug) => {
    setEditingDrugId(d.id);
    setEditForm({ ...d });
  };

  const handleSaveEdit = (isDayType: boolean) => {
    if (!editForm.id || !editForm.name || !editForm.conc_mg_per_mL) {
      alert("薬剤名と濃度を入力してください");
      return;
    }
    const updated = {
      ...editForm,
      conc_mg_per_mL: Number(editForm.conc_mg_per_mL),
      round_mL: Number(editForm.round_mL) || 0.1,
      kg_mgkgday: editForm.kg_mgkgday !== undefined ? Number(editForm.kg_mgkgday) : undefined,
    } as Drug;

    if (isDayType) {
      saveDrugs(dayDrugs.map(d => d.id === editForm.id ? updated : d), perDoseDrugs);
    } else {
      saveDrugs(dayDrugs, perDoseDrugs.map(d => d.id === editForm.id ? updated : d));
    }
    setEditingDrugId(null);
    setEditForm({});
  };

  // Custom Configuration Import state
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const handleImportJson = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.dayDrugs || !parsed.perDoseDrugs || !Array.isArray(parsed.dayDrugs) || !Array.isArray(parsed.perDoseDrugs)) {
        throw new Error("JSONのフォーマットが正しくありません。(dayDrugs と perDoseDrugs の配列が必要です)");
      }
      saveDrugs(parsed.dayDrugs, parsed.perDoseDrugs);
      setImportError(null);
      setImportText("");
      alert("設定を正常に取り込みました！");
    } catch (err: any) {
      setImportError(err?.message || "JSONの構文または構造キーにエラーがあります");
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleImportJson(text);
    };
    reader.readAsText(file);
  };

  const handleDownloadJson = () => {
    const payload = { dayDrugs, perDoseDrugs };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pediatric_syrup_config_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  // New Drug Form State
  const [newDrug, setNewDrug] = useState<Partial<Drug>>({
    name: "",
    conc_mg_per_mL: 0,
    round_mL: 0.1,
    kg_mgkgday: 0,
  });

  // Drug State Management
  const [dayDrugs, setDayDrugs] = useState<Drug[]>(() => {
    const saved = localStorage.getItem(" syrup_day_drugs");
    return saved ? JSON.parse(saved) : DAY_DRUGS;
  });
  const [perDoseDrugs, setPerDoseDrugs] = useState<Drug[]>(() => {
    const saved = localStorage.getItem(" syrup_per_dose_drugs");
    return saved ? JSON.parse(saved) : PER_DOSE_DRUGS;
  });

  const saveDrugs = (newDay: Drug[], newPerDose: Drug[]) => {
    setDayDrugs(newDay);
    setPerDoseDrugs(newPerDose);
    localStorage.setItem(" syrup_day_drugs", JSON.stringify(newDay));
    localStorage.setItem(" syrup_per_dose_drugs", JSON.stringify(newPerDose));
  };

  const handleAddDrug = (type: "day" | "perDose") => {
    if (!newDrug.name || !newDrug.conc_mg_per_mL) {
      alert("薬剤名と濃度を入力してください");
      return;
    }

    const drug: Drug = {
      id: `custom_${Date.now()}`,
      name: newDrug.name,
      conc_mg_per_mL: Number(newDrug.conc_mg_per_mL),
      round_mL: Number(newDrug.round_mL) || 0.1,
      ...(type === "day" 
        ? { kg_mgkgday: Number(newDrug.kg_mgkgday) } 
        : { per_dose_unified: { min: Number(newDrug.kg_mgkgday), max: Number(newDrug.kg_mgkgday) } }
      ),
      note: "ユーザー追加データ",
    };

    if (type === "day") {
      saveDrugs([...dayDrugs, drug], perDoseDrugs);
    } else {
      saveDrugs(dayDrugs, [...perDoseDrugs, drug]);
    }

    setNewDrug({ name: "", conc_mg_per_mL: 0, round_mL: 0.1, kg_mgkgday: 0 });
    alert("追加しました");
  };

  const handleResetMaster = () => {
    if (confirm("薬剤データを初期状態にリセットしますか？")) {
      saveDrugs(DAY_DRUGS, PER_DOSE_DRUGS);
    }
  };

  const handleDeleteDrug = (id: string, isDayType: boolean) => {
    if (confirm("この薬剤を削除してもよろしいですか？")) {
      if (isDayType) {
        saveDrugs(dayDrugs.filter(d => d.id !== id), perDoseDrugs);
      } else {
        saveDrugs(dayDrugs, perDoseDrugs.filter(d => d.id !== id));
      }
    }
  };

  const wtNum = parseFloat(weight);
  const ageNum = parseFloat(age);

  const handleClear = () => {
    setWeight("");
    setAge("");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyJson = async () => {
    const payload = { dayDrugs, perDoseDrugs };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen p-2 md:p-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-12 gap-4 md:gap-6 no-print">
        <div className="flex items-center gap-4">
          <div className="bg-brand text-white p-3 rounded-2xl shadow-xl shadow-slate-200">
            <TableIcon size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-brand">シロップ計算表</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-8 h-[1px] bg-accent/30 lowercase"></span>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Pharmacology Calculator</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleClear}
            className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-red-600 hover:border-red-100 hover:bg-red-50 transition-all text-xs font-bold uppercase tracking-wider"
          >
            <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
            Clear
          </button>
          <button 
            onClick={handlePrint}
            className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-accent hover:border-accent/20 hover:bg-accent/5 transition-all text-xs font-bold uppercase tracking-wider"
          >
            <Printer size={14} className="group-hover:-translate-y-0.5 transition-transform" />
            Print
          </button>
          <button 
            onClick={() => setShowAdmin(!showAdmin)}
            className={`group flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider ${
              showAdmin 
                ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-300" 
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Settings size={14} className={showAdmin ? "animate-spin-slow" : "group-hover:rotate-45 transition-transform"} />
            Master
          </button>
        </div>
      </header>

      {/* Input Section - Refined Glassmorphism Control Panel */}
      <section className="sticky top-2 md:top-6 z-20 mb-8 md:mb-12 no-print">
        <div className="glass px-4 py-5 md:px-8 md:py-7 rounded-2xl md:rounded-[2rem] flex flex-wrap items-center gap-6 md:gap-12">
          <div className="flex flex-wrap items-center gap-6 md:gap-10">
            <div className="flex flex-col gap-2 md:gap-3 min-w-[160px] md:min-w-[200px]">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-slate-500">体重 (Patient Weight)</label>
                <span className="text-[9px] font-bold text-accent bg-accent/5 px-1.5 py-0.5 rounded italic">必須</span>
              </div>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="relative group shrink-0">
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="0.0"
                    className="w-24 md:w-32 px-3 py-2 md:px-4 md:py-3 bg-slate-50/50 border border-slate-200/50 rounded-xl md:rounded-2xl text-lg md:text-xl font-display font-bold text-brand focus:bg-white focus:ring-4 focus:ring-accent/10 focus:border-accent/30 transition-all outline-none placeholder:text-slate-200"
                  />
                  <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-slate-300 font-display font-medium text-[10px] md:text-xs">kg</div>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="60"
                  step="0.5"
                  value={weight || 0}
                  onChange={(e) => setWeight(e.target.value)}
                  className="custom-slider flex-1"
                />
              </div>
            </div>

            <div className="w-[1px] h-12 bg-slate-200/50 hidden lg:block"></div>

            <div className="flex flex-col gap-2 md:gap-3 min-w-[160px] md:min-w-[200px]">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-slate-500">年齢 (Patient Age)</label>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded italic">任意</span>
              </div>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="relative group shrink-0">
                  <input 
                    type="number" 
                    step="1" 
                    min="0"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="0"
                    className="w-20 md:w-28 px-3 py-2 md:px-4 md:py-3 bg-slate-50/50 border border-slate-200/50 rounded-xl md:rounded-2xl text-lg md:text-xl font-display font-bold text-brand focus:bg-white focus:ring-4 focus:ring-accent/10 focus:border-accent/30 transition-all outline-none placeholder:text-slate-200"
                  />
                  <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-slate-300 font-display font-medium text-[10px] md:text-xs">歳</div>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={age || 0}
                  onChange={(e) => setAge(e.target.value)}
                  className="custom-slider flex-1"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[40px] flex items-center">
            <AnimatePresence>
              {!wtNum && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 text-slate-500 bg-slate-100/50 px-4 py-2 rounded-full border border-slate-200/30"
                >
                  <AlertCircle size={16} className="text-amber-500" />
                  <span className="text-xs font-bold tracking-wide">体重を入力すると自動計算を開始します</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Admin Panel */}
      <AnimatePresence>
        {showAdmin && (
          <motion.section 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-8 overflow-hidden no-print"
          >
            <div className="bg-neutral-900 text-neutral-300 p-6 md:p-8 rounded-2xl shadow-2xl relative">
              <button 
                onClick={() => setShowAdmin(false)}
                className="absolute top-4 right-4 p-2 hover:bg-neutral-800 rounded-full transition-colors"
                title="閉じる"
              >
                <X size={20} />
              </button>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <Settings size={20} className="text-brand animate-spin-slow" />
                    薬剤マスター設定（ローカル管理）
                  </h2>
                  <p className="text-xs text-neutral-500">
                    計算ロジックや薬剤名・濃度をローカルブラウザ上で変更・カスタマイズできます。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={handleResetMaster}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-red-900/40 text-neutral-400 hover:text-red-400 rounded-lg text-xs font-semibold transition-all border border-neutral-700"
                  >
                    <RefreshCw size={12} />
                    標準設定にリセット
                  </button>
                  <button 
                    onClick={handleDownloadJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold transition-all border border-neutral-700"
                  >
                    <Download size={12} />
                    設定ファイル(.json)を保存
                  </button>
                  <button 
                    onClick={handleCopyJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand/80 text-white rounded-lg text-xs font-semibold transition-all shadow-lg shadow-brand/20"
                  >
                    <Copy size={12} />
                    {copied ? "コピー完了" : "JSON設定をコピー"}
                  </button>
                </div>
              </div>

              {/* Local Storage Alert Explanation */}
              <div className="mb-6 p-4 bg-blue-950/40 border border-blue-900/50 rounded-xl leading-relaxed text-xs text-blue-200">
                <div className="flex gap-2.5 items-start">
                  <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">💡 データの保存形式と組織内での共有について（プランA方式）</span>
                    <p className="mt-1 text-blue-300/90">
                      ここでの設定変更は、他者の画面や公開サーバーのコードには影響せず、<span className="font-bold text-white text-underline">あなたがお使いのブラウザ（ローカル）にのみ確実に保存</span>されます。
                    </p>
                    <p className="mt-1 text-blue-300/90">
                      そのため、第三者が不正に計算基準を上書きする心配がなく、安全でプライバシーにも守られています。
                      他のスタッフのPCと設定を完全に統一したい場合は、右上から<span className="font-semibold text-white">「設定ファイルを保存」</span>して配布し、もう一方のPCで下記の<span className="font-semibold text-white">「設定ファイル読み込み」</span>を行うことで簡単に統一（同期）可能です。
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Add Drug Form */}
                <div className="bg-neutral-800/40 p-5 rounded-xl border border-neutral-700/60">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-neutral-700/50 pb-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                    新規薬剤データの追加
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div className="space-y-1.5 lg:col-span-2">
                       <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">薬剤名</label>
                       <input 
                         className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand outline-none transition-all"
                         placeholder="例: アスベリンシロップ"
                         value={newDrug.name}
                         onChange={e => setNewDrug({...newDrug, name: e.target.value})}
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">濃度(mg/mL)</label>
                       <input 
                         type="number"
                         step="0.001"
                         className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand outline-none transition-all"
                         placeholder="例: 5"
                         value={newDrug.conc_mg_per_mL || ""}
                         onChange={e => setNewDrug({...newDrug, conc_mg_per_mL: e.target.value})}
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">投与基準量(mg/kg)</label>
                       <input 
                         type="number"
                         step="0.1"
                         className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand outline-none transition-all"
                         placeholder="例: 1.5"
                         value={newDrug.kg_mgkgday || ""}
                         onChange={e => setNewDrug({...newDrug, kg_mgkgday: e.target.value})}
                       />
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => handleAddDrug("day")}
                         className="flex-1 bg-brand hover:bg-brand/95 text-white text-[10px] font-bold py-2 px-3 rounded-lg transition-all h-[38px] active:scale-95"
                       >
                         1日量に追加
                       </button>
                       <button 
                         onClick={() => handleAddDrug("perDose")}
                         className="flex-1 bg-orange-600 hover:bg-orange-550 text-white text-[10px] font-bold py-2 px-3 rounded-lg transition-all h-[38px] active:scale-95"
                       >
                         1回量に追加
                       </button>
                    </div>
                  </div>
                </div>

                {/* 1日量 Drugs Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand"></div> 1日量テーブルの管理
                    </h3>
                    <p className="text-[10px] text-neutral-500 italic">※ 各項目をインライン編集可能です</p>
                  </div>
                  <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700/60 overflow-x-auto">
                    <table className="w-full text-xs text-left min-w-[650px]">
                      <thead className="bg-neutral-950 text-neutral-400">
                        <tr>
                          <th className="p-3 w-[45%]">薬剤名</th>
                          <th className="p-3 text-right w-[15%]">濃度 (mg/mL)</th>
                          <th className="p-3 text-right w-[10%]">丸め単位 (mL)</th>
                          <th className="p-3 w-[15%]">投与基準</th>
                          <th className="p-3 text-center w-[15%]">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-700">
                        {dayDrugs.map(d => {
                          const isEditing = editingDrugId === d.id;
                          const isCustomObj = DAY_DRUGS.every(orig => orig.id !== d.id);
                          const originalVersion = DAY_DRUGS.find(orig => orig.id === d.id);
                          const isModifiedObj = originalVersion && JSON.stringify(originalVersion) !== JSON.stringify(d);

                          return isEditing ? (
                            <tr key={d.id} className="bg-neutral-850 border-y-2 border-brand/55">
                              <td className="p-3">
                                <input
                                  type="text"
                                  className="w-full bg-neutral-950 text-white rounded border border-neutral-700 px-2.5 py-1.5 text-xs outline-none focus:border-brand"
                                  value={editForm.name || ""}
                                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                />
                              </td>
                              <td className="p-3 text-right">
                                <input
                                  type="number"
                                  step="0.001"
                                  className="w-20 bg-neutral-950 text-white text-right rounded border border-neutral-700 px-2 py-1.5 text-xs outline-none focus:border-brand ml-auto"
                                  value={editForm.conc_mg_per_mL !== undefined ? editForm.conc_mg_per_mL : ""}
                                  onChange={e => setEditForm({ ...editForm, conc_mg_per_mL: e.target.value !== "" ? Number(e.target.value) : undefined })}
                                />
                              </td>
                              <td className="p-3 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-16 bg-neutral-950 text-white text-right rounded border border-neutral-700 px-2 py-1.5 text-xs outline-none focus:border-brand ml-auto"
                                  value={editForm.round_mL !== undefined ? editForm.round_mL : ""}
                                  onChange={e => setEditForm({ ...editForm, round_mL: e.target.value !== "" ? Number(e.target.value) : undefined })}
                                />
                              </td>
                              <td className="p-3">
                                {editForm.kg_mgkgday !== undefined ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      step="0.1"
                                      className="w-16 bg-neutral-950 text-white text-right rounded border border-neutral-700 px-2 py-1 text-xs outline-none focus:border-brand"
                                      value={editForm.kg_mgkgday}
                                      onChange={e => setEditForm({ ...editForm, kg_mgkgday: e.target.value !== "" ? Number(e.target.value) : undefined })}
                                    />
                                    <span className="text-[10px] text-neutral-400">mg/kg</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-500 italic">
                                    {d.age_table ? "年齢別/疾患別設定" : "固定算出"}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => handleSaveEdit(true)}
                                  className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold rounded transition-all active:scale-95"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={() => { setEditingDrugId(null); setEditForm({}); }}
                                  className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 text-[10px] font-bold rounded transition-all"
                                >
                                  閉じる
                                </button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={d.id} className="hover:bg-neutral-700/30 transition-colors group">
                              <td className="p-3 font-medium text-white flex items-center flex-wrap gap-2">
                                <span>{d.name}</span>
                                {isCustomObj && (
                                  <span className="text-[8px] tracking-widest leading-0 bg-brand/20 text-brand px-1.5 py-0.5 rounded font-bold">追加分</span>
                                )}
                                {isModifiedObj && (
                                  <span className="text-[8px] tracking-widest leading-0 bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-bold">変更あり</span>
                                )}
                                {!isCustomObj && !isModifiedObj && (
                                  <span className="text-[8px] tracking-widest leading-0 bg-neutral-950/50 text-neutral-500 px-1.5 py-0.5 rounded font-bold">標準基準</span>
                                )}
                              </td>
                              <td className="p-3 text-right font-mono text-neutral-400">{d.conc_mg_per_mL}</td>
                              <td className="p-3 text-right font-mono text-neutral-400">{d.round_mL || "0.1"}</td>
                              <td className="p-3 text-neutral-400">
                                <span className="text-[10px] bg-neutral-900/60 px-2 py-0.5 rounded text-neutral-400 border border-neutral-750">
                                  {d.kg_mgkgday ? `${d.kg_mgkgday} mg/kg` : d.age_table ? "対応年齢テーブル" : d.indications_day ? "疾患区分テーブル" : "特殊テーブル"}
                                </span>
                              </td>
                              <td className="p-3 text-center space-x-1 whitespace-nowrap">
                                <button 
                                  onClick={() => handleStartEdit(d)}
                                  className="px-2 py-1 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors text-[10px] rounded font-semibold border border-neutral-700/50"
                                >
                                  編集
                                </button>
                                <button 
                                  onClick={() => handleDeleteDrug(d.id, true)}
                                  className="p-1 text-neutral-500 hover:text-red-400 transition-colors inline-flex align-middle"
                                  title="削除"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 1回量 Drugs Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div> 1回量（頓用）テーブルの管理
                    </h3>
                  </div>
                  <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700/60 overflow-x-auto">
                    <table className="w-full text-xs text-left min-w-[650px]">
                      <thead className="bg-neutral-950 text-neutral-400">
                        <tr>
                          <th className="p-3 w-[50%]">薬剤名</th>
                          <th className="p-3 text-right w-[20%]">濃度 (mg/mL)</th>
                          <th className="p-3 w-[15%]">基準範囲 (mg/kg/回)</th>
                          <th className="p-3 text-center w-[15%]">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-700">
                        {perDoseDrugs.map(d => {
                          const isEditing = editingDrugId === d.id;
                          const isCustomObj = PER_DOSE_DRUGS.every(orig => orig.id !== d.id);
                          const originalVersion = PER_DOSE_DRUGS.find(orig => orig.id === d.id);
                          const isModifiedObj = originalVersion && JSON.stringify(originalVersion) !== JSON.stringify(d);

                          return isEditing ? (
                            <tr key={d.id} className="bg-neutral-850 border-y-2 border-orange-550">
                              <td className="p-3">
                                <input
                                  type="text"
                                  className="w-full bg-neutral-950 text-white rounded border border-neutral-700 px-2.5 py-1.5 text-xs outline-none focus:border-brand"
                                  value={editForm.name || ""}
                                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                />
                              </td>
                              <td className="p-3 text-right">
                                <input
                                  type="number"
                                  step="0.001"
                                  className="w-20 bg-neutral-950 text-white text-right rounded border border-neutral-700 px-2 py-1.5 text-xs outline-none focus:border-brand ml-auto"
                                  value={editForm.conc_mg_per_mL !== undefined ? editForm.conc_mg_per_mL : ""}
                                  onChange={e => setEditForm({ ...editForm, conc_mg_per_mL: e.target.value !== "" ? Number(e.target.value) : undefined })}
                                />
                              </td>
                              <td className="p-3 text-neutral-400 font-mono text-[10px]">
                                {d.per_dose_unified ? `${d.per_dose_unified.min}~${d.per_dose_unified.max} mg/kg` : "特殊基準"}
                              </td>
                              <td className="p-3 text-center space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => handleSaveEdit(false)}
                                  className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold rounded transition-all active:scale-95"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={() => { setEditingDrugId(null); setEditForm({}); }}
                                  className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 text-[10px] font-bold rounded transition-all"
                                >
                                  閉じる
                                </button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={d.id} className="hover:bg-neutral-700/30 transition-colors group">
                              <td className="p-3 font-medium text-white flex items-center flex-wrap gap-2">
                                <span>{d.name}</span>
                                {isCustomObj && (
                                  <span className="text-[8px] tracking-widest leading-0 bg-brand/20 text-brand px-1.5 py-0.5 rounded font-bold">追加分</span>
                                )}
                                {isModifiedObj && (
                                  <span className="text-[8px] tracking-widest leading-0 bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-bold">変更あり</span>
                                )}
                                {!isCustomObj && !isModifiedObj && (
                                  <span className="text-[8px] tracking-widest leading-0 bg-neutral-950/50 text-neutral-500 px-1.5 py-0.5 rounded font-bold">標準基準</span>
                                )}
                              </td>
                              <td className="p-3 text-right font-mono text-neutral-400">{d.conc_mg_per_mL}</td>
                              <td className="p-3 text-neutral-400">
                                <span className="text-[10px] bg-neutral-900/60 px-2 py-0.5 rounded text-neutral-400 border border-neutral-750">
                                  {d.per_dose_unified ? `${d.per_dose_unified.min}~${d.per_dose_unified.max} mg/kg/回` : "特殊テーブル"}
                                </span>
                              </td>
                              <td className="p-3 text-center space-x-1 whitespace-nowrap border-l border-neutral-800">
                                <button 
                                  onClick={() => handleStartEdit(d)}
                                  className="px-2 py-1 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors text-[10px] rounded font-semibold border border-neutral-700/50"
                                >
                                  編集
                                </button>
                                <button 
                                  onClick={() => handleDeleteDrug(d.id, false)}
                                  className="p-1 text-neutral-500 hover:text-red-400 transition-colors inline-flex align-middle"
                                  title="削除"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Import / Advanced Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-neutral-950/50 p-6 rounded-xl border border-neutral-800">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                      <Upload size={14} className="text-brand" />
                      設定内容ファイル(.json)の取り込み
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      組織で作成した共有JSON設定ファイル（ペーストまたはアップロード）をこのブラウザの設定に適用します。
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">ファイルアップロード方式</label>
                        <input 
                          type="file" 
                          accept=".json"
                          onChange={handleFileUpload}
                          className="w-full text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-neutral-850 file:text-white hover:file:bg-neutral-800 file:cursor-pointer bg-neutral-900/50 rounded-lg p-2 border border-neutral-800"
                        />
                      </div>
                      <div className="pt-2">
                        <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">テキスト貼り付け方式</label>
                        <textarea
                          rows={3}
                          value={importText}
                          onChange={e => setImportText(e.target.value)}
                          placeholder='{ "dayDrugs": [...], "perDoseDrugs": [...] } の形式でJSONを貼り付けてください'
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-xs text-white placeholder:text-neutral-600 outline-none focus:border-neutral-700 font-mono"
                        />
                      </div>
                      {importError && (
                        <p className="text-[10px] text-red-400 bg-red-950/20 px-3 py-2 rounded-lg border border-red-900/40 font-mono leading-normal">
                          ⚠️ エラー: {importError}
                        </p>
                      )}
                      {importText.trim() && (
                        <button
                          onClick={() => handleImportJson(importText)}
                          className="w-full py-2 bg-brand/35 hover:bg-brand text-xs font-bold text-white rounded-lg transition-all border border-brand/50"
                        >
                          貼り付けたJSON設定を反映する
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-neutral-850 pt-5 lg:pt-0 lg:pl-6 space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5 mb-2">
                        <FileCode size={14} className="text-neutral-400" />
                        現在の設定状況（デバッグ/構造確認）
                      </h4>
                      <p className="text-xs text-neutral-500 leading-normal mb-3">
                        現在このブラウザ上でキャッシュされているJSONパラメータ全体です。
                      </p>
                    </div>
                    <pre className="text-[9px] font-mono overflow-auto max-h-48 custom-scrollbar bg-neutral-900/80 p-4 rounded-lg text-neutral-400 border border-neutral-800/80 text-left">
                      {JSON.stringify({ dayDrugs, perDoseDrugs }, null, 2)}
                    </pre>
                  </div>
                </div>

              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Results Section */}
      <section className="space-y-12 print:space-y-10">
        {/* Daily Dose Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-end justify-between mb-4 md:mb-6 px-1">
            <h2 className="text-base md:text-xl font-display font-bold text-slate-900 border-l-4 border-accent pl-3 md:pl-4">
              1日量 <span className="text-[10px] md:text-sm font-medium text-slate-400 ml-2 italic">Daily Dosage (mg/day, mL/day)</span>
            </h2>
            <div className="text-[9px] md:text-[10px] font-bold text-slate-300 uppercase tracking-widest hidden sm:block">Clinical scale</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl shadow-sm overflow-hidden overflow-x-auto print:border-none print:shadow-none">
            <table className="w-full text-xs md:text-sm text-left border-collapse min-w-[800px] md:min-w-[900px] print:min-w-0">
              <thead className="bg-slate-50/80 text-slate-400 border-b border-slate-100">
                <tr className="divide-x divide-slate-100/50">
                  <th className="p-2 md:p-4 font-bold text-[9px] md:text-[10px] uppercase tracking-widest w-[28%]">薬剤 <span className="italic font-medium opacity-50 block mt-1">Drug Name</span></th>
                  <th className="p-2 md:p-4 font-bold text-[9px] md:text-[10px] uppercase tracking-widest w-[16%] text-right">mL/日 <span className="italic font-medium opacity-50 block mt-1 text-right">Volume (mL)</span></th>
                  <th className="p-2 md:p-4 font-bold text-[9px] md:text-[10px] uppercase tracking-widest w-[16%] text-right">計算前mg/日 <span className="italic font-medium opacity-50 block mt-1 text-right">Raw (mg)</span></th>
                  <th className="p-2 md:p-4 font-bold text-[9px] md:text-[10px] uppercase tracking-widest w-[16%] text-right">上限 <span className="italic font-medium opacity-50 block mt-1 text-right">Threshold</span></th>
                  <th className="p-2 md:p-4 font-bold text-[9px] md:text-[10px] uppercase tracking-widest w-[16%] text-right text-brand">適用後mg/日 <span className="italic font-medium opacity-50 block mt-1 text-right">Target (mg)</span></th>
                  <th className="p-2 md:p-4 font-bold text-[9px] md:text-[10px] uppercase tracking-widest w-[8%] text-right">方式 <span className="italic font-medium opacity-50 block mt-1 text-right">Method</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!wtNum ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-400">
                        <TableIcon size={48} className="opacity-20" />
                        <p className="font-sans font-bold text-base tracking-wide">患者の体重データが入力されていません</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  dayDrugs.map((d, idx) => {
                    // ... (calculation logic remains the same, just UI changes)
                    const maxMgDay = getMaxMgDay(d.max, wtNum);
                    
                    let modeLabel = "—";
                    let mLDisp: ReactNode = "—";
                    let rawDisp: ReactNode = "—";
                    let capDisp: ReactNode = "—";
                    let appliedDisp: ReactNode = "—";
                    let isCapped = false;

                    // Levocetirizine
                    if (d.inline_per_dose && d.age_table && d.per_dose_age_table) {
                      modeLabel = "Age";
                      const rowDay = pickAgeRow(ageNum, d.age_table);
                      const rowDose = pickAgeRow(ageNum, d.per_dose_age_table);

                      if (!rowDay || !rowDose) {
                        const msg = isNaN(ageNum) ? "年齢を入力してください" : "対象年齢外";
                        mLDisp = rawDisp = capDisp = appliedDisp = <span className="text-slate-300 italic text-[10px] font-bold">{msg}</span>;
                      } else {
                        const dayMg = rowDay.mg_max!;
                        const dayML = roundTo(dayMg / d.conc_mg_per_mL, d.round_mL || 0.1);
                        const doseMg = rowDose.dose_mg!;
                        const doseML = roundTo(doseMg / d.conc_mg_per_mL, d.round_mL || 0.1);

                        mLDisp = (
                          <div className="space-y-2">
                            <div className="font-display font-bold text-slate-800 text-lg tracking-tight">{fmt(dayML, 2)}</div>
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded shadow-sm bg-orange-50 text-[10px] font-black text-orange-600 border border-orange-100/50 uppercase tracking-widest">{fmt(doseML, 2)} mL/回</div>
                          </div>
                        );
                        rawDisp = (
                          <div className="space-y-2 text-slate-400">
                            <div className="font-display font-medium text-sm tracking-tight">{fmt(dayMg, 2)}</div>
                            <div className="text-[9px] font-black uppercase opacity-60 font-display">{fmt(doseMg, 2)} mg/回</div>
                          </div>
                        );
                        capDisp = (
                          <div className="space-y-1">
                            <div className="font-display text-xs font-medium tracking-tight">&le;{fmt(dayMg, 2)}</div>
                            <div className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{rowDose.freq}</div>
                          </div>
                        );
                        appliedDisp = rawDisp;
                      }
                    } 
                    // Rinderon
                    else if (d.indications_day) {
                      modeLabel = "Ind.";
                      const mLLines: ReactNode[] = [];
                      const mgLines: ReactNode[] = [];
                      const inds = d.indications_day;
                      Object.keys(inds).forEach((key) => {
                        const ind = inds[key];
                        const mgMin = wtNum * ind.min;
                        const mgMax = wtNum * ind.max;
                        const mLMin = roundTo(mgMin / d.conc_mg_per_mL, d.round_mL || 0.1);
                        const mLMax = roundTo(mgMax / d.conc_mg_per_mL, d.round_mL || 0.1);

                        mLLines.push(
                          <div key={`${d.id}-${key}`} className="group/line flex items-baseline justify-between gap-1 border-b border-slate-50 last:border-0 py-1.5 transition-colors hover:bg-slate-50/50">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter shrink-0">{ind.label}</span>
                            <span className="font-display font-bold text-slate-700 tracking-tight">{mLMin === mLMax ? fmt(mLMax, 2) : <><span className="opacity-50">{fmt(mLMin, 2)}</span><span className="mx-1 opacity-20 text-[9px]">-</span>{fmt(mLMax, 2)}</>}</span>
                          </div>
                        );
                        mgLines.push(
                          <div key={`${d.id}-${key}-mg`} className="flex items-baseline justify-between gap-1 border-b border-slate-50 last:border-0 py-1.5">
                            <span className="text-[9px] font-black uppercase text-slate-300 tracking-tighter shrink-0">{ind.label}</span>
                            <span className="font-display font-medium text-slate-400 text-xs tracking-tight">{mgMin === mgMax ? fmt(mgMax, 2) : `${fmt(mgMin, 2)}~${fmt(mgMax, 2)}`}</span>
                          </div>
                        );
                      });
                      mLDisp = <div className="space-y-0.5">{mLLines}</div>;
                      rawDisp = <div className="space-y-0.5">{mgLines}</div>;
                      appliedDisp = <span className="text-slate-200">—</span>;
                      capDisp = <span className="text-slate-200">—</span>;
                    }
                    // weight based
                    else if (d.kg_mgkgday !== undefined || d.kg_mgkgday_range) {
                      modeLabel = "Wt";
                      let appMin: number, appMax: number, rawMin: number, rawMax: number;
                      if (d.kg_mgkgday !== undefined) {
                        rawMin = rawMax = wtNum * d.kg_mgkgday;
                      } else {
                        rawMin = wtNum * d.kg_mgkgday_range!.min;
                        rawMax = wtNum * d.kg_mgkgday_range!.max;
                      }
                      appMin = rawMin;
                      appMax = rawMax;
                      if (maxMgDay !== null && rawMax > maxMgDay + 1e-9) {
                        isCapped = true;
                        appMax = maxMgDay;
                        if (appMin > maxMgDay) appMin = maxMgDay;
                      }
                      const mLMin = roundTo(appMin / d.conc_mg_per_mL, d.round_mL || 0.1);
                      const mLMax = roundTo(appMax / d.conc_mg_per_mL, d.round_mL || 0.1);

                      mLDisp = <span className="font-display font-bold text-slate-800 text-lg tracking-tight">{nearlyEqual(mLMin!, mLMax!) ? fmt(mLMax, 2) : <><span className="opacity-30 text-xs">{fmt(mLMin, 2)}</span><span className="mx-1 opacity-10 font-sans text-xs">~</span>{fmt(mLMax, 2)}</>}</span>;
                      rawDisp = <span className="font-display text-slate-400 tracking-tight">{nearlyEqual(rawMin, rawMax) ? fmt(rawMax, 2) : `${fmt(rawMin, 2)}~${fmt(rawMax, 2)}`}</span>;
                      appliedDisp = (
                        <div className="flex flex-col items-end">
                          <span className={`font-display font-black tracking-tight ${isCapped ? "text-red-500" : "text-slate-700"}`}>
                            {nearlyEqual(appMin, appMax) ? fmt(appMax, 2) : `${fmt(appMin, 2)}~${fmt(appMax, 2)}`}
                          </span>
                          {isCapped && <span className="text-[8px] px-1 bg-red-50 text-red-600 rounded border border-red-100 font-black uppercase py-0.5 mt-1 tracking-tighter">Capped</span>}
                        </div>
                      );
                      capDisp = maxMgDay !== null ? <span className="font-display text-slate-400 tracking-tight">&le;{fmt(maxMgDay, 0)} <span className="text-[10px] font-sans opacity-60 italic">{d.max_unit || "mg"}</span></span> : <span className="text-slate-200">—</span>;
                    }
                    // age based
                    else if (d.age_table) {
                      modeLabel = "Age";
                      const row = pickAgeRow(ageNum, d.age_table);
                      if (!row) {
                        const msg = isNaN(ageNum) ? "年齢を入力してください" : "対象年齢外";
                        mLDisp = rawDisp = capDisp = appliedDisp = <span className="text-slate-300 italic text-[10px] font-bold">{msg}</span>;
                      } else {
                        const mgMin = row.mg_min!;
                        const mgMax = row.mg_max!;
                        let appMin = mgMin, appMax = mgMax;
                        if (maxMgDay !== null && mgMax > maxMgDay + 1e-9) {
                          isCapped = true;
                          appMax = maxMgDay;
                          if (appMin > maxMgDay) appMin = maxMgDay;
                        }
                        const mLMin = roundTo(appMin / d.conc_mg_per_mL, d.round_mL || 0.1);
                        const mLMax = roundTo(appMax / d.conc_mg_per_mL, d.round_mL || 0.1);

                        mLDisp = <span className="font-display font-bold text-slate-800 text-lg tracking-tight">{nearlyEqual(mLMin!, mLMax!) ? fmt(mLMax, 2) : <><span className="opacity-30 text-xs">{fmt(mLMin, 2)}</span><span className="mx-1 opacity-10 font-sans text-xs">~</span>{fmt(mLMax, 2)}</>}</span>;
                        rawDisp = <span className="font-display font-medium text-slate-400 tracking-tight">{fmt(mgMin, 2)}~{fmt(mgMax, 2)}</span>;
                        appliedDisp = (
                          <div className="flex flex-col items-end">
                            <span className={`font-display font-black tracking-tight ${isCapped ? "text-red-500" : "text-slate-700"}`}>
                              {nearlyEqual(appMin, appMax) ? fmt(appMax, 2) : `${fmt(appMin, 2)}~${fmt(appMax, 2)}`}
                            </span>
                            {isCapped && <span className="text-[8px] px-1 bg-red-50 text-red-600 rounded border border-red-100 font-black uppercase py-0.5 mt-1 tracking-tighter">Capped</span>}
                          </div>
                        );
                        capDisp = maxMgDay !== null ? <span className="font-display font-medium text-slate-400 tracking-tight">&le;{fmt(maxMgDay, 0)} <span className="text-[10px] font-sans opacity-60 italic">mg</span></span> : <span className="text-slate-200">—</span>;
                      }
                    }

                    return (
                      <motion.tr 
                        key={d.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group hover:bg-slate-50 transition-colors divide-x divide-slate-50/50 even:bg-slate-50/30"
                      >
                        <td className="p-3 md:p-5 align-top">
                          <div className="font-display font-extrabold text-slate-900 group-hover:text-accent transition-colors text-xs md:text-sm">{d.name}</div>
                          {d.note && (
                            <div className="flex items-start gap-1 text-[9px] md:text-[10px] text-slate-400 font-bold leading-tight mt-1 uppercase tracking-tight opacity-70">
                              <Info size={10} className="shrink-0 mt-0.5 text-accent/50 md:size-11" />
                              {d.note}
                            </div>
                          )}
                        </td>
                        <td className="p-3 md:p-5 text-right font-display align-top">{mLDisp}</td>
                        <td className="p-3 md:p-5 text-right font-display align-top">{rawDisp}</td>
                        <td className="p-3 md:p-5 text-right font-display align-top mt-0.5 md:mt-1">{capDisp}</td>
                        <td className="p-3 md:p-5 text-right font-display align-top">{appliedDisp}</td>
                        <td className="p-3 md:p-5 text-right align-top">
                          <span className="text-[8px] md:text-[9px] font-black px-1 md:px-1.5 py-0.5 md:py-1 bg-slate-100 text-slate-500 border border-slate-200/50 rounded uppercase tracking-tighter md:tracking-wider">{modeLabel}</span>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Per Dose Table - Redesigned */}
        <motion.div
           initial={{ opacity: 0, y: 24 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex items-end justify-between mb-4 md:mb-6 px-1">
            <h2 className="text-base md:text-xl font-display font-bold text-brand border-l-4 border-orange-500 pl-3 md:pl-4 tracking-tight">
              1回量 <span className="text-[10px] font-bold text-slate-400 ml-2 uppercase tracking-widest opacity-60">Single Dosage</span>
            </h2>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl md:rounded-[2rem] shadow-sm overflow-hidden overflow-x-auto print:border-none print:shadow-none">
            <table className="w-full text-xs md:text-sm text-left border-collapse min-w-[800px] md:min-w-[900px] print:min-w-0">
              <thead className="bg-slate-50/50 text-slate-400 border-b border-slate-100">
                <tr className="divide-x divide-slate-100/50">
                  <th className="p-3 md:p-5 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] w-[30%]">薬剤 <span className="italic font-medium opacity-40 block mt-1 normal-case tracking-normal">Drug Profile</span></th>
                  <th className="p-3 md:p-5 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] w-[15%] text-right text-orange-600">mL/回 <span className="italic font-medium opacity-40 block mt-1 normal-case tracking-normal text-right">Target Volume</span></th>
                  <th className="p-3 md:p-5 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] w-[15%] text-right font-medium">mg/回 <span className="italic font-medium opacity-40 block mt-1 normal-case tracking-normal text-right">Active Dose</span></th>
                  <th className="p-3 md:p-5 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] w-[15%] text-right">1日量上限 <span className="italic font-medium opacity-40 block mt-1 normal-case tracking-normal text-right">Daily Limit Ref</span></th>
                  <th className="p-3 md:p-5 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] w-[15%] text-right">注記 <span className="italic font-medium opacity-40 block mt-1 normal-case tracking-normal text-right">Note</span></th>
                  <th className="p-3 md:p-5 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.1em] md:tracking-[0.2em] w-[10%] text-right">方式 <span className="italic font-medium opacity-40 block mt-1 normal-case tracking-normal text-right">Method</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {!wtNum ? (
                  <tr>
                    <td colSpan={6} className="p-24 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-400">
                        <AlertCircle size={40} className="opacity-10" />
                        <p className="font-sans font-bold text-sm tracking-wide opacity-80">体重の入力待ちです (オート計算)</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  perDoseDrugs.map((d, idx) => {
                    const r = d.per_dose_unified!;
                    const mgMin = wtNum * r.min;
                    const mgMax = wtNum * r.max;
                    const mLMin = roundTo(mgMin / d.conc_mg_per_mL, d.round_mL || 0.1);
                    const mLMax = roundTo(mgMax / d.conc_mg_per_mL, d.round_mL || 0.1);
                    const maxMgDay = getMaxMgDay(d.max, wtNum);

                    return (
                      <motion.tr 
                        key={d.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        className="group transition-colors divide-x divide-slate-50 even:bg-orange-50/[0.03] hover:bg-orange-50/10"
                      >
                        <td className="p-4 md:p-6 align-top">
                          <div className="font-display font-black text-slate-900 group-hover:text-orange-600 transition-colors text-xs md:text-base">{d.name}</div>
                          {d.note && (
                            <div className="flex items-start gap-1.5 text-[9px] md:text-[10px] text-slate-400 font-bold leading-tight mt-1 md:mt-2 uppercase tracking-tighter opacity-60">
                              <Info size={10} className="shrink-0 mt-0.5 text-orange-300 md:size-11" />
                              {d.note}
                            </div>
                          )}
                        </td>
                        <td className="p-4 md:p-6 text-right font-display align-top font-bold text-base md:text-2xl">
                           <div className="text-orange-700 tracking-tighter">
                            {mLMin === mLMax ? fmt(mLMax, 2) : <><span className="opacity-20 text-[10px] md:text-sm font-bold">{fmt(mLMin, 2)}</span><span className="mx-1 md:mx-2 opacity-5 font-sans">-</span>{fmt(mLMax, 2)}</>}
                           </div>
                        </td>
                        <td className="p-4 md:p-6 text-right font-display align-top pt-6 md:pt-8">
                           <span className="text-slate-400 font-bold text-xs md:text-sm tracking-tighter">{mgMin === mgMax ? fmt(mgMax, 2) : <><span className="opacity-40">{fmt(mgMin, 2)}</span><span className="mx-1 opacity-10 text-[10px]">~</span>{fmt(mgMax, 2)}</>} <span className="text-[9px] md:text-[10px] font-sans opacity-50 ml-0.5">mg</span></span>
                        </td>
                        <td className="p-4 md:p-6 text-right font-display text-slate-300 align-top text-[9px] md:text-[10px] pt-6 md:pt-8">
                          {maxMgDay ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="font-black text-slate-400 tracking-tight">&le;{fmt(maxMgDay, 0)}</span>
                              <span className="text-[7px] md:text-[8px] uppercase font-black opacity-30 tracking-widest">mg/day limit</span>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="p-4 md:p-6 align-top text-[8px] md:text-[10px] text-slate-300 italic font-black uppercase tracking-widest pt-6 md:pt-8 opacity-40">
                          As Needed
                        </td>
                        <td className="p-4 md:p-6 text-right align-top">
                          <span className="text-[8px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 md:py-1 bg-orange-100/50 text-orange-600 border border-orange-200/20 rounded md:rounded-lg uppercase tracking-tighter md:tracking-widest">Per Dose</span>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>

      <footer className="mt-20 py-10 border-t border-slate-200 text-center no-print bg-slate-100/30 -mx-8 px-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3">
            <span className="w-12 h-[1px] bg-slate-200"></span>
            Medical Disclaimer
            <span className="w-12 h-[1px] bg-slate-200"></span>
          </p>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            本ツールは小児科診療における計算補助を目的としたエンジニアリング向けプロトタイプです。<br/>
            実際の処方に際しては、必ず最新の添付文書を確認し、医師の責任において最終的な判断を行ってください。
          </p>
          <div className="flex justify-center gap-6 pt-4 opacity-30 grayscale hover:grayscale-0 transition-all">
             <div className="w-8 h-8 rounded-full bg-slate-300"></div>
             <div className="w-8 h-8 rounded-full bg-slate-300"></div>
             <div className="w-8 h-8 rounded-full bg-slate-300"></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
