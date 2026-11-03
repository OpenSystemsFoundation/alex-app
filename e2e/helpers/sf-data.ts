import { execSync } from 'child_process';

/**
 * Helpers for querying Salesforce data via the SF CLI
 * during Playwright E2E tests.
 */

interface SfQueryResult {
    result?: { records?: Record<string, unknown>[] };
}

export interface BoardData {
    boardId: string;
    columns: Array<{ Id: string; header: string }>;
    cards: Array<{
        Id: string;
        Name: string;
        Subject: string;
        ColumnId: string;
    }>;
}

const TARGET_ORG: string = process.env.SF_TARGET_ORG || 'e2e-test';

/** Env passed to sf CLI -- disables color output so JSON is clean */
const SF_ENV: NodeJS.ProcessEnv = {
    ...process.env,
    NO_COLOR: '1',
    FORCE_COLOR: '0'
};

/**
 * Shell-escape a string for use in a command passed to execSync.
 */
function shellQuote(str: string): string {
    if (process.platform === 'win32') {
        return `"${str.replace(/"/g, '\\"')}"`;
    }
    return `'${str.replace(/'/g, "'\\''")}'`;
}

/**
 * Extract the first valid JSON object from CLI output that may contain
 * warnings, banners, or other non-JSON text before/after the JSON.
 */
function parseJsonFromOutput(output: string): SfQueryResult {
    // Strip any ANSI escape codes
    // eslint-disable-next-line no-control-regex
    const raw = output.replace(/\x1B\[[0-9;]*m/g, '');

    // Try each `{` position until JSON.parse succeeds
    let pos = 0;
    while (pos < raw.length) {
        const start = raw.indexOf('{', pos);
        if (start === -1) break;

        let depth = 0;
        let end = -1;
        for (let i = start; i < raw.length; i++) {
            if (raw[i] === '{') depth++;
            else if (raw[i] === '}') {
                depth--;
                if (depth === 0) {
                    end = i + 1;
                    break;
                }
            }
        }
        if (end === -1) break;

        try {
            return JSON.parse(raw.substring(start, end)) as SfQueryResult;
        } catch {
            pos = start + 1;
        }
    }
    throw new Error(`No valid JSON found in output: ${raw}`);
}

/**
 * Run an SOQL query and return the records array.
 */
// SOQL rows are dynamic; callers read fields by name.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sfQuery(query: string): Record<string, any>[] {
    const raw = execSync(
        `sf data query --query ${shellQuote(query)} --target-org ${TARGET_ORG} --json`,
        { encoding: 'utf8', timeout: 30_000, env: SF_ENV }
    );
    const json = parseJsonFromOutput(raw);
    return json.result?.records || [];
}

/**
 * Update a record via SF CLI.
 */
export function sfUpdate(
    sobject: string,
    recordId: string,
    values: string
): void {
    execSync(
        `sf data update record --sobject ${sobject} --record-id ${recordId} --values ${shellQuote(values)} --target-org ${TARGET_ORG} --json`,
        { encoding: 'utf8', timeout: 30_000, env: SF_ENV }
    );
}

/**
 * Get the most recent Board and its columns + cards from the scratch org.
 * @deprecated Use createIsolatedBoard() for deterministic test data.
 */
export function getSampleBoardData(): BoardData {
    const boards = sfQuery(
        'SELECT Id FROM OpenSF__Board__c ORDER BY CreatedDate DESC LIMIT 1'
    );
    if (!boards.length) throw new Error('No board found in scratch org');

    const boardId = boards[0].Id as string;
    return queryBoardData(boardId);
}

/**
 * Query full board data (columns + cards) for a given board ID.
 */
function queryBoardData(boardId: string): BoardData {
    const columns = sfQuery(
        `SELECT Id, OpenSF__ColumnHeader__c FROM OpenSF__Column__c WHERE OpenSF__Board__c = '${boardId}' ORDER BY OpenSF__LexoRankPosition__c`
    );

    const cards = sfQuery(
        `SELECT Id, Name, OpenSF__Subject__c, OpenSF__Column__c FROM OpenSF__Card__c WHERE OpenSF__Column__r.OpenSF__Board__c = '${boardId}' ORDER BY OpenSF__LexoRankPosition__c LIMIT 20`
    );

    return {
        boardId,
        columns: columns.map((c) => ({
            Id: c.Id as string,
            header: c.OpenSF__ColumnHeader__c as string
        })),
        cards: cards.map((c) => ({
            Id: c.Id as string,
            Name: c.Name as string,
            Subject: c.OpenSF__Subject__c as string,
            ColumnId: c.OpenSF__Column__c as string
        }))
    };
}

/**
 * Run anonymous Apex code via the SF CLI.
 * Returns the raw stdout (debug log) from the execution.
 */
export function sfApexRun(code: string): string {
    const raw = execSync(`sf apex run --target-org ${TARGET_ORG} --json`, {
        input: code,
        encoding: 'utf8',
        timeout: 60_000,
        env: SF_ENV
    });
    return raw;
}

