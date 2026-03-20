import { createStore, KanbanStore } from '../../kanbanStore/kanbanStore';

describe('KanbanStore', () => {
    let store;

    beforeEach(() => {
        store = createStore();
    });

    describe('Initialization', () => {
        it('should create a new store instance', () => {
            expect(store).toBeInstanceOf(KanbanStore);
        });

        it('should initialize with empty state', () => {
            const state = store.getState();
            expect(state.columns).toEqual([]);
            expect(state.board).toBeNull();
            expect(state.isDragging).toBe(false);
            expect(state.dragSource).toBeNull();
        });

        it('should create independent store instances', () => {
            const store1 = createStore();
            const store2 = createStore();

            store1.dispatch({
                type: 'SET_BOARD',
                payload: { Id: 'board1', Name: 'Board 1' }
            });

            expect(store1.getState().board).toBeTruthy();
            expect(store2.getState().board).toBeNull();
        });
    });

    describe('getState', () => {
        it('should return frozen state object', () => {
            const state = store.getState();
            expect(Object.isFrozen(state)).toBe(true);
        });

        it('should return copy of state, not reference', () => {
            const state1 = store.getState();
            const state2 = store.getState();

            expect(state1).not.toBe(state2);
            expect(state1).toEqual(state2);
        });
    });

    describe('getColumns', () => {
        it('should return columns from state', () => {
            const columns = [
                { Id: 'col1', Name: 'To Do', cards: [] },
                { Id: 'col2', Name: 'Done', cards: [] }
            ];

            store.dispatch({ type: 'SET_COLUMNS', payload: columns });

            expect(store.getColumns()).toEqual(columns);
        });

        it('should return dragState when dragging', () => {
            const columns = [
                { Id: 'col1', Name: 'To Do', cards: [{ Id: 'card1' }] }
            ];

            store.dispatch({ type: 'SET_COLUMNS', payload: columns });
            store.dispatch({
                type: 'START_DRAG',
                payload: { source: { columnId: 'col1', cardIndex: 0 } }
            });

            const dragColumns = store.getColumns();
            expect(Array.isArray(dragColumns)).toBe(true);
        });

        it('should return empty array when no columns', () => {
            expect(store.getColumns()).toEqual([]);
        });
    });

    describe('subscribe', () => {
        it('should call subscriber on state change', () => {
            const callback = jest.fn();
            store.subscribe(callback);

            store.dispatch({
                type: 'SET_BOARD',
                payload: { Id: 'board1' }
            });

            expect(callback).toHaveBeenCalled();
        });

        it('should pass state to subscriber', () => {
            const callback = jest.fn();
            store.subscribe(callback);

            const board = { Id: 'board1', Name: 'Test Board' };
            store.dispatch({ type: 'SET_BOARD', payload: board });

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ board })
            );
        });

        it('should return unsubscribe function', () => {
            const callback = jest.fn();
            const unsubscribe = store.subscribe(callback);

            unsubscribe();

            store.dispatch({
                type: 'SET_BOARD',
                payload: { Id: 'board1' }
            });

            expect(callback).not.toHaveBeenCalled();
        });

        it('should support multiple subscribers', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            store.subscribe(callback1);
            store.subscribe(callback2);

            store.dispatch({
                type: 'SET_BOARD',
                payload: { Id: 'board1' }
            });

            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });

        it('should handle errors in subscriber callbacks', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Subscriber error');
            });
            const goodCallback = jest.fn();

            store.subscribe(errorCallback);
            store.subscribe(goodCallback);

            expect(() => {
                store.dispatch({
                    type: 'SET_BOARD',
                    payload: { Id: 'board1' }
                });
            }).not.toThrow();

            expect(goodCallback).toHaveBeenCalled();
        });
    });

    describe('SET_BOARD action', () => {
        it('should set board data', () => {
            const board = { Id: 'board1', Name: 'Test Board' };
            store.dispatch({ type: 'SET_BOARD', payload: board });

            expect(store.getState().board).toEqual(board);
        });
    });

    describe('SET_COLUMNS action', () => {
        it('should set columns', () => {
            const columns = [
                { Id: 'col1', Name: 'To Do', cards: [] },
                { Id: 'col2', Name: 'Done', cards: [] }
            ];

            store.dispatch({ type: 'SET_COLUMNS', payload: columns });

            expect(store.getState().columns).toEqual(columns);
        });

        it('should deep clone columns', () => {
            const columns = [{ Id: 'col1', Name: 'To Do', cards: [] }];

            store.dispatch({ type: 'SET_COLUMNS', payload: columns });

            // Modify original
            columns[0].Name = 'Changed';

            // State should not be affected
            expect(store.getState().columns[0].Name).toBe('To Do');
        });
    });

    describe('UPDATE_COLUMNS action', () => {
        it('should update columns', () => {
            const columns = [{ Id: 'col1', Name: 'To Do', cards: [] }];
            store.dispatch({ type: 'SET_COLUMNS', payload: columns });

            const updated = [{ Id: 'col1', Name: 'Updated', cards: [] }];
            store.dispatch({ type: 'UPDATE_COLUMNS', payload: updated });

            expect(store.getState().columns[0].Name).toBe('Updated');
        });
    });

    describe('Drag and Drop Actions', () => {
        beforeEach(() => {
            const columns = [
                {
                    Id: 'col1',
                    Name: 'To Do',
                    cards: [
                        { Id: 'card1', subject: 'Task 1' },
                        { Id: 'card2', subject: 'Task 2' }
                    ]
                },
                {
                    Id: 'col2',
                    Name: 'Done',
                    cards: [{ Id: 'card3', subject: 'Task 3' }]
                }
            ];
            store.dispatch({ type: 'SET_COLUMNS', payload: columns });
        });

        describe('START_DRAG', () => {
            it('should initiate drag state', () => {
                store.dispatch({
                    type: 'START_DRAG',
                    payload: { source: { columnId: 'col1', cardIndex: 0 } }
                });

                const state = store.getState();
                expect(state.isDragging).toBe(true);
                expect(state.dragSource).toEqual({
                    columnId: 'col1',
                    cardIndex: 0
                });
                expect(state.dragState).toBeTruthy();
            });

            it('should not start drag with empty columns', () => {
                const emptyStore = createStore();
                emptyStore.dispatch({
                    type: 'START_DRAG',
                    payload: { source: { columnId: 'col1', cardIndex: 0 } }
                });

                expect(emptyStore.getState().isDragging).toBe(false);
            });
        });

        describe('UPDATE_DRAG_POSITION', () => {
            beforeEach(() => {
                store.dispatch({
                    type: 'START_DRAG',
                    payload: { source: { columnId: 'col1', cardIndex: 0 } }
                });
            });

            it('should update drag position', () => {
                store.dispatch({
                    type: 'UPDATE_DRAG_POSITION',
                    payload: { targetColumnId: 'col2', targetIndex: 0 }
                });

                const state = store.getState();
                expect(state.dragState).toBeTruthy();
            });

            it('should skip drag state recalculation if position unchanged', () => {
                // First update
                store.dispatch({
                    type: 'UPDATE_DRAG_POSITION',
                    payload: { targetColumnId: 'col2', targetIndex: 0 }
                });

                const firstDragState = store.getState().dragState;

                // Same position - drag state should remain the same object reference
                store.dispatch({
                    type: 'UPDATE_DRAG_POSITION',
                    payload: { targetColumnId: 'col2', targetIndex: 0 }
                });

                const secondDragState = store.getState().dragState;
                expect(secondDragState).toBe(firstDragState);
            });
        });

        describe('COMMIT_DRAG', () => {
            it('should commit drag state to columns', () => {
                store.dispatch({
                    type: 'START_DRAG',
                    payload: { source: { columnId: 'col1', cardIndex: 0 } }
                });

                store.dispatch({
                    type: 'UPDATE_DRAG_POSITION',
                    payload: { targetColumnId: 'col2', targetIndex: 0 }
                });

                store.dispatch({ type: 'COMMIT_DRAG' });

                const state = store.getState();
                expect(state.isDragging).toBe(false);
                expect(state.dragState).toBeNull();
                expect(state.dragSource).toBeNull();
            });
        });

        describe('CANCEL_DRAG', () => {
            it('should revert to original state', () => {
                store.dispatch({
                    type: 'START_DRAG',
                    payload: { source: { columnId: 'col1', cardIndex: 0 } }
                });

                store.dispatch({
                    type: 'UPDATE_DRAG_POSITION',
                    payload: { targetColumnId: 'col2', targetIndex: 0 }
                });

                store.dispatch({ type: 'CANCEL_DRAG' });

                const state = store.getState();
                expect(state.isDragging).toBe(false);
                expect(state.dragState).toBeNull();
            });
        });
    });

    describe('MOVE_CARD action', () => {
        beforeEach(() => {
            const columns = [
                {
                    Id: 'col1',
                    Name: 'To Do',
                    cards: [{ Id: 'card1', subject: 'Task 1' }],
                    cardCount: 1
                },
                { Id: 'col2', Name: 'Done', cards: [], cardCount: 0 }
            ];
            store.dispatch({ type: 'SET_COLUMNS', payload: columns });
        });

        it('should move card between columns', () => {
            store.dispatch({
                type: 'MOVE_CARD',
                payload: {
                    cardId: 'card1',
                    targetColumnId: 'col2',
                    targetIndex: 0
                }
            });

            const columns = store.getState().columns;
            expect(columns[0].cards).toHaveLength(0);
            expect(columns[1].cards).toHaveLength(1);
            expect(columns[1].cards[0].Id).toBe('card1');
        });

        it('should update card counts', () => {
            store.dispatch({
                type: 'MOVE_CARD',
                payload: {
                    cardId: 'card1',
                    targetColumnId: 'col2',
                    targetIndex: 0
                }
            });

            const columns = store.getState().columns;
            expect(columns[0].cardCount).toBe(0);
            expect(columns[1].cardCount).toBe(1);
        });
    });

    describe('ADD_CARD action', () => {
        beforeEach(() => {
            const columns = [
                { Id: 'col1', Name: 'To Do', cards: [], cardCount: 0 }
            ];
            store.dispatch({ type: 'SET_COLUMNS', payload: columns });
        });

        it('should add card to column', () => {
            const newCard = { Id: 'card1', subject: 'New Task' };

            store.dispatch({
                type: 'ADD_CARD',
                payload: { card: newCard, columnId: 'col1' }
            });

            const columns = store.getState().columns;
            expect(columns[0].cards).toHaveLength(1);
            // Card should be enriched with derived properties by the reducer
            expect(columns[0].cards[0]).toEqual(
                expect.objectContaining({
                    Id: 'card1',
                    subject: 'New Task',
                    // Enriched properties added by reducer
                    priorityClass: expect.any(String),
                    recordUrl: expect.stringContaining('card1')
                })
            );
        });

        it('should update card count', () => {
            const newCard = { Id: 'card1', subject: 'New Task' };

            store.dispatch({
                type: 'ADD_CARD',
                payload: { card: newCard, columnId: 'col1' }
            });

            const columns = store.getState().columns;
            expect(columns[0].cardCount).toBe(1);
        });
    });

    describe('UPDATE_CARD action', () => {
        beforeEach(() => {
            const columns = [
                {
                    Id: 'col1',
                    Name: 'To Do',
                    cards: [
                        { Id: 'card1', subject: 'Task 1', priority: 'Low' }
                    ],
                    cardCount: 1
                },
                { Id: 'col2', Name: 'Done', cards: [], cardCount: 0 }
            ];
            store.dispatch({ type: 'SET_COLUMNS', payload: columns });
        });

        it('should update card properties', () => {
            store.dispatch({
                type: 'UPDATE_CARD',
                payload: {
                    cardId: 'card1',
                    updates: { subject: 'Updated Task', priority: 'High' }
                }
            });

            const card = store.getState().columns[0].cards[0];
            expect(card.subject).toBe('Updated Task');
            expect(card.priority).toBe('High');
        });

        it('should move card to different column when columnId changes', () => {
            store.dispatch({
                type: 'UPDATE_CARD',
                payload: {
                    cardId: 'card1',
                    updates: { columnId: 'col2' }
                }
            });

            const columns = store.getState().columns;
            expect(columns[0].cards).toHaveLength(0);
            expect(columns[1].cards).toHaveLength(1);
            expect(columns[1].cards[0].Id).toBe('card1');
        });
    });

    describe('DELETE_CARD action', () => {
        beforeEach(() => {
            const columns = [
                {
                    Id: 'col1',
                    Name: 'To Do',
                    cards: [
                        { Id: 'card1', subject: 'Task 1' },
                        { Id: 'card2', subject: 'Task 2' }
                    ],
                    cardCount: 2
                }
            ];
            store.dispatch({ type: 'SET_COLUMNS', payload: columns });
        });

        it('should delete card from column', () => {
            store.dispatch({
                type: 'DELETE_CARD',
                payload: { cardId: 'card1' }
            });

            const columns = store.getState().columns;
            expect(columns[0].cards).toHaveLength(1);
            expect(columns[0].cards[0].Id).toBe('card2');
        });

        it('should update card count', () => {
            store.dispatch({
                type: 'DELETE_CARD',
                payload: { cardId: 'card1' }
            });

            const columns = store.getState().columns;
            expect(columns[0].cardCount).toBe(1);
        });
    });

    describe('reset', () => {
        it('should reset store to initial state', () => {
            store.dispatch({
                type: 'SET_BOARD',
                payload: { Id: 'board1' }
            });
            store.dispatch({
                type: 'SET_COLUMNS',
                payload: [{ Id: 'col1', Name: 'To Do', cards: [] }]
            });

            store.reset();

            const state = store.getState();
            expect(state.columns).toEqual([]);
            expect(state.board).toBeNull();
            expect(state.isDragging).toBe(false);
        });

        it('should notify subscribers on reset', () => {
            const callback = jest.fn();
            store.subscribe(callback);

            store.reset();

            expect(callback).toHaveBeenCalled();
        });
    });

    describe('Unknown actions', () => {
        it('should not modify state for unknown actions', () => {
            const originalState = store.getState();

            store.dispatch({ type: 'UNKNOWN_ACTION' });

            expect(store.getState()).toEqual(originalState);
        });
    });

    describe('Sync State Management', () => {
        it('should initialize with idle sync state', () => {
            const state = store.getState();
            expect(state.syncState).toBe('idle');
            expect(state.pendingOperations).toEqual([]);
            expect(state.lastSyncTime).toBeNull();
            expect(state.lastSyncError).toBeNull();
        });

        it('should start operation and set syncing state', () => {
            store.dispatch({
                type: 'START_OPERATION',
                payload: { id: 'op1', type: 'update', cardId: 'card1' }
            });

            const state = store.getState();
            expect(state.syncState).toBe('syncing');
            expect(state.pendingOperations).toHaveLength(1);
            expect(state.pendingOperations[0]).toEqual(
                expect.objectContaining({
                    id: 'op1',
                    type: 'update',
                    cardId: 'card1'
                })
            );
        });

        it('should track multiple pending operations', () => {
            store.dispatch({
                type: 'START_OPERATION',
                payload: { id: 'op1', type: 'update', cardId: 'card1' }
            });
            store.dispatch({
                type: 'START_OPERATION',
                payload: { id: 'op2', type: 'move', cardId: 'card2' }
            });

            const state = store.getState();
            expect(state.syncState).toBe('syncing');
            expect(state.pendingOperations).toHaveLength(2);
        });

        it('should complete operation and update state', () => {
            store.dispatch({
                type: 'START_OPERATION',
                payload: { id: 'op1', type: 'update', cardId: 'card1' }
            });
            store.dispatch({
                type: 'COMPLETE_OPERATION',
                payload: { id: 'op1' }
            });

            const state = store.getState();
            expect(state.syncState).toBe('idle');
            expect(state.pendingOperations).toHaveLength(0);
            expect(state.lastSyncTime).toBeTruthy();
            expect(state.lastSyncError).toBeNull();
        });

        it('should stay in syncing state if operations remain', () => {
            store.dispatch({
                type: 'START_OPERATION',
                payload: { id: 'op1', type: 'update', cardId: 'card1' }
            });
            store.dispatch({
                type: 'START_OPERATION',
                payload: { id: 'op2', type: 'move', cardId: 'card2' }
            });
            store.dispatch({
                type: 'COMPLETE_OPERATION',
                payload: { id: 'op1' }
            });

            const state = store.getState();
            expect(state.syncState).toBe('syncing');
            expect(state.pendingOperations).toHaveLength(1);
            expect(state.pendingOperations[0].id).toBe('op2');
        });

        it('should set failed state on operation failure', () => {
            store.dispatch({
                type: 'START_OPERATION',
                payload: { id: 'op1', type: 'update', cardId: 'card1' }
            });
            store.dispatch({
                type: 'FAIL_OPERATION',
                payload: { id: 'op1', error: 'Network error' }
            });

            const state = store.getState();
            expect(state.syncState).toBe('failed');
            expect(state.pendingOperations).toHaveLength(0);
            expect(state.lastSyncError).toEqual(
                expect.objectContaining({
                    operationId: 'op1',
                    error: 'Network error'
                })
            );
        });

        it('should set sync state directly', () => {
            store.dispatch({
                type: 'SET_SYNC_STATE',
                payload: 'syncing'
            });

            expect(store.getState().syncState).toBe('syncing');

            store.dispatch({
                type: 'SET_SYNC_STATE',
                payload: 'idle'
            });

            expect(store.getState().syncState).toBe('idle');
        });
    });
});
