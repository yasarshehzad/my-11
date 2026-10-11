'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { listSaveSlots, deleteCareerSave, exportCareerSaveAsJson, importCareerSaveFromJson, ValidSlotId } from '../../career/saves';
import { SaveSlotMeta } from '../../career/types';
import { getSavedTheme, saveTheme } from '../../utils/storage';

export default function CareerEntryPage() {
  const [slots, setSlots] = useState<SaveSlotMeta[]>(() => {
    if (typeof window !== 'undefined') {
      return listSaveSlots();
    }
    return [];
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getSavedTheme());
  const [deleteConfirmSlot, setDeleteConfirmSlot] = useState<string | null>(null);
  const [importingSlot, setImportingSlot] = useState<ValidSlotId | null>(null);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshSlots = () => {
    setSlots(listSaveSlots());
  };

  useEffect(() => {
    saveTheme(getSavedTheme());
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    saveTheme(next);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDelete = (slotId: string) => {
    deleteCareerSave(slotId);
    setDeleteConfirmSlot(null);
    refreshSlots();
    showToast(`Slot ${slotId.replace('_', ' ').toUpperCase()} cleared.`);
  };

  const handleExport = (slotId: string) => {
    const json = exportCareerSaveAsJson(slotId);
    if (!json) return;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my11_career_${slotId}_backup.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Backup exported for ${slotId.replace('_', ' ').toUpperCase()}`);
  };

  const handleImportSubmit = () => {
    if (!importingSlot) return;
    if (!importJsonText.trim()) {
      setImportError('Please paste your Career JSON save text.');
      return;
    }

    const res = importCareerSaveFromJson(importingSlot, importJsonText.trim());
    if (res.success) {
      setImportingSlot(null);
      setImportJsonText('');
      setImportError(null);
      refreshSlots();
      showToast(`Save imported successfully into ${importingSlot.replace('_', ' ').toUpperCase()}!`);
    } else {
      setImportError(res.error || 'Failed to import save.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slotId: ValidSlotId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importCareerSaveFromJson(slotId, content);
        if (res.success) {
          refreshSlots();
          showToast(`Save imported successfully into ${slotId.replace('_', ' ').toUpperCase()}!`);
        } else {
          alert(`Import error: ${res.error || 'Invalid file format'}`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-foreground font-sans flex flex-col pitch-bg w-full overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl font-display font-black text-xs uppercase tracking-wider shadow-xl flex items-center gap-2 motion-reduce:animate-none animate-bounce"
        >
          <span>✓</span> {toastMessage}
        </aside>
      )}

      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 flex justify-between items-center select-none shadow-lg">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            title="Return to Classic Draft"
          >
            ← <span>Draft Mode</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <h1 className="text-lg font-display font-black tracking-tight text-foreground uppercase">
            MY-<span className="text-emerald-400">11</span>{' '}
            <span className="text-xs ml-1 font-bold tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
              CAREER
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-900 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-800 hover:bg-slate-900/60 cursor-pointer active:scale-95 transition-all text-xs"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col items-center">
        {/* Title & Introduction */}
        <section className="text-center mb-8 max-w-lg space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-3 py-1 rounded-full font-display">
            Multi-Season Football Management
          </span>
          <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight uppercase text-foreground">
            Select Save Slot
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Take charge of an English Top Flight club. Manage budgets, negotiate transfers, and lead your squad across 38 league matches and cup glory.
          </p>
        </section>

        {/* Slot Grid */}
        <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" aria-label="Career Save Slots">
          {slots.map((slot, index) => {
            const slotNum = index + 1;
            const slotTitle = `Slot ${slotNum}`;

            if (slot.isEmpty || !slot.save) {
              return (
                <div
                  key={slot.slotId}
                  className="rounded-3xl border-2 border-dashed border-slate-850 hover:border-emerald-500/50 bg-slate-950/40 p-6 flex flex-col justify-between items-center min-h-[320px] text-center transition-all duration-300 group hover:bg-slate-900/20"
                >
                  <div className="space-y-2 w-full">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-display">
                      {slotTitle}
                    </span>
                    <h3 className="text-lg font-display font-black text-slate-400 group-hover:text-slate-200">
                      Empty Slot
                    </h3>
                    <p className="text-xs text-slate-500">
                      No active manager career. Start a fresh club project here.
                    </p>
                  </div>

                  <div className="w-full space-y-3 pt-6">
                    <Link
                      href={`/career/setup?slot=${slot.slotId}`}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span>+</span> Start New Career
                    </Link>

                    <div className="flex gap-2">
                      <label className="flex-1 py-2 px-2 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer transition-colors text-center">
                        📁 Import JSON
                        <input
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, slot.slotId)}
                        />
                      </label>
                      <button
                        onClick={() => {
                          setImportingSlot(slot.slotId);
                          setImportJsonText('');
                          setImportError(null);
                        }}
                        className="py-2 px-2.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                        title="Paste JSON text directly"
                      >
                        📋 Paste
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            const s = slot.save;
            return (
              <div
                key={slot.slotId}
                className="rounded-3xl border border-slate-850 hover:border-slate-700 bg-slate-900/40 p-6 flex flex-col justify-between min-h-[320px] transition-all duration-300 relative overflow-hidden shadow-xl"
              >
                {/* Accent Top Bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{
                    background: `linear-gradient(to right, ${s.clubPrimaryColor}, ${s.clubSecondaryColor})`,
                  }}
                />

                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-display">
                        {slotTitle}
                      </span>
                      <h3 className="text-xl font-display font-black text-white tracking-tight leading-tight">
                        {s.clubName}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        Mgr: <span className="text-slate-200 font-semibold">{s.managerName}</span>
                      </p>
                    </div>

                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        s.preset === 'hard'
                          ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                          : s.preset === 'easy'
                          ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                          : 'bg-amber-950/60 border-amber-800/60 text-amber-300'
                      }`}
                    >
                      {s.preset} {s.isLocked && '🔒'}
                    </span>
                  </div>

                  {/* Vitals */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/60 border border-slate-900 rounded-xl p-3 text-xs">
                    <div>
                      <div className="text-[9px] font-bold uppercase text-slate-500">Season</div>
                      <div className="font-display font-black text-foreground">Season {s.seasonNumber}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase text-slate-500">Budget</div>
                      <div className="font-display font-black text-emerald-400">
                        £{(s.budget / 1_000_000).toFixed(1)}M
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 space-y-2">
                  <Link
                    href={`/career/play?slot=${slot.slotId}`}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    ▶ Continue Career
                  </Link>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport(slot.slotId)}
                      className="flex-1 py-1.5 px-2 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-900 text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                      title="Download JSON backup"
                    >
                      💾 Export JSON
                    </button>
                    <button
                      onClick={() => setDeleteConfirmSlot(slot.slotId)}
                      className="py-1.5 px-3 rounded-lg border border-rose-900/40 hover:border-rose-700 bg-rose-950/20 hover:bg-rose-950/50 text-[10px] font-bold text-rose-400 hover:text-rose-200 transition-colors"
                      title="Delete save file"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Info Highlights */}
        <section className="w-full max-w-2xl bg-slate-900/30 border border-slate-850/60 rounded-2xl p-6 text-center space-y-4">
          <h4 className="text-xs font-display font-black uppercase tracking-wider text-slate-300">
            Career Mode Features
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3.5 space-y-1">
              <span className="text-base">🏟️</span>
              <h5 className="text-[11px] font-bold text-white uppercase tracking-tight">20 English Clubs</h5>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Realistic budgets, reputation tiers, stadiums, and complete customization.
              </p>
            </div>
            <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3.5 space-y-1">
              <span className="text-base">⚙️</span>
              <h5 className="text-[11px] font-bold text-white uppercase tracking-tight">Custom Difficulty</h5>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Easy, Hard, or Custom presets with lock protection against mid-game rule changes.
              </p>
            </div>
            <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3.5 space-y-1">
              <span className="text-base">🔒</span>
              <h5 className="text-[11px] font-bold text-white uppercase tracking-tight">Local & Portable</h5>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Stored safely in your browser with full JSON export and import backups.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmSlot && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
            <span className="text-3xl">⚠️</span>
            <h3 className="text-lg font-display font-black uppercase text-white">
              Delete {deleteConfirmSlot.replace('_', ' ').toUpperCase()}?
            </h3>
            <p className="text-xs text-slate-400">
              This will permanently delete this career save file. Export a JSON backup first if you want to keep your progress.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmSlot(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmSlot)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-display uppercase tracking-wider"
              >
                Delete Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import JSON Modal */}
      {importingSlot && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-display font-black uppercase text-white">
                Import Save into {importingSlot.replace('_', ' ').toUpperCase()}
              </h3>
              <button
                onClick={() => setImportingSlot(null)}
                className="text-slate-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Paste the exported JSON text from another device or backup below:
            </p>
            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Paste JSON content here..."
              rows={8}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            {importError && (
              <p className="text-xs text-rose-400 font-medium">{importError}</p>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setImportingSlot(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-display font-black uppercase tracking-wider"
              >
                Import Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
