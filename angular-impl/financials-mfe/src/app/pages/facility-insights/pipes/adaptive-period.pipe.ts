import { Pipe, PipeTransform } from '@angular/core';
import { ReportingFrequency } from '../models/reporting-frequency.enum';

/**
 * Master rule of the iniciativa (LEN-567).
 * Renders the period reference for any delta chip — NEVER hardcode "MoM"/"WoW"
 * NEVER use explicit dates ("vs. Mar 2026") in the chip itself.
 */
@Pipe({ name: 'adaptivePeriod', standalone: true, pure: true })
export class AdaptivePeriodPipe implements PipeTransform {
  private static readonly MAP: Record<ReportingFrequency, string> = {
    [ReportingFrequency.Daily]: 'vs. prior day',
    [ReportingFrequency.Weekly]: 'vs. prior week',
    [ReportingFrequency.Monthly]: 'vs. prior month',
  };

  transform(frequency: ReportingFrequency | null | undefined): string {
    if (!frequency) return '';
    return AdaptivePeriodPipe.MAP[frequency] ?? '';
  }
}
