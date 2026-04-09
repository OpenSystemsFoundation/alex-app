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

    get hideDoneButtonClass() {
        return this.hideDoneActive
            ? 'filter-toggle filter-toggle--active'
            : 'filter-toggle';
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

    dispatchValueEvent(name, value) {
        this.dispatchEvent(
            new CustomEvent(name, {
                detail: { value }
            })
        );
    }
}
