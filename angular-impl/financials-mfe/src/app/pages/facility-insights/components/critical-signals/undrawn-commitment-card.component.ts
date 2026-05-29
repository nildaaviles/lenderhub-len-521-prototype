import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { HumanizeNumberPipe } from '@cxc/ui-kit';
import { PendoService } from '@cxc/core';
import { DeltaChipComponent } from '../shared/delta-chip.component';
import { AdaptiveDelta } from '../../models/delta.model';

export interface UndrawnCommitmentData {
  readonly facilityId: string;
  readonly reportDate: string;
  readonly maxCreditAmount: number;
  readonly outstandingDebt: number;
  readonly undrawnCommitment: number;
  readonly delta: AdaptiveDelta;
}

/**
 * LEN-568 — Undrawn Commitment card with delta vs. prior period and utilization bar.
 * Overadvance state (Outstanding > Max Credit) renders red with explicit message —
 * the ONLY case where red is used on this card (breach real).
 */
@Component({
  selector: 'undrawn-commitment-card',
  standalone: true,
  imports: [NgClass, HumanizeNumberPipe, DeltaChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="bg-bg border border-border rounded-xl p-5">
      <header class="flex items-center gap-2 mb-2">
        <h3 class="text-base font-bold text-text font-primary">Undrawn Commitment</h3>
        <i class="ph ph-info text-text-muted cursor-help"
           [pTooltip]="tooltipCopy"
           aria-label="Definition"></i>
        @if (isOveradvance()) {
          <span class="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded
                       bg-danger text-white text-[10px] font-bold font-primary tracking-wider">
            <i class="ph ph-warning text-[10px]"></i> OVERADVANCE
          </span>
        } @else if (isLowHeadroom()) {
          <span class="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                       bg-danger-bg text-danger text-xs font-bold font-primary">
            <i class="ph ph-warning text-xs"></i> Low headroom
          </span>
        }
      </header>

      <div class="flex items-baseline gap-3 flex-wrap">
        @if (isOveradvance()) {
          <span class="text-3xl font-bold text-danger font-mono">
            Overadvance −${{ data().outstandingDebt - data().maxCreditAmount | humanizeNumber }}
          </span>
        } @else {
          <span class="text-3xl font-bold text-text font-mono">
            ${{ data().undrawnCommitment | humanizeNumber }}
          </span>
          <delta-chip
            [delta]="data().delta"
            colorScheme="standard"
            format="currency"
            [showPct]="true" />
        }
      </div>

      <!-- Utilization bar -->
      <div class="mt-3">
        <div class="relative h-2 bg-border rounded-full overflow-hidden"
             role="progressbar"
             [attr.aria-valuenow]="drawnPct()"
             aria-valuemin="0"
             aria-valuemax="100"
             [attr.aria-label]="utilizationAria()">
          <div class="absolute inset-y-0 left-0 bg-primary rounded-full"
               [ngClass]="{ '!bg-danger': isOveradvance() }"
               [style.width.%]="Math.min(drawnPct(), 100)"></div>
        </div>
        <div class="flex justify-between items-baseline mt-1.5">
          <span class="font-primary font-bold text-sm text-text">
            {{ drawnPct().toFixed(1) }}% drawn of commitment
          </span>
          <span class="text-xs text-text-secondary font-mono">
            Drawn ${{ data().outstandingDebt | humanizeNumber }} /
            Undrawn ${{ data().undrawnCommitment | humanizeNumber }}
          </span>
        </div>
      </div>
    </article>
  `,
})
export class UndrawnCommitmentCardComponent {
  private readonly pendoService = inject(PendoService);

  readonly data = input.required<UndrawnCommitmentData>();
  protected readonly Math = Math;

  /** Exact tooltip per LEN-568 CA. */
  protected readonly tooltipCopy =
    'The portion of the facility commitment not yet drawn. Calculated as Max Credit Amount − Outstanding Debt.';

  protected readonly drawnPct = computed(() => {
    const d = this.data();
    if (!d.maxCreditAmount) return 0;
    return (d.outstandingDebt / d.maxCreditAmount) * 100;
  });

  protected readonly isOveradvance = computed(
    () => this.data().outstandingDebt > this.data().maxCreditAmount,
  );

  protected readonly isLowHeadroom = computed(() => {
    const d = this.data();
    if (this.isOveradvance()) return false;
    return d.undrawnCommitment / d.maxCreditAmount < 0.1;
  });

  protected utilizationAria(): string {
    return `${this.drawnPct().toFixed(1)} percent drawn of facility commitment`;
  }

  constructor() {
    effect(() => {
      const d = this.data();
      this.pendoService.trackEvent('undrawn_commitment_card_viewed', {
        facility_id: d.facilityId,
        report_date: d.reportDate,
        undrawn_commitment: d.undrawnCommitment,
        has_delta: d.delta.direction !== 'no_prior_data',
        reporting_frequency: d.delta.reportingFrequency,
        is_overadvance: this.isOveradvance(),
      });

      if (this.isLowHeadroom()) {
        this.pendoService.trackEvent('health_signal_triggered', {
          trigger: 'low_headroom',
          facility_id: d.facilityId,
          cut_off_date: d.reportDate,
          undrawn_pct_of_max: (d.undrawnCommitment / d.maxCreditAmount) * 100,
        });
      }
    });
  }
}
