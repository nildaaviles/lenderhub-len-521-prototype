import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { HumanizeNumberPipe } from '@cxc/ui-kit';
import { AdaptivePeriodPipe } from '../../pipes/adaptive-period.pipe';
import { AdaptiveDelta, DeltaColorScheme } from '../../models/delta.model';

type ChipVariant = 'positive' | 'negative' | 'flat' | 'no-prior';

/**
 * Single source of truth for all delta chips in Facility Insights.
 * Consumes the AdaptiveDelta contract; renders icon + value + (% optional) + period label.
 *
 * Used by: LEN-572, LEN-573, LEN-663, LEN-879, LEN-568, LEN-578, LEN-886, LEN-662.
 */
@Component({
  selector: 'delta-chip',
  standalone: true,
  imports: [NgClass, HumanizeNumberPipe, AdaptivePeriodPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (variant() === 'no-prior') {
      <span class="italic text-text-muted text-xs">No prior period data</span>
    } @else {
      <span
        class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold font-primary"
        [ngClass]="chipClasses()">
        <i class="ph" [ngClass]="iconClass()" aria-hidden="true"></i>
        <span>{{ formattedValue() }}</span>
        @if (showPct() && delta().pct !== null) {
          <span>({{ signedPct() }}%)</span>
        }
        <span class="font-normal opacity-90 ml-0.5">
          {{ delta().reportingFrequency | adaptivePeriod }}
        </span>
      </span>
    }
  `,
})
export class DeltaChipComponent {
  /** Delta payload — required. */
  readonly delta = input.required<AdaptiveDelta>();

  /** Color scheme — defaults to `standard`. */
  readonly colorScheme = input<DeltaColorScheme>('standard');

  /** Show the percentage alongside the absolute value. */
  readonly showPct = input<boolean>(true);

  /** Format hint — `currency`, `count`, `percentage_points`. */
  readonly format = input<'currency' | 'count' | 'pp'>('currency');

  protected readonly variant = computed<ChipVariant>(() => {
    const d = this.delta();
    if (d.direction === 'no_prior_data' || d.absolute === null) return 'no-prior';
    if (d.absolute === 0) return 'flat';
    return d.absolute > 0 ? 'positive' : 'negative';
  });

  protected readonly chipClasses = computed(() => {
    const v = this.variant();
    const scheme = this.colorScheme();

    if (v === 'flat') return 'bg-slate-100 text-text-secondary';
    if (scheme === 'neutral') return 'bg-slate-100 text-text-secondary';
    if (scheme === 'growth-only') {
      return v === 'positive'
        ? 'bg-success-bg text-success'
        : 'bg-slate-100 text-text-secondary';
    }
    if (scheme === 'inverted') {
      return v === 'positive'
        ? 'bg-warning-bg text-warning'
        : 'bg-success-bg text-success';
    }
    return v === 'positive'
      ? 'bg-success-bg text-success'
      : 'bg-warning-bg text-warning';
  });

  protected readonly iconClass = computed(() => {
    const v = this.variant();
    if (v === 'flat') return 'ph-minus';
    return v === 'positive' ? 'ph-arrow-up' : 'ph-arrow-down';
  });

  protected readonly formattedValue = computed(() => {
    const d = this.delta();
    if (d.absolute === null) return '';
    const sign = d.absolute > 0 ? '+' : d.absolute < 0 ? '−' : '';
    const abs = Math.abs(d.absolute);
    if (this.format() === 'pp') return `${sign}${abs.toFixed(2)} pp`;
    if (this.format() === 'count') return `${sign}${abs.toLocaleString('en-US')}`;
    // currency formatting handled via HumanizeNumber pipe in template would lose sign;
    // we render explicitly to keep sign + magnitude consistent.
    return `${sign}$${this.humanize(abs)}`;
  });

  protected readonly signedPct = computed(() => {
    const pct = this.delta().pct;
    if (pct === null || pct === undefined) return '';
    const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
    return `${sign}${Math.abs(pct).toFixed(1)}`;
  });

  private humanize(value: number): string {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  }
}
