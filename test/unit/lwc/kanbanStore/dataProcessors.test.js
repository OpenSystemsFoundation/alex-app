/**
 * @jest-environment jsdom
 */

import {
    processColumnsData,
    processCardsData,
    enrichCardData
} from '../../../../force-app/main/default/lwc/kanbanStore/utils/dataProcessors';

describe('dataProcessors', () => {
    describe('processColumnsData', () => {
        it('should return empty array for null/empty columns', () => {
            expect(processColumnsData(null)).toEqual([]);
            expect(processColumnsData([])).toEqual([]);
        });

        it('should process columns with derived properties', () => {
            const columns = [
                {
                    Id: 'col1',
                    Name: 'To Do',
                    OpenSF__Position__c: 'a',
                    color: '#FF0000'
                }
            ];

            const result = processColumnsData(columns);

            expect(result).toHaveLength(1);
            expect(result[0].Id).toBe('col1');
            expect(result[0].cardCount).toBe(0);
            expect(result[0].cards).toEqual([]);
            expect(result[0].columnUrl).toBe(
                '/lightning/r/OpenSF__Column__c/col1/view'
            );
            expect(result[0].columnStyle).toBe('border-top: 8px solid #FF0000');
        });

        it('should handle columns without color', () => {
            const columns = [{ Id: 'col1', Name: 'To Do' }];
            const result = processColumnsData(columns);

            expect(result[0].columnStyle).toBe('');
        });
    });

    describe('processCardsData', () => {
        it('should handle empty cards', () => {
            const columns = [
                { Id: 'col1', Name: 'To Do', cards: [], cardCount: 0 }
            ];
            const result = processCardsData([], columns);

            expect(result[0].cards).toEqual([]);
            expect(result[0].cardCount).toBe(0);
        });

        it('should distribute and enrich cards to columns', () => {
            const columns = [
                { Id: 'col1', Name: 'To Do', cards: [], cardCount: 0 }
            ];
            const cards = [
                {
                    Id: 'card1',
                    subject: 'Task 1',
                    columnId: 'col1',
                    position: 'a',
                    priority: 'High'
                }
            ];

            const result = processCardsData(cards, columns);

            expect(result[0].cards).toHaveLength(1);
            expect(result[0].cardCount).toBe(1);
            expect(result[0].cards[0].Id).toBe('card1');
            expect(result[0].cards[0].priorityClass).toBe('priority-high');
        });

        it('should sort cards by position', () => {
            const columns = [{ Id: 'col1', Name: 'To Do' }];
            const cards = [
                { Id: 'card1', columnId: 'col1', position: 'c' },
                { Id: 'card2', columnId: 'col1', position: 'a' },
                { Id: 'card3', columnId: 'col1', position: 'b' }
            ];

            const result = processCardsData(cards, columns);

            expect(result[0].cards[0].Id).toBe('card2');
            expect(result[0].cards[1].Id).toBe('card3');
            expect(result[0].cards[2].Id).toBe('card1');
        });

        it('should handle cards without position', () => {
            const columns = [{ Id: 'col1', Name: 'To Do' }];
            const cards = [
                { Id: 'card1', columnId: 'col1', position: 'a' },
                { Id: 'card2', columnId: 'col1' }
            ];

            const result = processCardsData(cards, columns);

            expect(result[0].cards[0].Id).toBe('card1');
            expect(result[0].cards[1].Id).toBe('card2');
        });
    });

    describe('enrichCardData', () => {
        it('should enrich card with all derived properties', () => {
            const card = {
                Id: 'card1',
                subject: 'Task 1',
                priority: 'High',
                assigneeId: 'user1',
                assignee: { name: 'John Doe' },
                dueDate: '2025-12-31',
                color: '#FF0000'
            };

            const result = enrichCardData(card);

            expect(result.priorityClass).toBe('priority-high');
            expect(result.assigneeInitials).toBe('JD');
            expect(result.hasAssignee).toBe(true);
            expect(result.formattedDueDate).toBeTruthy();
            expect(result.cardStyle).toBe('border-left: 4px solid #FF0000');
            expect(result.recordUrl).toBe(
                '/lightning/r/OpenSF__Card__c/card1/view'
            );
        });

        it('should handle card without assignee', () => {
            const card = { Id: 'card1', subject: 'Task 1' };
            const result = enrichCardData(card);

            expect(result.assigneeInitials).toBe('');
            expect(result.hasAssignee).toBe(false);
        });

        it('should handle card without due date', () => {
            const card = { Id: 'card1', subject: 'Task 1' };
            const result = enrichCardData(card);

            expect(result.formattedDueDate).toBeNull();
            expect(result.isOverdue).toBe(false);
        });

        it('should detect overdue cards', () => {
            const card = {
                Id: 'card1',
                subject: 'Task 1',
                dueDate: '2020-01-01'
            };
            const result = enrichCardData(card);

            expect(result.isOverdue).toBe(true);
        });

        it('should handle different priority levels', () => {
            expect(enrichCardData({ priority: 'High' }).priorityClass).toBe(
                'priority-high'
            );
            expect(enrichCardData({ priority: 'Medium' }).priorityClass).toBe(
                'priority-medium'
            );
            expect(enrichCardData({ priority: 'Low' }).priorityClass).toBe(
                'priority-low'
            );
            expect(enrichCardData({ priority: 'Unknown' }).priorityClass).toBe(
                ''
            );
        });

        it('should generate initials correctly', () => {
            expect(
                enrichCardData({
                    assignee: { name: 'John Doe' }
                }).assigneeInitials
            ).toBe('JD');
            expect(
                enrichCardData({
                    assignee: { name: 'Jane' }
                }).assigneeInitials
            ).toBe('J');
            expect(
                enrichCardData({
                    assignee: { name: 'John Paul Jones' }
                }).assigneeInitials
            ).toBe('JP');
        });
    });
});
