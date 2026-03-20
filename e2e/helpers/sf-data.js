// @ts-check
const { execSync } = require('child_process');

/**
 * Helpers for querying Salesforce data via the SF CLI
 * during Playwright E2E tests.
 */

const TARGET_ORG = process.env.SF_TARGET_ORG || 'e2e-test';

/** Env passed to sf CLI — disables color output so JSON is clean */
const SF_ENV = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };

/**
 * Shell-escape a string for use in a command passed to execSync.
 * @param {string} str
 * @returns {string}
 */
function shellQuote(str) {
    if (process.platform === 'win32') {
        return `"${str.replace(/"/g, '\\"')}"`;
    }
    return `'${str.replace(/'/g, "'\\''")}'`;
}

/**
 * Extract the first valid JSON object from CLI output that may contain
 * warnings, banners, or other non-JSON text before/after the JSON.
 * @param {string} raw
 * @returns {object}
 */
function parseJsonFromOutput(raw) {
    // Strip any ANSI escape codes
    // eslint-disable-next-line no-control-regex
    raw = raw.replace(/\x1B\[[0-9;]*m/g, '');

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
            return JSON.parse(raw.substring(start, end));
        } catch {
            pos = start + 1;
        }
    }
    throw new Error(`No valid JSON found in output: ${raw}`);
}

/**
 * Run an SOQL query and return the records array.
 * @param {string} query
 * @returns {object[]}
 */
function sfQuery(query) {
    const raw = execSync(
        `sf data query --query ${shellQuote(query)} --target-org ${TARGET_ORG} --json`,
        { encoding: 'utf8', timeout: 30_000, env: SF_ENV }
    );
    const json = parseJsonFromOutput(raw);
    return json.result?.records || [];
}

/**
 * Update a record via SF CLI.
 * @param {string} sobject
 * @param {string} recordId
 * @param {string} values
 */
function sfUpdate(sobject, recordId, values) {
    execSync(
        `sf data update record --sobject ${sobject} --record-id ${recordId} --values ${shellQuote(values)} --target-org ${TARGET_ORG} --json`,
        { encoding: 'utf8', timeout: 30_000, env: SF_ENV }
    );
}

/**
 * Get the most recent Board and its columns + cards from the scratch org.
 * @returns {{
 *   boardId: string,
 *   columns: Array<{Id: string, header: string}>,
 *   cards: Array<{Id: string, Name: string, Subject: string, ColumnId: string}>
 * }}
 */
function getSampleBoardData() {
    const boards = sfQuery(
        'SELECT Id FROM OpenSF__Board__c ORDER BY CreatedDate DESC LIMIT 1'
    );
    if (!boards.length) throw new Error('No board found in scratch org');

    const boardId = boards[0].Id;

    const columns = sfQuery(
        `SELECT Id, OpenSF__ColumnHeader__c FROM OpenSF__Column__c WHERE OpenSF__Board__c = '${boardId}' ORDER BY OpenSF__LexoRankPosition__c`
    );

    const cards = sfQuery(
        `SELECT Id, Name, OpenSF__Subject__c, OpenSF__Column__c FROM OpenSF__Card__c WHERE OpenSF__Column__r.OpenSF__Board__c = '${boardId}' ORDER BY OpenSF__LexoRankPosition__c LIMIT 10`
    );

    return {
        boardId,
        columns: columns.map((c) => ({
            Id: c.Id,
            header: c.OpenSF__ColumnHeader__c
        })),
        cards: cards.map((c) => ({
            Id: c.Id,
            Name: c.Name,
            Subject: c.OpenSF__Subject__c,
            ColumnId: c.OpenSF__Column__c
        }))
    };
}

module.exports = {
    sfQuery,
    sfUpdate,
    getSampleBoardData
};
