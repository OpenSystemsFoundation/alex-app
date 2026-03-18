/**
 * Test data helper for Kanban board E2E tests
 * Supports both scratch org setup (primary) and environment variables (fallback)
 */
import * as fs from 'fs';
import * as path from 'path';

export interface TestCard {
    title: string;
    description?: string;
}

export interface TestColumn {
    name: string;
    cards: TestCard[];
}

/**
 * Generate a unique card title with timestamp
 */
export function generateCardTitle(prefix: string = 'Test Card'): string {
    return `${prefix} ${Date.now()}`;
}

/**
 * Generate a unique card description
 */
export function generateCardDescription(
    prefix: string = 'Test Description'
): string {
    return `${prefix} - Created at ${new Date().toISOString()}`;
}

/**
 * Generate test card data
 */
export function generateTestCard(
    title?: string,
    description?: string
): TestCard {
    return {
        title: title || generateCardTitle(),
        description: description || generateCardDescription()
    };
}

/**
 * Sample test data for creating multiple cards
 */
export const sampleCards: TestCard[] = [
    {
        title: 'Design new feature',
        description: 'Create mockups and wireframes for the new dashboard'
    },
    {
        title: 'Implement authentication',
        description: 'Add OAuth 2.0 authentication flow'
    },
    {
        title: 'Write unit tests',
        description: 'Increase code coverage to 80%'
    },
    {
        title: 'Code review',
        description: 'Review pull requests from team members'
    },
    {
        title: 'Deploy to staging',
        description: 'Deploy latest changes to staging environment'
    }
];

/**
 * Get a random sample card
 */
export function getRandomSampleCard(): TestCard {
    const index = Math.floor(Math.random() * sampleCards.length);
    return { ...sampleCards[index] };
}

/**
 * Get test board ID from scratch org setup or environment variable
 * Priority: 1) Scratch org setup file, 2) Environment variable
 */
export function getTestBoardId(): string {
    // Try scratch org setup file first (primary method)
    const orgInfoPath = path.join(__dirname, '../.auth/org-info.json');

    if (fs.existsSync(orgInfoPath)) {
        try {
            const orgInfo = JSON.parse(fs.readFileSync(orgInfoPath, 'utf-8'));

            if (orgInfo.boardId) {
                return orgInfo.boardId;
            }
        } catch (error: any) {
            console.warn(
                `Warning: Could not read board ID from org info: ${error.message}`
            );
        }
    }

    // Fall back to environment variable
    const boardId = process.env.SF_BOARD_ID;
    if (boardId) {
        return boardId;
    }

    throw new Error(
        'Board ID not found. Run global setup first or set SF_BOARD_ID environment variable.'
    );
}

/**
 * Get org instance URL from scratch org setup or environment variable
 * Priority: 1) Scratch org setup file, 2) Environment variable
 */
export function getInstanceUrl(): string {
    // Try scratch org setup file first (primary method)
    const orgInfoPath = path.join(__dirname, '../.auth/org-info.json');

    if (fs.existsSync(orgInfoPath)) {
        try {
            const orgInfo = JSON.parse(fs.readFileSync(orgInfoPath, 'utf-8'));

            if (orgInfo.instanceUrl) {
                return orgInfo.instanceUrl;
            }
        } catch (error: any) {
            console.warn(
                `Warning: Could not read instance URL from org info: ${error.message}`
            );
        }
    }

    // Fall back to environment variable
    const instanceUrl = process.env.SF_INSTANCE_URL;
    if (instanceUrl) {
        return instanceUrl;
    }

    throw new Error(
        'Instance URL not found. Run global setup first or set SF_INSTANCE_URL environment variable.'
    );
}
