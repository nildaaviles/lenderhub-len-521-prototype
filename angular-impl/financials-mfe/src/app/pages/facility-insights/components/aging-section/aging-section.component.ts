import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import {
  ChartComponent,
  ChartLegendsComponent,
  HumanizeNumberPipe,
  TruncateDecimalsPipe,
} from '@cxc/ui-kit';
import { PendoService } from '@cxc/core';
import { DeltaChipComponent } from '../shared/delta-chip.component';
import { ReportingFrequency } from '../../models/reporting-frequency.enum';

export interface AgingHistoricalPoint {
  readonly reportDate: string;
  readonly delinquent30Pct: number;
  readonly delinquent30AmountUsdM: number;
  readonly delinquent90Pct: number;
  readonly delinquent90AmountUsdM: number;
  readonly buckets: {
    readonly current: number;
    readonly d1_30: number;
    readonly d31_60: number;
    readonly d61_90: number;
    readonly d91_120: number;
    readonly d121_150: number;
    readonly d151_180: number;
    readonly d180_plus: number;
  };
}

export interface AgingData {
  readonly facilityId: string;
  readonly reportDate: string;
  readonly reportingFrequency: ReportingFrequency;
  readonly history: readonly AgingHistoricalPoint[];   // chronological asc; last item = active cut
  readonly delta30Pp: number | null;
  readonly delta30Usd: number | null;
  readonly delta90Pp: number | null;
  readonly delta90Usd: number | null;
}

type UnitMode = '%' | '$';

/**
 * LEN-578 — Aging enhancement: KPI cards 30+/90+, Rising trend badge, overlay lines, toggle %/$.
 *
 * Rising trend rule (STRICT): badge fires ONLY when last 5 values of delinquent_90_pct
 * satisfy c[t-4] < c[t-3] < c[t-2] < c[t-1] < c[t]. No equality, no reversal.
 */
