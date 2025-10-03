import DataManager from '../dataManager';

describe('DataManager', () => {
    describe('processColumns', () => {
        it('should return empty array for null/empty columns', () => {
            expect(DataManager.processColumns(null)).toEqual([]);
            expect(DataManager.processColumns([])).toEqual([]);
        });

        it('should process columns with properties', () => {
            const columns = [
                {
                    Id: 'col1',
                    Name: 'To Do',
                    OpenSF__Position__c: 'a',
                    color: '#FF0000'
                }
            ];

            const result = DataManager.processColumns(columns);

            expect(result).toHaveLength(1);
            expect(result[0].Id).toBe('col1');
            expect(result[0].cardCount).toBe(0);
            expect(result[0].columnUrl).toBe(
                '/lightning/r/OpenSF__Column__c/col1/view'
            );
            expect(result[0].columnStyle).toBe('border-top: 4px solid #FF0000');
        });
    });

    describe('processCards', () => {
        it('should handle empty cards', () => {
            const columns = [
                { Id: 'col1', Name: 'To Do', cards: [], cardCount: 0 }
            ];
            const result = DataManager.processCards([], columns);

            expect(result.processedColumns[0].cards).toEqual([]);
            expect(result.cardsByColumn.col1).toEqual([]);
        });

        it('should assign and enrich cards correctly', () => {
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

            const result = DataManager.processCards(cards, columns);

            expect(result.processedColumns[0].cards).toHaveLength(1);
            expect(result.processedColumns[0].cards[0].priorityClass).toBe(
                'priority-high'
            );
            expect(result.processedColumns[0].cards[0].recordUrl).toContain(
                'card1'
            );
        });
    });

    describe('enrichCard', () => {
        it('should add priority classes', () => {
            expect(
                DataManager.enrichCard({ Id: 'card1', priority: 'High' })
                    .priorityClass
            ).toBe('priority-high');
            expect(
                DataManager.enrichCard({ Id: 'card1', priority: 'Medium' })
                    .priorityClass
            ).toBe('priority-medium');
            expect(
                DataManager.enrichCard({ Id: 'card1', priority: 'Low' })
                    .priorityClass
            ).toBe('priority-low');
            expect(DataManager.enrichCard({ Id: 'card1' }).priorityClass).toBe(
                ''
            );
        });

        it('should generate assignee initials', () => {
            const withAssignee = DataManager.enrichCard({
                Id: 'card1',
                assigneeId: 'user1',
                assignee: { name: 'John Doe' }
            });
            expect(withAssignee.assigneeInitials).toBe('JD');
            expect(withAssignee.hasAssignee).toBe(true);

            const withoutAssignee = DataManager.enrichCard({ Id: 'card1' });
            expect(withoutAssignee.hasAssignee).toBe(false);
        });

        it('should detect overdue cards', () => {
            const overdue = DataManager.enrichCard({
                Id: 'card1',
                dueDate: '2020-01-01'
            });
            expect(overdue.isOverdue).toBe(true);

            const future = DataManager.enrichCard({
                Id: 'card1',
                dueDate: '2025-12-31'
            });
            expect(future.isOverdue).toBe(false);
        });
    });

    describe('Utility Methods', () => {
        it('getPriorityClass should map priorities', () => {
            expect(DataManager.getPriorityClass('High')).toBe('priority-high');
            expect(DataManager.getPriorityClass('Medium')).toBe(
                'priority-medium'
            );
            expect(DataManager.getPriorityClass('Low')).toBe('priority-low');
            expect(DataManager.getPriorityClass(null)).toBe('');
        });

        it('getInitials should generate initials', () => {
            expect(DataManager.getInitials('John Doe')).toBe('JD');
            expect(DataManager.getInitials('John')).toBe('J');
            expect(DataManager.getInitials('john doe')).toBe('JD');
            expect(DataManager.getInitials(null)).toBe('');
        });

        it('formatDate should format dates', () => {
            const result = DataManager.formatDate('2025-10-04');
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });
    });
});
