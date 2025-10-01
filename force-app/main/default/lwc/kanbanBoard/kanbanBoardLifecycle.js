/**
 * Lifecycle management for KanbanBoard component
 * Handles initialization, cleanup, and rendering logic
 */
import boardHelper from './kanbanBoardHelper';
import boardStore from 'c/kanbanBoardStore';
import { subscribe, unsubscribe } from 'lightning/messageService';
import tabFocusedChannel from '@salesforce/messageChannel/lightning__tabFocused';
import { getFocusedTabInfo } from 'lightning/platformWorkspaceApi';

export default class KanbanBoardLifecycle {
    /**
     * Initialize the component on connection
     * @param {Object} component - Reference to the LWC component
     */
    static async onConnected(component) {
        // Subscribe to store changes
        component.subscriptionCallback = component.handleStateChange.bind(component);
        boardStore.subscribe(component.subscriptionCallback);

        try {
            component.boardId = component.recordId;
            await this.initializeBoardData(component);
        } catch (error) {
            component.handleError('Failed to initialize board.', error);
        }

        this.subscribeToTabFocused(component);
        
        component.handleKeyDown = component.handleKeyDown.bind(component);
        document.addEventListener('keydown', component.handleKeyDown);
    }

    /**
     * Initialize board data from store
     * @param {Object} component - Reference to the LWC component
     */
    static async initializeBoardData(component) {
        component.initializeBoard = true;
        try {
            await boardStore.initialize(component.boardId);
        } catch (error) {
            component.handleError('Error initializing Kanban Board', error);
        } finally {
            component.initializeBoard = false;
        }
    }

    /**
     * Handle rendering updates
     * @param {Object} component - Reference to the LWC component
     */
    static onRendered(component) {
        boardHelper.applyMaxHeight(component.template, component.maxHeight);
        boardHelper.applyCardEdge(component.template, component.cards);
        boardHelper.applyColumnBorder(component.template, component.columns);
    }

    /**
     * Cleanup on disconnection
     * @param {Object} component - Reference to the LWC component
     */
    static onDisconnected(component) {
        if (component.subscriptionCallback) {
            boardStore.unsubscribe(component.subscriptionCallback);
        }

        this.unsubscribeFromTabFocused(component);
        document.removeEventListener('keydown', component.handleKeyDown);
        component.boardId = null;
    }

    /**
     * Subscribe to tab focused events
     * @param {Object} component - Reference to the LWC component
     */
    static subscribeToTabFocused(component) {
        if (!component.tabFocusedSubscription) {
            component.tabFocusedSubscription = subscribe(
                component.messageContext,
                tabFocusedChannel,
                (message) => this.handleTabFocused(component, message)
            );
        }
    }

    /**
     * Handle tab focused event
     * @param {Object} component - Reference to the LWC component
     */
    static async handleTabFocused(component) {
        try {
            const tabInfo = await getFocusedTabInfo();
            if (tabInfo && tabInfo.recordId) {
                if (tabInfo.recordId !== component.boardId) {
                    component.boardId = tabInfo.recordId;
                    await this.initializeBoardData(component);
                }
            }
        } catch (error) {
            component.showToast(
                'Error',
                'Unable to fetch focused tab info.',
                'error'
            );
        }
    }

    /**
     * Unsubscribe from tab focused events
     * @param {Object} component - Reference to the LWC component
     */
    static unsubscribeFromTabFocused(component) {
        if (component.tabFocusedSubscription) {
            unsubscribe(component.tabFocusedSubscription);
            component.tabFocusedSubscription = null;
        }
    }
}
