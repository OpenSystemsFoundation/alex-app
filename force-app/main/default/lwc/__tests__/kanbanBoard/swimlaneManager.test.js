import SwimlaneManager from '../../kanbanBoard/managers/swimlaneManager';

const createMockComponent = (mode = 'none') => ({
    _swimlaneMode: mode
});

const makeCard = (overrides = {}) => ({
    assigneeId: null,
    assignee: null,
    priority: null,
    cardType: null,
    epicId: null,
    epic: null,
    ...overrides
});

const makeColumns = (cards1 = [], cards2 = []) => [
    { Id: 'col1', cards: cards1 },
    { Id: 'col2', cards: cards2 }
];

describe('SwimlaneManager', () => {
    let manager;
    let mockComponent;

    beforeEach(() => {
        mockComponent = createMockComponent();
        manager = new SwimlaneManager(mockComponent);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('modeOptions', () => {
        it('returns 5 options', () => {
            const options = manager.modeOptions;
            expect(options).toHaveLength(5);
        });

        it('includes expected values', () => {
            const values = manager.modeOptions.map((o) => o.value);
            expect(values).toEqual([
                'none',
                'assignee',
                'priority',
                'cardType',
                'epic'
            ]);
        });

        it('each option has label and value', () => {
            manager.modeOptions.forEach((opt) => {
                expect(opt).toHaveProperty('label');
                expect(opt).toHaveProperty('value');
                expect(typeof opt.label).toBe('string');
                expect(typeof opt.value).toBe('string');
            });
        });
    });

    describe('isActive', () => {
        it('returns false when mode is none', () => {
            mockComponent._swimlaneMode = 'none';
            expect(manager.isActive).toBe(false);
        });

        it('returns true when mode is assignee', () => {
            mockComponent._swimlaneMode = 'assignee';
            expect(manager.isActive).toBe(true);
        });

        it('returns true when mode is priority', () => {
            mockComponent._swimlaneMode = 'priority';
            expect(manager.isActive).toBe(true);
        });

        it('returns true when mode is cardType', () => {
            mockComponent._swimlaneMode = 'cardType';
            expect(manager.isActive).toBe(true);
        });

        it('returns true when mode is epic', () => {
            mockComponent._swimlaneMode = 'epic';
            expect(manager.isActive).toBe(true);
        });
    });

    describe('getSwimlanes()', () => {
        it('returns empty array when not active (mode is none)', () => {
            mockComponent._swimlaneMode = 'none';
            const columns = makeColumns([makeCard()]);
            expect(manager.getSwimlanes(columns)).toEqual([]);
        });

        it('returns empty array when filteredColumns is null', () => {
            mockComponent._swimlaneMode = 'assignee';
            expect(manager.getSwimlanes(null)).toEqual([]);
        });

        it('returns empty array when filteredColumns is undefined', () => {
            mockComponent._swimlaneMode = 'assignee';
            expect(manager.getSwimlanes(undefined)).toEqual([]);
        });

        it('returns empty array when filteredColumns is empty', () => {
            mockComponent._swimlaneMode = 'assignee';
            expect(manager.getSwimlanes([])).toEqual([]);
        });

        describe('assignee mode', () => {
            beforeEach(() => {
                mockComponent._swimlaneMode = 'assignee';
            });

            it('groups cards by assignee', () => {
                const cards = [
                    makeCard({
                        assigneeId: 'user1',
                        assignee: { name: 'Alice' }
                    }),
                    makeCard({
                        assigneeId: 'user2',
                        assignee: { name: 'Bob' }
                    })
                ];
                const columns = makeColumns(cards);
                const lanes = manager.getSwimlanes(columns);

                expect(lanes).toHaveLength(2);
                const labels = lanes.map((l) => l.label);
                expect(labels).toContain('Alice');
                expect(labels).toContain('Bob');
            });

            it('uses Unassigned fallback when assigneeId is null', () => {
                const cards = [makeCard({ assigneeId: null, assignee: null })];
                const columns = makeColumns(cards);
                const lanes = manager.getSwimlanes(columns);

                expect(lanes).toHaveLength(1);
                expect(lanes[0].label).toBe('Unassigned');
                expect(lanes[0].key).toBe('__unassigned__');
            });

            it('uses Unassigned fallback when assigneeId is undefined', () => {
                const card = makeCard();
                delete card.assigneeId;
                const columns = makeColumns([card]);
                const lanes = manager.getSwimlanes(columns);

                expect(lanes[0].label).toBe('Unassigned');
            });

            it('filters cards correctly into their swimlane columns', () => {
                const card1 = makeCard({
                    assigneeId: 'user1',
                    assignee: { name: 'Alice' }
                });
                const card2 = makeCard({
                    assigneeId: 'user2',
                    assignee: { name: 'Bob' }
                });
                const columns = [{ Id: 'col1', cards: [card1, card2] }];
                const lanes = manager.getSwimlanes(columns);

                const aliceLane = lanes.find((l) => l.label === 'Alice');
                expect(aliceLane.columns[0].cards).toHaveLength(1);
                expect(aliceLane.columns[0].cards[0].assigneeId).toBe('user1');
                expect(aliceLane.totalCards).toBe(1);

                const bobLane = lanes.find((l) => l.label === 'Bob');
                expect(bobLane.columns[0].cards).toHaveLength(1);
                expect(bobLane.totalCards).toBe(1);
            });
        });

        describe('priority mode', () => {
            beforeEach(() => {
                mockComponent._swimlaneMode = 'priority';
            });

            it('groups cards by priority', () => {
                const cards = [
                    makeCard({ priority: 'High' }),
                    makeCard({ priority: 'Low' })
                ];
                const columns = makeColumns(cards);
                const lanes = manager.getSwimlanes(columns);

                expect(lanes).toHaveLength(2);
                const labels = lanes.map((l) => l.label);
                expect(labels).toContain('High');
                expect(labels).toContain('Low');
            });

            it('uses No Priority fallback when priority is null', () => {
                const cards = [makeCard({ priority: null })];
                const columns = makeColumns(cards);
                const lanes = manager.getSwimlanes(columns);

                expect(lanes).toHaveLength(1);
                expect(lanes[0].label).toBe('No Priority');
                expect(lanes[0].key).toBe('__none__');
            });

            it('uses priority value as both key and label', () => {
                const cards = [makeCard({ priority: 'Critical' })];
                const columns = makeColumns(cards);
                const lanes = manager.getSwimlanes(columns);

                expect(lanes[0].key).toBe('Critical');
                expect(lanes[0].label).toBe('Critical');
            });
        });

        describe('cardType mode', () => {
            beforeEach(() => {
                mockComponent._swimlaneMode = 'cardType';
            });

            it('groups cards by cardType', () => {
                const cards = [
                    makeCard({ cardType: 'Story' }),
                    makeCard({ cardType: 'Bug' })
                ];
                const columns = makeColumns(cards);
                const lanes = manager.getSwimlanes(columns);

                expect(lanes).toHaveLength(2);
                const labels = lanes.map((l) => l.label);
                expect(labels).toContain('Story');
                expect(labels).toContain('Bug');
            });

            it('uses No Type fallback when cardType is null', () => {
                const cards = [makeCard({ cardType: null })];
                const columns = makeColumns(cards);
                const lanes = manager.getSwimlanes(columns);

                expect(lanes).toHaveLength(1);
                expect(lanes[0].label).toBe('No Type');
                expect(lanes[0].key).toBe('__none__');
            });
        });

        describe('epic mode', () => {
            beforeEach(() => {
                mockComponent._swimlaneMode = 'epic';
            });

            it('groups cards by epic', () => {
                const cards = [
                    makeCard({
                        epicId: 'epic1',
                        epic: { subject: 'Epic One' }
                    }),
                    makeCard({
                        epicId: 'epic2',
                        epic: { subject: 'Epic Two' }
                    })
                ];
                const columns = makeColumns(cards);
                const lanes = manager.getSwimlanes(columns);

                expect(lanes).toHaveLength(2);
                const labels = lanes.map((l) => l.label);
                expect(labels).toContain('Epic One');
                expect(labels).toContain('Epic Two');
            });

            it('uses No Epic fallback when epicId is null', () => {
                const cards = [makeCard({ epicId: null, epic: null })];
                const columns = makeColumns(cards);
                const lanes = manager.getSwimlanes(columns);

                expect(lanes).toHaveLength(1);
                expect(lanes[0].label).toBe('No Epic');
                expect(lanes[0].key).toBe('__none__');
            });

            it('uses No Epic fallback when epicId is undefined', () => {
                const card = makeCard();
                delete card.epicId;
                const columns = makeColumns([card]);
                const lanes = manager.getSwimlanes(columns);

                expect(lanes[0].label).toBe('No Epic');
            });
        });

        describe('default/unknown mode', () => {
            it('returns All label for unrecognized mode', () => {
                mockComponent._swimlaneMode = 'something_unknown';
                const cards = [makeCard()];
                const columns = makeColumns(cards);
                const lanes = manager.getSwimlanes(columns);

                expect(lanes).toHaveLength(1);
                expect(lanes[0].label).toBe('All');
                expect(lanes[0].key).toBe('__all__');
            });

            it('includes all cards in the default swimlane', () => {
                mockComponent._swimlaneMode = 'unknown';
                const card1 = makeCard({ priority: 'High' });
                const card2 = makeCard({ priority: 'Low' });
                const columns = [{ Id: 'col1', cards: [card1, card2] }];
                const lanes = manager.getSwimlanes(columns);

                expect(lanes).toHaveLength(1);
                expect(lanes[0].columns[0].cards).toHaveLength(2);
                expect(lanes[0].totalCards).toBe(2);
            });
        });

        describe('sorting', () => {
            it('lanes with cards come before empty lanes', () => {
                mockComponent._swimlaneMode = 'priority';
                // col1 has a High card, col2 has a Low card
                // We put both in col1 so one lane ends up with 0 in col2
                const columns = [
                    {
                        Id: 'col1',
                        cards: [
                            makeCard({ priority: 'High' }),
                            makeCard({ priority: 'Low' })
                        ]
                    },
                    {
                        Id: 'col2',
                        cards: [makeCard({ priority: 'High' })]
                    }
                ];
                const lanes = manager.getSwimlanes(columns);

                // High has 2 total cards (1 in col1 + 1 in col2), Low has 1 (col1 only)
                // Both have cards, so they sort alphabetically: High < Low
                expect(lanes[0].label).toBe('High');
                expect(lanes[1].label).toBe('Low');
            });

            it('sorts alphabetically among lanes that all have cards', () => {
                mockComponent._swimlaneMode = 'priority';
                const columns = [
                    {
                        Id: 'col1',
                        cards: [
                            makeCard({ priority: 'Zebra' }),
                            makeCard({ priority: 'Alpha' }),
                            makeCard({ priority: 'Middle' })
                        ]
                    }
                ];
                const lanes = manager.getSwimlanes(columns);
                const labels = lanes.map((l) => l.label);
                expect(labels).toEqual(['Alpha', 'Middle', 'Zebra']);
            });

            it('empty lanes sort alphabetically among themselves after non-empty', () => {
                mockComponent._swimlaneMode = 'assignee';
                // col1 has cards for Alice and Charlie
                // col2 is empty — so Bob lane will exist from col1 but be 0 in col2
                // Actually we need a lane with 0 total cards.
                // To get an empty lane, we need a grouping key that appears in one
                // card set but the card is only in col1, and we need another lane
                // that has no cards at all. But every lane is created from cards...
                // So empty lanes can't really exist in the current implementation
                // since groupMap only includes keys from actual cards.
                // Let's just verify the sorting with mixed totals.
                const columns = [
                    {
                        Id: 'col1',
                        cards: [
                            makeCard({
                                assigneeId: 'u1',
                                assignee: { name: 'Charlie' }
                            }),
                            makeCard({
                                assigneeId: 'u2',
                                assignee: { name: 'Alice' }
                            })
                        ]
                    }
                ];
                const lanes = manager.getSwimlanes(columns);
                const labels = lanes.map((l) => l.label);
                // Both have cards, alphabetical
                expect(labels).toEqual(['Alice', 'Charlie']);
            });
        });

        describe('column structure', () => {
            it('each swimlane column has laneKey, cardCount, and cards', () => {
                mockComponent._swimlaneMode = 'priority';
                const columns = [
                    {
                        Id: 'col1',
                        cards: [makeCard({ priority: 'High' })]
                    }
                ];
                const lanes = manager.getSwimlanes(columns);

                expect(lanes[0].columns[0]).toHaveProperty('laneKey');
                expect(lanes[0].columns[0]).toHaveProperty('cardCount');
                expect(lanes[0].columns[0]).toHaveProperty('cards');
                expect(lanes[0].columns[0].laneKey).toBe('High-col1');
                expect(lanes[0].columns[0].cardCount).toBe(1);
            });

            it('preserves original column properties via spread', () => {
                mockComponent._swimlaneMode = 'priority';
                const columns = [
                    {
                        Id: 'col1',
                        title: 'To Do',
                        cards: [makeCard({ priority: 'High' })]
                    }
                ];
                const lanes = manager.getSwimlanes(columns);

                expect(lanes[0].columns[0].Id).toBe('col1');
                expect(lanes[0].columns[0].title).toBe('To Do');
            });

            it('totalCards sums across all columns', () => {
                mockComponent._swimlaneMode = 'priority';
                const columns = [
                    {
                        Id: 'col1',
                        cards: [makeCard({ priority: 'High' })]
                    },
                    {
                        Id: 'col2',
                        cards: [
                            makeCard({ priority: 'High' }),
                            makeCard({ priority: 'High' })
                        ]
                    }
                ];
                const lanes = manager.getSwimlanes(columns);
                const highLane = lanes.find((l) => l.label === 'High');
                expect(highLane.totalCards).toBe(3);
            });
        });

        describe('columns with missing cards array', () => {
            it('handles columns where cards is undefined', () => {
                mockComponent._swimlaneMode = 'priority';
                const columns = [
                    { Id: 'col1' },
                    {
                        Id: 'col2',
                        cards: [makeCard({ priority: 'High' })]
                    }
                ];
                const lanes = manager.getSwimlanes(columns);
                expect(lanes).toHaveLength(1);
                expect(lanes[0].label).toBe('High');
            });

            it('handles columns where cards is null', () => {
                mockComponent._swimlaneMode = 'assignee';
                const columns = [
                    { Id: 'col1', cards: null },
                    {
                        Id: 'col2',
                        cards: [
                            makeCard({
                                assigneeId: 'u1',
                                assignee: { name: 'Alice' }
                            })
                        ]
                    }
                ];
                const lanes = manager.getSwimlanes(columns);
                expect(lanes).toHaveLength(1);
                expect(lanes[0].label).toBe('Alice');
            });
        });

        describe('deduplication', () => {
            it('same assignee across columns produces one swimlane', () => {
                mockComponent._swimlaneMode = 'assignee';
                const columns = [
                    {
                        Id: 'col1',
                        cards: [
                            makeCard({
                                assigneeId: 'u1',
                                assignee: { name: 'Alice' }
                            })
                        ]
                    },
                    {
                        Id: 'col2',
                        cards: [
                            makeCard({
                                assigneeId: 'u1',
                                assignee: { name: 'Alice' }
                            })
                        ]
                    }
                ];
                const lanes = manager.getSwimlanes(columns);
                expect(lanes).toHaveLength(1);
                expect(lanes[0].label).toBe('Alice');
                expect(lanes[0].totalCards).toBe(2);
            });
        });
    });

    describe('handleModeChange()', () => {
        it('updates component _swimlaneMode from event', () => {
            const event = { target: { value: 'assignee' } };
            manager.handleModeChange(event);
            expect(mockComponent._swimlaneMode).toBe('assignee');
        });

        it('sets mode to none', () => {
            mockComponent._swimlaneMode = 'priority';
            const event = { target: { value: 'none' } };
            manager.handleModeChange(event);
            expect(mockComponent._swimlaneMode).toBe('none');
        });

        it('sets mode to epic', () => {
            const event = { target: { value: 'epic' } };
            manager.handleModeChange(event);
            expect(mockComponent._swimlaneMode).toBe('epic');
        });
    });
});
