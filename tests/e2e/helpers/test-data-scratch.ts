/**
 * Test data helper that reads board ID from scratch org setup
 */
import * as fs from 'fs';
import * as path from 'path';

export interface TestCard {
    title: string;
    description?: string;
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
 * Get test board ID from scratch org setup
 */
export function getTestBoardId(): string {
    const orgInfoPath = path.join(__dirname, '../.auth/org-info.json');

    if (!fs.existsSync(orgInfoPath)) {
        throw new Error(
            'Org info not found. Run global setup first or check SF_BOARD_ID env variable.'
        );
    }

    try {
        const orgInfo = JSON.parse(fs.readFileSync(orgInfoPath, 'utf-8'));

        if (!orgInfo.boardId) {
            throw new Error('Board ID not found in org info');
        }

        return orgInfo.boardId;
    } catch (error: any) {
        throw new Error(`Failed to read board ID: ${error.message}`);
    }
}

/**
 * Get org instance URL
 */
export function getInstanceUrl(): string {
    const orgInfoPath = path.join(__dirname, '../.auth/org-info.json');

    if (!fs.existsSync(orgInfoPath)) {
        throw new Error('Org info not found. Run global setup first.');
    }

    try {
        const orgInfo = JSON.parse(fs.readFileSync(orgInfoPath, 'utf-8'));
        return orgInfo.instanceUrl;
    } catch (error: any) {
        throw new Error(`Failed to read instance URL: ${error.message}`);
    }
}
