import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import {
    selectors,
    createColumnAsync,
    updateColumnAsync,
    deleteColumnAsync,
    reorderColumnAsync,
    createColumnsFromTemplateAsync
} from 'c/kanbanStore';
import {
    applyStoreSubscription,
    removeStoreSubscription
} from 'c/storeSubscriptionMixin';

const COLUMN_CATEGORY_OPTIONS = [
    { label: 'Backlog', value: 'Backlog' },
    { label: 'To Do', value: 'To Do' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Testing', value: 'Testing' },
    { label: 'Review', value: 'Review' },
    { label: 'Done', value: 'Done' },
    { label: 'Released', value: 'Released' }
];

const COLUMN_STATUS_OPTIONS = [
    { label: 'Backlog', value: 'Backlog' },
    { label: 'To Do', value: 'To Do' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Testing', value: 'Testing' },
    { label: 'Review', value: 'Review' },
    { label: 'Release', value: 'Release' },
    { label: 'Done', value: 'Done' }
];

const COLOR_OPTIONS = [
    { label: 'Blue', value: '#1B96FF' },
    { label: 'Cloud Blue', value: '#1AB9FF' },
    { label: 'Green', value: '#2E844A' },
    { label: 'Teal', value: '#06A59A' },
    { label: 'Yellow', value: '#FCC003' },
    { label: 'Orange', value: '#F38303' },
    { label: 'Red', value: '#EA001E' },
    { label: 'Pink', value: '#FF538A' },
    { label: 'Purple', value: '#9050E9' },
    { label: 'Violet', value: '#CB65FF' },
    { label: 'Indigo', value: '#3A49DA' },
    { label: 'Hot Orange', value: '#FF5D2D' }
];

const TEMPLATE_OPTIONS = [
    {
        value: 'kanban',
        label: 'Simple Kanban',
        description: 'Lightweight board for general work tracking',
        columnsLabel: 'To Do → In Progress → Review → Done',
        icon: 'utility:kanban'
    },
    {
        value: 'scrum',
        label: 'Scrum Board',
        description: 'Full sprint workflow with backlog and testing',
        columnsLabel: 'Backlog → To Do → In Progress → Testing → Review → Done',
        icon: 'utility:sprint'
    },
    {
        value: 'release',
        label: 'Release Pipeline',
        description: 'Software delivery from dev to production',
        columnsLabel:
            'Backlog → Development → Code Review → QA → Staging → Released',
        icon: 'utility:package'
    }
];

export default class ColumnManagement extends LightningElement {
    /** @type {import('c/kanbanStore').KanbanStore} */
    @api store;

    _storeState;
    isSaving = false;
    showDeleteModal = false;
    deleteColumnId = null;
    deleteMessage = '';
    dragColumnId = null;
    dragOverColumnId = null;

    columnCategoryOptions = COLUMN_CATEGORY_OPTIONS;
    columnStatusOptions = COLUMN_STATUS_OPTIONS;
    colorOptions = COLOR_OPTIONS;
    templateOptions = TEMPLATE_OPTIONS;

    connectedCallback() {
        if (this.store) {
            applyStoreSubscription(this, this.store);
        }
    }

    disconnectedCallback() {
        removeStoreSubscription(this);
    }

    // =========================================================================
    // Computed Properties
    // =========================================================================

    /**
     * Columns from the shared store, enriched for the management UI.
     */
    get columns() {
        const storeColumns = this._storeState
            ? selectors.getColumns(this._storeState)
            : [];
        return storeColumns.map((col, index) => ({
            ...col,
            index,
            recordUrl: `/lightning/r/OpenSF__Column__c/${col.Id}/view`,
            cardCountLabel: `${col.cardCount || 0} cards`,
            colorStyle: `background-color: ${col.color || '#1B96FF'}`,
            wipLimitLabel: col.wipLimit ? `WIP: ${col.wipLimit}` : '',
            cssClass:
                'column-item' +
                (this.dragOverColumnId === col.Id ? ' drag-over' : '')
        }));
    }

    get showColumnList() {
        return !this.isLoadingColumns && this.columns.length > 0;
    }

    get showNoColumnsMessage() {
        return !this.isLoadingColumns && this.columns.length === 0;
    }

    get isLoadingColumns() {
        return this._storeState
            ? selectors.getIsLoading(this._storeState)
            : true;
    }

    // =========================================================================
    // Add Column / Add Template
    // =========================================================================

    async handleNewColumn() {
        this.isSaving = true;
        try {
            await this.store.dispatch(
                createColumnAsync(
                    'New Column',
                    'To Do',
                    '#1B96FF',
                    'To Do',
                    null
                )
            );
        } catch (error) {
            this.showError('Error creating column', error);
        } finally {
            this.isSaving = false;
        }
    }

    handleAddColumnKeydown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleNewColumn();
        }
    }

    async handleSelectTemplate(event) {
        const templateName = event.currentTarget.dataset.template;
        this.isSaving = true;
        try {
            await this.store.dispatch(
                createColumnsFromTemplateAsync(templateName)
            );
            this.showToast('Success', 'Template columns created', 'success');
        } catch (error) {
            this.showError('Error creating template', error);
        } finally {
            this.isSaving = false;
        }
    }

    handleTemplateKeydown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleSelectTemplate(event);
        }
    }

    // =========================================================================
    // Inline Editing
    // =========================================================================

    handleInlineEdit(event) {
        const columnId = event.target.dataset.columnId;
        const field = event.target.dataset.field;
        let value =
            event.detail?.value !== undefined
                ? event.detail.value
                : event.target.value;

        if (field === 'wipLimit') {
            value = value !== '' && value != null ? Number(value) : null;
        }

        const column = this.columns.find((c) => c.Id === columnId);
        if (!column) return;

        // Skip save if unchanged
        const current = column[field];
        if (current === value) return;
        if (field === 'wipLimit' && !current && !value) return;

        this.saveColumnField(columnId, field, value);
    }

    async saveColumnField(columnId, field, value) {
        try {
            await this.store.dispatch(
                updateColumnAsync(columnId, { [field]: value })
            );
        } catch (error) {
            this.showError('Error saving', error);
        }
    }

    // =========================================================================
    // Delete
    // =========================================================================

    handleDeleteColumn(event) {
        const columnId = event.currentTarget.dataset.columnId;
        const column = this.columns.find((c) => c.Id === columnId);
        this.deleteColumnId = columnId;
        this.deleteMessage = `Are you sure you want to delete "${column.columnHeader}"? Cards in this column will need to be reassigned.`;
        this.showDeleteModal = true;
    }

    handleCloseDeleteModal() {
        this.showDeleteModal = false;
        this.deleteColumnId = null;
    }

    async handleConfirmDelete() {
        this.isSaving = true;
        try {
            await this.store.dispatch(deleteColumnAsync(this.deleteColumnId));
            this.showToast('Success', 'Column deleted', 'success');
            this.showDeleteModal = false;
            this.deleteColumnId = null;
        } catch (error) {
            this.showError('Error deleting column', error);
        } finally {
            this.isSaving = false;
        }
    }

    // =========================================================================
    // Drag and Drop for Column Reordering
    // =========================================================================

    _dragHandleActive = false;

    handleDragHandleMouseDown() {
        this._dragHandleActive = true;
    }

    handleDragHandleMouseUp() {
        this._dragHandleActive = false;
    }

    handleColumnDragStart(event) {
        if (!this._dragHandleActive) {
            event.preventDefault();
            return;
        }
        this.dragColumnId = event.currentTarget.dataset.columnId;
        event.dataTransfer.effectAllowed = 'move';
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            const el = this.template.querySelector(
                `[data-column-id="${this.dragColumnId}"]`
            );
            if (el) el.classList.add('dragging');
        }, 0);
    }

    handleColumnDragEnd() {
        this._dragHandleActive = false;
        const el = this.template.querySelector(
            `[data-column-id="${this.dragColumnId}"]`
        );
        if (el) el.classList.remove('dragging');

        this.template.querySelectorAll('.column-item').forEach((item) => {
            item.classList.remove('drag-over');
        });

        this.dragColumnId = null;
        this.dragOverColumnId = null;
    }

    handleColumnDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    handleColumnDragEnter(event) {
        event.preventDefault();
        const targetId = event.currentTarget.dataset.columnId;

        // Moving back to the source column cancels the drop target
        if (targetId === this.dragColumnId) {
            this.template.querySelectorAll('.column-item').forEach((item) => {
                item.classList.remove('drag-over');
            });
            this.dragOverColumnId = null;
            return;
        }

        this.template.querySelectorAll('.column-item').forEach((item) => {
            item.classList.remove('drag-over');
        });

        this.dragOverColumnId = targetId;
        event.currentTarget.classList.add('drag-over');
    }

    async handleColumnDrop(event) {
        event.preventDefault();

        if (!this.dragColumnId || !this.dragOverColumnId) return;
        if (this.dragColumnId === this.dragOverColumnId) return;

        const columns = this.columns;
        const dragIndex = columns.findIndex((c) => c.Id === this.dragColumnId);
        const dropIndex = columns.findIndex(
            (c) => c.Id === this.dragOverColumnId
        );

        if (dragIndex === -1 || dropIndex === -1) return;

        // Build reordered array from store columns (not enriched)
        const storeColumns = selectors.getColumns(this._storeState);
        const reordered = [...storeColumns];
        const [moved] = reordered.splice(dragIndex, 1);
        reordered.splice(dropIndex, 0, moved);

        try {
            await this.store.dispatch(
                reorderColumnAsync(this.dragColumnId, dropIndex, reordered)
            );
        } catch (error) {
            this.showError('Error reordering column', error);
        }
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    showError(title, error) {
        const message =
            error?.body?.message || error?.message || 'Unknown error';
        this.showToast(title, message, 'error');
    }
}
