'use client';

import React from 'react';
import Link from 'next/link';
import { exportCareerSaveAsJson } from '../../career/saveVault';
import { IconAlert, IconRefresh, IconSave, IconHome } from './GameIcons';
import { Button, Eyebrow } from '@/components/ui';

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
        className="office-floating-card rounded-xl p-5 sm:p-6 max-w-lg mx-auto my-6 border border-[var(--border-subtle)] bg-[var(--surface-card)] space-y-4 text-left"
      >
        <div className="space-y-1">
          <Eyebrow>Safe view recovery</Eyebrow>
          <h2 className="flex items-start gap-2 text-base font-display font-semibold text-[var(--ink-primary)]">
            <IconAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <span className="min-w-0">
              {this.props.sectionLabel ? `${this.props.sectionLabel} hit an issue` : 'This view hit an unexpected issue'}
            </span>
          </h2>
          <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
            Your career progress in local storage is safe. You can reload this panel or export a JSON backup below.
          </p>
          {this.state.errorMessage && (
            <p className="text-xs tabular-nums text-[var(--ink-secondary)] bg-[var(--surface-subcard)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 break-words">
              {this.state.errorMessage}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="primary" onClick={this.handleRetry}>
            <IconRefresh className="w-3.5 h-3.5" />
            <span>Recover view</span>
          </Button>

          {this.props.slotId && (
            <Button variant="secondary" onClick={this.handleSafeBackup}>
              <IconSave className="w-3.5 h-3.5 text-[var(--ink-secondary)]" />
              <span>Export backup</span>
            </Button>
          )}

          <Link
            href="/career"
            className="inline-flex items-center justify-center gap-2 min-h-10 px-4 rounded-lg text-sm font-semibold bg-[var(--surface-card)] text-[var(--ink-primary)] border border-[var(--border-crisp)] hover:bg-[var(--surface-subcard)]"
          >
            <IconHome className="w-3.5 h-3.5 text-[var(--ink-secondary)]" />
            <span>Save slots</span>
          </Link>
        </div>
      </section>
    );
  }
}
