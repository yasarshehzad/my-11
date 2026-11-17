'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  listSaveSlots,
  deleteCareerSave,
  exportCareerSaveAsJson,
  importCareerSaveFromJson,
  hydrateCareerSaveVault,
  ValidSlotId,
} from '../../career/saveVault';
import { SaveSlotMeta } from '../../career/types';
import { saveTheme, saveHideCareerTutorial } from '../../utils/storage';
import { HowToPlayModal } from '../../components/HowToPlayModal';
import { IconClose } from '../../components/career/GameIcons';

function formatBudgetShort(amount: number): string {
  if (!Number.isFinite(amount)) return '£0M';
  return `£${Math.round(amount / 1_000_000)}M`;
}

export default function CareerEntryPage() {
  const [slots, setSlots] = useState<SaveSlotMeta[]>([]);
  const [theme] = useState<'dark' | 'light'>('light');
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
    saveTheme('light');
    let cancelled = false;
    hydrateCareerSaveVault()
      .then(() => {
        if (!cancelled) {
          setSlots(listSaveSlots());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlots(listSaveSlots());
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const occupiedCount = slots.filter((s) => !s.isEmpty).length;

  return (
    <div
      data-theme={theme}
      className="min-h-screen my11-canvas text-foreground font-sans flex flex-col w-full overflow-x-hidden safe-pb pb-24 sm:pb-16"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          data-force-white="true"
          className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-[#047857] text-white px-4 py-2 rounded-xl font-display font-black text-xs uppercase tracking-wider shadow-xl flex items-center gap-2 motion-reduce:animate-none"
        >
          <span>{toastMessage}</span>
        </aside>
      )}

      {/* Top Navigation Bar */}
      <header className="w-full max-w-5xl mx-auto px-3 sm:px-4 pt-3 sm:pt-4 sticky top-0 z-40 select-none">
        <div className="office-floating-card rounded-2xl px-3 sm:px-4 py-2.5 flex justify-between items-center shadow-xs border border-slate-200 gap-2 bg-white">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl office-subcard text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 transition-colors shadow-2xs whitespace-nowrap shrink-0"
            >
              <span>&larr;</span>
              <span>Home</span>
            </Link>
            <div className="h-4 w-px bg-slate-200 shrink-0" />
            <span className="text-xs sm:text-base font-display font-black uppercase tracking-tight text-slate-900 whitespace-nowrap truncate">
              MY-11 <span className="text-amber-700">Career Hub</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              href="/draft"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#F7F6F3] hover:bg-zinc-200/70 border border-[#E2DFD9] text-zinc-900 text-[10px] sm:text-[10.5px] font-display font-black uppercase tracking-wider transition-colors whitespace-nowrap"
            >
              Draft Mode
            </Link>
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              aria-label="Career Mode Guide"
              title="Career Mode Guide"
              className="w-8 h-8 rounded-xl office-subcard text-slate-700 hover:text-slate-900 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 space-y-6">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h1 className="text-xl sm:text-2xl font-display font-black uppercase tracking-tight text-slate-900">
            Save Slots
          </h1>
          <span className="text-xs font-mono font-bold text-slate-600">
            {occupiedCount} / {slots.length || 3} in use
          </span>
        </div>

        {/* 3 Save Slots Tactile Cards */}
        <section aria-label="Save Slots" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {slots.map((slot, index) => {
            const slotNumber = index + 1;
            const slotLabel = `Slot 0${slotNumber}`;

            if (slot.isEmpty || !slot.save) {
              return (
                <article key={slot.slotId} className="my11-canopy-card flex flex-col">
                  <div className="my11-canopy-head p-5">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-300">
                      {slotLabel}
                    </div>
                    <h2 className="text-lg font-display font-black uppercase text-white mt-0.5">
                      Empty
                    </h2>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-end gap-4 bg-white">

                    <div className="space-y-2.5">
                      <Link
                        href={`/career/setup?slot=${slot.slotId}`}
                        className="office-play-match-btn w-full py-3 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Start New Career</span>
                        <span aria-hidden="true">-&gt;</span>
                      </Link>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="office-subcard py-2 px-2 rounded-xl text-[11px] font-bold text-slate-700 hover:text-slate-900 flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                          <span>Import File</span>
                          <input
                            type="file"
                            accept=".json,application/json"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, slot.slotId)}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setImportingSlot(slot.slotId);
                            setImportError(null);
                            setImportJsonText('');
                          }}
                          className="office-subcard py-2 px-2 rounded-xl text-[11px] font-bold text-slate-700 hover:text-slate-900 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <span>Paste JSON</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            }

            const { save } = slot;
            return (
              <article key={slot.slotId} className="my11-canopy-card flex flex-col">
                {/* Club-Branded Two-Tone Canopy */}
                <div
                  data-force-white="true"
                  className="p-5 relative overflow-hidden text-white"
                  style={{
                    background: `linear-gradient(135deg, ${save.clubPrimaryColor} 0%, #09152b 88%)`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/80">
                        {slotLabel} • Season {save.seasonNumber}
                      </div>
                      <h2 className="text-lg font-display font-black uppercase text-white truncate mt-0.5">
                        {save.clubName}
                      </h2>
                      <p className="text-xs text-white/90 font-semibold truncate">
                        Manager: {save.managerName}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-black/35 border border-white/25 text-[10px] font-mono font-bold uppercase shrink-0">
                      {save.preset}
                    </span>
                  </div>
                </div>

                {/* Telemetry & Controls Body */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4 bg-white">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-left">
                    {[
                      { label: 'Date', value: save.currentDate },
                      { label: 'Budget', value: formatBudgetShort(save.budget) },
                      { label: 'Squad', value: `${save.squadSize} players` },
                      { label: 'Rules', value: save.isLocked ? 'Locked' : 'Editable' },
                    ].map((stat) => (
                      <div key={stat.label} className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-1.5">
                        <dt className="text-[11px] text-slate-500">{stat.label}</dt>
                        <dd className="text-xs font-mono font-bold text-slate-900">{stat.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="space-y-2">
                    <Link
                      href={`/career/play?slot=${slot.slotId}`}
                      className="office-play-match-btn w-full py-3 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Continue Career</span>
                      <span aria-hidden="true">-&gt;</span>
                    </Link>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleExport(slot.slotId)}
                        className="office-subcard flex-1 py-2 px-3 rounded-xl text-[11px] font-bold text-slate-700 hover:text-slate-900 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        title="Download JSON backup"
                      >
                        Export JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmSlot(slot.slotId)}
                        aria-label={`Delete ${slotLabel}`}
                        title="Delete save file"
                        className="office-subcard py-2 px-3 rounded-xl text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center justify-center cursor-pointer transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmSlot && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
            <div className="w-11 h-11 mx-auto rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-mono font-bold text-xs">
              DEL
            </div>
            <h3 className="text-lg font-display font-black uppercase text-slate-900">
              Delete {deleteConfirmSlot.replace('_', ' ').toUpperCase()}?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will permanently delete this career save file. Export a JSON backup first if you want to keep your progress.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSlot(null)}
                className="flex-1 py-2.5 rounded-xl office-subcard text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmSlot)}
                data-force-white="true"
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-display font-black uppercase tracking-wider cursor-pointer shadow-sm"
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
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-slate-900">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-display font-black uppercase text-slate-900">
                Import Save into {importingSlot.replace('_', ' ').toUpperCase()}
              </h3>
              <button
                type="button"
                onClick={() => setImportingSlot(null)}
                aria-label="Close modal"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Paste the exported JSON text from another device or backup below:
            </p>
            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Paste JSON content here..."
              rows={8}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
            />
            {importError && (
              <p className="text-xs text-rose-700 font-semibold">{importError}</p>
            )}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setImportingSlot(null)}
                className="flex-1 py-2.5 rounded-xl office-subcard text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                data-force-white="true"
                className="flex-1 py-2.5 rounded-xl office-play-match-btn text-white text-xs font-display font-black uppercase tracking-wider cursor-pointer shadow-sm"
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
