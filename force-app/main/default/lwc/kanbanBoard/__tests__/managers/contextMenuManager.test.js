/**
 * Unit tests for ContextMenuManager
 */
jest.mock('c/kanbanStore', () => ({
    moveCardAsync: jest.fn((cardId, columnId, index) => ({
        type: 'MOVE',
        cardId,
        columnId,
        index
    })),
    moveCardToBacklogAsync: jest.fn((sprintId, cardId) => ({
        type: 'TO_BACKLOG',
        sprintId,
        cardId
    })),
    deleteCardAsync: jest.fn((cardId) => ({ type: 'DELETE', cardId }))
}));

import ContextMenuManager from '../../managers/contextMenuManager';
import {
    moveCardAsync,
    moveCardToBacklogAsync,
    deleteCardAsync
} from 'c/kanbanStore';

function createComponent(overrides = {}) {
    return {
        columns: [
            { Id: 'col1', columnHeader: 'To Do', name: 'todo' },
            { Id: 'col2', name: 'In Progress' },
            { Id: 'col3', columnHeader: 'Done' }
        ],
        store: { dispatch: jest.fn(() => Promise.resolve()) },
        template: { querySelector: jest.fn(() => null) },
        activeSprint: { Id: 'sprint-1' },
        toastManager: { showError: jest.fn() },
        cardOperations: { handleCardDeleted: jest.fn() },
        ...overrides
    };
}

function contextEvent() {
    return {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        currentTarget: { dataset: { cardId: 'card-1', columnId: 'col1' } },
        clientX: 120,
        clientY: 340
    };
}

describe('ContextMenuManager', () => {
    let component;
    let manager;

    beforeEach(() => {
        component = createComponent();
        manager = new ContextMenuManager(component);
    });

    describe('buildMenuItems', () => {
        it('excludes the current column from the move submenu', () => {
            const items = manager.buildMenuItems('col1');

            expect(items.map((i) => i.value)).toEqual([
                'moveToColumn',
                'moveToBacklog',
                'delete'
            ]);
            expect(items[0]).toMatchObject({
                label: 'Move to Column',
                icon: 'utility:right'
            });
            expect(items[0].submenu).toEqual([
                { label: 'In Progress', value: 'col2' },
                { label: 'Done', value: 'col3' }
            ]);
            expect(items[1].dividerBefore).toBe(true);
            expect(items[2]).toMatchObject({
                label: 'Delete',
                icon: 'utility:delete',
                dividerBefore: true
            });
        });

        it('includes all columns for the default menu', () => {
            const items = manager.defaultMenuItems;
            expect(items[0].submenu.map((s) => s.value)).toEqual([
                'col1',
                'col2',
                'col3'
            ]);
            expect(items[0].submenu[0].label).toBe('To Do');
        });

        it('omits the submenu when no other columns exist', () => {
            component.columns = [{ Id: 'only', name: 'Only' }];
            const items = manager.buildMenuItems('only');

            expect(items.map((i) => i.value)).toEqual([
                'moveToBacklog',
                'delete'
            ]);
            expect(items[0].dividerBefore).toBe(false);
        });

        it('handles missing columns', () => {
            component.columns = undefined;
            const items = manager.buildMenuItems(null);
            expect(items.map((i) => i.value)).toEqual([
                'moveToBacklog',
                'delete'
            ]);
        });
    });

    describe('handleContextMenu', () => {
        it('stores ids and shows the menu at the pointer', () => {
            const menu = { show: jest.fn(), menuItems: null };
            component.template.querySelector.mockReturnValue(menu);
            const event = contextEvent();

            manager.handleContextMenu(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopPropagation).toHaveBeenCalled();
            expect(component.template.querySelector).toHaveBeenCalledWith(
                'c-kanban-context-menu'
            );
            expect(manager._cardId).toBe('card-1');
            expect(manager._columnId).toBe('col1');
            expect(menu.menuItems[0].submenu.map((s) => s.value)).toEqual([
                'col2',
                'col3'
            ]);
            expect(menu.show).toHaveBeenCalledWith(120, 340);
        });

        it('still records ids when the menu element is missing', () => {
            const event = contextEvent();
            manager.handleContextMenu(event);
            expect(manager._cardId).toBe('card-1');
            expect(manager._columnId).toBe('col1');
        });
    });

    describe('handleMenuSelect', () => {
        const select = (value, subValue) => ({ detail: { value, subValue } });

        beforeEach(() => {
            manager._cardId = 'card-1';
        });

        it('does nothing without a selected card', async () => {
            manager._cardId = null;
            await manager.handleMenuSelect(select('delete'));
            expect(component.store.dispatch).not.toHaveBeenCalled();
            expect(
                component.cardOperations.handleCardDeleted
            ).not.toHaveBeenCalled();
        });

        it('does nothing without a store', async () => {
            component.store = null;
            await manager.handleMenuSelect(select('delete'));
            expect(
                component.cardOperations.handleCardDeleted
            ).not.toHaveBeenCalled();
        });

        it('moves the card to the chosen column at index 0', async () => {
            await manager.handleMenuSelect(select('moveToColumn', 'col3'));
            expect(moveCardAsync).toHaveBeenCalledWith('card-1', 'col3', 0);
            expect(component.store.dispatch).toHaveBeenCalledWith({
                type: 'MOVE',
                cardId: 'card-1',
                columnId: 'col3',
                index: 0
            });
        });

        it('ignores moveToColumn without a target column', async () => {
            await manager.handleMenuSelect(select('moveToColumn'));
            expect(moveCardAsync).not.toHaveBeenCalled();
            expect(component.store.dispatch).not.toHaveBeenCalled();
        });

        it('moves the card to the backlog from the active sprint', async () => {
            await manager.handleMenuSelect(select('moveToBacklog'));
            expect(moveCardToBacklogAsync).toHaveBeenCalledWith(
                'sprint-1',
                'card-1'
            );
            expect(component.store.dispatch).toHaveBeenCalledTimes(1);
        });

        it('passes a null sprint id when no sprint is active', async () => {
            component.activeSprint = null;
            await manager.handleMenuSelect(select('moveToBacklog'));
            expect(moveCardToBacklogAsync).toHaveBeenCalledWith(null, 'card-1');
        });

        it('deletes the card and notifies card operations', async () => {
            await manager.handleMenuSelect(select('delete'));
            expect(deleteCardAsync).toHaveBeenCalledWith('card-1');
            expect(component.toastManager.showError).not.toHaveBeenCalled();
            expect(
                component.cardOperations.handleCardDeleted
            ).toHaveBeenCalledWith('card-1');
        });

        it('shows an error toast when delete fails but still cleans up', async () => {
            const err = new Error('locked');
            component.store.dispatch.mockRejectedValue(err);
            await manager.handleMenuSelect(select('delete'));
            expect(component.toastManager.showError).toHaveBeenCalledWith(
                'Error deleting card',
                err
            );
            expect(
                component.cardOperations.handleCardDeleted
            ).toHaveBeenCalledWith('card-1');
        });

        it('swallows delete errors without a toast manager', async () => {
            component.toastManager = null;
            component.store.dispatch.mockRejectedValue(new Error('x'));
            await manager.handleMenuSelect(select('delete'));
            expect(
                component.cardOperations.handleCardDeleted
            ).toHaveBeenCalledWith('card-1');
        });

        it('ignores unknown menu values', async () => {
            await manager.handleMenuSelect(select('archive'));
            expect(component.store.dispatch).not.toHaveBeenCalled();
            expect(
                component.cardOperations.handleCardDeleted
            ).not.toHaveBeenCalled();
        });
    });
});
