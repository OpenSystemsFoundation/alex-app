/**
 * Unit tests for Board DragDropHandler
 *
 * Covers: drag start/end, drag over, drop same/cross column,
 * backlog-to-board drop, drag image cleanup, position calculation.
 */
import DragDropHandler from '../../handlers/dragDropHandler';

jest.mock('c/kanbanStore', () => ({
    moveCardAsync: jest.fn(() => () => Promise.resolve({ success: true })),
    addCardsToSprintAsync: jest.fn(
        () => () => Promise.resolve({ success: true })
    ),
    selectors: {
        getActiveSprint: jest.fn(() => ({ Id: 'sprint1' }))
    }
}));

import { addCardsToSprintAsync, moveCardAsync, selectors } from 'c/kanbanStore';

beforeEach(() => jest.clearAllMocks());

function createComponent(overrides = {}) {
    return {
        dragData: null,
        dragPlaceholder: null,
        lastPlaceholderPosition: null,
        columns: [],
        store: {
            getState: () => ({}),
            dispatch: jest.fn((thunk) => {
                if (typeof thunk === 'function')
                    return thunk(jest.fn(), () => ({}));
                return thunk;
            })
        },
        requestTracker: {
            trackRequest: jest.fn(() => 'req-1'),
            completeRequest: jest.fn(),
            failRequest: jest.fn()
        },
        operationQueue: {
            enqueue: jest.fn((op) => op.execute())
        },
        subscriptionManager: null,
        toastManager: {
            showError: jest.fn()
        },
        _clientId: 'client-1',
        loadBoardData: jest.fn(() => Promise.resolve()),
        ...overrides
    };
}

function createDragEvent(type, overrides = {}) {
    return {
        type,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {
            dataset: { cardId: 'c1', columnId: 'col1' },
            offsetHeight: 80,
            offsetWidth: 200,
            getBoundingClientRect: () => ({
                top: 100,
                left: 50,
                width: 200,
                height: 80
            }),
            classList: { add: jest.fn(), remove: jest.fn() },
            cloneNode: jest.fn(() => ({
                style: {},
                classList: { remove: jest.fn() }
            }))
        },
        currentTarget: {
            dataset: { columnId: 'col2' },
            querySelectorAll: jest.fn(() => []),
            appendChild: jest.fn(),
            insertBefore: jest.fn(),
            ...overrides.currentTarget
        },
        dataTransfer: {
            effectAllowed: '',
            dropEffect: '',
            setData: jest.fn(),
            getData: jest.fn(() => ''),
            setDragImage: jest.fn()
        },
        clientX: 100,
        clientY: 150,
        ...overrides
    };
}

