// @ts-check
const { execSync } = require('child_process');

/**
 * Helpers for interacting with Salesforce data via the SF CLI
 * during Playwright E2E tests.
 */

const TARGET_ORG = 'e2e-test';

/**
 * Run an SOQL query and return the records array.
 * @param {string} query
 * @returns {object[]}
 */
function sfQuery(query) {
    const raw = execSync(
        `sf data query --query "${query}" --target-org ${TARGET_ORG} --json`,
        { encoding: 'utf8', timeout: 30_000 }
    );
    const json = JSON.parse(raw);
    return json.result?.records || [];
}

/**
 * Update a record via SF CLI.
 * @param {string} sobject - e.g. 'OpenSF__Card__c'
 * @param {string} recordId
 * @param {string} values - e.g. 'OpenSF__Subject__c="Updated subject"'
 */
function sfUpdate(sobject, recordId, values) {
    execSync(
        `sf data update record --sobject ${sobject} --record-id ${recordId} --values "${values}" --target-org ${TARGET_ORG} --json`,
        { encoding: 'utf8', timeout: 30_000 }
    );
}

/**
 * Create a record via SF CLI and return its Id.
 * @param {string} sobject
 * @param {string} values - e.g. 'Name="Card-001" OpenSF__Column__c=a01...'
 * @returns {string} record Id
 */
function sfCreate(sobject, values) {
    const raw = execSync(
        `sf data create record --sobject ${sobject} --values "${values}" --target-org ${TARGET_ORG} --json`,
        { encoding: 'utf8', timeout: 30_000 }
    );
    const json = JSON.parse(raw);
    return json.result?.id || '';
}

/**
 * Get the Board Id and column Ids for the sample board.
 * @returns {{ boardId: string, columns: Array<{Id: string, header: string}> }}
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

    return {
        boardId,
        columns: columns.map((c) => ({
            Id: c.Id,
            header: c.OpenSF__ColumnHeader__c
        }))
    };
}

/**
 * Create test cards in a given column and return their Ids.
 * @param {string} columnId
 * @param {string[]} names
 * @returns {string[]} card Ids
 */
function createTestCards(columnId, names) {
    return names.map((name, i) => {
        const position = `0|h${String(i + 1).padStart(5, '0')}:`;
        return sfCreate(
            'OpenSF__Card__c',
            `Name="${name}" OpenSF__Column__c=${columnId} OpenSF__Subject__c="${name} subject" OpenSF__LexoRankPosition__c="${position}"`
        );
    });
}

module.exports = {
    sfQuery,
    sfUpdate,
    sfCreate,
    getSampleBoardData,
    createTestCards
};
