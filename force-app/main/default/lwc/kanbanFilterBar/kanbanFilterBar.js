import { LightningElement, api, track } from 'lwc';

export default class KanbanFilterBar extends LightningElement {
    /** @type {string} */
    @api searchPlaceholder = 'Search cards...';

    /** @type {string} */
    @track _searchValue = '';

    /** @type {string} */
    @api
    get searchValue() {
        return this._searchValue;
    }
    set searchValue(value) {
        this._searchValue = value || '';
    }

    /** @type {boolean} */
    @api showViewFilter = false;
    /** @type {string} */
    @api viewValue = '';
    /** @type {Array<{label: string, value: string}>} */
    @api viewOptions = [];

    /** @type {boolean} */
    @api showPriorityFilter = false;
    /** @type {string} */
    @api priorityValue = '';
    /** @type {Array<{label: string, value: string}>} */
    @api priorityOptions = [];

    /** @type {boolean} */
    @api showCardTypeFilter = false;
    /** @type {string} */
    @api cardTypeValue = '';
    /** @type {Array<{label: string, value: string}>} */
    @api cardTypeOptions = [];

    /** @type {boolean} */
    @api showEpicFilter = false;
    /** @type {string} */
    @api epicValue = '';
    /** @type {Array<{label: string, value: string}>} */
    @api epicOptions = [];

    /** @type {boolean} */
    @api showAssigneeFilter = false;
    /** @type {Array<string>} */
    @track _assigneeValue = [];
    /** @type {Array<{label: string, value: string}>} */
    @api assigneeOptions = [];
    @track _showAssigneeDropdown = false;

    /** @type {boolean} */
    @api showSwimlaneFilter = false;
    /** @type {string} */
    @api swimlaneValue = '';
    /** @type {Array<{label: string, value: string}>} */
    @api swimlaneOptions = [];

    /** @type {boolean} */
    @api showHideDoneToggle = false;
    /** @type {boolean} */
    @api hideDoneActive = false;

    /** @type {string} */
    @api infoText = '';
    /** @type {boolean} */
    @api showInfoText = false;

    /** @type {boolean} */
    @api showBusyState = false;
    /** @type {string} */
    @api busyLabel = 'Saving...';

    /** @type {boolean} */
    @api showClearFilters = false;

    /** @type {boolean} */
    @api showNewSprint = false;
    /** @type {boolean} */
    @api showNewCard = false;

    _windowClickHandler = null;

    /** @type {Array<string>} */
    @api
    get assigneeValue() {
        return this._assigneeValue;
    }
    set assigneeValue(value) {
        this._assigneeValue = Array.isArray(value) ? [...value] : [];
    }

    connectedCallback() {
        this._windowClickHandler = this.handleWindowClick.bind(this);
        if (typeof window !== 'undefined') {
            window.addEventListener('click', this._windowClickHandler);
        }
    }

    disconnectedCallback() {
        if (typeof window !== 'undefined' && this._windowClickHandler) {
            window.removeEventListener('click', this._windowClickHandler);
        }
        this._windowClickHandler = null;
    }

    get hideDoneButtonClass() {
        return this.hideDoneActive
            ? 'filter-toggle filter-toggle--active'
            : 'filter-toggle';
    }

    get hasAssigneeOptions() {
        return this.assigneeOptions.length > 0;
    }

    get assigneeOptionItems() {
        const selected = new Set(this._assigneeValue);
        return (this.assigneeOptions || []).map((option) => ({
            ...option,
            checked: selected.has(option.value)
        }));
    }

    get assigneeButtonClass() {
        let classes = 'kanban-filter-bar__multiselect-button';
        if (this._showAssigneeDropdown) {
            classes += ' kanban-filter-bar__multiselect-button--open';
        }
        return classes;
    }

    get assigneeButtonLabel() {
        if (this._assigneeValue.length === 0) {
            return 'All Assignees';
        }

        if (this._assigneeValue.length === 1) {
            const selectedValue = this._assigneeValue[0];
            const selectedOption = this.assigneeOptions.find(
                (option) => option.value === selectedValue
            );
            return selectedOption?.label || '1 Assignee';
        }

        return `${this._assigneeValue.length} Assignees`;
    }

    get assigneeButtonTitle() {
        if (this._assigneeValue.length === 0) {
            return 'Filter by assignee';
        }

        const selectedLabels = this.assigneeOptions
            .filter((option) => this._assigneeValue.includes(option.value))
            .map((option) => option.label);

        return selectedLabels.join(', ');
    }

    handleSearchInput(event) {
        this._searchValue = event.target.value;
        this.dispatchValueEvent('searchinput', this._searchValue);
    }

    handleViewChange(event) {
        this.dispatchValueEvent('viewchange', event.target.value);
    }

    handlePriorityChange(event) {
        this.dispatchValueEvent('prioritychange', event.target.value);
    }

    handleCardTypeChange(event) {
        this.dispatchValueEvent('cardtypechange', event.target.value);
    }

    handleEpicChange(event) {
        this.dispatchValueEvent('epicchange', event.target.value);
    }

    handleAssigneeDropdownToggle(event) {
        event.stopPropagation();
        if (!this.hasAssigneeOptions) {
            return;
        }
        this._showAssigneeDropdown = !this._showAssigneeDropdown;
    }

    handleAssigneeOptionToggle(event) {
        const value = event.target.dataset.value;
        const nextValues = new Set(this._assigneeValue);

        if (event.target.checked) {
            nextValues.add(value);
        } else {
            nextValues.delete(value);
        }

        this._assigneeValue = Array.from(nextValues);
        this.dispatchValueEvent('assigneechange', this._assigneeValue);
    }

    handleAssigneePanelClick(event) {
        event.stopPropagation();
    }

    handleSwimlaneChange(event) {
        this.dispatchValueEvent('swimlanechange', event.target.value);
    }

    handleToggleHideDone() {
        this.dispatchEvent(new CustomEvent('togglehidedone'));
    }

    handleClearFilters() {
        this.dispatchEvent(new CustomEvent('clearfilters'));
    }

    handleCreateSprint() {
        this.dispatchEvent(new CustomEvent('createsprint'));
    }

    handleCreateCard() {
        this.dispatchEvent(new CustomEvent('createcard'));
    }

    handleWindowClick() {
        this._showAssigneeDropdown = false;
    }

    dispatchValueEvent(name, value) {
        this.dispatchEvent(
            new CustomEvent(name, {
                detail: { value }
            })
        );
    }
}
