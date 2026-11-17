'use client';

/**
 * Lightweight Web Audio API sound synthesizer for MY-11.
 * Zero external audio files required; degrades silently in SSR, Vitest, or locked autoplay environments.
 */

const SFX_STORAGE_KEY = 'my11_sfx_enabled';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;

  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function isSfxEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(SFX_STORAGE_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export function setSfxEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SFX_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage errors
  }
}

export function toggleSfxEnabled(): boolean {
  const next = !isSfxEnabled();
  setSfxEnabled(next);
  if (next) {
    playUiTap();
  }
  return next;
}

function scheduleTone(
  ctx: AudioContext,
  opts: {
    freq: number;
    endFreq?: number;
    type?: OscillatorType;
    startOffset?: number;
    duration: number;
    gain: number;
  }
) {
  const now = ctx.currentTime + (opts.startOffset || 0);
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = opts.type || 'sine';
  osc.frequency.setValueAtTime(opts.freq, now);
  if (opts.endFreq && opts.endFreq !== opts.freq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.endFreq), now + opts.duration);
  }

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.linearRampToValueAtTime(opts.gain, now + Math.min(0.02, opts.duration * 0.2));
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + opts.duration + 0.02);
}

/** Crisp tactile click for drafts, tabs, and actions */
export function playUiTap(): void {
  if (!isSfxEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  scheduleTone(ctx, { freq: 620, endFreq: 420, type: 'triangle', duration: 0.055, gain: 0.05 });
}

/** Referee single shrill whistle for kick-off */
export function playKickoffWhistle(): void {
  if (!isSfxEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  scheduleTone(ctx, { freq: 2750, endFreq: 2880, type: 'sine', startOffset: 0, duration: 0.24, gain: 0.045 });
  scheduleTone(ctx, { freq: 2920, endFreq: 2790, type: 'triangle', startOffset: 0.02, duration: 0.20, gain: 0.025 });
}

/** Classic double-short + long referee full-time whistle */
export function playFullTimeWhistle(): void {
  if (!isSfxEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  scheduleTone(ctx, { freq: 2780, type: 'sine', startOffset: 0, duration: 0.13, gain: 0.045 });
  scheduleTone(ctx, { freq: 2820, type: 'sine', startOffset: 0.19, duration: 0.13, gain: 0.045 });
  scheduleTone(ctx, { freq: 2860, endFreq: 2740, type: 'sine', startOffset: 0.38, duration: 0.36, gain: 0.05 });
}

/** Stadium celebratory brass-like chord chime for goals */
export function playGoalHorn(): void {
  if (!isSfxEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  scheduleTone(ctx, { freq: 523.25, type: 'triangle', startOffset: 0, duration: 0.18, gain: 0.065 });
  scheduleTone(ctx, { freq: 659.25, type: 'triangle', startOffset: 0.08, duration: 0.22, gain: 0.065 });
  scheduleTone(ctx, { freq: 783.99, type: 'triangle', startOffset: 0.16, duration: 0.34, gain: 0.07 });
}

/** Sharp short whistle for red/yellow card or critical event */
export function playCardRefWhistle(): void {
  if (!isSfxEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  scheduleTone(ctx, { freq: 2650, endFreq: 2450, type: 'sine', startOffset: 0, duration: 0.16, gain: 0.04 });
}

/** Warm two-note confirmation chime when signing a player or closing a transfer deal */
export function playDealAccepted(): void {
  if (!isSfxEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  scheduleTone(ctx, { freq: 587.33, type: 'sine', startOffset: 0, duration: 0.14, gain: 0.055 });
  scheduleTone(ctx, { freq: 880, type: 'sine', startOffset: 0.1, duration: 0.26, gain: 0.06 });
}

/** Ascending triumphant arpeggio for trophies & season milestones */
export function playTrophyFanfare(): void {
  if (!isSfxEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    scheduleTone(ctx, {
      freq,
      type: 'triangle',
      startOffset: i * 0.09,
      duration: i === notes.length - 1 ? 0.45 : 0.18,
      gain: 0.06,
    });
  });
}