describe('Board DragDropHandler', () => {
    describe('handleDragStart', () => {
        it('sets drag data and creates drag image', () => {
            const component = createComponent();
            const handler = new DragDropHandler(component);

            // Mock document.body.appendChild
            const originalAppendChild = document.body.appendChild;
            document.body.appendChild = jest.fn();

            const event = createDragEvent('dragstart');
            handler.handleDragStart(event);

            expect(component.dragData).toEqual({
                cardId: 'c1',
                columnId: 'col1',
                cardHeight: 80
            });
            expect(event.dataTransfer.effectAllowed).toBe('move');
            expect(document.body.appendChild).toHaveBeenCalled();

            document.body.appendChild = originalAppendChild;
        });
    });

    describe('handleDragEnd', () => {
        it('cleans up drag image from DOM', () => {
            const component = createComponent();
            const handler = new DragDropHandler(component);

            const mockElement = {
                parentNode: {
                    removeChild: jest.fn()
                }
            };
            handler._dragImageElement = mockElement;

            const event = createDragEvent('dragend');
            handler.handleDragEnd(event);

            expect(mockElement.parentNode.removeChild).toHaveBeenCalledWith(
                mockElement
            );
            expect(handler._dragImageElement).toBeNull();
            expect(component.dragData).toBeNull();
        });
    });

    describe('handleDrop — board-to-board', () => {
        it('cleans up drag image in handleDrop', async () => {
            const card = { Id: 'c1', position: '1000' };
            const col1 = {
                Id: 'col1',
                cards: [card],
                cardCount: 1
            };
            const component = createComponent({
                columns: [col1, { Id: 'col2', cards: [], cardCount: 0 }]
            });
            component.dragData = {
                cardId: 'c1',
                columnId: 'col1',
                cardHeight: 80
            };
            const handler = new DragDropHandler(component);

            const mockDragImage = {
                parentNode: { removeChild: jest.fn() }
            };
            handler._dragImageElement = mockDragImage;

            const event = createDragEvent('drop', {
                currentTarget: {
                    dataset: { columnId: 'col2' },
                    querySelectorAll: jest.fn(() => [])
                }
            });
            event.dataTransfer.getData = jest.fn(() => '');

            await handler.handleDrop(event);

            expect(mockDragImage.parentNode.removeChild).toHaveBeenCalledWith(
                mockDragImage
            );
            expect(handler._dragImageElement).toBeNull();
        });
    });

    describe('handleDrop — backlog-to-board', () => {
        it('adds to sprint and moves card to column', async () => {
            const component = createComponent();
            const handler = new DragDropHandler(component);

            const event = createDragEvent('drop', {
                currentTarget: {
                    dataset: { columnId: 'col2' },
                    querySelectorAll: jest.fn(() => [])
                }
            });
            event.dataTransfer.getData = jest.fn((key) => {
                if (key === 'source') return 'backlog';
                if (key === 'text/plain') return 'backlog-card-1';
                return '';
            });

            await handler.handleDrop(event);

            expect(addCardsToSprintAsync).toHaveBeenCalledWith('sprint1', [
                'backlog-card-1'
            ]);
            expect(component.loadBoardData).toHaveBeenCalled();
        });
    });

    describe('calculateDropPosition', () => {
        it('returns 0 for empty container', () => {
            const component = createComponent();
            const handler = new DragDropHandler(component);
            const container = {
                dataset: { columnId: 'col1' },
                querySelectorAll: jest.fn(() => [])
            };
            const event = { clientY: 100 };
            expect(handler.calculateDropPosition(event, container)).toBe(0);
        });
    });
});

