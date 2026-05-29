/**
 * LEN-521 Runtime — Web Components que ejecutan la MISMA lógica
 * que `prototypes/angular-impl/`. Diseñado para correr en un browser puro
 * sin Angular ni build step. Sirve como demo interactivo + spec viva.
 *
 * Mapping a los archivos Angular:
 *   adaptivePeriod()           → pipes/adaptive-period.pipe.ts
 *   reportingFrequencyInfer()  → services/reporting-frequency.service.ts
 *   risingTrendActive()        → components/aging-section/...
 *   <delta-chip>               → components/shared/delta-chip.component.ts
 *   <reporting-frequency-badge>→ components/cut-off-header/...
 */

// ════════════════════════════════════════════════════════════════════════
// 1. Pure logic (mirror exacto de los archivos .ts)
// ════════════════════════════════════════════════════════════════════════

/** AdaptivePeriodPipe.transform — master rule LEN-567 */
function adaptivePeriod(frequency) {
  const map = {
    daily: 'vs. prior day',
    weekly: 'vs. prior week',
    monthly: 'vs. prior month',
  };
  return map[frequency] ?? '';
}

/** ReportingFrequencyService.infer — LEN-876 (mediana de últimos 6 cortes) */
function reportingFrequencyInfer(cutOffDates) {
  if (!Array.isArray(cutOffDates) || cutOffDates.length < 2) return null;

  const DAY_MS = 86_400_000;
  const sorted = [...cutOffDates]
    .map((d) => (d instanceof Date ? d.getTime() : new Date(d).getTime()))
    .sort((a, b) => b - a)
    .slice(0, 6);

  const deltas = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    deltas.push((sorted[i] - sorted[i + 1]) / DAY_MS);
  }
  const median = medianOf(deltas);

  if (median <= 2) return 'daily';
  if (median >= 5 && median <= 9) return 'weekly';
  if (median >= 25 && median <= 35) return 'monthly';
  return null;
}

