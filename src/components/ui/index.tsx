import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Shared UI primitives. Use these instead of hand-styling a heading, tag,
 * button or label/value row on a screen, so every screen reads the same.
 *
 * Type scale: text-xs (12px) is the smallest body size; text-2xs (11px) is
 * reserved for dense table headers and pitch labels. Headings are semibold.
 */

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* -------------------------------------------------------------------------- */
/* Section header: a plain heading, never a pill.                             */
/* -------------------------------------------------------------------------- */

interface SectionHeaderProps {
  title: ReactNode;
  /** Short muted text after the title, e.g. a count or a date. */
  meta?: ReactNode;
  /** One short line under the title. Leave out when the title is clear. */
  description?: ReactNode;
  icon?: ReactNode;
  /** Right-aligned control, e.g. a link or small button. */
  action?: ReactNode;
  as?: 'h2' | 'h3' | 'h4';
  className?: string;
}

export function SectionHeader({
  title,
  meta,
  description,
  icon,
  action,
  as: Tag = 'h3',
  className,
}: SectionHeaderProps) {
  return (
    <div className={cx('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <Tag className="flex items-center gap-2 font-display font-semibold text-base leading-snug text-[var(--ink-primary)]">
          {icon && <span className="shrink-0 text-[var(--ink-secondary)]">{icon}</span>}
          <span className="min-w-0">{title}</span>
          {meta != null && (
            <span className="font-sans font-normal text-sm text-[var(--ink-muted)]">{meta}</span>
          )}
        </Tag>
        {description && (
          <p className="mt-0.5 text-sm leading-snug text-[var(--ink-secondary)]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Eyebrow: the small line above a title. Plain muted text, no box.           */
/* -------------------------------------------------------------------------- */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx('text-xs font-medium text-[var(--ink-muted)]', className)}>{children}</p>
  );
}

/* -------------------------------------------------------------------------- */
/* Tag: a status the player needs to notice. Not for section labels.          */
/* -------------------------------------------------------------------------- */

export type TagTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const TAG_TONES: Record<TagTone, string> = {
  neutral: 'bg-[var(--surface-elevated)] text-[var(--ink-secondary)]',
  success: 'bg-emerald-50 text-emerald-800',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-rose-50 text-rose-800',
  info: 'bg-blue-50 text-blue-800',
};

export function Tag({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: TagTone;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium leading-4 whitespace-nowrap',
        TAG_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'office-action-btn-primary',
  secondary:
    'bg-[var(--surface-card)] text-[var(--ink-primary)] border border-[var(--border-crisp)] hover:bg-[var(--surface-subcard)]',
  ghost: 'bg-transparent text-[var(--ink-secondary)] border border-transparent hover:bg-[var(--surface-subcard)] hover:text-[var(--ink-primary)]',
  danger: 'bg-[var(--surface-card)] text-rose-700 border border-rose-200 hover:bg-rose-50',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-8 px-3 text-xs',
  md: 'min-h-10 px-4 text-sm',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  fullWidth,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold cursor-pointer transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* StatRow: one label and its value on a line.                                */
/* -------------------------------------------------------------------------- */

export function StatRow({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex items-baseline justify-between gap-3 py-1.5 text-sm', className)}>
      <span className="text-[var(--ink-secondary)]">{label}</span>
      <span className="font-medium text-[var(--ink-primary)] text-right tabular-nums">{value}</span>
    </div>
  );
}