/**
 * Create an isolated board with 6 columns and 3 cards per column.
 * Each call creates a completely fresh board — no shared state between tests.
 *
 * @param label Optional suffix for the board name (for debugging)
 * @returns BoardData with the new board's IDs
 */
/**
 * Enable dev tools (undo/redo, debug info) by upserting KanbanConfig__c custom setting.
 */
export function enableDevTools(): void {
    sfApexRun(`
OpenSF__KanbanConfig__c config = OpenSF__KanbanConfig__c.getOrgDefaults();
config.OpenSF__EnableDevTools__c = true;
config.OpenSF__ShowDebugInfo__c = true;
upsert config;
System.debug('E2E_DEV_TOOLS_ENABLED');
`);
}

/**
 * Disable dev tools by clearing KanbanConfig__c custom setting.
 */
export function disableDevTools(): void {
    sfApexRun(`
OpenSF__KanbanConfig__c config = OpenSF__KanbanConfig__c.getOrgDefaults();
config.OpenSF__EnableDevTools__c = false;
config.OpenSF__ShowDebugInfo__c = false;
upsert config;
`);
}

export function createIsolatedBoard(
    label: string = 'E2E',
    boardType: string = 'Project'
): BoardData {
    const boardName = `${label}-${Date.now()}`;

    // Anonymous Apex that creates a board, 6 columns, and cards.
    // TestFactory is @isTest so we create data inline.
    const apex = `
OpenSF__Board__c board = new OpenSF__Board__c(
    Name = '${boardName}',
    OpenSF__Status__c = 'Published',
    OpenSF__Type__c = '${boardType}',
    OpenSF__Active__c = true,
    OpenSF__EmailNotifications__c = false,
    OpenSF__SalesforceNotifications__c = false
);
insert board;

List<String> headers = new List<String>{
    'Backlog', 'To Do', 'In Progress', 'Testing', 'Review', 'Done'
};
List<String> categories = new List<String>{
    null, 'To Do', 'In Progress', null, null, 'Done'
};

// Generate evenly spaced LexoRank positions
List<OpenSF__Column__c> cols = new List<OpenSF__Column__c>();
String chars = '0123456789abcdefghijklmnopqrstuvwxyz';
for (Integer i = 0; i < headers.size(); i++) {
    Integer inc = (Integer)(Math.pow(36, 5) / (headers.size() + 1));
    Integer val = inc * (i + 1);
    String pos = '';
    Integer tmp = val;
    for (Integer j = 0; j < 5; j++) {
        pos = chars.substring(Math.mod(tmp, 36), Math.mod(tmp, 36) + 1) + pos;
        tmp = tmp / 36;
    }
    OpenSF__Column__c col = new OpenSF__Column__c(
        OpenSF__Board__c = board.Id,
        OpenSF__ColumnHeader__c = headers[i],
        OpenSF__Status__c = headers[i],
        OpenSF__LexoRankPosition__c = '0|h' + pos + ':'
    );
    if (categories[i] != null) {
        col.OpenSF__Category__c = categories[i];
    }
    cols.add(col);
}
insert cols;

// Create 3 cards per column with varied types and priorities
List<String> types = new List<String>{'Story', 'Bug', 'Task'};
List<String> priorities = new List<String>{'High', 'Medium', 'Low'};
List<OpenSF__Card__c> cards = new List<OpenSF__Card__c>();

OpenSF.TriggerHandler.bypass('ColumnTriggerHandler');
for (Integer ci = 0; ci < cols.size(); ci++) {
    for (Integer j = 0; j < 3; j++) {
        Integer inc2 = (Integer)(Math.pow(36, 5) / 4);
        Integer val2 = inc2 * (j + 1);
        String cpos = '';
        Integer tmp2 = val2;
        for (Integer k = 0; k < 5; k++) {
            cpos = chars.substring(Math.mod(tmp2, 36), Math.mod(tmp2, 36) + 1) + cpos;
            tmp2 = tmp2 / 36;
        }
        cards.add(new OpenSF__Card__c(
            OpenSF__Column__c = cols[ci].Id,
            OpenSF__Board__c = board.Id,
            OpenSF__Subject__c = headers[ci] + ' Card ' + (j + 1),
            OpenSF__Status__c = headers[ci],
            OpenSF__CardType__c = types[Math.mod(j, 3)],
            OpenSF__Priority__c = priorities[Math.mod(j, 3)],
            OpenSF__StoryPoints__c = (j + 1) * 2,
            OpenSF__LexoRankPosition__c = '0|h' + cpos + ':',
            OpenSF__SequenceNumber__c = 1
        ));
    }
}
insert cards;
OpenSF.TriggerHandler.clearBypass('ColumnTriggerHandler');

System.debug('E2E_BOARD_ID:' + board.Id);
`;

    const output = sfApexRun(apex);

    // Parse the board ID from the debug log
    const match = output.match(/E2E_BOARD_ID:([a-zA-Z0-9]{15,18})/);
    if (!match) {
        throw new Error(
            `Failed to parse board ID from Apex output: ${output.substring(0, 500)}`
        );
    }

    const boardId = match[1];
    return queryBoardData(boardId);
}
