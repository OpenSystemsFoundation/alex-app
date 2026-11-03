import { execSync } from 'child_process';

/**
 * Helpers for querying Salesforce data via the SF CLI
 * during Playwright E2E tests.
 */

interface SfQueryResult {
    result?: { records?: Record<string, unknown>[]; url?: string };
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
    try {
        return execSync(`sf apex run --target-org ${TARGET_ORG} --json`, {
            input: code,
            encoding: 'utf8',
            timeout: 60_000,
            env: SF_ENV
        });
    } catch (err) {
        // sf exits non-zero on compile errors and uncaught exceptions;
        // surface the Apex message instead of a bare "Command failed"
        const stdout = String((err as { stdout?: unknown }).stdout ?? '');
        const detail =
            stdout
                .match(/"(?:compileProblem|exceptionMessage)":\s*"([^"]+)"/g)
                ?.join('; ') || stdout.substring(0, 800);
        throw new Error(`Anonymous Apex failed: ${detail}`);
    }
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

/**
 * A fresh frontdoor login URL for an org alias or username. These URLs are
 * single-use, so generate one per browser login.
 */
export function sfFrontdoorUrl(org: string): string {
    const raw = execSync(`sf org open --target-org ${org} --url-only --json`, {
        encoding: 'utf8',
        timeout: 60_000,
        env: SF_ENV
    });
    const url = (parseJsonFromOutput(raw).result as { url?: string })?.url;
    if (!url) throw new Error(`No login URL for ${org}: ${raw.slice(0, 300)}`);
    return url;
}

/** Escape a value for use inside a single-quoted Apex string literal. */
export function apexString(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Origin (https://host) of the scratch org, from SCRATCH_ORG_URL. */
export function scratchOrgOrigin(): string {
    const loginUrl = process.env.SCRATCH_ORG_URL || '';
    return loginUrl ? new URL(loginUrl).origin : '';
}

/**
 * Run anonymous Apex that ends with `System.debug('<marker>:' + value)`
 * and return the logged value.
 */
function runApexForValue(code: string, marker: string): string {
    const output = sfApexRun(code);
    const match = output.match(new RegExp(`${marker}:([A-Za-z0-9|:-]+)`));
    if (!match) {
        throw new Error(
            `Failed to parse ${marker} from Apex output: ${output.substring(0, 800)}`
        );
    }
    return match[1];
}

export interface SeedCardOptions {
    boardId: string;
    subject: string;
    /** Column to place the card in; omit for a backlog card. */
    columnId?: string;
    /** Status to set; defaults to nothing for backlog cards. */
    status?: string;
    cardType?: string;
    priority?: string;
    storyPoints?: number;
    needsRefinement?: boolean;
    epicId?: string;
    description?: string;
}

export interface SeededCard {
    Id: string;
    Name: string;
    Subject: string;
}

/**
 * Insert a card via anonymous Apex. Returns its Id and auto-number Name.
 */
export function seedCard(opts: SeedCardOptions): SeededCard {
    const fields: string[] = [
        `OpenSF__Board__c = '${opts.boardId}'`,
        `OpenSF__Subject__c = '${apexString(opts.subject)}'`,
        'OpenSF__SequenceNumber__c = 1'
    ];
    if (opts.columnId) fields.push(`OpenSF__Column__c = '${opts.columnId}'`);
    if (opts.status)
        fields.push(`OpenSF__Status__c = '${apexString(opts.status)}'`);
    if (opts.cardType) fields.push(`OpenSF__CardType__c = '${opts.cardType}'`);
    if (opts.priority) fields.push(`OpenSF__Priority__c = '${opts.priority}'`);
    if (opts.storyPoints !== undefined)
        fields.push(`OpenSF__StoryPoints__c = ${opts.storyPoints}`);
    if (opts.needsRefinement !== undefined)
        fields.push(`OpenSF__NeedsRefinement__c = ${opts.needsRefinement}`);
    if (opts.epicId) fields.push(`OpenSF__Epic__c = '${opts.epicId}'`);
    if (opts.description)
        fields.push(
            `OpenSF__Description__c = '${apexString(opts.description)}'`
        );

    const value = runApexForValue(
        `
OpenSF__Card__c card = new OpenSF__Card__c(
    ${fields.join(',\n    ')}
);
insert card;
card = [SELECT Id, Name FROM OpenSF__Card__c WHERE Id = :card.Id];
System.debug('E2E_SEED_CARD:' + card.Id + '|' + card.Name);
`,
        'E2E_SEED_CARD'
    );
    const [Id, Name] = value.split('|');
    return { Id, Name, Subject: opts.subject };
}

export interface SeedSprintOptions {
    boardId: string;
    status: 'Planning' | 'Active' | 'Completed';
    goal?: string;
    /** Days from today; omit for no date. */
    startOffsetDays?: number;
    endOffsetDays?: number;
    /** Cards to attach to the sprint via SprintCard__c junctions. */
    cardIds?: string[];
}

/**
 * Insert a sprint (and optional SprintCard__c junctions) via anonymous Apex.
 * Returns the sprint Id.
 */
export function seedSprint(opts: SeedSprintOptions): string {
    const fields: string[] = [
        `OpenSF__Board__c = '${opts.boardId}'`,
        `OpenSF__Status__c = '${opts.status}'`
    ];
    if (opts.goal) fields.push(`OpenSF__Goal__c = '${apexString(opts.goal)}'`);
    if (opts.startOffsetDays !== undefined)
        fields.push(
            `OpenSF__StartDate__c = Date.today().addDays(${opts.startOffsetDays})`
        );
    if (opts.endOffsetDays !== undefined)
        fields.push(
            `OpenSF__EndDate__c = Date.today().addDays(${opts.endOffsetDays})`
        );
    const cardIds = (opts.cardIds || []).map((id) => `'${id}'`).join(', ');

    return runApexForValue(
        `
OpenSF__Sprint__c sprint = new OpenSF__Sprint__c(
    ${fields.join(',\n    ')}
);
insert sprint;
List<Id> cardIds = new List<Id>{ ${cardIds} };
if (!cardIds.isEmpty()) {
    // Same path the app uses: junctions + sprint point totals
    OpenSF.SprintService.addCardsToSprint(sprint.Id, cardIds);
}
System.debug('E2E_SEED_SPRINT:' + sprint.Id);
`,
        'E2E_SEED_SPRINT'
    );
}

/** Insert a comment on a card via anonymous Apex. */
export function seedComment(cardId: string, body: string): void {
    sfApexRun(`
insert new OpenSF__CardComment__c(
    OpenSF__Card__c = '${cardId}',
    OpenSF__Body__c = '${apexString(body)}'
);
`);
}
