'use client';

import React from 'react';
import Link from 'next/link';
import { exportCareerSaveAsJson } from '../../career/saveVault';
import { IconAlert, IconRefresh, IconSave, IconHome } from './GameIcons';

interface CareerErrorBoundaryProps {
  children: React.ReactNode;
  sectionLabel?: string;
  slotId?: string;
  onResetView?: () => void;
}

interface CareerErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class CareerErrorBoundary extends React.Component<
  CareerErrorBoundaryProps,
  CareerErrorBoundaryState
> {
  constructor(props: CareerErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): CareerErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering issue occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(`[CareerErrorBoundary:${this.props.sectionLabel || 'View'}]`, error, info);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onResetView?.();
  };

  private handleSafeBackup = () => {
    const slot = this.props.slotId;
    if (!slot) return;
    const json = exportCareerSaveAsJson(slot);
    if (!json) return;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my11_career_${slot}_emergency_backup.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section
        role="alert"
        className="office-floating-card rounded-3xl p-6 max-w-lg mx-auto my-6 border border-rose-200 bg-white space-y-4 text-left shadow-md"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <IconAlert className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <span className="text-[10px] font-display font-black uppercase tracking-wider text-rose-600 block">
              Safe View Recovery
            </span>
            <h2 className="text-base font-display font-black text-[#0b1536] uppercase">
              {this.props.sectionLabel ? `${this.props.sectionLabel} hit an issue` : 'This view hit an unexpected issue'}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your career progress in local storage is safe. You can reload this panel or export an immediate JSON backup below.
            </p>
            {this.state.errorMessage && (
              <p className="text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 break-words">
                {this.state.errorMessage}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={this.handleRetry}
            className="office-action-btn-primary py-2.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
          >
            <IconRefresh className="w-3.5 h-3.5" />
            <span>Recover View</span>
          </button>

          {this.props.slotId && (
            <button
              type="button"
              onClick={this.handleSafeBackup}
              className="office-subcard py-2.5 px-4 rounded-xl font-display font-bold text-xs text-slate-800 hover:bg-slate-100 inline-flex items-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <IconSave className="w-3.5 h-3.5 text-[#1d5eff]" />
              <span>Export Safe Backup</span>
            </button>
          )}

          <Link
            href="/career"
            className="office-subcard py-2.5 px-4 rounded-xl font-display font-bold text-xs text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1.5 border border-slate-200"
          >
            <IconHome className="w-3.5 h-3.5" />
            <span>Save Slots</span>
          </Link>
        </div>
      </section>
    );
  }
}
