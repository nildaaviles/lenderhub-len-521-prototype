import { ChangeDetectionStrategy, Component, OnInit, effect, inject, input } from '@angular/core';
import { PendoService } from '@cxc/core';
import { ReportingFrequency, REPORTING_FREQUENCY_LABEL } from '../../models/reporting-frequency.enum';

/**
 * LEN-876 — Reporting Frequency badge next to the Cut-Off Date filter.
 * Renders Daily / Weekly / Monthly. Does NOT render when frequency is null
 * (insufficient history or out-of-range median).
 */
@Component({
  selector: 'reporting-frequency-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (frequency()) {
      <span
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
               bg-info-bg text-info text-xs font-bold font-primary"
        role="status"
        [attr.aria-label]="ariaLabel()"
        (mouseenter)="onTooltipHover()">
        <i class="ph ph-clock-counter-clockwise text-xs" aria-hidden="true"></i>
        <span>{{ label() }}</span>
        <span
          class="sr-only"
          [pTooltip]="tooltipCopy">
        </span>
      </span>
    }
  `,
})
export class ReportingFrequencyBadgeComponent implements OnInit {
  private readonly pendoService = inject(PendoService);

  readonly frequency = input<ReportingFrequency | null>(null);
  readonly facilityId = input.required<string>();
  readonly medianDeltaDays = input<number | null>(null);
  readonly cutOffDate = input.required<string>();

  /** Exact tooltip copy required by LEN-876 CA. */
  protected readonly tooltipCopy = 'Inferred from the cut-off history of this facility.';

  constructor() {
    // Pendo Dev event — fires on every render when the badge is visible.
    effect(() => {
      const freq = this.frequency();
      if (!freq) return;
      this.pendoService.trackEvent('facility_reporting_frequency_viewed', {
        facility_id: this.facilityId(),
        frequency: freq,
        median_delta_days: this.medianDeltaDays(),
        cut_off_date: this.cutOffDate(),
      });
    });
  }

  ngOnInit(): void {
    /* effect handles tracking */
  }

  protected label(): string {
    const f = this.frequency();
    return f ? REPORTING_FREQUENCY_LABEL[f] : '';
  }

  protected ariaLabel(): string {
    return `Reporting frequency: ${this.label()}. ${this.tooltipCopy}`;
  }

  protected onTooltipHover(): void {
    this.pendoService.trackEvent('facility_reporting_frequency_tooltip_hover', {
      facility_id: this.facilityId(),
      frequency: this.frequency(),
    });
  }
}
