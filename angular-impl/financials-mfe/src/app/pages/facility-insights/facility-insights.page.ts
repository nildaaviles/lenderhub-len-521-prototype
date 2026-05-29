import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { LoaderWrapperComponent, EmptyStatePageComponent } from '@cxc/ui-kit';
import { CutOffDropdownComponent, CutOffOption } from './components/cut-off-header/cut-off-dropdown.component';
import { ReportingFrequencyBadgeComponent } from './components/cut-off-header/reporting-frequency-badge.component';
import { UndrawnCommitmentCardComponent } from './components/critical-signals/undrawn-commitment-card.component';
import { AccountBalanceStatusComponent } from './components/critical-signals/account-balance-status.component';
import { AgingSectionComponent } from './components/aging-section/aging-section.component';
import { FacilityInsightsService } from './services/facility-insights.service';
import { ReportingFrequencyService } from './services/reporting-frequency.service';

/**
 * Facility Insights page — assembles all 3 waves of LEN-521.
 * Wave 1 (LEN-567) · Wave 2 (LEN-903) · Wave 3 (LEN-904).
 */
@Component({
  selector: 'app-facility-insights',
  standalone: true,
  imports: [
    LoaderWrapperComponent,
    EmptyStatePageComponent,
    CutOffDropdownComponent,
    ReportingFrequencyBadgeComponent,
    UndrawnCommitmentCardComponent,
    AccountBalanceStatusComponent,
    AgingSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="bg-surface m-6 ml-[256px] mt-[76px] rounded-lg p-6 min-h-[calc(100vh-100px)]">

      <!-- Page header -->
      <header class="flex items-center justify-between flex-wrap gap-4 mb-2">
        <div>
          <h1 class="font-primary text-3xl font-bold text-text m-0">
            {{ facilityName() }} · Facility Insights
          </h1>
          <p class="text-text-secondary text-sm m-0 mt-1">
            Originator: {{ originator() }} · Facility ID
            <span class="font-mono">{{ facilityId() }}</span>
          </p>
        </div>
      </header>

      <!-- Cut-off strip · LEN-876 + LEN-889 -->
      <section class="flex items-center gap-3.5 flex-wrap p-3.5 bg-bg border border-border
                      rounded-lg mb-6">
        <span class="font-primary text-[10px] font-bold tracking-wider uppercase text-text-secondary">
          Cut-off date
        </span>

        <cut-off-dropdown
          [cutOffs]="cutOffOptions()"
          [facilityId]="facilityId()"
          [selected]="selectedCutOff()"
          (selectionChange)="onCutOffChange($event)" />

        <reporting-frequency-badge
          [frequency]="reportingFrequency()"
          [facilityId]="facilityId()"
          [medianDeltaDays]="medianDeltaDays()"
          [cutOffDate]="activeCutOffIso()" />
      </section>

      <!-- Wave 3 · Critical signals (loader-wrapped) -->
      <loader-wrapper [loaderKey]="'facility-insights-undrawn'">
        @if (undrawnData(); as undrawn) {
          <section class="mb-8">
            <undrawn-commitment-card [data]="undrawn" />
          </section>
        }
      </loader-wrapper>

      <loader-wrapper [loaderKey]="'facility-insights-account-balance'">
        @if (accountBalanceData(); as accBal) {
          <section class="mb-8">
            <account-balance-status [data]="accBal" />
          </section>
        } @else {
          <empty-state-page
            title="No data available for this period"
            icon="ph-cloud-slash" />
        }
      </loader-wrapper>

      <!-- Wave 2 · Aging -->
      <loader-wrapper [loaderKey]="'facility-insights-aging'">
        @if (agingData(); as aging) {
          <section class="mb-8">
            <aging-section [data]="aging" />
          </section>
        }
      </loader-wrapper>

    </main>
  `,
})
export class FacilityInsightsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly insightsService = inject(FacilityInsightsService);
  private readonly frequencyService = inject(ReportingFrequencyService);

  // URL params
  protected readonly facilityId = signal<string>('FAC-2024-COV-2241');
  protected readonly facilityName = signal<string>('F-2241 Covalto');
  protected readonly originator = signal<string>('LeaseMD');

  // Cut-off state
  protected readonly cutOffOptions = signal<readonly CutOffOption[]>([]);
  protected readonly selectedCutOff = signal<CutOffOption | null>(null);
  protected readonly activeCutOffIso = computed(() =>
    this.selectedCutOff()?.date.toISOString().slice(0, 10) ?? '',
  );

  // Frequency inference (LEN-876) — derived on the client from cut-off history.
  protected readonly reportingFrequency = computed(() =>
    this.frequencyService.infer(this.cutOffOptions().map((c) => c.date)),
  );

  protected readonly medianDeltaDays = computed<number | null>(() => {
    const dates = this.cutOffOptions().map((c) => c.date.getTime()).sort((a, b) => b - a);
    if (dates.length < 2) return null;
    const deltas: number[] = [];
    for (let i = 0; i < Math.min(dates.length - 1, 6); i++) {
      deltas.push((dates[i] - dates[i + 1]) / 86_400_000);
    }
    const sorted = [...deltas].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  });

  // Data streams — re-fired on cut-off change.
  private readonly cutOffSignal = computed(() => this.activeCutOffIso());

  protected readonly undrawnData = toSignal(
    toObservable(this.cutOffSignal).pipe(
      switchMap((cutOff) =>
        this.insightsService.getUndrawnCommitment(this.facilityId(), cutOff),
      ),
    ),
  );

  protected readonly accountBalanceData = toSignal(
    toObservable(this.cutOffSignal).pipe(
      switchMap((cutOff) =>
        this.insightsService.getAccountBalance(this.facilityId(), cutOff),
      ),
    ),
  );

  protected readonly agingData = toSignal(
    toObservable(this.cutOffSignal).pipe(
      switchMap((cutOff) => this.insightsService.getAging(this.facilityId(), cutOff)),
    ),
  );

  protected onCutOffChange(option: CutOffOption): void {
    this.selectedCutOff.set(option);
  }
}

// (toObservable import omitted at top for brevity — real code imports from `@angular/core/rxjs-interop`)
import { toObservable } from '@angular/core/rxjs-interop';
