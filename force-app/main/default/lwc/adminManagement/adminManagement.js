import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getBoards from '@salesforce/apex/AdminController.getBoards';
import createBoard from '@salesforce/apex/AdminController.createBoard';
import createBoardWithDefaultColumns from '@salesforce/apex/AdminController.createBoardWithDefaultColumns';
import updateBoard from '@salesforce/apex/AdminController.updateBoard';
import deleteBoard from '@salesforce/apex/AdminController.deleteBoard';
import getOnboardingStatus from '@salesforce/apex/AdminController.getOnboardingStatus';
import getCardCustomFields from '@salesforce/apex/AdminController.getCardCustomFields';
import saveCardCustomField from '@salesforce/apex/AdminController.saveCardCustomField';
import deactivateCardCustomField from '@salesforce/apex/AdminController.deactivateCardCustomField';
import getAvailableCardFields from '@salesforce/apex/AdminController.getAvailableCardFields';

const BOARD_TYPE_OPTIONS = [
    { label: 'Project', value: 'Project' },
    { label: 'Personal', value: 'Personal' },
    { label: 'Team', value: 'Team' },
    { label: 'Sprint', value: 'Sprint' }
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

export default class AdminManagement extends NavigationMixin(LightningElement) {
    @track boards = [];
    @track onboardingStatus = {};
    @track boardForm = {};
    @track cardFields = [];
    @track availableCardFields = [];
    @track cardFieldForm = {};

    activeTab = 'boards';
    isLoading = true;
    isSaving = false;
    isLoadingCardFields = false;
    showBoardModal = false;
    showCardFieldModal = false;
    showDeleteModal = false;
    isEditingBoard = false;
    isEditingCardField = false;
    editingBoardId = null;
    createWithDefaults = true;
    deleteType = '';
    deleteId = null;
    deleteMessage = '';

    boardTypeOptions = BOARD_TYPE_OPTIONS;
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

    get boardModalTitle() {
        return this.isEditingBoard ? 'Edit Board' : 'New Board';
    }

    get boardModalSaveLabel() {
        return this.isEditingBoard ? 'Save' : 'Create';
    }

    get showDefaultColumnsOption() {
        return !this.isEditingBoard;
    }

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
        return this.availableCardFields.map((field) => ({
            label: `${field.label} (${field.apiName})`,
            value: field.apiName
        }));
    }

    handleTabChange(event) {
        this.activeTab = event.target.value;
        if (this.activeTab === 'cardFields' && this.cardFields.length === 0) {
            this.loadCardFields();
        }
    }

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

    handleOpenFirstBoard() {
        if (this.boards.length > 0) {
            this.openBoard(this.boards[0].Id);
        }
    }

    handleBoardAction(event) {
        const action = event.detail.value;
        const boardId =
            event.target.dataset.boardId || event.currentTarget.dataset.boardId;
        const board = this.boards.find((candidate) => candidate.Id === boardId);

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
            case 'open':
                this.openBoard(boardId);
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

    handleOpenBoard(event) {
        this.openBoard(event.currentTarget.dataset.boardId);
    }

    openBoard(boardId) {
        if (!boardId) {
            return;
        }

        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: boardId,
                objectApiName: 'OpenSF__Board__c',
                actionName: 'view'
            }
        });
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
            this.boardForm = {
                ...this.boardForm,
                [field]: event.detail.value
            };
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
                await this.loadData();
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

    async loadCardFields() {
        this.isLoadingCardFields = true;
        try {
            const [fields, available] = await Promise.all([
                getCardCustomFields(),
                getAvailableCardFields()
            ]);
            this.cardFields = fields.map((field) => ({
                ...field,
                statusLabel: field.active ? 'Active' : 'Inactive',
                statusClass: field.active
                    ? 'slds-badge badge-active'
                    : 'slds-badge'
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
        const developerName = event.currentTarget.dataset.developerName;
        const field = this.cardFields.find(
            (candidate) => candidate.developerName === developerName
        );
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
            const developerName =
                this.cardFieldForm.developerName ||
                this.cardFieldForm.fieldApiName
                    .replace('__c', '')
                    .replace(/[^a-zA-Z0-9_]/g, '_');

            await saveCardCustomField({
                fieldConfig: {
                    developerName,
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
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => this.loadCardFields(), 2000);
        } catch (error) {
            this.showError('Error saving card field', error);
        } finally {
            this.isSaving = false;
        }
    }

    handleDeactivateCardField(event) {
        const developerName = event.currentTarget.dataset.developerName;
        const field = this.cardFields.find(
            (candidate) => candidate.developerName === developerName
        );

        this.deleteType = 'cardField';
        this.deleteId = developerName;
        this.deleteMessage = `Are you sure you want to deactivate the card field "${field.displayLabel}"? It will no longer appear on cards.`;
        this.showDeleteModal = true;
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
