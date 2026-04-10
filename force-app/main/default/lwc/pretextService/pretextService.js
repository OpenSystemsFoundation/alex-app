/**
 * Pretext Service — shared text-layout measurement utilities.
 *
 * Wraps the Pretext static resource API to provide multi-line text
 * measurement, CSS class selection, and layout caching. Consumed by
 * any LWC that needs text-overflow decoration.
 *
 * @module pretextService
 */
import { loadScript } from 'lightning/platformResourceLoader';
import PRETEXT_RESOURCE from '@salesforce/resourceUrl/pretext';

// ─── Singleton script loader ────────────────────────────────────────────────
let loadPromise;

function getApi() {
    if (typeof window !== 'undefined' && window.Pretext) {
        return window.Pretext;
    }
    return null;
}

// ─── Metrics helpers (shared) ───────────────────────────────────────────────

/**
 * Read computed text metrics from a DOM element matched by `selector`
 * inside the given host component's template.
 *
 * @param {LightningElement} host
 * @param {string} selector
 * @returns {{ font: string, width: number, lineHeight: number, signature: string } | null}
 */
export function readTextMetrics(host, selector) {
    const el = host.template.querySelector(selector);
    if (!el) {
        return null;
    }
    const width = Math.max(0, Math.floor(el.getBoundingClientRect().width));
    if (!width) {
        return null;
    }
    const styles = window.getComputedStyle(el);
    const fontSize = parseFloat(styles.fontSize) || 13;
    const lineHeight = Number.isFinite(parseFloat(styles.lineHeight))
        ? parseFloat(styles.lineHeight)
        : Math.round(fontSize * 1.35 * 100) / 100;
    const font =
        styles.font && styles.font !== ''
            ? styles.font
            : `${styles.fontStyle || 'normal'} ${styles.fontWeight || '500'} ${styles.fontSize || `${fontSize}px`} ${styles.fontFamily || 'Arial, sans-serif'}`;
    return { font, width, lineHeight, signature: `${width}|${lineHeight}|${font}` };
}

/**
 * Returns true when a metrics object has meaningfully changed.
 */
export function metricsChanged(current, next) {
    if (current?.signature === next?.signature &&
        current?.width === next?.width &&
        current?.lineHeight === next?.lineHeight) {
        return false;
    }
    return true;
}

// ─── PretextManager ─────────────────────────────────────────────────────────

/**
 * Manages Pretext text-layout measurement for a component.
 *
 * Create one instance per component, passing a config that maps metric
 * keys to `data-pretext-role` selectors.
 *
 * @example
 * // In your component:
 * import { PretextManager } from 'c/pretextService';
 *
 * _pretext = new PretextManager(this, {
 *     cardTitle: '[data-pretext-role="card-panel-title"]',
 *     epicChildName: '[data-pretext-role="epic-child-name"]'
 * });
 */
export class PretextManager {
    _api = null;
    _loadState = 'idle'; // idle | loading | ready | failed
    _host;
    _metricsConfig; // { [key]: selector }
    _metrics = {};
    _layoutCache = new Map();
    _layoutVersion = 0;

    /**
     * @param {LightningElement} host — the owning component (for loadScript / template queries)
     * @param {Object<string, string>} metricsConfig — map of metric key → CSS selector
     */
    constructor(host, metricsConfig = {}) {
        this._host = host;
        this._metricsConfig = metricsConfig;
        for (const key of Object.keys(metricsConfig)) {
            this._metrics[key] = null;
        }
    }

    get layoutVersion() {
        return this._layoutVersion;
    }

    get isReady() {
        return this._loadState === 'ready';
    }

    // ── Lifecycle ────────────────────────────────────────────────────────

    async initialize() {
        if (this._loadState === 'loading' || this._loadState === 'ready') {
            return;
        }
        this._loadState = 'loading';
        try {
            if (!getApi()) {
                if (!loadPromise) {
                    loadPromise = loadScript(this._host, PRETEXT_RESOURCE);
                }
                await loadPromise;
            }
            const api = getApi();
            if (
                !api ||
                typeof api.prepare !== 'function' ||
                typeof api.layout !== 'function'
            ) {
                throw new Error('Pretext global was not initialized after loadScript.');
            }
            this._api = api;
            this._loadState = 'ready';
            this.updateMetrics();
        } catch (_err) {
            this._loadState = 'failed';
            loadPromise = null;
        }
    }

    /**
     * Re-read all configured metric selectors and bump the layout version
     * if any changed.
     *
     * @returns {boolean} true if any metric changed
     */
    updateMetrics() {
        let anyChanged = false;
        for (const [key, selector] of Object.entries(this._metricsConfig)) {
            const next = readTextMetrics(this._host, selector);
            if (metricsChanged(this._metrics[key], next)) {
                this._metrics[key] = next;
                anyChanged = true;
            }
        }
        if (anyChanged) {
            this._layoutCache.clear();
            this._layoutVersion += 1;
        }
        return anyChanged;
    }

    // ── Layout measurement ───────────────────────────────────────────────

    /**
     * Measure text layout for a given metric key.
     *
     * @param {string} text
     * @param {string} metricsKey — a key from the metricsConfig
     * @returns {{ lineCount: number } | null}
     */
    measureLayout(text, metricsKey) {
        const metrics = this._metrics[metricsKey];
        if (!text || !metrics || !this._api) {
            return null;
        }
        const cacheKey = `${metrics.signature}::${text}`;
        const cached = this._layoutCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        try {
            const prepared = this._api.prepare(text, metrics.font);
            const layout = this._api.layout(prepared, metrics.width, metrics.lineHeight);
            this._layoutCache.set(cacheKey, layout);
            return layout;
        } catch (_err) {
            return null;
        }
    }

    /**
     * Compute decoration (CSS class + tooltip title) for a text value.
     *
     * @param {string} text
     * @param {string} metricsKey
     * @param {number} maxLines
     * @param {string} fallbackClass
     * @param {string} multiLineClass
     * @returns {{ className: string, isMultiLine: boolean, title: string|null }}
     */
    getDecoration(text, metricsKey, maxLines, fallbackClass, multiLineClass) {
        if (!text) {
            return { className: fallbackClass, isMultiLine: false, title: null };
        }
        const layout = this.measureLayout(text, metricsKey);
        const isMultiLine =
            layout != null &&
            layout.lineCount > 1 &&
            this._metrics[metricsKey] != null &&
            this._api != null;
        return {
            className: isMultiLine ? multiLineClass : fallbackClass,
            isMultiLine,
            title: layout != null && layout.lineCount > maxLines ? text : null
        };
    }
}