function medianOf(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return NaN;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Rising trend detector — LEN-578 (estrictamente creciente últimos 5) */
function risingTrendActive(history) {
  if (!Array.isArray(history) || history.length < 5) return false;
  const last5 = history.slice(-5);
  for (let i = 1; i < last5.length; i++) {
    if (last5[i - 1] >= last5[i]) return false;
  }
  return true;
}

/** Delta direction helper */
function deltaDirection(absolute) {
  if (absolute === null || absolute === undefined) return 'no_prior_data';
  if (absolute > 0) return 'up';
  if (absolute < 0) return 'down';
  return 'flat';
}

/** Humanize number (K/M/B) */
function humanize(value) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

// ════════════════════════════════════════════════════════════════════════
// 2. <delta-chip> — Web Component
//    Mirror de components/shared/delta-chip.component.ts
// ════════════════════════════════════════════════════════════════════════

class DeltaChipElement extends HTMLElement {
  static get observedAttributes() {
    return ['value', 'pct', 'color-scheme', 'format', 'frequency', 'show-pct'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  render() {
    const value = parseFloat(this.getAttribute('value'));
    const pct = this.getAttribute('pct') !== null ? parseFloat(this.getAttribute('pct')) : null;
    const scheme = this.getAttribute('color-scheme') ?? 'standard';
    const format = this.getAttribute('format') ?? 'currency';
    const frequency = this.getAttribute('frequency') ?? 'monthly';
    const showPct = this.getAttribute('show-pct') !== 'false';

    const direction = deltaDirection(value);

    if (direction === 'no_prior_data') {
      this.className = '';
      this.innerHTML = '<span class="italic text-text-muted text-xs font-ui">No prior period data</span>';
      return;
    }

    const { classes, icon } = this.computeStyle(direction, scheme);
    const valueText = this.formatValue(value, format);
    const pctText = showPct && pct !== null ? ` (${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct).toFixed(1)}%)` : '';
    const periodText = adaptivePeriod(frequency);

    this.className =
      `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold font-primary ${classes}`;
    this.innerHTML = `
      <i class="ph ${icon} text-xs" aria-hidden="true"></i>
      <span>${valueText}${pctText}</span>
      <span class="font-normal opacity-90">${periodText}</span>
    `;
  }

  computeStyle(direction, scheme) {
    if (direction === 'flat') {
      return { classes: 'bg-slate-100 text-text-secondary', icon: 'ph-minus' };
    }

    if (scheme === 'neutral') {
      return {
        classes: 'bg-slate-100 text-text-secondary',
        icon: direction === 'up' ? 'ph-arrow-up' : 'ph-arrow-down',
      };
    }

    if (scheme === 'growth-only') {
      return {
        classes: direction === 'up'
          ? 'bg-success-bg text-success'
          : 'bg-slate-100 text-text-secondary',
        icon: direction === 'up' ? 'ph-arrow-up' : 'ph-arrow-down',
      };
    }

    if (scheme === 'inverted') {
      return {
        classes: direction === 'up'
          ? 'bg-warning-bg text-warning'
          : 'bg-success-bg text-success',
        icon: direction === 'up' ? 'ph-arrow-up' : 'ph-arrow-down',
      };
    }

    // standard
    return {
      classes: direction === 'up'
        ? 'bg-success-bg text-success'
        : 'bg-warning-bg text-warning',
      icon: direction === 'up' ? 'ph-arrow-up' : 'ph-arrow-down',
    };
  }

  formatValue(value, format) {
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    const abs = Math.abs(value);
    if (format === 'pp') return `${sign}${abs.toFixed(2)} pp`;
    if (format === 'count') return `${sign}${abs.toLocaleString('en-US')}`;
    return `${sign}$${humanize(abs)}`;
  }
}

customElements.define('delta-chip-live', DeltaChipElement);

// ════════════════════════════════════════════════════════════════════════
// 3. <reporting-frequency-badge-live> — auto-infers from a list of dates
// ════════════════════════════════════════════════════════════════════════

class ReportingFrequencyBadgeElement extends HTMLElement {
  static get observedAttributes() {
    return ['cut-offs'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  render() {
    const raw = this.getAttribute('cut-offs') ?? '';
    const dates = raw.split(',').map((s) => s.trim()).filter(Boolean).map((s) => new Date(s));

    const freq = reportingFrequencyInfer(dates);
    if (!freq) {
      this.innerHTML = '';
      return;
    }

    const label = freq.charAt(0).toUpperCase() + freq.slice(1);
    this.innerHTML = `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-info-bg text-info text-xs font-bold font-primary"
            role="status"
            title="Inferred from the cut-off history of this facility.">
        <i class="ph ph-clock-counter-clockwise text-xs"></i>
        ${label}
      </span>
    `;
  }
}

customElements.define('reporting-frequency-badge-live', ReportingFrequencyBadgeElement);

// ════════════════════════════════════════════════════════════════════════
// 4. <rising-trend-indicator-live> — runs the strict 5-cut detector
// ════════════════════════════════════════════════════════════════════════

class RisingTrendIndicatorElement extends HTMLElement {
  static get observedAttributes() {
    return ['history'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  render() {
    const raw = this.getAttribute('history') ?? '';
    const history = raw.split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
    const active = risingTrendActive(history);

    if (!active) {
      this.innerHTML = '';
      return;
    }

    this.innerHTML = `
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger-bg text-danger border border-red-200 text-xs font-semibold font-primary">
        <i class="ph ph-trend-up text-xs"></i> Rising trend · 5 cuts on 90+
      </span>
    `;
  }
}

customElements.define('rising-trend-indicator-live', RisingTrendIndicatorElement);

// ════════════════════════════════════════════════════════════════════════
// 5. Expose pure logic on window for the interactive demo panel
// ════════════════════════════════════════════════════════════════════════

window.LEN521 = {
  adaptivePeriod,
  reportingFrequencyInfer,
  risingTrendActive,
  deltaDirection,
};

console.log(
  '%c[LEN-521]%c runtime loaded · %c<delta-chip-live>%c · %c<reporting-frequency-badge-live>%c · %c<rising-trend-indicator-live>',
  'background:#910057;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold',
  'color:inherit',
  'color:#910057;font-weight:bold',
  'color:inherit',
  'color:#910057;font-weight:bold',
  'color:inherit',
  'color:#910057;font-weight:bold',
);
