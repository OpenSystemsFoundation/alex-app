/**
 * Unit tests for BacklogContextMenuHandler
 *
 * Covers menu building (sprint/column submenus, remove-from-sprint),
 * opening the context menu, and every action branch in handleSelect
 * for both single-card and multi-select modes.
 */
import BacklogContextMenuHandler from '../../handlers/contextMenuHandler';

jest.mock('c/kanbanStore', () => {
    const thunk =
        (type) =>
        (...args) => ({ type, args });
    return {
        updateBacklogCardAsync: jest.fn(thunk('updateBacklogCard')),
        deleteBacklogCardsAsync: jest.fn(thunk('deleteBacklogCards')),
        reorderBacklogCardAsync: jest.fn(thunk('reorderBacklogCard')),
        moveCardsToSprintAsync: jest.fn(thunk('moveCardsToSprint')),
        moveCardAsync: jest.fn(thunk('moveCard')),
        addCardsToBacklogSprintAsync: jest.fn(thunk('addCardsToBacklogSprint')),
        removeCardFromBacklogSprintAsync: jest.fn(
            thunk('removeCardFromBacklogSprint')
        ),
        bulkMoveBacklogCardsAsync: jest.fn(thunk('bulkMoveBacklogCards')),
        setSelectedBacklogCards: jest.fn(thunk('setSelectedBacklogCards'))
    };
});

// ─── Helpers ──────────────────────────────────────────────

function createHost(overrides = {}) {
    const state = {
        backlogCards: [],
        planningSprintCards: [],
        ...(overrides.state || {})
    };
    const host = {
        planningSprints: [],
        activeSprint: null,
        selectedCards: [],
        backlogCards: [],
        _storeState: { columns: [] },
        _contextMenuCardId: null,
        _contextMenuSprintId: null,
        _contextMenuIsMulti: false,
        store: {
            getState: jest.fn(() => state),
            dispatch: jest.fn(() => Promise.resolve())
        },
        template: { querySelector: jest.fn(() => null) },
        _getSprintCardIds: jest.fn(
            (sprintId) =>
                new Set(
                    state.planningSprintCards
                        .filter((sc) => sc.sprintId === sprintId)
                        .map((sc) => sc.cardId)
                )
        ),
        ...overrides
    };
    delete host.state;
    return host;
}

function dispatched(host) {
    return host.store.dispatch.mock.calls.map(([action]) => action);
}

function selectEvent(value, subValue) {
    return { detail: { value, subValue } };
}

// ─── buildMenuItems ───────────────────────────────────────

describe('BacklogContextMenuHandler.buildMenuItems', () => {
    it('returns base items only when there are no sprints or columns', () => {
        const handler = new BacklogContextMenuHandler(createHost());
        const values = handler.buildMenuItems('c1', null).map((i) => i.value);
        expect(values).toEqual([
            'moveTop',
            'moveBottom',
            'setPriority',
            'toggleRefinement',
            'delete'
        ]);
    });

    it('builds sprint submenu excluding the current sprint and adds active sprint with divider', () => {
        const host = createHost({
            planningSprints: [
                { Id: 's1', Name: 'Sprint One' },
                { Id: 's2', sprintNumber: 7 },
                { Id: 's3' }
            ],
            activeSprint: { Id: 'a1', Name: 'Live' },
            _storeState: {
                columns: [
                    { Id: 'col1', columnHeader: 'To Do' },
                    { Id: 'col2', Name: 'Doing' },
                    { Id: 'col3', name: 'done-lower' }
                ]
            }
        });
        const handler = new BacklogContextMenuHandler(host);
        const items = handler.buildMenuItems('c1', 's1');

        const sprintItem = items.find((i) => i.value === 'moveToSprint');
        expect(sprintItem.submenu).toEqual([
            { label: 'Sprint 7', value: 's2' },
            { label: 'Sprint ', value: 's3' },
            { label: 'Live (Board)', value: 'active:a1', dividerBefore: true }
        ]);

        const columnItem = items.find((i) => i.value === 'moveToColumn');
        expect(columnItem.submenu).toEqual([
            { label: 'To Do', value: 'col1' },
            { label: 'Doing', value: 'col2' },
            { label: 'done-lower', value: 'col3' }
        ]);

        expect(items.some((i) => i.value === 'removeFromSprint')).toBe(true);
    });

    it('labels an unnamed active sprint and has no divider when it is the only sprint option', () => {
        const host = createHost({
            activeSprint: { Id: 'a1' },
            _storeState: null
        });
        const handler = new BacklogContextMenuHandler(host);
        const items = handler.buildMenuItems('c1', null);

        const sprintItem = items.find((i) => i.value === 'moveToSprint');
        expect(sprintItem.submenu).toEqual([
            {
                label: 'Active Sprint (Board)',
                value: 'active:a1',
                dividerBefore: false
            }
        ]);
        // No columns → no column submenu
        expect(items.some((i) => i.value === 'moveToColumn')).toBe(false);
        expect(items.some((i) => i.value === 'removeFromSprint')).toBe(false);
    });

    it('omits the sprint submenu when the only planning sprint is the current one', () => {
        const host = createHost({ planningSprints: [{ Id: 's1' }] });
        const handler = new BacklogContextMenuHandler(host);
        const items = handler.buildMenuItems('c1', 's1');
        expect(items.some((i) => i.value === 'moveToSprint')).toBe(false);
        expect(items.some((i) => i.value === 'removeFromSprint')).toBe(true);
    });
});

