import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { QueryBuilder } from '@cxc/core';
import { AgingData } from '../components/aging-section/aging-section.component';
import { UndrawnCommitmentData } from '../components/critical-signals/undrawn-commitment-card.component';
import { AccountBalanceData } from '../components/critical-signals/account-balance-status.component';

/**
 * HTTP service for Facility Insights — LEN-521 iniciativa.
 * All requests opt into auth + loader via headers; the global interceptors handle the rest.
 * Query params are built via QueryBuilder (no manual string concat — playbook rule #4).
 */
@Injectable({ providedIn: 'root' })
export class FacilityInsightsService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/facilities';

  private headers(loaderKey: string): HttpHeaders {
    return new HttpHeaders({
      'Auth-Opt-In': 'true',
      'Loader-Opt-In': loaderKey,
    });
  }

  getAging(facilityId: string, cutOffDate: string): Observable<AgingData> {
    const params = new QueryBuilder().add('cutOffDate', cutOffDate).build();
    return this.http.get<AgingData>(`${this.base}/${facilityId}/aging`, {
      headers: this.headers('facility-insights-aging'),
      params,
    });
  }

  getUndrawnCommitment(
    facilityId: string,
    cutOffDate: string,
  ): Observable<UndrawnCommitmentData> {
    const params = new QueryBuilder().add('cutOffDate', cutOffDate).build();
    return this.http.get<UndrawnCommitmentData>(
      `${this.base}/${facilityId}/undrawn-commitment`,
      { headers: this.headers('facility-insights-undrawn'), params },
    );
  }

  getAccountBalance(
    facilityId: string,
    cutOffDate: string,
  ): Observable<AccountBalanceData> {
    const params = new QueryBuilder().add('cutOffDate', cutOffDate).build();
    return this.http.get<AccountBalanceData>(
      `${this.base}/${facilityId}/account-balance`,
      { headers: this.headers('facility-insights-account-balance'), params },
    );
  }
}
