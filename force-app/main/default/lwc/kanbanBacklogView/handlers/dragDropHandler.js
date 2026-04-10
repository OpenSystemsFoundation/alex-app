/**
 * BacklogDragDropHandler — drag-and-drop reordering for the backlog view.
 *
 * Handles card row drag, section header drop zones, cross-section moves,
 * and drop indicator management.
 */
import {
    reorderBacklogCardAsync,
    addCardsToBacklogSprintAsync,
    removeCardFromBacklogSprintAsync
} from 'c/kanbanStore';

export default class BacklogDragDropHandler {
    _host;
    _lastHighlightedRow = null;
    _dragSourceSprintId = null;

    constructor(host) {
        this._host = host;
    }

    handleDragStart(event) {
        const cardId = event.currentTarget.dataset.cardId;
        const rawSprintId = event.currentTarget.dataset.sprintId;
        this._host.draggedCardId = cardId;
        this._dragSourceSprintId =
            rawSprintId && rawSprintId !== 'null' ? rawSprintId : null;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', cardId);

        // Use rAF so browser captures the element before we style it
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        requestAnimationFrame(() => {
            event.target.classList.add('dragging');
        });
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        if (!this._host.draggedCardId) return;

        const row = event.currentTarget;
        const targetIndex = Number(row.dataset.index);

        // Determine if cursor is in top or bottom half of row
        const rect = row.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const insertAfter = event.clientY > midpoint;
        const effectiveIndex = insertAfter ? targetIndex + 1 : targetIndex;

        if (this._host.dragOverIndex === effectiveIndex) return;

        // Clear previous indicator
        this._clearDropIndicators();

        // Show drop indicator (CSS only — no state mutation during drag)
        if (insertAfter) {
            row.classList.add('drag-indicator-below');
        } else {
            row.classList.add('drag-indicator-above');
        }
        this._lastHighlightedRow = row;

        this._host.dragOverIndex = effectiveIndex;
        this._host._dragTargetIndex = effectiveIndex;
    }

    handleDragEnd(event) {
        event.currentTarget.classList.remove('dragging');
        this._clearDropIndicators();
        this._clearHeaderDropIndicators();
        // If drop didn't fire (e.g. dropped outside), reset drag state
        if (this._host.draggedCardId) {
            this._host.draggedCardId = null;
            this._host.dragOverIndex = null;
            this._host._dragTargetIndex = null;
            this._dragSourceSprintId = null;
        }
    }

    handleSectionHeaderDragOver(event) {
        if (!this._host.draggedCardId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        event.currentTarget.classList.add('drag-indicator-header');
    }

    handleSectionHeaderDragLeave(event) {
        event.currentTarget.classList.remove('drag-indicator-header');
    }

    async handleSectionHeaderDrop(event) {
        event.preventDefault();
        this._clearDropIndicators();
        this._clearHeaderDropIndicators();

        const cardId = this._host.draggedCardId;
        const sourceSprintId = this._dragSourceSprintId;
        this._host.draggedCardId = null;
        this._host.dragOverIndex = null;
        this._host._dragTargetIndex = null;
        this._dragSourceSprintId = null;

        if (!cardId || !this._host.store) return;

        const rawTargetId = event.currentTarget.dataset.sprintId;
        const targetSprintId =
            rawTargetId && rawTargetId !== 'ungrouped' ? rawTargetId : null;

        // No-op if same section
        if (sourceSprintId === targetSprintId) return;

        try {
            await this._moveCardBetweenSections(
                cardId,
                sourceSprintId,
                targetSprintId
            );
        } catch (error) {
            this._host.dispatchEvent(
                new CustomEvent('error', {
                    detail: { message: 'Failed to move card' }
                })
            );
        }
    }

    async handleDrop(event) {
        event.preventDefault();
        this._clearDropIndicators();
        this._clearHeaderDropIndicators();

        const cardId = this._host.draggedCardId;
        const targetIndex = this._host._dragTargetIndex;
        const sourceSprintId = this._dragSourceSprintId;
        this._host.draggedCardId = null;
        this._host.dragOverIndex = null;
        this._host._dragTargetIndex = null;
        this._dragSourceSprintId = null;

        if (cardId == null || !this._host.store) return;

        // Detect target section from the drop target row
        const rawTargetSprintId = event.currentTarget.dataset.sprintId;
        const targetSprintId =
            rawTargetSprintId && rawTargetSprintId !== 'null'
                ? rawTargetSprintId
                : null;

        // Cross-section drop: move card between sprint/backlog sections
        if (sourceSprintId !== targetSprintId) {
            try {
                await this._moveCardBetweenSections(
                    cardId,
                    sourceSprintId,
                    targetSprintId
                );
            } catch (error) {
                this._host.dispatchEvent(
                    new CustomEvent('error', {
                        detail: { message: 'Failed to move card' }
                    })
                );
                return;
            }
            // Fall through to reorder the card to the drop position
        }

        if (targetIndex == null) return;

        const state = this._host.store.getState();
        const allCards = state.backlogCards || [];
        const oldIndex = allCards.findIndex((c) => c.Id === cardId);
        if (oldIndex === -1) return;

        // Find the anchor card from the drop target row
        const anchorCardId = event.currentTarget.dataset.cardId;
        let newIndex;
        if (anchorCardId) {
            newIndex = allCards.findIndex((c) => c.Id === anchorCardId);
            if (newIndex === -1) {
                newIndex = allCards.length - 1;
            } else if (newIndex > oldIndex) {
                newIndex = Math.max(0, newIndex - 1);
            }
        } else if (targetIndex >= this._host.backlogCards.length) {
            newIndex = allCards.length - 1;
        } else {
            const anchorCard = this._host.backlogCards[targetIndex];
            newIndex = allCards.findIndex((c) => c.Id === anchorCard.Id);
            if (newIndex > oldIndex) {
                newIndex = Math.max(0, newIndex - 1);
            }
        }

        try {
            await this._host.store.dispatch(
                reorderBacklogCardAsync(cardId, newIndex)
            );
        } catch (error) {
            this._host.dispatchEvent(
                new CustomEvent('error', {
                    detail: { message: 'Failed to save card position' }
                })
            );
        }
    }

    async _moveCardBetweenSections(cardId, sourceSprintId, targetSprintId) {
        const store = this._host.store;
        if (sourceSprintId) {
            await store.dispatch(
                removeCardFromBacklogSprintAsync(sourceSprintId, cardId)
            );
        }
        if (targetSprintId) {
            await store.dispatch(
                addCardsToBacklogSprintAsync(targetSprintId, [cardId])
            );
        }
    }

    _clearDropIndicators() {
        if (this._lastHighlightedRow) {
            this._lastHighlightedRow.classList.remove(
                'drag-indicator-above',
                'drag-indicator-below'
            );
            this._lastHighlightedRow = null;
        }
    }

    _clearHeaderDropIndicators() {
        const headers = this._host.template.querySelectorAll(
            '.sprint-header-row'
        );
        headers.forEach((h) => h.classList.remove('drag-indicator-header'));
    }
}