// ─── handleContextMenu ────────────────────────────────────

describe('BacklogContextMenuHandler.handleContextMenu', () => {
    function contextEvent(dataset) {
        return {
            preventDefault: jest.fn(),
            currentTarget: { dataset },
            clientX: 11,
            clientY: 22
        };
    }

    it('records target, flags multi-select, and shows the menu', () => {
        const menu = { menuItems: null, show: jest.fn() };
        const host = createHost({
            selectedCards: ['c1', 'c2'],
            template: { querySelector: jest.fn(() => menu) }
        });
        const handler = new BacklogContextMenuHandler(host);
        const event = contextEvent({ cardId: 'c1', sprintId: 's9' });

        handler.handleContextMenu(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(host._contextMenuCardId).toBe('c1');
        expect(host._contextMenuSprintId).toBe('s9');
        expect(host._contextMenuIsMulti).toBe(true);
        expect(host.template.querySelector).toHaveBeenCalledWith(
            'c-kanban-context-menu'
        );
        expect(menu.menuItems.some((i) => i.value === 'removeFromSprint')).toBe(
            true
        );
        expect(menu.show).toHaveBeenCalledWith(11, 22);
    });

    it('treats the string "null" sprint id as no sprint and single selection as not multi', () => {
        const host = createHost({ selectedCards: ['c1'] });
        const handler = new BacklogContextMenuHandler(host);

        handler.handleContextMenu(
            contextEvent({ cardId: 'c1', sprintId: 'null' })
        );

        expect(host._contextMenuSprintId).toBeNull();
        expect(host._contextMenuIsMulti).toBe(false);
    });

    it('is not multi when the clicked card is outside the selection and tolerates missing selection', () => {
        const host = createHost({ selectedCards: undefined });
        const handler = new BacklogContextMenuHandler(host);
        handler.handleContextMenu(contextEvent({ cardId: 'c1' }));
        expect(host._contextMenuSprintId).toBeNull();
        expect(host._contextMenuIsMulti).toBe(false);

        const host2 = createHost({ selectedCards: ['c2', 'c3'] });
        const handler2 = new BacklogContextMenuHandler(host2);
        handler2.handleContextMenu(contextEvent({ cardId: 'c1' }));
        expect(host2._contextMenuIsMulti).toBe(false);
    });
});

// ─── handleSelect ─────────────────────────────────────────

describe('BacklogContextMenuHandler.handleSelect', () => {
    it('does nothing without a target card', async () => {
        const host = createHost();
        const handler = new BacklogContextMenuHandler(host);
        await handler.handleSelect(selectEvent('moveTop'));
        expect(host.store.dispatch).not.toHaveBeenCalled();
    });

    it('does nothing without a store', async () => {
        const host = createHost({ _contextMenuCardId: 'c1', store: null });
        const handler = new BacklogContextMenuHandler(host);
        await expect(
            handler.handleSelect(selectEvent('delete'))
        ).resolves.toBeUndefined();
        expect(host.store).toBeNull();
    });

    it('ignores unknown actions', async () => {
        const host = createHost({ _contextMenuCardId: 'c1' });
        const handler = new BacklogContextMenuHandler(host);
        await handler.handleSelect(selectEvent('bogus'));
        expect(host.store.dispatch).not.toHaveBeenCalled();
    });

    describe('moveTop / moveBottom', () => {
        const cards = [{ Id: 'x' }, { Id: 'c1' }, { Id: 'y' }, { Id: 'z' }];

        it('moves to index 0 when card is not in a sprint', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                state: { backlogCards: cards }
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('moveTop')
            );
            expect(dispatched(host)).toEqual([
                { type: 'reorderBacklogCard', args: ['c1', 0] }
            ]);
        });

        it('moves to the first index of a sprint card', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                _contextMenuSprintId: 's1',
                state: {
                    backlogCards: cards,
                    planningSprintCards: [
                        { sprintId: 's1', cardId: 'c1' },
                        { sprintId: 's1', cardId: 'y' }
                    ]
                }
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('moveTop')
            );
            expect(dispatched(host)).toEqual([
                { type: 'reorderBacklogCard', args: ['c1', 1] }
            ]);
        });

        it('falls back to index 0 when sprint has no matching backlog cards', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                _contextMenuSprintId: 's1',
                state: { backlogCards: undefined }
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('moveTop')
            );
            expect(dispatched(host)).toEqual([
                { type: 'reorderBacklogCard', args: ['c1', 0] }
            ]);
        });

        it('moves to last index when card is not in a sprint', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                state: { backlogCards: cards }
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('moveBottom')
            );
            expect(dispatched(host)).toEqual([
                { type: 'reorderBacklogCard', args: ['c1', 3] }
            ]);
        });

        it('moves to the last index of a sprint card', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                _contextMenuSprintId: 's1',
                state: {
                    backlogCards: cards,
                    planningSprintCards: [
                        { sprintId: 's1', cardId: 'c1' },
                        { sprintId: 's1', cardId: 'y' }
                    ]
                }
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('moveBottom')
            );
            expect(dispatched(host)).toEqual([
                { type: 'reorderBacklogCard', args: ['c1', 2] }
            ]);
        });

        it('falls back to last index when sprint cards are absent from backlog', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                _contextMenuSprintId: 's1',
                state: { backlogCards: undefined }
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('moveBottom')
            );
            expect(dispatched(host)).toEqual([
                { type: 'reorderBacklogCard', args: ['c1', -1] }
            ]);
        });

        it('bulk-moves all selected cards to top / bottom in multi mode', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                _contextMenuIsMulti: true,
                selectedCards: ['c1', 'c2']
            });
            const handler = new BacklogContextMenuHandler(host);
            await handler.handleSelect(selectEvent('moveTop'));
            await handler.handleSelect(selectEvent('moveBottom'));
            expect(dispatched(host)).toEqual([
                { type: 'bulkMoveBacklogCards', args: [['c1', 'c2'], 'top'] },
                {
                    type: 'bulkMoveBacklogCards',
                    args: [['c1', 'c2'], 'bottom']
                }
            ]);
        });
    });

    describe('moveToSprint', () => {
        it('does nothing without a subValue', async () => {
            const host = createHost({ _contextMenuCardId: 'c1' });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('moveToSprint')
            );
            expect(host.store.dispatch).not.toHaveBeenCalled();
        });

        it('removes from current sprint then adds to target planning sprint', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                _contextMenuSprintId: 's1'
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('moveToSprint', 's2')
            );
            expect(dispatched(host)).toEqual([
                { type: 'removeCardFromBacklogSprint', args: ['s1', 'c1'] },
                { type: 'addCardsToBacklogSprint', args: ['s2', ['c1']] }
            ]);
        });

        it('moves an unsprinted card to the active sprint', async () => {
            const host = createHost({ _contextMenuCardId: 'c1' });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('moveToSprint', 'active:a1')
            );
            expect(dispatched(host)).toEqual([
                { type: 'moveCardsToSprint', args: ['a1', ['c1']] }
            ]);
        });

        it('bulk-moves selected cards to the active sprint, removing them from sprints first', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                _contextMenuIsMulti: true,
                selectedCards: ['c1', 'c2'],
                state: {
                    planningSprintCards: [{ sprintId: 's1', cardId: 'c2' }]
                }
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('moveToSprint', 'active:a1')
            );
            expect(dispatched(host)).toEqual([
                { type: 'removeCardFromBacklogSprint', args: ['s1', 'c2'] },
                { type: 'moveCardsToSprint', args: ['a1', ['c1', 'c2']] },
                { type: 'setSelectedBacklogCards', args: [[]] }
            ]);
        });

        it('bulk-adds each selected card to a planning sprint', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                _contextMenuIsMulti: true,
                selectedCards: ['c1', 'c2'],
                state: { planningSprintCards: undefined }
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('moveToSprint', 's2')
            );
            expect(dispatched(host)).toEqual([
                { type: 'addCardsToBacklogSprint', args: ['s2', ['c1']] },
                { type: 'addCardsToBacklogSprint', args: ['s2', ['c2']] },
                { type: 'setSelectedBacklogCards', args: [[]] }
            ]);
        });
    });

    describe('moveToColumn', () => {
        it('does nothing without subValue or without an active sprint', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                activeSprint: { Id: 'a1' }
            });
            const handler = new BacklogContextMenuHandler(host);
            await handler.handleSelect(selectEvent('moveToColumn'));

            const host2 = createHost({ _contextMenuCardId: 'c1' });
            await new BacklogContextMenuHandler(host2).handleSelect(
                selectEvent('moveToColumn', 'col1')
            );

            expect(host.store.dispatch).not.toHaveBeenCalled();
            expect(host2.store.dispatch).not.toHaveBeenCalled();
        });

        it('removes from sprint, moves to active sprint, then to column', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                _contextMenuSprintId: 's1',
                activeSprint: { Id: 'a1' }
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('moveToColumn', 'col1')
            );
            expect(dispatched(host)).toEqual([
                { type: 'removeCardFromBacklogSprint', args: ['s1', 'c1'] },
                { type: 'moveCardsToSprint', args: ['a1', ['c1']] },
                { type: 'moveCard', args: ['c1', 'col1', 0] }
            ]);
        });

        it('moves every selected card to the column and clears selection', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                _contextMenuIsMulti: true,
                selectedCards: ['c1', 'c2'],
                activeSprint: { Id: 'a1' }
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('moveToColumn', 'col2')
            );
            expect(dispatched(host)).toEqual([
                { type: 'moveCardsToSprint', args: ['a1', ['c1']] },
                { type: 'moveCard', args: ['c1', 'col2', 0] },
                { type: 'moveCardsToSprint', args: ['a1', ['c2']] },
                { type: 'moveCard', args: ['c2', 'col2', 0] },
                { type: 'setSelectedBacklogCards', args: [[]] }
            ]);
        });
    });

    describe('removeFromSprint', () => {
        it('removes a single card from its sprint', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                _contextMenuSprintId: 's1'
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('removeFromSprint')
            );
            expect(dispatched(host)).toEqual([
                { type: 'removeCardFromBacklogSprint', args: ['s1', 'c1'] }
            ]);
        });

        it('does nothing for a single card that is not in a sprint', async () => {
            const host = createHost({ _contextMenuCardId: 'c1' });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('removeFromSprint')
            );
            expect(host.store.dispatch).not.toHaveBeenCalled();
        });

        it('removes only sprinted cards in multi mode and clears selection', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                _contextMenuIsMulti: true,
                selectedCards: ['c1', 'c2'],
                state: {
                    planningSprintCards: [{ sprintId: 's3', cardId: 'c2' }]
                }
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('removeFromSprint')
            );
            expect(dispatched(host)).toEqual([
                { type: 'removeCardFromBacklogSprint', args: ['s3', 'c2'] },
                { type: 'setSelectedBacklogCards', args: [[]] }
            ]);
        });
    });

    describe('setPriority', () => {
        it('does nothing without a subValue', async () => {
            const host = createHost({ _contextMenuCardId: 'c1' });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('setPriority')
            );
            expect(host.store.dispatch).not.toHaveBeenCalled();
        });

        it('updates priority for every target card', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                _contextMenuIsMulti: true,
                selectedCards: ['c1', 'c2']
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('setPriority', 'High')
            );
            expect(dispatched(host)).toEqual([
                {
                    type: 'updateBacklogCard',
                    args: ['c1', { priority: 'High' }]
                },
                {
                    type: 'updateBacklogCard',
                    args: ['c2', { priority: 'High' }]
                }
            ]);
        });
    });

    describe('toggleRefinement', () => {
        it('inverts the refinement flag of the clicked card', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                backlogCards: [{ Id: 'c1', needsRefinement: true }]
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('toggleRefinement')
            );
            expect(dispatched(host)).toEqual([
                {
                    type: 'updateBacklogCard',
                    args: ['c1', { needsRefinement: false }]
                }
            ]);
        });

        it('applies the inverted flag to all selected cards in multi mode', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                _contextMenuIsMulti: true,
                selectedCards: ['c1', 'c2'],
                backlogCards: [{ Id: 'c1' }, { Id: 'c2' }]
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('toggleRefinement')
            );
            expect(dispatched(host)).toEqual([
                {
                    type: 'updateBacklogCard',
                    args: ['c1', { needsRefinement: true }]
                },
                {
                    type: 'updateBacklogCard',
                    args: ['c2', { needsRefinement: true }]
                }
            ]);
        });

        it('does nothing when the card is not visible in the backlog', async () => {
            const host = createHost({ _contextMenuCardId: 'missing' });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('toggleRefinement')
            );
            expect(host.store.dispatch).not.toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('deletes a single card without touching selection', async () => {
            const host = createHost({ _contextMenuCardId: 'c1' });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('delete')
            );
            expect(dispatched(host)).toEqual([
                { type: 'deleteBacklogCards', args: [['c1']] }
            ]);
        });

        it('deletes all selected cards and clears selection in multi mode', async () => {
            const host = createHost({
                _contextMenuCardId: 'c1',
                _contextMenuIsMulti: true,
                selectedCards: ['c1', 'c2']
            });
            await new BacklogContextMenuHandler(host).handleSelect(
                selectEvent('delete')
            );
            expect(dispatched(host)).toEqual([
                { type: 'deleteBacklogCards', args: [['c1', 'c2']] },
                { type: 'setSelectedBacklogCards', args: [[]] }
            ]);
        });
    });
});
