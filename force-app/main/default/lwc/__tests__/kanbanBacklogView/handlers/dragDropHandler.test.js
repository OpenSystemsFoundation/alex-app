/**
 * Unit tests for BacklogDragDropHandler
 *
 * Tests drag-start, drag-over, drop (same-section reorder),
 * cross-section drop (returns early), section header drop,
 * and drag-end cleanup.
 */
import BacklogDragDropHandler from '../../../kanbanBacklogView/handlers/dragDropHandler';

// ─── Mock Store + Thunks ──────────────────────────────────

jest.mock('c/kanbanStore', () => ({
    reorderBacklogCardAsync: jest.fn(
        (cardId, newIndex) => () => Promise.resolve({ success: true })
    ),
    addCardsToBacklogSprintAsync: jest.fn(
        (sprintId, cardIds) => () => Promise.resolve({ success: true })
    ),
    removeCardFromBacklogSprintAsync: jest.fn(
        (sprintId, cardId) => () => Promise.resolve({ success: true })
    ),
    bulkReorderBacklogCardsAtIndexAsync: jest.fn(
        (cardIds, idx) => () => Promise.resolve({ success: true })
    ),
    setSelectedBacklogCards: jest.fn((ids) => ({
        type: 'SET_SELECTED_BACKLOG_CARDS',
        payload: ids
    }))
}));

import {
    reorderBacklogCardAsync,
    addCardsToBacklogSprintAsync,
    removeCardFromBacklogSprintAsync
} from 'c/kanbanStore';

beforeEach(() => jest.clearAllMocks());

// ─── Helpers ──────────────────────────────────────────────

function createHost(overrides = {}) {
    return {
        draggedCardId: null,
        dragOverIndex: null,
        _dragTargetIndex: null,
        selectedCards: [],
        backlogCards: [],
        store: {
            getState: () => ({
                backlogCards: overrides.backlogCards || []
            }),
            dispatch: jest.fn((thunkOrAction) => {
                if (typeof thunkOrAction === 'function') {
                    return thunkOrAction(
                        overrides.store?.dispatch || jest.fn(),
                        overrides.store?.getState ||
                            (() => ({ backlogCards: [] }))
                    );
                }
                return thunkOrAction;
            })
        },
        template: {
            querySelectorAll: jest.fn(() => [])
        },
        dispatchEvent: jest.fn(),
        ...overrides
    };
}

function createDragEvent(type, dataset = {}, overrides = {}) {
    const event = {
        type,
        preventDefault: jest.fn(),
        dataTransfer: {
            effectAllowed: '',
            dropEffect: '',
            setData: jest.fn(),
            getData: jest.fn()
        },
        currentTarget: {
            dataset: { ...dataset },
            classList: {
                add: jest.fn(),
                remove: jest.fn()
            },
            getBoundingClientRect: () => ({
                top: 0,
                height: 40,
                left: 0,
                width: 200
            })
        },
        target: {
            classList: { add: jest.fn(), remove: jest.fn() }
        },
        clientY: 10,
        ...overrides
    };
    return event;
}

// ─── Tests ────────────────────────────────────────────────

