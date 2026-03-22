import { createElement } from '@lwc/engine-dom';

// ─── Mock: Apex methods ─────────────────────────────────────────────
jest.mock(
    '@salesforce/apex/RoadmapController.getRoadmapItems',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/RoadmapController.getAvailableEpics',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/RoadmapController.createRoadmapItem',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/RoadmapController.updateRoadmapItem',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/RoadmapController.deleteRoadmapItem',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/RoadmapController.moveRoadmapItem',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

// ─── Import component under test ────────────────────────────────────
import RoadmapBoard from 'c/roadmapBoard';

// Access non-@api methods via prototype
const proto = RoadmapBoard.prototype;

// ─── Import mocked Apex methods ─────────────────────────────────────
import getRoadmapItems from '@salesforce/apex/RoadmapController.getRoadmapItems';
import getAvailableEpics from '@salesforce/apex/RoadmapController.getAvailableEpics';
import createRoadmapItem from '@salesforce/apex/RoadmapController.createRoadmapItem';
import updateRoadmapItem from '@salesforce/apex/RoadmapController.updateRoadmapItem';
import deleteRoadmapItem from '@salesforce/apex/RoadmapController.deleteRoadmapItem';
import moveRoadmapItem from '@salesforce/apex/RoadmapController.moveRoadmapItem';

// ─── Test Data ──────────────────────────────────────────────────────
const MOCK_ITEMS = [
    {
        Id: 'item001',
        boardId: 'board001',
        cardId: 'card001',
        epicSubject: 'Auth Redesign',
        epicDescription: 'Redesign the authentication flow for better UX',
        epicStatus: 'In Progress',
        epicPriority: 'High',
        epicStoryPoints: 13,
        epicColor: '#FF5733',
        epicChildCount: 5,
        epicAssigneeName: 'Jane Doe',
        horizon: 'Now',
        quarter: null,
        year: null,
        startDate: '2026-03-01',
        targetDate: '2026-04-15',
        position: '0|hzzzzz:',
        status: 'On Track'
    },
    {
        Id: 'item002',
        boardId: 'board001',
        cardId: 'card002',
        epicSubject: 'API v3',
        epicDescription: null,
        epicStatus: 'To Do',
        epicPriority: 'Medium',
        epicStoryPoints: 21,
        epicColor: null,
        epicChildCount: 0,
        epicAssigneeName: null,
        horizon: 'Next',
        quarter: null,
        year: null,
        startDate: null,
        targetDate: '2026-06-01',
        position: '0|i00007:',
        status: 'At Risk'
    },
    {
        Id: 'item003',
        boardId: 'board001',
        cardId: 'card003',
        epicSubject: 'Mobile Polish',
        epicDescription: 'A'.repeat(200),
        epicStatus: 'To Do',
        epicPriority: 'Low',
        epicStoryPoints: 8,
        epicColor: '#00FF00',
        epicChildCount: 3,
        epicAssigneeName: 'Bob',
        horizon: 'Now',
        quarter: null,
        year: null,
        startDate: '2026-03-10',
        targetDate: null,
        position: '0|i0000f:',
        status: 'Complete'
    }
];

const MOCK_QUARTERLY_ITEMS = [
    {
        Id: 'item010',
        boardId: 'board001',
        cardId: 'card010',
        epicSubject: 'Q2 Feature',
        epicDescription: 'A quarterly feature',
        horizon: null,
        quarter: 'Q2',
        year: 2026,
        startDate: '2026-04-01',
        targetDate: '2026-06-30',
        position: '0|hzzzzz:',
        status: 'On Track',
        epicColor: '#1B96FF'
    }
];

const MOCK_EPICS = [
    { Id: 'card004', subject: 'Analytics Dashboard', status: 'To Do' },
    { Id: 'card005', subject: 'Notification System', status: 'To Do' }
];

// ─── Helpers ────────────────────────────────────────────────────────
function createMockInstance(overrides = {}) {
    const ctx = {
        recordId: 'board001',
        _viewMode: 'horizon',
        _selectedYear: 2026,
        _items: [],
        _availableEpics: [],
        _isLoading: false,
        _showAddModal: false,
        _showEditModal: false,
        _dragItemId: null,
        _selectedEpicId: '',
        _selectedHorizon: 'Now',
        _selectedQuarter: 'Q1',
        _addStartDate: null,
        _addTargetDate: null,
        _editItemId: null,
        _editStatus: 'On Track',
        _editStartDate: null,
        _editTargetDate: null,
        ...overrides
    };
    // Bind prototype getters so this.isHorizonView etc. work
    Object.defineProperty(ctx, 'isHorizonView', {
        get() {
            return this._viewMode === 'horizon';
        },
        configurable: true
    });
    Object.defineProperty(ctx, 'isQuarterView', {
        get() {
            return this._viewMode === 'quarter';
        },
        configurable: true
    });
    return ctx;
}

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

function createComponent(boardId = 'board001') {
    const element = createElement('c-roadmap-board', { is: RoadmapBoard });
    element.recordId = boardId;
    document.body.appendChild(element);
    return element;
}

// ─── Tests ──────────────────────────────────────────────────────────
describe('c-roadmap-board', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    // =========================================================================
    // connectedCallback / Data Loading
    // =========================================================================

    describe('initialization', () => {
        it('should load roadmap items on connected callback', async () => {
            getRoadmapItems.mockResolvedValue(MOCK_ITEMS);
            createComponent();
            await flushPromises();

            expect(getRoadmapItems).toHaveBeenCalledWith({
                boardId: 'board001'
            });
        });

        it('should not load data when recordId is missing', async () => {
            const element = createElement('c-roadmap-board', {
                is: RoadmapBoard
            });
            document.body.appendChild(element);
            await flushPromises();

            expect(getRoadmapItems).not.toHaveBeenCalled();
        });

        it('should handle load error gracefully', async () => {
            getRoadmapItems.mockRejectedValue(new Error('Network error'));
            const element = createComponent();
            await flushPromises();

            expect(element).toBeTruthy();
        });
    });

    // =========================================================================
    // Prototype-level getter tests
    // =========================================================================

    describe('getters via prototype', () => {
        it('isLoading and isLoaded', () => {
            const ctx = createMockInstance({ _isLoading: true });
            const isLoadingDesc = Object.getOwnPropertyDescriptor(
                proto,
                'isLoading'
            );
            const isLoadedDesc = Object.getOwnPropertyDescriptor(
                proto,
                'isLoaded'
            );
            expect(isLoadingDesc.get.call(ctx)).toBe(true);
            expect(isLoadedDesc.get.call(ctx)).toBe(false);

            ctx._isLoading = false;
            expect(isLoadingDesc.get.call(ctx)).toBe(false);
            expect(isLoadedDesc.get.call(ctx)).toBe(true);
        });

        it('isHorizonView and isQuarterView', () => {
            const ctx = createMockInstance({ _viewMode: 'horizon' });
            const isHorizon = Object.getOwnPropertyDescriptor(
                proto,
                'isHorizonView'
            );
            const isQuarter = Object.getOwnPropertyDescriptor(
                proto,
                'isQuarterView'
            );

            expect(isHorizon.get.call(ctx)).toBe(true);
            expect(isQuarter.get.call(ctx)).toBe(false);

            ctx._viewMode = 'quarter';
            expect(isHorizon.get.call(ctx)).toBe(false);
            expect(isQuarter.get.call(ctx)).toBe(true);
        });

        it('selectedYear', () => {
            const ctx = createMockInstance({ _selectedYear: 2027 });
            const desc = Object.getOwnPropertyDescriptor(proto, 'selectedYear');
            expect(desc.get.call(ctx)).toBe(2027);
        });

        it('showAddModal and showEditModal', () => {
            const ctx = createMockInstance({
                _showAddModal: true,
                _showEditModal: false
            });
            const addDesc = Object.getOwnPropertyDescriptor(
                proto,
                'showAddModal'
            );
            const editDesc = Object.getOwnPropertyDescriptor(
                proto,
                'showEditModal'
            );
            expect(addDesc.get.call(ctx)).toBe(true);
            expect(editDesc.get.call(ctx)).toBe(false);
        });

        it('hasAvailableEpics and availableEpics', () => {
            const ctx = createMockInstance({
                _availableEpics: MOCK_EPICS
            });
            const hasDesc = Object.getOwnPropertyDescriptor(
                proto,
                'hasAvailableEpics'
            );
            const listDesc = Object.getOwnPropertyDescriptor(
                proto,
                'availableEpics'
            );
            expect(hasDesc.get.call(ctx)).toBe(true);
            expect(listDesc.get.call(ctx)).toHaveLength(2);

            ctx._availableEpics = [];
            expect(hasDesc.get.call(ctx)).toBe(false);
        });

        it('isAddDisabled', () => {
            const ctx = createMockInstance({ _selectedEpicId: '' });
            const desc = Object.getOwnPropertyDescriptor(
                proto,
                'isAddDisabled'
            );
            expect(desc.get.call(ctx)).toBe(true);
            ctx._selectedEpicId = 'card004';
            expect(desc.get.call(ctx)).toBe(false);
        });

        it('editItemStatus, editItemStartDate, editItemTargetDate', () => {
            const ctx = createMockInstance({
                _editStatus: 'At Risk',
                _editStartDate: '2026-04-01',
                _editTargetDate: '2026-05-15'
            });
            const statusDesc = Object.getOwnPropertyDescriptor(
                proto,
                'editItemStatus'
            );
            const startDesc = Object.getOwnPropertyDescriptor(
                proto,
                'editItemStartDate'
            );
            const targetDesc = Object.getOwnPropertyDescriptor(
                proto,
                'editItemTargetDate'
            );
            expect(statusDesc.get.call(ctx)).toBe('At Risk');
            expect(startDesc.get.call(ctx)).toBe('2026-04-01');
            expect(targetDesc.get.call(ctx)).toBe('2026-05-15');
        });

        it('horizonButtonClass and quarterButtonClass', () => {
            const ctx = createMockInstance({ _viewMode: 'horizon' });
            const hDesc = Object.getOwnPropertyDescriptor(
                proto,
                'horizonButtonClass'
            );
            const qDesc = Object.getOwnPropertyDescriptor(
                proto,
                'quarterButtonClass'
            );
            expect(hDesc.get.call(ctx)).toContain('active');
            expect(qDesc.get.call(ctx)).not.toContain('active');

            ctx._viewMode = 'quarter';
            expect(hDesc.get.call(ctx)).not.toContain('active');
            expect(qDesc.get.call(ctx)).toContain('active');
        });
    });

    // =========================================================================
    // Horizon lanes
    // =========================================================================

    describe('horizonLanes getter', () => {
        it('should group items by horizon', () => {
            const ctx = createMockInstance({ _items: MOCK_ITEMS });
            // Bind helper methods
            ctx._enrichItem = proto._enrichItem.bind(ctx);
            ctx._formatDate = proto._formatDate.bind(ctx);

            const desc = Object.getOwnPropertyDescriptor(proto, 'horizonLanes');
            const lanes = desc.get.call(ctx);

            expect(lanes).toHaveLength(3);
            expect(lanes[0].key).toBe('Now');
            expect(lanes[0].items).toHaveLength(2);
            expect(lanes[0].isEmpty).toBe(false);
            expect(lanes[1].key).toBe('Next');
            expect(lanes[1].items).toHaveLength(1);
            expect(lanes[2].key).toBe('Future');
            expect(lanes[2].items).toHaveLength(0);
            expect(lanes[2].isEmpty).toBe(true);
        });
    });

    // =========================================================================
    // Quarter lanes
    // =========================================================================

    describe('quarterLanes getter', () => {
        it('should group items by quarter and year', () => {
            const ctx = createMockInstance({
                _items: MOCK_QUARTERLY_ITEMS,
                _selectedYear: 2026
            });
            ctx._enrichItem = proto._enrichItem.bind(ctx);
            ctx._formatDate = proto._formatDate.bind(ctx);

            const desc = Object.getOwnPropertyDescriptor(proto, 'quarterLanes');
            const lanes = desc.get.call(ctx);

            expect(lanes).toHaveLength(4);
            const q2Lane = lanes.find((l) => l.key === 'Q2');
            expect(q2Lane.items).toHaveLength(1);
            expect(q2Lane.items[0].epicSubject).toBe('Q2 Feature');
        });

        it('should filter by selected year', () => {
            const ctx = createMockInstance({
                _items: MOCK_QUARTERLY_ITEMS,
                _selectedYear: 2027
            });
            ctx._enrichItem = proto._enrichItem.bind(ctx);
            ctx._formatDate = proto._formatDate.bind(ctx);

            const desc = Object.getOwnPropertyDescriptor(proto, 'quarterLanes');
            const lanes = desc.get.call(ctx);
            const q2Lane = lanes.find((l) => l.key === 'Q2');
            expect(q2Lane.items).toHaveLength(0);
        });

        it('should include items with null year', () => {
            const items = [
                {
                    ...MOCK_QUARTERLY_ITEMS[0],
                    year: null
                }
            ];
            const ctx = createMockInstance({
                _items: items,
                _selectedYear: 2099
            });
            ctx._enrichItem = proto._enrichItem.bind(ctx);
            ctx._formatDate = proto._formatDate.bind(ctx);

            const desc = Object.getOwnPropertyDescriptor(proto, 'quarterLanes');
            const lanes = desc.get.call(ctx);
            const q2Lane = lanes.find((l) => l.key === 'Q2');
            expect(q2Lane.items).toHaveLength(1);
        });
    });

    // =========================================================================
    // _enrichItem
    // =========================================================================

    describe('_enrichItem', () => {
        let ctx;
        beforeEach(() => {
            ctx = createMockInstance();
            ctx._formatDate = proto._formatDate.bind(ctx);
        });

        it('should add computed properties', () => {
            const result = proto._enrichItem.call(ctx, MOCK_ITEMS[0]);
            expect(result.colorStyle).toBe('background-color: #FF5733');
            expect(result.statusBadgeClass).toContain('on-track');
            expect(result.hasDates).toBeTruthy();
            expect(result.dateRange).toContain('-');
        });

        it('should use default color when epicColor is null', () => {
            const result = proto._enrichItem.call(ctx, MOCK_ITEMS[1]);
            expect(result.colorStyle).toBe('background-color: #1B96FF');
        });

        it('should truncate long descriptions', () => {
            const result = proto._enrichItem.call(ctx, MOCK_ITEMS[2]);
            expect(result.epicDescriptionTruncated.length).toBeLessThan(200);
            expect(result.epicDescriptionTruncated).toMatch(/\.\.\.$/);
        });

        it('should handle null description', () => {
            const result = proto._enrichItem.call(ctx, MOCK_ITEMS[1]);
            expect(result.epicDescriptionTruncated).toBe('');
        });

        it('should format start-only date range', () => {
            const result = proto._enrichItem.call(ctx, MOCK_ITEMS[2]);
            expect(result.dateRange).toMatch(/^From /);
        });

        it('should format target-only date range', () => {
            const result = proto._enrichItem.call(ctx, MOCK_ITEMS[1]);
            expect(result.dateRange).toMatch(/^By /);
        });

        it('should handle At Risk status badge', () => {
            const result = proto._enrichItem.call(ctx, MOCK_ITEMS[1]);
            expect(result.statusBadgeClass).toContain('at-risk');
        });

        it('should handle Complete status badge', () => {
            const result = proto._enrichItem.call(ctx, MOCK_ITEMS[2]);
            expect(result.statusBadgeClass).toContain('complete');
        });

        it('should handle unknown status', () => {
            const item = { ...MOCK_ITEMS[0], status: 'Unknown' };
            const result = proto._enrichItem.call(ctx, item);
            expect(result.statusBadgeClass).toBe('status-badge');
        });

        it('should set hasDates false when no dates', () => {
            const item = {
                ...MOCK_ITEMS[0],
                startDate: null,
                targetDate: null
            };
            const result = proto._enrichItem.call(ctx, item);
            expect(result.hasDates).toBeFalsy();
            expect(result.dateRange).toBe('');
        });

        it('should handle Off Track status in card class', () => {
            const item = { ...MOCK_ITEMS[0], status: 'Off Track' };
            const result = proto._enrichItem.call(ctx, item);
            expect(result.cardClass).toContain('off-track');
        });

        it('should handle null status in card class', () => {
            const item = { ...MOCK_ITEMS[0], status: null };
            const result = proto._enrichItem.call(ctx, item);
            expect(result.cardClass).toContain('on-track');
        });
    });

    // =========================================================================
    // _formatDate
    // =========================================================================

    describe('_formatDate', () => {
        it('should format a date string', () => {
            const result = proto._formatDate.call({}, '2026-03-22');
            expect(result).toMatch(/Mar/);
            expect(result).toMatch(/22/);
        });

        it('should return empty string for null', () => {
            expect(proto._formatDate.call({}, null)).toBe('');
            expect(proto._formatDate.call({}, '')).toBe('');
        });
    });

    // =========================================================================
    // Event handlers
    // =========================================================================

    describe('handleViewToggle', () => {
        it('should switch view mode', () => {
            const ctx = createMockInstance({ _viewMode: 'horizon' });
            proto.handleViewToggle.call(ctx, {
                currentTarget: { dataset: { view: 'quarter' } }
            });
            expect(ctx._viewMode).toBe('quarter');
        });
    });

    describe('year navigation', () => {
        it('handlePreviousYear decrements', () => {
            const ctx = createMockInstance({ _selectedYear: 2026 });
            proto.handlePreviousYear.call(ctx);
            expect(ctx._selectedYear).toBe(2025);
        });

        it('handleNextYear increments', () => {
            const ctx = createMockInstance({ _selectedYear: 2026 });
            proto.handleNextYear.call(ctx);
            expect(ctx._selectedYear).toBe(2027);
        });
    });

    // =========================================================================
    // Add modal handlers
    // =========================================================================

    describe('add modal', () => {
        it('handleOpenAddModal should set state and load epics', async () => {
            getAvailableEpics.mockResolvedValue(MOCK_EPICS);
            const ctx = createMockInstance();
            await proto.handleOpenAddModal.call(ctx);

            expect(ctx._showAddModal).toBe(true);
            expect(ctx._selectedEpicId).toBe('');
            expect(getAvailableEpics).toHaveBeenCalledWith({
                boardId: 'board001'
            });
            expect(ctx._availableEpics).toEqual(MOCK_EPICS);
        });

        it('handleOpenAddModal should handle error', async () => {
            getAvailableEpics.mockRejectedValue(new Error('fail'));
            const ctx = createMockInstance();
            await proto.handleOpenAddModal.call(ctx);
            expect(ctx._availableEpics).toEqual([]);
        });

        it('handleCloseAddModal should close modal', () => {
            const ctx = createMockInstance({ _showAddModal: true });
            proto.handleCloseAddModal.call(ctx);
            expect(ctx._showAddModal).toBe(false);
        });

        it('handleEpicSelect should set selected epic', () => {
            const ctx = createMockInstance();
            proto.handleEpicSelect.call(ctx, {
                target: { value: 'card004' }
            });
            expect(ctx._selectedEpicId).toBe('card004');
        });

        it('handleHorizonSelect should set horizon', () => {
            const ctx = createMockInstance();
            proto.handleHorizonSelect.call(ctx, {
                target: { value: 'Future' }
            });
            expect(ctx._selectedHorizon).toBe('Future');
        });

        it('handleQuarterSelect should set quarter', () => {
            const ctx = createMockInstance();
            proto.handleQuarterSelect.call(ctx, {
                target: { value: 'Q3' }
            });
            expect(ctx._selectedQuarter).toBe('Q3');
        });

        it('handleStartDateChange should set date', () => {
            const ctx = createMockInstance();
            proto.handleStartDateChange.call(ctx, {
                target: { value: '2026-04-01' }
            });
            expect(ctx._addStartDate).toBe('2026-04-01');
        });

        it('handleStartDateChange should handle empty', () => {
            const ctx = createMockInstance();
            proto.handleStartDateChange.call(ctx, {
                target: { value: '' }
            });
            expect(ctx._addStartDate).toBeNull();
        });

        it('handleTargetDateChange should set date', () => {
            const ctx = createMockInstance();
            proto.handleTargetDateChange.call(ctx, {
                target: { value: '2026-05-01' }
            });
            expect(ctx._addTargetDate).toBe('2026-05-01');
        });

        it('handleTargetDateChange should handle empty', () => {
            const ctx = createMockInstance();
            proto.handleTargetDateChange.call(ctx, {
                target: { value: '' }
            });
            expect(ctx._addTargetDate).toBeNull();
        });
    });

    // =========================================================================
    // handleAddEpic
    // =========================================================================

    describe('handleAddEpic', () => {
        it('should create roadmap item in horizon view', async () => {
            createRoadmapItem.mockResolvedValue({ Id: 'newItem' });
            getRoadmapItems.mockResolvedValue([]);
            const ctx = createMockInstance({
                _selectedEpicId: 'card004',
                _selectedHorizon: 'Next',
                _addStartDate: '2026-04-01',
                _addTargetDate: '2026-05-01',
                _viewMode: 'horizon'
            });
            // Bind _loadData
            ctx._loadData = proto._loadData.bind(ctx);

            await proto.handleAddEpic.call(ctx);

            expect(createRoadmapItem).toHaveBeenCalledWith({
                boardId: 'board001',
                cardId: 'card004',
                horizon: 'Next',
                quarter: null,
                year: null,
                startDate: '2026-04-01',
                targetDate: '2026-05-01',
                previousPosition: null,
                nextPosition: null
            });
            expect(ctx._showAddModal).toBe(false);
        });

        it('should create roadmap item in quarter view', async () => {
            createRoadmapItem.mockResolvedValue({ Id: 'newItem' });
            getRoadmapItems.mockResolvedValue([]);
            const ctx = createMockInstance({
                _selectedEpicId: 'card005',
                _selectedQuarter: 'Q3',
                _selectedYear: 2026,
                _viewMode: 'quarter'
            });
            ctx._loadData = proto._loadData.bind(ctx);

            await proto.handleAddEpic.call(ctx);

            expect(createRoadmapItem).toHaveBeenCalledWith(
                expect.objectContaining({
                    horizon: null,
                    quarter: 'Q3',
                    year: 2026
                })
            );
        });

        it('should not create when no epic selected', async () => {
            const ctx = createMockInstance({ _selectedEpicId: '' });
            await proto.handleAddEpic.call(ctx);
            expect(createRoadmapItem).not.toHaveBeenCalled();
        });

        it('should handle create error gracefully', async () => {
            createRoadmapItem.mockRejectedValue(new Error('fail'));
            const ctx = createMockInstance({ _selectedEpicId: 'card004' });
            await proto.handleAddEpic.call(ctx);
            // Should not throw
            expect(ctx).toBeTruthy();
        });
    });

    // =========================================================================
    // Edit modal handlers
    // =========================================================================

    describe('edit modal', () => {
        it('handleEditItem should populate edit state', () => {
            const ctx = createMockInstance({ _items: MOCK_ITEMS });
            proto.handleEditItem.call(ctx, {
                currentTarget: { dataset: { id: 'item001' } }
            });
            expect(ctx._editItemId).toBe('item001');
            expect(ctx._editStatus).toBe('On Track');
            expect(ctx._editStartDate).toBe('2026-03-01');
            expect(ctx._editTargetDate).toBe('2026-04-15');
            expect(ctx._showEditModal).toBe(true);
        });

        it('handleEditItem should bail on unknown item', () => {
            const ctx = createMockInstance({ _items: MOCK_ITEMS });
            proto.handleEditItem.call(ctx, {
                currentTarget: { dataset: { id: 'nonexistent' } }
            });
            expect(ctx._showEditModal).toBeFalsy();
        });

        it('handleEditItem should handle null status/dates', () => {
            const items = [
                {
                    ...MOCK_ITEMS[0],
                    status: null,
                    startDate: null,
                    targetDate: null
                }
            ];
            const ctx = createMockInstance({ _items: items });
            proto.handleEditItem.call(ctx, {
                currentTarget: { dataset: { id: 'item001' } }
            });
            expect(ctx._editStatus).toBe('On Track');
            expect(ctx._editStartDate).toBeNull();
            expect(ctx._editTargetDate).toBeNull();
        });

        it('handleCloseEditModal should reset state', () => {
            const ctx = createMockInstance({
                _showEditModal: true,
                _editItemId: 'item001'
            });
            proto.handleCloseEditModal.call(ctx);
            expect(ctx._showEditModal).toBe(false);
            expect(ctx._editItemId).toBeNull();
        });

        it('handleEditStatusChange should set status', () => {
            const ctx = createMockInstance();
            proto.handleEditStatusChange.call(ctx, {
                target: { value: 'Off Track' }
            });
            expect(ctx._editStatus).toBe('Off Track');
        });

        it('handleEditStartDateChange should set date', () => {
            const ctx = createMockInstance();
            proto.handleEditStartDateChange.call(ctx, {
                target: { value: '2026-05-01' }
            });
            expect(ctx._editStartDate).toBe('2026-05-01');
        });

        it('handleEditStartDateChange should handle empty', () => {
            const ctx = createMockInstance();
            proto.handleEditStartDateChange.call(ctx, {
                target: { value: '' }
            });
            expect(ctx._editStartDate).toBeNull();
        });

        it('handleEditTargetDateChange should set date', () => {
            const ctx = createMockInstance();
            proto.handleEditTargetDateChange.call(ctx, {
                target: { value: '2026-06-01' }
            });
            expect(ctx._editTargetDate).toBe('2026-06-01');
        });

        it('handleEditTargetDateChange should handle empty', () => {
            const ctx = createMockInstance();
            proto.handleEditTargetDateChange.call(ctx, {
                target: { value: '' }
            });
            expect(ctx._editTargetDate).toBeNull();
        });
    });

    // =========================================================================
    // handleSaveEdit
    // =========================================================================

    describe('handleSaveEdit', () => {
        it('should update item with dates', async () => {
            updateRoadmapItem.mockResolvedValue({ Id: 'item001' });
            getRoadmapItems.mockResolvedValue([]);
            const ctx = createMockInstance({
                _editItemId: 'item001',
                _editStatus: 'At Risk',
                _editStartDate: '2026-03-15',
                _editTargetDate: '2026-04-30'
            });
            ctx._loadData = proto._loadData.bind(ctx);

            await proto.handleSaveEdit.call(ctx);

            expect(updateRoadmapItem).toHaveBeenCalledWith({
                itemId: 'item001',
                updates: {
                    status: 'At Risk',
                    startDate: '2026-03-15',
                    targetDate: '2026-04-30'
                }
            });
            expect(ctx._showEditModal).toBe(false);
            expect(ctx._editItemId).toBeNull();
        });

        it('should update item without dates when null', async () => {
            updateRoadmapItem.mockResolvedValue({ Id: 'item001' });
            getRoadmapItems.mockResolvedValue([]);
            const ctx = createMockInstance({
                _editItemId: 'item001',
                _editStatus: 'Complete',
                _editStartDate: null,
                _editTargetDate: null
            });
            ctx._loadData = proto._loadData.bind(ctx);

            await proto.handleSaveEdit.call(ctx);

            expect(updateRoadmapItem).toHaveBeenCalledWith({
                itemId: 'item001',
                updates: { status: 'Complete' }
            });
        });

        it('should not save when no edit item', async () => {
            const ctx = createMockInstance({ _editItemId: null });
            await proto.handleSaveEdit.call(ctx);
            expect(updateRoadmapItem).not.toHaveBeenCalled();
        });

        it('should handle save error gracefully', async () => {
            updateRoadmapItem.mockRejectedValue(new Error('fail'));
            const ctx = createMockInstance({ _editItemId: 'item001' });
            await proto.handleSaveEdit.call(ctx);
            expect(ctx).toBeTruthy();
        });
    });

    // =========================================================================
    // handleRemoveItem
    // =========================================================================

    describe('handleRemoveItem', () => {
        it('should delete and reload', async () => {
            deleteRoadmapItem.mockResolvedValue(undefined);
            getRoadmapItems.mockResolvedValue([]);
            const ctx = createMockInstance();
            ctx._loadData = proto._loadData.bind(ctx);

            await proto.handleRemoveItem.call(ctx, {
                currentTarget: { dataset: { id: 'item001' } }
            });

            expect(deleteRoadmapItem).toHaveBeenCalledWith({
                itemId: 'item001'
            });
        });

        it('should handle delete error gracefully', async () => {
            deleteRoadmapItem.mockRejectedValue(new Error('fail'));
            const ctx = createMockInstance();
            await proto.handleRemoveItem.call(ctx, {
                currentTarget: { dataset: { id: 'item001' } }
            });
            expect(ctx).toBeTruthy();
        });
    });

    // =========================================================================
    // Drag and Drop
    // =========================================================================

    describe('drag and drop', () => {
        it('handleDragStart should set drag item', () => {
            const ctx = createMockInstance();
            const mockEvent = {
                currentTarget: { dataset: { id: 'item001' } },
                dataTransfer: { effectAllowed: '' }
            };
            proto.handleDragStart.call(ctx, mockEvent);
            expect(ctx._dragItemId).toBe('item001');
            expect(mockEvent.dataTransfer.effectAllowed).toBe('move');
        });

        it('handleDragOver should prevent default', () => {
            const ctx = createMockInstance();
            const prevented = { called: false };
            proto.handleDragOver.call(ctx, {
                preventDefault: () => {
                    prevented.called = true;
                },
                dataTransfer: { dropEffect: '' }
            });
            expect(prevented.called).toBe(true);
        });

        it('handleDrop should move item in horizon view', async () => {
            moveRoadmapItem.mockResolvedValue({});
            getRoadmapItems.mockResolvedValue([]);
            const ctx = createMockInstance({
                _dragItemId: 'item001',
                _viewMode: 'horizon'
            });
            ctx._loadData = proto._loadData.bind(ctx);

            await proto.handleDrop.call(ctx, {
                preventDefault: () => {},
                currentTarget: { dataset: { lane: 'Future' } }
            });

            expect(moveRoadmapItem).toHaveBeenCalledWith({
                itemId: 'item001',
                horizon: 'Future',
                quarter: null,
                previousPosition: null,
                nextPosition: null
            });
            expect(ctx._dragItemId).toBeNull();
        });

        it('handleDrop should move item in quarter view', async () => {
            moveRoadmapItem.mockResolvedValue({});
            getRoadmapItems.mockResolvedValue([]);
            const ctx = createMockInstance({
                _dragItemId: 'item001',
                _viewMode: 'quarter'
            });
            ctx._loadData = proto._loadData.bind(ctx);

            await proto.handleDrop.call(ctx, {
                preventDefault: () => {},
                currentTarget: { dataset: { lane: 'Q3' } }
            });

            expect(moveRoadmapItem).toHaveBeenCalledWith({
                itemId: 'item001',
                horizon: null,
                quarter: 'Q3',
                previousPosition: null,
                nextPosition: null
            });
        });

        it('handleDrop should bail when no drag item', async () => {
            const ctx = createMockInstance({ _dragItemId: null });
            await proto.handleDrop.call(ctx, {
                preventDefault: () => {},
                currentTarget: { dataset: { lane: 'Now' } }
            });
            expect(moveRoadmapItem).not.toHaveBeenCalled();
        });

        it('handleDrop should bail when no lane', async () => {
            const ctx = createMockInstance({ _dragItemId: 'item001' });
            await proto.handleDrop.call(ctx, {
                preventDefault: () => {},
                currentTarget: { dataset: { lane: '' } }
            });
            expect(moveRoadmapItem).not.toHaveBeenCalled();
        });

        it('handleDrop should handle error and reset drag', async () => {
            moveRoadmapItem.mockRejectedValue(new Error('fail'));
            const ctx = createMockInstance({
                _dragItemId: 'item001',
                _viewMode: 'horizon'
            });
            await proto.handleDrop.call(ctx, {
                preventDefault: () => {},
                currentTarget: { dataset: { lane: 'Next' } }
            });
            expect(ctx._dragItemId).toBeNull();
        });
    });

    // =========================================================================
    // _loadData
    // =========================================================================

    describe('_loadData', () => {
        it('should load items and update state', async () => {
            getRoadmapItems.mockResolvedValue(MOCK_ITEMS);
            const ctx = createMockInstance({ _isLoading: false });

            await proto._loadData.call(ctx);

            expect(ctx._isLoading).toBe(false);
            expect(ctx._items).toEqual(MOCK_ITEMS);
        });

        it('should not call API when recordId is null', async () => {
            const ctx = createMockInstance({ recordId: null });
            await proto._loadData.call(ctx);
            expect(getRoadmapItems).not.toHaveBeenCalled();
        });

        it('should handle load error and reset items', async () => {
            getRoadmapItems.mockRejectedValue(new Error('fail'));
            const ctx = createMockInstance({ _items: MOCK_ITEMS });
            await proto._loadData.call(ctx);
            expect(ctx._items).toEqual([]);
            expect(ctx._isLoading).toBe(false);
        });
    });
});
