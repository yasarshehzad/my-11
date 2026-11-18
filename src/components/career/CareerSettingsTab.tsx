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
  IconLock,
  IconSave,
  IconAlert,
  IconVolumeOn,
  IconVolumeOff,
  IconUpload,
} from './GameIcons';
import { Button, SectionHeader, Tag } from '@/components/ui';

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
  const slotLabel = slotId.replace(/_/g, ' ');
  const presetLabel = save.settings.preset
    ? save.settings.preset.charAt(0).toUpperCase() + save.settings.preset.slice(1).replace(/_/g, ' ')
    : '';

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
      onNotify(`Backup restored into ${slotLabel}.`);
    } catch {
      setImportError('Could not read the selected JSON file.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const cardClass =
    'office-floating-card rounded-xl p-4 sm:p-5 space-y-3 border border-[var(--border-subtle)] bg-[var(--surface-card)]';
  const fieldLabelClass = 'block text-xs font-medium text-[var(--ink-secondary)] mb-1';
  const selectClass =
    'w-full min-h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] px-3 text-base sm:text-sm text-[var(--ink-primary)] focus:outline-none focus:border-[#1d5eff] focus:ring-2 focus:ring-blue-100';

  const ruleToggles: { key: 'boardCanSack' | 'retryMatch' | 'homegrownRule' | 'financialPenalties'; label: string; hint?: string }[] = [
    { key: 'boardCanSack', label: 'Board can sack you' },
    { key: 'retryMatch', label: 'Allow match retry' },
    { key: 'homegrownRule', label: 'Homegrown rule', hint: '8+ home-trained players' },
    { key: 'financialPenalties', label: 'Financial penalties', hint: 'Points deducted for debt' },
  ];

  return (
    <div className="max-w-2xl mx-auto w-full space-y-4">
      <h3 className="text-xl sm:text-2xl font-display font-semibold text-[var(--ink-primary)]">
        Career settings
      </h3>

      {/* Club name + sound */}
      <section data-office-ui="true" className={cardClass}>
        <div>
          <label htmlFor="career-club-name" className={fieldLabelClass}>
            Club name
          </label>
          <div className="flex gap-2">
            <input
              id="career-club-name"
              type="text"
              value={editingClubName}
              onChange={(e) => onChangeEditingClubName(e.target.value)}
              placeholder={save.club.defaultName}
              className="flex-1 min-w-0 min-h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] px-3 text-base sm:text-sm text-[var(--ink-primary)] focus:outline-none focus:border-[#1d5eff] focus:ring-2 focus:ring-blue-100"
            />
            <Button
              variant="secondary"
              data-office-ui="true"
              onClick={() => onChangeEditingClubName(save.club.defaultName)}
              title={`Reset to ${save.club.defaultName}`}
            >
              Reset
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
          <span className="text-sm font-medium text-[var(--ink-primary)] flex items-center gap-2">
            {sfxEnabled ? (
              <IconVolumeOn className="w-4 h-4 text-[var(--ink-secondary)] shrink-0" />
            ) : (
              <IconVolumeOff className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
            )}
            <span>Sound effects</span>
          </span>
          <button
            type="button"
            data-office-ui="true"
            role="switch"
            aria-checked={sfxEnabled}
            aria-label="Sound effects"
            onClick={onToggleSfx}
            className={`min-h-10 min-w-16 px-4 rounded-lg font-semibold text-sm shrink-0 transition-colors cursor-pointer border ${
              sfxEnabled
                ? 'bg-[#1d5eff] text-white border-[#1d5eff]'
                : 'bg-[var(--surface-card)] text-[var(--ink-secondary)] border-[var(--border-crisp)] hover:text-[var(--ink-primary)]'
            }`}
          >
            {sfxEnabled ? 'On' : 'Muted'}
          </button>
        </div>
      </section>

      {/* Units & formats (always editable) */}
      <section data-office-ui="true" className={cardClass}>
        <SectionHeader as="h4" title="Units and formats" />

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
              <option value="ft_in">ft and in</option>
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
              <option value="st_lbs">st and lb</option>
              <option value="lbs">lb</option>
            </select>
          </label>
        </div>
      </section>

      {/* Gameplay rules */}
      <section data-office-ui="true" className={cardClass}>
        <SectionHeader
          as="h4"
          title="Rules"
          meta={presetLabel || undefined}
          action={
            save.settings.locked ? (
              <Tag tone="warning">
                <IconLock className="w-3 h-3" />
                <span>Locked</span>
              </Tag>
            ) : undefined
          }
        />

        <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
          {ruleToggles.map((rule) => (
            <label
              key={rule.key}
              className={`flex justify-between items-center gap-3 min-h-11 py-1.5 ${
                save.settings.locked ? 'opacity-70' : 'cursor-pointer'
              }`}
            >
              <span className="min-w-0">
                <span className="block font-medium text-[var(--ink-primary)] text-sm">{rule.label}</span>
                {rule.hint && <span className="block text-xs text-[var(--ink-muted)]">{rule.hint}</span>}
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
        <SectionHeader as="h4" title="Backup" meta={slotLabel} />

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" data-office-ui="true" onClick={onExport}>
            <IconSave className="w-3.5 h-3.5 text-[var(--ink-secondary)] shrink-0" />
            <span>Export</span>
          </Button>

          <Button variant="secondary" data-office-ui="true" onClick={() => fileInputRef.current?.click()}>
            <IconUpload className="w-3.5 h-3.5 text-[var(--ink-secondary)] shrink-0" />
            <span>Restore</span>
          </Button>
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
          <div role="alert" className="bg-rose-50 rounded-lg px-3 py-2 text-xs font-medium text-rose-800">
            {importError}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap border-t border-[var(--border-subtle)] pt-3">
          <Button variant="secondary" data-office-ui="true" onClick={onOpenExitModal}>
            Exit career
          </Button>

          {!showResetConfirm ? (
            <Button variant="danger" onClick={() => setShowResetConfirm(true)}>
              <IconAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Reset save slot…</span>
            </Button>
          ) : (
            <div className="w-full bg-rose-50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-rose-800">
                Permanently wipes everything in <span className="font-semibold">{slotLabel}</span>.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="danger" onClick={onResetSaveSlot}>
                  Wipe slot
                </Button>
                <Button variant="ghost" data-office-ui="true" onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Page-level save: covers club name, units and rules */}
      <div className="sticky bottom-2 z-20">
        <Button variant="primary" fullWidth data-office-ui="true" onClick={onSaveSettings}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
