import { LightningElement, api, track } from 'lwc';
import { createSprintAsync, startSprintAsync } from 'c/kanbanStore';

export default class KanbanSprintModal extends LightningElement {
    @api store;
    @api boardId;
    @api sprint; // null for create, object for edit
    @api isOpen = false;

    @track goal = '';
    @track startDate = '';
    @track endDate = '';
    @track isProcessing = false;

    get isEditMode() {
        return !!this.sprint;
    }

    get modalTitle() {
        return this.isEditMode ? 'Edit Sprint' : 'Create Sprint';
    }

    get canStart() {
        return this.isEditMode && this.sprint.status === 'Planning';
    }

    get saveLabel() {
        return this.isProcessing ? 'Saving...' : 'Save';
    }

    connectedCallback() {
        if (this.sprint) {
            this.goal = this.sprint.goal || '';
            this.startDate = this.sprint.startDate || '';
            this.endDate = this.sprint.endDate || '';
        } else {
            // Default: 2 week sprint starting today
            const today = new Date();
            const twoWeeks = new Date(today);
            twoWeeks.setDate(twoWeeks.getDate() + 14);
            this.startDate = today.toISOString().split('T')[0];
            this.endDate = twoWeeks.toISOString().split('T')[0];
        }
    }

    handleGoalChange(event) {
        this.goal = event.target.value;
    }

    handleStartDateChange(event) {
        this.startDate = event.target.value;
    }

    handleEndDateChange(event) {
        this.endDate = event.target.value;
    }

    async handleSave() {
        if (this.isProcessing || !this.store) return;
        this.isProcessing = true;

        try {
            const result = await this.store.dispatch(
                createSprintAsync(this.boardId, this.goal, this.startDate, this.endDate)
            );
            this.dispatchEvent(new CustomEvent('sprintcreated', {
                detail: { sprint: result.sprint }
            }));
            this.handleClose();
        } catch (error) {
            console.error('Error creating sprint:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    async handleStartSprint() {
        if (this.isProcessing || !this.store || !this.sprint) return;
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
