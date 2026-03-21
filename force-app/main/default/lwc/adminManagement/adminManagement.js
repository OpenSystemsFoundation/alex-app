import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getBoards from '@salesforce/apex/AdminController.getBoards';
import createBoard from '@salesforce/apex/AdminController.createBoard';
import createBoardWithDefaultColumns from '@salesforce/apex/AdminController.createBoardWithDefaultColumns';
import updateBoard from '@salesforce/apex/AdminController.updateBoard';
import deleteBoard from '@salesforce/apex/AdminController.deleteBoard';
import getColumns from '@salesforce/apex/AdminController.getColumns';
import createColumn from '@salesforce/apex/AdminController.createColumn';
import updateColumn from '@salesforce/apex/AdminController.updateColumn';
import deleteColumn from '@salesforce/apex/AdminController.deleteColumn';
import reorderColumn from '@salesforce/apex/AdminController.reorderColumn';
import getOnboardingStatus from '@salesforce/apex/AdminController.getOnboardingStatus';
import getCardCustomFields from '@salesforce/apex/AdminController.getCardCustomFields';
import saveCardCustomField from '@salesforce/apex/AdminController.saveCardCustomField';
import deactivateCardCustomField from '@salesforce/apex/AdminController.deactivateCardCustomField';
import getAvailableCardFields from '@salesforce/apex/AdminController.getAvailableCardFields';

const BOARD_TYPE_OPTIONS = [
    { label: 'Project', value: 'Project' },
    { label: 'Personal', value: 'Personal' },
    { label: 'Team', value: 'Team' }
];

