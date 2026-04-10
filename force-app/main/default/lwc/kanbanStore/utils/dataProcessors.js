/**
 * Data Processors
 *
 * Pure functions for processing and enriching data from the server.
 * Handles data transformation and derived property calculation.
 *
 * @module dataProcessors
 */

// Cached icon map — set once during initial board load, used by all
// subsequent enrichCardData calls (e.g. from stateHelpers).
let _cardTypeIcons = null;

// Cached epic summaries map — set from store subscription, used by enrichCardData
let _epicSummaryMap = null;

/**
 * Set the epic summary map (called when epic summaries are loaded).
 * @param {Array} summaries - Array of EpicSummaryDTO
 */
export const setEpicSummaryMap = (summaries) => {
    if (!summaries || summaries.length === 0) {
        _epicSummaryMap = null;
        return;
    }
    _epicSummaryMap = new Map();
    summaries.forEach((s) => {
        _epicSummaryMap.set(s.id, s);
    });
};

/**
 * Set the card-type → icon-name map (called once at board load).
 * @param {Object|null} iconMap - Map of cardType → SLDS icon name
 */
export const setCardTypeIconMap = (iconMap) => {
    _cardTypeIcons = iconMap || null;
};

/**
 * Process columns data - add derived properties
 * @param {Array} columns - Raw columns from server
 * @returns {Array} Processed columns
 */
export const processColumnsData = (columns) => {
    if (!columns || columns.length === 0) {
        return [];
    }

    return columns.map((col) => ({
        ...col,
        cardCount: 0,
        cards: [],
        columnStyle: col.color ? `border-top: 4px solid ${col.color}` : '',
        columnUrl: `/lightning/r/OpenSF__Column__c/${col.Id}/view`,
        communityColumnUrl: `/column/${col.Id}`,
        isDone: col.category === 'Done',
        isReleased: col.category === 'Released',
        isCompleted: col.category === 'Done' || col.category === 'Released',
        hasWipLimit: col.wipLimit != null && col.wipLimit > 0,
        isOverWipLimit: false // updated after cards are distributed
    }));
};

/**
 * Get CSS class for priority level
 * @param {string} priority - Priority level (High, Medium, Low)
 * @returns {string} CSS class name
 */
const getPriorityClass = (priority) => {
    const priorityMap = {
        High: 'priority-high',
        Medium: 'priority-medium',
        Low: 'priority-low'
    };
    return priorityMap[priority] || '';
};

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 characters)
 */
const getInitials = (name) => {
    if (!name) return '';
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
};

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
};

/**
 * Enrich a single card with derived properties
 * @param {Object} card - Raw card object
 * @param {Object} [cardTypeIcons] - Optional map of cardType → SLDS icon name
 * @returns {Object} Enriched card
 */
export const enrichCardData = (card, cardTypeIcons) => {
    const icons = cardTypeIcons || _cardTypeIcons;
    const iconName = card.cardType && icons ? icons[card.cardType] : null;
    // Build formatted custom fields array for template rendering
    const customFieldEntries = [];
    if (card.customFields) {
        Object.keys(card.customFields).forEach((key) => {
            const val = card.customFields[key];
            if (val !== null && val !== undefined && val !== '') {
                customFieldEntries.push({
                    key,
                    value: val,
                    label: key.replace('__c', '').replace(/_/g, ' ')
                });
            }
        });
    }

    // Derive epic progress for epic-type cards
    let epicProgress = null;
    if (card.cardType === 'Epic' && _epicSummaryMap) {
        const summary = _epicSummaryMap.get(card.Id);
        if (summary) {
            const pct = summary.progressPercent || 0;
            epicProgress = {
                totalCards: summary.totalCards || 0,
                completedCards: summary.completedCards || 0,
                totalPoints: summary.totalPoints || 0,
                completedPoints: summary.completedPoints || 0,
                progressPercent: `width: ${pct}%`,
                progressPercentValue: pct
            };
        }
    }

    return {
        ...card,
        priorityClass: getPriorityClass(card.priority),
        assigneeInitials: getInitials(card.assignee?.name),
        hasAssignee: !!card.assigneeId && !!card.assignee,
        formattedDueDate: card.dueDate ? formatDate(card.dueDate) : null,
        isOverdue: card.dueDate ? new Date(card.dueDate) < new Date() : false,
        hasStoryPoints:
            card.storyPoints !== null && card.storyPoints !== undefined,
        cardStyle: card.color ? `border-left: 4px solid ${card.color}` : '',
        recordUrl: `/lightning/r/OpenSF__Card__c/${card.Id}/view`,
        communityCardUrl: `/card/${card.Id}`,
        cardTypeIconName: iconName || null,
        customFieldEntries,
        hasCustomFields: customFieldEntries.length > 0,
        isEpic: card.cardType === 'Epic',
        epicProgress,
        hasEpicProgress: epicProgress !== null && epicProgress.totalCards > 0,
        hasEpic: !!card.epicId,
        epicLabel: card.epic?.subject || null,
        epicColor: card.epic?.color || null
    };
};

/**
 * Process cards data - distribute to columns and enrich
 * @param {Array} cards - Raw cards from server
 * @param {Array} columns - Processed columns
 * @param {Object} [cardTypeIcons] - Optional map of cardType → SLDS icon name
 * @returns {Array} Columns with cards distributed and enriched
 */
export const processCardsData = (cards, columns, cardTypeIcons) => {
    if (!cards || !columns || columns.length === 0) {
        return columns;
    }

    // Deep clone to avoid mutations
    const processedColumns = JSON.parse(JSON.stringify(columns));

    // Initialize card arrays
    processedColumns.forEach((col) => {
        col.cards = [];
        col.cardCount = 0;
    });

    // Distribute cards to columns
    cards.forEach((card) => {
        const column = processedColumns.find((col) => col.Id === card.columnId);
        if (column) {
            const enrichedCard = enrichCardData(card, cardTypeIcons);
            column.cards.push(enrichedCard);
            column.cardCount++;
        }
    });

    // Sort cards by position within each column
    processedColumns.forEach((col) => {
        col.cards.sort((a, b) => {
            if (!a.position && !b.position) return 0;
            if (!a.position) return 1;
            if (!b.position) return -1;
            return a.position.localeCompare(b.position);
        });
        // Update WIP limit status after cards are distributed
        col.isOverWipLimit = col.hasWipLimit && col.cardCount > col.wipLimit;
    });

    return processedColumns;
};
