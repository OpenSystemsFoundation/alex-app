/**
 * BacklogContextMenuHandler — context menu item building and action dispatch.
 *
 * Encapsulates all context menu logic for the backlog view:
 * menu item construction, action handling, and sprint/column move operations.
 */
import {
    updateBacklogCardAsync,
    deleteBacklogCardsAsync,
    reorderBacklogCardAsync,
    moveCardsToSprintAsync,
    moveCardAsync,
    addCardsToBacklogSprintAsync,
    removeCardFromBacklogSprintAsync,
    bulkMoveBacklogCardsAsync,
    setSelectedBacklogCards
} from 'c/kanbanStore';

export default class BacklogContextMenuHandler {
    _host;

    constructor(host) {
        this._host = host;
    }

    handleContextMenu(event) {
        event.preventDefault();
        const cardId = event.currentTarget.dataset.cardId;
        const rawSprintId = event.currentTarget.dataset.sprintId;
        const sprintId =
            rawSprintId && rawSprintId !== 'null' ? rawSprintId : null;
        this._host._contextMenuCardId = cardId;
        this._host._contextMenuSprintId = sprintId;

        // Determine if this is a multi-select context menu
        const selectedCards = this._host.selectedCards || [];
        this._host._contextMenuIsMulti =
            selectedCards.length > 1 && selectedCards.includes(cardId);

        const contextMenu = this._host.template.querySelector(
            'c-kanban-context-menu'
        );
        const items = this.buildMenuItems(cardId, sprintId);
        // Keep the template binding in sync so a re-render doesn't replace
        // this card's items with the generic menu
        this._host._contextMenuItems = items;
        if (contextMenu) {
            contextMenu.menuItems = items;
            contextMenu.show(event.clientX, event.clientY);
        }
    }

    buildMenuItems(_cardId, cardSprintId) {
        const items = [
            {
                label: 'Move to Top',
                value: 'moveTop',
                icon: 'utility:arrowup'
            },
            {
                label: 'Move to Bottom',
                value: 'moveBottom',
                icon: 'utility:arrowdown'
            }
        ];

        // Build "Move to Sprint" submenu with all available sprints
        const sprintSubmenu = [];
        for (const sprint of this._host.planningSprints) {
            if (sprint.Id === cardSprintId) continue;
            sprintSubmenu.push({
                label: sprint.Name || `Sprint ${sprint.sprintNumber || ''}`,
                value: sprint.Id
            });
        }
        if (this._host.activeSprint) {
            sprintSubmenu.push({
                label: `${this._host.activeSprint.Name || 'Active Sprint'} (Board)`,
                value: `active:${this._host.activeSprint.Id}`,
                dividerBefore: sprintSubmenu.length > 0
            });
        }
        if (sprintSubmenu.length > 0) {
            items.push({
                label: 'Move to Sprint',
                value: 'moveToSprint',
                icon: 'utility:forward',
                submenu: sprintSubmenu
            });
        }

        // Build "Move to Column" submenu (moves card to active sprint + column)
        if (this._host.activeSprint) {
            const cols = this._host._storeState?.columns || [];
            const columnSubmenu = [];
            for (const col of cols) {
                columnSubmenu.push({
                    label: col.columnHeader || col.Name || col.name,
                    value: col.Id
                });
            }
            if (columnSubmenu.length > 0) {
                items.push({
                    label: 'Move to Column',
                    value: 'moveToColumn',
                    icon: 'utility:right',
                    submenu: columnSubmenu
                });
            }
        }

        // Remove from sprint (only if card is in a planning sprint)
        if (cardSprintId) {
            items.push({
                label: 'Remove from Sprint',
                value: 'removeFromSprint',
                icon: 'utility:back'
            });
        }

        items.push(
            {
                label: 'Set Priority',
                value: 'setPriority',
                icon: 'utility:priority',
                dividerBefore: true,
                submenu: [
                    { label: 'High', value: 'High' },
                    { label: 'Medium', value: 'Medium' },
                    { label: 'Low', value: 'Low' }
                ]
            },
            {
                label: 'Toggle Refinement',
                value: 'toggleRefinement',
                icon: 'utility:search'
            },
            {
                label: 'Delete',
                value: 'delete',
                icon: 'utility:delete',
                dividerBefore: true
            }
        );

        return items;
    }

