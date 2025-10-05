/**
 * Integration test to verify platform events work correctly with the store
 */
import { createStore } from 'c/kanbanStore';
import EventHandler from '../../../../force-app/main/default/lwc/kanbanBoard/handlers/eventHandler';

// Mock kanbanStore
jest.mock('c/kanbanStore', () => {
    const actual = jest.requireActual(
        '../../../../force-app/main/default/lwc/kanbanStore/kanbanStore'
    );
    return {
        ...actual,
        enrichCardData: (card) => ({ ...card, enriched: true })
    };
});

describe('Platform Event Integration Tests', () => {
    let store;
    let eventHandler;

    beforeEach(() => {
        store = createStore();

        // Setup initial state with columns and cards
        store.dispatch({
            type: 'SET_COLUMNS',
            payload: [
                {
                    Id: 'col1',
                    Name: 'To Do',
                    cards: [
                        {
                            Id: 'card1',
                            OpenSF__Subject__c: 'Task 1',
                            OpenSF__Status__c: 'To Do'
                        },
                        {
                            Id: 'card2',
                            OpenSF__Subject__c: 'Task 2',
                            OpenSF__Status__c: 'To Do'
                        }
                    ]
                },
                {
                    Id: 'col2',
                    Name: 'In Progress',
                    cards: []
                }
            ]
        });

        eventHandler = new EventHandler();
    });

    describe('Create Event', () => {
        it('should add a new card to the store', () => {
            const event = {
                OpenSF__EventType__c: 'create',
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card3',
                    OpenSF__Subject__c: 'New Task',
                    OpenSF__Status__c: 'To Do',
                    columnId: 'col1'
                })
            };

            eventHandler.handlePlatformEvent(event, store);

            const state = store.getState();
            const col1Cards = state.columns[0].cards;
            expect(col1Cards).toHaveLength(3);
            expect(col1Cards.find((c) => c.Id === 'card3')).toBeDefined();
        });
    });

    describe('Update Event', () => {
        it('should update an existing card in the store', () => {
            const event = {
                OpenSF__EventType__c: 'update',
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    OpenSF__Subject__c: 'Updated Task',
                    OpenSF__Status__c: 'To Do',
                    columnId: 'col1'
                })
            };

            eventHandler.handlePlatformEvent(event, store);

            const state = store.getState();
            const col1Cards = state.columns[0].cards;
            const updatedCard = col1Cards.find((c) => c.Id === 'card1');
            expect(updatedCard).toBeDefined();
            expect(updatedCard.OpenSF__Subject__c).toBe('Updated Task');
        });
    });

    describe('Delete Event', () => {
        it('should remove a card from the store', () => {
            const event = {
                OpenSF__EventType__c: 'delete',
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1'
                })
            };

            // Verify card exists before delete
            let state = store.getState();
            let col1Cards = state.columns[0].cards;
            expect(col1Cards).toHaveLength(2);
            expect(col1Cards.find((c) => c.Id === 'card1')).toBeDefined();

            // Handle delete event
            eventHandler.handlePlatformEvent(event, store);

            // Verify card is removed
            state = store.getState();
            col1Cards = state.columns[0].cards;
            expect(col1Cards).toHaveLength(1);
            expect(col1Cards.find((c) => c.Id === 'card1')).toBeUndefined();
            expect(col1Cards[0].Id).toBe('card2');
        });
    });

    describe('Move Event', () => {
        it('should move a card between columns', () => {
            const event = {
                OpenSF__EventType__c: 'move',
                OpenSF__Payload__c: JSON.stringify({
                    Id: 'card1',
                    OpenSF__Subject__c: 'Task 1',
                    OpenSF__Status__c: 'In Progress',
                    columnId: 'col2'
                })
            };

            eventHandler.handlePlatformEvent(event, store);

            const state = store.getState();
            const col1Cards = state.columns[0].cards;
            const col2Cards = state.columns[1].cards;

            // Card should be moved from col1 to col2
            expect(col1Cards.find((c) => c.Id === 'card1')).toBeUndefined();
            expect(col2Cards.find((c) => c.Id === 'card1')).toBeDefined();
        });
    });
});
