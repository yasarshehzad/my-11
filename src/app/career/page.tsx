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
import { IconArrowLeft, IconArrowRight, IconClose } from '../../components/career/GameIcons';
import { Button, Eyebrow } from '../../components/ui';

function formatBudgetShort(amount: number): string {
  if (!Number.isFinite(amount)) return '£0M';
  return `£${Math.round(amount / 1_000_000)}M`;
}

function slotName(slotId: string): string {
  return `slot ${slotId.replace('slot_', '')}`;
}

function presetLabel(preset: string): string {
  return preset ? preset.charAt(0).toUpperCase() + preset.slice(1) : '';
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
    showToast(`Save in ${slotName(slotId)} deleted.`);
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
    showToast(`Backup exported for ${slotName(slotId)}.`);
  };

  const handleImportSubmit = () => {
    if (!importingSlot) return;
    if (!importJsonText.trim()) {
      setImportError('Paste your career save JSON first.');
      return;
    }

    const res = importCareerSaveFromJson(importingSlot, importJsonText.trim());
    if (res.success) {
      setImportingSlot(null);
      setImportJsonText('');
      setImportError(null);
      refreshSlots();
      showToast(`Save imported into ${slotName(importingSlot)}.`);
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
          showToast(`Save imported into ${slotName(slotId)}.`);
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
          className="fixed top-18 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-1.5rem)] bg-[#047857] text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm flex items-center gap-2 motion-reduce:animate-none"
        >
          <span>{toastMessage}</span>
        </aside>
      )}

      {/* Top Navigation Bar */}
      <header className="w-full max-w-5xl mx-auto px-3 sm:px-4 pt-3 sm:pt-4 sticky top-0 z-40 select-none">
        <div className="office-floating-card rounded-xl px-3 sm:px-4 py-2.5 flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/" className="inline-flex items-center justify-center gap-1.5 min-h-10 px-3 rounded-lg text-xs font-semibold bg-[var(--surface-card)] text-[var(--ink-primary)] border border-[var(--border-crisp)] hover:bg-[var(--surface-subcard)] cursor-pointer transition-colors whitespace-nowrap shrink-0">
              <IconArrowLeft className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <span className="text-sm sm:text-base font-display font-semibold text-[var(--ink-primary)] whitespace-nowrap truncate">
              MY-11 career
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              href="/draft"
              className="inline-flex items-center justify-center gap-1.5 min-h-10 px-3 rounded-lg text-xs font-semibold bg-[var(--surface-card)] text-[var(--ink-primary)] border border-[var(--border-crisp)] hover:bg-[var(--surface-subcard)] cursor-pointer transition-colors whitespace-nowrap"
            >
              Draft mode
            </Link>
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              aria-label="Career mode guide"
              title="Career mode guide"
              className="w-10 h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] hover:bg-[var(--surface-subcard)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] flex items-center justify-center transition-colors cursor-pointer"
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
          <h1 className="text-xl sm:text-2xl font-display font-semibold text-[var(--ink-primary)]">
            Save slots
          </h1>
          <span className="text-sm text-[var(--ink-muted)] tabular-nums">
            {occupiedCount} of {slots.length || 3} in use
          </span>
        </div>

        {/* 3 Save Slots Tactile Cards */}
        <section aria-label="Save slots" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {slots.map((slot, index) => {
            const slotNumber = index + 1;
            const slotLabel = `Slot ${slotNumber}`;

            if (slot.isEmpty || !slot.save) {
              return (
                <article key={slot.slotId} className="my11-canopy-card flex flex-col">
                  <div className="p-5 pb-0 bg-[var(--surface-card)]">
                    <Eyebrow>{slotLabel}</Eyebrow>
                    <h2 className="text-lg font-display font-semibold text-[var(--ink-muted)] mt-0.5">
                      Empty
                    </h2>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-end gap-4 bg-[var(--surface-card)]">

                    <div className="space-y-2.5">
                      <Link
                        href={`/career/setup?slot=${slot.slotId}`}
                        className="office-action-btn-primary w-full inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-lg font-semibold text-sm"
                      >
                        <span>Start new career</span>
                        <IconArrowRight className="w-4 h-4" />
                      </Link>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="inline-flex items-center justify-center gap-1.5 min-h-10 px-3 rounded-lg text-xs font-semibold bg-[var(--surface-card)] text-[var(--ink-primary)] border border-[var(--border-crisp)] hover:bg-[var(--surface-subcard)] cursor-pointer transition-colors">
                          <span>Import file</span>
                          <input
                            type="file"
                            accept=".json,application/json"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, slot.slotId)}
                          />
                        </label>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="min-h-10"
                          onClick={() => {
                            setImportingSlot(slot.slotId);
                            setImportError(null);
                            setImportJsonText('');
                          }}
                        >
                          Paste JSON
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            }

            const { save } = slot;
            return (
              <article key={slot.slotId} className="my11-canopy-card flex flex-col">
                {/* Club colour line and plain header */}
                <div className="h-1" style={{ backgroundColor: save.clubPrimaryColor }} />
                <div className="p-5 pb-0 bg-[var(--surface-card)] min-w-0">
                  <Eyebrow>
                    {slotLabel} · Season {save.seasonNumber} · {presetLabel(save.preset)}
                  </Eyebrow>
                  <h2 className="text-lg font-display font-semibold text-[var(--ink-primary)] truncate mt-0.5">
                    {save.clubName}
                  </h2>
                  <p className="text-sm text-[var(--ink-secondary)] truncate">
                    Manager: {save.managerName}
                  </p>
                </div>

                {/* Save details and controls */}
                <div className="p-5 pt-4 flex-1 flex flex-col justify-between gap-4 bg-[var(--surface-card)]">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-left">
                    {[
                      { label: 'Date', value: save.currentDate },
                      { label: 'Budget', value: formatBudgetShort(save.budget) },
                      { label: 'Squad', value: `${save.squadSize} players` },
                      { label: 'Rules', value: save.isLocked ? 'Locked' : 'Editable' },
                    ].map((stat) => (
                      <div key={stat.label} className="flex items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5">
                        <dt className="text-xs text-[var(--ink-muted)]">{stat.label}</dt>
                        <dd className="text-xs font-semibold text-[var(--ink-primary)] tabular-nums text-right">{stat.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="space-y-2">
                    <Link
                      href={`/career/play?slot=${slot.slotId}`}
                      className="office-action-btn-primary w-full inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-lg font-semibold text-sm"
                    >
                      <span>Continue career</span>
                      <IconArrowRight className="w-4 h-4" />
                    </Link>

                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => handleExport(slot.slotId)}
                        title="Download JSON backup"
                      >
                        Export JSON
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setDeleteConfirmSlot(slot.slotId)}
                        aria-label={`Delete ${slotLabel}`}
                        title="Delete save file"
                      >
                        Delete
                      </Button>
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
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 max-w-sm w-full space-y-3 text-left shadow-sm">
            <h3 className="text-lg font-display font-semibold text-[var(--ink-primary)]">
              Delete the save in {slotName(deleteConfirmSlot)}?
            </h3>
            <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
              This permanently deletes this career save. Export a JSON backup first if you want to keep your progress.
            </p>
            <div className="flex gap-2.5 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirmSlot(null)}>
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => handleDelete(deleteConfirmSlot)}>
                Delete save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import JSON Modal */}
      {importingSlot && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 max-w-md w-full space-y-4 shadow-sm text-[var(--ink-primary)]">
            <div className="flex justify-between items-center gap-3">
              <h3 className="text-base font-display font-semibold text-[var(--ink-primary)]">
                Import a save into {slotName(importingSlot)}
              </h3>
              <button
                type="button"
                onClick={() => setImportingSlot(null)}
                aria-label="Close modal"
                className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)] cursor-pointer"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-[var(--ink-secondary)]">
              Paste the exported JSON from another device or a backup.
            </p>
            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Paste JSON here"
              rows={8}
              className="w-full bg-[var(--surface-subcard)] border border-[var(--border-crisp)] rounded-lg p-3 text-base sm:text-sm tabular-nums text-[var(--ink-primary)] focus:outline-none focus:border-blue-600"
            />
            {importError && (
              <p className="text-xs text-rose-700 font-semibold">{importError}</p>
            )}
            <div className="flex gap-2.5 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setImportingSlot(null)}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleImportSubmit}>
                Import save
              </Button>
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