    async handleSelect(event) {
        const { value, subValue } = event.detail;
        const cardId = this._host._contextMenuCardId;
        const sprintId = this._host._contextMenuSprintId;
        const store = this._host.store;
        if (!cardId || !store) return;

        const isMulti = this._host._contextMenuIsMulti;
        const cardIds = isMulti ? [...this._host.selectedCards] : [cardId];

        switch (value) {
            case 'moveTop': {
                if (isMulti) {
                    await store.dispatch(
                        bulkMoveBacklogCardsAsync(cardIds, 'top')
                    );
                } else {
                    const topIdx = this._getMoveTopIndex(sprintId);
                    await store.dispatch(
                        reorderBacklogCardAsync(cardId, topIdx)
                    );
                }
                break;
            }
            case 'moveBottom': {
                if (isMulti) {
                    await store.dispatch(
                        bulkMoveBacklogCardsAsync(cardIds, 'bottom')
                    );
                } else {
                    const bottomIdx = this._getMoveBottomIndex(sprintId);
                    await store.dispatch(
                        reorderBacklogCardAsync(cardId, bottomIdx)
                    );
                }
                break;
            }
            case 'moveToSprint':
                if (subValue) {
                    if (isMulti) {
                        await this._bulkMoveToSprint(cardIds, subValue);
                    } else {
                        await this._moveToSprint(cardId, sprintId, subValue);
                    }
                }
                break;
            case 'moveToColumn':
                if (subValue && this._host.activeSprint) {
                    if (isMulti) {
                        for (const cId of cardIds) {
                            // eslint-disable-next-line no-await-in-loop
                            await this._moveToColumn(cId, null, subValue);
                        }
                        store.dispatch(setSelectedBacklogCards([]));
                    } else {
                        await this._moveToColumn(cardId, sprintId, subValue);
                    }
                }
                break;
            case 'removeFromSprint':
                if (isMulti) {
                    for (const cId of cardIds) {
                        const cSprintId = this._getCardSprintId(cId);
                        if (cSprintId) {
                            // eslint-disable-next-line no-await-in-loop
                            await store.dispatch(
                                removeCardFromBacklogSprintAsync(cSprintId, cId)
                            );
                        }
                    }
                    store.dispatch(setSelectedBacklogCards([]));
                } else if (sprintId) {
                    await store.dispatch(
                        removeCardFromBacklogSprintAsync(sprintId, cardId)
                    );
                }
                break;
            case 'setPriority':
                if (subValue) {
                    const promises = cardIds.map((cId) =>
                        store.dispatch(
                            updateBacklogCardAsync(cId, { priority: subValue })
                        )
                    );
                    await Promise.all(promises);
                }
                break;
            case 'toggleRefinement': {
                const card = this._host.backlogCards.find(
                    (c) => c.Id === cardId
                );
                if (card) {
                    const newValue = !card.needsRefinement;
                    const promises = cardIds.map((cId) =>
                        store.dispatch(
                            updateBacklogCardAsync(cId, {
                                needsRefinement: newValue
                            })
                        )
                    );
                    await Promise.all(promises);
                }
                break;
            }
            case 'delete':
                await store.dispatch(deleteBacklogCardsAsync(cardIds));
                if (isMulti) {
                    store.dispatch(setSelectedBacklogCards([]));
                }
                break;
            default:
                break;
        }
    }

    async _moveToSprint(cardId, currentSprintId, targetValue) {
        const store = this._host.store;
        if (currentSprintId) {
            await store.dispatch(
                removeCardFromBacklogSprintAsync(currentSprintId, cardId)
            );
        }

        if (targetValue.startsWith('active:')) {
            const activeSprintId = targetValue.replace('active:', '');
            await store.dispatch(
                moveCardsToSprintAsync(activeSprintId, [cardId])
            );
        } else {
            await store.dispatch(
                addCardsToBacklogSprintAsync(targetValue, [cardId])
            );
        }
    }

    async _moveToColumn(cardId, currentSprintId, targetColumnId) {
        const store = this._host.store;
        if (currentSprintId) {
            await store.dispatch(
                removeCardFromBacklogSprintAsync(currentSprintId, cardId)
            );
        }

        await store.dispatch(
            moveCardsToSprintAsync(this._host.activeSprint.Id, [cardId])
        );

        await store.dispatch(moveCardAsync(cardId, targetColumnId, 0));
    }

    _getMoveTopIndex(sprintId) {
        if (!sprintId) return 0;
        const state = this._host.store.getState();
        const allCards = state.backlogCards || [];
        const sprintCardIds = this._host._getSprintCardIds(sprintId);
        for (let i = 0; i < allCards.length; i++) {
            if (sprintCardIds.has(allCards[i].Id)) return i;
        }
        return 0;
    }

    _getMoveBottomIndex(sprintId) {
        const state = this._host.store.getState();
        const allCards = state.backlogCards || [];
        if (!sprintId) return allCards.length - 1;
        const sprintCardIds = this._host._getSprintCardIds(sprintId);
        let lastIndex = -1;
        for (let i = 0; i < allCards.length; i++) {
            if (sprintCardIds.has(allCards[i].Id)) lastIndex = i;
        }
        return lastIndex >= 0 ? lastIndex : allCards.length - 1;
    }

    async _bulkMoveToSprint(cardIds, targetValue) {
        const store = this._host.store;
        // Remove each card from its current sprint first
        for (const cId of cardIds) {
            const currentSprintId = this._getCardSprintId(cId);
            if (currentSprintId) {
                // eslint-disable-next-line no-await-in-loop
                await store.dispatch(
                    removeCardFromBacklogSprintAsync(currentSprintId, cId)
                );
            }
        }
        // Add all cards to target sprint
        if (targetValue.startsWith('active:')) {
            const activeSprintId = targetValue.replace('active:', '');
            await store.dispatch(
                moveCardsToSprintAsync(activeSprintId, cardIds)
            );
        } else {
            for (const cId of cardIds) {
                // eslint-disable-next-line no-await-in-loop
                await store.dispatch(
                    addCardsToBacklogSprintAsync(targetValue, [cId])
                );
            }
        }
        store.dispatch(setSelectedBacklogCards([]));
    }

    _getCardSprintId(cardId) {
        const state = this._host.store.getState();
        const sprintCards = state.planningSprintCards || [];
        const match = sprintCards.find((sc) => sc.cardId === cardId);
        return match ? match.sprintId : null;
    }
}
