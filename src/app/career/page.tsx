'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { listSaveSlots, deleteCareerSave, exportCareerSaveAsJson, importCareerSaveFromJson, ValidSlotId } from '../../career/saves';
import { SaveSlotMeta } from '../../career/types';
import { getSavedTheme, saveTheme, getHideCareerTutorial, saveHideCareerTutorial } from '../../utils/storage';
import { HowToPlayModal } from '../../components/HowToPlayModal';

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
  const [showGuide, setShowGuide] = useState(false);

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
    <div
      data-theme={theme}
      className="min-h-screen my11-canvas text-foreground font-sans flex flex-col w-full overflow-x-hidden"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-display font-black text-xs uppercase tracking-wider shadow-xl shadow-blue-500/25 flex items-center gap-2 motion-reduce:animate-none animate-bounce"
        >
          <span>✓</span> {toastMessage}
        </aside>
      )}

      {/* Floating MY-11 Header */}
      <header className="w-full max-w-4xl mx-auto px-3 sm:px-4 pt-3 sm:pt-4 sticky top-0 z-40 select-none">
        <div className="office-floating-card rounded-[22px] px-3 sm:px-4 py-2 sm:py-2.5 flex justify-between items-center shadow-lg gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="office-subcard text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-[var(--office-text-primary)]"
              title="Return to Home"
            >
              ← <span>Home</span>
            </Link>
            <Link
              href="/draft"
              className="office-subcard text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-[var(--office-text-primary)]"
              title="Play Draft Mode"
            >
              <span>Draft</span>
            </Link>
            <div className="h-4 w-px bg-[var(--office-divider)]" />
            
            {/* Brand Logo with Crown */}
            <div className="flex items-center gap-1.5">
              <div className="flex flex-col items-center justify-center shrink-0">
                <svg viewBox="0 0 28 12" className="w-3.5 h-2.5 -mb-0.5" aria-hidden="true">
                  <defs>
                    <linearGradient id="my11-crown-grad-career" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00d2ff" />
                      <stop offset="50%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#c026d3" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M2 10 L4 3 L10 7 L14 1 L18 7 L24 3 L26 10 Z"
                    fill="url(#my11-crown-grad-career)"
                  />
                </svg>
                <span className="font-display font-black text-sm tracking-tighter leading-none text-[var(--office-text-primary)]">
                  MY-11
                </span>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#2563eb] bg-[#dbe8ff] dark:bg-[#1e293b] px-2 py-0.5 rounded-full">
                CAREER
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowGuide(true)}
              title="Career Mode Guide & Rules"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold office-subcard cursor-pointer"
            >
              ❓
            </button>
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs office-subcard cursor-pointer"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8 flex flex-col items-center">
        {/* Title & Introduction */}
        <section className="text-center mb-6 max-w-lg space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#2563eb] bg-[#dbe8ff] dark:bg-[#1e293b] px-3 py-1 rounded-full font-display">
            Multi-Season Football Management
          </span>
          <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight uppercase text-[var(--office-text-primary)]">
            Select Save Slot
          </h2>
          <p className="text-xs sm:text-sm text-[var(--office-text-secondary)] font-medium">
            Take charge of an English Top Flight club. Manage budgets, negotiate transfers, and lead your squad across 38 league matches and cup glory.
          </p>
        </section>

        {/* Slot Grid */}
        <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 mb-8" aria-label="Career Save Slots">
          {slots.map((slot, index) => {
            const slotNum = index + 1;
            const slotTitle = `Slot ${slotNum}`;

            if (slot.isEmpty || !slot.save) {
              return (
                <div
                  key={slot.slotId}
                  className="office-floating-card rounded-[24px] border-2 border-dashed p-6 flex flex-col justify-between items-center min-h-[330px] text-center transition-all duration-300 group shadow-lg"
                >
                  <div className="space-y-2 w-full">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--office-text-muted)] font-display">
                      {slotTitle}
                    </span>
                    <h3 className="text-lg font-display font-black text-[var(--office-text-primary)]">
                      Empty Slot
                    </h3>
                    <p className="text-xs text-[var(--office-text-secondary)]">
                      No active manager career. Start a fresh club project here.
                    </p>
                  </div>

                  <div className="w-full space-y-3 pt-6">
                    <Link
                      href={`/career/setup?slot=${slot.slotId}`}
                      className="office-play-match-btn w-full py-3 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <span>+</span> Start New Career
                    </Link>

                    <div className="flex gap-2">
                      <label className="office-subcard flex-1 py-2 px-2 rounded-xl text-[10.5px] font-bold text-[var(--office-text-primary)] cursor-pointer text-center">
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
                        className="office-subcard py-2 px-2.5 rounded-xl text-[10.5px] font-bold text-[var(--office-text-primary)]"
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
                className="office-floating-card rounded-[24px] p-6 flex flex-col justify-between min-h-[330px] transition-all duration-300 relative overflow-hidden shadow-xl"
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
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--office-text-muted)] font-display">
                        {slotTitle}
                      </span>
                      <h3 className="text-xl font-display font-black text-[var(--office-text-primary)] tracking-tight leading-tight">
                        {s.clubName}
                      </h3>
                      <p className="text-xs text-[var(--office-text-secondary)] font-medium">
                        Mgr: <span className="text-[var(--office-text-primary)] font-semibold">{s.managerName}</span>
                      </p>
                    </div>

                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        s.preset === 'hard'
                          ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                          : s.preset === 'easy'
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500/40 text-blue-700 dark:text-blue-300 font-bold'
                          : 'bg-amber-950/60 border-amber-800/60 text-amber-300'
                      }`}
                    >
                      {s.preset} {s.isLocked && '🔒'}
                    </span>
                  </div>

                  {/* Vitals */}
                  <div className="grid grid-cols-2 gap-2 office-subcard rounded-2xl p-3 text-xs">
                    <div>
                      <div className="text-[9px] font-bold uppercase text-[var(--office-text-muted)]">Season</div>
                      <div className="font-display font-black text-[var(--office-text-primary)]">Season {s.seasonNumber}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase text-[var(--office-text-muted)]">Budget</div>
                      <div className="font-display font-black text-blue-600 dark:text-blue-400">
                        £{(s.budget / 1_000_000).toFixed(1)}M
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 space-y-2">
                  <Link
                    href={`/career/play?slot=${slot.slotId}`}
                    className="office-play-match-btn w-full py-3 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    ▶ Continue Career
                  </Link>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport(slot.slotId)}
                      className="office-subcard flex-1 py-1.5 px-2 rounded-xl text-[10.5px] font-bold text-[var(--office-text-primary)]"
                      title="Download JSON backup"
                    >
                      💾 Export JSON
                    </button>
                    <button
                      onClick={() => setDeleteConfirmSlot(slot.slotId)}
                      className="office-subcard py-1.5 px-3 rounded-xl text-[10.5px] font-bold text-rose-500 hover:text-rose-600"
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
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
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
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-display font-black uppercase tracking-wider shadow-md shadow-blue-500/20"
              >
                Import Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Career Guide Modal */}
      <HowToPlayModal
        isOpen={showGuide}
        mode="career"
        onClose={(dontShowAgain) => {
          setShowGuide(false);
          if (dontShowAgain) {
            saveHideCareerTutorial(true);
          }
        }}
      />
    </div>
  );
}