const COLUMN_CATEGORY_OPTIONS = [
    { label: 'Backlog', value: 'Backlog' },
    { label: 'To Do', value: 'To Do' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Testing', value: 'Testing' },
    { label: 'Review', value: 'Review' },
    { label: 'Done', value: 'Done' },
    { label: 'Released', value: 'Released' }
];

const FIELD_TYPE_OPTIONS = [
    { label: 'Text', value: 'Text' },
    { label: 'Number', value: 'Number' },
    { label: 'Date', value: 'Date' },
    { label: 'Checkbox', value: 'Checkbox' },
    { label: 'Picklist', value: 'Picklist' },
    { label: 'Currency', value: 'Currency' },
    { label: 'Percent', value: 'Percent' },
    { label: 'URL', value: 'Url' }
];

export default class AdminManagement extends LightningElement {
    @track boards = [];
    @track columns = [];
    @track onboardingStatus = {};
    @track boardForm = {};
    @track columnForm = {};

    // Card custom fields state
    @track cardFields = [];
    @track availableCardFields = [];
    @track cardFieldForm = {};
    isLoadingCardFields = false;
    showCardFieldModal = false;
    isEditingCardField = false;

    activeTab = 'boards';
    selectedBoardId = '';
    isLoading = true;
    isLoadingColumns = false;
    isSaving = false;
    showBoardModal = false;
    showColumnModal = false;
    showDeleteModal = false;
    isEditingBoard = false;
    isEditingColumn = false;
    editingBoardId = null;
    editingColumnId = null;
    createWithDefaults = true;
    deleteType = '';
    deleteId = null;
    deleteMessage = '';
    dragColumnId = null;
    dragOverColumnId = null;

    boardTypeOptions = BOARD_TYPE_OPTIONS;
    columnCategoryOptions = COLUMN_CATEGORY_OPTIONS;
    fieldTypeOptions = FIELD_TYPE_OPTIONS;

    connectedCallback() {
        this.loadData();
    }

    async loadData() {
        this.isLoading = true;
        try {
            const [boards, status] = await Promise.all([
                getBoards(),
                getOnboardingStatus()
            ]);
            this.boards = boards;
            this.onboardingStatus = status;
        } catch (error) {
            this.showError('Error loading data', error);
        } finally {
            this.isLoading = false;
        }
    }

    // =========================================================================
    // Computed Properties
    // =========================================================================

    get hasBoards() {
        return !this.isLoading && this.boards.length > 0;
    }

    get noBoards() {
        return !this.isLoading && this.boards.length === 0;
    }

    get showOnboarding() {
        return this.onboardingStatus && !this.onboardingStatus.isComplete;
    }

    get onboardingCurrentStep() {
        if (!this.onboardingStatus.hasBoardsCreated) return 'board';
        if (!this.onboardingStatus.hasColumnsConfigured) return 'columns';
        return 'users';
    }

    get showCreateFirstBoard() {
        return !this.onboardingStatus.hasBoardsCreated;
    }

    get showSetupColumns() {
        return (
            this.onboardingStatus.hasBoardsCreated &&
            !this.onboardingStatus.hasColumnsConfigured
        );
    }

    get showAssignUsers() {
        return (
            this.onboardingStatus.hasBoardsCreated &&
            this.onboardingStatus.hasColumnsConfigured &&
            !this.onboardingStatus.hasUsersAssigned
        );
    }

    get boardOptions() {
        return this.boards.map((b) => ({ label: b.Name, value: b.Id }));
    }

    get boardModalTitle() {
        return this.isEditingBoard ? 'Edit Board' : 'New Board';
    }

    get boardModalSaveLabel() {
        return this.isEditingBoard ? 'Save' : 'Create';
    }

    get showDefaultColumnsOption() {
        return !this.isEditingBoard;
    }

    get columnModalTitle() {
        return this.isEditingColumn ? 'Edit Column' : 'New Column';
    }

    get columnModalSaveLabel() {
        return this.isEditingColumn ? 'Save' : 'Create';
    }

    get showColumnList() {
        return (
            this.selectedBoardId &&
            !this.isLoadingColumns &&
            this.columns.length > 0
        );
    }

    get showNoColumnsMessage() {
        return (
            this.selectedBoardId &&
            !this.isLoadingColumns &&
            this.columns.length === 0
        );
    }

    get showSelectBoardMessage() {
        return !this.selectedBoardId && !this.isLoadingColumns;
    }

    // =========================================================================
    // Tab Navigation
    // =========================================================================

    handleTabChange(event) {
        this.activeTab = event.target.value;
        if (this.activeTab === 'cardFields' && this.cardFields.length === 0) {
            this.loadCardFields();
        }
    }

    // =========================================================================
    // Board Operations
    // =========================================================================

    handleNewBoard() {
        this.isEditingBoard = false;
        this.editingBoardId = null;
        this.boardForm = {
            name: '',
            description: '',
            type: 'Project'
        };
        this.createWithDefaults = true;
        this.showBoardModal = true;
    }

    handleQuickCreateBoard() {
        this.handleNewBoard();
    }

    handleBoardAction(event) {
        const action = event.detail.value;
        const boardId =
            event.target.dataset.boardId || event.currentTarget.dataset.boardId;
        const board = this.boards.find((b) => b.Id === boardId);

        switch (action) {
            case 'edit':
                this.isEditingBoard = true;
                this.editingBoardId = boardId;
                this.boardForm = {
                    name: board.Name,
                    description: board.description || '',
                    type: board.type || 'Project',
                    active: board.active,
                    emailNotifications: board.emailNotifications,
                    salesforceNotifications: board.salesforceNotifications
                };
                this.showBoardModal = true;
                break;
            case 'columns':
                this.selectedBoardId = boardId;
                this.activeTab = 'columns';
                this.loadColumns();
                break;
            case 'delete':
                this.deleteType = 'board';
                this.deleteId = boardId;
                this.deleteMessage = `Are you sure you want to delete the board "${board.Name}"? This will also delete all columns and cards on this board. This action cannot be undone.`;
                this.showDeleteModal = true;
                break;
            default:
                break;
        }
    }

    handleManageColumns(event) {
        this.selectedBoardId = event.currentTarget.dataset.boardId;
        this.activeTab = 'columns';
        this.loadColumns();
    }

    handleBoardFormChange(event) {
        const field = event.target.dataset.field;
        if (
            field === 'active' ||
            field === 'emailNotifications' ||
            field === 'salesforceNotifications'
        ) {
            this.boardForm = {
                ...this.boardForm,
                [field]: event.target.checked
            };
        } else {
            this.boardForm = { ...this.boardForm, [field]: event.detail.value };
        }
    }

    handleDefaultColumnsChange(event) {
        this.createWithDefaults = event.target.checked;
    }

    handleCloseModal() {
        this.showBoardModal = false;
    }

    async handleSaveBoard() {
        if (!this.boardForm.name) {
            this.showToast('Error', 'Board name is required', 'error');
            return;
        }

        this.isSaving = true;
        try {
            if (this.isEditingBoard) {
                await updateBoard({
                    boardId: this.editingBoardId,
                    updates: {
                        name: this.boardForm.name,
                        description: this.boardForm.description,
                        type: this.boardForm.type,
                        active: this.boardForm.active,
                        emailNotifications: this.boardForm.emailNotifications,
                        salesforceNotifications:
                            this.boardForm.salesforceNotifications
                    }
                });
                this.showToast('Success', 'Board updated', 'success');
            } else if (this.createWithDefaults) {
                await createBoardWithDefaultColumns({
                    name: this.boardForm.name,
                    description: this.boardForm.description,
                    boardType: this.boardForm.type
                });
                this.showToast(
                    'Success',
                    'Board created with default columns',
                    'success'
                );
            } else {
                await createBoard({
                    name: this.boardForm.name,
                    description: this.boardForm.description,
                    boardType: this.boardForm.type
                });
                this.showToast('Success', 'Board created', 'success');
            }
            this.showBoardModal = false;
            await this.loadData();
        } catch (error) {
            this.showError('Error saving board', error);
        } finally {
            this.isSaving = false;
        }
    }

    // =========================================================================
    // Column Operations
    // =========================================================================

    handleBoardSelect(event) {
        this.selectedBoardId = event.detail.value;
        this.loadColumns();
    }

    async loadColumns() {
        if (!this.selectedBoardId) return;

        this.isLoadingColumns = true;
        try {
            const cols = await getColumns({ boardId: this.selectedBoardId });
            this.columns = cols.map((col, index) => ({
                ...col,
                index,
                cardCountLabel: `${col.cardCount || 0} cards`,
                colorStyle: `background-color: ${col.color || '#1B96FF'}`,
                cssClass:
                    'column-item' +
                    (this.dragOverColumnId === col.Id ? ' drag-over' : '')
            }));
        } catch (error) {
            this.showError('Error loading columns', error);
        } finally {
            this.isLoadingColumns = false;
        }
    }

    handleNewColumn() {
        this.isEditingColumn = false;
        this.editingColumnId = null;
        this.columnForm = {
            columnHeader: '',
            category: 'To Do',
            color: '#1B96FF'
        };
        this.showColumnModal = true;
    }

    handleEditColumn(event) {
        const columnId = event.currentTarget.dataset.columnId;
        const column = this.columns.find((c) => c.Id === columnId);
        this.isEditingColumn = true;
        this.editingColumnId = columnId;
        this.columnForm = {
            columnHeader: column.columnHeader,
            category: column.category || '',
            color: column.color || '#1B96FF'
        };
        this.showColumnModal = true;
    }

    handleDeleteColumn(event) {
        const columnId = event.currentTarget.dataset.columnId;
        const column = this.columns.find((c) => c.Id === columnId);
        this.deleteType = 'column';
        this.deleteId = columnId;
        this.deleteMessage = `Are you sure you want to delete the column "${column.columnHeader}"? Cards in this column will be moved to the backlog.`;
        this.showDeleteModal = true;
    }

    handleColumnFormChange(event) {
        const field = event.target.dataset.field;
        this.columnForm = { ...this.columnForm, [field]: event.detail.value };
    }

    handleCloseColumnModal() {
        this.showColumnModal = false;
    }

    async handleSaveColumn() {
        if (!this.columnForm.columnHeader) {
            this.showToast('Error', 'Column header is required', 'error');
            return;
        }

        this.isSaving = true;
        try {
            if (this.isEditingColumn) {
                await updateColumn({
                    columnId: this.editingColumnId,
                    updates: {
                        columnHeader: this.columnForm.columnHeader,
                        category: this.columnForm.category,
                        color: this.columnForm.color
                    }
                });
                this.showToast('Success', 'Column updated', 'success');
            } else {
                const lastPosition =
                    this.columns.length > 0
                        ? this.columns[this.columns.length - 1].position
                        : null;
                await createColumn({
                    boardId: this.selectedBoardId,
                    columnHeader: this.columnForm.columnHeader,
                    category: this.columnForm.category,
                    color: this.columnForm.color,
                    previousPosition: lastPosition,
                    nextPosition: null
                });
                this.showToast('Success', 'Column created', 'success');
            }
            this.showColumnModal = false;
            await this.loadColumns();
            await this.refreshOnboarding();
        } catch (error) {
            this.showError('Error saving column', error);
        } finally {
            this.isSaving = false;
        }
    }

    // =========================================================================
    // Drag and Drop for Column Reordering
    // =========================================================================

    handleColumnDragStart(event) {
        this.dragColumnId = event.currentTarget.dataset.columnId;
        event.dataTransfer.effectAllowed = 'move';
        // Add dragging class after a tick to avoid affecting the drag image
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            const el = this.template.querySelector(
                `[data-column-id="${this.dragColumnId}"]`
            );
            if (el) el.classList.add('dragging');
        }, 0);
    }

    handleColumnDragEnd() {
        const el = this.template.querySelector(
            `[data-column-id="${this.dragColumnId}"]`
        );
        if (el) el.classList.remove('dragging');

        // Remove all drag-over classes
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
        if (targetId === this.dragColumnId) return;

        // Remove previous drag-over
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

        const dragIndex = this.columns.findIndex(
            (c) => c.Id === this.dragColumnId
        );
        const dropIndex = this.columns.findIndex(
            (c) => c.Id === this.dragOverColumnId
        );

        if (dragIndex === -1 || dropIndex === -1) return;

        // Compute new neighbors
        const reordered = [...this.columns];
        const [moved] = reordered.splice(dragIndex, 1);
        reordered.splice(dropIndex, 0, moved);

        const prevPosition =
            dropIndex > 0 ? reordered[dropIndex - 1].position : null;
        const nextPosition =
            dropIndex < reordered.length - 1
                ? reordered[dropIndex + 1].position
                : null;

        // Optimistic update
        this.columns = reordered.map((col, index) => ({
            ...col,
            index,
            cssClass: 'column-item'
        }));

        try {
            await reorderColumn({
                columnId: this.dragColumnId,
                previousPosition: prevPosition,
                nextPosition: nextPosition
            });
            await this.loadColumns();
        } catch (error) {
            this.showError('Error reordering column', error);
            await this.loadColumns();
        }
    }

    // =========================================================================
    // Delete Operations
    // =========================================================================

    handleCloseDeleteModal() {
        this.showDeleteModal = false;
        this.deleteType = '';
        this.deleteId = null;
    }

    async handleConfirmDelete() {
        this.isSaving = true;
        try {
            if (this.deleteType === 'board') {
                await deleteBoard({ boardId: this.deleteId });
                this.showToast('Success', 'Board deleted', 'success');
                if (this.selectedBoardId === this.deleteId) {
                    this.selectedBoardId = '';
                    this.columns = [];
                }
                await this.loadData();
            } else if (this.deleteType === 'column') {
                await deleteColumn({ columnId: this.deleteId });
                this.showToast('Success', 'Column deleted', 'success');
                await this.loadColumns();
            } else if (this.deleteType === 'cardField') {
                await deactivateCardCustomField({
                    developerName: this.deleteId
                });
                this.showToast(
                    'Success',
                    'Card field deactivated. Changes may take a moment to deploy.',
                    'success'
                );
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                setTimeout(() => this.loadCardFields(), 2000);
            }
            this.showDeleteModal = false;
        } catch (error) {
            this.showError('Error deleting', error);
        } finally {
            this.isSaving = false;
        }
    }

    // =========================================================================
    // Card Custom Field Operations
    // =========================================================================

    get hasCardFields() {
        return !this.isLoadingCardFields && this.cardFields.length > 0;
    }

    get noCardFields() {
        return !this.isLoadingCardFields && this.cardFields.length === 0;
    }

    get cardFieldModalTitle() {
        return this.isEditingCardField ? 'Edit Card Field' : 'New Card Field';
    }

    get cardFieldModalSaveLabel() {
        return this.isEditingCardField ? 'Save' : 'Create';
    }

    get cardFieldOptions() {
        return this.availableCardFields.map((f) => ({
            label: `${f.label} (${f.apiName})`,
            value: f.apiName
        }));
    }

    async loadCardFields() {
        this.isLoadingCardFields = true;
        try {
            const [fields, available] = await Promise.all([
                getCardCustomFields(),
                getAvailableCardFields()
            ]);
            this.cardFields = fields.map((f) => ({
                ...f,
                statusLabel: f.active ? 'Active' : 'Inactive',
                statusClass: f.active ? 'slds-badge badge-active' : 'slds-badge'
            }));
            this.availableCardFields = available;
        } catch (error) {
            this.showError('Error loading card fields', error);
        } finally {
            this.isLoadingCardFields = false;
        }
    }

    handleNewCardField() {
        this.isEditingCardField = false;
        this.cardFieldForm = {
            fieldApiName: '',
            displayLabel: '',
            fieldType: 'Text',
            sortOrder: (this.cardFields.length + 1) * 10,
            active: true
        };
        this.showCardFieldModal = true;
    }

    handleEditCardField(event) {
        const devName = event.currentTarget.dataset.developerName;
        const field = this.cardFields.find((f) => f.developerName === devName);
        this.isEditingCardField = true;
        this.cardFieldForm = {
            developerName: field.developerName,
            fieldApiName: field.fieldApiName,
            displayLabel: field.displayLabel,
            fieldType: field.fieldType,
            sortOrder: field.sortOrder,
            active: field.active
        };
        this.showCardFieldModal = true;
    }

    handleCardFieldFormChange(event) {
        const field = event.target.dataset.field;
        if (field === 'active') {
            this.cardFieldForm = {
                ...this.cardFieldForm,
                [field]: event.target.checked
            };
        } else {
            this.cardFieldForm = {
                ...this.cardFieldForm,
                [field]: event.detail?.value ?? event.target.value
            };
        }
    }

    handleCloseCardFieldModal() {
        this.showCardFieldModal = false;
    }

    async handleSaveCardField() {
        if (!this.cardFieldForm.fieldApiName) {
            this.showToast('Error', 'Field API name is required', 'error');
            return;
        }

        this.isSaving = true;
        try {
            // Generate developer name from field API name if creating new
            const devName =
                this.cardFieldForm.developerName ||
                this.cardFieldForm.fieldApiName
                    .replace('__c', '')
                    .replace(/[^a-zA-Z0-9_]/g, '_');

            await saveCardCustomField({
                fieldConfig: {
                    developerName: devName,
                    masterLabel:
                        this.cardFieldForm.displayLabel ||
                        this.cardFieldForm.fieldApiName.replace('__c', ''),
                    fieldApiName: this.cardFieldForm.fieldApiName,
                    displayLabel: this.cardFieldForm.displayLabel,
                    fieldType: this.cardFieldForm.fieldType,
                    sortOrder: this.cardFieldForm.sortOrder,
                    active: this.cardFieldForm.active
                }
            });

            this.showToast(
                'Success',
                'Card field configuration saved. It may take a moment to deploy.',
                'success'
            );
            this.showCardFieldModal = false;
            // Reload after a short delay to allow metadata deployment
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => this.loadCardFields(), 2000);
        } catch (error) {
            this.showError('Error saving card field', error);
        } finally {
            this.isSaving = false;
        }
    }

    async handleDeactivateCardField(event) {
        const devName = event.currentTarget.dataset.developerName;
        const field = this.cardFields.find((f) => f.developerName === devName);

        this.deleteType = 'cardField';
        this.deleteId = devName;
        this.deleteMessage = `Are you sure you want to deactivate the card field "${field.displayLabel}"? It will no longer appear on cards.`;
        this.showDeleteModal = true;
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    async refreshOnboarding() {
        try {
            this.onboardingStatus = await getOnboardingStatus();
        } catch (error) {
            // Non-critical, ignore
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    showError(title, error) {
        const message =
            error?.body?.message || error?.message || 'Unknown error';
        this.showToast(title, message, 'error');
    }
}
