# kanban-store

> Redux-style state management with middleware, thunks, selectors, and DevTools integration.

## Node Metadata
- **id**: kanban-store
- **status**: stable
- **package**: force-app

## Edges
| Target | Type | Description |
|--------|------|-------------|
| apex-services | reads-from | Thunks call @AuraEnabled methods |
| apex-services | writes-to | Thunks dispatch mutations via Apex |
| data-model | depends-on | State shape mirrors SObject schema |

## Schema
- **LWC**: kanbanStore (core/, state/, middleware/, thunks/, devtools/, undo/, utils/)
- **Reducers**: appStateReducer, backlogReducer, boardReducer, cardsReducer, columnsReducer, designReducer, dragReducer, sprintReducer, syncReducer
- **Thunks**: boardThunks, cardThunks, sprintThunks, analyticsThunks, epicThunks, designThunks
- **Middleware**: thunkMiddleware, undoMiddleware, loggingMiddleware, devToolsMiddleware
- **Design Extensions**: designActionTypes.js, designReducer.js, designSelectors.js, designThunks.js

## Roadmap
### Now
- Design thinking state slice integration
- Better error boundary handling

### Next
- Offline queue with IndexedDB persistence
- Optimistic update rollback on failure

### Future
- Worker thread for reducer computation
- State snapshots for undo/redo across tabs

## Known Issues
- Object.freeze() on large state (500+ cards) can impact performance
- Thunk error messages sometimes lose Apex exception details
