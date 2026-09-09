import {yearIndex, moveYear, yearFromHash} from '../lib/year-navigation.mjs';

class YearBrowser extends HTMLElement {
  connectedCallback() {
    if (this.abortController) return;
    this.panels = [...this.querySelectorAll('[data-year]')];
    if (!this.panels.length) return;
    this.years = this.panels.map(panel => panel.dataset.year);
    this.yearPrefix = this.dataset.prefix;
    this.select = this.querySelector('select');
    this.newer = this.querySelector('[data-newer]');
    this.older = this.querySelector('[data-older]');
    this.viewport = this.querySelector('.publication-scroll');
    this.status = this.querySelector('[data-status]');
    this.abortController = new AbortController();
    const options = {signal: this.abortController.signal};

    this.select.addEventListener('change', () => this.showYear(yearIndex(this.years, this.select.value), true), options);
    this.newer.addEventListener('click', () => this.showYear(moveYear(this.index, -1, this.years.length), true), options);
    this.older.addEventListener('click', () => this.showYear(moveYear(this.index, 1, this.years.length), true), options);
    window.addEventListener('hashchange', () => {
      const year = yearFromHash(location.hash, this.yearPrefix);
      if (year) this.showYear(yearIndex(this.years, year));
    }, options);

    this.showYear(yearIndex(this.years, yearFromHash(location.hash, this.yearPrefix)));
    this.querySelector('[data-controls]').hidden = false;
  }

  showYear(index, updateUrl = false) {
    this.index = index;
    this.panels.forEach((panel, position) => { panel.hidden = position !== index; });
    const current = this.panels[index];
    this.select.value = current.dataset.year;
    this.newer.disabled = index === 0;
    this.older.disabled = index === this.panels.length - 1;
    this.newer.setAttribute('aria-label', index > 0 ? `Newer year: ${this.years[index - 1]}` : 'Already at newest year');
    this.older.setAttribute('aria-label', index < this.years.length - 1 ? `Older year: ${this.years[index + 1]}` : 'Already at oldest year');
    const itemLabel = current.dataset.count === '1' ? this.dataset.singular : this.dataset.plural;
    this.status.textContent = `${current.dataset.year} · ${current.dataset.count} ${itemLabel} · ${index + 1} / ${this.panels.length} years`;
    this.viewport.setAttribute('aria-label', `${this.dataset.label} from ${current.dataset.year}`);
    this.viewport.scrollTop = 0;
    // Replace the fragment without jumping the surrounding page or adding history entries.
    if (updateUrl) history.replaceState(history.state, '', `#${this.yearPrefix}${current.dataset.year}`);
  }

  disconnectedCallback() {
    this.abortController?.abort();
    this.abortController = null;
  }
}

if (!customElements.get('year-browser')) customElements.define('year-browser', YearBrowser);
