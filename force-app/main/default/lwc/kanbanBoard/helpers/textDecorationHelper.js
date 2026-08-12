/**
 * Text Decoration Helper — board-specific text decoration logic.
 *
 * Applies stable CSS classes and full-text tooltips for card name,
 * subject, and epic label text.
 */

const CARD_NAME_CLASS =
    'kanban-card__name kanban-card__name--two-line slds-text-link slds-text-color_brand';
const CARD_SUBJECT_CLASS =
    'kanban-card__subject kanban-card__subject--two-line';
const EPIC_LABEL_CLASS = 'epic-label__text epic-label__text--two-line';

/**
 * Decorate all cards in a set of columns with text classes and tooltips.
 *
 * @param {Array} columns - enriched column DTOs
 * @param {string} context - 'board' or 'swimlane'
 * @param {Object} cache - mutable cache: { columnsRef, context, value }
 * @returns {Array} columns with decorated cards
 */
export function getColumnsWithDecoratedText(columns, context, cache) {
    if (cache.columnsRef === columns && cache.context === context) {
        return cache.value;
    }

    if (!columns || columns.length === 0) {
        return columns;
    }

    const decoratedColumns = columns.map((column) => ({
        ...column,
        cards: (column.cards || []).map((card) =>
            decorateCardText(card, context)
        )
    }));

    cache.columnsRef = columns;
    cache.context = context;
    cache.value = decoratedColumns;

    return decoratedColumns;
}

function decorateCardText(card, context) {
    if (!card) {
        return card;
    }

    return {
        ...card,
        ...getCardNameDecoration(card, context),
        ...getCardSubjectDecoration(card),
        ...getEpicLabelDecoration(card, context)
    };
}

function getCardNameDecoration(card, context) {
    if (context !== 'board') {
        return {};
    }

    return {
        nameClass: CARD_NAME_CLASS,
        nameTitle: card.Name || null
    };
}

function getCardSubjectDecoration(card) {
    if (!card.subject) {
        return {
            subjectClass: CARD_SUBJECT_CLASS,
            subjectTitle: null
        };
    }

    return {
        subjectClass: CARD_SUBJECT_CLASS,
        subjectTitle: card.subject
    };
}

function getEpicLabelDecoration(card, context) {
    if (context !== 'board' || !card.hasEpic) {
        return {};
    }

    return {
        epicLabelClass: EPIC_LABEL_CLASS,
        epicLabelContainerClass: 'epic-label',
        epicLabelTitle: card.epicLabel || null
    };
}
