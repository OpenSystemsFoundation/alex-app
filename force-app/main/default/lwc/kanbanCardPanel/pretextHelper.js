/**
 * Pretext Helper — text layout measurement utilities for the card panel.
 *
 * Wraps the Pretext static resource API to provide multi-line text
 * measurement, CSS class selection, and layout caching.
 *
 * @module pretextHelper
 */
import { loadScript } from 'lightning/platformResourceLoader';
import PRETEXT_RESOURCE from '@salesforce/resourceUrl/pretext';

const CARD_TITLE_MAX_LINES = 2;
const EPIC_CHILD_NAME_MAX_LINES = 2;
const EPIC_CHILD_SUBJECT_MAX_LINES = 2;

const CARD_TITLE_FALLBACK_CLASS =
    'card-panel__title card-panel__title--single-line slds-text-heading_small';
const CARD_TITLE_MULTI_LINE_CLASS =
    'card-panel__title card-panel__title--two-line slds-text-heading_small';
const EPIC_CHILD_NAME_FALLBACK_CLASS =
    'epic-child-card__name epic-child-card__name--single-line';
const EPIC_CHILD_NAME_MULTI_LINE_CLASS =
    'epic-child-card__name epic-child-card__name--two-line';
const EPIC_CHILD_SUBJECT_FALLBACK_CLASS =
    'epic-child-card__subject epic-child-card__subject--single-line';
const EPIC_CHILD_SUBJECT_MULTI_LINE_CLASS =
    'epic-child-card__subject epic-child-card__subject--two-line';

let pretextLoadPromise;

function getPretextApi() {
    if (typeof window !== 'undefined' && window.Pretext) {
        return window.Pretext;
    }
    return null;
}

/**
 * Manages Pretext text-layout measurement for a component.
 *
 * Create one instance per component and call its methods from
 * renderedCallback / getters as needed.
 */
export class PretextManager {
    _pretextApi = null;
    _loadState = 'idle'; // idle | loading | ready | failed
    _textMetrics = {
        cardTitle: null,
        epicChildName: null,
        epicChildSubject: null
    };
    _layoutCache = new Map();
    _layoutVersion = 0;
    _decoratedEpicChildrenCache = {
        childCardsRef: null,
        version: -1,
        value: []
    };

    /** @type {LightningElement} */
    _host;

    /**
     * @param {LightningElement} host — the owning component (for loadScript / template queries)
     */
    constructor(host) {
        this._host = host;
    }

    get layoutVersion() {
        return this._layoutVersion;
    }

    get isReady() {
        return this._loadState === 'ready';
    }

    // ------------------------------------------------------------------
    // Lifecycle helpers (call from renderedCallback)
    // ------------------------------------------------------------------

    async initialize() {
        if (this._loadState === 'loading' || this._loadState === 'ready') {
            return;
        }
        this._loadState = 'loading';
        try {
            if (!getPretextApi()) {
                if (!pretextLoadPromise) {
                    pretextLoadPromise = loadScript(this._host, PRETEXT_RESOURCE);
                }
                await pretextLoadPromise;
            }
            const pretext = getPretextApi();
            if (
                !pretext ||
                typeof pretext.prepare !== 'function' ||
                typeof pretext.layout !== 'function'
            ) {
                throw new Error('Pretext global was not initialized after loadScript.');
            }
            this._pretextApi = pretext;
            this._loadState = 'ready';
            this.updateTextMetrics();
        } catch (_err) {
            this._loadState = 'failed';
            pretextLoadPromise = null;
        }
    }

    updateTextMetrics() {
        const nextCardTitle = this._readMetrics('[data-pretext-role="card-panel-title"]');
        const nextEpicChildName = this._readMetrics('[data-pretext-role="epic-child-name"]');
        const nextEpicChildSubject = this._readMetrics('[data-pretext-role="epic-child-subject"]');

        const c1 = this._setMetrics('cardTitle', nextCardTitle);
        const c2 = this._setMetrics('epicChildName', nextEpicChildName);
        const c3 = this._setMetrics('epicChildSubject', nextEpicChildSubject);

        if (c1 || c2 || c3) {
            this._layoutCache.clear();
            this._decoratedEpicChildrenCache = { childCardsRef: null, version: -1, value: [] };
            this._layoutVersion += 1;
        }
    }

    // ------------------------------------------------------------------
    // Text decoration (class name + tooltip)
    // ------------------------------------------------------------------

    getCardNameDecoration(text) {
        return this._getMeasuredDecoration(
            text,
            'cardTitle',
            CARD_TITLE_MAX_LINES,
            CARD_TITLE_FALLBACK_CLASS,
            CARD_TITLE_MULTI_LINE_CLASS
        );
    }

    decorateEpicChild(child) {
        const nameDecoration = this._getMeasuredDecoration(
            child?.name,
            'epicChildName',
            EPIC_CHILD_NAME_MAX_LINES,
            EPIC_CHILD_NAME_FALLBACK_CLASS,
            EPIC_CHILD_NAME_MULTI_LINE_CLASS
        );
        const subjectDecoration = this._getMeasuredDecoration(
            child?.subject,
            'epicChildSubject',
            EPIC_CHILD_SUBJECT_MAX_LINES,
            EPIC_CHILD_SUBJECT_FALLBACK_CLASS,
            EPIC_CHILD_SUBJECT_MULTI_LINE_CLASS
        );
        return {
            ...child,
            nameClass: nameDecoration.className,
            nameTitle: nameDecoration.title,
            subjectClass: subjectDecoration.className,
            subjectTitle: subjectDecoration.title
        };
    }

    getDecoratedEpicChildren(childCards) {
        if (!childCards || childCards.length === 0) {
            return [];
        }
        const cache = this._decoratedEpicChildrenCache;
        if (cache.childCardsRef === childCards && cache.version === this._layoutVersion) {
            return cache.value;
        }
        const decorated = childCards.map((child) => this.decorateEpicChild(child));
        this._decoratedEpicChildrenCache = {
            childCardsRef: childCards,
            version: this._layoutVersion,
            value: decorated
        };
        return decorated;
    }

    // ------------------------------------------------------------------
    // Private
    // ------------------------------------------------------------------

    _getMeasuredDecoration(text, metricsKey, maxLines, fallbackClass, multiLineClass) {
        if (!text) {
            return { className: fallbackClass, title: null };
        }
        const metrics = this._textMetrics[metricsKey];
        const layout = this._measureLayout(text, metrics);
        const shouldClamp =
            layout != null && layout.lineCount > 1 && metrics != null && this._pretextApi != null;
        return {
            className: shouldClamp ? multiLineClass : fallbackClass,
            title: layout != null && layout.lineCount > maxLines ? text : null
        };
    }

    _measureLayout(text, metrics) {
        if (!text || !metrics || !this._pretextApi) {
            return null;
        }
        const cacheKey = `${metrics.signature}::${text}`;
        const cached = this._layoutCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        try {
            const prepared = this._pretextApi.prepare(text, metrics.font);
            const layout = this._pretextApi.layout(prepared, metrics.width, metrics.lineHeight);
            this._layoutCache.set(cacheKey, layout);
            return layout;
        } catch (_err) {
            return null;
        }
    }

    _readMetrics(selector) {
        const el = this._host.template.querySelector(selector);
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

    _setMetrics(key, metrics) {
        const current = this._textMetrics[key];
        if (
            current?.signature === metrics?.signature &&
            current?.width === metrics?.width &&
            current?.lineHeight === metrics?.lineHeight
        ) {
            return false;
        }
        this._textMetrics[key] = metrics;
        return true;
    }
}
