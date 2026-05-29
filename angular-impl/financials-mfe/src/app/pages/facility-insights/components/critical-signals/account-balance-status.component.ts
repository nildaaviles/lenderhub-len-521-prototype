import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { TableModule } from 'primeng/table';
import { HumanizeNumberPipe } from '@cxc/ui-kit';
import { PendoService } from '@cxc/core';

export type AccountSemaforoStatus = 'cumple' | 'no_cumple' | 'sin_semaforo';

export interface TrustAccount {
  readonly accountId: string;
  readonly accountName: string;        // ad-hoc per facility — rendered as-is
  readonly accountOrder: number | null;
  readonly requiredBalance: number | null;
  readonly actualBalance: number;
  readonly deficit: number | null;     // only when actual < required
  readonly status: AccountSemaforoStatus;
}

export interface AccountBalanceData {
  readonly facilityId: string;
  readonly reportDate: string;
  readonly accounts: readonly TrustAccount[];
  readonly totalTrustAccounts: number;
  readonly cuentasIncumplimiento: number;
  readonly estadoGlobal: 'todas_al_corriente' | 'incumplimiento' | 'sin_evaluar';
}

/**
 * LEN-570 — Account Balance with per-account compliance semáforo and global status header.
 * Structure is ad-hoc per facility — number of rows varies. Renders all accounts from the report.
 * RED is allowed here (breach real de covenant — explicit exception to Regla 2).
 */
@Component({
  selector: 'account-balance-status',
  standalone: true,
  imports: [NgClass, TableModule, HumanizeNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="bg-surface border border-border rounded-xl p-4">
      <!-- Header -->
      <header class="flex items-center justify-between gap-3 flex-wrap mb-2">
        <h3 class="font-primary text-base font-bold uppercase tracking-wider flex items-center gap-2">
          <i class="ph ph-shield-check text-danger"></i>
          Account Balance
          <span class="inline-block px-2 py-0.5 rounded bg-border text-primary
                       text-[10px] font-bold tracking-wider font-primary">
            STATUS
          </span>
        </h3>

        @if (data().estadoGlobal === 'todas_al_corriente') {
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       bg-success-bg text-success text-xs font-bold font-primary">
            <i class="ph ph-check-circle"></i> ✓ All accounts current
          </span>
        } @else if (data().estadoGlobal === 'incumplimiento') {
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       bg-danger-bg text-danger text-xs font-bold font-primary">
            <i class="ph ph-x-circle"></i>
            ✗ {{ data().cuentasIncumplimiento }} account(s) in breach
          </span>
        }
      </header>

      <p class="font-mono text-sm text-text font-semibold mb-3">
        <strong class="text-primary">${{ data().totalTrustAccounts | humanizeNumber }}</strong>
        total in trust accounts
      </p>

      <p-table [value]="orderedAccounts()" styleClass="cxc-table">
        <ng-template pTemplate="header">
          <tr>
            <th class="text-left">#</th>
            <th class="text-left">Account</th>
            <th class="text-right">Required</th>
            <th class="text-right">Actual</th>
            <th class="text-right">Deficit</th>
            <th class="text-left">Status</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-account let-idx="rowIndex">
          <tr [ngClass]="{ 'bg-danger-bg/30': account.status === 'no_cumple' }"
              (click)="onRowClick(account)"
              [class.cursor-pointer]="account.status === 'no_cumple'">
            <td class="font-mono">{{ idx + 1 }}</td>
            <td>{{ account.accountName }}</td>
            <td class="text-right font-mono">
              @if (account.requiredBalance !== null) {
                ${{ account.requiredBalance | humanizeNumber }}
              } @else {
                <span class="text-text-muted">—</span>
              }
            </td>
            <td class="text-right font-mono">
              ${{ account.actualBalance | humanizeNumber }}
            </td>
            <td class="text-right font-mono">
              @if (account.deficit !== null) {
                <span class="text-danger font-bold">
                  −${{ Math.abs(account.deficit) | humanizeNumber }}
                </span>
              } @else {
                —
              }
            </td>
            <td>
              @if (account.status === 'cumple') {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                             bg-success-bg text-success text-xs font-bold font-primary">
                  <span class="w-1.5 h-1.5 rounded-full bg-current"></span> Compliant
                </span>
              } @else if (account.status === 'no_cumple') {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                             bg-danger-bg text-danger text-xs font-bold font-primary">
                  <span class="w-1.5 h-1.5 rounded-full bg-current"></span> Non-Compliant
                </span>
              } @else {
                <span class="text-text-muted text-xs">—</span>
              }
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6" class="text-center text-text-secondary py-4">
              No data available for this period
            </td>
          </tr>
        </ng-template>
      </p-table>
    </article>
  `,
})
export class AccountBalanceStatusComponent {
  private readonly pendoService = inject(PendoService);

  readonly data = input.required<AccountBalanceData>();
  protected readonly Math = Math;

  /** Sort by account_order (NULLS LAST), then alphabetical fallback. */
  protected readonly orderedAccounts = computed(() => {
    return [...this.data().accounts].sort((a, b) => {
      if (a.accountOrder !== null && b.accountOrder !== null) {
        return a.accountOrder - b.accountOrder;
      }
      if (a.accountOrder === null && b.accountOrder !== null) return 1;
      if (a.accountOrder !== null && b.accountOrder === null) return -1;
      return a.accountName.localeCompare(b.accountName);
    });
  });

  protected onRowClick(account: TrustAccount): void {
    if (account.status !== 'no_cumple') return;
    this.pendoService.trackEvent('account_balance_no_cumple_clicked', {
      facility_id: this.data().facilityId,
      account_id: account.accountId,
      account_name: account.accountName,
      actual_balance: account.actualBalance,
      required_balance: account.requiredBalance,
      deficit: account.deficit,
    });
  }

  constructor() {
    effect(() => {
      const d = this.data();
      this.pendoService.trackEvent('account_balance_semaforo_viewed', {
        facility_id: d.facilityId,
        report_date: d.reportDate,
        estado_global: d.estadoGlobal,
        cuentas_incumplimiento: d.cuentasIncumplimiento,
        total_cuentas: d.accounts.length,
        total_trust_accounts: d.totalTrustAccounts,
      });

      if (d.estadoGlobal === 'incumplimiento') {
        this.pendoService.trackEvent('account_balance_incumplimiento_detected', {
          facility_id: d.facilityId,
          report_date: d.reportDate,
          cuentas_incumplimiento: d.cuentasIncumplimiento,
        });
        this.pendoService.trackEvent('health_signal_triggered', {
          trigger: 'account_balance_breach',
          facility_id: d.facilityId,
          cut_off_date: d.reportDate,
          breach_count: d.cuentasIncumplimiento,
        });
      }
    });
  }
}
