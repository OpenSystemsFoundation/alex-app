import { LightningElement, api, track } from 'lwc';
import { createSprintAsync, startSprintAsync } from 'c/kanbanStore';

const DURATION_OPTIONS = [
    { label: '1 week', value: '7' },
    { label: '2 weeks', value: '14' },
    { label: '3 weeks', value: '21' },
    { label: '4 weeks', value: '28' },
    { label: 'Custom', value: 'custom' }
];

// Format as YYYY-MM-DD in the user's local calendar. toISOString() would
// convert to UTC and shift the date by a day for users east of UTC.
function toDateString(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return toDateString(d);
}

export default class KanbanSprintModal extends LightningElement {
    /** @type {import('c/kanbanStore').Store} The Redux-style store instance */
    @api store;
    /** @type {string} The board ID for sprint creation */
    @api boardId;
    /** @type {SprintDTO|null} Sprint data for edit mode; null for create */
    @api sprint;
    /** @type {boolean} Whether the modal is currently visible */
    @api isOpen = false;
    /** @type {number} Default sprint duration from board settings */
    @api defaultDurationDays = 14;
    /** @type {boolean} Whether the board already has an active sprint */
    @api hasActiveSprint = false;

    @track goal = '';
    @track startDate = '';
    @track endDate = '';
    @track duration = '14';
    @track isProcessing = false;

    get isEditMode() {
        return !!this.sprint;
    }

    get modalTitle() {
        return this.isEditMode ? 'Edit Sprint' : 'Create Sprint';
    }

    get canStart() {
        return (
            this.isEditMode &&
            this.sprint.status === 'Planning' &&
            !this.hasActiveSprint
        );
    }

    get isStartDisabled() {
        return this.isProcessing || !this.startDate || !this.endDate;
    }

    get saveLabel() {
        if (this.isProcessing) return 'Saving...';
        return this.isEditMode ? 'Save' : 'Create';
    }

    get startLabel() {
        return this.isProcessing ? 'Starting...' : 'Start Sprint';
    }

    get durationOptions() {
        return DURATION_OPTIONS;
    }

    get isCustomDuration() {
        return this.duration === 'custom';
    }

    connectedCallback() {
        const boardDuration = this.defaultDurationDays || 14;
        const knownDuration = DURATION_OPTIONS.find(
            (o) => o.value === String(boardDuration)
        );
        this.duration = knownDuration ? String(boardDuration) : 'custom';

        if (this.sprint) {
            this.goal = this.sprint.goal || '';
            this.startDate = this.sprint.startDate || '';
            this.endDate = this.sprint.endDate || '';
            if (this.startDate && this.endDate) {
                this._syncDurationFromDates();
            } else if (!this.startDate) {
                this.startDate = toDateString(new Date());
                this.endDate = addDays(this.startDate, boardDuration);
            }
        } else {
            this.startDate = toDateString(new Date());
            this.endDate = addDays(this.startDate, boardDuration);
        }
    }

    handleGoalChange(event) {
        this.goal = event.target.value;
    }

    handleDurationChange(event) {
        this.duration = event.detail.value;
        if (this.duration !== 'custom' && this.startDate) {
            this.endDate = addDays(this.startDate, Number(this.duration));
        }
    }

    handleStartDateChange(event) {
        this.startDate = event.target.value;
        if (this.duration !== 'custom' && this.startDate) {
            this.endDate = addDays(this.startDate, Number(this.duration));
        }
    }

    handleEndDateChange(event) {
        this.endDate = event.target.value;
        this._syncDurationFromDates();
    }

    _syncDurationFromDates() {
        if (!this.startDate || !this.endDate) return;
        const start = new Date(this.startDate + 'T00:00:00');
        const end = new Date(this.endDate + 'T00:00:00');
        const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
        const match = DURATION_OPTIONS.find(
            (o) => o.value === String(diffDays)
        );
        this.duration = match ? String(diffDays) : 'custom';
    }

    async handleSave() {
        if (this.isProcessing || !this.store) return;
        this.isProcessing = true;

        try {
            const result = await this.store.dispatch(
                createSprintAsync(
                    this.boardId,
                    this.goal,
                    this.startDate,
                    this.endDate
                )
            );
            this.dispatchEvent(
                new CustomEvent('sprintcreated', {
                    detail: { sprint: result.sprint }
                })
            );
            this.handleClose();
        } catch (error) {
            console.error('Error creating sprint:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    async handleStartSprint() {
        if (this.isStartDisabled || !this.store || !this.sprint) return;
        this.isProcessing = true;

        try {
            await this.store.dispatch(startSprintAsync(this.sprint.Id));
            this.dispatchEvent(new CustomEvent('sprintstarted'));
            this.handleClose();
        } catch (error) {
            console.error('Error starting sprint:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleKeyDown(event) {
        if (event.key === 'Escape') {
            this.handleClose();
        }
    }
}
