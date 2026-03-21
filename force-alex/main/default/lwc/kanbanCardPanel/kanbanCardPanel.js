import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { updateCard, deleteCardAsync } from 'c/kanbanStore';
import getModalSettings from '@salesforce/apex/KanbanBoardController.getModalSettings';

const FIELD_METADATA = {
    OpenSF__Subject__c: { fullWidth: true, isTextarea: false },
    OpenSF__Description__c: { fullWidth: true, isTextarea: true },
    OpenSF__Status__c: { fullWidth: false, isTextarea: false },
    OpenSF__CardType__c: { fullWidth: false, isTextarea: false },
    OpenSF__Priority__c: { fullWidth: false, isTextarea: false },
    OpenSF__Epic__c: { fullWidth: false, isTextarea: false },
    OpenSF__Assignee__c: { fullWidth: false, isTextarea: false },
    OpenSF__PeerReviewer__c: { fullWidth: false, isTextarea: false },
    OpenSF__DueDate__c: { fullWidth: false, isTextarea: false },
    OpenSF__StoryPoints__c: { fullWidth: false, isTextarea: false },
    OpenSF__Color__c: { fullWidth: false, isTextarea: false },
    OpenSF__NeedsRefinement__c: { fullWidth: false, isTextarea: false }
};

const MIN_PANEL_WIDTH = 300;
const MAX_PANEL_WIDTH = 800;
const DELETE_CONFIRM_TIMEOUT = 3000;

export default class KanbanCardPanel extends LightningElement {
    @api card;
    @api store;
    @api isOpen = false;

    @track modalSettings;
    @track formFields = [];
    @track deleteConfirmState = false;
    @track panelWidth = 400;

    _originalCard;
    _resizing = false;
    _deleteTimer;
    _boundHandleResize;
    _boundHandleResizeEnd;

    @wire(getModalSettings)
    wiredModalSettings({ data, error }) {
        if (data) {
            this.modalSettings = data;
            if (data.visibleFields) {
                this.formFields = this.processFields(data.visibleFields);
            }
        } else if (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading field settings',
                    message: error.body ? error.body.message : 'Unknown error',
                    variant: 'error'
                })
            );
        }
    }

    processFields(fieldNames) {
        return fieldNames.map((fieldName) => {
            // Server returns unqualified names (e.g. Subject__c),
            // but lightning-input-field needs the namespace-qualified name
            const qualifiedName = fieldName.startsWith('OpenSF__')
                ? fieldName
                : `OpenSF__${fieldName}`;
            const meta = FIELD_METADATA[qualifiedName] || {
                fullWidth: false,
                isTextarea: false
            };
            return {
                fieldName: qualifiedName,
                key: qualifiedName,
                fullWidth: meta.fullWidth,
                isTextarea: meta.isTextarea,
                columnClass: meta.fullWidth
                    ? 'slds-col slds-size_1-of-1'
                    : 'slds-col slds-size_1-of-2'
            };
        });
    }

    get panelStyle() {
        return `width: ${this.panelWidth}px`;
    }

    get cardRecordUrl() {
        return this.card?.Id
            ? `/lightning/r/OpenSF__Card__c/${this.card.Id}/view`
            : '#';
    }

    handleNameClick(event) {
        event.preventDefault();
        this.dispatchEvent(
            new CustomEvent('navigatetocard', {
                detail: { cardId: this.card.Id }
            })
        );
    }

    get hasFields() {
        return this.formFields && this.formFields.length > 0;
    }

    get descriptionField() {
        return this.formFields.find(
            (f) => f.fieldName === 'OpenSF__Description__c'
        );
    }

    get regularFields() {
        return this.formFields.filter(
            (f) => f.fieldName !== 'OpenSF__Description__c'
        );
    }

    get deleteButtonLabel() {
        return this.deleteConfirmState ? 'Confirm Delete' : 'Delete';
    }

    get deleteButtonVariant() {
        return this.deleteConfirmState ? 'destructive' : 'neutral';
    }

    handleSave() {
        const inputFields = this.template.querySelectorAll(
            'lightning-input-field'
        );
        const updatedFields = {};
        inputFields.forEach((field) => {
            updatedFields[field.fieldName] = field.value;
        });

        this._originalCard = { ...this.card };

        const optimisticCard = { ...this.card, ...updatedFields };
        updateCard(this.store, optimisticCard);

        const form = this.template.querySelector('lightning-record-edit-form');
        if (form) {
            form.submit();
        }
    }

    handleSuccess() {
        this._originalCard = null;
        this.dispatchEvent(
            new CustomEvent('cardupdated', {
                detail: { cardId: this.card.Id }
            })
        );
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Card updated successfully',
                variant: 'success'
            })
        );
        this.handleClose();
    }

    handleError(event) {
        if (this._originalCard) {
            updateCard(this.store, this._originalCard);
            this._originalCard = null;
        }
        const message =
            event.detail && event.detail.message
                ? event.detail.message
                : 'An error occurred while saving';
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message,
                variant: 'error'
            })
        );
    }

    handleDelete() {
        if (this.deleteConfirmState) {
            this.performDelete();
        } else {
            this.deleteConfirmState = true;
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            this._deleteTimer = setTimeout(() => {
                this.deleteConfirmState = false;
            }, DELETE_CONFIRM_TIMEOUT);
        }
    }

    async performDelete() {
        if (this._deleteTimer) {
            clearTimeout(this._deleteTimer);
            this._deleteTimer = null;
        }
        this.deleteConfirmState = false;

        try {
            await this.store.dispatch(deleteCardAsync(this.card.Id));
            this.dispatchEvent(
                new CustomEvent('carddeleted', {
                    detail: { cardId: this.card.Id }
                })
            );
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Card deleted',
                    variant: 'success'
                })
            );
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Failed to delete card',
                    variant: 'error'
                })
            );
        }
        this.handleClose();
    }

    handleClose() {
        this.deleteConfirmState = false;
        if (this._deleteTimer) {
            clearTimeout(this._deleteTimer);
            this._deleteTimer = null;
        }
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleKeyDown(event) {
        if (event.key === 'Escape') {
            this.handleClose();
        }
    }

    handleResizeStart(event) {
        event.preventDefault();
        this._resizing = true;
        this._resizeStartX = event.clientX;
        this._resizeStartWidth = this.panelWidth;

        this._boundHandleResize = this.handleResize.bind(this);
        this._boundHandleResizeEnd = this.handleResizeEnd.bind(this);

        window.addEventListener('mousemove', this._boundHandleResize);
        window.addEventListener('mouseup', this._boundHandleResizeEnd);
    }

    handleResize(event) {
        if (!this._resizing) {
            return;
        }
        const delta = this._resizeStartX - event.clientX;
        let newWidth = this._resizeStartWidth + delta;
        newWidth = Math.max(
            MIN_PANEL_WIDTH,
            Math.min(MAX_PANEL_WIDTH, newWidth)
        );
        this.panelWidth = newWidth;
    }

    handleResizeEnd() {
        this._resizing = false;
        window.removeEventListener('mousemove', this._boundHandleResize);
        window.removeEventListener('mouseup', this._boundHandleResizeEnd);
        this._boundHandleResize = null;
        this._boundHandleResizeEnd = null;
    }

    disconnectedCallback() {
        if (this._deleteTimer) {
            clearTimeout(this._deleteTimer);
        }
        if (this._boundHandleResize) {
            window.removeEventListener('mousemove', this._boundHandleResize);
        }
        if (this._boundHandleResizeEnd) {
            window.removeEventListener('mouseup', this._boundHandleResizeEnd);
        }
    }
}
