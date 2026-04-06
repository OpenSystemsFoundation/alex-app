import { LightningElement, api, track } from 'lwc';
import { selectors } from 'c/kanbanStore';
import {
    applyStoreSubscription,
    removeStoreSubscription
} from 'c/storeSubscriptionMixin';

export default class KanbanSprintHeader extends LightningElement {
    @api store;
    @api experienceCloud = false;
    @track _storeState = null;

    connectedCallback() {
        applyStoreSubscription(this, this.store);
    }

    disconnectedCallback() {
        removeStoreSubscription(this);
    }

    get sprint() {
        if (!this._storeState) return null;
        return selectors.getActiveSprint(this._storeState);
    }

    get hasSprint() {
        return !!this.sprint;
    }

    get sprintName() {
        return this.sprint?.Name || '';
    }

    get sprintGoal() {
        return this.sprint?.goal || '';
    }

    get sprintStatus() {
        return this.sprint?.status || '';
    }

    get dateRange() {
        if (!this.sprint) return '';
        const start = this.sprint.startDate || '';
        const end = this.sprint.endDate || '';
        if (!start && !end) return '';
        return `${start} - ${end}`;
    }

    get daysRemaining() {
        if (!this._storeState) return null;
        return selectors.getSprintDaysRemaining(this._storeState);
    }

    get daysRemainingLabel() {
        const days = this.daysRemaining;
        if (days === null) return '';
        if (days < 0) return `${Math.abs(days)}d overdue`;
        if (days === 0) return 'Last day';
        return `${days}d remaining`;
    }

    get daysRemainingClass() {
        const days = this.daysRemaining;
        if (days === null) return '';
        if (days <= 0) return 'slds-text-color_error';
        if (days <= 2) return 'slds-text-color_warning';
        return '';
    }

    get progress() {
        if (!this._storeState) return 0;
        return selectors.getSprintProgress(this._storeState);
    }

    get progressStyle() {
        return `width: ${this.progress}%`;
    }

    get progressLabel() {
        if (!this.sprint) return '';
        const completed = this.sprint.completedStoryPoints || 0;
        const total = this.sprint.totalStoryPoints || 0;
        return `${completed} / ${total} pts (${this.progress}%)`;
    }

    get sprints() {
        if (!this._storeState) return [];
        return selectors.getSprints(this._storeState);
    }

    get sprintOptions() {
        return this.sprints.map((s) => ({
            label: `${s.Name} (${s.status})`,
            value: s.Id
        }));
    }

    get isActive() {
        return this.sprint?.status === 'Active';
    }

    get canComplete() {
        return this.isActive && !this.experienceCloud;
    }

    get isInternalMode() {
        return !this.experienceCloud;
    }

    // Event handlers
    handleCompleteSprint() {
        this.dispatchEvent(
            new CustomEvent('completesprint', {
                detail: { sprintId: this.sprint.Id }
            })
        );
    }

    handleCreateSprint() {
        this.dispatchEvent(new CustomEvent('createsprint'));
    }

    handleShowReports() {
        this.dispatchEvent(
            new CustomEvent('showreports', {
                detail: { sprintId: this.sprint?.Id }
            })
        );
    }

    // Backlog toggle removed - now handled by tab bar in kanbanBoard
}
