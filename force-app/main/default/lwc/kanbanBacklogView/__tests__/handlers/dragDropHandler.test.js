/**
 * Unit tests for BacklogDragDropHandler
 *
 * Tests drag-start, drag-over, drop (same-section reorder),
 * cross-section drop (returns early), section header drop,
 * and drag-end cleanup.
 */
import BacklogDragDropHandler from '../../handlers/dragDropHandler';

// ─── Mock Store + Thunks ──────────────────────────────────

jest.mock('c/kanbanStore', () => ({
    reorderBacklogCardAsync: jest.fn(
        (_cardId, _newIndex) => () => Promise.resolve({ success: true })
    ),
    addCardsToBacklogSprintAsync: jest.fn(
        (_sprintId, _cardIds) => () => Promise.resolve({ success: true })
    ),
    removeCardFromBacklogSprintAsync: jest.fn(
        (_sprintId, _cardId) => () => Promise.resolve({ success: true })
    ),
    bulkReorderBacklogCardsAtIndexAsync: jest.fn(
        (_cardIds, _idx) => () => Promise.resolve({ success: true })
    ),
    setSelectedBacklogCards: jest.fn((ids) => ({
        type: 'SET_SELECTED_BACKLOG_CARDS',
        payload: ids
    }))
}));

import {
    reorderBacklogCardAsync,
    addCardsToBacklogSprintAsync,
    removeCardFromBacklogSprintAsync,
    bulkReorderBacklogCardsAtIndexAsync
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

// ─── Additional branch coverage ───────────────────────────

describe('BacklogDragDropHandler — edge cases', () => {
    let rafSpy;

    beforeEach(() => {
        rafSpy = jest
            .spyOn(window, 'requestAnimationFrame')
            .mockImplementation((cb) => {
                cb();
                return 1;
            });
    });

    afterEach(() => {
        rafSpy.mockRestore();
    });

    function rejectingStore(cards = []) {
        return {
            getState: () => ({ backlogCards: cards }),
            dispatch: jest.fn(() => Promise.reject(new Error('boom')))
        };
    }

    function lastErrorMessage(host) {
        const calls = host.dispatchEvent.mock.calls;
        return calls.length ? calls[calls.length - 1][0].detail.message : null;
    }

    describe('handleDragStart', () => {
        it('normalizes "null" sprint id, sets data and adds dragging class via rAF', () => {
            const host = createHost();
            const handler = new BacklogDragDropHandler(host);
            const event = createDragEvent('dragstart', {
                cardId: 'c1',
                sprintId: 'null'
            });

            handler.handleDragStart(event);

            expect(handler._dragSourceSprintId).toBeNull();
            expect(event.dataTransfer.setData).toHaveBeenCalledWith(
                'text/plain',
                'c1'
            );
            expect(event.target.classList.add).toHaveBeenCalledWith('dragging');
        });

        it('keeps a real sprint id as the drag source', () => {
            const host = createHost();
            const handler = new BacklogDragDropHandler(host);
            handler.handleDragStart(
                createDragEvent('dragstart', { cardId: 'c1', sprintId: 's1' })
            );
            expect(handler._dragSourceSprintId).toBe('s1');
        });

        it('clears an existing selection when dragging an unselected card', () => {
            const host = createHost({ selectedCards: ['c2'] });
            const handler = new BacklogDragDropHandler(host);
            handler.handleDragStart(
                createDragEvent('dragstart', { cardId: 'c1' })
            );
            expect(host.store.dispatch).toHaveBeenCalledWith({
                type: 'SET_SELECTED_BACKLOG_CARDS',
                payload: []
            });
            expect(handler._dragCardIds).toEqual(['c1']);
        });

        it('does not dispatch when there is no selection, no store, or undefined selection', () => {
            const host = createHost({ selectedCards: [] });
            new BacklogDragDropHandler(host).handleDragStart(
                createDragEvent('dragstart', { cardId: 'c1' })
            );
            expect(host.store.dispatch).not.toHaveBeenCalled();

            const noStoreHost = createHost({
                selectedCards: ['c2'],
                store: null
            });
            const handler = new BacklogDragDropHandler(noStoreHost);
            handler.handleDragStart(
                createDragEvent('dragstart', { cardId: 'c1' })
            );
            expect(handler._dragCardIds).toEqual(['c1']);

            const undefHost = createHost({ selectedCards: undefined });
            const handler2 = new BacklogDragDropHandler(undefHost);
            handler2.handleDragStart(
                createDragEvent('dragstart', { cardId: 'c9' })
            );
            expect(handler2._dragCardIds).toEqual(['c9']);
        });
    });

    describe('handleDragOver', () => {
        it('returns early (after preventDefault) when nothing is being dragged', () => {
            const host = createHost();
            const handler = new BacklogDragDropHandler(host);
            const event = createDragEvent('dragover', { index: '1' });

            handler.handleDragOver(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.dataTransfer.dropEffect).toBe('move');
            expect(event.currentTarget.classList.add).not.toHaveBeenCalled();
            expect(host.dragOverIndex).toBeNull();
        });

        it('shows the "above" indicator when cursor is in the top half', () => {
            const host = createHost();
            host.draggedCardId = 'c1';
            const handler = new BacklogDragDropHandler(host);
            const event = createDragEvent(
                'dragover',
                { index: '2' },
                { clientY: 5 }
            );

            handler.handleDragOver(event);

            expect(event.currentTarget.classList.add).toHaveBeenCalledWith(
                'drag-indicator-above'
            );
            expect(host.dragOverIndex).toBe(2);
            expect(host._dragTargetIndex).toBe(2);
        });

        it('shows the "below" indicator in the bottom half and clears the previous row', () => {
            const host = createHost();
            host.draggedCardId = 'c1';
            const handler = new BacklogDragDropHandler(host);
            const first = createDragEvent(
                'dragover',
                { index: '0' },
                { clientY: 5 }
            );
            handler.handleDragOver(first);

            const second = createDragEvent(
                'dragover',
                { index: '2' },
                { clientY: 35 }
            );
            handler.handleDragOver(second);

            expect(first.currentTarget.classList.remove).toHaveBeenCalledWith(
                'drag-indicator-above',
                'drag-indicator-below'
            );
            expect(second.currentTarget.classList.add).toHaveBeenCalledWith(
                'drag-indicator-below'
            );
            expect(host.dragOverIndex).toBe(3);
        });

        it('does nothing when the effective index has not changed', () => {
            const host = createHost();
            host.draggedCardId = 'c1';
            host.dragOverIndex = 1;
            const handler = new BacklogDragDropHandler(host);
            const event = createDragEvent(
                'dragover',
                { index: '1' },
                { clientY: 5 }
            );

            handler.handleDragOver(event);

            expect(event.currentTarget.classList.add).not.toHaveBeenCalled();
        });
    });

    describe('handleDragEnd', () => {
        it('only clears visuals when no drag is in progress', () => {
            const header = { classList: { remove: jest.fn() } };
            const host = createHost();
            host.template.querySelectorAll = jest.fn(() => [header]);
            host.dragOverIndex = 4;
            const handler = new BacklogDragDropHandler(host);
            handler._dragCardIds = ['keep'];

            handler.handleDragEnd(createDragEvent('dragend'));

            expect(header.classList.remove).toHaveBeenCalledWith(
                'drag-indicator-header'
            );
            expect(host.dragOverIndex).toBe(4);
            expect(handler._dragCardIds).toEqual(['keep']);
        });
    });

    describe('section header drag over / leave', () => {
        it('ignores header dragover when nothing is dragged', () => {
            const host = createHost();
            const handler = new BacklogDragDropHandler(host);
            const event = createDragEvent('dragover');
            handler.handleSectionHeaderDragOver(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(event.currentTarget.classList.add).not.toHaveBeenCalled();
        });

        it('highlights the header while dragging and removes it on leave', () => {
            const host = createHost();
            host.draggedCardId = 'c1';
            const handler = new BacklogDragDropHandler(host);
            const event = createDragEvent('dragover');

            handler.handleSectionHeaderDragOver(event);
            handler.handleSectionHeaderDragLeave(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.dataTransfer.dropEffect).toBe('move');
            expect(event.currentTarget.classList.add).toHaveBeenCalledWith(
                'drag-indicator-header'
            );
            expect(event.currentTarget.classList.remove).toHaveBeenCalledWith(
                'drag-indicator-header'
            );
        });
    });

    describe('handleSectionHeaderDrop', () => {
        it('returns when nothing is being dragged', async () => {
            const host = createHost();
            const handler = new BacklogDragDropHandler(host);
            await handler.handleSectionHeaderDrop(
                createDragEvent('drop', { sprintId: 's1' })
            );
            expect(host.store.dispatch).not.toHaveBeenCalled();
        });

        it('returns when there is no store', async () => {
            const host = createHost({ store: null });
            host.draggedCardId = 'c1';
            const handler = new BacklogDragDropHandler(host);
            await handler.handleSectionHeaderDrop(
                createDragEvent('drop', { sprintId: 's1' })
            );
            expect(host.draggedCardId).toBeNull();
            expect(addCardsToBacklogSprintAsync).not.toHaveBeenCalled();
        });

        it('falls back to draggedCardId and adds it to the target sprint', async () => {
            const host = createHost();
            host.draggedCardId = 'c1';
            const handler = new BacklogDragDropHandler(host);
            await handler.handleSectionHeaderDrop(
                createDragEvent('drop', { sprintId: 's2' })
            );
            expect(removeCardFromBacklogSprintAsync).not.toHaveBeenCalled();
            expect(addCardsToBacklogSprintAsync).toHaveBeenCalledWith('s2', [
                'c1'
            ]);
        });

        it('treats a header without sprint id as the backlog (no-op from backlog)', async () => {
            const host = createHost();
            host.draggedCardId = 'c1';
            const handler = new BacklogDragDropHandler(host);
            await handler.handleSectionHeaderDrop(createDragEvent('drop', {}));
            expect(host.store.dispatch).not.toHaveBeenCalled();
        });

        it('dispatches an error event when the move fails', async () => {
            const host = createHost({ store: rejectingStore() });
            host.draggedCardId = 'c1';
            const handler = new BacklogDragDropHandler(host);
            handler._dragSourceSprintId = 's1';
            await handler.handleSectionHeaderDrop(
                createDragEvent('drop', { sprintId: 'ungrouped' })
            );
            expect(lastErrorMessage(host)).toBe('Failed to move card');
        });
    });

    describe('handleDrop', () => {
        const cards = [{ Id: 'a' }, { Id: 'b' }, { Id: 'c' }, { Id: 'd' }];

        function dropHost(extra = {}) {
            const host = createHost({ backlogCards: cards, ...extra });
            if (!('store' in extra)) {
                host.store.getState = () => ({ backlogCards: cards });
            }
            return host;
        }

        it('returns when nothing is being dragged', async () => {
            const host = dropHost();
            const handler = new BacklogDragDropHandler(host);
            await handler.handleDrop(createDragEvent('drop', {}));
            expect(host.store.dispatch).not.toHaveBeenCalled();
        });

        it('returns when there is no store', async () => {
            const host = dropHost({ store: null });
            host.draggedCardId = 'a';
            host._dragTargetIndex = 1;
            const handler = new BacklogDragDropHandler(host);
            await handler.handleDrop(createDragEvent('drop', {}));
            expect(host._dragTargetIndex).toBeNull();
            expect(reorderBacklogCardAsync).not.toHaveBeenCalled();
        });

        it('dispatches error when a cross-section move fails', async () => {
            const host = dropHost({ store: rejectingStore(cards) });
            host.draggedCardId = 'a';
            host._dragTargetIndex = 0;
            const handler = new BacklogDragDropHandler(host);
            await handler.handleDrop(
                createDragEvent('drop', { sprintId: 's1', cardId: 'b' })
            );
            expect(lastErrorMessage(host)).toBe('Failed to move card');
        });

        it('removes from source sprint when dropping into the backlog', async () => {
            const host = dropHost();
            host.draggedCardId = 'a';
            host._dragTargetIndex = 0;
            const handler = new BacklogDragDropHandler(host);
            handler._dragSourceSprintId = 's1';
            await handler.handleDrop(
                createDragEvent('drop', { sprintId: 'null', cardId: 'b' })
            );
            expect(removeCardFromBacklogSprintAsync).toHaveBeenCalledWith(
                's1',
                'a'
            );
            expect(addCardsToBacklogSprintAsync).not.toHaveBeenCalled();
            expect(reorderBacklogCardAsync).not.toHaveBeenCalled();
        });

        it('returns when there is no target index', async () => {
            const host = dropHost();
            host.draggedCardId = 'a';
            const handler = new BacklogDragDropHandler(host);
            await handler.handleDrop(createDragEvent('drop', { cardId: 'b' }));
            expect(host.store.dispatch).not.toHaveBeenCalled();
        });

        it('returns when the dragged card is not in the backlog state', async () => {
            const host = createHost();
            host.store.getState = () => ({});
            host.draggedCardId = 'zzz';
            host._dragTargetIndex = 0;
            const handler = new BacklogDragDropHandler(host);
            await handler.handleDrop(createDragEvent('drop', { cardId: 'b' }));
            expect(host.store.dispatch).not.toHaveBeenCalled();
        });

        it('uses the last index when the anchor card is unknown', async () => {
            const host = dropHost();
            host.draggedCardId = 'a';
            host._dragTargetIndex = 1;
            const handler = new BacklogDragDropHandler(host);
            await handler.handleDrop(
                createDragEvent('drop', { cardId: 'unknown' })
            );
            expect(reorderBacklogCardAsync).toHaveBeenCalledWith('a', 3);
        });

        it('adjusts the anchor index when moving a single card down', async () => {
            const host = dropHost();
            host.draggedCardId = 'a';
            host._dragTargetIndex = 2;
            const handler = new BacklogDragDropHandler(host);
            await handler.handleDrop(createDragEvent('drop', { cardId: 'c' }));
            expect(reorderBacklogCardAsync).toHaveBeenCalledWith('a', 1);
        });

        it('keeps the anchor index when moving a single card up', async () => {
            const host = dropHost();
            host.draggedCardId = 'd';
            host._dragTargetIndex = 1;
            const handler = new BacklogDragDropHandler(host);
            await handler.handleDrop(createDragEvent('drop', { cardId: 'b' }));
            expect(reorderBacklogCardAsync).toHaveBeenCalledWith('d', 1);
        });

        it('bulk-reorders at the raw anchor index for a multi-card drop', async () => {
            const host = dropHost();
            host.draggedCardId = 'a';
            host._dragTargetIndex = 2;
            const handler = new BacklogDragDropHandler(host);
            handler._dragCardIds = ['a', 'b'];
            await handler.handleDrop(createDragEvent('drop', { cardId: 'c' }));
            expect(bulkReorderBacklogCardsAtIndexAsync).toHaveBeenCalledWith(
                ['a', 'b'],
                2
            );
            expect(reorderBacklogCardAsync).not.toHaveBeenCalled();
        });

        it('drops at the end when target index is past the visible cards', async () => {
            const host = dropHost();
            host.draggedCardId = 'b';
            host._dragTargetIndex = 4;
            const handler = new BacklogDragDropHandler(host);
            await handler.handleDrop(createDragEvent('drop', {}));
            expect(reorderBacklogCardAsync).toHaveBeenCalledWith('b', 3);
        });

        it('resolves the anchor from visible cards when no anchor id is given', async () => {
            const host = dropHost();
            host.draggedCardId = 'a';
            host._dragTargetIndex = 3;
            const handler = new BacklogDragDropHandler(host);
            await handler.handleDrop(createDragEvent('drop', {}));
            // anchor 'd' at index 3, moving down → 2
            expect(reorderBacklogCardAsync).toHaveBeenCalledWith('a', 2);
        });

        it('keeps the visible anchor index for multi-drops and upward moves', async () => {
            const host = dropHost();
            host.draggedCardId = 'c';
            host._dragTargetIndex = 1;
            const handler = new BacklogDragDropHandler(host);
            handler._dragCardIds = ['c', 'd'];
            await handler.handleDrop(createDragEvent('drop', {}));
            expect(bulkReorderBacklogCardsAtIndexAsync).toHaveBeenCalledWith(
                ['c', 'd'],
                1
            );
        });

        it('dispatches an error event when saving the position fails', async () => {
            const host = dropHost({ store: rejectingStore(cards) });
            host.draggedCardId = 'a';
            host._dragTargetIndex = 2;
            const handler = new BacklogDragDropHandler(host);
            await handler.handleDrop(createDragEvent('drop', { cardId: 'c' }));
            expect(lastErrorMessage(host)).toBe('Failed to save card position');
        });
    });
});