describe('BacklogDragDropHandler', () => {
    describe('handleDragStart', () => {
        it('sets draggedCardId and drag source sprint', () => {
            const host = createHost();
            const handler = new BacklogDragDropHandler(host);
            const event = createDragEvent('dragstart', {
                cardId: 'c1',
                sprintId: 's1'
            });

            handler.handleDragStart(event);

            expect(host.draggedCardId).toBe('c1');
            expect(event.dataTransfer.effectAllowed).toBe('move');
        });

        it('tracks multi-card drag when card is in selection', () => {
            const host = createHost({ selectedCards: ['c1', 'c2', 'c3'] });
            const handler = new BacklogDragDropHandler(host);
            const event = createDragEvent('dragstart', {
                cardId: 'c2',
                sprintId: null
            });

            handler.handleDragStart(event);

            // All selected cards should be tracked for multi-drag
            expect(handler._dragCardIds).toEqual(['c1', 'c2', 'c3']);
        });

        it('clears selection for single card drag', () => {
            const host = createHost({ selectedCards: ['c1', 'c2'] });
            const handler = new BacklogDragDropHandler(host);
            const event = createDragEvent('dragstart', {
                cardId: 'c3',
                sprintId: null
            });

            handler.handleDragStart(event);

            expect(handler._dragCardIds).toEqual(['c3']);
        });
    });

    describe('handleDragEnd', () => {
        it('resets all drag state', () => {
            const host = createHost();
            host.draggedCardId = 'c1';
            host.dragOverIndex = 2;
            host._dragTargetIndex = 2;
            const handler = new BacklogDragDropHandler(host);
            const event = createDragEvent('dragend');

            handler.handleDragEnd(event);

            expect(host.draggedCardId).toBeNull();
            expect(host.dragOverIndex).toBeNull();
            expect(host._dragTargetIndex).toBeNull();
        });
    });

    describe('handleDrop — same section reorder', () => {
        it('dispatches reorderBacklogCardAsync for single card', async () => {
            const cards = [
                { Id: 'a', position: '1000' },
                { Id: 'b', position: '2000' },
                { Id: 'c', position: '3000' }
            ];
            const host = createHost({ backlogCards: cards });
            host.backlogCards = cards;
            host.store.getState = () => ({ backlogCards: cards });

            const handler = new BacklogDragDropHandler(host);
            // Simulate drag state
            host.draggedCardId = 'a';
            host._dragTargetIndex = 2;
            handler._dragSourceSprintId = null;
            handler._dragCardIds = ['a'];

            const event = createDragEvent(
                'drop',
                { sprintId: 'null', cardId: 'c' },
                {}
            );

            await handler.handleDrop(event);

            expect(host.store.dispatch).toHaveBeenCalled();
        });
    });

    describe('handleDrop — cross-section', () => {
        it('calls _moveCardBetweenSections and returns early, skips reorder', async () => {
            const cards = [{ Id: 'a', position: '1000' }];
            const host = createHost({ backlogCards: cards });
            host.backlogCards = cards;
            host.store.getState = () => ({ backlogCards: cards });

            const handler = new BacklogDragDropHandler(host);
            host.draggedCardId = 'a';
            host._dragTargetIndex = 0;
            handler._dragSourceSprintId = null; // from backlog
            handler._dragCardIds = ['a'];

            const event = createDragEvent(
                'drop',
                { sprintId: 's1', cardId: 'a' }, // dropping into sprint section
                {}
            );

            await handler.handleDrop(event);

            // addCardsToBacklogSprintAsync should have been called
            expect(addCardsToBacklogSprintAsync).toHaveBeenCalledWith('s1', [
                'a'
            ]);
            // reorderBacklogCardAsync should NOT be called (early return)
            expect(reorderBacklogCardAsync).not.toHaveBeenCalled();
        });
    });

    describe('handleSectionHeaderDrop', () => {
        it('moves card to target section via header drop', async () => {
            const host = createHost();
            const handler = new BacklogDragDropHandler(host);
            host.draggedCardId = 'c1';
            handler._dragSourceSprintId = 's1';
            handler._dragCardIds = ['c1'];

            const event = createDragEvent('drop', { sprintId: 'ungrouped' });

            await handler.handleSectionHeaderDrop(event);

            // Should remove from sprint s1
            expect(removeCardFromBacklogSprintAsync).toHaveBeenCalledWith(
                's1',
                'c1'
            );
        });

        it('no-ops if same section', async () => {
            const host = createHost();
            const handler = new BacklogDragDropHandler(host);
            host.draggedCardId = 'c1';
            handler._dragSourceSprintId = 's1';
            handler._dragCardIds = ['c1'];

            const event = createDragEvent('drop', { sprintId: 's1' });

            await handler.handleSectionHeaderDrop(event);

            expect(removeCardFromBacklogSprintAsync).not.toHaveBeenCalled();
            expect(addCardsToBacklogSprintAsync).not.toHaveBeenCalled();
        });
    });
});
