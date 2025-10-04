/**
 * Test data generator for Kanban board E2E tests
 */

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
 * Test board configuration
 */
export function getTestBoardId(): string {
    const boardId = process.env.SF_BOARD_ID;
    if (!boardId) {
        throw new Error('SF_BOARD_ID environment variable is not set');
    }
    return boardId;
}
