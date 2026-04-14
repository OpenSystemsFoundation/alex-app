/**
 * Unit tests for CardOperations handler
 */

jest.mock(
    'c/kanbanStore',
    () => ({
        createCardAsync: jest.fn(
            (columnId, subject, requestId, clientId) => ({
                type: 'THUNK',
                columnId,
                subject,
                requestId,
                clientId
            })
        )
    }),
    { virtual: true }
);

import CardOperations from '../../../kanbanBoard/handlers/cardOperations';

function createMockComponent(overrides = {}) {
    return {
        store: {
            findCard: jest.fn(),
            getState: jest.fn(() => ({ backlogCards: [], columns: [] })),
            dispatch: jest.fn(() => Promise.resolve({ card: { Id: 'new1' } }))
        },
        showCardDetail: false,
        selectedCard: null,
        template: {
            querySelector: jest.fn(() => null)
        },
        toastManager: {
            showSuccess: jest.fn(),
            showError: jest.fn()
        },
        requestTracker: {
            trackRequest: jest.fn(() => 'req-123'),
            getRequest: jest.fn(() => ({ cardId: null })),
            completeRequest: jest.fn(),
            failRequest: jest.fn()
        },
        operationQueue: {
            enqueue: jest.fn(async (op) => op.execute())
        },
        _clientId: 'client-1',
        loadBoardData: jest.fn(),
        subscriptionManager: { isConnected: jest.fn(() => true) },
        ...overrides
    };
}

describe('CardOperations', () => {
    let component;
    let ops;

    beforeEach(() => {
        jest.clearAllMocks();
        component = createMockComponent();
        ops = new CardOperations(component);
    });

    describe('findCard', () => {
        it('delegates to store.findCard', () => {
            const card = { Id: 'c1', subject: 'Test' };
            component.store.findCard.mockReturnValue(card);

            expect(ops.findCard('c1')).toEqual(card);
            expect(component.store.findCard).toHaveBeenCalledWith('c1');
        });
    });

    describe('handleCardClick', () => {
        it('opens card detail when card found in columns', () => {
            const card = { Id: 'c1', subject: 'Test' };
            component.store.findCard.mockReturnValue(card);

            ops.handleCardClick('c1');

            expect(component.selectedCard).toEqual(card);
            expect(component.showCardDetail).toBe(true);
        });

        it('finds card in backlog when not in columns', () => {
            component.store.findCard.mockReturnValue(null);
            component.store.getState.mockReturnValue({
                backlogCards: [{ Id: 'bg1', subject: 'Backlog' }]
            });

            ops.handleCardClick('bg1');

            expect(component.selectedCard).toEqual({
                Id: 'bg1',
                subject: 'Backlog'
            });
            expect(component.showCardDetail).toBe(true);
        });

        it('does nothing when card not found anywhere', () => {
            component.store.findCard.mockReturnValue(null);
            component.store.getState.mockReturnValue({ backlogCards: [] });

            ops.handleCardClick('missing');

            expect(component.showCardDetail).toBe(false);
            expect(component.selectedCard).toBeNull();
        });

        it('prompts for unsaved changes when switching cards', () => {
            component.showCardDetail = true;
            component.selectedCard = { Id: 'old-card' };

            const mockPanel = { hasPendingChanges: jest.fn(() => false) };
            component.template.querySelector.mockReturnValue(mockPanel);
            component.store.findCard.mockReturnValue({
                Id: 'new-card',
                subject: 'New'
            });

            ops.handleCardClick('new-card');

            expect(mockPanel.hasPendingChanges).toHaveBeenCalled();
            expect(component.selectedCard.Id).toBe('new-card');
        });

        it('cancels switch when user declines discard', () => {
            component.showCardDetail = true;
            component.selectedCard = { Id: 'old-card' };

            const mockPanel = { hasPendingChanges: jest.fn(() => true) };
            component.template.querySelector.mockReturnValue(mockPanel);

            // Mock confirm to return false
            global.confirm = jest.fn(() => false);

            ops.handleCardClick('new-card');

            expect(component.selectedCard.Id).toBe('old-card');

            delete global.confirm;
        });
    });

    describe('handleCardDetailClose', () => {
        it('clears card detail state', () => {
            component.showCardDetail = true;
            component.selectedCard = { Id: 'c1' };

            ops.handleCardDetailClose();

            expect(component.showCardDetail).toBe(false);
            expect(component.selectedCard).toBeNull();
        });
    });

    describe('handleCardUpdated', () => {
        it('closes detail, reloads board, clears selection', () => {
            component.showCardDetail = true;
            component.selectedCard = { Id: 'c1' };

            ops.handleCardUpdated();

            expect(component.showCardDetail).toBe(false);
            expect(component.selectedCard).toBeNull();
            expect(component.loadBoardData).toHaveBeenCalled();
        });
    });

    describe('handleCardDeleted', () => {
        it('clears card detail state', () => {
            component.showCardDetail = true;
            component.selectedCard = { Id: 'c1' };

            ops.handleCardDeleted('c1');

            expect(component.showCardDetail).toBe(false);
            expect(component.selectedCard).toBeNull();
        });

        it('does nothing for null cardId', () => {
            component.showCardDetail = true;
            component.selectedCard = { Id: 'c1' };

            ops.handleCardDeleted(null);

            expect(component.showCardDetail).toBe(true);
        });
    });

    describe('createCard', () => {
        it('creates card via store dispatch and shows toast', async () => {
            const button = { disabled: false };

            await ops.createCard('col1', button);

            expect(component.requestTracker.trackRequest).toHaveBeenCalledWith(
                'create',
                null,
                { columnId: 'col1', subject: 'New Card' }
            );
            expect(component.operationQueue.enqueue).toHaveBeenCalled();
            expect(component.toastManager.showSuccess).toHaveBeenCalledWith(
                'Card created successfully'
            );
            expect(button.disabled).toBe(false);
        });

        it('shows error for null columnId', async () => {
            const button = { disabled: false };

            await ops.createCard(null, button);

            expect(component.toastManager.showError).toHaveBeenCalledWith(
                'Invalid column',
                'Column ID not found'
            );
        });

        it('re-enables button on error', async () => {
            const button = { disabled: false };
            component.operationQueue.enqueue.mockRejectedValue(
                new Error('fail')
            );

            await ops.createCard('col1', button);

            expect(button.disabled).toBe(false);
            expect(component.toastManager.showError).toHaveBeenCalled();
        });
    });
});
