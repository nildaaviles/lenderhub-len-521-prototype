import { ReportingFrequency } from './reporting-frequency.enum';

export type DeltaDirection = 'up' | 'down' | 'flat' | 'no_prior_data';

/**
 * Shared contract for any adaptive delta chip (LEN-567 master rule).
 * Candidate to move to `@cxc/core` — consumed by 6+ cards across the iniciativa.
 */
export interface AdaptiveDelta {
  readonly current: number | null;
  readonly previous: number | null;
  readonly absolute: number | null;
  readonly pct: number | null;
  readonly direction: DeltaDirection;
  readonly reportingFrequency: ReportingFrequency;
}

/**
 * Semantic color schemes for the delta chip.
 * - `standard`: up = green, down = amber (default)
 * - `inverted`: up = amber, down = green (Outstanding Debt — LEN-573)
 * - `neutral`: always grey, sign-only (Avg. Current Balance — LEN-879)
 * - `growth-only`: up = green, down = grey (Total Contracts — LEN-663)
 */
export type DeltaColorScheme = 'standard' | 'inverted' | 'neutral' | 'growth-only';
