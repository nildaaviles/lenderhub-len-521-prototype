import { Injectable } from '@angular/core';
import { ReportingFrequency } from '../models/reporting-frequency.enum';

/**
 * Infers the reporting frequency of a facility from its cut-off history (LEN-876).
 * Uses the MEDIAN of deltas between the last 6 consecutive cut-offs.
 * Median chosen over mean — robust to missing cuts, holidays, late submissions.
 */
@Injectable({ providedIn: 'root' })
export class ReportingFrequencyService {
  private static readonly DAY_MS = 86_400_000;
  private static readonly WINDOW = 6;

  /**
   * Returns the inferred frequency or `null` when:
   *  - fewer than 2 cut-offs available
   *  - the median delta falls outside the defined buckets
   *
   * Buckets per LEN-876 spec:
   *  - daily   ≤ 2 days
   *  - weekly  5–9 days
   *  - monthly 25–35 days
   */
  infer(cutOffDates: readonly Date[]): ReportingFrequency | null {
    if (cutOffDates.length < 2) return null;

    const sorted = [...cutOffDates]
      .map((d) => d.getTime())
      .sort((a, b) => b - a)
      .slice(0, ReportingFrequencyService.WINDOW);

    const deltas: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const days = (sorted[i] - sorted[i + 1]) / ReportingFrequencyService.DAY_MS;
      deltas.push(days);
    }

    const median = this.medianOf(deltas);

    if (median <= 2) return ReportingFrequency.Daily;
    if (median >= 5 && median <= 9) return ReportingFrequency.Weekly;
    if (median >= 25 && median <= 35) return ReportingFrequency.Monthly;
    return null;
  }

  private medianOf(values: readonly number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    if (n === 0) return NaN;
    const mid = Math.floor(n / 2);
    return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }
}
