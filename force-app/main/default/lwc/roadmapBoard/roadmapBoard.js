import { LightningElement, api } from 'lwc';
import getRoadmapItems from '@salesforce/apex/RoadmapController.getRoadmapItems';
import getAvailableEpics from '@salesforce/apex/RoadmapController.getAvailableEpics';
import createRoadmapItem from '@salesforce/apex/RoadmapController.createRoadmapItem';
import updateRoadmapItem from '@salesforce/apex/RoadmapController.updateRoadmapItem';
import deleteRoadmapItem from '@salesforce/apex/RoadmapController.deleteRoadmapItem';
import moveRoadmapItem from '@salesforce/apex/RoadmapController.moveRoadmapItem';

/**
 * @typedef {Object} RoadmapItemDTO
 * @property {string} Id
 * @property {string} boardId
 * @property {string} cardId
 * @property {string} epicSubject
 * @property {string} [epicDescription]
 * @property {string} [epicStatus]
 * @property {string} [epicPriority]
 * @property {number} [epicStoryPoints]
 * @property {string} [epicColor]
 * @property {number} [epicChildCount]
 * @property {string} [epicAssigneeName]
 * @property {string} [horizon]
 * @property {string} [quarter]
 * @property {number} [year]
 * @property {string} [startDate]
 * @property {string} [targetDate]
 * @property {string} [position]
 * @property {string} status
 */

const HORIZON_CONFIG = [
    {
        key: 'Now',
        label: 'Now',
        description: 'Currently in progress',
        colorClass: 'lane-header lane-header--now'
    },
    {
        key: 'Next',
        label: 'Next',
        description: 'Coming up soon',
        colorClass: 'lane-header lane-header--next'
    },
    {
        key: 'Future',
        label: 'Future',
        description: 'Planned for later',
        colorClass: 'lane-header lane-header--future'
    }
];

const QUARTER_CONFIG = [
    { key: 'Q1', label: 'Q1 (Jan-Mar)' },
    { key: 'Q2', label: 'Q2 (Apr-Jun)' },
    { key: 'Q3', label: 'Q3 (Jul-Sep)' },
    { key: 'Q4', label: 'Q4 (Oct-Dec)' }
];

export default class RoadmapBoard extends LightningElement {
    @api recordId;

    _viewMode = 'horizon';
    _selectedYear = new Date().getFullYear();
    _items = [];
    _availableEpics = [];
    _isLoading = true;
    _showAddModal = false;
    _showEditModal = false;
    _dragItemId = null;

    // Add modal state
    _selectedEpicId = '';
    _selectedHorizon = 'Now';
    _selectedQuarter = 'Q1';
    _addStartDate = null;
    _addTargetDate = null;

    // Edit modal state
    _editItemId = null;
    _editStatus = 'On Track';
    _editStartDate = null;
    _editTargetDate = null;

    connectedCallback() {
        this._loadData();
    }

    async _loadData() {
        if (!this.recordId) return;
        this._isLoading = true;
        try {
            this._items = await getRoadmapItems({ boardId: this.recordId });
        } catch (e) {
            console.error('Error loading roadmap items', e);
            this._items = [];
        }
        this._isLoading = false;
    }

    // =========================================================================
    // Getters
    // =========================================================================

    get isLoading() {
        return this._isLoading;
    }
    get isLoaded() {
        return !this._isLoading;
    }
    get isHorizonView() {
        return this._viewMode === 'horizon';
    }
    get isQuarterView() {
        return this._viewMode === 'quarter';
    }
    get selectedYear() {
        return this._selectedYear;
    }
    get showAddModal() {
        return this._showAddModal;
    }
    get showEditModal() {
        return this._showEditModal;
    }
    get hasAvailableEpics() {
        return this._availableEpics.length > 0;
    }
    get availableEpics() {
        return this._availableEpics;
    }
    get isAddDisabled() {
        return !this._selectedEpicId;
    }
    get editItemStatus() {
        return this._editStatus;
    }
    get editItemStartDate() {
        return this._editStartDate;
    }
    get editItemTargetDate() {
        return this._editTargetDate;
    }

    get horizonButtonClass() {
        return `view-toggle-btn ${this._viewMode === 'horizon' ? 'view-toggle-btn--active' : ''}`;
    }
    get quarterButtonClass() {
        return `view-toggle-btn ${this._viewMode === 'quarter' ? 'view-toggle-btn--active' : ''}`;
    }

    get horizonLanes() {
        return HORIZON_CONFIG.map((config) => {
            const laneItems = this._items
                .filter((i) => i.horizon === config.key)
                .map((i) => this._enrichItem(i));
            return {
                ...config,
                headerClass: config.colorClass,
                items: laneItems,
                count: laneItems.length,
                isEmpty: laneItems.length === 0
            };
        });
    }

    get quarterLanes() {
        return QUARTER_CONFIG.map((config) => {
            const laneItems = this._items
                .filter(
                    (i) =>
                        i.quarter === config.key &&
                        (i.year == null || i.year === this._selectedYear)
                )
                .map((i) => this._enrichItem(i));
            return {
                ...config,
                items: laneItems,
                count: laneItems.length,
                isEmpty: laneItems.length === 0
            };
        });
    }

