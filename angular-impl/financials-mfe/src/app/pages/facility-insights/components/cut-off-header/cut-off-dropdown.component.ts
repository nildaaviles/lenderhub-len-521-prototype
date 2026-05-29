import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { DropdownModule } from 'primeng/dropdown';
import { PendoService } from '@cxc/core';

export interface CutOffOption {
  readonly date: Date;
  readonly isLatest: boolean;
  readonly complianceStatus: 'compliant' | 'non_compliant';
}

interface MonthGroup {
  readonly label: string;
  readonly hasIssue: boolean;
  readonly totalCutoffs: number;
  readonly nonCompliantCount: number;
  readonly items: readonly CutOffOption[];
}

/**
 * LEN-889 — Cut-Off Date dropdown rediseñado.
 *
 * Behaviour:
 *  - Format: `Month DD, YYYY` (Intl.DateTimeFormat en-US, long month, 2-digit day).
 *  - Trigger 2-line: date + weekday (+ "· Latest available" when applicable).
 *  - Group items by month (descending). Headers uppercase + dot ⦁ when month has any non_compliant cut-off.
 *  - Compliant items: silent (only date). Non-compliant: badge `⚠ Non compliant`.
 *  - Latest cut-off: badge `LATEST`.
 *  - Empty state: trigger disabled with "No cut-offs reported".
 *  - WCAG 2.1 AA: aria-haspopup, aria-expanded, keyboard nav.
 */
@Component({
  selector: 'cut-off-dropdown',
  standalone: true,
  imports: [NgClass, DropdownModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dropdown
      [options]="groupedOptions()"
      [(ngModel)]="internalSelection"
      [group]="true"
      [disabled]="cutOffs().length === 0"
      [showClear]="false"
      optionLabel="label"
      [panelStyleClass]="'cut-off-panel'"
      (onShow)="onPanelOpen()"
      (onChange)="onSelectionChange($event.value)"
      [ariaLabel]="'Cut-off date selector'">

      <!-- Trigger -->
      <ng-template pTemplate="selectedItem" let-selected>
        @if (cutOffs().length === 0) {
          <span class="text-text-muted">No cut-offs reported</span>
        } @else if (selected) {
          <div class="flex flex-col leading-tight">
            <span class="text-base font-semibold text-text">
              {{ formatLong(selected.date) }}
            </span>
            <span class="text-xs text-text-secondary">
              {{ formatWeekday(selected.date) }}{{ selected.isLatest ? ' · Latest available' : '' }}
            </span>
          </div>
        }
      </ng-template>

      <!-- Group header -->
      <ng-template let-group pTemplate="group">
        <div class="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase
                    tracking-wider text-text-secondary font-primary border-t border-border">
          @if (group.hasIssue) {
            <span class="w-1.5 h-1.5 rounded-full bg-warning"></span>
          }
          <span>{{ group.label }}</span>
          <span class="ml-auto text-text-muted opacity-0 hover:opacity-100 transition-opacity">
            · {{ group.totalCutoffs }} cut-offs
            @if (group.nonCompliantCount > 0) {
              · {{ group.nonCompliantCount }} issues
            }
          </span>
        </div>
      </ng-template>

      <!-- Item -->
      <ng-template let-option pTemplate="item">
        <div class="flex items-center justify-between gap-2 w-full"
             [attr.aria-label]="itemAriaLabel(option)">
          <span class="text-sm">{{ formatLong(option.date) }}</span>
          <div class="flex items-center gap-1.5">
            @if (option.complianceStatus === 'non_compliant') {
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                           bg-warning-bg text-warning border border-amber-200
                           text-[10px] font-bold font-primary">
                <i class="ph ph-warning text-[10px]"></i>
                Non compliant
              </span>
            }
            @if (option.isLatest) {
              <span class="inline-block px-1.5 py-0.5 rounded
                           bg-border text-primary
                           text-[10px] font-bold tracking-wider font-primary">
                LATEST
              </span>
            }
          </div>
        </div>
      </ng-template>
    </p-dropdown>
  `,
})
export class CutOffDropdownComponent {
  private readonly pendoService = inject(PendoService);

  readonly cutOffs = input.required<readonly CutOffOption[]>();
  readonly facilityId = input.required<string>();
  readonly selected = input<CutOffOption | null>(null);

  readonly selectionChange = output<CutOffOption>();

  protected internalSelection: CutOffOption | null = null;

  protected readonly groupedOptions = computed<MonthGroup[]>(() => {
    const cuts = this.cutOffs();
    const byMonth = new Map<string, CutOffOption[]>();

    for (const c of cuts) {
      const key = `${c.date.getFullYear()}-${String(c.date.getMonth()).padStart(2, '0')}`;
      const arr = byMonth.get(key) ?? [];
      arr.push(c);
      byMonth.set(key, arr);
    }

    const formatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

    return [...byMonth.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([key, items]) => {
        const sorted = [...items].sort((a, b) => b.date.getTime() - a.date.getTime());
        const nonCompliant = sorted.filter((i) => i.complianceStatus === 'non_compliant').length;
        return {
          label: formatter.format(sorted[0].date).toUpperCase(),
          hasIssue: nonCompliant > 0,
          totalCutoffs: sorted.length,
          nonCompliantCount: nonCompliant,
          items: sorted,
        };
      });
  });

  protected formatLong(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  protected formatWeekday(date: Date): string {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
  }

  protected itemAriaLabel(option: CutOffOption): string {
    return `Cut-off date ${this.formatLong(option.date)}, ${option.complianceStatus.replace('_', '-')}`;
  }

  protected onPanelOpen(): void {
    const cuts = this.cutOffs();
    this.pendoService.trackEvent('facility_insights.cutoff_selector_opened', {
      facility_id: this.facilityId(),
      total_cutoffs: cuts.length,
      non_compliant_count: cuts.filter((c) => c.complianceStatus === 'non_compliant').length,
    });
  }

  protected onSelectionChange(option: CutOffOption): void {
    const cuts = this.cutOffs();
    const latest = cuts.find((c) => c.isLatest);
    const monthsBack = latest
      ? this.monthsBetween(option.date, latest.date)
      : 0;

    this.pendoService.trackEvent('facility_insights.cutoff_date_selected', {
      facility_id: this.facilityId(),
      cutoff_date: option.date.toISOString().slice(0, 10),
      is_latest: option.isLatest,
      compliance_status: option.complianceStatus,
      months_back: monthsBack,
    });

    if (monthsBack > 0) {
      this.pendoService.trackEvent('facility_insights.cutoff_navigated_to_older_month', {
        facility_id: this.facilityId(),
        months_back: monthsBack,
      });
    }

    this.selectionChange.emit(option);
  }

  private monthsBetween(older: Date, newer: Date): number {
    return (
      (newer.getFullYear() - older.getFullYear()) * 12 +
      (newer.getMonth() - older.getMonth())
    );
  }
}