describe('Board DragDropHandler — extended', () => {
    const flushPromises = () =>
        new Promise((resolve) => {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(resolve, 0);
        });

    function cardEl(top, height = 40) {
        return { getBoundingClientRect: () => ({ top, height }) };
    }

    function container(columnId, cards = []) {
        return {
            dataset: { columnId },
            querySelectorAll: jest.fn(() => cards),
            appendChild: jest.fn(),
            insertBefore: jest.fn()
        };
    }

    describe('handleDragStart', () => {
        it('styles the drag image, sets transfer data and marks dragging on next frame', () => {
            const component = createComponent();
            const handler = new DragDropHandler(component);
            const rafSpy = jest
                .spyOn(window, 'requestAnimationFrame')
                .mockImplementation((cb) => {
                    cb();
                    return 1;
                });
            const appendSpy = jest
                .spyOn(document.body, 'appendChild')
                .mockImplementation(() => {});

            const event = createDragEvent('dragstart');
            handler.handleDragStart(event);

            const dragImage = event.target.cloneNode.mock.results[0].value;
            expect(event.target.cloneNode).toHaveBeenCalledWith(true);
            expect(dragImage.style).toMatchObject({
                width: '200px',
                position: 'absolute',
                opacity: '0.85',
                pointerEvents: 'none'
            });
            expect(dragImage.classList.remove).toHaveBeenCalledWith('dragging');
            expect(event.dataTransfer.setData).toHaveBeenCalledWith(
                'text/plain',
                'c1'
            );
            expect(event.dataTransfer.setData).toHaveBeenCalledWith(
                'columnId',
                'col1'
            );
            // clientX 100 - left 50, clientY 150 - top 100
            expect(event.dataTransfer.setDragImage).toHaveBeenCalledWith(
                dragImage,
                50,
                50
            );
            expect(event.target.classList.add).toHaveBeenCalledWith('dragging');
            expect(handler._dragImageElement).toBe(dragImage);

            rafSpy.mockRestore();
            appendSpy.mockRestore();
        });
    });

    describe('handleDragEnd', () => {
        it('removes the placeholder and resets drag state', () => {
            const placeholder = { parentNode: { removeChild: jest.fn() } };
            const component = createComponent({
                dragData: { cardId: 'c1' },
                dragPlaceholder: placeholder,
                lastPlaceholderPosition: 'col1-0'
            });
            const handler = new DragDropHandler(component);
            handler._cachedCardElements = [1];
            handler._cachedContainerId = 'col1';

            const event = createDragEvent('dragend');
            handler.handleDragEnd(event);

            expect(event.target.classList.remove).toHaveBeenCalledWith(
                'dragging'
            );
            expect(placeholder.parentNode.removeChild).toHaveBeenCalledWith(
                placeholder
            );
            expect(component.dragPlaceholder).toBeNull();
            expect(component.lastPlaceholderPosition).toBeNull();
            expect(handler._cachedCardElements).toBeNull();
            expect(handler._cachedContainerId).toBeNull();
        });

        it('handles detached drag image and placeholder', () => {
            const component = createComponent({
                dragPlaceholder: { parentNode: null }
            });
            const handler = new DragDropHandler(component);
            handler._dragImageElement = { parentNode: null };

            handler.handleDragEnd(createDragEvent('dragend'));

            expect(handler._dragImageElement).toBeNull();
            expect(component.dragPlaceholder).toBeNull();
        });
    });

    describe('handleDragOver', () => {
        it('sets drop effect and ignores events without drag data', () => {
            const component = createComponent();
            const handler = new DragDropHandler(component);
            const spy = jest.spyOn(handler, 'updateDragPlaceholder');
            const event = createDragEvent('dragover');

            handler.handleDragOver(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.dataTransfer.dropEffect).toBe('move');
            expect(spy).not.toHaveBeenCalled();
        });

        it('updates the placeholder when hovering a new position in another column', () => {
            const component = createComponent({
                dragData: { cardId: 'c1', columnId: 'col1', cardHeight: 60 },
                columns: [{ Id: 'col1', cards: [{ Id: 'c1' }] }]
            });
            const handler = new DragDropHandler(component);
            const spy = jest
                .spyOn(handler, 'updateDragPlaceholder')
                .mockImplementation(() => {});
            const event = createDragEvent('dragover');

            handler.handleDragOver(event);
            expect(component.lastPlaceholderPosition).toBe('col2-0');
            expect(spy).toHaveBeenCalledWith(event.currentTarget, 0);

            // Same position again → no extra update
            handler.handleDragOver(event);
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('removes the placeholder when hovering the original slot', () => {
            const placeholder = { parentNode: { removeChild: jest.fn() } };
            const component = createComponent({
                dragData: { cardId: 'c1', columnId: 'col2' },
                dragPlaceholder: placeholder,
                lastPlaceholderPosition: 'col2-1',
                columns: [{ Id: 'col2', cards: [{ Id: 'c1' }] }]
            });
            const handler = new DragDropHandler(component);
            const spy = jest.spyOn(handler, 'updateDragPlaceholder');

            handler.handleDragOver(createDragEvent('dragover'));

            expect(placeholder.parentNode.removeChild).toHaveBeenCalledWith(
                placeholder
            );
            expect(component.lastPlaceholderPosition).toBeNull();
            expect(spy).not.toHaveBeenCalled();
        });

        it('returns early on the original slot even without a placeholder', () => {
            const component = createComponent({
                dragData: { cardId: 'c1', columnId: 'col2' },
                lastPlaceholderPosition: 'keep',
                columns: [{ Id: 'col2', cards: [{ Id: 'c1' }] }]
            });
            const handler = new DragDropHandler(component);
            handler.handleDragOver(createDragEvent('dragover'));
            expect(component.lastPlaceholderPosition).toBe('keep');

            component.dragPlaceholder = { parentNode: null };
            handler.handleDragOver(createDragEvent('dragover'));
            expect(component.lastPlaceholderPosition).toBe('keep');
        });

        it('updates the placeholder within the same column at a new index', () => {
            const component = createComponent({
                dragData: { cardId: 'c1', columnId: 'col2' },
                columns: [{ Id: 'col2', cards: [{ Id: 'c0' }, { Id: 'c1' }] }]
            });
            const handler = new DragDropHandler(component);
            const spy = jest
                .spyOn(handler, 'updateDragPlaceholder')
                .mockImplementation(() => {});

            handler.handleDragOver(createDragEvent('dragover'));

            expect(spy).toHaveBeenCalledWith(expect.anything(), 0);
            expect(component.lastPlaceholderPosition).toBe('col2-0');
        });

        it('updates the placeholder when the source column is missing', () => {
            const component = createComponent({
                dragData: { cardId: 'c1', columnId: 'col2' },
                columns: []
            });
            const handler = new DragDropHandler(component);
            const spy = jest
                .spyOn(handler, 'updateDragPlaceholder')
                .mockImplementation(() => {});

            handler.handleDragOver(createDragEvent('dragover'));
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('handleDrop', () => {
        function dropEvent(columnId = 'col2') {
            const event = createDragEvent('drop', {
                currentTarget: container(columnId)
            });
            event.dataTransfer.getData = jest.fn(() => '');
            return event;
        }

        it('ignores backlog drops without a card id', async () => {
            const component = createComponent();
            const handler = new DragDropHandler(component);
            const spy = jest.spyOn(handler, 'handleBacklogDrop');
            const event = dropEvent();
            event.dataTransfer.getData = jest.fn((key) => {
                return key === 'source' ? 'backlog' : '';
            });

            await handler.handleDrop(event);
            expect(spy).not.toHaveBeenCalled();
        });

        it('ignores drops without drag data', async () => {
            const component = createComponent();
            const handler = new DragDropHandler(component);
            const spy = jest.spyOn(handler, 'moveCard');
            const event = dropEvent();

            await handler.handleDrop(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopPropagation).toHaveBeenCalled();
            expect(spy).not.toHaveBeenCalled();
        });

        it('ignores drops when the source column is gone', async () => {
            const component = createComponent({
                dragData: { cardId: 'c1', columnId: 'missing' },
                columns: [{ Id: 'col2', cards: [] }]
            });
            const handler = new DragDropHandler(component);
            const spy = jest.spyOn(handler, 'moveCard');

            await handler.handleDrop(dropEvent());
            expect(spy).not.toHaveBeenCalled();
        });

        it('ignores drops onto the original position', async () => {
            const component = createComponent({
                dragData: { cardId: 'c1', columnId: 'col2' },
                columns: [{ Id: 'col2', cards: [{ Id: 'c1' }] }]
            });
            const handler = new DragDropHandler(component);
            handler._dragImageElement = { parentNode: null };
            const spy = jest.spyOn(handler, 'moveCard');

            await handler.handleDrop(dropEvent());
            expect(spy).not.toHaveBeenCalled();
            expect(handler._dragImageElement).toEqual({ parentNode: null });
        });

        it('moves within the same column to a new index', async () => {
            const component = createComponent({
                dragData: { cardId: 'c1', columnId: 'col2' },
                columns: [{ Id: 'col2', cards: [{ Id: 'c0' }, { Id: 'c1' }] }]
            });
            const handler = new DragDropHandler(component);
            const spy = jest
                .spyOn(handler, 'moveCard')
                .mockResolvedValue(undefined);

            await handler.handleDrop(dropEvent());
            expect(spy).toHaveBeenCalledWith('c1', 'col2', 'col2', 0);
        });

        it('moves across columns', async () => {
            const component = createComponent({
                dragData: { cardId: 'c1', columnId: 'col1' },
                columns: [{ Id: 'col1', cards: [{ Id: 'c1' }] }]
            });
            const handler = new DragDropHandler(component);
            const spy = jest
                .spyOn(handler, 'moveCard')
                .mockResolvedValue(undefined);

            await handler.handleDrop(dropEvent('col2'));
            expect(spy).toHaveBeenCalledWith('c1', 'col1', 'col2', 0);
        });
    });

    describe('handleBacklogDrop', () => {
        it('does nothing without an active sprint', async () => {
            selectors.getActiveSprint.mockReturnValueOnce(null);
            const component = createComponent();
            const handler = new DragDropHandler(component);

            await handler.handleBacklogDrop('card-1', 'col1');

            expect(component.store.dispatch).not.toHaveBeenCalled();
            expect(component.loadBoardData).not.toHaveBeenCalled();
        });

        it('shows an error toast when adding to the sprint fails', async () => {
            const errSpy = jest
                .spyOn(console, 'error')
                .mockImplementation(() => {});
            const component = createComponent();
            const err = new Error('nope');
            component.store.dispatch = jest.fn(() => Promise.reject(err));
            const handler = new DragDropHandler(component);

            await handler.handleBacklogDrop('card-1', 'col1');

            expect(component.toastManager.showError).toHaveBeenCalledWith(
                'Error adding card to sprint',
                err
            );
            expect(component.loadBoardData).not.toHaveBeenCalled();
            expect(errSpy).toHaveBeenCalledWith(
                'Error handling backlog drop:',
                err
            );
            errSpy.mockRestore();
        });

        it('logs errors without a toast manager', async () => {
            const errSpy = jest
                .spyOn(console, 'error')
                .mockImplementation(() => {});
            const component = createComponent({ toastManager: null });
            component.store.dispatch = jest.fn(() =>
                Promise.reject(new Error('x'))
            );
            const handler = new DragDropHandler(component);

            await handler.handleBacklogDrop('card-1', 'col1');
            expect(errSpy).toHaveBeenCalled();
            errSpy.mockRestore();
        });
    });

    describe('moveCard', () => {
        it('tracks, enqueues and completes a move', async () => {
            const component = createComponent();
            const handler = new DragDropHandler(component);

            await handler.moveCard('c1', 'col1', 'col2', 3);
            await flushPromises();

            expect(component.requestTracker.trackRequest).toHaveBeenCalledWith(
                'move',
                'c1',
                {
                    sourceColumnId: 'col1',
                    targetColumnId: 'col2',
                    targetIndex: 3
                }
            );
            const op = component.operationQueue.enqueue.mock.calls[0][0];
            expect(op).toMatchObject({
                type: 'move',
                cardId: 'c1',
                sourceColumnId: 'col1',
                targetColumnId: 'col2',
                targetIndex: 3,
                requestId: 'req-1'
            });
            expect(moveCardAsync).toHaveBeenCalledWith(
                'c1',
                'col2',
                3,
                'req-1',
                'client-1'
            );
            expect(
                component.requestTracker.completeRequest
            ).toHaveBeenCalledWith('req-1', { success: true });
            expect(component.toastManager.showError).not.toHaveBeenCalled();
        });

        it('fails the request, reloads when disconnected and shows a toast', async () => {
            const err = new Error('conflict');
            const component = createComponent();
            component.store.dispatch = jest.fn(() => Promise.reject(err));
            const handler = new DragDropHandler(component);

            await handler.moveCard('c1', 'col1', 'col2', 0);
            await flushPromises();

            expect(component.requestTracker.failRequest).toHaveBeenCalledWith(
                'req-1',
                err
            );
            expect(component.loadBoardData).toHaveBeenCalled();
            expect(component.toastManager.showError).toHaveBeenCalledWith(
                'Error moving card',
                err
            );
        });

        it('reloads when subscription is not connected', async () => {
            const component = createComponent({
                subscriptionManager: { isConnected: () => false }
            });
            component.store.dispatch = jest.fn(() =>
                Promise.reject(new Error('x'))
            );
            const handler = new DragDropHandler(component);

            await handler.moveCard('c1', 'col1', 'col2', 0);
            await flushPromises();
            expect(component.loadBoardData).toHaveBeenCalled();
        });

        it('skips reload while connected and toast when unavailable', async () => {
            const component = createComponent({
                subscriptionManager: { isConnected: () => true },
                toastManager: null
            });
            component.store.dispatch = jest.fn(() =>
                Promise.reject(new Error('x'))
            );
            const handler = new DragDropHandler(component);

            await handler.moveCard('c1', 'col1', 'col2', 0);
            await flushPromises();

            expect(component.requestTracker.failRequest).toHaveBeenCalled();
            expect(component.loadBoardData).not.toHaveBeenCalled();
        });
    });

    describe('calculateDropPosition', () => {
        it('returns the index of the first card below the 75% threshold', () => {
            const handler = new DragDropHandler(createComponent());
            const cards = [cardEl(0), cardEl(40), cardEl(80)];
            const c = container('col1', cards);

            // thresholds: 30, 70, 110
            expect(handler.calculateDropPosition({ clientY: 10 }, c)).toBe(0);
            expect(handler.calculateDropPosition({ clientY: 50 }, c)).toBe(1);
            expect(handler.calculateDropPosition({ clientY: 100 }, c)).toBe(2);
            expect(handler.calculateDropPosition({ clientY: 500 }, c)).toBe(3);
        });

        it('caches card elements per container until invalidated', () => {
            const handler = new DragDropHandler(createComponent());
            const c = container('col1', [cardEl(0)]);

            handler.calculateDropPosition({ clientY: 0 }, c);
            handler.calculateDropPosition({ clientY: 0 }, c);
            expect(c.querySelectorAll).toHaveBeenCalledTimes(1);
            expect(c.querySelectorAll).toHaveBeenCalledWith(
                '.kanban-card:not(.dragging):not(.drag-placeholder)'
            );

            const other = container('col2', []);
            handler.calculateDropPosition({ clientY: 0 }, other);
            expect(other.querySelectorAll).toHaveBeenCalledTimes(1);

            handler._invalidateCardCache();
            handler.calculateDropPosition({ clientY: 0 }, other);
            expect(other.querySelectorAll).toHaveBeenCalledTimes(2);
        });

        it('does not cache containers without a column id', () => {
            const handler = new DragDropHandler(createComponent());
            const c = { querySelectorAll: jest.fn(() => []) };
            handler.calculateDropPosition({ clientY: 0 }, c);
            handler.calculateDropPosition({ clientY: 0 }, c);
            expect(c.querySelectorAll).toHaveBeenCalledTimes(2);
        });
    });

    describe('updateDragPlaceholder', () => {
        function domContainer(count) {
            const el = document.createElement('div');
            el.dataset.columnId = 'col1';
            for (let i = 0; i < count; i++) {
                const card = document.createElement('div');
                card.className = 'kanban-card';
                card.dataset.idx = String(i);
                el.appendChild(card);
            }
            return el;
        }

        it('creates a styled placeholder sized to the dragged card', () => {
            const component = createComponent({
                dragData: { cardId: 'c1', columnId: 'col1', cardHeight: 55 }
            });
            const handler = new DragDropHandler(component);
            const el = domContainer(2);

            handler.updateDragPlaceholder(el, 1);

            const ph = component.dragPlaceholder;
            expect(ph.className).toBe('kanban-card drag-placeholder');
            expect(ph.style.height).toBe('55px');
            expect(ph.style.display).toBe('flex');
            expect(el.children[1]).toBe(ph);
            expect(handler._cachedCardElements).toBeNull();
        });

        it('defaults to 80px and appends when past the last card', () => {
            const component = createComponent({ dragData: null });
            const handler = new DragDropHandler(component);
            const el = domContainer(2);

            handler.updateDragPlaceholder(el, 5);

            expect(component.dragPlaceholder.style.height).toBe('80px');
            expect(el.lastElementChild).toBe(component.dragPlaceholder);
        });

        it('reuses and moves an existing placeholder', () => {
            const component = createComponent({
                dragData: { cardHeight: 30 }
            });
            const handler = new DragDropHandler(component);
            const el = domContainer(3);

            handler.updateDragPlaceholder(el, 2);
            const ph = component.dragPlaceholder;
            handler.updateDragPlaceholder(el, 0);

            expect(component.dragPlaceholder).toBe(ph);
            expect(el.firstElementChild).toBe(ph);
            expect(el.querySelectorAll('.drag-placeholder')).toHaveLength(1);
        });

        it('skips insertion when the target card slot is empty', () => {
            const component = createComponent();
            const handler = new DragDropHandler(component);
            const c = {
                dataset: { columnId: 'colX' },
                querySelectorAll: jest.fn(() => [undefined, cardEl(0)]),
                appendChild: jest.fn(),
                insertBefore: jest.fn()
            };

            handler.updateDragPlaceholder(c, 0);

            expect(c.insertBefore).not.toHaveBeenCalled();
            expect(c.appendChild).not.toHaveBeenCalled();
        });
    });
});
