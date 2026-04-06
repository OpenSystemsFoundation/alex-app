import { sfApexRun } from './sf-data';

/**
 * Design Thinking test data helpers.
 * Creates isolated design sessions and notes via anonymous Apex.
 */

export interface DesignSessionData {
    sessionId: string;
    boardId: string;
    title: string;
}

export interface DesignNoteData {
    noteId: string;
    sessionId: string;
    text: string;
    zone: string;
}

/**
 * Create an isolated Design Thinking session linked to a board.
 * Returns the session ID for direct navigation or use in tests.
 */
export function createIsolatedDesignSession(
    boardId: string,
    title: string = 'E2E Design Session'
): DesignSessionData {
    const apex = `
OpenSF__DesignSession__c session = new OpenSF__DesignSession__c(
    OpenSF__Board__c = '${boardId}',
    OpenSF__Title__c = '${title}',
    OpenSF__Status__c = 'Draft',
    OpenSF__CurrentPhase__c = 'Empathize',
    OpenSF__Facilitator__c = UserInfo.getUserId()
);
insert session;
System.debug('E2E_DESIGN_SESSION_ID:' + session.Id);
`;
    const output = sfApexRun(apex);
    const match = output.match(/E2E_DESIGN_SESSION_ID:([a-zA-Z0-9]{15,18})/);
    if (!match) {
        throw new Error(
            `Failed to parse design session ID from Apex output: ${output.substring(0, 500)}`
        );
    }
    return {
        sessionId: match[1],
        boardId,
        title
    };
}

/**
 * Create a started (Active) Design Thinking session with notes.
 * Useful for testing the session board view with pre-populated data.
 */
export function createActiveDesignSession(
    boardId: string,
    title: string = 'E2E Active Session'
): DesignSessionData {
    const apex = `
OpenSF__DesignSession__c session = new OpenSF__DesignSession__c(
    OpenSF__Board__c = '${boardId}',
    OpenSF__Title__c = '${title}',
    OpenSF__Status__c = 'Active',
    OpenSF__CurrentPhase__c = 'Empathize',
    OpenSF__Facilitator__c = UserInfo.getUserId(),
    OpenSF__StartedAt__c = System.now()
);
insert session;

// Add some seed notes
List<OpenSF__DesignNote__c> notes = new List<OpenSF__DesignNote__c>();
String[] zones = new String[]{'Says', 'Thinks', 'Does', 'Feels'};
for (Integer i = 0; i < 4; i++) {
    notes.add(new OpenSF__DesignNote__c(
        OpenSF__DesignSession__c = session.Id,
        OpenSF__Text__c = 'E2E Note ' + (i + 1) + ' in ' + zones[i],
        OpenSF__Zone__c = zones[i],
        OpenSF__Tool__c = 'EmpathyMap',
        OpenSF__Phase__c = 'Empathize',
        OpenSF__Color__c = 'yellow',
        OpenSF__PositionX__c = 10 + (i * 30),
        OpenSF__PositionY__c = 10,
        OpenSF__Author__c = UserInfo.getUserId()
    ));
}
insert notes;

System.debug('E2E_DESIGN_SESSION_ID:' + session.Id);
`;
    const output = sfApexRun(apex);
    const match = output.match(/E2E_DESIGN_SESSION_ID:([a-zA-Z0-9]{15,18})/);
    if (!match) {
        throw new Error(
            `Failed to parse design session ID from Apex output: ${output.substring(0, 500)}`
        );
    }
    return {
        sessionId: match[1],
        boardId,
        title
    };
}

/**
 * Add a card to a design session via the junction object.
 */
export function addCardToDesignSession(
    sessionId: string,
    cardId: string
): void {
    sfApexRun(`
OpenSF__DesignSessionCard__c sc = new OpenSF__DesignSessionCard__c(
    OpenSF__DesignSession__c = '${sessionId}',
    OpenSF__Card__c = '${cardId}',
    OpenSF__AddedDate__c = Date.today(),
    OpenSF__PhaseAtEntry__c = 'Empathize'
);
insert sc;
System.debug('E2E_SESSION_CARD_ADDED');
`);
}

/**
 * Delete a design session and its related records.
 */
export function deleteDesignSession(sessionId: string): void {
    sfApexRun(`
delete [SELECT Id FROM OpenSF__DesignVote__c WHERE OpenSF__DesignSession__c = '${sessionId}'];
delete [SELECT Id FROM OpenSF__DesignNote__c WHERE OpenSF__DesignSession__c = '${sessionId}'];
delete [SELECT Id FROM OpenSF__DesignSessionCard__c WHERE OpenSF__DesignSession__c = '${sessionId}'];
delete [SELECT Id FROM OpenSF__DesignSession__c WHERE Id = '${sessionId}'];
`);
}
