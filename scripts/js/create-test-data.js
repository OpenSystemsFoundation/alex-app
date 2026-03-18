#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Generate a random name based on a base string
 */
function generateName(base) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const random = Array.from({ length: 4 }, () => 
        chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    return `${base}_${random}`;
}

/**
 * Generate a LexoRank position string for the given index
 */
function generateLexorank(index, total) {
    if (total <= 1) {
        return '0|hzzzzz:';
    }
    
    const base36Chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    const increment = Math.floor(Math.pow(36, 5) / (total + 1));
    const positionValue = increment * (index + 1);
    
    let positionStr = '';
    let temp = positionValue;
    
    for (let i = 0; i < 5; i++) {
        positionStr = base36Chars[temp % 36] + positionStr;
        temp = Math.floor(temp / 36);
    }
    
    return `0|h${positionStr}:`;
}

/**
 * Execute Salesforce CLI command and return JSON result
 */
function executeSfCommand(command) {
    try {
        const result = execSync(command, { encoding: 'utf-8' });
        return JSON.parse(result);
    } catch (error) {
        console.error(`Command Failed: ${command}`);
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Generate test data structure
 */
function generateData(numBoards = 1, cardsPerColumn = 0) {
    const data = {
        boards: [],
        columns: [],
        cards: []
    };
    
    const columnHeaders = ['Backlog', 'To Do', 'In Progress', 'Testing', 'Review', 'Done'];
    
    for (let i = 0; i < numBoards; i++) {
        const boardName = generateName('Board');
        data.boards.push({ Name: boardName });
        
        columnHeaders.forEach((columnHeader, j) => {
            const columnPosition = generateLexorank(j, columnHeaders.length);
            data.columns.push({
                LexoRankPosition: columnPosition,
                Board: boardName,
                ColumnHeader: columnHeader
            });
            
            for (let k = 0; k < cardsPerColumn; k++) {
                const cardPosition = generateLexorank(k, cardsPerColumn);
                data.cards.push({
                    LexoRankPosition: cardPosition,
                    Column_LexoRankPosition: columnPosition,
                    Board: boardName
                });
            }
        });
    }
    
    return data;
}

/**
 * Generate Apex script to create board and columns in one transaction
 */
function generateApexScript(boardName, columns) {
    const columnHeaders = columns.map(c => c.ColumnHeader);
    
    return `
// Create board with columns in one transaction
OpenSF__Board__c board = new OpenSF__Board__c(
    Name = '${boardName}',
    OpenSF__EmailNotifications__c = false,
    OpenSF__SalesforceNotifications__c = false
);
insert board;

List<String> columnHeaders = new List<String>{
    ${columnHeaders.map(h => `'${h}'`).join(',\n    ')}
};
List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>();

for (Integer i = 0; i < columnHeaders.size(); i++) {
    String position = generateLexorank(i, columnHeaders.size());
    columns.add(
        new OpenSF__Column__c(
            OpenSF__Board__c = board.Id,
            OpenSF__ColumnHeader__c = columnHeaders[i],
            OpenSF__LexoRankPosition__c = position
        )
    );
}
insert columns;

System.debug('BOARD_ID:' + board.Id);
System.debug('COLUMN_COUNT:' + columns.size());
for (OpenSF__Column__c col : columns) {
    System.debug('COLUMN_ID:' + col.Id + ':POSITION:' + col.OpenSF__LexoRankPosition__c);
}

// Helper method to generate LexoRank positions
private static String generateLexorank(Integer index, Integer total) {
    if (total <= 1) {
        return '0|hzzzzz:';
    }

    String base36Chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    Integer increment = (Integer) (Math.pow(36, 5) / (total + 1));
    Integer positionValue = increment * (index + 1);

    String positionStr = '';
    Integer temp = positionValue;

    for (Integer i = 0; i < 5; i++) {
        positionStr =
            base36Chars.substring(Math.mod(temp, 36), Math.mod(temp, 36) + 1) +
            positionStr;
        temp = temp / 36;
    }

    return '0|h' + positionStr + ':';
}
`;
}

/**
 * Parse Apex execution output to extract board and column IDs
 */
function parseApexOutput(output) {
    const lines = output.split('\n');
    let boardId = null;
    const columnPositions = {};
    
    for (const line of lines) {
        if (line.includes('BOARD_ID:')) {
            boardId = line.split('BOARD_ID:')[1].trim();
        } else if (line.includes('COLUMN_ID:')) {
            const parts = line.split(':');
            const columnId = parts[1].trim();
            const position = parts[3].trim();
            columnPositions[position] = columnId;
        }
    }
    
    return { boardId, columnPositions };
}

/**
 * Generate and execute Salesforce CLI commands
 */
function generateAndExecuteCommands(data) {
    const columnPositionToId = {};
    let boardId;
    
    // Create Boards with Columns in one transaction using Apex
    for (const board of data.boards) {
        const boardColumns = data.columns.filter(c => c.Board === board.Name);
        
        // Generate Apex script
        const apexScript = generateApexScript(board.Name, boardColumns);
        
        // Write to temp file
        const tempFile = path.join(__dirname, '.temp-create-board.apex');
        fs.writeFileSync(tempFile, apexScript);
        
        try {
            // Execute Apex script
            const command = `sf apex run --file "${tempFile}"`;
            const output = execSync(command, { encoding: 'utf-8' });
            
            // Parse output to get IDs
            const { boardId: createdBoardId, columnPositions } = parseApexOutput(output);
            boardId = createdBoardId;
            
            console.log(`Created Board: ${board.Name} with ID: ${boardId}`);
            
            // Store column IDs by position
            for (const [position, columnId] of Object.entries(columnPositions)) {
                columnPositionToId[[board.Name, position]] = columnId;
                const column = boardColumns.find(c => c.LexoRankPosition === position);
                if (column) {
                    console.log(`Created column: ${column.ColumnHeader} with ID: ${columnId} at position: ${position}`);
                }
            }
        } finally {
            // Clean up temp file
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        }
    }
    
    // Create Cards
    for (const card of data.cards) {
        const columnId = columnPositionToId[[card.Board, card.Column_LexoRankPosition]];
        if (!columnId) {
            console.error(`No column ID found for position ${card.Column_LexoRankPosition} on board ${card.Board}`);
            process.exit(1);
        }
        
        const command = `sf data create record --sobject OpenSF__Card__c --values "OpenSF__LexoRankPosition__c='${card.LexoRankPosition}' OpenSF__Column__c='${columnId}'" --json`;
        const result = executeSfCommand(command);
        const cardId = result.result.id;
        console.log(`Created Card with ID: ${cardId} on column ID: ${columnId} at position: ${card.LexoRankPosition}`);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const numBoards = parseInt(args[0]) || 1;
const cardsPerColumn = parseInt(args[1]) || 0;

// Generate and execute
const data = generateData(numBoards, cardsPerColumn);
generateAndExecuteCommands(data);
