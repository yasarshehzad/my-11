'use client';

import React, { useRef, useState } from 'react';
import {
  CareerSaveFile,
  CareerSettings,
  DateFormatPreference,
  CurrencyPreference,
  WageUnitPreference,
  HeightUnitPreference,
  WeightUnitPreference,
  NumberFormatPreference,
} from '../../career/types';
import { importCareerSaveFromJson, ValidSlotId } from '../../career/saveVault';
import {
  IconGlobe,
  IconLock,
  IconSave,
  IconAlert,
  IconVolumeOn,
  IconVolumeOff,
  IconUpload,
} from './GameIcons';

interface CareerSettingsTabProps {
  save: CareerSaveFile;
  slotId: ValidSlotId;
  editableSettings: CareerSettings;
  editingClubName: string;
  sfxEnabled: boolean;
  onChangeEditableSettings: (next: CareerSettings) => void;
  onChangeEditingClubName: (name: string) => void;
  onToggleSfx: () => void;
  onSaveSettings: () => void;
  onExport: () => void;
  onImportSaveSuccess: (imported: CareerSaveFile) => void;
  onResetSaveSlot: () => void;
  onOpenExitModal: () => void;
  onNotify: (msg: string) => void;
}

export function CareerSettingsTab({
  save,
  slotId,
  editableSettings,
  editingClubName,
  sfxEnabled,
  onChangeEditableSettings,
  onChangeEditingClubName,
  onToggleSfx,
  onSaveSettings,
  onExport,
  onImportSaveSuccess,
  onResetSaveSlot,
  onOpenExitModal,
  onNotify,
}: CareerSettingsTabProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const text = await file.text();
      const result = importCareerSaveFromJson(slotId, text);
      if (!result.success || !result.save) {
        setImportError(result.error || 'Failed to import career backup file.');
        return;
      }
      onImportSaveSuccess(result.save);
      onNotify(`Backup restored into ${slotId.replace('_', ' ').toUpperCase()}!`);
    } catch {
      setImportError('Could not read the selected JSON file.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const cardClass = 'office-floating-card rounded-3xl p-4 sm:p-5 space-y-3 border border-indigo-100/80 shadow-sm';
  const headingClass = 'text-xs font-display font-bold uppercase tracking-wider text-[var(--office-text-primary)]';
  const fieldLabelClass = 'block text-[11px] font-bold text-[var(--office-text-muted)] uppercase tracking-wider mb-1';
  const selectClass =
    'w-full min-h-[40px] bg-white border border-slate-200 rounded-lg px-2.5 text-xs text-[var(--office-text-primary)] font-bold focus:outline-none focus:border-[#1d5eff]';

  const ruleToggles: { key: 'boardCanSack' | 'retryMatch' | 'homegrownRule' | 'financialPenalties'; label: string; hint?: string }[] = [
    { key: 'boardCanSack', label: 'Board Can Sack You' },
    { key: 'retryMatch', label: 'Allow Match Retry' },
    { key: 'homegrownRule', label: 'Homegrown Rule', hint: '8+ home-trained players' },
    { key: 'financialPenalties', label: 'Financial Penalties', hint: 'Points deducted for debt' },
  ];

  return (
    <div className="max-w-2xl mx-auto w-full space-y-4">
      <h3 className="text-xl sm:text-2xl font-display font-extrabold uppercase text-[var(--office-text-primary)] tracking-tight">
        Career Settings
      </h3>

      {/* Club name + sound */}
      <section data-office-ui="true" className={cardClass}>
        <div>
          <label htmlFor="career-club-name" className={fieldLabelClass}>
            Club Name
          </label>
          <div className="flex gap-2.5">
            <input
              id="career-club-name"
              type="text"
              value={editingClubName}
              onChange={(e) => onChangeEditingClubName(e.target.value)}
              placeholder={save.club.defaultName}
              className="flex-1 min-w-0 min-h-[40px] bg-white border border-slate-200/90 rounded-xl px-4 text-xs text-[var(--office-text-primary)] font-bold focus:outline-none focus:border-[#1d5eff] focus:ring-2 focus:ring-blue-100 shadow-2xs"
            />
            <button
              type="button"
              data-office-ui="true"
              onClick={() => onChangeEditingClubName(save.club.defaultName)}
              className="office-subcard min-h-[40px] px-3.5 rounded-xl text-xs font-bold text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)] hover:bg-slate-100 cursor-pointer"
              title={`Reset to ${save.club.defaultName}`}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--office-divider)] pt-3">
          <span className={`${headingClass} flex items-center gap-2`}>
            {sfxEnabled ? (
              <IconVolumeOn className="w-4 h-4 text-[#1d5eff] shrink-0" />
            ) : (
              <IconVolumeOff className="w-4 h-4 text-slate-500 shrink-0" />
            )}
            <span>Sound Effects</span>
          </span>
          <button
            type="button"
            data-office-ui="true"
            role="switch"
            aria-checked={sfxEnabled}
            aria-label="Sound effects"
            onClick={onToggleSfx}
            className={`min-h-[40px] px-3.5 rounded-xl font-display font-black text-[11px] uppercase tracking-wider shrink-0 transition-all cursor-pointer border shadow-2xs ${
              sfxEnabled
                ? 'bg-[#1d5eff] text-white border-[#1d5eff]'
                : 'bg-slate-100 text-slate-600 border-slate-300 hover:text-slate-900'
            }`}
          >
            {sfxEnabled ? 'On' : 'Muted'}
          </button>
        </div>
      </section>

      {/* Units & formats (always editable) */}
      <section data-office-ui="true" className={cardClass}>
        <h4 className={`${headingClass} flex items-center gap-1.5`}>
          <IconGlobe className="w-3.5 h-3.5 text-[#1d5eff] shrink-0" />
          <span>Units &amp; Formats</span>
        </h4>

        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          <label>
            <span className={fieldLabelClass}>Date</span>
            <select
              value={editableSettings.dateFormat || 'uk'}
              onChange={(e) =>
                onChangeEditableSettings({ ...editableSettings, dateFormat: e.target.value as DateFormatPreference })
              }
              className={selectClass}
            >
              <option value="uk">DD/MM/YYYY</option>
              <option value="iso">YYYY-MM-DD</option>
              <option value="us">MM/DD/YYYY</option>
            </select>
          </label>

          <label>
            <span className={fieldLabelClass}>Currency</span>
            <select
              value={editableSettings.currency || 'GBP'}
              onChange={(e) =>
                onChangeEditableSettings({ ...editableSettings, currency: e.target.value as CurrencyPreference })
              }
              className={selectClass}
            >
              <option value="GBP">£ GBP</option>
              <option value="EUR">€ EUR</option>
              <option value="USD">$ USD</option>
            </select>
          </label>

          <label>
            <span className={fieldLabelClass}>Wages</span>
            <select
              value={editableSettings.wageUnit || 'weekly'}
              onChange={(e) =>
                onChangeEditableSettings({ ...editableSettings, wageUnit: e.target.value as WageUnitPreference })
              }
              className={selectClass}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </label>

          <label>
            <span className={fieldLabelClass}>Numbers</span>
            <select
              value={editableSettings.numberFormat || 'comma'}
              onChange={(e) =>
                onChangeEditableSettings({ ...editableSettings, numberFormat: e.target.value as NumberFormatPreference })
              }
              className={selectClass}
            >
              <option value="comma">1,000,000</option>
              <option value="dot">1.000.000</option>
              <option value="space">1 000 000</option>
            </select>
          </label>

          <label>
            <span className={fieldLabelClass}>Height</span>
            <select
              value={editableSettings.heightUnit || 'ft_in'}
              onChange={(e) =>
                onChangeEditableSettings({ ...editableSettings, heightUnit: e.target.value as HeightUnitPreference })
              }
              className={selectClass}
            >
              <option value="ft_in">ft &amp; in</option>
              <option value="cm">cm</option>
              <option value="m">m</option>
            </select>
          </label>

          <label>
            <span className={fieldLabelClass}>Weight</span>
            <select
              value={editableSettings.weightUnit || 'kg'}
              onChange={(e) =>
                onChangeEditableSettings({ ...editableSettings, weightUnit: e.target.value as WeightUnitPreference })
              }
              className={selectClass}
            >
              <option value="kg">kg</option>
              <option value="st_lbs">st &amp; lb</option>
              <option value="lbs">lb</option>
            </select>
          </label>
        </div>
      </section>

      {/* Gameplay rules */}
      <section data-office-ui="true" className={cardClass}>
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <h4 className={headingClass}>
            Rules <span className="text-[var(--office-text-muted)]">· {save.settings.preset}</span>
          </h4>
          {save.settings.locked && (
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
              <IconLock className="w-3 h-3" />
              <span>Locked</span>
            </span>
          )}
        </div>

        <div className="divide-y divide-[var(--office-divider)] border-t border-[var(--office-divider)]">
          {ruleToggles.map((rule) => (
            <label
              key={rule.key}
              className={`flex justify-between items-center gap-3 min-h-[44px] py-1.5 ${
                save.settings.locked ? 'opacity-70' : 'cursor-pointer'
              }`}
            >
              <span className="min-w-0">
                <span className="block font-bold text-[var(--office-text-primary)] text-xs">{rule.label}</span>
                {rule.hint && <span className="block text-[11px] text-[var(--office-text-muted)]">{rule.hint}</span>}
              </span>
              <input
                type="checkbox"
                checked={editableSettings[rule.key]}
                disabled={save.settings.locked}
                onChange={(e) => onChangeEditableSettings({ ...editableSettings, [rule.key]: e.target.checked })}
                className="w-5 h-5 accent-[#1d5eff] cursor-pointer rounded shrink-0"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Backup, reset & exit */}
      <section data-office-ui="true" className={cardClass}>
        <h4 className={`${headingClass} flex items-center gap-1.5`}>
          <IconSave className="w-3.5 h-3.5 text-[#1d5eff] shrink-0" />
          <span>
            Backup <span className="text-[var(--office-text-muted)] font-mono normal-case">· {slotId}</span>
          </span>
        </h4>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            data-office-ui="true"
            onClick={onExport}
            className="office-subcard min-h-[40px] px-3 rounded-xl font-display font-bold text-xs text-[var(--office-text-primary)] hover:bg-indigo-50/50 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <IconSave className="w-3.5 h-3.5 text-[#1d5eff] shrink-0" />
            <span>Export</span>
          </button>

          <button
            type="button"
            data-office-ui="true"
            onClick={() => fileInputRef.current?.click()}
            className="office-subcard min-h-[40px] px-3 rounded-xl font-display font-bold text-xs text-[var(--office-text-primary)] hover:bg-emerald-50/60 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <IconUpload className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Restore</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
            aria-label="Import career save JSON backup"
          />
        </div>

        {importError && (
          <div role="alert" className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-[11px] font-semibold text-rose-700">
            {importError}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap border-t border-[var(--office-divider)] pt-3">
          <button
            type="button"
            data-office-ui="true"
            onClick={onOpenExitModal}
            className="min-h-[40px] px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-slate-100 hover:bg-slate-200 text-slate-800 font-display font-black text-xs uppercase tracking-wider cursor-pointer transition-all shadow-2xs"
          >
            Exit Career
          </button>

          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="min-h-[40px] px-2 text-rose-700 hover:text-rose-800 hover:underline font-display font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <IconAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Reset save slot...</span>
            </button>
          ) : (
            <div className="w-full bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-rose-800">
                Permanently wipes everything in <span className="font-mono font-bold">{slotId}</span>.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={onResetSaveSlot}
                  className="min-h-[40px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-display font-black text-xs uppercase cursor-pointer shadow-sm transition-colors"
                >
                  Wipe Slot
                </button>
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={() => setShowResetConfirm(false)}
                  className="office-subcard min-h-[40px] px-3.5 rounded-xl text-xs font-bold text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Page-level save: covers club name, units and rules */}
      <div className="sticky bottom-2 z-20">
        <button
          type="button"
          data-office-ui="true"
          onClick={onSaveSettings}
          className="office-action-btn-primary w-full min-h-[48px] px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