    _enrichItem(item) {
        const desc = item.epicDescription || '';
        const statusMap = {
            'On Track': 'status-badge status-badge--on-track',
            'At Risk': 'status-badge status-badge--at-risk',
            'Off Track': 'status-badge status-badge--off-track',
            Complete: 'status-badge status-badge--complete'
        };
        const hasDates = item.startDate || item.targetDate;
        let dateRange = '';
        if (item.startDate && item.targetDate) {
            dateRange = `${this._formatDate(item.startDate)} - ${this._formatDate(item.targetDate)}`;
        } else if (item.startDate) {
            dateRange = `From ${this._formatDate(item.startDate)}`;
        } else if (item.targetDate) {
            dateRange = `By ${this._formatDate(item.targetDate)}`;
        }

        return {
            ...item,
            colorStyle: `background-color: ${item.epicColor || '#1B96FF'}`,
            statusBadgeClass: statusMap[item.status] || 'status-badge',
            cardClass: `epic-card epic-card--${(item.status || 'on-track').toLowerCase().replace(/ /g, '-')}`,
            epicDescriptionTruncated:
                desc.length > 120 ? desc.substring(0, 120) + '...' : desc,
            hasDates,
            dateRange
        };
    }

    _formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }

    // =========================================================================
    // Event Handlers
    // =========================================================================

    handleViewToggle(event) {
        this._viewMode = event.currentTarget.dataset.view;
    }

    handlePreviousYear() {
        this._selectedYear -= 1;
    }

    handleNextYear() {
        this._selectedYear += 1;
    }

    async handleOpenAddModal() {
        this._showAddModal = true;
        this._selectedEpicId = '';
        this._selectedHorizon = 'Now';
        this._selectedQuarter = 'Q1';
        this._addStartDate = null;
        this._addTargetDate = null;
        try {
            this._availableEpics = await getAvailableEpics({
                boardId: this.recordId
            });
        } catch (e) {
            console.error('Error loading available epics', e);
            this._availableEpics = [];
        }
    }

    handleCloseAddModal() {
        this._showAddModal = false;
    }

    handleEpicSelect(event) {
        this._selectedEpicId = event.target.value;
    }

    handleHorizonSelect(event) {
        this._selectedHorizon = event.target.value;
    }

    handleQuarterSelect(event) {
        this._selectedQuarter = event.target.value;
    }

    handleStartDateChange(event) {
        this._addStartDate = event.target.value || null;
    }

    handleTargetDateChange(event) {
        this._addTargetDate = event.target.value || null;
    }

    async handleAddEpic() {
        if (!this._selectedEpicId) return;
        try {
            await createRoadmapItem({
                boardId: this.recordId,
                cardId: this._selectedEpicId,
                horizon: this.isHorizonView ? this._selectedHorizon : null,
                quarter: this.isQuarterView ? this._selectedQuarter : null,
                year: this.isQuarterView ? this._selectedYear : null,
                startDate: this._addStartDate,
                targetDate: this._addTargetDate,
                previousPosition: null,
                nextPosition: null
            });
            this._showAddModal = false;
            await this._loadData();
        } catch (e) {
            console.error('Error adding epic to roadmap', e);
        }
    }

    handleEditItem(event) {
        const itemId = event.currentTarget.dataset.id;
        const item = this._items.find((i) => i.Id === itemId);
        if (!item) return;
        this._editItemId = itemId;
        this._editStatus = item.status || 'On Track';
        this._editStartDate = item.startDate || null;
        this._editTargetDate = item.targetDate || null;
        this._showEditModal = true;
    }

    handleCloseEditModal() {
        this._showEditModal = false;
        this._editItemId = null;
    }

    handleEditStatusChange(event) {
        this._editStatus = event.target.value;
    }

    handleEditStartDateChange(event) {
        this._editStartDate = event.target.value || null;
    }

    handleEditTargetDateChange(event) {
        this._editTargetDate = event.target.value || null;
    }

    async handleSaveEdit() {
        if (!this._editItemId) return;
        try {
            const updates = { status: this._editStatus };
            if (this._editStartDate) {
                updates.startDate = this._editStartDate;
            }
            if (this._editTargetDate) {
                updates.targetDate = this._editTargetDate;
            }
            await updateRoadmapItem({
                itemId: this._editItemId,
                updates
            });
            this._showEditModal = false;
            this._editItemId = null;
            await this._loadData();
        } catch (e) {
            console.error('Error updating roadmap item', e);
        }
    }

    async handleRemoveItem(event) {
        const itemId = event.currentTarget.dataset.id;
        try {
            await deleteRoadmapItem({ itemId });
            await this._loadData();
        } catch (e) {
            console.error('Error removing roadmap item', e);
        }
    }

    // =========================================================================
    // Drag and Drop
    // =========================================================================

    handleDragStart(event) {
        this._dragItemId = event.currentTarget.dataset.id;
        event.dataTransfer.effectAllowed = 'move';
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    async handleDrop(event) {
        event.preventDefault();
        const laneKey = event.currentTarget.dataset.lane;
        if (!this._dragItemId || !laneKey) return;

        try {
            const horizon = this.isHorizonView ? laneKey : null;
            const quarter = this.isQuarterView ? laneKey : null;
            await moveRoadmapItem({
                itemId: this._dragItemId,
                horizon,
                quarter,
                previousPosition: null,
                nextPosition: null
            });
            this._dragItemId = null;
            await this._loadData();
        } catch (e) {
            console.error('Error moving roadmap item', e);
            this._dragItemId = null;
        }
    }
}
