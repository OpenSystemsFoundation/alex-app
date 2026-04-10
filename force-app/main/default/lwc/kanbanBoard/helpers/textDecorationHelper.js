/**
 * Text Decoration Helper — board-specific pretext text decoration logic.
 *
 * Computes CSS class names and tooltip titles for card name, subject,
 * and epic label text using the shared PretextManager.
 */

const CARD_NAME_MAX_LINES = 2;
const CARD_SUBJECT_MAX_LINES = 2;
const EPIC_LABEL_MAX_LINES = 2;
const CARD_NAME_FALLBACK_CLASS =
    'kanban-card__name kanban-card__name--single-line slds-text-link slds-text-color_brand';
const CARD_NAME_MULTI_LINE_CLASS =
    'kanban-card__name kanban-card__name--two-line slds-text-link slds-text-color_brand';
const CARD_SUBJECT_FALLBACK_CLASS =
    'kanban-card__subject kanban-card__subject--single-line';
const EPIC_LABEL_FALLBACK_CLASS =
    'epic-label__text epic-label__text--single-line';
const EPIC_LABEL_MULTI_LINE_CLASS =
    'epic-label__text epic-label__text--two-line';

/**
 * Decorate all cards in a set of columns with pretext text classes/titles.
 *
 * @param {Object} pretext - PretextManager instance
 * @param {Array} columns - enriched column DTOs
 * @param {string} context - 'board' or 'swimlane'
 * @param {Object} cache - mutable cache: { columnsRef, context, version, value }
 * @param {number} version - current layout version
 * @returns {Array} columns with decorated cards
 */
export function getColumnsWithPretextLayout(pretext, columns, context, cache, version) {
    if (
        cache.columnsRef === columns &&
        cache.context === context &&
        cache.version === version
    ) {
        return cache.value;
    }

    if (!columns || columns.length === 0) {
        return columns;
    }

    const decoratedColumns = columns.map((column) => ({
        ...column,
        cards: (column.cards || []).map((card) =>
            decorateCardText(pretext, card, context)
        )
    }));

    cache.columnsRef = columns;
    cache.context = context;
    cache.version = version;
    cache.value = decoratedColumns;

    return decoratedColumns;
}

function decorateCardText(pretext, card, context) {
    if (!card) {
        return card;
    }

    return {
        ...card,
        ...getCardNameDecoration(pretext, card, context),
        ...getCardSubjectDecoration(pretext, card, context),
        ...getEpicLabelDecoration(pretext, card, context)
    };
}

function getCardNameDecoration(pretext, card, context) {
    if (context !== 'board') {
        return {};
    }

    const metricsKey = card.hasAssignee
        ? 'boardCardNameWithAssignee'
        : 'boardCardNameWithoutAssignee';
    const decoration = pretext.getDecoration(
        card.Name,
        metricsKey,
        CARD_NAME_MAX_LINES,
        CARD_NAME_FALLBACK_CLASS,
        CARD_NAME_MULTI_LINE_CLASS
    );

    return {
        nameClass: decoration.className,
        nameTitle: decoration.title,
        nameMetricsRole: card.hasAssignee
            ? 'board-card-name-with-assignee'
            : 'board-card-name-without-assignee'
    };
}

function getCardSubjectDecoration(pretext, card, context) {
    const metricsKey =
        context === 'board' ? 'boardSubject' : 'swimlaneSubject';
    const decoration = pretext.getDecoration(
        card.subject,
        metricsKey,
        CARD_SUBJECT_MAX_LINES,
        CARD_SUBJECT_FALLBACK_CLASS,
        'kanban-card__subject kanban-card__subject--two-line'
    );

    return {
        subjectClass: decoration.className,
        subjectTitle: decoration.title
    };
}

function getEpicLabelDecoration(pretext, card, context) {
    if (context !== 'board' || !card.hasEpic) {
        return {};
    }

    const decoration = pretext.getDecoration(
        card.epicLabel,
        'boardEpicLabel',
        EPIC_LABEL_MAX_LINES,
        EPIC_LABEL_FALLBACK_CLASS,
        EPIC_LABEL_MULTI_LINE_CLASS
    );

    return {
        epicLabelClass: decoration.className,
        epicLabelContainerClass: decoration.isMultiLine
            ? 'epic-label epic-label--two-line'
            : 'epic-label',
        epicLabelTitle: decoration.title
    };
}
