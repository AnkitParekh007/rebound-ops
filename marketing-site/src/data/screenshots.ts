/**
 * Screenshot manifest, written only by scripts/capture-app-screenshots.mjs.
 * REQUIRED_VIEWS is the set of app views the preview page must show once capture has run;
 * tests/unit/screenshots.test.mjs fails if a captured manifest misses any of them or any file.
 */
import manifest from './screenshots.json';

export const REQUIRED_VIEWS = [
  { id: 'onboarding', title: 'Onboarding' },
  { id: 'dashboard', title: 'Overview dashboard' },
  { id: 'discover', title: 'Discover' },
  { id: 'assessment', title: 'Fit assessment' },
  { id: 'documents', title: 'Resume and cover letter' },
  { id: 'tracker', title: 'Tracker' },
  { id: 'ai-assist', title: 'AI assist' },
  { id: 'settings', title: 'Backup and settings' },
] as const;

export interface ShotFile { avif: string; webp: string; width: number; height: number }
export interface Shot { id: string; title: string; alt: string; caption: string; desktop: ShotFile; mobile: ShotFile }
export interface Manifest {
  status: 'pending' | 'captured';
  note?: string;
  source: null | { tag: string; commit: string; capturedAt: string; dataset: string; browser: string };
  shots: Shot[];
}

export const SCREENSHOTS = manifest as Manifest;