@Component({
  selector: 'aging-section',
  standalone: true,
  imports: [
    NgClass,
    ChartComponent,
    ChartLegendsComponent,
    HumanizeNumberPipe,
    TruncateDecimalsPipe,
    DeltaChipComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="bg-surface border border-border rounded-xl p-4">
      <header class="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div class="flex items-center gap-2.5">
          <h3 class="font-primary text-base font-bold uppercase tracking-wider text-text">Aging</h3>
          @if (risingTrendActive()) {
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                         bg-danger-bg text-danger border border-red-200
                         text-xs font-semibold font-primary">
              <i class="ph ph-trend-up text-xs"></i> Rising trend · 5 cuts on 90+
            </span>
          }
        </div>
      </header>

      <div class="grid grid-cols-2 gap-4">
        <!-- KPI cards 30+/90+ -->
        <div class="flex flex-col gap-3">
          <!-- 30+ -->
          <div class="rounded-xl border border-amber-200 bg-warning-bg p-4">
            <div class="flex items-center gap-1.5 mb-2">
              <h4 class="font-primary text-sm font-semibold text-warning">Delinquent 30+</h4>
              <i class="ph ph-info text-text-muted cursor-help"
                 pTooltip="Receivables 30+ days past due ÷ outstanding total"></i>
            </div>
            <div class="flex items-end gap-3 justify-between">
              <div>
                <div class="text-2xl font-bold font-mono">
                  {{ activePoint().delinquent30Pct | truncateDecimals: 2 }}%
                </div>
                <div class="text-xs text-text-secondary font-mono">
                  ${{ activePoint().delinquent30AmountUsdM | humanizeNumber }}M USD
                </div>
              </div>
              <svg viewBox="0 0 100 32" width="90" height="32">
                <polyline [attr.points]="sparkline30Pts()"
                          fill="none" stroke="#B45309" stroke-width="1.8"/>
                <circle [attr.cx]="sparklineLastX(30)" [attr.cy]="sparklineLastY(30)"
                        r="2.5" fill="#B45309"/>
              </svg>
            </div>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <delta-chip
                [delta]="delta30PpAsDelta()"
                colorScheme="standard"
                format="pp"
                [showPct]="false" />
              <delta-chip
                [delta]="delta30UsdAsDelta()"
                colorScheme="standard"
                format="currency"
                [showPct]="false" />
            </div>
          </div>

          <!-- 90+ -->
          <div class="rounded-xl p-4 border"
               [ngClass]="alertActive()
                 ? 'bg-danger-bg border-red-200'
                 : 'bg-warning-bg border-amber-200'">
            <div class="flex items-center gap-1.5 mb-2">
              <h4 class="font-primary text-sm font-semibold"
                  [ngClass]="alertActive() ? 'text-danger' : 'text-warning'">
                Delinquent 90+
              </h4>
              <i class="ph ph-info text-text-muted cursor-help"
                 pTooltip="Receivables 90+ days past due ÷ outstanding total · Covenant max: 8%"></i>
              @if (alertActive()) {
                <span class="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded
                             bg-danger text-white text-[10px] font-bold font-primary tracking-wider">
                  <i class="ph ph-warning text-[10px]"></i> ALERT
                </span>
              }
            </div>
            <div class="flex items-end gap-3 justify-between">
              <div>
                <div class="text-2xl font-bold font-mono"
                     [ngClass]="{ 'text-danger': alertActive() }">
                  {{ activePoint().delinquent90Pct | truncateDecimals: 2 }}%
                </div>
                <div class="text-xs text-text-secondary font-mono">
                  ${{ activePoint().delinquent90AmountUsdM | humanizeNumber }}M USD
                </div>
              </div>
              <svg viewBox="0 0 100 32" width="90" height="32">
                <polyline [attr.points]="sparkline90Pts()"
                          fill="none" stroke="#DC2626" stroke-width="1.8"/>
                <circle [attr.cx]="sparklineLastX(90)" [attr.cy]="sparklineLastY(90)"
                        r="2.5" fill="#DC2626"/>
              </svg>
            </div>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <delta-chip
                [delta]="delta90PpAsDelta()"
                [colorScheme]="alertActive() ? 'standard' : 'standard'"
                format="pp"
                [showPct]="false" />
              <delta-chip
                [delta]="delta90UsdAsDelta()"
                colorScheme="standard"
                format="currency"
                [showPct]="false" />
            </div>
          </div>
        </div>

        <!-- Chart with toggle %/$ + overlays -->
        <div class="bg-bg border border-border rounded-lg p-3.5">
          <div class="flex justify-between items-center mb-1.5">
            <span class="text-xs text-text-secondary font-primary font-semibold">
              Distribution by bucket — last {{ data().history.length }} cuts
            </span>
            <div class="inline-flex bg-bg border border-border rounded p-0.5" role="tablist">
              <button type="button"
                      class="px-3 py-1 text-xs rounded font-primary font-semibold transition"
                      [ngClass]="unitMode() === '%'
                        ? 'bg-surface text-secondary shadow-sm'
                        : 'text-text-secondary'"
                      (click)="toggleUnit('%')">%</button>
              <button type="button"
                      class="px-3 py-1 text-xs rounded font-primary font-semibold transition"
                      [ngClass]="unitMode() === '$'
                        ? 'bg-surface text-secondary shadow-sm'
                        : 'text-text-secondary'"
                      (click)="toggleUnit('$')">$</button>
            </div>
          </div>

          <chart
            [data]="chartData()"
            [options]="chartOptions()"
            type="bar"
            (hoverDataPoint)="onChartHover($event)"
            (legendToggle)="onLegendToggle($event)" />

          <chart-legends [items]="legendItems()" />

          <div class="text-xs text-text-secondary mt-1.5">
            {{ unitMode() === '%'
              ? 'Monthly cuts · % of total portfolio balance'
              : 'Monthly cuts · USD millions' }}
          </div>
        </div>
      </div>
    </article>
  `,
})
export class AgingSectionComponent {
  private readonly pendoService = inject(PendoService);

  readonly data = input.required<AgingData>();
  protected readonly unitMode = signal<UnitMode>('%');

  protected readonly activePoint = computed(
    () => this.data().history[this.data().history.length - 1],
  );

  /** STRICT rising trend rule per LEN-578 CA Bloque B. */
  protected readonly risingTrendActive = computed<boolean>(() => {
    const history = this.data().history;
    if (history.length < 5) return false;
    const last5 = history.slice(-5).map((h) => h.delinquent90Pct);
    for (let i = 1; i < last5.length; i++) {
      if (last5[i - 1] >= last5[i]) return false;
    }
    return true;
  });

  protected readonly alertActive = computed(
    () => this.activePoint().delinquent90Pct >= 8.0,
  );

  // Delta wrappers — adapted to AdaptiveDelta so DeltaChipComponent stays generic.
  protected readonly delta30PpAsDelta = computed(() => ({
    current: this.activePoint().delinquent30Pct,
    previous: null,
    absolute: this.data().delta30Pp,
    pct: null,
    direction: this.dirOf(this.data().delta30Pp),
    reportingFrequency: this.data().reportingFrequency,
  }));

  protected readonly delta30UsdAsDelta = computed(() => ({
    current: this.activePoint().delinquent30AmountUsdM,
    previous: null,
    absolute: this.data().delta30Usd,
    pct: null,
    direction: this.dirOf(this.data().delta30Usd),
    reportingFrequency: this.data().reportingFrequency,
  }));

  protected readonly delta90PpAsDelta = computed(() => ({
    current: this.activePoint().delinquent90Pct,
    previous: null,
    absolute: this.data().delta90Pp,
    pct: null,
    direction: this.dirOf(this.data().delta90Pp),
    reportingFrequency: this.data().reportingFrequency,
  }));

  protected readonly delta90UsdAsDelta = computed(() => ({
    current: this.activePoint().delinquent90AmountUsdM,
    previous: null,
    absolute: this.data().delta90Usd,
    pct: null,
    direction: this.dirOf(this.data().delta90Usd),
    reportingFrequency: this.data().reportingFrequency,
  }));

  // Sparklines (last 5 points each, normalized to 100×32 SVG box).
  protected readonly sparkline30Pts = computed(() =>
    this.spark(this.data().history.map((h) => h.delinquent30Pct)),
  );
  protected readonly sparkline90Pts = computed(() =>
    this.spark(this.data().history.map((h) => h.delinquent90Pct)),
  );

  protected sparklineLastX(_kind: 30 | 90): number {
    return 100;
  }
  protected sparklineLastY(kind: 30 | 90): number {
    const series =
      kind === 30
        ? this.data().history.map((h) => h.delinquent30Pct)
        : this.data().history.map((h) => h.delinquent90Pct);
    return this.normalize(series[series.length - 1], series);
  }

  // Chart.js dataset construction — uses @cxc/ui-kit <chart> wrapper.
  protected readonly chartData = computed(() => {
    const mode = this.unitMode();
    const history = this.data().history;
    const fmt = (n: number) => (mode === '%' ? n : n / 1_000_000);

    return {
      labels: history.map((h) =>
        new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(
          new Date(h.reportDate),
        ),
      ),
      datasets: [
        { label: 'Current', backgroundColor: '#1E3A8A', stack: 'aging',
          data: history.map((h) => fmt(h.buckets.current)) },
        { label: '1-30',    backgroundColor: '#0E7490', stack: 'aging',
          data: history.map((h) => fmt(h.buckets.d1_30)) },
        { label: '31-60',   backgroundColor: '#A16207', stack: 'aging',
          data: history.map((h) => fmt(h.buckets.d31_60)) },
        { label: '61-90',   backgroundColor: '#C2410C', stack: 'aging',
          data: history.map((h) => fmt(h.buckets.d61_90)) },
        { label: '91-120',  backgroundColor: '#DC2626', stack: 'aging',
          data: history.map((h) => fmt(h.buckets.d91_120)) },
        { label: '121-150', backgroundColor: '#B91C1C', stack: 'aging',
          data: history.map((h) => fmt(h.buckets.d121_150)) },
        { label: '151-180', backgroundColor: '#991B1B', stack: 'aging',
          data: history.map((h) => fmt(h.buckets.d151_180)) },
        { label: '180+',    backgroundColor: '#7F1D1D', stack: 'aging',
          data: history.map((h) => fmt(h.buckets.d180_plus)) },
        // Overlays
        { label: '30+ acum.', type: 'line', borderColor: '#B45309',
          borderWidth: 2.5, pointRadius: 4, fill: false,
          data: history.map((h) => fmt(h.delinquent30AmountUsdM * (mode === '%' ? 1 : 1_000_000))) },
        { label: '90+ acum.', type: 'line', borderColor: '#DC2626',
          borderWidth: 2, borderDash: [5, 3], pointRadius: 4, fill: false,
          data: history.map((h) => fmt(h.delinquent90AmountUsdM * (mode === '%' ? 1 : 1_000_000))) },
      ],
    };
  });

  protected readonly chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { stacked: true },
      y: {
        stacked: true,
        beginAtZero: true,
        max: this.unitMode() === '%' ? 100 : undefined,
      },
    },
  }));

  protected readonly legendItems = computed(() => [
    { label: 'Current', color: '#1E3A8A' },
    { label: '1-30', color: '#0E7490' },
    { label: '31-60', color: '#A16207' },
    { label: '61-90', color: '#C2410C' },
    { label: '91-120', color: '#DC2626' },
    { label: '121-150', color: '#B91C1C' },
    { label: '151-180', color: '#991B1B' },
    { label: '180+', color: '#7F1D1D' },
  ]);

  protected toggleUnit(mode: UnitMode): void {
    const from = this.unitMode();
    if (from === mode) return;
    this.unitMode.set(mode);
    this.pendoService.trackEvent('aging_toggle_clicked', {
      facility_id: this.data().facilityId,
      from_unit: from,
      to_unit: mode,
    });
  }

  protected onChartHover(event: { point_date: string; bucket_or_line: string }): void {
    this.pendoService.trackEvent('aging_chart_interacted', {
      facility_id: this.data().facilityId,
      ...event,
    });
  }

  protected onLegendToggle(event: { dataset_label: string; now_visible: boolean }): void {
    this.pendoService.trackEvent('aging_legend_toggled', {
      facility_id: this.data().facilityId,
      ...event,
    });
  }

  private dirOf(v: number | null): 'up' | 'down' | 'flat' | 'no_prior_data' {
    if (v === null) return 'no_prior_data';
    if (v > 0) return 'up';
    if (v < 0) return 'down';
    return 'flat';
  }

  private spark(series: readonly number[]): string {
    if (series.length === 0) return '';
    const step = 100 / (series.length - 1);
    return series.map((v, i) => `${(i * step).toFixed(1)},${this.normalize(v, series)}`).join(' ');
  }

  private normalize(value: number, series: readonly number[]): number {
    const min = Math.min(...series);
    const max = Math.max(...series);
    if (max === min) return 16;
    return 28 - ((value - min) / (max - min)) * 24;
  }

  constructor() {
    effect(() => {
      const d = this.data();
      const point = this.activePoint();
      this.pendoService.trackEvent('aging_section_viewed', {
        facility_id: d.facilityId,
        report_date: d.reportDate,
        delinquent_30_pct: point.delinquent30Pct,
        delinquent_30_amount_usd_m: point.delinquent30AmountUsdM,
        delinquent_90_pct: point.delinquent90Pct,
        delinquent_90_amount_usd_m: point.delinquent90AmountUsdM,
        alert_active: this.alertActive(),
        rising_trend_active: this.risingTrendActive(),
        reporting_frequency: d.reportingFrequency,
        history_cuts: d.history.length,
        unit_mode: this.unitMode(),
      });

      if (this.alertActive()) {
        this.pendoService.trackEvent('aging_alert_detected', {
          facility_id: d.facilityId,
          delinquent_90_pct: point.delinquent90Pct,
          delinquent_90_amount_usd_m: point.delinquent90AmountUsdM,
        });
        this.pendoService.trackEvent('health_signal_triggered', {
          trigger: 'aging_alert',
          facility_id: d.facilityId,
          cut_off_date: d.reportDate,
          delinquent_90_pct: point.delinquent90Pct,
        });
      }

      if (this.risingTrendActive()) {
        this.pendoService.trackEvent('aging_rising_trend_detected', {
          facility_id: d.facilityId,
          last5_d90_pct: d.history.slice(-5).map((h) => h.delinquent90Pct),
        });
        this.pendoService.trackEvent('health_signal_triggered', {
          trigger: 'aging_rising_trend',
          facility_id: d.facilityId,
          cut_off_date: d.reportDate,
        });
      }
    });
  }
}
