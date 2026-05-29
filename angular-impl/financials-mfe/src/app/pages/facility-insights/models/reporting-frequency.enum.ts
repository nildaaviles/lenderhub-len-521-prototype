/**
 * Reporting frequency inferred from cut-off history (LEN-876).
 * Candidate to move to `@cxc/core` — used cross-MFE.
 */
export enum ReportingFrequency {
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
}

export const REPORTING_FREQUENCY_LABEL: Record<ReportingFrequency, string> = {
  [ReportingFrequency.Daily]: 'Daily',
  [ReportingFrequency.Weekly]: 'Weekly',
  [ReportingFrequency.Monthly]: 'Monthly',
};
